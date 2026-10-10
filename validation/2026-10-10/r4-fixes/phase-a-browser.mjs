import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Store } from '../../../src/server/store.ts';
import { ResearchEngine } from '../../../src/server/research.ts';
import { createApp } from '../../../src/server/app.ts';
import { registerResearch } from '../../../src/server/research-api.ts';
const root = 'validation/2026-10-10/r4-fixes', review = '.gstack/qa-reports/retest-2026-10-10-r4';
const store = new Store(`${root}/private/review-before.sqlite`), remote = async () => { throw Error('Unexpected remote call'); };
const engine = new ResearchEngine(store, { submit: remote, poll: remote }, remote, Date.now); engine.stopped = true;
const image = id => `data:image/png;base64,${readFileSync(`${root}/private/assets/${basename(store.get('asset', id).file)}`).toString('base64')}`;
const app = createApp({ store, now: Date.now, publicDir: resolve('dist'), onMessage: () => {}, active: () => false }); registerResearch(app, engine, image); await app.listen({ host: '127.0.0.1', port: 3620 });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, headless: true }), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const before = { results: store.list('result'), calls: store.list('wave-call').length, messages: store.list('message').length }, record = { startedAt: new Date().toISOString(), source: 'Production report HTTP routes and actual read-only R4 snapshot. Browser renders/downloads existing real results; no claim of new research or social page access.', pageErrors: [] };
page.on('pageerror', error => record.pageErrors.push(String(error)));
try {
  const base = 'http://127.0.0.1:3620'; await page.goto(base); await page.getByLabel('管理员密码').fill(readFileSync(`${root}/private/admin-bootstrap.txt`, 'utf8').trim()); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  const positive = JSON.parse(readFileSync(`${review}/exact-two-results.json`)), retag = JSON.parse(readFileSync(`${review}/six-retag-batch.json`));
  const variants = [{ name: 'positive', path: `/api/reports/${positive.taskId}`, records: 2, unique: 2, qualifying: 2, selected: 1 }, { name: 'six-groups', path: `/api/work-batches/${retag.batchId}/report`, records: 6, unique: 2, qualifying: 5, selected: 3 }]; record.variants = [];
  for (const variant of variants) {
    await page.goto(base + variant.path); await page.getByRole('heading').first().waitFor();
    const summary = await page.locator('.report-summary').innerText(), cards = page.locator('article[data-result-id]'); expect(await cards.count()).toBe(variant.records);
    expect(await page.locator('article[data-selected="true"]').count()).toBe(variant.selected);
    if (variant.name === 'positive') { expect(summary).toContain('合格候选 2 人'); expect(summary).toContain('最终入选 1 人'); expect(summary).toContain('缺额 0 人'); }
    else { expect(summary).toContain('去重创作者 2 人'); expect(summary).toContain('已核验 6 条记录'); expect(summary).toContain('合格记录 5 条'); expect(summary).toContain('入选记录 3 条'); expect(await page.locator('.report-group').count()).toBe(3); }
    const csv = await (await page.request.get(base + variant.path + '?format=csv')).text(), html = await page.content();
    writeFileSync(`${root}/phase-a-${variant.name}.csv`, csv); writeFileSync(`${root}/phase-a-${variant.name}.html`, html);
    const parsed = JSON.parse(execFileSync('python3', ['-c', 'import csv,json,sys;print(json.dumps(list(csv.DictReader(open(sys.argv[1],encoding="utf-8-sig",newline="")))))', `${root}/phase-a-${variant.name}.csv`], { encoding: 'utf8' })); expect(parsed).toHaveLength(variant.records);
    for (const item of parsed) { expect(item['来源任务ID']).toBeTruthy(); expect(item['分组名称']).toBeTruthy(); const article = page.locator(`article[data-result-id="${item['记录ID']}"]`); expect(await article.getAttribute('data-source-task-id')).toBe(item['来源任务ID']); expect(await article.getAttribute('data-selected')).toBe(item['入选']); }
    await page.screenshot({ path: `output/playwright/r4-fixes/phase-a-${variant.name}-1440.png` });
    const widths = [];
    for (const width of [768, 375]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await page.screenshot({ path: `output/playwright/r4-fixes/phase-a-${variant.name}-${width}.png` }); widths.push({ width, noHorizontalOverflow: true }); }
    await page.setViewportSize({ width: 1440, height: 1000 }); record.variants.push({ ...variant, summary, sourceTasks: [...new Set(parsed.map(r => r['来源任务ID']))], csvColumns: Object.keys(parsed[0]).length, htmlCsvEveryRowMatched: true, widths });
  }
  expect(store.list('result')).toEqual(before.results); expect(store.list('wave-call')).toHaveLength(before.calls); expect(store.list('message')).toHaveLength(before.messages); expect(record.pageErrors).toEqual([]); record.passed = true; record.newWaveCalls = 0; record.resultsUnchanged = true;
} catch (error) { record.failure = String(error); process.exitCode = 1; await page.screenshot({ path: 'output/playwright/r4-fixes/phase-a-failure.png' }).catch(() => {}); }
finally { record.finishedAt = new Date().toISOString(); writeFileSync(`${root}/phase-a-browser.json`, JSON.stringify(record, null, 2)); console.log(JSON.stringify({ passed: record.passed, failure: record.failure, variants: record.variants?.length, pageErrors: record.pageErrors })); await browser.close(); await app.close(); store.close(); }
