import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const root = '.gstack/qa-reports/retest-2026-10-10-r3';
const [scope, name, actionFile, frameMode] = process.argv.slice(2);
const comp = scope === 'main' ? ['compose'] : ['compose','-p','creator-studio-retest-r3-live','-f','compose.yaml','-f',root+'/live-compose.yaml'];
const base = scope === 'main' ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:3572';
const password = execFileSync('docker',[...comp,'exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1050}}), page = await context.newPage();
const out = {at:new Date().toISOString(), scope, actions:[]};
const save = () => writeFileSync(root+'/'+name+'.json',JSON.stringify(out,null,2));
try {
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000}); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button',{name:/进入工作室/}).click();
  await page.getByRole('button',{name:'浏览器桌面',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'浏览器桌面'});
  await expect(dialog).toContainText('原候选');
  out.before = await dialog.innerText();
  if(frameMode !== 'no-frame') await expect(page.frameLocator('iframe[title="持久浏览器桌面"]').locator('html')).toHaveClass(/noVNC_connected/,{timeout:60000});
  if(await page.getByRole('button',{name:'接管并协助'}).count()) {
    await page.getByRole('button',{name:'接管并协助'}).click(); out.actions.push('Claimed assistance through UI');
  } else {
    await page.getByRole('button',{name:'重新连接桌面'}).click(); out.actions.push('Reconnected existing human control through UI');
  }
  const frame = page.frameLocator('iframe[title="持久浏览器桌面"]'), canvas = frame.locator('#noVNC_container canvas');
  if(frameMode !== 'no-frame') {
  await expect(frame.locator('html')).toHaveClass(/noVNC_connected/,{timeout:60000});
  await expect(async()=>{
    const painted = await canvas.evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<d.length;i+=80)if(d[i]+d[i+1]+d[i+2]>60)count++;return count>(d.length/80)*.03;});
    expect(painted).toBeTruthy();
  }).toPass({timeout:30000});
  await canvas.scrollIntoViewIfNeeded();
  out.rect = await canvas.boundingBox();
  } else out.actions.push('Only released a skip outcome; no desktop interaction');
  out.claimed = await dialog.innerText();
  await page.screenshot({path:root+'/screenshots/'+name+'-before.png',fullPage:true});
  save(); console.log(JSON.stringify({scope,name,rect:out.rect,dialog:out.claimed,waitingForAction:actionFile}));
  const until = Date.now()+240000;
  while(!existsSync(actionFile) && Date.now()<until) await new Promise(r=>setTimeout(r,500));
  if(!existsSync(actionFile)) throw Error('No observed action supplied; assistance remains claimed');
  const action = JSON.parse(readFileSync(actionFile,'utf8'));
  if(action.click) {
    if(frameMode === 'no-frame') throw Error('Desktop click requires a current observed frame');
    const b = await canvas.boundingBox();
    await page.mouse.click(b.x+b.width*action.click.x,b.y+b.height*action.click.y);
    out.actions.push({click:action.click}); await page.waitForTimeout(1800);
    await page.screenshot({path:root+'/screenshots/'+name+'-after-click.png',fullPage:true});
  }
  await page.getByLabel('协助结果').fill(action.outcome);
  await page.getByRole('button',{name:'完成协助，交还 Agent'}).click();
  await expect(page.getByRole('button',{name:'完成协助，交还 Agent'})).toHaveCount(0,{timeout:30000});
  out.actions.push({released:action.outcome}); out.after = await dialog.innerText(); out.finishedAt=new Date().toISOString();
  await page.screenshot({path:root+'/screenshots/'+name+'-released.png',fullPage:true}); save();
  await page.getByRole('button',{name:'关闭',exact:true}).click(); console.log(JSON.stringify({name,finishedAt:out.finishedAt,actions:out.actions}));
} catch(error) {out.error=String(error);try{out.frameClass=await page.frameLocator('iframe[title=\"持久浏览器桌面\"]').locator('html').getAttribute('class');await page.screenshot({path:root+'/screenshots/'+name+'-error.png',fullPage:true});}catch{}save();throw error;}
finally {await browser.close();}
