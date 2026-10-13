import { afterEach, expect, it, vi } from 'vitest';
import type { Creator, Judgment, Result, SearchSpec } from '../src/shared/research.ts';
import { reviewNote, screeningSpec } from '../src/shared/screening.ts';
import { resolveJudgments } from '../src/server/verdict.ts';
import { preferenceScore } from '../src/server/selection.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { CampaignService } from '../src/server/campaign.ts';
import { Store } from '../src/server/store.ts';
import { SettingsManager } from '../src/server/settings.ts';
import { taskFacts } from '../src/server/task-facts.ts';
import { htmlReport, csvReport } from '../src/server/reports.ts';
import * as prompts from '../src/shared/prompts.ts';

const stores: Store[] = [];
afterEach(() => stores.splice(0).forEach(store => store.close()));
const scope: SearchSpec = { title: '公开资料候选筛选', personaText: 'running', count: 1, candidateBudget: 3, platforms: ['instagram'], regions: ['United States'], minFollowers: 10000, maxFollowers: 100000, verificationMode: 'text', criteria: [
  { id: 'personal', label: '本人第一人称的个人体验', required: true, basis: 'text' },
  { id: 'ethnicity', label: '白人', required: true, basis: 'visual' }
] };
function person(): Creator { return { id: 'instagram:person', platform: 'instagram', handle: 'person', displayName: 'Person', profileUrl: 'https://www.instagram.com/person/', followers: 20000, region: 'United States', raw: { factorGrades: { location: 'confirmed_country' } }, evidence: [
  { id: 'profile', kind: 'profile', provider: 'wavesurge', url: 'https://www.instagram.com/person/', capturedAt: 1, publishedAt: null, text: 'Personal runner. United States. 20000 followers' }
] }; }
const personal: Judgment = { criterionId: 'personal', verdict: 'match', reason: '实际本人经历', evidenceIds: ['profile'] };

it('新筛选保留族裔原要求为单列核对项，其他硬条件、地区和数值范围不变', () => {
  const original = structuredClone(scope), normalized = screeningSpec(scope);
  expect(scope).toEqual(original); expect(normalized.criteria[0]).toEqual(scope.criteria[0]);
  expect(normalized.criteria[1]).toEqual({ ...scope.criteria[1], required: false, basis: 'text', reviewOnly: true });
  expect({ ...normalized, criteria: [] }).toEqual({ ...scope, criteria: [] });
  for (const [id, label] of [['white_self_identification', '本人明确公开自述为白人，不从外貌、姓名或所在地推断；没有自述证据保持unknown'], ['race_identity', 'White person'], ['ethnic', 'Ethnic background'], ['identity', 'Caucasian'], ['identity', '族裔为白人']]) expect(screeningSpec({ ...scope, criteria: [{ id, label, required: true, basis: 'text' }] }).criteria[0].reviewOnly).toBe(true);
});

it('跑步比赛、族裔话题和白色衣物不被误当作本人族裔，复合条件须拆开', () => {
  for (const [id, label] of [['race', 'First-person race experience'], ['race_experience', 'First-person race experience'], ['race_topic', '讨论种族公平话题'], ['white_shirt', 'White shirt'], ['glasses', '白色眼镜']]) {
    const spec = { ...scope, criteria: [{ id, label, required: true, basis: 'visual' as const }] };
    expect(screeningSpec(spec)).toEqual(spec);
  }
  expect(() => screeningSpec({ ...scope, criteria: [{ id: 'identity', label: '白人且戴眼镜的Geek个人KOC', required: true, basis: 'visual' }] })).toThrow('分开');
  for (const label of ['白人男性且有本人跑步训练体验', '白人且分享本人在家制作咖啡体验的个人创作者']) expect(() => screeningSpec({ ...scope, criteria: [{ id: 'ethnicity', label, required: true, basis: 'text' }] })).toThrow('分开');
  expect(() => screeningSpec({ ...scope, criteria: [{ ...scope.criteria[0], reviewOnly: true }] })).toThrow('其他条件');
});

it('族裔缺失不阻断候选，但其他条件缺失、不符或粉丝超范围仍阻断', () => {
  const spec = screeningSpec(scope), creator = person();
  const result = resolveJudgments(spec, creator, [personal]);
  expect(result.verdict).toBe('match'); expect(result.judgments.find(j => j.criterionId === 'ethnicity')).toMatchObject({ verdict: 'unknown', reviewOnly: true, evidenceIds: [] });
  expect(resolveJudgments(spec, creator, []).verdict).toBe('unknown');
  expect(resolveJudgments(spec, creator, [{ ...personal, verdict: 'no_match' }]).verdict).toBe('no_match');
  expect(resolveJudgments(spec, { ...creator, followers: 999999 }, [personal]).verdict).toBe('no_match');
});

it('族裔可以核对明确文字资料，不要求第一人称自述；明确不符合者被排除', () => {
  const spec = screeningSpec(scope), creator = person();
  creator.evidence.push({ id: 'agency', kind: 'linked_profile_snapshot', provider: 'headed-chromium', url: 'https://agency.test/person', text: 'Person — official creator directory. Ethnicity: Caucasian', capturedAt: 2, publishedAt: null, assetId: 'image', linkedIdentityProof: 'reciprocal' });
  const proposed: Judgment = { criterionId: 'ethnicity', verdict: 'match', reason: '明确资料字段', evidenceIds: ['agency'] };
  const result = resolveJudgments(spec, creator, [personal, proposed]);
  expect(result.verdict).toBe('match'); expect(result.judgments.find(j => j.criterionId === 'ethnicity')).toMatchObject({ verdict: 'match', reviewOnly: true, evidenceIds: ['agency'] });
  creator.evidence.at(-1)!.text = 'Person — official creator directory. Ethnicity: Asian';
  expect(resolveJudgments(spec, creator, [personal, { ...proposed, verdict: 'no_match' }]).verdict).toBe('no_match');
  creator.evidence.at(-1)!.text = '本人简介：我是黑人创作者。';
  expect(resolveJudgments(spec, creator, [personal, { ...proposed, verdict: 'no_match' }]).verdict).toBe('no_match');
});

it('照片、所在地、衣物及读取错误不成为族裔事实，模型猜测被降为待确认', () => {
  const spec = screeningSpec(scope);
  for (const [kind, text] of [['profile', 'White shirt. United States. European audience.'], ['profile', 'Personal runner. Race: Boston Marathon.'], ['profile', 'Race: Black Canyon Ultra.'], ['profile', 'Race: White Mountains 100K.'], ['profile', 'Ethnicity: unknown'], ['post_photo', 'Caucasian model'], ['source_error', 'Ethnicity: Caucasian']]) {
    const creator = person(); creator.evidence.push({ id: 'untrusted', kind, text, provider: 'wavesurge', url: creator.profileUrl, capturedAt: 2, publishedAt: null, assetId: 'pixels' });
    const result = resolveJudgments(spec, creator, [personal, { criterionId: 'ethnicity', verdict: 'match', reason: '模型猜测', evidenceIds: ['untrusted'] }]);
    expect(result.verdict).toBe('match'); expect(result.judgments.find(j => j.criterionId === 'ethnicity')).toMatchObject({ verdict: 'unknown', evidenceIds: [], reviewOnly: true });
  }
});

it('族裔核对项不参与偏好排名，不造成达到目标仍分析完整预算', async () => {
  const store = new Store(':memory:'); stores.push(store);
  const verify = vi.fn(async () => [personal]);
  const creators = [person(), { ...person(), id: 'instagram:second', handle: 'second' }];
  const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn(), discover: vi.fn(async () => ({ state: { platform: 1, keyword: 0, page: 0, cursor: '', seenCursors: [], seenUsers: [], pending: [], delivered: 2, done: true }, creators })) }, verify, () => 1);
  const task = engine.start(scope, 'call'); expect(task.reviewNote).toBe(reviewNote); expect(engine.start(scope, 'call')).toEqual(task);
  expect(taskFacts(store)[0].reviewNote).toBe(reviewNote);
  await engine.wake(); expect(store.task(task.id)).toMatchObject({ status: 'completed', matched: 1, evaluated: 1 }); expect(verify).toHaveBeenCalledOnce();
  expect(preferenceScore(task.spec, { judgments: [{ criterionId: 'ethnicity', verdict: 'match' }] } as Result)).toBe(0);
  expect(store.list<any>('message')[0].text).toContain(reviewNote);
  const saved = store.get<any>('task', task.id); saved.spec = structuredClone(scope); delete saved.reviewNote; store.set('task', task.id, saved);
  expect(engine.start(scope, 'call').spec).toEqual(scope); expect(store.get<any>('task', task.id)).toEqual(saved);
});

it('Campaign 草案也采用相同核对口径，保留其他必选条件与版本', () => {
  const store = new Store(':memory:'); stores.push(store); const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, async () => [], () => 1);
  const service = new CampaignService(store, engine, () => 1);
  const plan = service.save({ title: '活动', goal: '跑步', audience: '读者', groups: [{ id: 'runner', rationale: '训练体验', spec: scope }] }, 'plan');
  expect(plan.groups[0].spec.criteria[1].reviewOnly).toBe(true); expect(plan.groups[0].spec.criteria[0].required).toBe(true);
  expect(service.summary(plan).reviewNote).toBe(reviewNote); expect(service.facts()[0].reviewNote).toBe(reviewNote);
});

it('非批次Campaign与已有结果补标交付也保留人工确认说明', async () => {
  const store = new Store(':memory:'); stores.push(store); const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, async () => [], () => 1); engine.stopped = true;
  const service = new CampaignService(store, engine, () => 1);
  const plan = service.save({ title: '活动', goal: '跑步', audience: '读者', groups: [{ id: 'runner', rationale: '训练体验', spec: scope }] }, 'fallback-plan');
  const started = service.start(plan.id, 1), taskId = started.childTaskIds[0];
  const task = store.get<any>('task', taskId), creator = person();
  const result: Result = { id: taskId + '|person', taskId, creator, ...resolveJudgments(task.spec, creator, [personal]), selected: true, updatedAt: 1, tags: [] };
  store.set('result', result.id, result); store.set('task', taskId, { ...task, status: 'completed', matched: 1, evaluated: 1 });
  service.deliver(); expect(store.list<any>('message')[0].text).toContain(reviewNote);
  const job = engine.enrichment.start({ taskId, mode: 'annotate' }, 'fallback-enrich'); engine.stopped = false;
  await engine.enrichment.tick(false); expect(store.task(job.id)).toMatchObject({ status: 'completed', reviewNote });
  expect(store.list<any>('message').find(message => message.text.includes('查看更新后的报告')).text).toContain(reviewNote);
});

it('逐人报告、空报告与CSV均清楚区分已核实条件和待人工确认信息', () => {
  const spec = screeningSpec(scope), creator = person();
  const result: Result = { id: 'r', taskId: 't', creator, ...resolveJudgments(spec, creator, [personal]), selected: true, updatedAt: 1, tags: [] };
  const task = { id: 't', title: '公开资料候选', requested: 1, evaluated: 1, matched: 1, detail: '已完成', updatedAt: 1, reviewNote };
  const html = htmlReport(task, [result]); expect(html).toContain('符合已核实条件'); expect(html).toContain('待人工确认'); expect(html).toContain(reviewNote);
  expect(htmlReport(task, [])).toContain(reviewNote);
  const csv = csvReport(task, [result]); expect(csv).toContain('待人工确认条件,自动入选范围'); expect(csv).toContain(reviewNote); expect(csv).toContain('reviewOnly');
});

it('已有部署默认提示词精准升级，保留模型秘密、自定义设置及人工接管规则', () => {
  const store = new Store(':memory:'); stores.push(store); const settings = new SettingsManager(store, { API_KEY: 'test-key' }); const previous = settings.current();
  store.set('settings', 'model', { ...previous, systemPrompt: prompts.legacyExecutionSystemPrompt, workflowPrompt: prompts.legacyExecutionWorkflowPrompt, verificationPrompt: prompts.legacyExecutionVerificationPrompt });
  const updated = new SettingsManager(store, {}).current();
  expect(updated.apiKey).toBe('test-key'); expect(updated.revision).toBe(previous.revision + 1);
  expect(updated.systemPrompt).toBe(prompts.systemPrompt); expect(updated.workflowPrompt).toBe(prompts.workflowPrompt); expect(updated.verificationPrompt).toBe(prompts.verificationPrompt);
  expect(updated.systemPrompt).not.toContain('族裔仅依据本人明确自述'); expect(updated.verificationPrompt).not.toContain('族裔只依据本人明确自述');
  expect(updated.systemPrompt).toContain('交还后重新观察'); expect(updated.systemPrompt).toContain('用户允许协助');
  store.set('settings', 'model', { ...previous, systemPrompt: 'custom' }); expect(new SettingsManager(store, {}).current().systemPrompt).toBe('custom');
});
