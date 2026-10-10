import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { CampaignService } from '../src/server/campaign.ts';
import { campaignTools } from '../src/server/campaign-tools.ts';
import { basicTools } from '../src/server/tools.ts';
import { campaignFacts } from '../src/server/task-facts.ts';
import type { SearchSpec, Result } from '../src/shared/research.ts';
import { createApp } from '../src/server/app.ts';
import { initializeAdmin } from '../src/server/auth.ts';
import { registerCampaigns } from '../src/server/campaign-api.ts';
const stores: Store[] = []; afterEach(() => stores.splice(0).forEach(store => store.close()));
const spec: SearchSpec = { title: '类型', personaText: '科技', count: 1, candidateBudget: 2, platforms: ['instagram'], regions: [], minFollowers: 0, maxFollowers: 100000, criteria: [] };
const plan = { title: '耳机 Campaign', goal: '向学生推广降噪耳机', audience: '大学生', groups: [{ id: 'tech', rationale: '产品评测帮助转化', spec: { ...spec, title: '科技评测' } }, { id: 'study', rationale: '学习场景帮助触达', spec: { ...spec, title: '学习生活' } }] };
function fixture() { const store = new Store(':memory:'); stores.push(store); const wave = { submit: vi.fn().mockResolvedValue('remote'), poll: vi.fn() }; const engine = new ResearchEngine(store, wave, async () => [], () => 10); const service = new CampaignService(store, engine, () => 10); return { store, engine, service, wave }; }
function result(taskId: string, creatorId: string, verdict: 'match' | 'unknown' = 'match'): Result { return { id: `${taskId}|${creatorId}`, taskId, creator: { id: creatorId, displayName: `人 ${creatorId}`, handle: creatorId, platform: 'instagram', followers: 10000, region: null, profileUrl: 'https://social.test/profile', evidence: [], raw: {} }, verdict, judgments: [], tags: [], updatedAt: 0 }; }
it('目标方案草案、校验、幂等、版本修正和启动后不可覆盖，子任务原子创建', async () => {
  const f = fixture(); const first = f.service.save(plan, 'call'); expect(f.wave.submit).not.toHaveBeenCalled(); expect(f.service.summary(first).status).toBe('draft'); expect(f.service.save(plan, 'call')).toEqual(first);
  for (const bad of [{}, { ...plan, groups: [plan.groups[0], plan.groups[0]] }, { ...plan, groups: [{ ...plan.groups[0], spec: { ...spec, candidateBudget: 1000 } }, plan.groups[1]] }]) expect(() => f.service.save(bad, 'bad')).toThrow();
  for (const bad of [{ ...spec, minFollowers: 100001 }, { ...spec, count: 3 }, { ...spec, criteria: [{ id: 'a', label: 'x', required: true, basis: 'text' }, { id: 'a', label: 'x', required: true, basis: 'text' }] }]) expect(() => f.service.save({ ...plan, groups: [{ ...plan.groups[0], spec: bad }] }, 'bad')).toThrow('冲突');
  expect(() => f.service.save(plan, 'edit', 'missing', 1)).toThrow('不存在'); expect(() => f.service.save(plan, 'edit', first.id, 9)).toThrow('版本');
  const revised = f.service.save({ ...plan, title: '修改后的计划' }, 'edit', first.id, 1); expect(revised.revision).toBe(2); expect(revised.createdAt).toBe(10); expect(campaignFacts(f.store)[0].started).toBe(false);
  expect(() => f.service.start('missing', 1)).toThrow('不存在'); expect(() => f.service.start(first.id, 1)).toThrow('版本'); const started = f.service.start(first.id, 2); await f.engine.currentRun; expect(started.childTaskIds).toHaveLength(2); expect(f.service.start(first.id, 2)).toEqual(started); expect(f.wave.submit).toHaveBeenCalledTimes(2); expect(campaignFacts(f.store)[0].started).toBe(true);
  expect(() => f.service.save(plan, 'edit', first.id, 2)).toThrow('已启动'); expect(f.store.list<any>('task').every(task => task.exhaustive)).toBe(true); expect(f.service.summary(started).status).toBe('running');
});
it('跨类型重复账号只占一次配额，增广匹配找到正确分配，unknown 不能凑数', async () => {
  const f = fixture(); const campaign = f.service.save(plan, 'call'); f.service.start(campaign.id, 1); await f.engine.currentRun; const started = f.store.get<any>('campaign', campaign.id); const [a, b] = started.childTaskIds;
  const save = (value: Result) => f.store.set('result', value.id, value); save(result(a, 'shared')); save(result(b, 'shared')); save(result(a, 'only-tech')); save(result(b, 'unknown', 'unknown')); save(result('unrelated', 'outsider'));
  for (const id of [a, b]) f.store.set('task', id, { ...f.store.get<any>('task', id), status: 'completed' }); const summary = f.service.summary(started); expect(summary.status).toBe('completed'); expect(summary.matched).toBe(2); expect(summary.qualifyingUnique).toBe(2); expect(summary.groups.map(group => group.matched)).toEqual([1, 1]); expect(summary.selections.find(item => item.creatorId === 'instagram:shared')?.groupId).toBe('study'); expect(summary.selections.find(item => item.creatorId === 'instagram:shared')?.resultId).toBe(`${b}|shared`); expect(summary.results).toHaveLength(4);
  f.store.delete('result', `${a}|only-tech`); expect(f.service.summary(started).status).toBe('partial'); expect(f.service.summary(started).matched).toBe(1);
  f.store.set('task', a, { ...f.store.get<any>('task', a), status: 'needs_input' }); expect(f.service.summary(started).status).toBe('needs_input');
  const facts = f.service.facts(); expect(facts[0]).not.toHaveProperty('results'); expect(facts[0]).toHaveProperty('reportUrl');
});
it('配额不足、重复结果和多槽匹配不会重复计人', async () => {
  const f = fixture(); const c = f.service.save({ ...plan, groups: [{ ...plan.groups[0], spec: { ...spec, count: 2 } }, plan.groups[1]] }, 'call'); f.service.start(c.id, 1); await f.engine.currentRun; const started = f.store.get<any>('campaign', c.id); const [a, b] = started.childTaskIds;
  for (const value of [result(a, 'shared'), { ...result(a, 'shared'), id: 'duplicate' }, result(b, 'shared')]) f.store.set('result', value.id, value);
  for (const id of [a, b]) f.store.set('task', id, { ...f.store.get<any>('task', id), status: 'partial' }); expect(f.service.summary(started).matched).toBe(1); expect(f.service.summary(started).requested).toBe(3); expect(f.service.summary(started).groups[0].eligible).toBe(1);
});
it('Campaign 工具保存、查询、启动、版本和参数边界，基础工具仍可调用', async () => {
  const f = fixture(); const tools = campaignTools(f.service, basicTools(f.store)); expect(tools.definitions).toHaveLength(5);
  for (const args of [null, [], 1, { id: 1 }, { id: '' }, { revision: 0 }, { revision: 1.5 }]) await expect(tools.execute('get_campaigns', args, 'c')).rejects.toThrow();
  const c = await tools.execute('save_campaign_plan', { plan }, 'call') as any; expect(await tools.execute('get_campaigns', {}, 'q')).toHaveLength(1); expect(await tools.execute('get_campaigns', { id: c.id }, 'q')).toHaveProperty('status', 'draft'); await expect(tools.execute('get_campaigns', { id: 'missing' }, 'q')).rejects.toThrow('不存在');
  for (const args of [{}, { id: c.id }, { revision: 1 }]) await expect(tools.execute('start_campaign', args, 's')).rejects.toThrow('指定');
  const revised = await tools.execute('save_campaign_plan', { id: c.id, revision: 1, plan }, 'edit') as any; expect(revised.revision).toBe(2); await tools.execute('start_campaign', { id: c.id, revision: 2 }, 's'); await f.engine.currentRun; expect(await tools.execute('get_tasks', {}, 'q')).toHaveLength(2);
});
it('HTTP 可查方案与去重报告、启动版本保护，所有数据鉴权并转义', async () => {
  const f = fixture(); initializeAdmin(f.store, 'admin'); const c = f.service.save({ ...plan, title: '<script>bad</script>' }, 'c'); const app = createApp({ store: f.store, now: () => 1, onMessage: () => {}, active: () => false }); registerCampaigns(app, f.service);
  try { expect((await app.inject('/api/campaigns')).statusCode).toBe(401); const login = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } }); const cookie = login.headers['set-cookie']!.toString().split(';')[0]; const get = (url: string) => app.inject({ url, headers: { cookie } }); const post = (id: string, revision: number) => app.inject({ method: 'POST', url: `/api/campaigns/${id}/start`, headers: { cookie }, payload: { revision } });
    expect((await get('/api/campaigns')).json()).toHaveLength(1); for (const url of ['/api/campaigns/missing', '/api/campaigns/missing/report']) expect((await get(url)).statusCode).toBe(404);
    expect((await get(`/api/campaigns/${c.id}`)).json().revision).toBe(1); const draft = await get(`/api/campaigns/${c.id}/report`); expect(draft.body).not.toContain('<script>'); expect(draft.body).toContain('&lt;script&gt;'); expect(draft.body).not.toContain('逐条件证据与未入选结果'); expect(draft.headers['content-security-policy']).toContain("default-src 'none'"); expect((await post('missing', 1)).statusCode).toBe(409); expect((await post(c.id, 9)).statusCode).toBe(409); expect((await post(c.id, 1)).statusCode).toBe(200); await f.engine.currentRun;
    const started = f.store.get<any>('campaign', c.id); const r = result(started.childTaskIds[0], 'one'); r.creator.profileUrl = 'https://social.test/profile?one=1&two=2'; f.store.set('result', r.id, r); const report = await get(`/api/campaigns/${c.id}/report`); expect(report.body).toContain('@one'); expect(report.body).toContain('profile?one=1&amp;two=2'); expect(report.body).not.toContain('&amp;amp;'); expect(report.body).toContain('逐条件证据与未入选结果');
  } finally { await app.close(); }
});
it('Campaign 偏好排序、终态总报告交付与重复轮询不重复发消息',async()=>{const f=fixture();const c=f.service.save({...plan,groups:[{...plan.groups[0],spec:{...plan.groups[0].spec,criteria:[{id:'pref',label:'geek',required:false,basis:'text'}]}}]},'delivery');f.service.deliver();expect(f.store.list('delivery')).toHaveLength(0);const started=f.service.start(c.id,1);await f.engine.currentRun;const id=started.childTaskIds[0];const plain=result(id,'plain');const preferred={...result(id,'preferred'),judgments:[{criterionId:'pref',verdict:'match' as const,reason:'supported',evidenceIds:[]}]};f.store.set('result',plain.id,plain);f.store.set('result',preferred.id,preferred);f.store.set('task',id,{...f.store.get<any>('task',id),status:'completed'});expect(f.service.summary(started).selections[0].creatorId).toBe('instagram:preferred');f.service.deliver();f.service.deliver();expect(f.store.list<any>('message').filter(m=>m.text.includes('Campaign'))).toHaveLength(1);f.store.delete('result',plain.id);f.store.delete('result',preferred.id);f.service.deliver();expect(f.store.list<any>('message').filter(m=>m.text.includes('Campaign'))).toHaveLength(1);});
