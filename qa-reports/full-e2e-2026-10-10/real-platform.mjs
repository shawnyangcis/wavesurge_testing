import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const root='.gstack/qa-reports/full-e2e-2026-10-10';
const compose=['compose','-p','creator-studio-review-e2e','-f','compose.yaml','-f',root+'/compose.override.yaml'];
const docker=(...args)=>execFileSync('docker',[...compose,...args],{encoding:'utf8'});
const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt').trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const output={startedAt:new Date().toISOString(),source:'historical genuine WaveSurge candidate replay, actual Instagram live page, actual configured LLM and noVNC; not new discovery'};
const save=()=>writeFileSync(root+'/real-platform.json',JSON.stringify(output,null,2));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,timeout=180000)=>{const until=Date.now()+timeout;while(Date.now()<until){const r=await fn();if(r)return r;await delay(1500);}throw Error('wait timeout');};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const base='http://127.0.0.1:3300';const get=async p=>(await page.request.get(base+p)).json();
 await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 docker('cp',root+'/cases/seed-real-task.ts','app:/app/data/fixtures/seed-real-task.ts');docker('cp',root+'/real-candidate-replay.json','app:/app/data/fixtures/real-candidate-replay.json');
 const taskId=docker('exec','-T','app','node','data/fixtures/seed-real-task.ts',String(Date.now()));output.taskId=taskId;save();
 const task=async()=>(await get('/api/state')).tasks.find(t=>t.id===taskId);
 const ready=await wait(async()=>{const t=await task();return ['completed','partial','needs_input','failed'].includes(t?.status)?t:false;});output.before=ready;save();
 if(ready.status==='needs_input'){
  output.assistance=(await get('/api/desktop')).request;
  await page.locator('.task').filter({has:page.getByRole('heading',{name:ready.title,exact:true})}).getByRole('button',{name:'打开桌面协助'}).click();await page.getByRole('button',{name:'接管并协助'}).click();
  const frame=page.frameLocator('iframe[title="持久浏览器桌面"]');const canvas=frame.locator('#noVNC_container canvas');await canvas.waitFor();await frame.locator('#noVNC_status').filter({hasText:/Connected|connected|已连接/}).waitFor();
  await delay(2000);await page.screenshot({path:root+'/screenshots/real-instagram-before.png',fullPage:true});output.phase='needs_test_operator_action';save();console.log('Real Instagram screenshot ready; awaiting local test operator actions');
  await wait(()=>existsSync(root+'/real-platform-action.json'),120000);
  const action=JSON.parse(readFileSync(root+'/real-platform-action.json','utf8'));const box=await canvas.boundingBox();for(const p of action.clicks??[]){await canvas.click({position:{x:box.width*p.x/1440,y:box.height*p.y/900}});await delay(1200);}
  await page.screenshot({path:root+'/screenshots/real-instagram-after.png',fullPage:true});
  await page.getByLabel('协助结果').fill(action.outcome);await page.getByRole('button',{name:'完成协助，交还 Agent'}).click();
  await wait(async()=>['completed','partial','failed'].includes((await task()).status));
  await page.getByRole('button',{name:'关闭',exact:true}).click();
 }
 output.task=await task();output.results=await get('/api/results?taskId='+taskId);output.phase='finished';
 const debug=await get('/api/debug');output.calls=debug.calls.filter(c=>c.kind==='browser-verification'&&c.request.messages.some(m=>typeof m.content==='string'&&m.content.includes(taskId)));
 await page.locator('.task').filter({has:page.getByRole('heading',{name:output.task.title,exact:true})}).getByRole('button',{name:'查看结果'}).click();await page.getByText('逐条件判断与证据').click();await page.screenshot({path:root+'/screenshots/real-instagram-result.png',fullPage:true});
 save();console.log(JSON.stringify({taskId,status:output.task.status,matched:output.task.matched,verdicts:output.results.map(r=>r.verdict),calls:output.calls.length}));
}catch(e){output.error=e.message;save();throw e;}finally{await browser.close();}
