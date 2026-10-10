import type { Store } from './store.ts';
import type { SettingsManager } from './settings.ts';
export type Content = string | null | { type: 'text'; text: string }[] | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: 'high' } })[];
export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: Content; tool_calls?: ToolCall[]; tool_call_id?: string };
export type ToolDefinition = { type: 'function'; function: { name: string; description: string; parameters: object } };
export type CallRecord = { id: string; kind: string; epoch: number; createdAt: number; revision: number; endpoint: string; request: object; response?: unknown; error?: string; finishedAt?: number };
export type Model = { complete(messages: ChatMessage[], tools: ToolDefinition[], epoch: number, kind: string): Promise<ChatMessage> };
export class ModelError extends Error {
  status: number; retryAfterMs: number;
  constructor(message: string, status: number, retryAfterMs = 1000) { super(message); this.status = status; this.retryAfterMs = retryAfterMs; }
  retryable() { return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500; }
}
export class ModelClient implements Model {
  store: Store; settings: SettingsManager; fetcher: typeof fetch; now: () => number; id: () => string;
  constructor(store: Store, settings: SettingsManager, fetcher: typeof fetch, now: () => number, id: () => string) { this.store = store; this.settings = settings; this.fetcher = fetcher; this.now = now; this.id = id; }
  async complete(messages: ChatMessage[], tools: ToolDefinition[], epoch: number, kind: string) {
    for (let attempt = 0; ; attempt++) {
      try { const answer = await this.request(messages, tools, epoch, kind); this.store.delete('model-retry', `${epoch}:${kind}`); return answer; }
      catch (error) {
        if (!(error instanceof ModelError) || !error.retryable() || !['chat', 'compression', 'candidate-selection'].includes(kind) || attempt >= 2) { this.store.delete('model-retry', `${epoch}:${kind}`); throw error; }
        const delay = Math.min(60000, Math.max(error.retryAfterMs, 1000 * 2 ** attempt));
        this.store.set('model-retry', `${epoch}:${kind}`, { epoch, kind, attempt: attempt + 1, nextAt: this.now() + delay, status: 'waiting' });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  async request(messages: ChatMessage[], tools: ToolDefinition[], epoch: number, kind: string) {
    const config = this.settings.current(); const id = this.id();
    const body = { model: config.modelId, messages, max_tokens: 4096, ...(tools.length ? { tools } : {}) };
    const record: CallRecord = { id, kind, epoch, createdAt: this.now(), revision: config.revision, endpoint: this.settings.endpoint(), request: this.settings.redact(body) };
    this.store.set('call', id, record);
    let received = false;
    try {
      const response = await this.fetcher(record.endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      received = true;
      if (!response.ok) throw new ModelError(`模型请求失败（${response.status}）`, response.status, Math.max(1000, Math.min(300000, Number(response.headers.get('Retry-After')) * 1000 || 1000)));
      const result = await response.json(); record.response = this.settings.redact(result);
      const message = result?.choices?.[0]?.message as ChatMessage | undefined;
      if (!message || (typeof message.content !== 'string' && message.content !== null) || (message.content === null && !message.tool_calls?.length)) throw new Error('模型返回格式不正确');
      if (message.tool_calls && (!message.tool_calls.every(call => typeof call.id === 'string' && call.id.length > 0 && call.type === 'function' && typeof call.function?.name === 'string' && typeof call.function.arguments === 'string') || new Set(message.tool_calls.map(call => call.id)).size !== message.tool_calls.length)) throw new Error('模型工具调用格式不正确');
      const answer: ChatMessage = { role: 'assistant', content: message.content };
      if (message.tool_calls?.length) answer.tool_calls = message.tool_calls;
      return answer;
    } catch (error) { record.error = this.settings.redact((error as Error).message); throw new ModelError(record.error, error instanceof ModelError ? error.status : received ? 400 : 0, error instanceof ModelError ? error.retryAfterMs : 1000); }
    finally { record.finishedAt = this.now(); this.store.set('call', id, record); }
  }
}
