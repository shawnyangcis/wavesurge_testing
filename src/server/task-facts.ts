import type { Store } from './store.ts';
import type { Campaign } from '../shared/campaign.ts';
import type { Task } from '../shared/contracts.ts';
import type { Assistance } from './desktop.ts';
import type { WorkBatch } from './work-delivery.ts';
import { researchExecution } from './execution-policy.ts';
import type { SearchSpec } from '../shared/research.ts';
export function taskFacts(store: Store) {
  return store.tasks<Task & { spec?: SearchSpec; remoteId?: string; remoteStatus?: string; nextPollAt?: number }>().map(task => ({ id: task.id, title: task.title, status: task.status, requested: task.requested, evaluated: task.evaluated, matched: task.matched, qualifying: task.qualifying, resultTaskId: task.resultTaskId, parentCampaignId: task.parentCampaignId, ...researchExecution(store, task.id, task.spec), matchedMeaning: task.resultTaskId ? '本轮处理结果中合格的记录数，不是入选人数' : task.parentCampaignId ? '独立研究的组内预选数；Campaign最终入选见Campaign分配' : '研究组入选的合格账号数；合格候选总数见qualifying', updatedAt: task.updatedAt, detail: task.detail, remoteId: task.remoteId, remoteStatus: task.remoteStatus, nextPollAt: task.nextPollAt }));
}

export function campaignFacts(store: Store) { return store.list<Campaign>('campaign').map(campaign => ({ id: campaign.id, title: campaign.title, goal: campaign.goal.slice(0, 500), audience: campaign.audience.slice(0, 500), revision: campaign.revision, started: campaign.childTaskIds.length > 0, childTaskIds: campaign.childTaskIds, groups: campaign.groups.map(group => ({ id: group.id, title: group.spec.title, count: group.spec.count })) })); }
export function executionFacts(store: Store) {
 const request = store.list<Assistance>('assistance').find(item => item.status !== 'done');
 return { desktop: request ? { inputOwner: request.status === 'human' ? 'human' : 'reserved_for_human', taskId: request.taskId, creatorId: request.creatorId, reason: request.reason } : { inputOwner: 'agent' }, registrationAllowed: true, textVerificationBlocked: false, browserVerificationWaiting: !!request, workBatches: store.list<WorkBatch>('work-batch').filter(batch => !batch.delivered).map(batch => ({ id: batch.id, sealed: batch.sealed, items: batch.items.map(item => ({ kind: item.kind, id: item.id, title: item.title })) })) };
}
