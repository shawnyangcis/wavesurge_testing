import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const fixture = process.env.R3_MODE === 'fixture';
const root = 'validation/2026-10-10/r3-fixes', images = 'output/playwright/r3-fixes';
const label = fixture ? 'phase-b-fixture-required' : 'phase-b-real-required';
const base = `http://127.0.0.1:${fixture ? 3581 : 3580}`;
const project = fixture ? 'creator-studio-r3-fixes-edge' : 'creator-studio-r3-fixes';
const comp = ['compose', '-p', project, '-f', 'compose.yaml', '-f', fixture ? 'tests/fixtures/qa-compose.yaml' : `${root}/live-compose.yaml`];
mkdirSync(images, { recursive: true });
const docker = (...args) => execFileSync('docker', [...comp, ...args], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const sql = code => JSON.parse(docker('exec', '-T', 'app', 'node', '--input-type=module', '-e', `import {Store} from './src/server/store.ts';const s=new Store('/app/data/studio.sqlite');${code};s.close();`));
const output = { startedAt: new Date().toISOString(), source: fixture ? 'Controlled Wave/candidate pages; actual configured model, production workers and headed desktop; UI VNC claim/release. No social login.' : 'Actual WaveSurge, configured model, production workers/headed browser and natural UI request. Controlled lease setup only, without login or challenge bypass.', cases: [], pageErrors: [] };
const save = () => writeFileSync(`${root}/${label}.json`, JSON.stringify(output, null, 2));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
page.on('pageerror', e => output.pageErrors.push(String(e)));
const get = async path => (await page.request.get(base + path)).json();
const state = () => get('/api/state');
const idle = () => expect.poll(async () => { const s = await state(); return !s.active && !s.messages.some(m => m.role === 'user' && m.epoch === s.epoch && m.state === 'pending'); }, { timeout: 240000, intervals: [1000] }).toBe(true);
const shot = name => page.screenshot({ path: `${images}/${label}-${name}.png`, fullPage: true });
const notices = (s, before) => s.messages.filter(m => m.id.startsWith('report-') && !before.messages.some(x => x.id === m.id));
const batchData = ids => sql(`const ids=${JSON.stringify(ids)};process.stdout.write(JSON.stringify({tasks:s.list('task').filter(t=>ids.includes(t.id)).map(t=>({id:t.id,spec:t.spec,deliveryBatchId:t.deliveryBatchId})),batches:s.list('work-batch').filter(b=>b.items.some(i=>ids.includes(i.id)))}))`);
const prepare = async name => {
 const target = fixture ? 'http://wave-fixture:8087/creator/alice' : 'https://www.instagram.com/valstechtalkk/';
 return JSON.parse(docker('exec', '-T', 'app', 'node', '--input-type=module', '-e', `import{Store}from'./src/server/store.ts';import{DesktopBroker,desktopToken,HumanRequired}from'./src/server/desktop.ts';const s=new Store('/app/data/studio.sqlite'),b=new DesktopBroker(s,process.env.DESKTOP_URL,desktopToken(process.env.DESKTOP_TOKEN_FILE),'/app/data/assets',fetch,Date.now);await b.scope([${JSON.stringify(target)}]);const o=await b.command({action:'navigate',url:${JSON.stringify(target)}});try{await b.assistance(${JSON.stringify(name)},'controlled-lease','R3租约测试准备：只验证人工接管与任务调度，没有进行登录')}catch(e){if(!(e instanceof HumanRequired))throw e}process.stdout.write(JSON.stringify({page:{url:o.url,title:o.title,assetId:o.assetId},request:b.active()}));s.close();`));
};
const openDesktop = async () => { await page.getByRole('button', { name: '浏览器桌面', exact: true }).click(); return page.getByRole('dialog', { name: '浏览器桌面' }); };
const release = async text => { const dialog = await openDesktop(); await page.getByLabel('协助结果').fill(text); await page.getByRole('button', { name: '完成协助，交还 Agent' }).click(); await expect(page.getByRole('button', { name: '完成协助，交还 Agent' })).toHaveCount(0); await dialog.getByRole('button', { name: '关闭', exact: true }).click(); };
async function run(input, index) {
 await idle();
 const record = { input, index, at: new Date().toISOString(), preparation: await prepare(`${label}-${index}`), checks: [], accessChallenges: [] };
 output.cases.push(record); save();
 const dialog = await openDesktop(); await expect(dialog).toContainText('R3租约测试准备'); await page.getByRole('button', { name: '接管并协助' }).click();
 await expect(page.frameLocator('iframe[title="持久浏览器桌面"]').locator('html')).toHaveClass(/noVNC_connected/, { timeout: 20000 });
 expect((await get('/api/desktop')).request.status).toBe('human'); await shot(`${index}-claimed`); await dialog.getByRole('button', { name: '关闭', exact: true }).click();
 const before = await state(); const initial = sql("process.stdout.write(JSON.stringify({campaigns:s.list('campaign').length,calls:s.list('call').map(c=>c.id),waves:s.list('wave-call').map(c=>c.id)}))");
 await page.getByRole('textbox', { name: '发送消息' }).fill(input); await page.getByRole('button', { name: '发送消息', exact: true }).click();
 await expect.poll(async () => (await state()).tasks.filter(t => !before.tasks.some(x => x.id === t.id)).length, { timeout: 210000, intervals: [250] }).toBe(2);
 const duringRegistration = await state(); const ids = duringRegistration.tasks.filter(t => !before.tasks.some(x => x.id === t.id)).map(t => t.id);
 record.registration = batchData(ids); expect(record.registration.batches).toHaveLength(1); expect(record.registration.batches[0].items).toHaveLength(2);
 expect(sql("process.stdout.write(JSON.stringify(s.list('campaign').length))")).toBe(initial.campaigns);
 const text = record.registration.tasks.find(t => t.spec.verificationMode === 'text'), auto = record.registration.tasks.find(t => t.spec.verificationMode !== 'text');
 expect(text).toBeTruthy(); expect(auto).toBeTruthy(); expect(record.registration.tasks.every(t => t.spec.annotations?.length)).toBe(true);
 expect(auto.spec.verificationMode).toBe('browser');
 await idle(); await expect.poll(async () => ['completed', 'partial'].includes((await state()).tasks.find(t => t.id === text.id).status), { timeout: 240000, intervals: [1000] }).toBe(true);
 const during = await state(); record.during = { tasks: during.tasks.filter(t => ids.includes(t.id)), desktop: (await get('/api/desktop')).request, notices: notices(during, before) };
 expect(record.during.tasks.find(t => t.id === text.id).evaluated).toBe(2); expect(record.during.tasks.find(t => t.id === auto.id).evaluated).toBe(0); expect(record.during.desktop.status).toBe('human'); expect(record.during.notices).toHaveLength(0);
 record.checks.push('Two real registered jobs in one batch; no extra Campaign confirmation; text evaluates both while human owns desktop; browser work persists and aggregate delivery waits'); await shot(`${index}-text-completed-browser-waiting`); save();
 await release('这是受控租约验证，我没有完成社交登录或验证码。现在交还浏览器，请根据实际公开页面重新观察。');
 const deadline = Date.now() + 360000;
 while (Date.now() < deadline) {
  const s = await state(), task = s.tasks.find(t => t.id === auto.id);
  if (['completed', 'partial', 'failed'].includes(task.status)) break;
  const request = (await get('/api/desktop')).request;
  if (request && request.id !== record.preparation.request.id) {
   record.accessChallenges.push({ taskId: request.taskId, creatorId: request.creatorId, reason: request.reason }); save();
   const dialog = await openDesktop(); if (request.status !== 'human') await page.getByRole('button', { name: '接管并协助' }).click(); await shot(`${index}-actual-access-challenge-${record.accessChallenges.length}`);
   await page.getByLabel('协助结果').fill('本次没有登录凭据，未完成登录或验证码；明确跳过当前访问挑战。请把缺失证据保留 unknown，不要重复要求同一账号登录，也不要假定页面访问成功。'); await page.getByRole('button', { name: '完成协助，交还 Agent' }).click(); await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  }
  await page.waitForTimeout(1000);
 }
 await expect.poll(async () => notices(await state(), before).length, { timeout: 30000, intervals: [1000] }).toBe(1);
 const final = await state(); record.final = { tasks: final.tasks.filter(t => ids.includes(t.id)), notices: notices(final, before), batch: batchData(ids).batches[0], results: (await get('/api/results')).filter(r => ids.includes(r.taskId)).map(r => ({ ...r, creator: { ...r.creator, raw: undefined } })) };
 expect(record.final.tasks.find(t => t.id === auto.id).evaluated).toBe(2); expect(record.final.tasks.every(t => ['completed', 'partial'].includes(t.status))).toBe(true); expect(record.final.batch).toMatchObject({ sealed: true, delivered: true }); expect(record.final.batch.items).toHaveLength(2);
 if (fixture) expect(record.final.results.filter(r => r.taskId === auto.id).every(r => r.creator.evidence.some(e => e.kind === 'browser_snapshot' && e.assetId && e.url.startsWith('http://wave-fixture:8087/creator/')))).toBe(true);
 else expect(record.final.results.filter(r => r.taskId === text.id).every(r => !r.creator.evidence.some(e => e.kind === 'browser_snapshot'))).toBe(true);
 record.pageVerification = record.final.results.filter(r => r.taskId === auto.id).map(r => ({handle:r.creator.handle,verdict:r.verdict,visit:r.judgments.find(j=>j.criterionId==='__profile_visit'),proof:r.creator.browserVerification,pages:r.creator.evidence.filter(e=>e.kind==='browser_snapshot'&&e.assetId&&e.capturedAt>=Date.parse(record.at)).map(e=>({id:e.id,url:e.url,capturedAt:e.capturedAt,assetId:e.assetId}))}));
 for(const r of record.pageVerification){expect(r.visit).toBeTruthy();if(r.visit.verdict==='match'){expect(r.pages.some(p=>r.proof.profileEvidenceIds.includes(p.id))).toBe(true);}else{expect(r.visit.verdict).toBe('unknown');expect(r.verdict).not.toBe('match');}}
 if(fixture)expect(record.pageVerification.every(r=>r.visit.verdict==='match')).toBe(true);
 record.calls = sql(`process.stdout.write(JSON.stringify(s.list('call').filter(c=>!${JSON.stringify(initial.calls)}.includes(c.id)).map(c=>({id:c.id,kind:c.kind,tools:c.response?.choices?.[0]?.message?.tool_calls?.map(t=>({name:t.function.name,args:JSON.parse(t.function.arguments)})),error:c.error}))))`);
 expect(record.calls.some(c => c.tools?.some(t => t.name === 'start_research_batch'))).toBe(true);
 record.waveCalls = (await get('/api/debug')).waveCalls.filter(c => !initial.waves.includes(c.id)).map(c => ({ id: c.id, path: c.path, method: c.method, status: c.status }));
 const reportPath = `/api/work-batches/${encodeURIComponent(record.final.batch.id)}/report`;
 for (const format of ['html', 'csv']) { const response = await page.request.get(base + reportPath + (format === 'csv' ? '?format=csv' : '')); expect(response.ok()).toBe(true); writeFileSync(`${root}/${label}-${index}.${format}`, await response.text()); }
 await page.reload(); await page.getByLabel('研究对话').waitFor(); expect(notices(await state(), before)).toHaveLength(1); await shot(`${index}-ended`);
 const popup = page.waitForEvent('popup'); await page.getByLabel('研究对话').locator(`a[href="${reportPath}"]`).click(); const report = await popup; await report.getByRole('heading', { name: '本次请求综合报告' }).waitFor(); await report.screenshot({ path: `${images}/${label}-${index}-report.png`, fullPage: true }); await report.close();
 record.checks.push('Required browser mode opens the current owned profile; unavailable pages remain unknown. One combined HTML/CSV report persists after reload'); record.passed = true; record.finishedAt = new Date().toISOString(); save();
 console.log(JSON.stringify({ label, index, passed: true, tasks: record.final.tasks.map(t => ({ id: t.id, status: t.status, evaluated: t.evaluated, matched: t.matched })), notifications: record.final.notices.length, actualWaveCalls: record.waveCalls.length, challenges: record.accessChallenges.length,pageVisits:record.pageVerification.map(r=>({handle:r.handle,visit:r.visit.verdict,pages:r.pages.length})) }));
}
try {
 await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.getByLabel('管理员密码').fill(docker('exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt').trim()); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
 if (fixture) {
  await run('帮我另外做两项 YouTube 科技博主研究，粉丝和国家都不限，每项选1个人、先看2个人，两个都标上内容方向。第一项只用现有文字资料，不打开网页；第二项需要打开公开主页核验。现在我还在操作桌面，先别动我的浏览器，等两项都结束再给我一份汇总。', 1);
  await run('再新开两项独立的 YouTube 科技内容研究，粉丝和国家不限，每项选1人，各看完2个候选，都标内容方向。A只分析已有文字，B需要看本人公开页面。两项现在都登记，网页只排队，授权已明确，文字先跑；我现在仍在操作桌面，等全部做完统一报告。', 2);
 } else await run('请再独立做两项 Instagram 数码个人创作者研究，两项都只看 tylerlcrawford 和 valstechtalkk，不搜索相似账号。粉丝1万到10万、国家不限，数码内容和个人创作者都是必选条件，每项选1位、两位都分析并标注内容方向。第一项只分析已有简介和帖子文字，不打开网页；第二项需要打开本人公开主页核验。我现在还在操作桌面，先别动浏览器，但两项都可以立即登记，文字先做，网页等我交还桌面。等两项都结束再统一交付一份报告。', 1);
 expect(output.pageErrors).toEqual([]); output.passed = true; output.finishedAt = new Date().toISOString(); save();
} catch (error) { output.failure = String(error); save(); throw error; } finally { await browser.close(); }
