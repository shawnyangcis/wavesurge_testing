import type { Store } from './store.ts';
import type { ChatMessage } from './model.ts';
import type { Message } from '../shared/contracts.ts';
import { validImage } from '../shared/contracts.ts';
import { sealWork } from './work-delivery.ts';
export type Batch = { id: string; epoch: number; messages: ChatMessage[]; inputIds: string[] };
export type Checkpoint = { until: string; text: string };
export type Backup = { format: 'creator-studio/1'; messages: Message[]; batches: Batch[]; checkpoint?: Checkpoint };
export function validatePairs(messages: ChatMessage[]) {
  const pending = new Set<string>();
  for (const message of messages) {
    if (!['system', 'user', 'assistant', 'tool'].includes(message.role)) throw new Error('历史角色无效');
    if (typeof message.content !== 'string' && message.content !== null && !Array.isArray(message.content)) throw new Error('历史内容无效');
    if (Array.isArray(message.content)) for (const item of message.content) {
      if (item.type === 'text') { if (typeof item.text !== 'string') throw new Error('历史文字无效'); }
      else if (item.type !== 'image_url' || !validImage(item.image_url?.url)) throw new Error('历史图片无效');
    }
    if (message.role === 'tool') {
      if (!message.tool_call_id || !pending.delete(message.tool_call_id)) throw new Error('工具结果未配对');
    } else if (pending.size) throw new Error('工具批次不完整');
    if (message.tool_calls) {
      if (message.role !== 'assistant') throw new Error('工具调用角色无效');
      for (const call of message.tool_calls) {
        if (pending.has(call.id)) throw new Error('工具调用重复');
        pending.add(call.id);
      }
    }
  }
  if (pending.size) throw new Error('工具批次不完整');
}
export class Context {
  store: Store; id: () => string; now: () => number;
  constructor(store: Store, id: () => string, now = Date.now) { this.store = store; this.id = id; this.now = now; }
  epoch() { return this.store.get<number>('settings', 'epoch') ?? 0; }
  batches() { return this.store.list<Batch>('batch').filter(batch => batch.epoch === this.epoch()); }
  checkpoint() { return this.store.get<Checkpoint>('checkpoint', String(this.epoch())); }
  active() {
    const batches = this.batches(); const checkpoint = this.checkpoint();
    if (!checkpoint) return batches;
    const index = batches.findIndex(batch => batch.id === checkpoint.until);
    return batches.slice(index + 1);
  }
  append(messages: ChatMessage[], inputIds: string[] = []) {
    validatePairs(messages); const batch: Batch = { id: this.id(), epoch: this.epoch(), messages, inputIds };
    this.store.set('batch', batch.id, batch); return batch;
  }
  reset() {
    return this.store.transaction(() => this.moveEpoch());
  }
  moveEpoch() {
    const epoch = this.epoch();
    const inputs = this.store.list<Message>('message').filter(message => message.epoch === epoch);
    this.store.set('settings', 'epoch', epoch + 1);
    for (const message of inputs) if (message.state === 'pending') this.store.set('message', message.id, { ...message, state: 'delivered' });
    this.store.delete('agent-flight', 'current');
    sealWork(this.store, inputs.map(message => message.id), this.now(), 'context_changed');
    return epoch + 1;
  }
  backup(): Backup { return { format: 'creator-studio/1', messages: this.store.list<Message>('message'), batches: this.batches(), ...(this.checkpoint() ? { checkpoint: this.checkpoint() } : {}) }; }
  load(backup: Backup) {
    if (backup.format !== 'creator-studio/1' || !Array.isArray(backup.messages) || !Array.isArray(backup.batches)) throw new Error('备份格式不正确');
    for (const message of backup.messages) if (typeof message.id !== 'string' || !['user', 'assistant'].includes(message.role) || typeof message.text !== 'string' || !Array.isArray(message.attachments) || !message.attachments.every(validImage)) throw new Error('备份消息无效');
    for (const batch of backup.batches) validatePairs(batch.messages);
    if (backup.checkpoint && !backup.batches.some(batch => batch.id === backup.checkpoint!.until)) throw new Error('摘要边界不存在');
    this.store.transaction(() => {
      const epoch = this.moveEpoch();
      const messageIds = new Map<string, string>(); const batchIds = new Map<string, string>();
      for (const message of backup.messages) { const id = this.id(); messageIds.set(message.id, id); this.store.set('message', id, { ...message, id, epoch, state: 'delivered' }); }
      for (const batch of backup.batches) { const id = this.id(); batchIds.set(batch.id, id); this.store.set('batch', id, { ...batch, id, epoch, inputIds: batch.inputIds.map(input => messageIds.get(input)!) }); }
      if (backup.checkpoint) this.store.set('checkpoint', String(epoch), { ...backup.checkpoint, until: batchIds.get(backup.checkpoint.until)! });
    });
    return this.epoch();
  }
}
