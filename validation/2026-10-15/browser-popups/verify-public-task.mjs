import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'http://101.201.237.219:33332';
const root = 'validation/2026-10-15/browser-popups/private/public-task';
mkdirSync(root, { recursive: true });
function reviewStatusReply(evidence) {
  if (!evidence.followup) return { required: false };
  const reply = evidence.chatReplies.filter(message => message.createdAt >= evidence.followup.createdAt && !/^(?:report-|assistance-)/.test(message.id)).at(-1);
  assert(reply, 'The in-flight follow-up did not receive an assistant reply');
  const afterCompletion = reply.createdAt >= evidence.task.updatedAt;
  // This is a bounded Chinese acceptance case. Retain the actual reply for
  // manual review instead of treating a phrase blacklist as semantic proof.
  if (afterCompletion) {
    assert.match(reply.text, /已完成|已结束|全部结束/, 'The delayed follow-up must acknowledge the completed task');
    const count = pattern => [...reply.text.matchAll(pattern)].at(-1)?.[1];
    assert.equal(Number(count(/(?:已完成核验|已核验|已查看|已处理|核验(?:完成)?)[^\d\n。]{0,24}(\d+)/g)), evidence.task.evaluated, 'The delayed reply must report the saved evaluated count');
    assert.equal(Number(count(/(?:合格并入选|已入选|入选)[^\d\n。]{0,24}(\d+)/g)), evidence.task.matched, 'The delayed reply must report the saved selected count');
  }
  return { inputId: evidence.followup.id, replyId: reply.id, afterCompletion, status: evidence.task.status, evaluated: evidence.task.evaluated, selected: evidence.task.matched, text: reply.text };
}
if (process.argv.includes('--review-only')) {
  const saved = JSON.parse(readFileSync(`${root}/evidence.json`, 'utf8'));
  saved.statusReplyCheck = reviewStatusReply(saved); delete saved.staleStatusReplies;
  writeFileSync(`${root}/evidence.json`, JSON.stringify(saved, null, 2));
  console.log(JSON.stringify({ passed: saved.passed, statusReplyCheck: saved.statusReplyCheck }));
  process.exit(0);
}
const password = execFileSync('docker', ['exec', 'wavesurge_testing-app-1', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, timezoneId: 'Asia/Shanghai' });
const result = { base, source: 'Public HTTP UI -> actual configured chat model -> real WaveSurge -> deployed headed browser -> persisted results -> public HTML/CSV', startedAt: new Date().toISOString(), pageErrors: [], appPosts: [], transitions: [] };
const persist = () => writeFileSync(`${root}/evidence.json`, JSON.stringify(result, null, 2));
page.on('pageerror', error => result.pageErrors.push(error.message.replaceAll(password, '[REDACTED]')));
page.on('request', request => { if (request.url().startsWith(base + '/api/') && request.method() === 'POST') result.appPosts.push({ path: new URL(request.url()).pathname, method: request.method() }); });
const state = async () => { const response = await page.request.get(base + '/api/state'); assert.equal(response.status(), 200); return response.json(); };
async function send(text) {
  await page.getByRole('textbox', { name: '发送消息', exact: true }).fill(text);
  const responsePromise = page.waitForResponse(response => response.url() === base + '/api/messages' && response.request().method() === 'POST', { timeout: 60000 });
  await page.getByRole('button', { name: '发送消息', exact: true }).click();
  const response = await responsePromise; assert.equal(response.status(), 201);
  const message = await response.json();
  return { id: message.id, createdAt: message.createdAt, status: response.status(), text };
}
try {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button', { name: /进入工作室/ }).click();
  await expect(page.getByLabel('研究对话')).toBeVisible();
  result.browser = await page.evaluate(() => ({ url: location.href, isSecureContext, randomUUID: typeof crypto.randomUUID }));
  const before = await state(); const oldTaskIds = new Set(before.tasks.map(task => task.id));
  result.beforeTaskIds = [...oldTaskIds];
  result.title = `公网验收 Adafruit ${new Date().toISOString().slice(11, 19).replaceAll(':', '')}`;
  result.prompt = `请新建并立即执行一个独立研究，标题“${result.title}”。只核验 Instagram 账号 @adafruit（https://www.instagram.com/adafruit/），目标1个，候选上限1个，不限粉丝和地区，不要求个人KOC或其他身份、外观条件。通过WaveSurge读取这个精确账号，并在本轮实际打开本人主页，唯一附加必选条件是：实际看到 @adafruit 的账号名以及公开简介或帖子内容，不能把登录页面当作通过。可关闭登录弹窗先自行关闭并重新观察，确实无法继续才请求我通过同一VNC协助。完成后在对话中交付结果、HTML报告和CSV。保留所有其他任务，不取消或修改它们。`;
  result.input = await send(result.prompt); persist(); console.log(JSON.stringify({ stage: 'sent', messageId: result.input.id, title: result.title }));
  const until = Date.now() + 12 * 60 * 1000;
  let latest, task, lastTransition, lastHeartbeat = Date.now();
  while (Date.now() < until) {
    latest = await state();
    const added = latest.tasks.filter(item => !oldTaskIds.has(item.id));
    task = added.find(item => item.title.includes(result.title));
    result.newTaskIds = added.map(item => item.id);
    if (task) {
      result.task = task;
      const transition = JSON.stringify([task.status, task.evaluated, task.matched, task.detail]);
      if (transition !== lastTransition) { const event = { at: new Date().toISOString(), ...task }; result.transitions.push(event); lastTransition = transition; console.log(JSON.stringify({ stage: 'progress', ...event })); persist(); }
      if (!result.followup && ['queued', 'running'].includes(task.status)) {
        result.followup = await send(`只查询“${result.title}”的当前进展。请保留原任务继续运行，不创建新任务、不重新搜索，也不修改任何条件。`);
        persist(); console.log(JSON.stringify({ stage: 'followup-sent', messageId: result.followup.id }));
      }
      if (task.status === 'needs_input') {
        result.assistance = await (await page.request.get(base + '/api/desktop')).json();
        throw Error('This actual site still requires human assistance; the task is preserved for VNC, not counted as an automatic pass');
      }
      if (['completed', 'partial', 'failed', 'cancelled'].includes(task.status)) {
        const followupDone = !result.followup || latest.messages.find(message => message.id === result.followup.id)?.state === 'delivered';
        const delivery = latest.messages.find(message => message.role === 'assistant' && message.createdAt >= result.input.createdAt && message.text.includes(`/api/reports/${task.id}`));
        if (delivery && followupDone) { result.delivery = { id: delivery.id, text: delivery.text }; break; }
      }
    }
    if (Date.now() - lastHeartbeat > 30000) { console.log(JSON.stringify({ stage: 'waiting', elapsedMs: Date.now() - result.input.createdAt, task: task?.status ?? 'waiting for chat registration' })); lastHeartbeat = Date.now(); }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  assert(task, 'The natural-language request did not register a task before the deadline');
  assert.equal(task.status, 'completed', 'The task did not complete successfully');
  assert.equal(task.matched, 1); assert.equal(task.evaluated, 1); assert(result.delivery, 'The completed task was not delivered in chat');
  assert.equal(result.newTaskIds.length, 1, 'Status follow-up must not create duplicate tasks');
  result.previousTasksPreserved = result.beforeTaskIds.every(id => latest.tasks.some(item => item.id === id)); assert(result.previousTasksPreserved);
  result.elapsedMs = Date.now() - result.input.createdAt;
  result.chatReplies = latest.messages.filter(message => message.role === 'assistant' && message.createdAt >= result.input.createdAt).map(({ id, text, createdAt }) => ({ id, text, createdAt }));
  result.statusReplyCheck = reviewStatusReply(result);
  const rows = await (await page.request.get(`${base}/api/results?taskId=${task.id}&view=summary`)).json();
  assert.equal(rows.length, 1); assert.equal(rows[0].creator.handle.toLowerCase(), 'adafruit'); assert.equal(rows[0].verdict, 'match'); assert.equal(rows[0].selected, true);
  const fresh = rows[0].creator.evidence.filter(item => item.assetId && item.capturedAt >= result.input.createdAt);
  assert(fresh.some(item => /instagram\.com\/adafruit\/?(?:$|[?#])/.test(item.url)), 'Must retain a fresh actual creator-profile screenshot');
  result.results = rows.map(row => ({ ...row, creator: { ...row.creator, evidence: row.creator.evidence.map(({ id, provider, kind, url, capturedAt, assetId, text }) => ({ id, provider, kind, url, capturedAt, assetId, text })) } }));
  result.screenshots = [];
  for (const [index, evidence] of fresh.entries()) {
    const response = await page.request.get(`${base}/api/assets/${encodeURIComponent(evidence.assetId)}`); assert.equal(response.status(), 200);
    const bytes = await response.body(); assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); writeFileSync(`${root}/browser-${index + 1}.png`, bytes);
    result.screenshots.push({ assetId: evidence.assetId, url: evidence.url, bytes: bytes.length });
  }
  await expect(page.locator(`.task[data-task-id="${task.id}"]`)).toContainText('已完成');
  result.messageTime = await page.locator('.message.user').filter({ hasText: result.prompt }).locator('time').textContent(); assert.match(result.messageTime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  await page.locator(`.task[data-task-id="${task.id}"]`).screenshot({ path: `${root}/task-card.png` });
  await page.locator(`.task[data-task-id="${task.id}"]`).getByRole('button', { name: '查看结果', exact: true }).click();
  const findings = page.getByRole('dialog', { name: '研究结果', exact: true }); await expect(findings.getByText('已入选', { exact: true })).toBeVisible({ timeout: 20000 });
  await findings.locator('details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
  result.resultsPanelText = await findings.innerText(); await findings.screenshot({ path: `${root}/results.png` });
  const downloadPromise = page.waitForEvent('download'); await findings.getByRole('link', { name: '下载 CSV', exact: true }).click(); const download = await downloadPromise; await download.saveAs(`${root}/results.csv`);
  const csv = readFileSync(`${root}/results.csv`, 'utf8'); assert(csv.includes('adafruit')); result.csv = { url: `${base}/api/reports/${task.id}?format=csv`, filename: download.suggestedFilename(), bytes: Buffer.byteLength(csv) };
  const popupPromise = page.waitForEvent('popup'); await findings.getByRole('link', { name: '查看报告', exact: true }).click(); const report = await popupPromise; await report.waitForLoadState('networkidle');
  assert(report.url().startsWith(base + '/api/reports/')); result.html = { url: report.url(), text: await report.locator('body').innerText() }; assert(result.html.text.includes('adafruit'));
  await report.screenshot({ path: `${root}/report.png`, fullPage: true }); await report.close();
  await findings.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '浏览器桌面', exact: true }).click();
  const desktop = page.getByRole('dialog', { name: '浏览器桌面', exact: true }); const frame = page.frameLocator('iframe[title="持久浏览器桌面"]');
  await expect(frame.locator('#noVNC_container canvas')).toBeVisible({ timeout: 30000 }); await expect(frame.locator('#noVNC_status')).toContainText(/Connected|connected|已连接/, { timeout: 30000 });
  const desktopPixels = () => frame.locator('#noVNC_container canvas').evaluate(canvas => { const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let white = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 240 && pixels[i + 1] > 240 && pixels[i + 2] > 240) white++; return white; });
  await expect.poll(desktopPixels, { timeout: 30000 }).toBeGreaterThan(100000);
  result.vnc = { iframe: await page.locator('iframe[title="持久浏览器桌面"]').getAttribute('src'), status: await frame.locator('#noVNC_status').textContent(), whitePixels: await desktopPixels(), canvas: await frame.locator('#noVNC_container canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height })) };
  await desktop.screenshot({ path: `${root}/vnc.png` }); await desktop.getByRole('button', { name: '关闭', exact: true }).click();
  const desktopState = await (await page.request.get(base + '/api/desktop')).json(); result.assistanceCountForTask = desktopState.request?.taskId === task.id ? 1 : 0; assert.equal(result.assistanceCountForTask, 0);
  assert.equal(result.pageErrors.length, 0); result.passed = true;
} catch (error) { result.passed = false; result.error = error.message.replaceAll(password, '[REDACTED]'); process.exitCode = 1; }
finally { result.finishedAt = new Date().toISOString(); persist(); console.log(JSON.stringify({ passed: result.passed, taskId: result.task?.id, error: result.error, elapsedMs: result.elapsedMs, vnc: result.vnc })); await browser.close(); }
