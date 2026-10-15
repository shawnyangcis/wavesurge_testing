import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = 'http://101.201.237.219:33332';
const root = new URL('./private/', import.meta.url).pathname; mkdirSync(root, { recursive: true });
const password = execFileSync('docker', ['exec', 'wavesurge_testing-app-1', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: '/Users/shawn/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-x64/chrome-headless-shell', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = []; page.on('pageerror', error => errors.push(error.message.replaceAll(password, '[REDACTED]')));
const evidence = { base, startedAt: new Date().toISOString(), checks: [], errors };
async function get(path) { const response = await page.request.get(base + path); assert.equal(response.status(), 200); return response.json(); }
async function downloadJson(surface, label, filename) {
  const pending = surface.waitForEvent('download'); await surface.getByRole('link', { name: label, exact: true }).click();
  const download = await pending; assert(download.suggestedFilename().endsWith('.json'));
  await download.saveAs(root + filename); const data = JSON.parse(readFileSync(root + filename, 'utf8'));
  assert.equal(data.schemaVersion, '1.0'); assert.equal(data.results.length, data.counts.exported.records);
  assert(data.results.every(row => !('raw' in row.creator) && typeof row.selected === 'boolean'));
  evidence.checks.push({ filename: download.suggestedFilename(), url: download.url(), kind: data.report.kind, counts: data.counts }); return data;
}
try {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click();
  await expect(page.getByLabel('研究对话')).toBeVisible();
  const state = await get('/api/state');
  if (process.argv.includes('--baseline')) {
    writeFileSync(root + 'before.json', JSON.stringify({ ids: state.tasks.map(t => t.id) }));
    console.log(JSON.stringify({ tasks: state.tasks.length, active: state.tasks.filter(t => ['queued', 'running'].includes(t.status)).map(t => ({ id: t.id, status: t.status })) }));
  } else {
    evidence.browser = await page.evaluate(() => ({ url: location.href, secureContext: isSecureContext }));
    const before = JSON.parse(readFileSync(root + 'before.json', 'utf8')); assert(before.ids.every(id => state.tasks.some(t => t.id === id)));
    const taskId = 'research-f43a778f97034963308dc62d';
    const card = page.locator(`.task[data-task-id="${taskId}"]`); await expect(card).toBeVisible();
    await card.getByRole('button', { name: '查看结果', exact: true }).click();
    const panel = page.getByRole('dialog', { name: '研究结果', exact: true }); await expect(panel.getByText('已入选', { exact: true })).toBeVisible();
    await panel.screenshot({ path: root + 'results.png' });
    const json = await downloadJson(page, '下载 JSON', 'research.json');
    assert.equal(json.results.length, 1); assert.equal(json.results[0].creator.handle.toLowerCase(), 'adafruit'); assert.equal(json.results[0].selected, true);
    const saved = await get(`/api/results?taskId=${taskId}&view=summary`);
    assert.deepEqual(json.results[0].judgments, saved[0].judgments); assert.deepEqual(json.results[0].reportContext, saved[0].reportContext);
    assert.equal(json.counts.all.selected, 1); assert(json.results[0].creator.evidence.some(e => e.screenshotUrl));
    // Read the actual CSV download as well; compare its row in Python in the final verification.
    const csvPending = page.waitForEvent('download'); await panel.getByRole('link', { name: '下载 CSV', exact: true }).click(); await (await csvPending).saveAs(root + 'research.csv');
    await panel.getByRole('combobox').nth(2).selectOption('no_match'); await panel.getByRole('button', { name: '查询 / 刷新' }).click();
    await expect(panel.getByRole('link', { name: '下载 JSON' })).toHaveAttribute('href', /verdict=no_match/);
    const empty = await downloadJson(page, '下载 JSON', 'empty.json'); assert.equal(empty.results.length, 0); assert.equal(empty.counts.all.selected, 1); assert.equal(empty.scope.filters.verdict, 'no_match');
    const popupPromise = page.waitForEvent('popup'); await panel.getByRole('link', { name: '查看报告' }).click(); const report = await popupPromise; await report.waitForLoadState('networkidle');
    const htmlJson = await downloadJson(report, '下载 JSON', 'filtered-html.json'); assert.deepEqual(htmlJson, empty); await report.close();
    await panel.getByRole('button', { name: '关闭', exact: true }).click();
    const batch = '/api/work-batches/254657cb91d71d9687d7745cd30283b7/report';
    await page.goto(base + batch, { waitUntil: 'networkidle' }); const batchJson = await downloadJson(page, '下载 JSON', 'batch.json'); assert.equal(batchJson.report.kind, 'work_batch'); assert(batchJson.results.some(r => r.taskId === taskId));
    const campaigns = await get('/api/campaigns'); const campaign = campaigns.find(c => c.matched > 0); assert(campaign, 'Need an existing actual Campaign with selected results');
    await page.goto(base + campaign.reportUrl, { waitUntil: 'networkidle' });
    const campaignJson = await downloadJson(page, '下载 JSON', 'campaign.json'); assert.equal(campaignJson.report.kind, 'campaign'); assert(campaignJson.results.every(r => r.selected)); assert.equal(campaignJson.results.length, campaign.matched);
    await page.screenshot({ path: root + 'campaign.png' });
    const unauth = await browser.newContext(); for (const path of [`/api/reports/${taskId}?format=json`, batch + '?format=json', campaign.reportUrl + '?format=json']) assert.equal((await unauth.request.get(base + path)).status(), 401); await unauth.close();
    assert.equal(errors.length, 0); evidence.tasksPreserved = before.ids.length; evidence.passed = true; evidence.finishedAt = new Date().toISOString();
    writeFileSync(root + 'evidence.json', JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence));
  }
} finally { await browser.close(); }
