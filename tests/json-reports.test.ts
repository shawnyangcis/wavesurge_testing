import { expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine, type ResearchTask } from '../src/server/research.ts';
import { CampaignService } from '../src/server/campaign.ts';
import { createApp } from '../src/server/app.ts';
import { initializeAdmin } from '../src/server/auth.ts';
import { registerResearch } from '../src/server/research-api.ts';
import { registerCampaigns } from '../src/server/campaign-api.ts';
import { registerWork, sealWork } from '../src/server/work-delivery.ts';
import type { Result, SearchSpec } from '../src/shared/research.ts';
const spec: SearchSpec = { title: '科技组', personaText: 'tech', count: 1, candidateBudget: 3, platforms: ['instagram'], regions: [], minFollowers: 0, maxFollowers: 100000, criteria: [] };
function row(taskId: string, handle: string, verdict: Result['verdict'], selected: boolean): Result {
  return { id: `${taskId}|${handle}`, taskId, verdict, selected, updatedAt: 10, tags: ['科技'], judgments: [{ criterionId: 'topic', label: '科技内容', verdict, reason: '公开简介', evidenceIds: ['bio'] }], creator: { id: handle, handle, displayName: '创作者', platform: 'instagram', followers: null, region: null, profileUrl: `https://instagram.com/${handle}/`, raw: { internal: 'do not export' }, evidence: [{ id: 'bio', url: `https://instagram.com/${handle}/`, kind: 'profile', text: '科技内容', provider: 'wavesurge', capturedAt: 1, publishedAt: null, assetId: 'image' }] } };
}
it('JSON 下载鉴权、过滤与空集合、原生类型、证据引用、统计和存储隔离', async () => {
  const store = new Store(':memory:'); initializeAdmin(store, 'admin');
  const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, async () => [], () => 1);
  const task = engine.start(spec, 'json');
  const rows = [row(task.id, 'selected', 'match', true), row(task.id, 'reserve', 'match', false), row(task.id, 'unknown', 'unknown', true)];
  for (const r of rows) store.set('result', r.id, r);
  const app = createApp({ store, now: () => 1, onMessage: () => {}, active: () => false }); registerResearch(app, engine);
  try {
    const url = `/api/reports/${task.id}?format=json`;
    expect((await app.inject(url)).statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } });
    const headers = { cookie: login.headers['set-cookie']!.toString().split(';')[0] };
    const get = (url: string) => app.inject({ url, headers });
    const response = await get(url); expect(response.headers['content-type']).toContain('application/json'); expect(response.headers['content-disposition']).toContain('creators.json');
    const data = response.json(); expect(data.schemaVersion).toBe('1.0');
    expect(data.counts.all).toMatchObject({ records: 3, qualified: 2, selected: 1, unknown: 1 });
    expect(data.results.map((r: Result) => r.selected)).toEqual([true, false, false]);
    expect(data.results[0].creator.followers).toBeNull(); expect(data.results[0].creator).not.toHaveProperty('raw');
    expect(data.results[0].creator.evidence[0].screenshotUrl).toBe('/api/assets/image');
    expect(data.results[0].judgments[0].evidenceIds).toEqual(['bio']);
    const filtered = (await get(url + '&verdict=unknown&tag=科技&tagMode=exact')).json();
    expect(filtered.scope.filters).toMatchObject({ verdict: 'unknown', tag: '科技', tagMode: 'exact' });
    expect(filtered.counts.all.records).toBe(3); expect(filtered.counts.exported.records).toBe(1); expect(filtered.groups[0].counts.exported.records).toBe(1);
    const empty = (await get(url + '&tag=missing')).json(); expect(empty.results).toEqual([]); expect(empty.counts.exported.records).toBe(0); expect(empty.counts.all.records).toBe(3);
    expect((await get(`/api/reports/${task.id}?tag=科技`)).body).toContain('tag=%E7%A7%91%E6%8A%80&amp;format=json');
    expect((await get('/api/reports/missing?format=json')).statusCode).toBe(404);
    expect((await get(url + '&verdict=bad')).statusCode).toBe(400);
    expect(store.get('result', rows[2].id)).toEqual(rows[2]);
    registerWork(store, 'batch', { kind: 'research', id: task.id, title: task.title, reportUrl: `/api/reports/${task.id}` });
    store.set('task', task.id, { ...task, status: 'completed' }); sealWork(store, ['batch'], 20);
    const batchUrl = '/api/work-batches/batch/report?format=json'; expect((await app.inject(batchUrl)).statusCode).toBe(401);
    const batch = (await get(batchUrl)).json(); expect(batch.report.kind).toBe('work_batch'); expect(batch.results).toEqual(data.results); expect(batch.workItems).toHaveLength(1);
    expect(store.list<{text: string}>('message').some(m => m.text.includes('[下载综合 JSON]'))).toBe(true);
  } finally { await app.close(); store.close(); }
});
it('Campaign JSON 与子报告使用最终跨组分配，合格总池和导出名单分开计数', async () => {
  const store = new Store(':memory:'); initializeAdmin(store, 'admin');
  const engine = new ResearchEngine(store, { submit: vi.fn().mockResolvedValue('remote'), poll: vi.fn() }, async () => [], () => 1);
  const service = new CampaignService(store, engine, () => 1);
  const campaign = service.save({ title: '两组', goal: '推广', audience: '学生', groups: ['a', 'b'].map(id => ({ id, rationale: '测试分配', spec: { ...spec, title: id } })) }, 'campaign');
  const started = service.start(campaign.id, 1); await engine.currentRun;
  const [a, b] = started.childTaskIds;
  for (const r of [row(a, 'shared', 'match', true), row(a, 'only_a', 'match', false), row(b, 'shared', 'match', true), row(b, 'pending', 'unknown', false)]) store.set('result', r.id, r);
  for (const id of [a, b]) store.set('task', id, { ...store.task<ResearchTask>(id), status: 'completed' });
  const app = createApp({ store, now: () => 1, onMessage: () => {}, active: () => false }); registerResearch(app, engine); registerCampaigns(app, service);
  try {
    const url = `/api/campaigns/${campaign.id}/report?format=json`; expect((await app.inject(url)).statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } }); const headers = { cookie: login.headers['set-cookie']!.toString().split(';')[0] };
    const response = await app.inject({ url, headers }); const data = response.json();
    expect(response.headers['content-disposition']).toContain('campaign-creators.json'); expect(data.report.kind).toBe('campaign'); expect(data.scope.selectionOnly).toBe(true);
    expect(data.counts.all).toMatchObject({ records: 4, qualified: 3, qualifiedUnique: 2, selected: 2 }); expect(data.results).toHaveLength(2);
    expect(data.groups.map((g: any) => g.counts.exported.selected)).toEqual([1, 1]); expect(data.campaign.groups[0].spec.count).toBe(1);
    const child = (await app.inject({ url: `/api/reports/${a}?format=json`, headers })).json();
    expect(child.results.find((r: Result) => r.creator.handle === 'shared')).toMatchObject({ selected: false, reportContext: { researchSelected: true, allocatedGroupId: 'b', selectionScope: 'campaign' } });
    expect(data.results.find((r: Result) => r.creator.handle === 'shared').reportContext.groupId).toBe('b');
    service.deliver(); expect(store.list<{text: string}>('message').some(m => m.text.includes(`[下载 JSON](/api/campaigns/${campaign.id}/report?format=json)`))).toBe(true);
  } finally { await app.close(); store.close(); }
});
