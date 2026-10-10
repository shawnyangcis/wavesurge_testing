import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const root='.gstack/qa-reports/retest-2026-10-10-r4',base='http://127.0.0.1:3592',id='campaign-73faf22be1fd823d6a0f58d6';
const pass=execFileSync('docker',['compose','-p','creator-studio-retest-r4-live','-f','compose.yaml','-f',root+'/live-compose.yaml','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
const out={at:new Date().toISOString(),children:[]};
try{
 await page.goto(base);await page.getByLabel('管理员密码').fill(pass);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const campaign=await(await page.request.get(base+'/api/campaigns/'+id)).json(),results=await(await page.request.get(base+'/api/results')).json();
 await page.goto(base+'/api/campaigns/'+id+'/report',{waitUntil:'domcontentloaded'});
 out.parent={headings:await page.locator('article h2').allTextContents(),criteriaTables:await page.locator('table').count(),annotationParagraphs:await page.locator('article > p').filter({hasText:'画像 '}).count(),uniqueSelections:new Set(campaign.selections.map(s=>s.creatorId)).size};
 for(const group of campaign.groups){
  const child=await context.newPage();await child.goto(base+'/api/reports/'+group.taskId,{waitUntil:'domcontentloaded'});const text=await child.locator('body').innerText(),rows=results.filter(r=>r.taskId===group.taskId);
  const record={groupId:group.id,taskId:group.taskId,url:child.url(),articles:await child.locator('article').count(),criteriaTables:await child.locator('table').count(),matchesAllSavedJudgmentReasons:rows.every(r=>r.judgments.every(j=>text.includes(j.reason))),matchesAllSavedAnnotations:rows.every(r=>(r.annotations??[]).every(a=>text.includes(a.reason))),labels:await child.locator('article h2').allTextContents()};
  expect(record.articles).toBe(rows.length);expect(record.matchesAllSavedJudgmentReasons&&record.matchesAllSavedAnnotations).toBe(true);
  await child.screenshot({path:root+'/screenshots/doc04-campaign-child-'+group.id+'.png',fullPage:false});writeFileSync(root+'/doc04-campaign-child-'+group.id+'.html',await child.content());out.children.push(record);await child.close();
 }
 out.finishedAt=new Date().toISOString();out.passed=true;
 const audit=JSON.parse(readFileSync(root+'/structured-document-ui.json'));const item=audit.variants.find(v=>v.name==='campaign');item.checks=item.checks.filter(c=>c.name!=='Campaign清单去重且含特征匹配说明');item.checks.push({name:'Campaign入选清单与去重人数正确',passed:out.parent.uniqueSelections===campaign.matched},{name:'Campaign总报告直接含逐人特征匹配说明和标签',passed:out.parent.criteriaTables>0&&out.parent.annotationParagraphs>0,detail:out.parent},{name:'Campaign子文档提供完整逐条件说明和画像',passed:out.children.every(c=>c.matchesAllSavedJudgmentReasons&&c.matchesAllSavedAnnotations),detail:out.children});item.failures=item.checks.filter(c=>!c.passed);audit.campaignChildrenEvidence='doc04-campaign-children-ui.json';writeFileSync(root+'/structured-document-ui.json',JSON.stringify(audit,null,2));
}catch(e){out.error=String(e);throw e}finally{writeFileSync(root+'/doc04-campaign-children-ui.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));await browser.close()}
