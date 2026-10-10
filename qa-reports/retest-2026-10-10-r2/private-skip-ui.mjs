import {chromium,expect} from '@playwright/test';import{execFileSync}from'node:child_process';import{writeFileSync}from'node:fs';
const root='.gstack/qa-reports/retest-2026-10-10-r2',base='http://127.0.0.1:3552',target='research-90121727019a7e5d682f5a65';
const password=execFileSync('docker',['compose','-p','creator-studio-retest-r2-live','-f','compose.yaml','-f',root+'/live-compose.yaml','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}}),out={at:new Date().toISOString(),assists:[],source:'Actual application UI. Operator outcomes only skip inaccessible private profiles; no login, follows or desktop input.'};
const get=async p=>(await page.request.get(base+p)).json(),save=()=>writeFileSync(root+'/private-skip-ui.json',JSON.stringify(out,null,2));
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const until=Date.now()+900000;
 while(Date.now()<until){
  const state=await get('/api/state'),task=state.tasks.find(t=>t.id===target);out.latestTask=task;save();
  if(['completed','partial','failed','cancelled'].includes(task.status)){out.terminal=true;break}
  const request=(await get('/api/desktop')).request;
  if(request){
   if(request.taskId!==target || !/私密|private/i.test(request.reason)){out.requiresObservedPublicInteraction={creatorId:request.creatorId,reason:request.reason};break}
   await page.getByRole('button',{name:'浏览器桌面',exact:true}).click();const dialog=page.getByRole('dialog',{name:'浏览器桌面'});await expect(dialog).toContainText(request.creatorId,{timeout:45000});
   const before=await dialog.innerText();await page.screenshot({path:root+'/screenshots/private-skip-'+out.assists.length+'-before.png',fullPage:true});
   if(await dialog.getByRole('button',{name:'接管并协助'}).count())await dialog.getByRole('button',{name:'接管并协助'}).click();
   await page.getByLabel('协助结果').fill('该账号私密，未取得可用公开内容。本轮跳过当前候选，未登录、未关注、未请求访问，也未操作桌面。只使用已有公开文字，其余保持 unknown；继续完成整批。');
   await page.getByRole('button',{name:'完成协助，交还 Agent'}).click();
   await expect(page.getByRole('button',{name:'完成协助，交还 Agent'})).toHaveCount(0,{timeout:45000});
   out.assists.push({id:request.id,creatorId:request.creatorId,reason:request.reason,before,outcome:'Skipped unavailable private content through UI without desktop interaction',finishedAt:new Date().toISOString()});save();console.log(JSON.stringify({skipped:request.creatorId,at:new Date().toISOString()}));
   await page.getByRole('button',{name:'关闭',exact:true}).click();
  }
  await page.waitForTimeout(3000);
 }
 out.finishedAt=new Date().toISOString();out.reportLinks=await page.getByLabel('研究对话').locator('a[href*="'+target+'"]').evaluateAll(es=>es.map(e=>({label:e.textContent,href:e.getAttribute('href')})));await page.screenshot({path:root+'/screenshots/original20-after-assistance.png',fullPage:true});save();console.log(JSON.stringify({task:out.latestTask,terminal:out.terminal,next:out.requiresObservedPublicInteraction,assists:out.assists.length}));
}catch(e){out.error=String(e);save();throw e}finally{await browser.close()}
