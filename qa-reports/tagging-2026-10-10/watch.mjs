import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const root='.gstack/qa-reports/tagging-2026-10-10';
const scope=process.argv[2];
const replay=scope==='replay'||scope==='mixed';
const main=scope==='main';
const port=main?3000:replay?3300:3400;
const base='http://127.0.0.1:'+port;
const compose=main?['compose']:['compose','-p',replay?'creator-studio-review-e2e':'creator-studio-review-clean-2','-f','compose.yaml','-f','.gstack/qa-reports/full-e2e-2026-10-10/'+(replay?'compose.override.yaml':'compose-clean.override.yaml')];
const password=execFileSync('docker',[...compose,'exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const ids=main?['research-a183b9437d676713c0f2812f']:replay?[readFileSync(root+'/'+(scope==='mixed'?'mixed':'replay')+'-task-id.txt','utf8').trim()]:JSON.parse(readFileSync(root+'/campaign-confirm.json','utf8')).tasks.map(t=>t.id);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage();
const get=async path=>(await page.request.get(base+path)).json();
const output={source:replay?'Controlled real-candidate replay, real production model and live browser; NOT new discovery':'Actual new WaveSurge search and application UI',scope,base,startedAt:new Date().toISOString(),ids,timeline:[]};
const save=()=>writeFileSync(root+'/'+scope+'-completion.json',JSON.stringify(output,null,2));
try{
 await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 let signature='';const until=Date.now()+(main?1000:900000);
 while(Date.now()<until){
  const state=await get('/api/state');const tasks=state.tasks.filter(t=>ids.includes(t.id));
  const next=JSON.stringify(tasks.map(t=>({id:t.id,status:t.status,evaluated:t.evaluated,matched:t.matched,detail:t.detail})));
  if(next!==signature){signature=next;const event={at:new Date().toISOString(),tasks};output.timeline.push(event);save();console.log(JSON.stringify(event));await page.locator('aside').screenshot({path:root+'/screenshots/'+scope+'-current-tasks.png'});}
  output.observedAt=new Date().toISOString();output.tasks=tasks;
  if(tasks.some(t=>t.status==='needs_input')||tasks.every(t=>!['queued','running'].includes(t.status)))break;
  if(main||process.argv.includes('--snapshot'))break;
  await new Promise(r=>setTimeout(r,15000));
 }
 output.results=(await get('/api/results')).filter(r=>ids.includes(r.taskId));
 output.finalChat=(await get('/api/state')).messages.slice(-4).map(m=>({role:m.role,text:m.text,state:m.state}));
 const debug=await get('/api/debug');
 output.waveCalls=debug.waveCalls.filter(c=>ids.some(id=>c.request?.requestId===id)||output.tasks.some(t=>c.path?.includes(t.remoteId)));
 output.modelCalls=debug.calls.filter(c=>c.kind==='browser-verification').flatMap(c=>{
  const input=c.request.messages.find(m=>m.role==='user'&&typeof m.content==='string'&&m.content.includes('"spec"'));
  if(!input)return[];let parsed;try{parsed=JSON.parse(input.content);}catch{return[];}
  if(!ids.includes(parsed.taskId))return[];
  return[{id:c.id,kind:c.kind,createdAt:c.createdAt,finishedAt:c.finishedAt,taskId:parsed.taskId,handle:parsed.creator.handle,model:c.request.model,criteria:parsed.spec.criteria,tools:c.request.tools.map(t=>t.function.name),images:c.request.messages.flatMap(m=>Array.isArray(m.content)?m.content:[]).filter(c=>c.type==='image_url').length,response:c.response?.choices?.[0]?.message,error:c.error}];
 });
 save();
 for(const [index,t] of output.tasks.entries()){
  const results=output.results.filter(r=>r.taskId===t.id);if(!results.length)continue;
  const card=page.locator('aside .task').filter({has:page.getByRole('heading',{name:t.title,exact:true})});await card.getByRole('button',{name:'查看结果',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'研究结果'});await dialog.locator('.finding').first().waitFor();await dialog.screenshot({path:root+'/screenshots/'+scope+'-final-results-'+index+'.png'});
  const row=dialog.locator('.finding').first();await row.locator('summary').click();await row.screenshot({path:root+'/screenshots/'+scope+'-final-evidence-'+index+'.png'});await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  const report=await context.newPage();await report.goto(base+'/api/reports/'+t.id);await report.screenshot({path:root+'/screenshots/'+scope+'-final-report-'+index+'.png',fullPage:true});writeFileSync(root+'/'+scope+'-report-'+index+'.html',await report.content());await report.close();
 }
 console.log(JSON.stringify({observedAt:output.observedAt,tasks:output.tasks,results:output.results.map(r=>({handle:r.creator.handle,tags:r.tags,verdict:r.verdict,judgments:r.judgments})),modelCalls:output.modelCalls.length,lastRemoteStatus:output.waveCalls.filter(c=>c.method==='GET').slice(-3).map(c=>({path:c.path,httpStatus:c.status,response:c.response}))},null,2));
}catch(error){output.error=String(error);save();throw error;}finally{await browser.close();}
