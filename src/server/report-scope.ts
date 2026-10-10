import type { Result } from '../shared/research.ts';
import type { Store } from './store.ts';
import type { ResearchTask } from './research.ts';
import type { Campaign } from '../shared/campaign.ts';
import { summarizeCampaign } from './campaign.ts';

export type ReportGroup = { id: string; taskId: string; title: string; requested: number; selectionScope: 'research' | 'campaign' };
export type ReportTask = Pick<ResearchTask, 'id' | 'title' | 'requested' | 'evaluated' | 'matched' | 'updatedAt' | 'detail'> & { reportGroups?: ReportGroup[]; workItems?: { id: string; title: string; requested: number; evaluated: number; unit: string }[] };

// Report metadata is a read projection. Original research decisions and audit versions remain stored as received.
export function reportResults(store: Store, results: Result[]): Result[] {
  const campaigns = new Map<string, ReturnType<typeof summarizeCampaign>>();
  return results.map(result => {
    const task = store.get<ResearchTask>('task', result.taskId);
    if (task?.parentCampaignId) {
      const campaign = store.get<Campaign>('campaign', task.parentCampaignId);
      if (campaign) {
        if (!campaigns.has(campaign.id)) campaigns.set(campaign.id, summarizeCampaign(store, campaign));
        const scoped = campaigns.get(campaign.id)!.results.find(item => item.id === result.id);
        if (scoped) return scoped;
      }
    }
    return { ...result, reportContext: { sourceTaskTitle: task?.title ?? result.taskId, groupId: result.taskId, groupTitle: task?.title ?? result.taskId, selectionScope: 'research' }, judgments: result.judgments.map(judgment => ({ ...judgment, label: judgment.label ?? task?.spec?.criteria.find(item => item.id === judgment.criterionId)?.label ?? judgment.criterionId })) };
  });
}
export function reportGroups(store: Store, taskIds: Iterable<string>): ReportGroup[] {
  return [...new Set(taskIds)].map(taskId => {
    const task = store.get<ResearchTask>('task', taskId);
    const campaign = task?.parentCampaignId && store.get<Campaign>('campaign', task.parentCampaignId);
    const group = campaign && campaign.groups[campaign.childTaskIds.indexOf(taskId)];
    if (group) return { id: group.id, taskId, title: group.spec.title, requested: group.spec.count, selectionScope: 'campaign' };
    return { id: taskId, taskId, title: task?.title ?? taskId, requested: task?.requested ?? 0, selectionScope: 'research' };
  });
}
