import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const root = '.gstack/qa-reports/full-e2e-2026-10-10';
const base = 'http://127.0.0.1:3000';
const id = 'campaign-bb62e1767e97593d5e070a7d';
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  const get = async path => (await page.request.get(base + path)).json();
  const plan = await get('/api/campaigns/' + id);
  if (!['completed', 'partial'].includes(plan.status)) throw Error('Campaign has not finished');
  const state = await get('/api/state');
  const tasks = state.tasks.filter(t => plan.childTaskIds.includes(t.id));
  const results = (await Promise.all(plan.childTaskIds.map(taskId => get('/api/results?taskId=' + taskId)))).flat();
  await page.getByRole('button', { name: 'Campaign 方案', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Campaign 方案' });
  const card = dialog.locator('article.task').filter({ has: page.getByRole('heading', { name: plan.title + ' · v' + plan.revision, exact: true }) });
  await card.getByRole('button', { name: '查看方案与配额' }).click();
  await dialog.screenshot({ path: root + '/screenshots/new-campaign-final-ui.png' });
  const popupPromise = page.waitForEvent('popup'); await dialog.getByRole('link', { name: '查看去重汇总报告', exact: true }).click();
  const report = await popupPromise; await report.waitForLoadState('domcontentloaded');
  const reportText = await report.locator('body').innerText();
  await report.screenshot({ path: root + '/screenshots/new-campaign-final-report.png', fullPage: true });
  const childReports = [];
  for (const taskId of plan.childTaskIds) {
    const child = await context.newPage(); const response = await child.goto(base + '/api/reports/' + taskId);
    if (response.status() !== 200) throw Error('child report unauthorized or unavailable');
    const text = await child.locator('body').innerText();
    await child.screenshot({ path: root + '/screenshots/new-campaign-child-' + childReports.length + '.png', fullPage: true });
    childReports.push({ taskId, text }); await child.close();
  }
  const debug = await get('/api/debug');
  const submits = debug.waveCalls.filter(c => c.method === 'POST' && plan.childTaskIds.includes(c.request?.requestId));
  const output = { observedAt: new Date().toISOString(), source: 'new actual goal-only conversation, natural revision, confirmed UI, real WaveSurge YouTube candidates, actual headed browser and model, terminal Campaign UI and reports; no candidate injection', plan, tasks, results, reportText, childReports, submits, errors };
  writeFileSync(root + '/campaign-final-audit.json', JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ plan: { id: plan.id, status: plan.status, matched: plan.matched, requested: plan.requested, evaluated: plan.evaluated }, results: results.map(r => ({ handle: r.creator.handle, platform: r.creator.platform, region: r.creator.region, verdict: r.verdict, judgments: r.judgments.map(j => ({ label: j.label, verdict: j.verdict, reason: j.reason })) })), errors }, null, 2));
} finally { await browser.close(); }
