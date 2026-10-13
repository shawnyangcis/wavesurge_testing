import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = 'http://101.201.237.219:33332';
const root = 'validation/2026-10-13/public-acceptance';
const title = process.env.PUBLIC_STRICT_TITLE ?? '公网新词验收：本人书卷形象与日常框架眼镜';
const queries = (process.env.PUBLIC_STRICT_QUERIES ?? 'booknerd,booklover,bibliophile,geeky').split(',');
const prefix = process.env.PUBLIC_CASE_PREFIX ?? 'strict';
const text = `请直接开始一项独立真实研究「${title}」，保留其他任务。本次用于验证可审核的完整交付，入选目标1人；不把它声称为原题20人的交付。Instagram，粉丝1万至10万，本人所在地欧美（美国、加拿大、英国、德国、法国、荷兰、比利时、爱尔兰、西班牙、意大利、葡萄牙、挪威、瑞典、芬兰、丹麦、瑞士、奥地利、波兰、捷克、希腊）。三个必选条件分别记录：1）本人真实公开画面呈现Geek或书卷形象，例如本人在书架前阅读、持书介绍、Geek穿搭或本人极客桌面使用场景，必须看到本人，不能把书本静物或科技内容主题当本人形象；2）本人实际公开画面佩戴日常框架眼镜，排除墨镜、护目镜、面罩、书封人物和他人；3）个人消费者KOC，有第一人称阅读或产品体验，排除品牌、商店、机构、活动官方、明星和纯搬运。画像记录内容方向和呈现风格；族裔仅记录本人公开自述，缺证unknown，不参与必选，不从外貌推断。用v3开放搜索关键词${queries.join("、")}；不指定账号，不预埋候选。逐人分析预算25，基础账号读取上限125；不加最近30天条件，每条证据说明WaveSurge提供的发表时间，截图采集时间分开。按这三个严格口径执行，不能降低条件凑数。本次测试只使用无需登录的公开资料，allowHumanAssistance=false；系统默认遇登录验证先确认并交接VNC的功能保持。结束在对话中交付报告及实际缺额，不付费、不外联。范围和开始均已授权，无需再次确认。`;
const password = execFileSync('docker', ['compose','exec','-T','app','cat','/app/data/admin-bootstrap.txt'], {encoding:'utf8'}).trim();
mkdirSync(root, {recursive:true}); mkdirSync('output/playwright/public-acceptance', {recursive:true});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH,headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1050},timezoneId:'Asia/Shanghai'});
const proof = {base,title,text,startedAt:new Date().toISOString()};
try {
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
  await page.getByLabel('管理员密码').fill(password); await page.getByRole('button',{name:/进入工作室/}).click();
  await page.getByLabel('研究对话').waitFor();
  proof.browser = await page.evaluate(()=>({isSecureContext,randomUUID:typeof crypto.randomUUID}));
  assert.equal(proof.browser.isSecureContext,false); assert.equal(proof.browser.randomUUID,'undefined');
  const get = async path => { const r=await page.request.get(base+path,{timeout:90000}); assert.equal(r.status(),200); return r.json(); };
  const before = await get('/api/state'); assert(!before.tasks.some(t=>t.title===title));
  proof.previousTaskIds=before.tasks.map(t=>t.id);
  await page.getByRole('textbox',{name:'发送消息'}).fill(text);
  const post = page.waitForResponse(r=>r.url()===base+'/api/messages'&&r.request().method()==='POST',{timeout:60000});
  await page.getByRole('button',{name:'发送消息',exact:true}).click(); const response=await post; assert.equal(response.status(),201);
  const posted=await response.json();proof.userId=posted.id;proof.requestCreatedAt=posted.createdAt;
  const started=Date.now(); let state,task;
  while(Date.now()-started<360000){state=await get('/api/state');task=state.tasks.find(t=>t.title===title);if(task)break;await new Promise(r=>setTimeout(r,3000));}
  assert(task,'自然语言请求没有登记研究'); proof.taskId=task.id; proof.registerElapsedMs=Date.now()-started; proof.registeredTask=task;
  // /api/state deliberately returns small task facts. Inspect the persisted
  // scope independently rather than expecting the public progress card to carry it.
  const readSpec=`import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');console.log(JSON.stringify(s.get('task',${JSON.stringify(task.id)}).spec));s.close();`;
  proof.spec=JSON.parse(execFileSync('docker',['compose','exec','-T','app','node','--input-type=module'],{input:readSpec,encoding:'utf8'}));
  assert.equal(proof.spec.count,1); assert.equal(proof.spec.verificationMode,'auto'); assert.equal(proof.spec.allowHumanAssistance,false);
  assert(!proof.spec.instagram.handles?.length); assert.deepEqual(proof.spec.instagram.queries,queries);
  assert.equal(proof.spec.criteria.filter(c=>c.required).length,3);
  await page.screenshot({path:'output/playwright/public-acceptance/'+prefix+'-case-registered.png'}); proof.passed=true;
} catch(error){proof.failure=String(error).replace(/\u001b\[[0-9;]*m/g,'').replace(/\b(?:cookie|authorization):[^\r\n]*/gi,'credential header: [REDACTED]');process.exitCode=1;}
finally{proof.finishedAt=new Date().toISOString();writeFileSync(root+'/'+prefix+'-request.json',JSON.stringify(proof,null,2));console.log(JSON.stringify({passed:proof.passed,taskId:proof.taskId,registerElapsedMs:proof.registerElapsedMs,browser:proof.browser,failure:proof.failure}));await browser.close();}
