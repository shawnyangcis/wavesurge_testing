import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root='.gstack/qa-reports/retest-2026-10-10-r4',base='http://127.0.0.1:3593';
const password=execFileSync('docker',['compose','-p','creator-studio-retest-r4-edge','-f','compose.yaml','-f','tests/fixtures/qa-compose.yaml','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}}),out={at:new Date().toISOString(),checks:[]};
const get=async p=>(await page.request.get(base+p)).json();
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const before=await get('/api/state'),debugBefore=await get('/api/debug'),backupBefore=await get('/api/backup');
 expect(backupBefore.batches.length).toBeGreaterThan(2);out.before={messages:before.messages.length,tasks:before.tasks.length,batches:backupBefore.batches.length,checkpoint:backupBefore.checkpoint};
 await page.getByRole('button',{name:'设置与记录',exact:true}).click();{await page.getByRole('button',{name:'压缩旧消息',exact:true}).click();await expect(page.getByRole('status')).toHaveText('操作已完成。',{timeout:150000});}
 const after=await get('/api/state'),debugAfter=await get('/api/debug'),backupAfter=await get('/api/backup');
 expect(after.messages).toEqual(before.messages);expect(after.tasks).toEqual(before.tasks);expect(debugAfter.waveCalls.length).toBe(debugBefore.waveCalls.length);expect(backupAfter.checkpoint.text.length).toBeGreaterThan(20);const boundary=backupAfter.batches.findIndex(b=>b.id===backupAfter.checkpoint.until),latestUser=backupAfter.batches.findLastIndex(b=>b.messages.some(m=>m.role==='user'));expect(boundary).toBeGreaterThanOrEqual(0);expect(boundary).toBeLessThan(latestUser);
 out.after={messages:after.messages.length,tasks:after.tasks.length,batches:backupAfter.batches.length,checkpoint:backupAfter.checkpoint};out.modelCall=debugAfter.calls.filter(c=>c.kind==='compression').at(-1);out.newCompressionCalls=debugAfter.calls.filter(c=>c.kind==='compression').length-debugBefore.calls.filter(c=>c.kind==='compression').length;out.checks=['Actual browser compression created a nonempty checkpoint using configured model','Visible transcript and tasks retained','Latest user and answer remain outside compression boundary','No discovery tools replayed'];
 await page.screenshot({path:root+'/screenshots/compression-populated.png',fullPage:false});await page.getByRole('button',{name:'关闭',exact:true}).click();await page.reload();const final=await get('/api/backup');expect(final.checkpoint).toEqual(backupAfter.checkpoint);out.checks.push('Checkpoint persisted after page reload');out.finishedAt=new Date().toISOString();
}catch(e){out.error=String(e);throw e}finally{writeFileSync(root+'/compression-populated.json',JSON.stringify(out,null,2));console.log(JSON.stringify({checks:out.checks,error:out.error,summary:out.after?.checkpoint?.text}));await browser.close()}
