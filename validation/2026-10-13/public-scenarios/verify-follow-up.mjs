import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'http://101.201.237.219:33332';
const out = 'docs/testing/public-scenarios-2026-10-13/evidence';
const ids = ['running', 'coffee'].map(key => JSON.parse(readFileSync(out + '/' + key + '.json', 'utf8')).taskId);
assert(ids.every(Boolean));
const prompt = '请分别告诉我「公网场景验收：跑步训练与参赛体验」和「公网场景验收：家用咖啡制作体验」当前实际进度。这是进度查询，两项都继续原范围，不新建或取消研究。';
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, timezoneId: 'Asia/Shanghai' });
const proof = { base, prompt, taskIds: ids, startedAt: new Date().toISOString(), checks: {}, pageErrors: [] };
page.on('pageerror', e => proof.pageErrors.push(e.message));
const get = async () => { const r = await page.request.get(base + '/api/state', { timeout: 90000 }); assert.equal(r.status(), 200); return r.json(); };
const scopes = () => {
  const script = `import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');console.log(JSON.stringify(${JSON.stringify(ids)}.map(id=>s.get('task',id).spec)));s.close();`;
  return JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '--input-type=module'], { input: script, encoding: 'utf8' }));
};
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  const before = await get(); proof.before = before.tasks.filter(t => ids.includes(t.id)); const beforeIds = before.tasks.map(t => t.id); proof.beforeScopes = scopes();
  assert(proof.before.some(t => ['running', 'queued', 'needs_input'].includes(t.status)), '续聊应发生在工作仍进行时');
  await page.getByRole('textbox', { name: '发送消息' }).fill(prompt);
  const responseWaiting = page.waitForResponse(r => r.url() === base + '/api/messages' && r.request().method() === 'POST', { timeout: 60000 });
  await page.getByRole('button', { name: '发送消息', exact: true }).click(); const response = await responseWaiting; assert.equal(response.status(), 201);
  const posted = await response.json(); proof.userId = posted.id; proof.createdAt = posted.createdAt; let state;
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) { state = await get(); proof.reply = state.messages.find(m => m.role === 'assistant' && !m.id.startsWith('report-') && m.createdAt >= posted.createdAt && !before.messages.some(b => b.id === m.id)); if (proof.reply) break; await new Promise(r => setTimeout(r, 3000)); }
  assert(proof.reply, '应收到真实进度答复'); proof.replyMs = proof.reply.createdAt - posted.createdAt;
  assert(/跑步/.test(proof.reply.text) && /咖啡/.test(proof.reply.text)); proof.checks.twoTaskReply = true;
  proof.after = state.tasks.filter(t => ids.includes(t.id)); proof.afterScopes = scopes(); assert.deepEqual(proof.afterScopes, proof.beforeScopes); proof.checks.scopesPreserved = true;
  assert(beforeIds.every(id => state.tasks.some(t => t.id === id))); assert.equal(state.tasks.length, beforeIds.length); proof.checks.noTaskLossOrDuplication = true;
  assert(proof.after.every(t => t.status !== 'cancelled')); proof.checks.workContinues = true;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }); await page.getByLabel('研究对话').waitFor(); await page.screenshot({ path: out + '/follow-up-chat.png' });
  assert.deepEqual(proof.pageErrors, []); proof.passed = true;
} catch (error) { proof.failure = String(error).replace(/\u001b\[[0-9;]*m/g, '').replace(/token=[^&\s"'<>]+/g, 'token=[REDACTED]'); process.exitCode = 1; }
finally { proof.finishedAt = new Date().toISOString(); writeFileSync(out + '/follow-up.json', JSON.stringify(proof, null, 2)); console.log(JSON.stringify({ passed: proof.passed, checks: proof.checks, replyMs: proof.replyMs, before: proof.before?.map(({ id, status, evaluated, matched }) => ({ id, status, evaluated, matched })), after: proof.after?.map(({ id, status, evaluated, matched }) => ({ id, status, evaluated, matched })), reply: proof.reply?.text, failure: proof.failure })); await browser.close(); }
