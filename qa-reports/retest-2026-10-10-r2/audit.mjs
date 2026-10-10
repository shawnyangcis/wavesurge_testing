import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
const root='.gstack/qa-reports/retest-2026-10-10-r2';
const [scope='live',name='audit']=process.argv.slice(2);
const base=scope==='edge'?'http://127.0.0.1:3553':scope==='main'?'http://127.0.0.1:3000':'http://127.0.0.1:3552';
const comp=scope==='edge'?['compose','-p','creator-studio-retest-r2-edge','-f','compose.yaml','-f','tests/fixtures/qa-compose.yaml']:scope==='main'?['compose']:['compose','-p','creator-studio-retest-r2-live','-f','compose.yaml','-f',root+'/live-compose.yaml'];
const password=execFileSync('docker',[...comp,'exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const get=async path=>await(await page.request.get(base+path)).json();
 const state=await get('/api/state'),debug=await get('/api/debug'),results=await get('/api/results'),campaigns=await get('/api/campaigns');
 const trimCall=c=>({id:c.id,kind:c.kind,createdAt:c.createdAt,finishedAt:c.finishedAt,error:c.error,model:c.request?.model,toolNames:c.request?.tools?.map(t=>t.function.name),imageCount:c.request?.messages?.flatMap(m=>Array.isArray(m.content)?m.content:[]).filter(x=>x.type==='image_url').length,response:c.response?.choices?.[0]?.message});
 const out={at:new Date().toISOString(),scope,state,campaigns,results:results.map(r=>({...r,creator:{...r.creator,raw:undefined}})),calls:debug.calls.map(trimCall),waveCalls:debug.waveCalls.map(c=>({id:c.id,path:c.path,method:c.method,status:c.status,error:c.error,createdAt:c.createdAt,finishedAt:c.finishedAt})),toolReceipts:debug.toolReceipts,errors,reportLinks:await page.getByLabel('研究对话').locator('a[href*="/api/reports/"]').evaluateAll(es=>es.map(e=>({label:e.textContent,href:e.getAttribute('href')}))),buttons:await page.getByRole('button').allTextContents()};
 await page.screenshot({path:root+'/screenshots/'+name+'.png',fullPage:true});
 writeFileSync(root+'/'+name+'.json',JSON.stringify(out,null,2));
 console.log(JSON.stringify({at:out.at,active:state.active,tasks:state.tasks,messages:state.messages.slice(-4).map(m=>({role:m.role,text:m.text,state:m.state})),resultCount:results.length,callCount:debug.calls.length,lastCall:out.calls.slice(-2),wave:out.waveCalls.slice(-6),buttons:out.buttons,errors},null,2));
}finally{await browser.close()}
