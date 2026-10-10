import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const root = 'validation/2026-10-10/r3-fixes', base = 'http://127.0.0.1:3580';
const args = ['compose', '-p', 'creator-studio-r3-fixes', '-f', 'compose.yaml', '-f', `${root}/live-compose.yaml`];
const compose = (...command) => execFileSync('docker', [...args, ...command], { encoding: 'utf8', maxBuffer: 128000000 });
const collect = `import { DatabaseSync } from 'node:sqlite'; import { createHash } from 'node:crypto';
const db = new DatabaseSync('/app/data/studio.sqlite', {readOnly: true});
const kinds = ['task', 'result', 'result-history', 'work-batch', 'message', 'assistance', 'wave-call', 'delivery'];
const state = Object.fromEntries(kinds.map(kind => {const rows = db.prepare('SELECT id,body FROM documents WHERE kind=? ORDER BY id').all(kind); return [kind, {count: rows.length, digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex')}];}));
const results = db.prepare("SELECT body FROM documents WHERE kind='result' ORDER BY id").all().map(row => JSON.parse(row.body));
const tasks = db.prepare("SELECT body FROM documents WHERE kind='task'").all().map(row => JSON.parse(row.body));
const messages = db.prepare("SELECT body FROM documents WHERE kind='message'").all().map(row => JSON.parse(row.body));
console.log(JSON.stringify({state, reports: messages.filter(m=>m.id.startsWith('report-')).length, pending: messages.filter(m=>m.role==='user'&&m.state==='pending').length, allTerminal: tasks.every(t=>['completed','partial'].includes(t.status)), revised: results.filter(r=>(r.revision??1)>1).map(r=>({id:r.id,revision:r.revision,proof:r.creator.browserVerification,verdict:r.verdict}))})); db.close();`;
const snapshot = () => JSON.parse(compose('exec', '-T', 'app', 'node', '--input-type=module', '-e', collect));
const before = snapshot();
assert.equal(before.pending, 0); assert.equal(before.allTerminal, true);
const startedAt = new Date().toISOString();
compose('restart', 'app');
let healthy = false;
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`${base}/api/health`)).ok) { healthy = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 500));
}
assert.equal(healthy, true);
const after = snapshot();
assert.deepEqual(after, before);
const expectedSource = JSON.parse(readFileSync(`${root}/source-check.json`, 'utf8')).host;
const files = Object.keys(expectedSource);
const hashes = JSON.parse(compose('exec', '-T', 'app', 'node', '--input-type=module', '-e', `import{createHash}from'node:crypto';import{readFileSync}from'node:fs';console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[1]).map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))));`, JSON.stringify(files)));
assert.deepEqual(hashes, expectedSource);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const pageErrors = []; page.on('pageerror', error => pageErrors.push(String(error)));
try {
  await page.goto(base);
  await page.getByLabel('管理员密码').fill(compose('exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt').trim());
  await page.getByRole('button', { name: /进入工作室/ }).click();
  await page.getByLabel('研究对话').waitFor();
  const state = await (await page.request.get(`${base}/api/state`)).json();
  expect(state.active).toBe(false);
  expect(state.tasks).toHaveLength(9);
  const report = JSON.parse(readFileSync(`${root}/reverify-browser.json`, 'utf8'));
  const results = await (await page.request.get(`${base}/api/results?taskId=${report.taskId}`)).json();
  expect(results.map(r => ({ id: r.id, revision: r.revision, verdict: r.verdict, proof: r.creator.browserVerification }))).toEqual(report.results.map(r => ({ id: r.id, revision: r.revision, verdict: r.verdict, proof: r.creator.browserVerification })));
  await page.goto(`${base}/api/reports/${report.taskId}`);
  await page.getByRole('heading').first().waitFor();
  await page.screenshot({ path: 'output/playwright/r3-fixes/reverify-final-after-restart.png' });
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(pageErrors, []);
  const out = { startedAt, finishedAt: new Date().toISOString(), passed: true, actualAppRestart: true, sourceFiles: files.length, sourceMatched: true, persisted: after.state, reports: after.reports, revisedResults: after.revised, pending: after.pending, noTaskOrResultChanges: true, noWaveReplay: true, noHistoricalRedelivery: true, reportUiPassed: true, pageErrors };
  writeFileSync(`${root}/final-restart.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ passed: true, tasks: after.state.task.count, results: after.state.result.count, histories: after.state['result-history'].count, actualGetCalls: after.state['wave-call'].count, reports: after.reports, sourceFiles: files.length, pageErrors }));
} finally { await browser.close(); }
