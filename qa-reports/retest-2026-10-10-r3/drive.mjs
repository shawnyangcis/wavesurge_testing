import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = '.gstack/qa-reports/retest-2026-10-10-r3';
const [scope, caseName, inputFile] = process.argv.slice(2);
const isolated = scope !== 'main';
const base = scope === 'edge' ? 'http://127.0.0.1:3573' : isolated ? 'http://127.0.0.1:3572' : 'http://127.0.0.1:3000';
const compose = scope === 'edge' ? ['compose','-p','creator-studio-retest-r3-edge','-f','compose.yaml','-f','tests/fixtures/qa-compose.yaml'] : isolated ? ['compose','-p','creator-studio-retest-r3-live','-f','compose.yaml','-f','.gstack/qa-reports/retest-2026-10-10-r3/live-compose.yaml'] : ['compose'];
const password = execFileSync('docker', [...compose,'exec','-T','app','cat','/app/data/admin-bootstrap.txt'], {encoding:'utf8'}).trim();
const input = readFileSync(inputFile,'utf8').trim();
mkdirSync(root + '/screenshots', {recursive:true});
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1050}});
const page = await context.newPage();
const get = async path => (await page.request.get(base + path)).json();
const briefResults = results => results.map(r => ({id:r.id,taskId:r.taskId,handle:r.creator.handle,displayName:r.creator.displayName,platform:r.creator.platform,tags:r.tags,verdict:r.verdict,selected:r.selected,revision:r.revision,annotations:r.annotations,followers:r.creator.followers,region:r.creator.region,facts:r.creator.facts,engagement:r.creator.engagement,photoUrls:r.creator.photoUrls,judgments:r.judgments,evidence:r.creator.evidence.map(e=>({id:e.id,url:e.url,kind:e.kind,text:e.text.slice(0,900),assetId:e.assetId}))}));
const output = {caseName,base,startedAt:new Date().toISOString(),source:scope === 'edge' ? 'Actual application UI and configured real model/headed browser; explicit controlled Wave and candidate fixtures' : 'Actual application UI; configured real model and WaveSurge API; no seeded candidates or modified prompts',input};
const save = () => writeFileSync(root + '/' + caseName + '.json', JSON.stringify(output,null,2));
try {
  await page.goto(base);
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button',{name:/进入工作室/}).click();
  await page.getByLabel('研究对话').waitFor();
  const before = await get('/api/state');
  if(before.active || before.messages.some(m=>m.epoch===before.epoch&&m.role==='user'&&m.state==='pending')) throw Error('Another chat turn is active; did not send');
  output.before = {tasks:before.tasks,results:briefResults(await get('/api/results'))};
  await page.getByRole('textbox',{name:'发送消息'}).fill(input);
  await page.getByRole('button',{name:'发送消息',exact:true}).click();
  console.log('Submitted through browser UI: ' + caseName);
  const until = Date.now() + 180000;
  let after;
  while(Date.now()<until) {
    after = await get('/api/state');
    const message = after.messages.filter(m=>!before.messages.some(p=>p.id===m.id)).find(m=>m.role==='user'&&m.text===input);
    if(message?.state==='delivered' && !after.active && after.messages.some(m=>m.role==='assistant'&&m.createdAt>=message.createdAt)) break;
    await new Promise(r=>setTimeout(r,1000));
  }
  output.finishedAt=new Date().toISOString();
  output.active=after.active;
  output.messages=after.messages.filter(m=>!before.messages.some(p=>p.id===m.id)).map(m=>({id:m.id,role:m.role,text:m.text,state:m.state,createdAt:m.createdAt,attachmentCount:m.attachments.length}));
  output.tasks=after.tasks;
  output.results=briefResults(await get('/api/results'));
  const debug=await get('/api/debug');
  output.modelCalls=debug.calls.filter(c=>c.createdAt>=Date.parse(output.startedAt)).map(c=>({id:c.id,kind:c.kind,createdAt:c.createdAt,finishedAt:c.finishedAt,error:c.error,model:c.request.model,toolNames:c.request.tools?.map(t=>t.function.name),response:c.response?.choices?.[0]?.message}));
  output.toolReceipts=debug.toolReceipts.filter(r=>output.modelCalls.some(c=>c.response?.tool_calls?.some(t=>t.id===r.call?.id))).map(r=>({call:r.call,message:r.message}));
  output.waveCalls=debug.waveCalls.filter(c=>c.createdAt>=Date.parse(output.startedAt)).map(c=>({id:c.id,path:c.path,method:c.method,status:c.status,createdAt:c.createdAt,finishedAt:c.finishedAt,error:c.error}));
  output.chatReportLinks=await page.getByLabel('研究对话').locator('a[href*="/api/reports/"], a[href*="/api/work-batches/"]').evaluateAll(es=>es.map(e=>({text:e.textContent,href:e.getAttribute('href')})));
  await page.getByLabel('研究对话').screenshot({path:root+'/screenshots/'+caseName+'-chat.png'});
  await page.locator('aside').screenshot({path:root+'/screenshots/'+caseName+'-tasks.png'});
  save();
  console.log(JSON.stringify({caseName,messages:output.messages.map(m=>({role:m.role,text:m.text})),newTasks:after.tasks.filter(t=>!before.tasks.some(p=>p.id===t.id)),tools:output.modelCalls.flatMap(c=>c.response?.tool_calls?.map(t=>t.function.name)??[]),chatReportLinks:output.chatReportLinks},null,2));
} catch(error) {output.error=String(error);save();throw error;}
finally {await browser.close();}
