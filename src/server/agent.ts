import type { Store } from './store.ts';
import type { SettingsManager } from './settings.ts';
import type { Context } from './context.ts';
import type { ChatMessage, Model, ToolCall, ToolDefinition } from './model.ts';
import type { Message, Task } from '../shared/contracts.ts';
import { compressionPrompt } from '../shared/prompts.ts';
import { campaignFacts, taskFacts, executionFacts } from './task-facts.ts';
import { sealWork } from './work-delivery.ts';
import { conversationProjection, compressionProjection } from './context-projection.ts';
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
    return [{ role: 'system', content: config.systemPrompt }, { role: 'system', content: config.workflowPrompt }, { role: 'system', content: `当前事实，观察时间 ${this.now()}：${JSON.stringify(this.facts())}` }, ...(checkpoint ? [{ role: 'system' as const, content: `历史摘要，不能替代当前事实：${checkpoint.text}` }] : []), ...conversationProjection(this.context.active().flatMap(batch => batch.messages))];
  }
  facts() { return { tasks: taskFacts(this.store), campaigns: campaignFacts(this.store), execution: executionFacts(this.store) }; }
  stableFacts() { const facts = this.facts(); return JSON.stringify({ ...facts, revision: this.settings.current().revision, tasks: facts.tasks.map(({ updatedAt: _time, nextPollAt: _poll, detail: phase, ...task }) => ({ ...task, ...( /错误|失败|不可用|重试|协助|取消/.test(phase ?? '') ? { attention: phase } : {}) })) }); }
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
    // Chinese and tool JSON use more tokens than the old length/3 estimate. A
    // large configured threshold must not defer compaction beyond useful input.
    if (!force && JSON.stringify(this.messages()).length < Math.min(config.compressionThreshold * 3, 80000)) return false;
    const latestUser = active.findLastIndex(batch => batch.messages.some(message => message.role === 'user'));
    if (latestUser <= 0) return false;
    const available = active.slice(0, latestUser); const prefix: typeof available = []; let size = 0;
    for (const batch of available) { const projected = compressionProjection([...prefix.flatMap(item => item.messages), ...batch.messages]); const next = JSON.stringify(projected).length; if (prefix.length && next > 24000) break; prefix.push(batch); size = next; if (size >= 24000) break; }
    const epoch = this.context.epoch();
    const previous = this.context.checkpoint();
    const projected = compressionProjection(prefix.flatMap(batch => batch.messages));
    const summaryGuidance = '\n本摘要用于快速继续对话，目标约800汉字。输入 currentTasks 是当前数据库状态，pendingInputIds 是真正未处理的用户输入，供判断保留优先级；不得把旧对话中曾经运行的终态任务误列为仍未完成。优先保留真正未完成工作、有效约束、授权和最新纠正，必要时为这些信息超出长度目标。已结束且与未处理请求无关的旧任务只保留主题检索线索和重要结论，不逐人复述结果，不罗列全部旧编号、进度、标签和重复链接。原始历史、完整逐人结果和报告仍在数据库，可用工具召回。';
    const currentTasks = taskFacts(this.store).map(({ id, title, status }) => ({ id, title, status }));
    const answer = await this.model.complete([{ role: 'system', content: this.settings.current().compressionPrompt + summaryGuidance }, { role: 'user', content: JSON.stringify({ previous, currentTasks, pendingInputIds: this.pending().map(input => input.id), history: prefix.map(batch => ({ ...batch, messages: projected.splice(0, batch.messages.length) })) }) }], [], epoch, 'compression');
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
          while (!this.stopped && epoch === this.context.epoch()) {
            this.inject();
            if (!await this.compact(false)) break;
          }
          if (this.stopped || epoch !== this.context.epoch()) break;
          const facts = this.stableFacts();
          const answer = await this.model.complete(this.messages(), this.tools.definitions, epoch, 'chat');
          if (this.stopped || epoch !== this.context.epoch()) break;
          if (answer.tool_calls?.length) {
            const flight: ToolFlight = { epoch, answer, results: [], requestId: this.pending()[0]?.id }; this.store.set('agent-flight', 'current', flight);
            if (!await this.finishFlight(flight)) break;
            this.inject(); continue;
          }
          if (this.inject() || facts !== this.stableFacts()) continue;
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
