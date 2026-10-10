import{chromium}from'playwright';
import{execFileSync}from'node:child_process';
import{existsSync,readFileSync,writeFileSync}from'node:fs';
const root='.gstack/qa-reports/tagging-2026-10-10';const base='http://127.0.0.1:3300';
const password=execFileSync('docker',['compose','-p','creator-studio-review-e2e','-f','compose.yaml','-f','.gstack/qa-reports/full-e2e-2026-10-10/compose.override.yaml','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const out={startedAt:new Date().toISOString(),source:'Actual app assistance UI and noVNC; public Instagram popup handling only'};
const save=()=>writeFileSync(root+'/mixed-assistance.json',JSON.stringify(out,null,2));
try{
 await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 out.request=(await(await page.request.get(base+'/api/desktop')).json()).request;if(!out.request)throw Error('No pending assistance');
 await page.getByRole('button',{name:'浏览器桌面',exact:true}).click();await page.getByRole('button',{name:'接管并协助',exact:true}).click();
 const frame=page.frameLocator('iframe[title="持久浏览器桌面"]');const canvas=frame.locator('#noVNC_container canvas');await canvas.waitFor();await frame.locator('#noVNC_status').filter({hasText:/Connected|connected|已连接/}).waitFor();await page.waitForTimeout(1500);
 await canvas.screenshot({path:root+'/screenshots/mixed-instagram-before.png'});out.canvas=await canvas.boundingBox();out.phase='awaiting_observed_action';save();console.log(JSON.stringify({phase:out.phase,canvas:out.canvas,reason:out.request.reason}));
 const end=Date.now()+180000;while(!existsSync(root+'/mixed-assistance-action.json')){if(Date.now()>end)throw Error('No observed operator action supplied');await page.waitForTimeout(1000);}
 const action=JSON.parse(readFileSync(root+'/mixed-assistance-action.json','utf8'));out.action=action;
 for(const p of action.clicks??[]){const box=await canvas.boundingBox();await canvas.click({position:{x:box.width*p.xFraction,y:box.height*p.yFraction}});await page.waitForTimeout(1000);}
 await canvas.screenshot({path:root+'/screenshots/mixed-instagram-after.png'});
 await page.getByLabel('协助结果').fill(action.outcome);await page.getByRole('button',{name:'完成协助，交还 Agent',exact:true}).click();out.phase='released';out.finishedAt=new Date().toISOString();save();console.log('Released original candidate for fresh observation');
}catch(error){out.error=String(error);save();throw error;}finally{await browser.close();}
