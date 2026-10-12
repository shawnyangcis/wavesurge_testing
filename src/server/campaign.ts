import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import type { Store } from './store.ts';
import type { ResearchEngine, ResearchTask } from './research.ts';
import type { Campaign } from '../shared/campaign.ts';
import type { Result } from '../shared/research.ts';
import { campaignSchema } from '../shared/campaign.ts';
import { creatorIdentity } from './canonical.ts';
import { rankResults } from './selection.ts';
import { deliverReport } from './delivery.ts';
const validate = new Ajv().compile<Omit<Campaign, 'id' | 'revision' | 'childTaskIds' | 'createdAt' | 'updatedAt'>>(campaignSchema);
export function summarizeCampaign(store: Store, campaign: Campaign) {
  const tasks = campaign.childTaskIds.map(id => store.task<ResearchTask>(id)!);
  const results = campaign.childTaskIds.flatMap(id => store.results<Result>(id));
  const eligible = new Map<string, { result: Result; groups: number[] }>();
  for (const result of results.filter(item => item.verdict === 'match')) { const index = campaign.childTaskIds.indexOf(result.taskId); const person = eligible.get(creatorIdentity(result.creator)) ?? { result, groups: [] }; if (!person.groups.includes(index)) person.groups.push(index); eligible.set(creatorIdentity(result.creator), person); }
  const slots = campaign.groups.flatMap((group, index) => Array.from({ length: group.spec.count }, () => index)); const assigned = new Map<string, number>();
  const fill = (slot: number, seen: Set<string>): boolean => {
    for (const result of rankResults(campaign.groups[slots[slot]].spec, results.filter(item => item.verdict === 'match' && item.taskId === campaign.childTaskIds[slots[slot]]))) { const id = creatorIdentity(result.creator); const person = eligible.get(id)!; if (!person.groups.includes(slots[slot]) || seen.has(id)) continue; seen.add(id); const previous = assigned.get(id); if (previous === undefined || fill(previous, seen)) { assigned.set(id, slot); return true; } }
    return false;
  };
  slots.forEach((_, slot) => fill(slot, new Set()));
  const selections = [...assigned].map(([creatorId, slot]) => ({ creatorId, groupId: campaign.groups[slots[slot]].id, resultId: results.find(result => result.verdict === 'match' && creatorIdentity(result.creator) === creatorId && result.taskId === campaign.childTaskIds[slots[slot]])!.id }));
  const groups = campaign.groups.map((group, index) => ({ ...group, taskId: campaign.childTaskIds[index], matched: selections.filter(item => item.groupId === group.id).length, eligible: [...eligible.values()].filter(item => item.groups.includes(index)).length }));
  const status = !tasks.length ? 'draft' : tasks.some(task => task.status === 'needs_input') ? 'needs_input' : tasks.some(task => ['queued', 'running'].includes(task.status)) ? 'running' : selections.length === slots.length ? 'completed' : 'partial';
  const projected = results.map(result => {
    const index = campaign.childTaskIds.indexOf(result.taskId), group = campaign.groups[index];
    const allocation = selections.find(item => item.creatorId === creatorIdentity(result.creator)), allocatedGroup = campaign.groups.find(item => item.id === allocation?.groupId);
    return { ...result, selected: selections.some(item => item.resultId === result.id), reportContext: { sourceTaskTitle: tasks[index].title, groupId: group.id, groupTitle: group.spec.title, selectionScope: 'campaign' as const, campaignId: campaign.id, campaignTitle: campaign.title, researchSelected: result.selected === true, allocatedGroupId: allocatedGroup?.id, allocatedGroupTitle: allocatedGroup?.spec.title }, judgments: result.judgments.map(judgment => ({ ...judgment, label: judgment.label ?? group.spec.criteria.find(item => item.id === judgment.criterionId)?.label ?? judgment.criterionId })) };
  });
  return { ...campaign, status, requested: slots.length, matched: selections.length, qualifyingUnique: eligible.size, evaluated: results.length, groups, selections, reportUrl: `/api/campaigns/${campaign.id}/report`, results: projected };
}
export class CampaignService {
  store: Store; engine: ResearchEngine; now: () => number; lastGeneration = '';
  constructor(store: Store, engine: ResearchEngine, now: () => number) { this.store = store; this.engine = engine; this.now = now; }
  save(input: unknown, callId: string, existingId?: string, revision?: number) {
    if (!validate(input)) throw new Error('请明确 Campaign 目标、受众、各类型理由、范围与配额');
    if (new Set(input.groups.map(group => group.id)).size !== input.groups.length || input.groups.reduce((sum, group) => sum + group.spec.candidateBudget, 0) > 1000) throw new Error('分组编号重复或总候选预算超出 1000');
    for (const { spec } of input.groups) if (spec.minFollowers > spec.maxFollowers || spec.candidateBudget < spec.count || new Set(spec.criteria.map(item => item.id)).size !== spec.criteria.length) throw new Error('分组条件或配额存在冲突');
    const id = existingId ?? `campaign-${createHash('sha256').update(callId).digest('hex').slice(0, 24)}`; const existing = this.store.get<Campaign>('campaign', id);
    if (existingId && !existing) throw new Error('Campaign 不存在');
    if (existing?.childTaskIds.length) throw new Error('已启动方案保留原版本；如需新范围，请创建新草案，原任务仅在用户要求时取消');
    if (existingId && existing!.revision !== revision) throw new Error('方案版本已变化，请读取最新版本');
    if (!existingId && existing) return existing;
    const campaign: Campaign = { ...input, id, revision: (existing?.revision ?? 0) + 1, childTaskIds: [], createdAt: existing?.createdAt ?? this.now(), updatedAt: this.now() }; this.store.set('campaign', id, campaign); return campaign;
  }
  start(id: string, revision: number) {
    const campaign = this.store.get<Campaign>('campaign', id); if (!campaign) throw new Error('Campaign 不存在'); if (campaign.revision !== revision) throw new Error('方案版本已变化，请读取最新版本'); if (campaign.childTaskIds.length) return campaign;
    this.store.transaction(() => { campaign.childTaskIds = campaign.groups.map(group => (() => { const task = this.engine.start(group.spec, `${id}:${revision}:${group.id}`); task.exhaustive = true; task.parentCampaignId = id; this.engine.save(task); return task.id; })()); campaign.updatedAt = this.now(); this.store.set('campaign', id, campaign); }); void this.engine.wake(); return campaign;
  }
  summary(campaign: Campaign) {
    return summarizeCampaign(this.store, campaign);
  }
  deliver() {
    const generation = ['task', 'result', 'campaign'].map(kind => this.store.version(kind)).join(':');
    if (generation === this.lastGeneration) return;
    this.lastGeneration = generation;
    for (const campaign of this.store.list<Campaign>('campaign')) {
      const summary = this.summary(campaign);
      this.store.set('campaign-state', campaign.id, { id: campaign.id, title: campaign.title, status: summary.status, requested: summary.requested, matched: summary.matched, evaluated: summary.evaluated, selections: summary.selections, updatedAt: Math.max(campaign.updatedAt, ...summary.results.map(r => r.updatedAt)), detail: `去重入选 ${summary.matched}/${summary.requested}；${summary.groups.map(group => `${group.spec.title} ${group.matched}/${group.spec.count}`).join('；')}` });
      if (!['completed', 'partial'].includes(summary.status)) continue;
      if (campaign.deliveryBatchId || this.store.get('campaign-final', campaign.id)) continue;
      this.store.transaction(() => { if (!this.store.list<{ subject: string }>('delivery').some(delivery => delivery.subject === campaign.id)) deliverReport(this.store, campaign.id, { revision: campaign.revision, tasks: campaign.childTaskIds }, `Campaign「${campaign.title}」${summary.status === 'completed' ? '已完成' : '已结束，仍有缺额'}。去重入选 ${summary.matched}/${summary.requested} 人。\n\n${summary.groups.map(group => `- ${group.spec.title}：${group.matched}/${group.spec.count}`).join('\n')}\n\n[查看 Campaign 总报告](${summary.reportUrl})`, this.now()); this.store.set('campaign-final', campaign.id, { delivered: true }); });
    }
  }
  facts() { return this.store.list<Campaign>('campaign').map(campaign => { const { results: _results, ...summary } = this.summary(campaign); return { id: summary.id, title: summary.title, goal: summary.goal.slice(0, 500), revision: summary.revision, status: summary.status, requested: summary.requested, matched: summary.matched, childTaskIds: summary.childTaskIds, groups: summary.groups.map(group => ({ id: group.id, title: group.spec.title, requested: group.spec.count, matched: group.matched })), reportUrl: summary.reportUrl }; }); }
}
