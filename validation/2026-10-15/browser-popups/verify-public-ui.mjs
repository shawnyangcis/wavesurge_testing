import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = 'validation/2026-10-15/browser-popups/private/public'; mkdirSync(root, { recursive: true });
const base = 'http://101.201.237.219:33332';
const read = spawnSync('docker', ['exec', 'wavesurge_testing-app-1', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
if (read.status !== 0) throw Error('Could not read the existing local bootstrap credential');
const password = read.stdout.trim();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' });
const result = { base, startedAt: new Date().toISOString(), pageErrors: [] };
page.on('pageerror', error => result.pageErrors.push(error.message.replaceAll(password, '[REDACTED]')));
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button', { name: /进入工作室/ }).click();
  await page.getByLabel('研究对话').waitFor();
  const getState = async () => { const response = await page.request.get(base + '/api/state'); assert.equal(response.status(), 200); return response.json(); };
  const before = await getState(); const old = new Set(before.tasks.map(task => task.id));
  result.browser = await page.evaluate(() => ({ isSecureContext, randomUUID: typeof crypto.randomUUID }));
  result.question = '现在如果Instagram出现可关闭的登录弹窗，你会怎么处理？请只解释处理规则，不要新建、修改或取消任何任务。';
  await page.getByRole('textbox', { name: '发送消息', exact: true }).fill(result.question);
  const sending = page.waitForResponse(response => response.url() === base + '/api/messages' && response.request().method() === 'POST');
  await page.getByRole('button', { name: '发送消息', exact: true }).click();
  const response = await sending; result.sendStatus = response.status(); assert.equal(result.sendStatus, 201);
  const sent = await response.json(); result.messageId = sent.id;
  const until = Date.now() + 180000;
  let state;
  while (Date.now() < until) {
    state = await getState();
    if (state.messages.find(message => message.id === sent.id)?.state === 'delivered') {
      result.reply = state.messages.filter(message => message.role === 'assistant' && message.createdAt >= sent.createdAt && !/^(?:assistance-|report-)/.test(message.id)).at(-1)?.text;
      if (result.reply) break;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  result.newTasks = state.tasks.filter(task => !old.has(task.id)).map(task => task.id);
  result.elapsedMs = Date.now() - sent.createdAt;
  assert(result.reply && /关闭/.test(result.reply) && /人工/.test(result.reply));
  assert.equal(result.newTasks.length, 0); assert.equal(result.pageErrors.length, 0);
  await page.screenshot({ path: `${root}/chat.png` }); result.passed = true;
} catch (error) { result.passed = false; result.error = error.message.replaceAll(password, '[REDACTED]'); process.exitCode = 1; }
finally { result.finishedAt = new Date().toISOString(); writeFileSync(`${root}/evidence.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); await browser.close(); }
