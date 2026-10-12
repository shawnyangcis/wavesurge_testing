import type { Store } from './store.ts';
import type { Task } from '../shared/contracts.ts';
import type { Result } from '../shared/research.ts';
import type { ResearchTask } from './research.ts';
import type { Message } from '../shared/contracts.ts';
import { deliverReport } from './delivery.ts';
import { reportResults, reportGroups } from './report-scope.ts';
import type { ReportTask } from './report-scope.ts';
export type WorkItem = { kind: 'research' | 'enrichment' | 'campaign'; id: string; title: string; reportUrl: string };
export type WorkBatch = { id: string; items: WorkItem[]; sealed: boolean; delivered?: boolean; closureReason?: 'context_changed' | 'recovered' };
const terminal = (status: string | undefined) => ['completed', 'partial', 'failed', 'cancelled'].includes(status ?? '');
export function registerWork(store: Store, callId: string, item: WorkItem) {
 const owner = store.get<{ requestId: string }>('tool-owner', callId); const id = owner?.requestId ?? callId;
 store.transaction(() => {
  const input = owner && store.get<Message>('message', owner.requestId);
  const closed = input && (input.state !== 'pending' || input.epoch !== (store.get<number>('settings', 'epoch') ?? 0));
  const batch = store.get<WorkBatch>('work-batch', id) ?? { id, items: [], sealed: !owner || !!closed, ...(closed ? { closureReason: 'context_changed' as const } : {}) };
  if (!batch.items.some(work => work.id === item.id)) batch.items.push(item);
  store.set('work-batch', id, batch);
  const kind = item.kind === 'campaign' ? 'campaign' : 'task'; const task = store.get<Task>(kind, item.id)!;
  store.set(kind, item.id, { ...task, deliveryBatchId: id });
 });
}
export function workSummary(store: Store, batch: WorkBatch) {
 const states = batch.items.map(item => item.kind === 'campaign' ? store.get<Task>('campaign-state', item.id) : store.task<Task>(item.id));
 return { states, ready: batch.sealed && batch.items.length > 0 && states.every(state => state && terminal(state.status)) };
}
export function deliverWorkBatches(store: Store, now: number) {
 for (const batch of store.list<WorkBatch>('work-batch')) {
  if (batch.delivered) continue; const { states, ready } = workSummary(store, batch); if (!ready) continue;
  store.transaction(() => {
   deliverReport(store, `request-${batch.id}`, batch.items.map(item => item.id), `${batch.closureReason ? `中断请求中已登记的 ${batch.items.length} 项工作已结束。上下文切换或登记中断前尚未登记的事项没有执行；以下只汇总实际已登记工作。` : `本次请求的 ${batch.items.length} 项工作已全部结束。`}\n\n${batch.items.map((item, i) => `- ${item.title}：${states[i]!.status === 'completed' ? '已完成' : states[i]!.status === 'partial' ? '已结束，仍有缺额或失败' : states[i]!.status === 'cancelled' ? '已取消' : '未完成'}；${states[i]!.detail} [查看报告](${item.reportUrl})`).join('\n')}\n\n[查看本次综合报告](/api/work-batches/${encodeURIComponent(batch.id)}/report) · [下载综合 CSV](/api/work-batches/${encodeURIComponent(batch.id)}/report?format=csv)`, now);
   batch.delivered = true; store.set('work-batch', batch.id, batch);
  });
 }
}
export function sealWork(store: Store, inputIds: string[], now: number, closureReason?: WorkBatch['closureReason']) {
 store.transaction(() => { for (const id of inputIds) { const batch = store.get<WorkBatch>('work-batch', id); if (batch && !batch.sealed) { batch.sealed = true; if (closureReason) batch.closureReason = closureReason; store.set('work-batch', id, batch); } } deliverWorkBatches(store, now); });
}
export function recoverWorkBatches(store: Store, now: number) {
 const epoch = store.get<number>('settings', 'epoch') ?? 0;
 const ids = store.list<WorkBatch>('work-batch').filter(batch => {
  if (batch.sealed) return false;
  const input = store.get<Message>('message', batch.id);
  return !input || input.epoch !== epoch || input.state !== 'pending';
 }).map(batch => batch.id);
 sealWork(store, ids, now, 'recovered');
}
export function workResults(store: Store, batch: WorkBatch) {
 const sourceIds = new Set<string>(); const restricted = new Set<string>(); const campaignSources = new Set<string>(); const selectedCampaignResults = new Set<string>();
 for (const item of batch.items) {
  if (item.kind === 'research') sourceIds.add(item.id);
  else if (item.kind === 'campaign') { for (const id of store.get<{ childTaskIds: string[] }>('campaign', item.id)!.childTaskIds) { sourceIds.add(id); campaignSources.add(id); } for (const selection of store.get<{ selections: { resultId: string }[] }>('campaign-state', item.id)?.selections ?? []) selectedCampaignResults.add(selection.resultId); }
  else for (const id of store.get<{ resultIds: string[] }>('enrichment', item.id)!.resultIds) restricted.add(id);
 }
 // The saved allocation is a fallback for older incomplete data; valid Campaign children are recalculated by reportResults.
 const rows = [...new Map([...sourceIds].flatMap(id => store.results<Result>(id)).concat([...restricted].map(id => store.get<Result>('result', id)!)).map(result => [result.id, result])).values()];
 const results = reportResults(store, rows.map(result => ({ ...result, ...(campaignSources.has(result.taskId) ? { selected: selectedCampaignResults.has(result.id) } : {}) })));
 const { states } = workSummary(store, batch);
 const task: ReportTask = { id: batch.id, title: '本次请求综合报告', requested: states.reduce((sum, s) => sum + (s?.requested ?? 0), 0), evaluated: results.length, matched: results.filter(result => result.verdict === 'match' && result.selected).length, updatedAt: Math.max(0, ...states.map(s => s?.updatedAt ?? 0)), detail: batch.items.map((item, i) => `${item.title}：${states[i]?.detail ?? '尚未执行'}`).join('\n'), reportGroups: reportGroups(store, [...sourceIds, ...results.map(result => result.taskId)]), workItems: batch.items.map((item, i) => ({ id: item.id, title: item.title, requested: states[i]?.requested ?? 0, evaluated: states[i]?.evaluated ?? 0, unit: item.kind === 'enrichment' ? '条补标/复核记录' : item.kind === 'campaign' ? '个 Campaign 去重名额' : '个研究组名额' })) };
 return { task, results };
}
