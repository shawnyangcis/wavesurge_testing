import { createHash } from 'node:crypto';
import type { Store } from './store.ts';
import type { Message } from '../shared/contracts.ts';
export function deliverReport(store: Store, subject: string, revision: unknown, text: string, now: number) {
  return store.transaction(() => {
  const id = `report-${subject}-${createHash('sha256').update(JSON.stringify(revision)).digest('hex').slice(0, 16)}`;
  if (store.get('delivery', id)) return;
  const epoch = store.get<number>('settings', 'epoch') ?? 0;
  const message: Message = { id, role: 'assistant', text, createdAt: now, epoch, state: 'delivered', attachments: [] };
  // Join the caller's transaction, or commit all delivery records together. Never acknowledge user input here.
  store.set('message', id, message);
  store.set('batch', id, { id, epoch, messages: [{ role: 'assistant', content: text }], inputIds: [] });
  store.set('delivery', id, { id, subject, revision, createdAt: now });
  });
}
