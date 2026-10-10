import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const root = '.gstack/qa-reports/full-e2e-2026-10-10';
const base = 'http://127.0.0.1:3000';
const ids = ['research-d22f5bc3f9c80da1a4979ca5','research-a183b9437d676713c0f2812f','research-fd88375f69e716ff5cbc9fef','research-b30bacd90e74569b33e06bfc'];
const password = execFileSync('docker', ['compose','exec','-T','app','cat','/app/data/admin-bootstrap.txt'], { encoding:'utf8' }).trim();
const browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true });
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(base);
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button',{name:/进入工作室/}).click();
  await page.getByLabel('研究对话').waitFor();
  const get = async path => (await page.request.get(base+path)).json();
  const state = await get('/api/state');
  const debug = await get('/api/debug');
  const tasks = state.tasks.filter(t=>ids.includes(t.id));
  const latestPolls = tasks.map(t=>({taskId:t.id,call:debug.waveCalls.filter(c=>c.method==='GET'&&c.path.includes(t.remoteId)).at(-1)}));
  const campaigns = [];
  for (const id of ['campaign-6387a520f8156f12d92c6f50','campaign-bb62e1767e97593d5e070a7d']) {
    const p = await get('/api/campaigns/'+id);
    campaigns.push({id:p.id,title:p.title,revision:p.revision,status:p.status,requested:p.requested,matched:p.matched,evaluated:p.evaluated,qualifyingUnique:p.qualifyingUnique,childTaskIds:p.childTaskIds});
  }
  await page.locator('aside').screenshot({path:root+'/screenshots/main-current-status.png'});
  const snapshot = {observedAt:new Date().toISOString(),source:'actual production browser and authenticated API; no candidate injection',tasks,campaigns,latestPolls,results:await get('/api/results?taskId=research-a183b9437d676713c0f2812f')};
  writeFileSync(root+'/main-status.json',JSON.stringify(snapshot,null,2));
  console.log(JSON.stringify({observedAt:snapshot.observedAt,tasks:tasks.map(t=>({id:t.id,status:t.status,remoteStatus:t.remoteStatus,detail:t.detail,evaluated:t.evaluated,matched:t.matched})),polls:latestPolls.map(p=>({taskId:p.taskId,status:p.call?.status,response:p.call?.response}))},null,2));
} finally {await browser.close();}
