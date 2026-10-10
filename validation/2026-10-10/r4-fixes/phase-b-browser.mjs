import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Store } from '../../../src/server/store.ts';
import { ResearchEngine } from '../../../src/server/research.ts';
import { CampaignService } from '../../../src/server/campaign.ts';
import { createApp } from '../../../src/server/app.ts';
import { registerResearch } from '../../../src/server/research-api.ts';
import { registerCampaigns } from '../../../src/server/campaign-api.ts';
import { researchTools } from '../../../src/server/research-tools.ts';
import { basicTools } from '../../../src/server/tools.ts';
const root = 'validation/2026-10-10/r4-fixes', source = JSON.parse(readFileSync('.gstack/qa-reports/retest-2026-10-10-r4/campaign-consistency-ui.json'));
const store = new Store(`${root}/private/review-before.sqlite`), remote = async () => { throw Error('Unexpected remote call'); }, engine = new ResearchEngine(store, { submit: remote, poll: remote }, remote, Date.now); engine.stopped = true;
const service = new CampaignService(store, engine, Date.now), image = id => `data:image/png;base64,${readFileSync(`${root}/private/assets/${basename(store.get('asset', id).file)}`).toString('base64')}`;
const app = createApp({ store, now: Date.now, publicDir: resolve('dist'), onMessage: () => {}, active: () => false }); registerResearch(app, engine, image); registerCampaigns(app, service, image); await app.listen({ host: '127.0.0.1', port: 3621 });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const original = store.list('result'), calls = store.list('wave-call').length, messages = store.list('message').length, record = { startedAt: new Date().toISOString(), source: 'Production Campaign/report/results/Agent query routes against actual saved R4 Campaign; browser opens parent/children and downloads standard CSV. No new research or webpage observations.', campaignId: source.campaignId, groups: [], pageErrors: [] }; page.on('pageerror', error => record.pageErrors.push(String(error)));
try {
  const base = 'http://127.0.0.1:3621', get = async path => (await page.request.get(base + path)).json();
  await page.goto(base); await page.getByLabel('管理员密码').fill(readFileSync(`${root}/private/admin-bootstrap.txt`, 'utf8').trim()); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  const summary = await get(`/api/campaigns/${source.campaignId}`), selected = summary.results.filter(r => r.selected); expect(selected).toHaveLength(2); expect(new Set(selected.map(r => r.creator.id)).size).toBe(2); record.selections = summary.selections;
  await page.goto(base + summary.reportUrl); await page.getByRole('heading').first().waitFor(); expect(await page.locator('article[data-result-id]').count()).toBe(2);
  for (const r of selected) { const article = page.locator(`article[data-result-id="${r.id}"]`); expect(await article.locator('tr[data-criterion-id]').count()).toBe(r.judgments.length); expect(await article.innerText()).toContain('标签：'); expect(await article.innerText()).toContain('入选说明'); for (const annotation of r.annotations ?? []) expect(await article.innerText()).toContain(`画像 ${annotation.dimensionId}`); }
  writeFileSync(`${root}/phase-b-campaign.html`, await page.content()); await page.screenshot({ path: 'output/playwright/r4-fixes/phase-b-campaign-1440.png' });
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('link', { name: '下载 Campaign 最终名单 CSV' }).click(); const download = await downloadEvent; await download.saveAs(`${root}/phase-b-campaign.csv`);
  const csv = JSON.parse(execFileSync('python3', ['-c', 'import csv,json,sys;print(json.dumps(list(csv.DictReader(open(sys.argv[1],encoding="utf-8-sig",newline="")))))', `${root}/phase-b-campaign.csv`], { encoding: 'utf8' })); expect(csv.map(r => r['记录ID']).sort()).toEqual(selected.map(r => r.id).sort()); expect(csv.every(r => r['入选'] === 'true' && r['入选口径'] === 'Campaign 最终分配')).toBe(true);
  for (const group of summary.groups) {
    await page.goto(base + summary.reportUrl); await page.locator(`[data-report-group-id="${group.id}"]`).getByRole('link', { name: '逐条件证据与未入选结果' }).click(); await page.getByRole('heading').first().waitFor();
    const rows = await get(`/api/results?taskId=${group.taskId}`), expected = summary.selections.filter(s => s.groupId === group.id).map(s => s.resultId);
    expect(rows.filter(r => r.selected).map(r => r.id)).toEqual(expected);
    for (const r of rows) expect(await page.locator(`article[data-result-id="${r.id}"]`).getAttribute('data-selected')).toBe(String(r.selected));
    const tool = await researchTools(engine, basicTools(store)).execute('get_results', { taskId: group.taskId }, 'query'); expect(tool.results.filter(r => r.selected).map(r => r.id)).toEqual(expected); expect(tool.results.every(r => r.reportContext.selectionScope === 'campaign')).toBe(true);
    const childCsv = await (await page.request.get(`${base}/api/reports/${group.taskId}?format=csv`)).text(); writeFileSync(`${root}/phase-b-${group.id}.csv`, childCsv); writeFileSync(`${root}/phase-b-${group.id}.html`, await page.content());
    await page.screenshot({ path: `output/playwright/r4-fixes/phase-b-${group.id}-1440.png` }); record.groups.push({ id: group.id, title: group.spec.title, taskId: group.taskId, qualifying: rows.filter(r => r.verdict === 'match').length, selectedIds: expected, independentPreselectedIds: original.filter(r => r.taskId === group.taskId && r.selected).map(r => r.id), results: rows.map(r => ({ id: r.id, verdict: r.verdict, selected: r.selected, context: r.reportContext })), agentQueryMatched: true });
  }
  expect(record.groups.some(g => JSON.stringify(g.selectedIds) !== JSON.stringify(g.independentPreselectedIds))).toBe(true);
  await page.goto(base + summary.reportUrl);
  for (const width of [768, 375]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await page.screenshot({ path: `output/playwright/r4-fixes/phase-b-campaign-${width}.png` }); }
  expect(store.list('result')).toEqual(original); expect(store.list('wave-call')).toHaveLength(calls); expect(store.list('message')).toHaveLength(messages); expect(record.pageErrors).toEqual([]); record.passed = true; record.noResultMutation = true; record.newWaveCalls = 0; record.finalCsvOnlySelected = true;
} catch (error) { record.failure = String(error); process.exitCode = 1; await page.screenshot({ path: 'output/playwright/r4-fixes/phase-b-failure.png' }).catch(() => {}); }
finally { record.finishedAt = new Date().toISOString(); writeFileSync(`${root}/phase-b-browser.json`, JSON.stringify(record, null, 2)); console.log(JSON.stringify({ passed: record.passed, failure: record.failure, groups: record.groups.length, pageErrors: record.pageErrors })); await browser.close(); await app.close(); store.close(); }
