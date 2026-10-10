import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import type { ResearchTask } from '../src/server/research.ts';
import { researchTools } from '../src/server/research-tools.ts';
import { basicTools } from '../src/server/tools.ts';
import { createApp } from '../src/server/app.ts';
import { registerResearch } from '../src/server/research-api.ts';
import { initializeAdmin } from '../src/server/auth.ts';
import { htmlReport, csvReport, escapeHtml, safeLink } from '../src/server/reports.ts';
import type { DesktopBroker } from '../src/server/desktop.ts';
import type { Result, SearchSpec } from '../src/shared/research.ts';
const stores: Store[] = []; afterEach(() => stores.splice(0).forEach(store => store.close()));
const spec: SearchSpec = { title: '<script>x</script>', personaText: 'tech', count: 1, candidateBudget: 2, platforms: ['instagram'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [] };
const result: Result = { id: 'result', taskId: 'task', creator: { id: 'a', platform: 'instagram', handle: '=SUM(1)', displayName: '<img onerror=x>', profileUrl: 'javascript:alert(1)', followers: null, region: null, raw: {}, evidence: [{ id: 'e', url: 'https://source.test/?x="', text: 'source', kind: 'content', provider: 'wave', publishedAt: null, capturedAt: 0 }] }, verdict: 'unknown', judgments: [{ criterionId: 'tech', verdict: 'unknown', reason: '<unsafe>', evidenceIds: ['e'] }], tags: ['科技内容', 'quoted"tag'], updatedAt: 10 };
function fixture() { const store = new Store(':memory:'); stores.push(store); const wave = { submit: vi.fn().mockResolvedValue('r'), poll: vi.fn() }; const engine = new ResearchEngine(store, wave, async () => [], () => 1); return { store, engine, wave }; }
it('报告正确人数、完整条件、未知字段，HTML/CSV 注入保护', () => {
  const f = fixture(); const task = f.engine.start(spec, 'report'); const html = htmlReport(task, [result]); expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('目标 1 人'); expect(html).toContain('合格候选 0 人'); expect(html).toContain('href="#"'); expect(html).toContain('日期未知');
  expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;'); expect(safeLink('HTTPS://safe.test')).toBe('HTTPS://safe.test'); expect(safeLink('javascript:x')).toBe('#');
  const known = { ...result, creator: { ...result.creator, followers: 20000, region: 'Canada', evidence: [{ ...result.creator.evidence[0], publishedAt: '2026-10-09' }] }, judgments: [{ ...result.judgments[0], label: '科技' }] }; expect(htmlReport(task, [known])).toContain('2026-10-09'); expect(htmlReport(task, [known])).toContain('科技');
  const csv = csvReport(task, [result]); expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain("'=" ); expect(csv).toContain('quoted""tag'); expect(csvReport(task, [known])).toContain('Canada');
});
it('任务工具串联、查询标签和取消，非法参数与基础工具转发', async () => {
  const f = fixture(); const tools = researchTools(f.engine, basicTools(f.store)); const task = await tools.execute('start_research', spec, 'stable') as ResearchTask; await f.engine.currentRun; expect(f.wave.submit).toHaveBeenCalledTimes(1); expect(tools.definitions.some(tool => tool.function.name === 'start_research')).toBe(true);
  f.store.set('result', 'r', { ...result, taskId: task.id, creator: {...result.creator, facts: {conflicts: [], followers:{min:20350,max:20449,rawValue:'20.4K subscribers',evidenceIds:['e']}}} });
  expect(await tools.execute('get_results', {}, 'facts')).toMatchObject({results:[{creator:{followers:null,facts:{followers:{min:20350,max:20449}}}}]});
  expect(await tools.execute('get_results', {}, 'q')).toHaveProperty('total', 1); expect(await tools.execute('get_results', { taskId: task.id, tag: '科技' }, 'q')).toHaveProperty('total', 1); expect(await tools.execute('get_results', { taskId: 'other' }, 'q')).toHaveProperty('total', 0); expect(await tools.execute('get_results', { tag: 'other' }, 'q')).toHaveProperty('total', 0);
  for (const bad of [null, 1, [], { taskId: 1 }, { tag: 1 }, { offset: 0.5 }, { offset: -1 }, { limit: 0.5 }, { limit: 0 }, { limit: 21 }]) await expect(tools.execute('get_results', bad, 'q')).rejects.toThrow('参数');
  expect(await tools.execute('get_results', { offset: 1, limit: 1 }, 'q')).toMatchObject({ total: 1, offset: 1, limit: 1, results: [] });
  for (const bad of [null, {}, { taskId: 1 }, { taskId: '' }]) await expect(tools.execute('cancel_research', bad, 'q')).rejects.toThrow('编号');
  expect(await tools.execute('cancel_research', { taskId: task.id }, 'q')).toHaveProperty('status', 'cancelled'); expect(await tools.execute('get_tasks', {}, 'q')).toHaveLength(1);
});
it('鉴权的结果与报告 HTTP、标签过滤、错误格式和不存在任务', async () => {
  const f = fixture(); initializeAdmin(f.store, 'admin'); const task = f.engine.start(spec, 'report'); f.store.set('result', 'r', { ...result, taskId: task.id });
  const app = createApp({ store: f.store, now: () => 1, onMessage: () => {}, active: () => false }); registerResearch(app, f.engine);
  try { const session = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } }); const cookie = session.headers['set-cookie']!.toString().split(';')[0]; const get = (url: string) => app.inject({ url, headers: { cookie } });
    for (const url of ['/api/results', `/api/reports/${task.id}`]) expect((await app.inject(url)).statusCode).toBe(401);
    expect((await get('/api/results')).json()).toHaveLength(1); expect((await get(`/api/results?taskId=${task.id}&tag=${encodeURIComponent('科技')}`)).json()).toHaveLength(1); expect((await get('/api/results?taskId=absent')).json()).toEqual([]); expect((await get('/api/results?tag=absent')).json()).toEqual([]); expect((await get('/api/results?platform=instagram&verdict=unknown')).json()).toHaveLength(1); expect((await get('/api/results?platform=twitter')).json()).toEqual([]); expect((await get('/api/results?verdict=match')).json()).toEqual([]); expect((await get('/api/results?platform=bad')).statusCode).toBe(400);
    expect((await get('/api/reports/absent')).statusCode).toBe(404); expect((await get(`/api/reports/${task.id}?format=bad`)).statusCode).toBe(400);
    const html = await get(`/api/reports/${task.id}`); expect(html.headers['content-type']).toContain('text/html'); expect(html.headers['content-security-policy']).toContain("default-src 'none'");
    const csv = await get(`/api/reports/${task.id}?format=csv`); expect(csv.headers['content-disposition']).toContain('creators.csv'); expect(csv.body).toContain('账号,平台');
  } finally { await app.close(); }
});

it('取消原工作时撤销其人工协助，不释放其它工作所有的桌面', async () => {
  const f = fixture(); const task = f.engine.start(spec, 'human-cancel'); const release = vi.fn().mockResolvedValue({}); const active = vi.fn().mockReturnValue({ id: 'r', taskId: task.id }); const tools = researchTools(f.engine, basicTools(f.store), { active, release } as unknown as DesktopBroker); await tools.execute('cancel_research', { taskId: task.id }, 'c'); expect(release).toHaveBeenCalledWith('r', '用户取消原任务，协助授权已撤销'); await f.engine.currentRun;
  active.mockReturnValue({ id: 'other', taskId: 'other' }); await tools.execute('cancel_research', { taskId: task.id }, 'c'); expect(release).toHaveBeenCalledOnce(); active.mockReturnValue(undefined); await tools.execute('cancel_research', { taskId: task.id }, 'c'); expect(release).toHaveBeenCalledOnce();
});

it('当前筛选 CSV 与 API 一致，HTML 带原文/时间/来源与可离线截图，缺失资产明确反馈',async()=>{
 const f=fixture();initializeAdmin(f.store,'admin');const task=f.engine.start(spec,'filters');const image=vi.fn(()=> 'data:image/png;base64,AAAA');const captured={...result,id:'captured',taskId:task.id,creator:{...result.creator,evidence:[{...result.creator.evidence[0],assetId:'image',text:'captured source',capturedAt:10}]},annotations:[{dimensionId:'style',status:'supported' as const,values:['教程'],reason:'observed',evidenceIds:['e']}],selected:true};f.store.set('result','captured',captured);f.store.set('result','match',{...captured,id:'match',verdict:'match',tags:['geek'],creator:{...captured.creator,handle:'matched-person'}});
 const app=createApp({store:f.store,now:()=>1,onMessage:()=>{},active:()=>false});registerResearch(app,f.engine,image);const session=await app.inject({method:'POST',url:'/api/login',payload:{password:'admin'}});const cookie=session.headers['set-cookie']!.toString().split(';')[0];const get=(url:string)=>app.inject({url,headers:{cookie}});
 const csv=await get(`/api/reports/${task.id}?format=csv&tag=geek&platform=instagram&verdict=match`);expect(csv.body).toContain('matched-person');expect(csv.body).not.toContain('=SUM');expect((await get(`/api/reports/${task.id}?format=csv&verdict=no_match`)).body.split('\r\n')).toHaveLength(1);
 const html=await get(`/api/reports/${task.id}`);expect(html.body).toContain('data:image/png;base64,AAAA');expect(html.body).toContain('captured source');expect(html.body).toContain('wave');expect(html.body).toContain('完整证据映射');expect(html.headers['content-security-policy']).toContain('img-src data:');expect(htmlReport(task,[captured],()=>{throw new Error('missing')})).toContain('截图暂不可读取');expect(htmlReport(task,[captured],()=> 'unsafe')).not.toContain('src="unsafe"');expect(htmlReport(task,[{...captured,creator:{...captured.creator,facts:{followers:{min:19950,max:20049,rawValue:'20K followers',evidenceIds:['e']},conflicts:[]}},annotations:[{...captured.annotations[0],status:'unknown',values:[]}]}])).toContain('20K followers');await app.close();
});
it('报告显式展示入选和备选，未确认者不混进备选名单',()=>{const f=fixture();const task=f.engine.start(spec,'selected-report');expect(htmlReport(task,[{...result,verdict:'match',selected:true}])).toContain(' · 已入选');expect(htmlReport(task,[{...result,verdict:'match',selected:false}])).toContain(' · 合格备选');expect(htmlReport(task,[{...result,selected:false}])).not.toContain(' · 合格备选');});
it('互动率在 HTML 与 CSV 交付比例、样本和公式；缺失计数清楚显示未知',()=>{const f=fixture();const task=f.engine.start(spec,'engagement');for(const rate of [.044,null]){const enriched={...result,creator:{...result.creator,engagement:{rate,sampleSize:2,formula:'mean(likes + comments) / followers',unit:'ratio' as const},photoUrls:['https://images.test/photo']}};const html=htmlReport(task,[enriched]);expect(html).toContain(rate===null?'近期互动率：未知':'近期互动率：4.40%');expect(html).toContain('样本 2 条');expect(csvReport(task,[enriched])).toContain('images.test/photo');}});
