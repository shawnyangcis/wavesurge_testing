import { chromium } from 'playwright';
import { installations, login } from './preflight.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true});const proof=[];
try{
 for(const installation of installations){
  const {password,get}=await login(installation);const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Shanghai'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(installation.url);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.locator('.message.user time').last().waitFor();await page.locator('.message.user time').last().scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/chat-prompts/${installation.name}-visible-time.png`});
  await page.setViewportSize({width:390,height:844});await page.locator('.message.user time').last().scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/chat-prompts/${installation.name}-mobile-time.png`});
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(horizontal,false);
  await page.setViewportSize({width:1440,height:1050});await page.getByRole('button',{name:'设置',exact:true}).click();const dialog=page.getByRole('dialog',{name:'工作室设置'});await dialog.getByLabel('载入备份').scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/chat-prompts/${installation.name}-settings-bottom.png`});assert.equal(await dialog.getByText('实际调用与上下文',{exact:true}).count(),0);await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  const state=await get('/api/state');assert.equal(state.active,false);assert.equal(state.tasks.filter(t=>['queued','running','needs_input'].includes(t.status)).length,0);assert.equal(state.messages.filter(m=>m.epoch===state.epoch&&m.role==='user'&&m.state==='pending').length,0);assert.deepEqual(errors,[]);
  proof.push({name:installation.name,healthy:true,idle:true,mobileNoHorizontalOverflow:true,visibleTimestamp:await page.locator('.message.user time').last().innerText(),pageErrors:errors,messages:state.messages.length,tasks:state.tasks.length});await context.close();
 }
 writeFileSync('validation/2026-10-11/chat-prompts/final-ui.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
}finally{await browser.close();}
