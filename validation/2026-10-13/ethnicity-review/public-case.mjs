import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'http://101.201.237.219:33332';
const directory = 'docs/testing/ethnicity-review-2026-10-13/evidence';
const privateDirectory = 'validation/2026-10-13/ethnicity-review/private';
mkdirSync(directory, { recursive: true }); mkdirSync(privateDirectory, { recursive: true });
const title = '族裔资料核对：个人跑步体验';
const prompt = `请找2位Instagram白人个人跑者，研究命名为「${title}」。粉丝1万到10万，地区不限，必须有本人第一人称的跑步训练、马拉松或越野跑参赛体验；排除运动品牌、店铺、赛事或机构官方、明星和纯搬运账号。只核验已有公开文字，标注内容方向和表达方式。请自行选择关键词开放搜索，不指定账号；逐人分析最多12人，基础资料最多40个账号。直接开始，结束后在聊天给我名单、逐人依据、报告和CSV。`;
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' });
const proof = { title, prompt, base, startedAt: new Date().toISOString(), pageErrors: [], checks: {}, progress: [] };
page.on('pageerror', error => proof.pageErrors.push(error.message));
const json = async path => { const response = await page.request.get(base + path, { timeout: 90000 }); assert.equal(response.status(), 200); return response.json(); };
const scope = id => JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '--input-type=module', '-e', `import{DatabaseSync}from'node:sqlite';const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});const r=db.prepare('SELECT body FROM task_states WHERE id=?').get(process.argv[1]);console.log(r.body);db.close();`, id], { encoding: 'utf8' }));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let state;
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  state = await json('/api/state'); const previousIds = new Set(state.tasks.map(task => task.id));
  proof.browser = await page.evaluate(() => ({ isSecureContext: window.isSecureContext, randomUUID: typeof crypto.randomUUID }));
  if (process.env.VERIFY_EXISTING === '1') {
    const existing = JSON.parse(readFileSync(directory + '/public-case.json', 'utf8')); proof.taskId = existing.taskId; proof.requestCreatedAt = existing.requestCreatedAt; proof.startedAt = existing.startedAt;
  } else {
    await page.getByRole('textbox', { name: '发送消息', exact: true }).fill(prompt);
    const responseWaiting = page.waitForResponse(response => response.url() === base + '/api/messages' && response.request().method() === 'POST', { timeout: 60000 }); await page.getByRole('button', { name: '发送消息', exact: true }).click();
    const response = await responseWaiting; assert.equal(response.status(), 201); const message = await response.json(); proof.requestCreatedAt = message.createdAt; proof.userMessageId = message.id;
    for (let n = 0; n < 36; n++) { state = await json('/api/state'); const task = state.tasks.find(task => !previousIds.has(task.id) && task.title === title); if (task) { proof.taskId = task.id; break; } await sleep(5000); }
    assert(proof.taskId, '主Agent应登记本轮研究');
  }
  proof.spec = scope(proof.taskId).spec;
  assert.equal(proof.spec.count, 2); assert.equal(proof.spec.minFollowers, 10000); assert.equal(proof.spec.maxFollowers, 100000);
  assert.deepEqual(proof.spec.regions, []); assert.equal(proof.spec.verificationMode, 'text'); assert.equal(proof.spec.candidateBudget, 12); assert.equal(proof.spec.instagram.profileBudget, 40);
  assert(!proof.spec.instagram.handles?.length); assert(proof.spec.instagram.queries.length > 0);
  const review = proof.spec.criteria.filter(criterion => criterion.reviewOnly); assert(review.length > 0); assert(review.every(criterion => !criterion.required && criterion.basis === 'text'));
  assert(proof.spec.criteria.filter(criterion => criterion.required).length >= 2);
  proof.checks.scopeAndOpenSearch = true;
  await page.screenshot({ path: directory + '/started.png' });
  const deadline = Date.now() + 25 * 60 * 1000;
  let previous = '';
  while (Date.now() < deadline) {
    state = await json('/api/state'); const task = state.tasks.find(task => task.id === proof.taskId); assert(task);
    const signature = [task.status, task.evaluated, task.matched].join(':');
    if (signature !== previous) { previous = signature; proof.progress.push({ observedAt: new Date().toISOString(), ...task }); console.log(JSON.stringify({ taskId: task.id, status: task.status, evaluated: task.evaluated, selected: task.matched })); writeFileSync(directory + '/public-case.json', JSON.stringify(proof, null, 2)); }
    if (['completed', 'partial', 'failed', 'cancelled'].includes(task.status)) { proof.finalTask = task; break; }
    await sleep(5000);
  }
  assert(proof.finalTask, '研究应进入真实终态'); assert.equal(proof.finalTask.status, 'completed'); assert.equal(proof.finalTask.matched, 2);
  proof.elapsedMs = proof.finalTask.updatedAt - proof.requestCreatedAt;
  const rows = await json('/api/results?taskId=' + proof.taskId); writeFileSync(privateDirectory + '/results.json', JSON.stringify(rows, null, 2));
  const selected = rows.filter(row => row.selected && row.verdict === 'match'); assert.equal(selected.length, 2);
  for (const row of selected) {
    assert(row.creator.followers >= 10000 && row.creator.followers <= 100000);
    assert(row.judgments.filter(judgment => review.some(criterion => criterion.id === judgment.criterionId)).every(judgment => judgment.reviewOnly));
    assert(row.judgments.filter(judgment => proof.spec.criteria.some(criterion => criterion.id === judgment.criterionId && criterion.required)).every(judgment => judgment.verdict === 'match' && judgment.evidenceIds.length));
  }
  proof.records = rows.map(row => ({ id: row.id, handle: row.creator.handle, followers: row.creator.followers, profileUrl: row.creator.profileUrl, verdict: row.verdict, selected: row.selected, judgments: row.judgments, tags: row.tags, sources: row.creator.evidence.filter(source => ['profile', 'post'].includes(source.kind)).map(source => ({ id: source.id, provider: source.provider, kind: source.kind, url: source.url, publishedAt: source.publishedAt, capturedAt: source.capturedAt })) }));
  proof.checks.realResultsAndJudgments = true;
  await page.locator(`aside .task[data-task-id="${proof.taskId}"]`).getByRole('button', { name: '查看结果' }).click(); const dialog = page.getByRole('dialog', { name: '研究结果' }); await dialog.getByLabel('判断').selectOption('match'); await dialog.getByRole('button', { name: '查询 / 刷新' }).click();
  await expect(dialog.locator('article.finding')).toHaveCount(2, { timeout: 60000 }); await expect(dialog.locator('.review-note')).toHaveCount(2);
  await expect(dialog.getByText('符合已核实条件', { exact: true })).toHaveCount(2); await page.screenshot({ path: directory + '/selected.png' });
  const csvWaiting = page.waitForEvent('download', { timeout: 120000 }); await dialog.getByRole('link', { name: '下载 CSV' }).click(); const csvDownload = await csvWaiting; await csvDownload.saveAs(privateDirectory + '/selected.csv'); const csv = readFileSync(privateDirectory + '/selected.csv', 'utf8');
  assert(csv.includes('待人工确认条件,自动入选范围')); assert(csv.includes('reviewOnly')); proof.csvBytes = Buffer.byteLength(csv);
  const popupWaiting = page.waitForEvent('popup', { timeout: 60000 }); await dialog.getByRole('link', { name: '查看报告' }).click(); const report = await popupWaiting; await report.waitForLoadState('domcontentloaded'); await expect(report.locator('article[data-selected="true"]')).toHaveCount(2);
  assert((await report.locator('body').innerText()).includes('待人工确认')); await report.screenshot({ path: directory + '/report.png' });
  const offlineWaiting = report.waitForEvent('download', { timeout: 180000 }); await report.getByRole('link', { name: '下载含截图的离线 HTML' }).click(); const offline = await offlineWaiting; await offline.saveAs(privateDirectory + '/selected.html'); const html = readFileSync(privateDirectory + '/selected.html', 'utf8'); assert(html.includes('待人工确认')); proof.offlineBytes = Buffer.byteLength(html);
  for (const row of rows) { assert.equal(csv.includes(row.id), row.selected && row.verdict === 'match'); assert.equal(html.includes('data-result-id="' + row.id + '"'), row.selected && row.verdict === 'match'); }
  proof.checks.actualUiAndFilteredDownloads = true; await report.close(); await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  for (let n = 0; n < 12; n++) { state = await json('/api/state'); proof.delivery = state.messages.find(message => message.role === 'assistant' && message.id.startsWith('report-') && message.createdAt >= proof.finalTask.updatedAt && message.text.includes('/api/reports/' + proof.taskId)); if (proof.delivery) break; await sleep(1000); }
  assert(proof.delivery); assert(proof.delivery.text.includes('族裔')); assert(!proof.delivery.text.includes('基础读取上限')); proof.checks.chatDeliveryScope = true;
  await page.reload(); await page.locator(`aside .task[data-task-id="${proof.taskId}"]`).waitFor({ timeout: 60000 }); await page.screenshot({ path: directory + '/delivered.png' }); proof.checks.refreshPersistence = true;
  assert.deepEqual(proof.pageErrors, []); proof.passed = true;
} catch (error) { proof.failure = String(error).replace(/\u001b\[[0-9;]*m/g, '').replace(/token=[^&\s"'<>]+/g, 'token=[REDACTED]'); process.exitCode = 1; }
finally { proof.finishedAt = new Date().toISOString(); writeFileSync(directory + '/public-case.json', JSON.stringify(proof, null, 2)); console.log(JSON.stringify({ taskId: proof.taskId, passed: proof.passed, finalTask: proof.finalTask, elapsedMs: proof.elapsedMs, checks: proof.checks, failure: proof.failure })); await browser.close(); }
