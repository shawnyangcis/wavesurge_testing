import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'http://101.201.237.219:33332';
const out = 'docs/testing/public-scenarios-2026-10-13/evidence';
const artifacts = 'validation/2026-10-13/public-scenarios/artifacts';
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, timezoneId: 'Asia/Shanghai' });
const proof = { base, startedAt: new Date().toISOString(), checks: {}, cases: [], pageErrors: [] };
page.on('pageerror', e => proof.pageErrors.push(e.message));
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  await expect(page.locator('.messages article time').last()).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/); proof.checks.messageTimes = true;
  for (const key of ['running', 'coffee']) {
    const source = JSON.parse(readFileSync(out + '/' + key + '.json', 'utf8'));
    assert(source.finalTask && ['completed', 'partial', 'failed'].includes(source.finalTask.status));
    const r = await page.request.get(base + '/api/results?taskId=' + source.taskId + '&view=summary', { timeout: 90000 }); assert.equal(r.status(), 200);
    const rows = await r.json(); assert.deepEqual(rows.map(r => r.id).sort(), source.results.map(r => r.id).sort());
    const seed = rows.find(r => r.selected && r.tags.length) ?? rows.find(r => r.tags.length); assert(seed, '实际画像应形成可查询标签');
    const tag = seed.tags[0]; const expected = rows.filter(r => r.verdict === seed.verdict && r.tags.includes(tag));
    await page.locator(`aside .task[data-task-id="${source.taskId}"]`).getByRole('button', { name: '查看结果' }).click();
    const dialog = page.getByRole('dialog', { name: '研究结果' });
    await dialog.getByLabel('按标签查找').fill(tag); await dialog.getByLabel('标签匹配方式').selectOption('exact');
    await dialog.getByLabel('平台').selectOption('instagram'); await dialog.getByLabel('判断').selectOption(seed.verdict);
    await dialog.getByRole('button', { name: '查询 / 刷新' }).click(); await expect(dialog.locator('article.finding')).toHaveCount(expected.length, { timeout: 60000 });
    const actualIds = await dialog.locator('article.finding').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-result-id'))); assert.deepEqual(actualIds.sort(), expected.map(r => r.id).sort());
    const downloadWaiting = page.waitForEvent('download', { timeout: 120000 }); await dialog.getByRole('link', { name: '下载 CSV' }).click();
    const download = await downloadWaiting; const path = artifacts + '/' + key + '-tagged.csv'; await download.saveAs(path); const csv = readFileSync(path, 'utf8');
    for (const row of rows) assert.equal(csv.includes(row.id), expected.some(r => r.id === row.id));
    await page.screenshot({ path: out + '/' + key + '-tag-filter.png' });
    const popupWaiting = page.waitForEvent('popup', { timeout: 60000 }); await dialog.getByRole('link', { name: '查看报告' }).click(); const report = await popupWaiting;
    await report.waitForLoadState('domcontentloaded'); await expect(report.locator('article[data-result-id]')).toHaveCount(expected.length, { timeout: 60000 });
    const reportIds = await report.locator('article[data-result-id]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-result-id'))); assert.deepEqual(reportIds.sort(), expected.map(r => r.id).sort());
    const offlineWaiting = report.waitForEvent('download', { timeout: 180000 }); await report.getByRole('link', { name: '下载含截图的离线 HTML' }).click(); const offline = await offlineWaiting;
    const offlinePath = artifacts + '/' + key + '-tagged-offline.html'; await offline.saveAs(offlinePath); const html = readFileSync(offlinePath, 'utf8');
    for (const row of rows) assert.equal(html.includes('data-result-id="' + row.id + '"'), expected.some(r => r.id === row.id));
    proof.cases.push({ scenario: key, taskId: source.taskId, tag, verdict: seed.verdict, expectedIds: expected.map(r => r.id), filteredCsvBytes: Buffer.byteLength(csv), filteredOfflineBytes: Buffer.byteLength(html), checks: { exactTagQuery: true, csvMatchesQuery: true, actualReportClick: true, onlineMatchesQuery: true, offlineMatchesQuery: true } });
    await report.close(); await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  }
  const sources = ['running', 'coffee'].map(key => JSON.parse(readFileSync(out + '/' + key + '.json', 'utf8')));
  const batchId = sources[0].deliveryBatch.id;
  assert(sources.every(s => s.passed === true && s.delivery.text.includes('/api/work-batches/' + batchId + '/report')));
  const allRows = sources.flatMap(s => s.results); const selected = allRows.filter(r => r.selected && r.verdict === 'match');
  const compositePath = '/api/work-batches/' + batchId + '/report';
  const compositeWaiting = page.waitForEvent('popup', { timeout: 60000 });
  await page.locator('.messages a[href="' + compositePath + '"]').click(); const composite = await compositeWaiting;
  await composite.waitForLoadState('domcontentloaded');
  await expect(composite.locator('section.report-group')).toHaveCount(2);
  await expect(composite.locator('article[data-result-id]')).toHaveCount(allRows.length);
  await expect(composite.locator('article[data-selected="true"]')).toHaveCount(selected.length);
  for (const source of sources) {
    const articles = composite.locator('article[data-source-task-id="' + source.taskId + '"]');
    await expect(articles).toHaveCount(source.results.length);
    for (const article of await articles.all()) await expect(article).toContainText(source.title);
  }
  await composite.screenshot({ path: out + '/combined-report.png' });
  const combinedCsvWaiting = page.waitForEvent('download', { timeout: 180000 });
  await page.locator('.messages a[href="' + compositePath + '?format=csv"]').click();
  const combinedCsv = await combinedCsvWaiting; await combinedCsv.saveAs(artifacts + '/combined.csv'); const combinedCsvText = readFileSync(artifacts + '/combined.csv', 'utf8');
  for (const row of allRows) assert(combinedCsvText.includes(row.id));
  const combinedOfflineWaiting = composite.waitForEvent('download', { timeout: 180000 });
  await composite.getByRole('link', { name: '下载含截图的离线 HTML' }).click();
  const combinedOffline = await combinedOfflineWaiting; await combinedOffline.saveAs(artifacts + '/combined-offline.html'); const combinedHtml = readFileSync(artifacts + '/combined-offline.html', 'utf8');
  for (const row of allRows) assert(combinedHtml.includes('data-result-id="' + row.id + '"'));
  proof.combined = { batchId, taskIds: sources.map(s => s.taskId), groups: 2, records: allRows.length, selected: selected.length, distinctSelected: new Set(selected.map(r => r.profileUrl)).size, csvBytes: Buffer.byteLength(combinedCsvText), offlineBytes: Buffer.byteLength(combinedHtml), checks: { actualChatReportClick: true, groupCounts: true, perRecordOwnership: true, selectedCount: true, actualChatCsvDownload: true, offlineRecordConsistency: true } };
  await composite.close();
  assert.deepEqual(proof.pageErrors, []); proof.checks.noBrowserPageErrors = true; proof.passed = true;
} catch (error) { proof.failure = String(error).replace(/\u001b\[[0-9;]*m/g, '').replace(/token=[^&\s"'<>]+/g, 'token=[REDACTED]'); process.exitCode = 1; }
finally { proof.finishedAt = new Date().toISOString(); writeFileSync(out + '/delivery-ui.json', JSON.stringify(proof, null, 2)); console.log(JSON.stringify(proof)); await browser.close(); }
