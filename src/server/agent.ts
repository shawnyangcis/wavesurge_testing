import type { Store } from './store.ts';
import type { SettingsManager } from './settings.ts';
import type { Context } from './context.ts';
import type { ChatMessage, Model, ToolCall, ToolDefinition } from './model.ts';
import type { Message, Task } from '../shared/contracts.ts';
import { compressionPrompt } from '../shared/prompts.ts';
import { campaignFacts, taskFacts, executionFacts } from './task-facts.ts';
import { sealWork } from './work-delivery.ts';
export type Tools = { definitions: ToolDefinition[]; execute(name: string, args: unknown, callId: string): Promise<unknown> };
type ToolFlight = { epoch: number; answer: ChatMessage; results: ChatMessage[]; requestId?: string };
export class Agent {
  store: Store; settings: SettingsManager; context: Context; model: Model; tools: Tools; now: () => number; id: () => string;
  active = false; stopped = false; currentRun: Promise<void> = Promise.resolve();
  constructor(store: Store, settings: SettingsManager, context: Context, model: Model, tools: Tools, now: () => number, id: () => string) { this.store = store; this.settings = settings; this.context = context; this.model = model; this.tools = tools; this.now = now; this.id = id; }
  wake() {
    if (this.active || this.stopped) return this.currentRun;
    this.active = true;
    this.currentRun = this.run().finally(() => { this.active = false; }); return this.currentRun;
  }
  pending() { return this.store.list<Message>('message').filter(message => message.epoch === this.context.epoch() && message.role === 'user' && message.state === 'pending'); }
  inject() {
    const injected = new Set(this.context.batches().flatMap(batch => batch.inputIds));
    const pending = this.pending().filter(message => !injected.has(message.id));
    if (!pending.length) return false;
    this.context.append(pending.map(message => ({ role: 'user', content: message.attachments.length ? [{ type: 'text' as const, text: message.text }, ...message.attachments.map(url => ({ type: 'image_url' as const, image_url: { url, detail: 'high' as const } }))] : message.text })), pending.map(message => message.id)); return true;
  }
  messages(): ChatMessage[] {
    const config = this.settings.current(); const checkpoint = this.context.checkpoint();
    return [{ role: 'system', content: config.systemPrompt }, { role: 'system', content: config.workflowPrompt }, { role: 'system', content: `当前事实，观察时间 ${this.now()}：${JSON.stringify(this.facts())}` }, ...(checkpoint ? [{ role: 'system' as const, content: `历史摘要，不能替代当前事实：${checkpoint.text}` }] : []), ...this.context.active().flatMap(batch => batch.messages)];
  }
  facts() { return { tasks: taskFacts(this.store), campaigns: campaignFacts(this.store), execution: executionFacts(this.store) }; }
  async tool(call: ToolCall): Promise<ChatMessage> {
    const saved = this.store.get<{ call?: ToolCall; message?: ChatMessage }>('tool-receipt', call.id);
    if (saved?.call) { if (JSON.stringify(saved.call) !== JSON.stringify(call)) return { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: '工具调用编号已用于不同参数，未执行本次动作' }) }; return saved.message!; }
    let message: ChatMessage;
    try { const result = await this.tools.execute(call.function.name, JSON.parse(call.function.arguments), call.id); message = { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result ?? null) }; }
    catch (error) { message = { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: (error as Error).message }) }; }
    this.store.set('tool-receipt', call.id, { call, message }); return message;
  }
  async finishFlight(flight: ToolFlight) {
    const calls = flight.answer.tool_calls!;
    for (const call of calls.slice(flight.results.length)) {
      if (this.stopped || flight.epoch !== this.context.epoch()) return false;
      const requestId = flight.requestId ?? this.pending()[0]?.id;
      if (requestId) this.store.set('tool-owner', call.id, { requestId });
      flight.results.push(await this.tool(call));
      if (flight.epoch !== this.context.epoch()) return false;
      this.store.set('agent-flight', 'current', flight);
    }
    if (flight.epoch !== this.context.epoch()) return false;
    this.store.transaction(() => { this.context.append([flight.answer, ...flight.results]); this.store.delete('agent-flight', 'current'); });
    return true;
  }
  async compact(force: boolean) {
    const active = this.context.active(); const config = this.settings.current();
    if (!force && JSON.stringify(this.messages()).length / 3 < config.compressionThreshold) return false;
    const latestUser = active.findLastIndex(batch => batch.messages.some(message => message.role === 'user'));
    if (latestUser <= 0) return false;
    const prefix = active.slice(0, latestUser); const epoch = this.context.epoch();
    const previous = this.context.checkpoint();
    const answer = await this.model.complete([{ role: 'system', content: this.settings.current().compressionPrompt }, { role: 'user', content: JSON.stringify({ previous, history: prefix }) }], [], epoch, 'compression');
    if (epoch !== this.context.epoch() || JSON.stringify(this.context.checkpoint()) !== JSON.stringify(previous)) return false;
    if (typeof answer.content !== 'string' || !answer.content.trim() || answer.tool_calls?.length) throw new Error('摘要返回不正确');
    this.store.set('checkpoint', String(epoch), { until: prefix[prefix.length - 1].id, text: answer.content }); return true;
  }
  publish(text: string, epoch: number) {
    const message: Message = { id: this.id(), role: 'assistant', text, epoch, createdAt: this.now(), state: 'delivered', attachments: [] };
    this.store.transaction(() => { this.store.set('message', message.id, message); const inputs = this.pending(); for (const pending of inputs) this.store.set('message', pending.id, { ...pending, state: 'delivered' }); sealWork(this.store, inputs.map(input => input.id), this.now()); });
  }
  async run() {
    while (!this.stopped && this.pending().length) {
      const epoch = this.context.epoch();
      try {
        const flight = this.store.get<ToolFlight>('agent-flight', 'current');
        if (flight && flight.epoch === epoch && !await this.finishFlight(flight)) continue;
        this.inject();
        for (let round = 0; round < 12 && !this.stopped; round++) {
          await this.compact(false);
          if (this.stopped || epoch !== this.context.epoch()) break;
          const facts = JSON.stringify(this.facts());
          const answer = await this.model.complete(this.messages(), this.tools.definitions, epoch, 'chat');
          if (this.stopped || epoch !== this.context.epoch()) break;
          if (answer.tool_calls?.length) {
            const flight: ToolFlight = { epoch, answer, results: [], requestId: this.pending()[0]?.id }; this.store.set('agent-flight', 'current', flight);
            if (!await this.finishFlight(flight)) break;
            this.inject(); continue;
          }
          if (this.inject() || facts !== JSON.stringify(this.facts())) continue;
          const text = answer.content as string;
          this.context.append([answer]); this.publish(text, epoch); break;
        }
        if (!this.stopped && epoch === this.context.epoch() && this.pending().length) this.publish('本轮达到处理上限，尚未完成你的请求。已保存记录，请继续补充或重试；后台任务状态见侧栏。', epoch);
      } catch (error) {
        if (!this.stopped && epoch === this.context.epoch()) this.publish(`本轮处理未完成：${this.settings.redact((error as Error).message)}。已有任务和记录已保存。`, epoch);
      }
    }
  }
}
