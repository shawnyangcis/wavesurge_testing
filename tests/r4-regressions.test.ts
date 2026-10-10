import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { CampaignService } from '../src/server/campaign.ts';
import { createApp } from '../src/server/app.ts';
import { initializeAdmin } from '../src/server/auth.ts';
import { registerResearch } from '../src/server/research-api.ts';
import { registerCampaigns } from '../src/server/campaign-api.ts';
import { registerWork, workResults } from '../src/server/work-delivery.ts';
import { htmlReport, csvReport } from '../src/server/reports.ts';
import { resolveJudgments } from '../src/server/verdict.ts';
import { reportGroups, reportResults } from '../src/server/report-scope.ts';
import { researchTools } from '../src/server/research-tools.ts';
import { basicTools } from '../src/server/tools.ts';
import { taskFacts } from '../src/server/task-facts.ts';
import type { Result, SearchSpec } from '../src/shared/research.ts';

const stores: Store[] = [];
afterEach(() => stores.splice(0).forEach(store => store.close()));
const spec: SearchSpec = { title: '数码研究', personaText: 'technology', count: 1, candidateBudget: 2, minFollowers: 10000, maxFollowers: 100000, platforms: ['instagram'], regions: [], criteria: [{ id: 'tech', label: '分享实际数码经验', required: true, basis: 'text' }] };
function fixture() {
  const store = new Store(':memory:'); stores.push(store);
  const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, vi.fn(), () => 1); engine.stopped = true;
  const campaigns = new CampaignService(store, engine, () => 1);
  return { store, engine, campaigns };
}
function row(taskId: string, handle: string, verdict: Result['verdict'] = 'match'): Result {
  return { id: `${taskId}|instagram:${handle}`, taskId, verdict, selected: false, updatedAt: 1, tags: ['数码'], revision: 1,
    creator: { id: `instagram:${handle}`, handle, displayName: handle, platform: 'instagram', followers: 20000, region: null, profileUrl: `https://www.instagram.com/${handle}/`, raw: { followerCount: 20000 }, evidence: [{ id: `profile-${handle}`, url: `https://www.instagram.com/${handle}/`, kind: 'profile', provider: 'wavesurge-instagram-raw', text: '20000 followers; actual technology reviews', capturedAt: 1, publishedAt: null }] },
    judgments: [{ criterionId: 'tech', label: '分享实际数码经验', verdict, reason: `${handle} 有本人实际数码体验内容`, evidenceIds: [`profile-${handle}`] }],
    annotations: [{ dimensionId: 'direction', status: 'supported', values: ['数码'], reason: '本人内容以设备实际使用为主', evidenceIds: [`profile-${handle}`] }]
  };
}
function save(f: ReturnType<typeof fixture>, value: Result) { f.store.set('result', value.id, value); }
function finish(f: ReturnType<typeof fixture>, id: string) { const task = f.store.get<any>('task', id); f.engine.recount(task); task.status = 'completed'; f.store.set('task', id, task); return task; }
async function api(f: ReturnType<typeof fixture>) {
  initializeAdmin(f.store, 'admin'); const app = createApp({ store: f.store, now: () => 1, onMessage: () => {}, active: () => false });
  registerResearch(app, f.engine); registerCampaigns(app, f.campaigns);
  const login = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } });
  const cookie = login.headers['set-cookie']!.toString().split(';')[0];
  return { app, get: (url: string) => app.inject({ url, headers: { cookie } }) };
}

it('F30: 两位合格只选一位，摘要与卡片分别统计合格、入选和缺额', () => {
  const f = fixture(), task = f.engine.start(spec, 'qualified');
  save(f, row(task.id, 'alpha')); save(f, row(task.id, 'beta')); const final = finish(f, task.id);
  expect(final.qualifying).toBe(2); expect(final.matched).toBe(1);
  const html = htmlReport(final, f.engine.results(task.id));
  expect(html).toContain('合格候选 2 人'); expect(html).toContain('最终入选 1 人'); expect(html).toContain('缺额 0 人');
  expect(html.match(/ · 已入选/g)).toHaveLength(1); expect(html.match(/ · 合格备选/g)).toHaveLength(1);
});

it('F31: 三组补标保留六条记录的来源，分别显示记录数与两位去重账号', () => {
  const f = fixture();
  const sources = ['实用数码', '生活效率', '教程风格'].map(title => f.engine.start({ ...spec, title }, title));
  for (const [index, task] of sources.entries()) { save(f, row(task.id, 'alpha')); save(f, row(task.id, 'beta', index === 2 ? 'unknown' : 'match')); finish(f, task.id); }
  for (const task of sources) { const job = f.engine.enrichment.start({ taskId: task.id, mode: 'annotate' }, `retag-${task.id}`); registerWork(f.store, 'batch', { kind: 'enrichment', id: job.id, title: job.title, reportUrl: `/api/reports/${task.id}` }); }
  const report = workResults(f.store, f.store.get<any>('work-batch', 'batch'));
  expect(report.results).toHaveLength(6);
  const html = htmlReport(report.task, report.results), csv = csvReport(report.task, report.results);
  expect(html).toContain('已核验 6 条记录'); expect(html).toContain('去重创作者 2 人'); expect(html).toContain('合格记录 5 条'); expect(html).toContain('入选记录 3 条');
  for (const task of sources) { expect(html).toContain(`data-source-task-id="${task.id}"`); expect(csv).toContain(task.title); expect(csv).toContain(task.id); }
  expect(csv.split('\r\n')[0]).toContain('来源任务ID'); expect(csv.split('\r\n')[0]).toContain('分组名称');
  expect(f.store.list<Result>('result').every(r => !('reportContext' in r))).toBe(true);
});

it('F29/F32: Campaign总/子/查询/CSV入选同源，总文档直接交付每位条件、理由和画像', async () => {
  const f = fixture();
  const campaign = f.campaigns.save({ title: '效率设备 Campaign', goal: '介绍真实设备体验', audience: '年轻工作者', groups: [{ id: 'practical', rationale: '评测设备', spec }, { id: 'life', rationale: '生活效率', spec: { ...spec, title: '生活效率' } }] }, 'campaign');
  const started = f.campaigns.start(campaign.id, 1);
  for (const taskId of started.childTaskIds) { save(f, row(taskId, 'alpha')); save(f, row(taskId, 'beta')); finish(f, taskId); }
  const stored = f.store.list<Result>('result'), summary = f.campaigns.summary(started);
  expect(summary.selections).toHaveLength(2); expect(new Set(summary.selections.map(s => s.creatorId)).size).toBe(2);
  const { app, get } = await api(f);
  try {
    const parent = await get(`/api/campaigns/${started.id}/report`);
    expect(parent.body).toContain('分享实际数码经验'); expect(parent.body).toContain('实际数码体验内容'); expect(parent.body).toContain('画像 direction'); expect(parent.body).toContain('标签：数码');
    for (const taskId of started.childTaskIds) {
      const projected = (await get(`/api/results?taskId=${taskId}`)).json<Result[]>();
      expect(projected.filter(r => r.selected).map(r => r.id)).toEqual(summary.selections.filter(s => s.resultId.startsWith(taskId + '|')).map(s => s.resultId));
      const child = await get(`/api/reports/${taskId}`);
      for (const r of projected) expect(child.body).toContain(`data-result-id="${r.id}" data-source-task-id="${taskId}" data-selected="${r.selected}"`);
      expect(child.body).toContain('Campaign 最终分配');
    }
    const csv = await get(`/api/campaigns/${started.id}/report?format=csv`);
    expect(csv.headers['content-type']).toContain('text/csv'); expect(csv.body).toContain('分组名称'); expect(csv.body.split('\r\n')).toHaveLength(3);
    expect(f.store.list('result')).toEqual(stored);
  } finally { await app.close(); }
});

it('F26: 粉丝判断只引用本人粉丝事实与对应Wave数值来源，其他完整来源仍保留', () => {
  const creator = row('task', 'alpha').creator;
  creator.evidence.push({ ...creator.evidence[0], id: 'browser', provider: 'headed-chromium', kind: 'browser_snapshot', text: '20.0K followers', assetId: 'shot' });
  creator.evidence.push({ ...creator.evidence[0], id: 'post', kind: 'post', text: 'A technology review' });
  creator.evidence.push({ ...creator.evidence[0], id: 'cover', kind: 'video_cover', text: '视频封面资源；不能当作照片帖。' });
  creator.facts = { conflicts: [], followers: { rawValue: '20.0K followers', min: 19950, max: 20099, evidenceIds: ['browser'] } };
  const outcome = resolveJudgments(spec, creator, row('task', 'alpha').judgments);
  expect(outcome.judgments.find(j => j.criterionId === '__followers')?.evidenceIds.sort()).toEqual(['browser', 'profile-alpha']);
  expect(creator.evidence).toHaveLength(4); expect(outcome.verdict).toBe('match');
});

it('F27: 精确肯定标签不返回否定/未知，明确包含模式仍可按字面找，HTML与CSV一致', async () => {
  const f = fixture(), task = f.engine.start(spec, 'tag'); const negative = { ...row(task.id, 'alpha'), tags: ['不戴眼镜'] }, positive = { ...row(task.id, 'beta'), tags: ['戴眼镜'] };
  save(f, negative); save(f, positive); finish(f, task.id);
  const { app, get } = await api(f);
  try {
    const exact = await get(`/api/results?taskId=${task.id}&tag=${encodeURIComponent('戴眼镜')}&tagMode=exact`);
    expect(exact.statusCode).toBe(200); expect(exact.json<Result[]>().map(r => r.creator.handle)).toEqual(['beta']);
    const partial = await get(`/api/results?taskId=${task.id}&tag=${encodeURIComponent('戴眼镜')}&tagMode=contains`); expect(partial.json()).toHaveLength(2);
    const csv = await get(`/api/reports/${task.id}?format=csv&tag=${encodeURIComponent('戴眼镜')}&tagMode=exact`); expect(csv.body).toContain('beta'); expect(csv.body).not.toContain('alpha');
    const html = await get(`/api/reports/${task.id}?tag=${encodeURIComponent('戴眼镜')}&tagMode=exact`); expect(html.body).toContain('本次筛选展示 1 条记录'); expect(html.body).toContain('合格候选 2 人');
  } finally { await app.close(); }
});

it('缺少或脱离Campaign来源的记录保留任务归属；未知系统条件仍有可读标识', async () => {
 const f = fixture(), task = f.engine.start(spec, 'missing-parent');
 task.parentCampaignId = 'missing'; f.store.set('task', task.id, task);
 const parent = f.campaigns.start(f.campaigns.save({ title: '方案', goal: '数码', audience: '工作者', groups: [{ id: 'g', rationale: '科技信息', spec: { ...spec, criteria: [...spec.criteria, { id: 'pref', label: '教程偏好', required: false, basis: 'text' }] } }] }, 'scope').id, 1);
 const child = f.store.get<any>('task', parent.childTaskIds[0]); const value = row(child.id, 'one');
 value.judgments.push({ criterionId: '__system', verdict: 'unknown', reason: '系统未知条件', evidenceIds: [] }); save(f,value); finish(f, child.id);
 const orphan = {...child, id: 'outside'}; f.store.set('task',orphan.id,orphan);
 const scoped = reportResults(f.store,[value,row(task.id,'missing'),row('unavailable','unknown'),row(orphan.id,'outside')]);
 expect(scoped[0].judgments.at(-1)?.label).toBe('__system'); expect(scoped[1].reportContext?.selectionScope).toBe('research');
 expect(scoped[2].reportContext?.sourceTaskTitle).toBe('unavailable'); expect(scoped[3].reportContext?.selectionScope).toBe('research');
 expect(reportGroups(f.store,[task.id,'unavailable']).map(g=>g.selectionScope)).toEqual(['research','research']);
 const {app,get}=await api(f); try { expect((await get(`/api/campaigns/${parent.id}/report`)).body).toContain('教程偏好'); } finally { await app.close(); }
 const projected = {...value, selected:false, reportContext: {sourceTaskTitle:'组',groupId:'g',groupTitle:'组',selectionScope:'campaign' as const,campaignId:'parent'}};
 const html=htmlReport({...child,reportGroups:[{id:'g',taskId:child.id,title:'组',requested:1,selectionScope:'campaign'}]},[projected]);
 expect(html).toContain('本组未入选；条件和配额'); expect(html).toContain('Campaign：parent');
 expect(htmlReport(child,[])).toContain('本组本次展示清单为空');
});

it('Agent按实际完整标签查询且拒绝错误模式，记录单位和预选口径写入当前事实', async () => {
 const f=fixture(),task=f.engine.start(spec,'tool-tags'); const match={...row(task.id,'one'),selected:true,tags:['戴眼镜']};save(f,match);save(f,{...row(task.id,'two'),tags:['不戴眼镜']});
 const tools=researchTools(f.engine,basicTools(f.store));
 expect((await tools.execute('get_results',{taskId:task.id,tag:'戴眼镜',tagMode:'exact'},'q') as any).results.map((r:any)=>r.creator.handle)).toEqual(['one']);
 expect((await tools.execute('get_results',{taskId:task.id,tag:'戴眼镜',tagMode:'contains'},'q') as any).total).toBe(2);
 await expect(tools.execute('get_results',{tagMode:'wrong'},'q')).rejects.toThrow('参数');
 const job=f.engine.enrichment.start({taskId:task.id,mode:'annotate'},'facts'); task.parentCampaignId='parent';f.store.set('task',task.id,task);
 expect(taskFacts(f.store).find(t=>t.id===job.id)?.matchedMeaning).toContain('记录数');
 expect(taskFacts(f.store).find(t=>t.id===task.id)?.matchedMeaning).toContain('预选数');
});
