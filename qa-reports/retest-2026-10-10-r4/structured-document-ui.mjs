import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const root = '.gstack/qa-reports/retest-2026-10-10-r4';
const base = 'http://127.0.0.1:3592';
const compose = ['compose', '-p', 'creator-studio-retest-r4-live', '-f', 'compose.yaml', '-f', root + '/live-compose.yaml'];
const password = execFileSync('docker', [...compose, 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
const page = await context.newPage();
const output = { caseId: 'DOC04', at: new Date().toISOString(), source: 'Actual Chrome UI, real Wave/model results', variants: [], pageErrors: [] };
page.on('pageerror', e => output.pageErrors.push(String(e)));
const save = () => writeFileSync(root + '/structured-document-ui.json', JSON.stringify(output, null, 2));

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button', { name: /进入工作室/ }).click();
  await page.getByLabel('研究对话').waitFor();
  const state = await (await page.request.get(base + '/api/state')).json();
  const allResults = await (await page.request.get(base + '/api/results')).json();
  const configs = [
    { name: 'positive', batchId: '60770594-be94-4f4a-a79d-0de38d3fd1b6' },
    { name: 'original20-zero-qualified', batchId: '9037ad63-8ffb-4518-822a-75c099e0b835' },
    { name: 'three-groups-retag', batchId: 'ec514915-f6b2-4081-9fe9-43525119d6a4' },
    { name: 'empty-youtube', taskId: 'research-e0790a628a71f83e4ff8fbe1' },
    { name: 'campaign', campaignId: 'campaign-73faf22be1fd823d6a0f58d6' }
  ];
  for (const config of configs) {
    const item = { ...config, checks: [], failures: [] };
    const check = (name, passed, detail) => item.checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
    let htmlPath, csvPath, expected, task, campaign;
    if (config.batchId) {
      const data = JSON.parse(execFileSync('docker', [...compose, 'exec', '-T', 'app', 'node', '--input-type=module', '-e', `import{Store}from'./src/server/store.ts';import{workResults,workSummary}from'./src/server/work-delivery.ts';const s=new Store('/app/data/studio.sqlite');const b=s.get('work-batch',${JSON.stringify(config.batchId)}),d=workResults(s,b);process.stdout.write(JSON.stringify({batch:b,summary:workSummary(s,b),task:d.task,results:d.results.map(r=>({...r,creator:{...r.creator,raw:undefined}}))}));s.close();`], { encoding: 'utf8', maxBuffer: 48 * 1024 * 1024 }));
      item.batch = data.batch; item.summary = data.summary; task = data.task; expected = data.results;
      check('批次所有事项均结束且已封口交付', data.batch.sealed && data.batch.delivered && data.summary.ready);
      htmlPath = `/api/work-batches/${config.batchId}/report`; csvPath = htmlPath + '?format=csv';
    } else if (config.taskId) {
      task = state.tasks.find(t => t.id === config.taskId);
      expected = allResults.filter(r => r.taskId === config.taskId);
      const index = state.tasks.findIndex(t => t.id === config.taskId);
      await page.locator('aside .task').nth(index).getByRole('button', { name: '查看结果' }).click();
      await expect(page.getByRole('dialog', { name: '研究结果' })).toBeVisible();
      htmlPath = `/api/reports/${config.taskId}`; csvPath = htmlPath + '?format=csv';
    } else {
      campaign = await (await page.request.get(base + '/api/campaigns/' + config.campaignId)).json();
      item.campaign = { title: campaign.title, status: campaign.status, requested: campaign.requested, matched: campaign.matched, qualifyingUnique: campaign.qualifyingUnique, selections: campaign.selections, groups: campaign.groups.map(g => ({ id: g.id, taskId: g.taskId, title: g.spec.title, requested: g.spec.count, matched: g.matched })) };
      expected = campaign.selections.map(s => allResults.find(r => r.id === s.resultId));
      htmlPath = `/api/campaigns/${config.campaignId}/report`;
    }
    const container = config.taskId ? page.getByRole('dialog', { name: '研究结果' }) : page.getByLabel('研究对话');
    const link = container.locator(`a[href="${htmlPath}"]`);
    await expect(link).toHaveCount(1, { timeout: 30000 });
    await link.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${root}/screenshots/doc04-${config.name}-entry.png`, fullPage: true });
    const event = context.waitForEvent('page'); await link.click(); const report = await event;
    await report.waitForLoadState('domcontentloaded');
    item.html = { url: report.url(), h1: await report.locator('h1').innerText(), body: await report.locator('body').innerText(), articles: await report.locator('article').count(), embeddedImages: await report.locator('img[src^="data:image/"]').count() };
    item.cards = await report.locator('article').evaluateAll(es => es.map(e => ({ heading: e.querySelector('h2')?.textContent, profileUrl: e.querySelector('h2 a')?.getAttribute('href'), paragraphs: [...e.querySelectorAll(':scope > p')].map(p => p.textContent), rows: [...e.querySelectorAll('table tr')].slice(1).map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent)), evidenceSections: e.querySelectorAll('details section').length, text: e.innerText })));
    writeFileSync(`${root}/doc04-${config.name}.html`, await report.content());
    await report.screenshot({ path: `${root}/screenshots/doc04-${config.name}-report.png`, fullPage: false });
    check('实际点击打开独立HTML文档', report.url().endsWith(htmlPath));
    check('清单条目数与实际记录一致', item.html.articles === expected.length, { visible: item.html.articles, expected: expected.length });
    item.truth = { records: expected.length, uniqueCreators: new Set(expected.map(r => r.creator.platform + ':' + r.creator.handle.toLowerCase())).size, qualifyingRecords: expected.filter(r => r.verdict === 'match').length, selectedRecords: campaign ? expected.length : expected.filter(r => r.selected).length, unknownRecords: expected.filter(r => r.verdict === 'unknown').length, rejectedRecords: expected.filter(r => r.verdict === 'no_match').length };
    if (!campaign) {
      const fields = expected.map((r, i) => {
        const card = item.cards[i];
        const ids = new Set(r.creator.evidence.map(e => e.id));
        return { handle: r.creator.handle, resultId: r.id, taskId: r.taskId, identity: card.profileUrl === r.creator.profileUrl && card.text.includes(r.creator.handle) && card.text.includes(r.creator.platform), criteria: card.rows.length === r.judgments.length && r.judgments.every((j, n) => card.rows[n][0] === (j.label ?? j.criterionId) && card.rows[n][2].includes(j.reason)), triState: r.judgments.every((j, n) => card.rows[n][1] === ({ match: '符合要求', no_match: '不符合', unknown: '待核实' })[j.verdict]), tags: r.tags.every(t => card.text.includes(t)), annotations: (r.annotations ?? []).every(a => card.text.includes(a.reason) && (a.status !== 'supported' || a.values.every(v => card.text.includes(v)))), evidenceReferences: r.judgments.every(j => j.evidenceIds.every(id => ids.has(id))) && card.evidenceSections === r.creator.evidence.length, selectionLabels: r.selected ? card.heading.includes('已入选') : r.verdict === 'match' ? card.heading.includes('合格备选') : !card.heading.includes('已入选') };
      });
      item.fieldAudit = fields;
      for (const key of ['identity', 'criteria', 'triState', 'tags', 'annotations', 'evidenceReferences', 'selectionLabels']) check(key, fields.every(f => f[key]), fields.filter(f => !f[key]).map(f => f.handle));
      const header = await report.locator('body > p').first().innerText(); item.statisticsHeader = header;
      const counts = header.match(/目标 (\d+) 人；本地已合格 (\d+) 人；已核验 (\d+) 人/);
      check('核验记录统计与真实记录一致', !!counts && Number(counts[3]) === expected.length, header);
      check('合格候选人数统计与逐人判断一致', !!counts && Number(counts[2]) === item.truth.qualifyingRecords, { header, qualifyingRecords: item.truth.qualifyingRecords, selectedRecords: item.truth.selectedRecords });
      if (config.name === 'three-groups-retag') {
        check('多组文档明确记录数与去重人数', item.html.body.includes('2位') || item.html.body.includes('2 位') || item.html.body.includes('去重人数 2'), item.truth);
        check('每条补标记录可明确归属原研究组', item.cards.every((c, i) => c.text.includes(expected[i].taskId) || c.text.includes(state.tasks.find(t => t.id === expected[i].taskId)?.title)), { cardHeadings: item.cards.map(c => c.heading), sourceTaskIds: expected.map(r => r.taskId) });
      }
      if (expected.length === 0 || item.truth.qualifyingRecords === 0) check('零合格明确0且不推荐待核实或不符合者', header.includes('本地已合格 0 人') && item.truth.selectedRecords === 0 && item.cards.every(c => !c.heading.includes('已入选')) && task.detail.includes('0/'), task.detail);
    } else {
      check('Campaign总文档按类型分组并显示配额', campaign.groups.every(g => item.html.body.includes(g.spec.title) && item.html.body.includes(`${g.matched}/${g.spec.count}`)));
      check('Campaign清单去重且含特征匹配说明', item.truth.uniqueCreators === campaign.matched && expected.every(r => item.html.body.includes(r.creator.handle) && r.judgments.every(j => item.html.body.includes(j.reason))));
      check('Campaign提供逐条件完整证据的子文档', await report.getByRole('link', { name: '逐条件证据与未入选结果' }).count() === campaign.groups.length);
    }
    if (csvPath) {
      const csvLink = container.locator(`a[href="${csvPath}"]`);
      await expect(csvLink).toHaveCount(1);
      const pending = page.waitForEvent('download'); await csvLink.click(); const dl = await pending;
      item.csvFile = `${root}/doc04-${config.name}.csv`; await dl.saveAs(item.csvFile);
      item.expectedFile = `${root}/doc04-${config.name}-expected.json`;
      writeFileSync(item.expectedFile, JSON.stringify(expected.map(r => ({ ...r, creator: { ...r.creator, raw: undefined } })), null, 2));
      const csvAudit = JSON.parse(execFileSync('python3', ['-c', `import csv,json,sys,collections\ncsv.field_size_limit(64*1024*1024)\nrows=list(csv.DictReader(open(sys.argv[1],encoding='utf-8-sig',newline='')))\nexpected=json.load(open(sys.argv[2]))\ncols=['账号','平台','粉丝数','地区','本地判断','标签','链接','逐条件核验','证据映射','入选','画像标注','基础事实','互动率及样本','照片资源']\nfields=list(csv.DictReader(open(sys.argv[1],encoding='utf-8-sig',newline='')).fieldnames)\njsoncols=['逐条件核验','证据映射','画像标注','基础事实','互动率及样本','照片资源']\nparsed=[{k:json.loads(r[k]) for k in jsoncols} for r in rows]\ncheck=len(rows)==len(expected) and all(r['账号']==e['creator']['handle'] and r['平台']==e['creator']['platform'] and r['本地判断']==e['verdict'] and r['入选']==str(bool(e.get('selected',False))).lower() and p['逐条件核验']==e['judgments'] and p['画像标注']==e.get('annotations',[]) and r['标签']==' / '.join(e['tags']) for r,p,e in zip(rows,parsed,expected))\nprint(json.dumps({'columns':fields,'columnsCorrect':fields==cols,'rows':len(rows),'jsonFieldsValid':True,'matchesPersistedRecords':check,'identities':[r['平台']+':'+r['账号'] for r in rows],'sourceTaskColumnPresent':any('task' in c.lower() or '分组' in c or '任务' in c for c in fields)},ensure_ascii=False))`, item.csvFile, item.expectedFile], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
      item.csvAudit = csvAudit;
      check('实际CSV下载有14列且嵌套JSON可解析', csvAudit.columnsCorrect && csvAudit.jsonFieldsValid);
      check('CSV清单/逐条件/标签/入选与实际结果一致', csvAudit.matchesPersistedRecords);
      if (config.name === 'three-groups-retag') check('多组CSV包含记录所属研究组字段', csvAudit.sourceTaskColumnPresent);
    }
    await report.close();
    if (config.taskId) await page.getByRole('dialog', { name: '研究结果' }).getByRole('button', { name: '关闭', exact: true }).click();
    item.failures = item.checks.filter(c => !c.passed); output.variants.push(item); save();
    console.log(JSON.stringify({ variant: item.name, truth: item.truth, checks: item.checks.length, failures: item.failures }));
  }
  output.finishedAt = new Date().toISOString(); output.status = output.variants.some(v => v.failures.length) ? 'failed' : 'passed'; save();
} catch (e) { output.error = String(e); save(); throw e; }
finally { await browser.close(); }
