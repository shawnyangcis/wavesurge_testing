import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = 'http://101.201.237.219:33332';
const source = JSON.parse(readFileSync('docs/testing/ethnicity-review-2026-10-13/evidence/public-case.json', 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai' });
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const proof = { taskId: source.taskId, startedAt: new Date().toISOString(), prompt: '这项研究进展怎么样？是否必须博主亲口声明自己是白人？不要新建或取消研究，继续当前任务。', pageErrors: [] };
page.on('pageerror', error => proof.pageErrors.push(error.message));
const state = async () => { const response = await page.request.get(base + '/api/state'); assert.equal(response.status(), 200); return response.json(); };
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  const before = await state(); proof.before = before.tasks.find(task => task.id === source.taskId); assert(proof.before); assert.equal(proof.before.status, 'running');
  await page.getByRole('textbox', { name: '发送消息', exact: true }).fill(proof.prompt);
  const responseWaiting = page.waitForResponse(response => response.url() === base + '/api/messages' && response.request().method() === 'POST'); await page.getByRole('button', { name: '发送消息', exact: true }).click(); const response = await responseWaiting; assert.equal(response.status(), 201); proof.input = await response.json();
  for (let n = 0; n < 80; n++) { const current = await state(); proof.reply = current.messages.find(message => message.role === 'assistant' && message.createdAt >= proof.input.createdAt && !message.id.startsWith('report-')); if (proof.reply) { proof.after = current.tasks.find(task => task.id === source.taskId); assert.deepEqual(current.tasks.map(task => task.id).sort(), before.tasks.map(task => task.id).sort()); break; } await new Promise(resolve => setTimeout(resolve, 3000)); }
  assert(proof.reply); assert(!['cancelled', 'failed'].includes(proof.after.status)); assert(/族裔|白人/.test(proof.reply.text)); assert(/资料|记录|来源/.test(proof.reply.text)); assert(/不需要|不要求|不必|不是必须|并非|无需/.test(proof.reply.text));
  assert.deepEqual(proof.pageErrors, []); proof.replyMs = proof.reply.createdAt - proof.input.createdAt; proof.passed = true; await page.screenshot({ path: 'docs/testing/ethnicity-review-2026-10-13/evidence/follow-up.png' });
} catch (error) { proof.failure = String(error); process.exitCode = 1; }
finally { proof.finishedAt = new Date().toISOString(); writeFileSync('docs/testing/ethnicity-review-2026-10-13/evidence/follow-up.json', JSON.stringify(proof, null, 2)); console.log(JSON.stringify(proof, null, 2)); await browser.close(); }
