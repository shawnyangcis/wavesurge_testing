import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as prompts from '../../../src/shared/prompts.ts';
import { installations, login } from './preflight.mjs';
const root='validation/2026-10-11/chat-prompts'; const screenshots='output/playwright/chat-prompts'; mkdirSync(screenshots,{recursive:true});
const installation=installations.find(i=>i.name===(process.argv[2]??'real')); const {password,get}=await login(installation);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Shanghai'}); const page=await context.newPage();
const outcome={name:installation.name,pageErrors:[],startedAt:new Date().toISOString(),scenarios:[]}; page.on('pageerror',error=>outcome.pageErrors.push(error.message));
const wait=async(predicate,timeout=210000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await predicate())return;await new Promise(r=>setTimeout(r,1200));}throw Error('Timed out waiting for actual state');};
const idle=()=>wait(async()=>{const s=await get('/api/state');return !s.active&&!s.messages.some(m=>m.epoch===s.epoch&&m.role==='user'&&m.state==='pending');});
const signIn=async(page)=>{await page.goto(installation.url);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();};
const send=async text=>{const before=await get('/api/state');await page.getByRole('textbox',{name:'发送消息'}).fill(text);await page.getByRole('button',{name:'发送消息',exact:true}).click();return before;};
const responses=(state,before)=>state.messages.filter(m=>m.role==='assistant'&&!before.messages.some(o=>o.id===m.id)).map(m=>m.text).join('\n');
async function verifyTimes(page,timeZone) {
 const state=await get('/api/state');await wait(async()=>await page.locator('.message time').count()===state.messages.length);
 const shown=await page.locator('.message time').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,iso:n.getAttribute('datetime')})));
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<state.messages.length;i++){const date=new Date(state.messages[i].createdAt);const parts=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));assert.equal(shown[i].text,`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`);assert.equal(shown[i].iso,date.toISOString());}
 assert(state.messages.some(m=>m.role==='user'));assert(state.messages.some(m=>m.role==='assistant'));assert(state.messages.some(m=>m.id.startsWith('report-')));
 return {timeZone,messages:shown.length,allRolesAndAutomaticReports:true,format:'YYYY-MM-DD HH:mm:ss',originalCreationTime:true};
}
try {
 await signIn(page);outcome.scenarios.push(await verifyTimes(page,'Asia/Shanghai'));await page.screenshot({path:`${screenshots}/${installation.name}-times.png`});
 const debugRequests=[];const observeRequest=request=>{if(new URL(request.url()).pathname==='/api/debug')debugRequests.push(request.url());};page.on('request',observeRequest);
 await page.getByRole('button',{name:'设置',exact:true}).click();const dialog=page.getByRole('dialog',{name:'工作室设置'});await dialog.getByLabel('系统提示词').waitFor();
 assert.equal(await dialog.getByText('实际调用与上下文',{exact:true}).count(),0);assert.equal(await dialog.getByRole('button',{name:'刷新记录'}).count(),0);
 for(const [label,field]of [['系统提示词','systemPrompt'],['工作流提示词','workflowPrompt'],['逐人核验提示词','verificationPrompt'],['压缩提示词','compressionPrompt']])assert.equal(await dialog.getByLabel(label).inputValue(),prompts[field]);
 await page.screenshot({path:`${screenshots}/${installation.name}-settings.png`});await dialog.getByRole('button',{name:'关闭',exact:true}).click();assert.deepEqual(debugRequests,[]);
 outcome.scenarios.push({settingsAuditSectionRemoved:true,noAuditRequest:true,allFourPromptsCurrent:true});
 const utcContext=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'UTC'});const utcPage=await utcContext.newPage();await signIn(utcPage);outcome.scenarios.push(await verifyTimes(utcPage,'UTC'));await utcContext.close();
 console.log(JSON.stringify({phase:'UI',name:installation.name,scenarios:outcome.scenarios}));
 if(installation.name==='real'){
  const original=await get('/api/state'),originalRows=await get('/api/results'),originalAudit=await get('/api/debug');
  const campaigns=await get('/api/campaigns');const campaign=campaigns.find(c=>c.childTaskIds?.length);assert(campaign);
  const full=await get(`/api/campaigns/${campaign.id}`);outcome.campaignExpected={records:full.results.length,qualifiedRecords:full.results.filter(r=>r.verdict==='match').length,unique:full.qualifyingUnique,selected:full.matched,groups:full.groups.map(g=>({id:g.id,title:g.spec.title,selected:g.matched,eligible:g.eligible}))};
  const query=`只查询已有 Campaign ${campaign.id}，请分别说明核验记录数、合格记录数、去重合格账号数与最终入选人数。逐组说明合格候选和最终入选，列出每位入选账号属于哪个组、为什么匹配。以当前最终分配为准，不新建任务、不搜索、不补标、不重新核验、不访问网页。`;
  const before=await send(query);await idle();const answer=responses(await get('/api/state'),before);for(const handle of ['tylerlcrawford','valstechtalkk'])assert(answer.includes(handle));assert(/合格/.test(answer)&&/入选/.test(answer));
  assert.deepEqual((await get('/api/state')).tasks,original.tasks);assert.equal((await get('/api/debug')).waveCalls.length,originalAudit.waveCalls.length);
  outcome.scenarios.push({name:'真实 Campaign 只读查询',query,response:answer,noNewTask:true,noNewWaveCall:true});
  console.log(JSON.stringify({phase:'real-query',passed:true}));
  const title=`提示词文字自测 ${Date.now()}`; const request=`请现在开始独立研究「${title}」：只分析 Instagram 精确账号 tylerlcrawford 和 valstechtalkk，两个都逐人分析并保存画像，实际入选配额1位，候选分析预算2位。不限地区与粉丝，不增加任何定性必选条件；内容方向仅作画像维度。请本次实际读取 WaveSurge 的本人简介和近期帖子，不复用之前的研究任务。采用文字核验，不打开浏览器，不进行付费搜索或外联，资料不足如实标为未知。`;
  const beforeResearch=await send(request);await wait(async()=> (await get('/api/state')).tasks.some(t=>t.title===title));const registered=(await get('/api/state')).tasks.find(t=>t.title===title);
  await send('刚才两个账号的研究继续执行，请告诉我现在真实进度；这只是状态查询，不取消、不新建、不重搜。');await idle();
  await wait(async()=>['completed','partial','failed','cancelled'].includes((await get('/api/state')).tasks.find(t=>t.id===registered.id)?.status));await idle();
  const final=(await get('/api/state')).tasks.find(t=>t.id===registered.id);assert.equal(final.status,'completed');assert.equal(final.qualifying,2);assert.equal(final.matched,1);assert.equal(final.evaluated,2);
  const rows=await get(`/api/results?taskId=${final.id}`);assert.equal(rows.length,2);assert.equal(rows.filter(r=>r.verdict==='match').length,2);assert.equal(rows.filter(r=>r.selected).length,1);assert(rows.every(r=>r.annotations?.length&&r.tags?.length));assert.equal((await get('/api/state')).tasks.length,original.tasks.length+1);
  const deliveries=(await get('/api/state')).messages.filter(m=>m.id.startsWith('report-')&&!original.messages.some(o=>o.id===m.id));assert.equal(deliveries.length,1);assert(deliveries[0].text.includes(`/api/reports/${final.id}`));
  const waveCalls=(await get('/api/debug')).waveCalls.filter(c=>!originalAudit.waveCalls.some(o=>o.id===c.id));assert(waveCalls.length>=6);assert(waveCalls.every(c=>c.method==='GET'&&c.status===200));assert(waveCalls.some(c=>c.path.startsWith('/instagram/v1/fetch_user_info_by_username_v2')));assert(waveCalls.some(c=>c.path.startsWith('/instagram/v1/fetch_user_posts')));
  const all=await get('/api/results');for(const old of originalRows)assert.deepEqual(all.find(r=>r.id===old.id),old);
  outcome.scenarios.push({name:'真实 API 精确账号文字研究与中途新消息',request,task:final,rows:rows.map(r=>({id:r.id,handle:r.creator.handle,followers:r.creator.followers,verdict:r.verdict,selected:r.selected,annotations:r.annotations})),response:responses(await get('/api/state'),beforeResearch),newWaveCalls:waveCalls.map(c=>({path:c.path,method:c.method,status:c.status})),newTasks:1,oneFinalDelivery:true,existingResultsPreserved:true});
  console.log(JSON.stringify({phase:'real-research',task:final.id,status:final.status,qualified:2,selected:1,realWaveCalls:waveCalls.length}));
  const capability='现在请直接使用 TikTok 的付费平台搜索，再自动联系创作者；如果当前工具没有这些执行能力，就明确说明，不要创建计划或任务，也不要声称已付费、已搜索或已联系。';const tasksBefore=(await get('/api/state')).tasks;const callsBefore=(await get('/api/debug')).waveCalls.length;const beforeCapability=await send(capability);await idle();const capabilityAnswer=responses(await get('/api/state'),beforeCapability);assert(/不支持|不能|无法|没有/.test(capabilityAnswer));assert.deepEqual((await get('/api/state')).tasks,tasksBefore);assert.equal((await get('/api/debug')).waveCalls.length,callsBefore);outcome.scenarios.push({name:'工具能力边界',request:capability,response:capabilityAnswer,noNewTask:true,noNewWaveCall:true});
  await page.getByRole('button',{name:'设置',exact:true}).click();await dialog.getByRole('button',{name:'压缩旧消息'}).click();await dialog.getByRole('status').waitFor({timeout:180000});outcome.compressionNotice=await dialog.getByRole('status').innerText();assert(!await dialog.getByRole('alert').count());await dialog.getByRole('button',{name:'关闭',exact:true}).click();assert.deepEqual(debugRequests,[]);
  const afterCompress=(await get('/api/state')).tasks;assert.deepEqual(afterCompress,tasksBefore);const beforeRequery=await send(`压缩后只查询刚才研究 ${final.id} 的实际结果，明确区分全部合格记录与按配额入选人数，不创建任务或搜索。`);await idle();outcome.postCompressionResponse=responses(await get('/api/state'),beforeRequery);assert(/合格/.test(outcome.postCompressionResponse)&&/入选/.test(outcome.postCompressionResponse));assert.deepEqual((await get('/api/state')).tasks,tasksBefore);assert.equal((await get('/api/debug')).waveCalls.length,callsBefore);
  const audit=await get('/api/debug');const newModelCalls=audit.calls.filter(c=>!originalAudit.calls.some(o=>o.id===c.id));assert(newModelCalls.some(c=>c.kind==='verification'));assert(newModelCalls.some(c=>c.kind==='compression'));
  for(const call of newModelCalls){const messages=call.request.messages;if(call.kind==='compression')assert.equal(messages[0].content,prompts.compressionPrompt);else{assert.equal(messages[0].content,prompts.systemPrompt);if(call.kind==='chat')assert.equal(messages[1].content,prompts.workflowPrompt);if(call.kind==='verification')assert.equal(messages[1].content,prompts.verificationPrompt);}}
  const origin=execOrigin(installation);assert.equal(origin,'https://wavesurge.ai/api/v1');outcome.actualAPISource=origin;outcome.newRealModelCalls=newModelCalls.length;outcome.newRealWaveCalls=waveCalls.length;
  outcome.scenarios.push({name:'真实模型压缩与恢复查询',historyPreserved:true,promptsUsedInActualCalls:true,newModelCalls:newModelCalls.map(c=>({kind:c.kind,revision:c.revision,tools:c.response?.choices?.[0]?.message?.tool_calls?.map(t=>t.function.name)??[]}))});
  outcome.scenarios.push(await verifyTimes(page,'Asia/Shanghai'));await page.screenshot({path:`${screenshots}/real-natural-response.png`});
 }
 assert.deepEqual(outcome.pageErrors,[]);outcome.passed=true;
}catch(error){outcome.failure=String(error);process.exitCode=1;await page.screenshot({path:`${screenshots}/${installation.name}-failure.png`}).catch(()=>{});
}finally{outcome.finishedAt=new Date().toISOString();writeFileSync(`${root}/${installation.name}-browser.json`,JSON.stringify(outcome,null,2));console.log(JSON.stringify({name:installation.name,passed:outcome.passed,failure:outcome.failure,pageErrors:outcome.pageErrors,newRealModelCalls:outcome.newRealModelCalls,newRealWaveCalls:outcome.newRealWaveCalls}));await browser.close();}
function execOrigin(installation){return execFileSync('docker',[...installation.compose,'exec','-T','app','node','--input-type=module','-e',"console.log(process.env.WAVESURGE_BASE_URL || 'https://wavesurge.ai/api/v1')"],{encoding:'utf8'}).trim();}
