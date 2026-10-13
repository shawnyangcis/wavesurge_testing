import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base='http://101.201.237.219:33332',root='validation/2026-10-13/public-acceptance',out='docs/testing/public-acceptance-2026-10-13/evidence';
const title=process.env.PUBLIC_CASE_TITLE??'公网基础验收：个人书评体验KOC';
const prefix=process.env.PUBLIC_CASE_PREFIX??'reading';
const prompt=`请帮我找2位Instagram个人书评KOC，研究命名为「${title}」，粉丝1万至10万，地区不限。必须有本人第一人称阅读或使用书籍的体验，排除出版社、商店、品牌、机构官方、明星和纯搬运账号。只核验已有公开文字，标注内容方向和呈现方式。用booknerd、booklover做开放账号搜索，不指定账号；分析预算8人、基础账号读取上限50。请直接开始，结束给我报告和CSV。此用例验证文字筛选，不代表严格外观名单；本人书卷形象与日常框架眼镜那项研究继续执行。`;
mkdirSync(out,{recursive:true});
const password=execFileSync('docker',['compose','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Shanghai'}),page=await context.newPage();
const proof={base,title,prompt,startedAt:new Date().toISOString(),checks:{},pageErrors:[]};
page.on('pageerror',e=>proof.pageErrors.push(e.message));
const get=async path=>{const r=await page.request.get(base+path,{timeout:90000});assert.equal(r.status(),200);return r.json();};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 proof.browser=await page.evaluate(()=>({isSecureContext,randomUUID:typeof crypto.randomUUID}));assert.equal(proof.browser.isSecureContext,false);
 const before=await get('/api/state');let state,task;const resume=process.env.PUBLIC_CASE_RESUME_ID;
 if(resume){task=before.tasks.find(t=>t.id===resume);assert(task);proof.resumedVerification=true;proof.previousTaskIds=before.tasks.filter(t=>t.id!==resume).map(t=>t.id);const saved=before.messages.findLast(m=>m.role==='user'&&m.text.startsWith('请帮我找2位Instagram个人书评KOC，'));assert(saved);proof.userId=saved.id;proof.prompt=saved.text;proof.requestCreatedAt=saved.createdAt;proof.title=task.title;}
 else{
 assert(!before.tasks.some(t=>t.title===title));proof.previousTaskIds=before.tasks.map(t=>t.id);
 await page.getByRole('textbox',{name:'发送消息'}).fill(prompt);const post=page.waitForResponse(r=>r.url()===base+'/api/messages'&&r.request().method()==='POST',{timeout:60000});await page.getByRole('button',{name:'发送消息',exact:true}).click();const response=await post;assert.equal(response.status(),201);const posted=await response.json();proof.userId=posted.id;proof.requestCreatedAt=posted.createdAt;
 const start=Date.now();while(Date.now()-start<360000){state=await get('/api/state');task=state.tasks.find(t=>!proof.previousTaskIds.includes(t.id)&&t.requested===2);if(task)break;await new Promise(r=>setTimeout(r,3000));}assert(task,'自然语言请求没有登记工作');proof.registerElapsedMs=Date.now()-start;
 }proof.taskId=task.id;
 const source=`import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');console.log(JSON.stringify(s.get('task',${JSON.stringify(task.id)}).spec));s.close();`;
 proof.spec=JSON.parse(execFileSync('docker',['compose','exec','-T','app','node','--input-type=module'],{input:source,encoding:'utf8'}));assert.equal(proof.spec.verificationMode,'text');assert.equal(proof.spec.count,2);assert(!proof.spec.instagram.handles?.length);assert.deepEqual(proof.spec.regions,[]);proof.checks.naturalScope=true;
 const deadline=Date.now()+1800000;let previous='';while(Date.now()<deadline){state=await get('/api/state');task=state.tasks.find(t=>t.id===proof.taskId);const progress=JSON.stringify({status:task.status,evaluated:task.evaluated,matched:task.matched});if(progress!==previous){console.log(progress);previous=progress;}if(['completed','partial','failed','cancelled'].includes(task.status))break;await new Promise(r=>setTimeout(r,8000));}
 proof.finalTask=task;proof.totalElapsedMs=task.updatedAt-proof.requestCreatedAt;proof.otherTasksAtCompletion=state.tasks.filter(t=>t.id!==task.id).map(({id,status,evaluated,matched})=>({id,status,evaluated,matched}));assert.equal(task.status,'completed');assert.equal(task.matched,2);proof.checks.realOpenTarget=true;
 const results=await get('/api/results?taskId='+task.id+'&view=summary');assert.equal(results.filter(r=>r.selected&&r.verdict==='match').length,2);proof.results=results.map(r=>({id:r.id,handle:r.creator.handle,followers:r.creator.followers,selected:r.selected,verdict:r.verdict,judgments:r.judgments,annotations:r.annotations}));
 proof.delivery=state.messages.find(m=>m.id.startsWith('report-')&&m.text.includes('/api/reports/'+task.id));assert(proof.delivery);proof.checks.automaticDelivery=true;
 assert(proof.previousTaskIds.every(id=>state.tasks.some(after=>after.id===id)));assert.equal(state.tasks.length,proof.previousTaskIds.length+1);proof.checks.previousTasksPreserved=true;
 for(const [format,name]of [['html',prefix+'-online.html'],['csv',prefix+'.csv']]){const r=await page.request.get(base+'/api/reports/'+task.id+'?format='+format,{timeout:90000});assert.equal(r.status(),200);const body=await r.text();writeFileSync(out+'/'+name,body);proof[format+'Bytes']=Buffer.byteLength(body);}proof.checks.exports=true;
 await page.goto(base+'/api/reports/'+task.id+'?format=html',{waitUntil:'domcontentloaded',timeout:90000});await page.screenshot({path:out+'/'+prefix+'-public-report.png'});assert.deepEqual(proof.pageErrors,[]);proof.passed=true;
}catch(error){proof.failure=String(error).replace(/\u001b\[[0-9;]*m/g,'').replace(/\b(?:cookie|authorization):[^\r\n]*/gi,'credential header: [REDACTED]');process.exitCode=1;}
finally{proof.finishedAt=new Date().toISOString();writeFileSync(root+'/'+prefix+'-public.json',JSON.stringify(proof,null,2));writeFileSync(out+'/'+prefix+'-public.json',JSON.stringify(proof,null,2));console.log(JSON.stringify({passed:proof.passed,checks:proof.checks,taskId:proof.taskId,registerElapsedMs:proof.registerElapsedMs,finalTask:proof.finalTask,failure:proof.failure}));await browser.close();}
