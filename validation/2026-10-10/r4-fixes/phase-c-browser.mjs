import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Store } from '../../../src/server/store.ts';
import { ResearchEngine } from '../../../src/server/research.ts';
import { createApp } from '../../../src/server/app.ts';
import { registerResearch } from '../../../src/server/research-api.ts';
import { repairFactorReferences } from '../../../src/server/repair.ts';
const root = 'validation/2026-10-10/r4-fixes', base = 'http://127.0.0.1:3622', taskId = 'research-294320f8d1c060255d3310e8';
copyFileSync(`${root}/private/review-before.sqlite`, `${root}/private/review-stage-c.sqlite`);
const store = new Store(`${root}/private/review-stage-c.sqlite`), remote = async () => { throw Error('Unexpected remote call'); }, engine = new ResearchEngine(store, { submit: remote, poll: remote }, remote, Date.now); engine.stopped = true;
const before = store.list('result'), waves = store.list('wave-call'), tasks = store.list('task'), messages = store.list('message');
repairFactorReferences(engine); const after = store.list('result');
const stable = r => ({...r, revision: undefined, updatedAt: undefined, creator: {...r.creator, evidence: undefined}, judgments: r.judgments.map(j => ['__followers','__region'].includes(j.criterionId) ? {...j,evidenceIds:undefined}:j)});
expect(after.map(stable)).toEqual(before.map(stable)); expect(store.list('wave-call')).toEqual(waves); expect(store.list('task')).toEqual(tasks); expect(store.list('message')).toEqual(messages);
for (const original of before) for (const source of original.creator.evidence) expect(after.find(r=>r.id===original.id).creator.evidence).toContainEqual(source);
const repaired = store.get('data-migration','r4-factor-references-20261010'), record = {startedAt:new Date().toISOString(),source:'Current production UI/routes against unchanged actual R4 response data, request delays only; saved-reference migration on private copy, no new webpage claims/API/model',migration:repaired,cases:[],errors:[]};
const image = id => `data:image/png;base64,${readFileSync(`${root}/private/assets/${basename(store.get('asset',id).file)}`).toString('base64')}`;
const app = createApp({store,now:Date.now,publicDir:resolve('dist'),onMessage:()=>{},active:()=>false}); registerResearch(app,engine,image); await app.listen({host:'127.0.0.1',port:3622});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true}), page = await browser.newPage({viewport:{width:1440,height:1000}}); page.on('pageerror', e=>record.errors.push(String(e)));
try {
 await page.goto(base); await page.getByLabel('管理员密码').fill(readFileSync(`${root}/private/admin-bootstrap.txt`,'utf8').trim()); await page.getByRole('button',{name:/进入工作室/}).click(); await page.getByLabel('研究对话').waitFor();
 const resultPath = `/api/results?taskId=${taskId}`;
 for (const kind of ['initial','previous-query']) {
  let release, intercepted; const gate = new Promise(r=>release=r), caught=new Promise(r=>intercepted=r); let seen=false;
  const route = async route => {const url=new URL(route.request().url());const delay=!seen && (kind==='initial'? !url.searchParams.has('tag') : url.searchParams.get('tag')==='文字不匹配'); const response=await route.fetch(); if(delay){console.log('intercepted',kind,url.search);seen=true;intercepted();await gate;} await route.fulfill({response});};
  await page.route(url => url.pathname === "/api/results" && url.searchParams.get("taskId") === taskId,route);
  console.log('opening',kind);await page.locator(`[data-task-id="${taskId}"]`).getByRole('button',{name:'查看结果'}).click(); const dialog=page.getByRole('dialog',{name:'研究结果'});
  if(kind==='previous-query') {await expect(dialog.locator('.finding')).toHaveCount(2);await dialog.getByLabel('按标签查找').fill('文字不匹配');await dialog.getByRole('button',{name:'查询 / 刷新'}).click();}
  await Promise.race([caught,new Promise((_,reject)=>setTimeout(()=>reject(Error('Request interception timed out')),15000))]); await dialog.getByLabel('按标签查找').fill('不戴眼镜'); await dialog.getByRole('button',{name:'查询 / 刷新'}).click(); await expect(dialog.locator('.finding')).toHaveCount(1); await expect(dialog).toContainText('Tyler Crawford'); const csvLink = await dialog.getByRole('link',{name:'下载 CSV'}).getAttribute('href'); expect(csvLink).toContain('tagMode=exact');
  release(); await expect.poll(()=>seen).toBe(true); await page.waitForTimeout(500); await expect(dialog.locator('.finding')).toHaveCount(1); expect(await dialog.getByRole('link',{name:'下载 CSV'}).getAttribute('href')).toBe(csvLink);
  const downloadEvent=page.waitForEvent('download');await dialog.getByRole('link',{name:'下载 CSV'}).click();await (await downloadEvent).saveAs(`${root}/phase-c-${kind}.csv`);const csv=JSON.parse(execFileSync('python3',['-c','import csv,json,sys;print(json.dumps(list(csv.DictReader(open(sys.argv[1],encoding="utf-8-sig",newline="")))))',`${root}/phase-c-${kind}.csv`],{encoding:'utf8'})); expect(csv).toHaveLength(1);expect(csv[0]['账号']).toBe('tylerlcrawford');
  await page.screenshot({path:`output/playwright/r4-fixes/phase-c-${kind}.png`});record.cases.push({kind,rows:1,csvRows:csv.length,csvLink,passed:true});await dialog.getByRole('button',{name:'关闭',exact:true}).click();await page.unrouteAll({behavior:"wait"});
 }
 await page.locator(`[data-task-id="${taskId}"]`).getByRole('button',{name:'查看结果'}).click();const dialog=page.getByRole('dialog',{name:'研究结果'});await expect(dialog.locator('.finding')).toHaveCount(2);await dialog.getByLabel('按标签查找').fill('戴眼镜');await dialog.getByRole('button',{name:'查询 / 刷新'}).click();await expect(dialog.locator('.finding')).toHaveCount(0);
 await dialog.getByLabel('标签匹配方式').selectOption('contains');await dialog.getByRole('button',{name:'查询 / 刷新'}).click();await expect(dialog.locator('.finding')).toHaveCount(1);await expect(dialog).toContainText('不戴眼镜');expect(await dialog.getByRole('link',{name:'下载 CSV'}).getAttribute('href')).toContain('tagMode=contains');record.tagModes={exactPositiveRows:0,explicitContainsNegativeRows:1};await page.screenshot({path:'output/playwright/r4-fixes/phase-c-tag-modes.png'});await dialog.getByRole('button',{name:'关闭',exact:true}).click();
 const original=before.filter(r=>r.judgments.some(j=>j.criterionId==='__followers')).sort((a,b)=>b.judgments.find(j=>j.criterionId==='__followers').evidenceIds.length-a.judgments.find(j=>j.criterionId==='__followers').evidenceIds.length)[0],fixed=after.find(r=>r.id===original.id);await page.goto(`${base}/api/reports/${original.taskId}`);const oldRefs=original.judgments.find(j=>j.criterionId==='__followers').evidenceIds,newRefs=fixed.judgments.find(j=>j.criterionId==='__followers').evidenceIds;
 expect(newRefs.length).toBeLessThan(oldRefs.length);expect(newRefs.every(id=>['profile','profile_metrics','browser_snapshot'].includes(fixed.creator.evidence.find(e=>e.id===id).kind))).toBe(true);const row=page.locator(`article[data-result-id="${fixed.id}"] tr[data-criterion-id="__followers"]`);expect(await row.locator('a').count()).toBe(newRefs.length);record.references={old:oldRefs.length,current:newRefs.length,sourceEvidenceBefore:original.creator.evidence.length,sourceEvidenceAfter:fixed.creator.evidence.length};
 for(const width of [1440,768,375]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await row.screenshot({path:`output/playwright/r4-fixes/phase-c-followers-${width}.png`});}
 writeFileSync(`${root}/phase-c-numeric-report.html`,await page.content());expect(record.errors).toEqual([]);record.passed=true;record.newWaveCalls=0;expect(store.list('result')).toEqual(after);
} catch(error){record.failure=String(error);process.exitCode=1;await page.screenshot({path:'output/playwright/r4-fixes/phase-c-failure.png'}).catch(()=>{});}
finally {record.finishedAt=new Date().toISOString();writeFileSync(`${root}/phase-c-browser.json`,JSON.stringify(record,null,2));console.log(JSON.stringify({passed:record.passed,failure:record.failure,cases:record.cases.length,references:record.references}));await browser.close();await app.close();store.close();}
