import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const key = process.argv[2];
const root = 'validation/2026-10-13/public-scenarios';
const out = 'docs/testing/public-scenarios-2026-10-13/evidence';
const base = 'http://101.201.237.219:33332';
const scenario = JSON.parse(readFileSync(root + '/scenarios.json', 'utf8'))[key];
assert(scenario, '选择已定义的独立场景');
mkdirSync(out, { recursive: true });
mkdirSync(root + '/artifacts', { recursive: true });
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, timezoneId: 'Asia/Shanghai' });
const page = await context.newPage();
const resume = process.env.SCENARIO_VERIFY_EXISTING === '1';
const proof = resume ? { ...JSON.parse(readFileSync(out + '/' + key + '.json', 'utf8')), verificationResumedAt: new Date().toISOString(), pageErrors: [] } : { scenario: key, title: scenario.title, base, prompt: scenario.prompt, startedAt: new Date().toISOString(), checks: {}, pageErrors: [], progress: [] };
if (resume) { delete proof.failure; delete proof.finishedAt; delete proof.passed; }
page.on('pageerror', error => proof.pageErrors.push(error.message));
const get = async path => { const r = await page.request.get(base + path, { timeout: 90000 }); assert.equal(r.status(), 200); return r.json(); };
const save = () => writeFileSync(out + '/' + key + '.json', JSON.stringify(proof, null, 2));
const readStored = script => JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '--input-type=module'], { input: script, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
try {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
  await expect(page.getByLabel('管理员密码')).toBeVisible();
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button', { name: /进入工作室/ }).click();
  await page.getByLabel('研究对话').waitFor();
  proof.browser = await page.evaluate(() => ({ isSecureContext, randomUUID: typeof crypto.randomUUID }));
  assert.equal(proof.browser.isSecureContext, false);
  assert.equal(proof.browser.randomUUID, 'undefined');
  const before = await get('/api/state');
  let task, state; const registrationStarted = Date.now();
  if (resume) {
    task = before.tasks.find(t => t.id === proof.taskId); assert(task); assert(before.messages.some(m => m.id === proof.userId && m.text === scenario.prompt));
  } else {
    proof.previousTaskIds = before.tasks.map(t => t.id);
    assert(!before.tasks.some(t => t.title === scenario.title));
    await page.getByRole('textbox', { name: '发送消息' }).fill(scenario.prompt);
    const post = page.waitForResponse(r => r.url() === base + '/api/messages' && r.request().method() === 'POST', { timeout: 60000 });
    await page.getByRole('button', { name: '发送消息', exact: true }).click();
    const response = await post; assert.equal(response.status(), 201);
    const posted = await response.json(); proof.userId = posted.id; proof.requestCreatedAt = posted.createdAt;
    proof.checks.publicHttpSubmission = true;
    while (Date.now() - registrationStarted < 360000) {
      state = await get('/api/state'); task = state.tasks.find(t => t.title === scenario.title && !proof.previousTaskIds.includes(t.id));
      if (task) break;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  assert(task, '自然语言请求应登记新的独立研究');
  proof.taskId = task.id; if (!resume) proof.registrationMs = Date.now() - proof.requestCreatedAt;
  proof.spec = readStored(`import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');console.log(JSON.stringify(s.get('task',${JSON.stringify(task.id)}).spec));s.close();`);
  assert.equal(proof.spec.count, scenario.count);
  assert.deepEqual(proof.spec.platforms, ['instagram']); assert.deepEqual(proof.spec.regions, []);
  assert.equal(proof.spec.minFollowers, 10000); assert.equal(proof.spec.maxFollowers, 100000);
  assert.equal(proof.spec.verificationMode, 'text'); assert.equal(proof.spec.candidateBudget, scenario.candidateBudget);
  assert.equal(proof.spec.instagram.profileBudget, scenario.profileBudget);
  assert(!proof.spec.instagram.handles?.length); assert(proof.spec.instagram.queries.length > 0);
  assert(proof.spec.criteria.filter(c => c.required).length >= 2);
  proof.checks.naturalScopeAndAgentKeywords = true;
  console.log(JSON.stringify({ scenario: key, registered: task.id, registrationMs: proof.registrationMs, queries: proof.spec.instagram.queries })); save();
  const deadline = Date.now() + 2400000; let previous = '';
  while (Date.now() < deadline) {
    state = await get('/api/state'); task = state.tasks.find(t => t.id === proof.taskId);
    const progress = { observedAt: new Date().toISOString(), status: task.status, evaluated: task.evaluated, qualifying: task.qualifying, selected: task.matched, requested: task.requested };
    const stable = JSON.stringify({ status: task.status, evaluated: task.evaluated, qualifying: task.qualifying, selected: task.matched });
    if (stable !== previous) { console.log(JSON.stringify({ scenario: key, ...progress })); proof.progress.push(progress); previous = stable; save(); }
    if (['completed', 'partial', 'failed', 'cancelled'].includes(task.status)) break;
    await new Promise(r => setTimeout(r, 10000));
  }
  proof.finalTask = task;
  proof.elapsedMs = task.updatedAt - proof.requestCreatedAt;
  proof.results = await get('/api/results?taskId=' + task.id + '&view=summary');
  proof.results = proof.results.map(r => {
    const cited = new Set(r.judgments.flatMap(j => j.evidenceIds));
    return { id: r.id, handle: r.creator.handle, profileUrl: r.creator.profileUrl, followers: r.creator.followers, selected: r.selected, verdict: r.verdict, judgments: r.judgments, annotations: r.annotations, tags: r.tags, sources: r.creator.evidence.filter(e => cited.has(e.id)).map(({ id, url, kind, publishedAt, capturedAt }) => ({ id, url, kind, publishedAt, capturedAt })) };
  });
  proof.checks.realQualifiedTarget = task.status === 'completed' && task.matched === scenario.count && proof.results.filter(r => r.selected && r.verdict === 'match').length === scenario.count;
  const required = proof.spec.criteria.filter(c => c.required).map(c => c.id);
  proof.checks.selectedHaveRequiredEvidence = proof.results.filter(r => r.selected).every(r => required.every(id => r.judgments.some(j => j.criterionId === id && j.verdict === 'match' && j.evidenceIds.length > 0)));
  proof.deliveryBatch = readStored(`import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');const t=s.get('task',${JSON.stringify(task.id)});console.log(JSON.stringify(t.deliveryBatchId?s.get('work-batch',t.deliveryBatchId):null));s.close();`);
  const deliveryDeadline = Date.now() + 2400000; let readyAt;
  while (Date.now() < deliveryDeadline) {
    state = await get('/api/state'); proof.delivery = state.messages.find(m => m.id.startsWith('report-') && m.text.includes('/api/reports/' + task.id)); if (proof.delivery) break;
    const ready = !proof.deliveryBatch || proof.deliveryBatch.sealed && proof.deliveryBatch.items.every(item => ['completed', 'partial', 'failed', 'cancelled'].includes(state.tasks.find(t => t.id === item.id)?.status));
    if (ready) { readyAt ??= Date.now(); if (Date.now() - readyAt > 60000) break; }
    await new Promise(r => setTimeout(r, 5000));
  }
  assert(proof.delivery, '终态应自动在聊天交付报告'); proof.checks.automaticChatDelivery = true;
  assert(proof.previousTaskIds.every(id => state.tasks.some(t => t.id === id))); proof.checks.previousTasksPreserved = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }); await page.getByLabel('研究对话').waitFor();
  await expect(page.locator('.messages article time').last()).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  await page.screenshot({ path: out + '/' + key + '-chat.png' });
  await page.locator(`aside .task[data-task-id="${task.id}"]`).getByRole('button', { name: '查看结果' }).click();
  const results = page.getByRole('dialog', { name: '研究结果' });
  await expect(results).toBeVisible(); await expect(results.locator('article.finding')).toHaveCount(proof.results.length, { timeout: 60000 });
  const csvWaiting = page.waitForEvent('download', { timeout: 120000 });
  await results.getByRole('link', { name: '下载 CSV' }).click();
  const csv = await csvWaiting; const csvPath = root + '/artifacts/' + key + '.csv'; await csv.saveAs(csvPath);
  const csvText = readFileSync(csvPath, 'utf8'); assert(csvText.startsWith('\uFEFF')); proof.csvBytes = Buffer.byteLength(csvText);
  for (const r of proof.results) assert(csvText.includes(r.handle)); proof.checks.actualCsvDownload = true;
  await results.getByLabel('判断').selectOption('match'); await results.getByRole('button', { name: '查询 / 刷新' }).click();
  await expect(results.locator('article.finding')).toHaveCount(proof.results.filter(r => r.verdict === 'match').length, { timeout: 60000 });
  await page.screenshot({ path: out + '/' + key + '-selected.png' }); proof.checks.resultFiltering = true;
  await results.getByRole('button', { name: '关闭', exact: true }).click();
  await page.goto(base + '/api/reports/' + task.id, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await expect(page.locator('article[data-result-id]')).toHaveCount(proof.results.length);
  for (const r of proof.results.filter(r => r.selected)) await expect(page.locator('body')).toContainText(r.handle);
  await page.screenshot({ path: out + '/' + key + '-report.png' }); proof.checks.onlineReport = true;
  const htmlWaiting = page.waitForEvent('download', { timeout: 180000 });
  await page.getByRole('link', { name: '下载含截图的离线 HTML' }).click();
  const html = await htmlWaiting; const htmlPath = root + '/artifacts/' + key + '-offline.html'; await html.saveAs(htmlPath);
  const htmlText = readFileSync(htmlPath, 'utf8'); proof.offlineBytes = Buffer.byteLength(htmlText);
  for (const r of proof.results.filter(r => r.selected)) assert(htmlText.includes(r.handle)); proof.checks.actualOfflineHtmlDownload = true;
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.getByLabel('研究对话').waitFor();
  await expect(page.locator(`aside .task[data-task-id="${task.id}"]`)).toBeVisible(); proof.checks.persistedAfterReload = true;
  assert.deepEqual(proof.pageErrors, []); proof.checks.noBrowserPageErrors = true;
  proof.passed = Object.values(proof.checks).every(Boolean);
  if (!proof.passed) process.exitCode = 1;
} catch (error) {
  proof.failure = String(error).replace(/\u001b\[[0-9;]*m/g, '').replace(/\b(?:cookie|authorization):[^\r\n]*/gi, 'credential header: [REDACTED]').replace(/token=[^&\s"'<>]+/g, 'token=[REDACTED]'); process.exitCode = 1;
} finally {
  proof.finishedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ scenario: key, passed: proof.passed, taskId: proof.taskId, checks: proof.checks, finalTask: proof.finalTask, elapsedMs: proof.elapsedMs, failure: proof.failure }));
  await browser.close();
}
