import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
export const root='.gstack/qa-reports/final-2026-10-11-r5';
export async function connect(scope='live') {
 const base=`http://127.0.0.1:${scope==='main'?3000:scope==='edge'?3613:3612}`;
 const comp=scope==='main'?['compose']:['compose','-p',`creator-studio-final-r5-${scope}`,'-f','compose.yaml','-f',`${root}/${scope==='edge'?'edge':'live'}-compose.yaml`];
 const docker=(...args)=>execFileSync('docker',[...comp,...args],{encoding:'utf8',maxBuffer:128*1024*1024});
 const db=code=>JSON.parse(docker('exec','-T','app','node','--input-type=module','-e',`import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');${code};s.close();`));
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Shanghai',acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByLabel('管理员密码').fill(docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt').trim());await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const get=async path=>{const response=await page.request.get(base+path);expect(response.ok()).toBe(true);return response.json()};const state=()=>get('/api/state');
 const idle=()=>expect.poll(async()=>{const s=await state();return !s.active&&!s.messages.some(m=>m.role==='user'&&m.epoch===s.epoch&&m.state==='pending')},{timeout:240000,intervals:[1000]}).toBe(true);
 const send=async text=>{await idle();const response=page.waitForResponse(r=>r.url()===base+'/api/messages'&&r.request().method()==='POST');await page.getByRole('textbox',{name:'发送消息'}).fill(text);await page.getByRole('button',{name:'发送消息',exact:true}).click();const r=await response;expect(r.status()).toBe(201);const message=await r.json();await idle();return message;};
 const waitTasks=ids=>expect.poll(async()=>{const s=await state();const rows=s.tasks.filter(t=>ids.includes(t.id));if(rows.some(t=>t.status==='needs_input'))throw Error('Human scenario excluded; no takeover attempted');return rows.length===ids.length&&rows.every(t=>['completed','partial','failed','cancelled'].includes(t.status))},{timeout:900000,intervals:[1500]}).toBe(true);
 const notices=(after,before)=>after.messages.filter(m=>m.id.startsWith('report-')&&!before.messages.some(o=>o.id===m.id));
 const shot=name=>page.screenshot({path:`${root}/screenshots/${name}.png`,fullPage:true});
 return {scope,base,comp,docker,db,browser,context,page,errors,get,state,idle,send,waitTasks,notices,shot};
}
export const save=(name,value)=>writeFileSync(`${root}/${name}.json`,JSON.stringify(value,null,2));
export {expect};
