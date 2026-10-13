import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const base='http://101.201.237.219:33332',root='validation/2026-10-13/public-acceptance';
const prefix=process.env.PUBLIC_CASE_PREFIX??'strict';
const request=JSON.parse(readFileSync(root+'/'+prefix+'-request.json')),id=request.taskId;
const password=execFileSync('docker',['compose','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Shanghai'}),page=await context.newPage();
const proof={base,taskId:id,title:request.title,startedAt:new Date().toISOString(),checks:{},pageErrors:[]};
const out='docs/testing/public-acceptance-2026-10-13/evidence';mkdirSync(out,{recursive:true});
page.on('pageerror',error=>proof.pageErrors.push(error.message));
const get=async path=>{const r=await page.request.get(base+path,{timeout:90000});assert.equal(r.status(),200,path);return r.json();};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 let state=await get('/api/state'),task=state.tasks.find(t=>t.id===id);assert(task);proof.atFollowup=task;
 const oldFollowup=state.messages.find(m=>m.role==='user'&&m.text.startsWith(`继续任务「${request.title}」，不要新建或取消。`));
 if(oldFollowup){proof.followupUserId=oldFollowup.id;proof.followupFromSavedMessages=true;proof.followupReplies=state.messages.filter(m=>m.role==='assistant'&&m.createdAt>oldFollowup.createdAt&&m.createdAt<(state.messages.find(m=>m.role==='user'&&m.createdAt>oldFollowup.createdAt)?.createdAt??Infinity)).map(({id,text,createdAt})=>({id,text,createdAt}));assert.equal(oldFollowup.state,'delivered');assert(proof.followupReplies.length);proof.followupElapsedMs=proof.followupReplies[0].createdAt-oldFollowup.createdAt;proof.checks.ongoingMessage=true;}
 else if(['queued','running'].includes(task.status)){
  const beforeMessages=new Set(state.messages.map(m=>m.id));
  await page.getByRole('textbox',{name:'发送消息'}).fill(`继续任务「${request.title}」，不要新建或取消。现在原任务还在执行，请用最新工具告诉我实际核验和入选人数。本人Geek/书卷形象和日常框架眼镜这两个条件必须保留，书本静物和墨镜都不能凑数。已有其他任务继续保留，完成时交付报告。`);
  const response=page.waitForResponse(r=>r.url()===base+'/api/messages'&&r.request().method()==='POST',{timeout:60000});await page.getByRole('button',{name:'发送消息',exact:true}).click();const posted=await response;assert.equal(posted.status(),201);proof.followupUserId=(await posted.json()).id;const start=Date.now();
  while(Date.now()-start<360000){state=await get('/api/state');if(state.messages.find(m=>m.id===proof.followupUserId)?.state==='delivered')break;await new Promise(r=>setTimeout(r,4000));}
  proof.followupElapsedMs=Date.now()-start;proof.followupReplies=state.messages.filter(m=>m.role==='assistant'&&!beforeMessages.has(m.id)).map(({id,text,createdAt})=>({id,text,createdAt}));
  assert.equal(state.messages.find(m=>m.id===proof.followupUserId)?.state,'delivered');proof.checks.ongoingMessage=true;
 }
 const deadline=Date.now()+3600000;let previous='';
 while(Date.now()<deadline){state=await get('/api/state');task=state.tasks.find(t=>t.id===id);assert(task);const progress=JSON.stringify({status:task.status,evaluated:task.evaluated,matched:task.matched});if(progress!==previous){console.log(progress);previous=progress;}if(['completed','partial','failed','cancelled'].includes(task.status))break;await new Promise(r=>setTimeout(r,8000));}
 assert(['completed','partial'].includes(task.status));proof.finalTask=task;proof.requestCreatedAt=request.requestCreatedAt;proof.totalElapsedMs=task.updatedAt-request.requestCreatedAt;
 assert(request.previousTaskIds.every(id=>state.tasks.some(t=>t.id===id)));proof.checks.previousTasksPreserved=true;
 const results=await get('/api/results?taskId='+id+'&view=summary');assert.equal(results.length,task.evaluated);const selected=results.filter(r=>r.verdict==='match'&&r.selected);assert.equal(selected.length,task.matched);
 proof.results=results.map(r=>({id:r.id,handle:r.creator.handle,followers:r.creator.followers,country:r.creator.facts?.country,selected:r.selected,verdict:r.verdict,judgments:r.judgments,annotations:r.annotations}));
 proof.delivery=state.messages.find(m=>m.id.startsWith('report-')&&m.text.includes('/api/reports/'+id));assert(proof.delivery,'结束后未自动在对话交付报告');proof.checks.delivery=true;
 const html=await page.request.get(base+'/api/reports/'+id+'?format=html',{timeout:90000});assert.equal(html.status(),200);const htmlBody=await html.text();writeFileSync(out+'/'+prefix+'-online.html',htmlBody);proof.htmlBytes=Buffer.byteLength(htmlBody);assert(htmlBody.includes(request.title));
 const csv=await page.request.get(base+'/api/reports/'+id+'?format=csv',{timeout:90000});assert.equal(csv.status(),200);const csvBody=await csv.text();writeFileSync(out+'/'+prefix+'.csv',csvBody);proof.csvBytes=Buffer.byteLength(csvBody);proof.checks.exports=true;
 for(const result of selected){assert(result.judgments.every(j=>j.verdict==='match'));for(const criterion of request.spec.criteria.filter(c=>c.basis==='visual'&&c.required)){assert(result.judgments.find(j=>j.criterionId===criterion.id)?.evidenceIds.length);}}
 await page.goto(base+'/api/reports/'+id+'?format=html',{waitUntil:'domcontentloaded',timeout:90000});await page.screenshot({path:out+'/'+prefix+'-public-report.png'});assert.deepEqual(proof.pageErrors,[]);
 proof.checks.realQualifiedDelivery=task.status==='completed'&&task.matched===task.requested&&selected.length>0;proof.passed=Object.values(proof.checks).every(Boolean);
 if(!proof.checks.realQualifiedDelivery)process.exitCode=2;
}catch(error){proof.failure=String(error).replace(/\u001b\[[0-9;]*m/g,'').replace(/\b(?:cookie|authorization):[^\r\n]*/gi,'credential header: [REDACTED]');process.exitCode=1;}
finally{proof.finishedAt=new Date().toISOString();writeFileSync(root+'/'+prefix+'-public.json',JSON.stringify(proof,null,2));writeFileSync(out+'/'+prefix+'-public.json',JSON.stringify(proof,null,2));console.log(JSON.stringify({passed:proof.passed,checks:proof.checks,followupElapsedMs:proof.followupElapsedMs,task:proof.finalTask,failure:proof.failure}));await browser.close();}
