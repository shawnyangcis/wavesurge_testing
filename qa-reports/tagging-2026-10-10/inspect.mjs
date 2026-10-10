import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root='.gstack/qa-reports/tagging-2026-10-10';
const base='http://127.0.0.1:3000';
const password=execFileSync('docker',['compose','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage();
const get=async path=>(await page.request.get(base+path)).json();
const ids=['research-d22f5bc3f9c80da1a4979ca5','research-fd88375f69e716ff5cbc9fef','research-b30bacd90e74569b33e06bfc'];
const output={observedAt:new Date().toISOString(),source:'Actual browser UI tag filters, HTML reports and CSV export after natural-language enrichment request',cases:[]};
try {
 await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const state=await get('/api/state');
 const enriched=page.locator('.message.assistant').filter({hasText:'六位创作者整理文档'});
 await enriched.getByRole('heading',{name:'短标签总览'}).scrollIntoViewIfNeeded();
 output.chatTableCount=await enriched.locator('table').count();
 output.chatHasRawTableSyntax=(await enriched.innerText()).includes('| 创作者 | 平台 |');
 await page.getByLabel('研究对话').screenshot({path:root+'/screenshots/enriched-chat-tags.png'});
 for(const [index,id] of ids.entries()){
  const task=state.tasks.find(t=>t.id===id);
  const card=page.locator('aside .task').filter({has:page.getByRole('heading',{name:task.title,exact:true})});
  await card.getByRole('button',{name:'查看结果',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'研究结果'});
  await dialog.locator('.finding').first().waitFor();
  const before=await dialog.locator('.finding').evaluateAll(es=>es.map(e=>({creator:e.querySelector('h3')?.textContent,tags:[...e.querySelectorAll('.tags span')].map(t=>t.textContent)})));
  await dialog.screenshot({path:root+'/screenshots/stored-tags-'+index+'.png'});
  const tag=index===0?'智能家居':index===1?'指南型':'Notion';
  await dialog.getByRole('textbox',{name:'按标签查找'}).fill(tag);
  await dialog.getByRole('button',{name:'查询 / 刷新',exact:true}).click();
  await page.waitForTimeout(800);
  const afterCount=await dialog.locator('.finding').count();
  await dialog.screenshot({path:root+'/screenshots/short-tag-filter-'+index+'.png'});
  const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('link',{name:'下载 CSV',exact:true}).click()]);
  await download.saveAs(root+'/export-'+index+'.csv');
  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  const report=await context.newPage();await report.goto(base+'/api/reports/'+id);
  const reportTags=await report.locator('article').evaluateAll(es=>es.map(e=>({creator:e.querySelector('h2')?.textContent,tags:[...e.querySelectorAll('p')].find(p=>p.textContent.startsWith('标签：'))?.textContent})));
  await report.screenshot({path:root+'/screenshots/original-report-'+index+'.png',fullPage:true});await report.close();
  output.cases.push({id,title:task.title,storedTags:before,requestedShortTag:tag,filterResultCount:afterCount,reportTags});
 }
 await page.reload();await page.getByLabel('研究对话').waitFor();
 output.resultsAfterReload=(await get('/api/results')).filter(r=>ids.includes(r.taskId)).map(r=>({id:r.id,handle:r.creator.handle,tags:r.tags}));
 const debug=await get('/api/debug');
 output.verificationCalls=debug.calls.filter(c=>c.kind==='browser-verification').flatMap(c=>{
  const input=c.request.messages.find(m=>m.role==='user'&&typeof m.content==='string'&&m.content.includes('"spec"'));
  if(!input)return[];let parsed;try{parsed=JSON.parse(input.content);}catch{return[];}
  if(!ids.includes(parsed.taskId))return[];
  const contents=c.request.messages.flatMap(m=>Array.isArray(m.content)?m.content:[]);
  return[{id:c.id,taskId:parsed.taskId,handle:parsed.creator.handle,model:c.request.model,criteria:parsed.spec.criteria,providedTools:c.request.tools.map(t=>({name:t.function.name,parameters:t.function.name==='submit_judgments'?t.function.parameters:undefined})),imageCount:contents.filter(c=>c.type==='image_url').length,verificationPrompt:c.request.messages.filter(m=>m.role==='system').map(m=>m.content),actions:c.response?.choices?.[0]?.message?.tool_calls?.map(t=>({name:t.function.name,arguments:t.function.arguments})),error:c.error}];
 });
 writeFileSync(root+'/inspect.json',JSON.stringify(output,null,2));
 console.log(JSON.stringify({chatTableCount:output.chatTableCount,chatHasRawTableSyntax:output.chatHasRawTableSyntax,cases:output.cases,perCreatorVerification:output.verificationCalls.reduce((a,c)=>{const key=c.handle;a[key]??={calls:0,images:0,submitted:false};a[key].calls++;a[key].images=Math.max(a[key].images,c.imageCount);a[key].submitted||=!!c.actions?.some(t=>t.name==='submit_judgments');return a;},{})},null,2));
}finally{await browser.close();}
