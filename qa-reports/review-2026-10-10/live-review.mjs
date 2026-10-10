import {chromium} from 'playwright';import {execFileSync} from 'node:child_process';import {writeFileSync} from 'node:fs';
const dir='.gstack/qa-reports/review-2026-10-10'; const password=execFileSync('docker',['compose','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});const base='http://127.0.0.1:3000';const api=async path=>(await page.request.get(base+path)).json();const output={};
const persist=()=>writeFileSync(dir+'/live-review.json',JSON.stringify(output,null,2));
try{
await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
output.baseline=await api('/api/state');output.originalReply=output.baseline.messages.at(-1);persist();
const waitIdle=async()=>{const deadline=Date.now()+150000;while(Date.now()<deadline){const state=await api('/api/state');if(!state.active&&!state.messages.some(m=>m.epoch===state.epoch&&m.state==='pending'))return state;await new Promise(r=>setTimeout(r,1500));}throw Error('chat timed out');};
const send=async(text,name)=>{const before=(await api('/api/state')).messages.length;await page.getByRole('textbox',{name:'发送消息'}).fill(text);await page.getByRole('button',{name:'发送消息'}).click();const state=await waitIdle();output[name]={input:text,messages:state.messages.slice(before),tasks:state.tasks};persist();await page.screenshot({path:dir+'/screenshots/'+name+'.png',fullPage:true});console.log(name+': '+state.messages.at(-1).text);return state;};
await send('回复本次 review 原句的澄清：欧美指创作者本人所在地，美国、加拿大、英国、德国、法国；geek风和戴眼镜都是必选视觉条件，接受你给出的定义；保留本人明确公开自述白人这个必选条件；KOC 指普通消费者创作者，不能仅凭粉丝数把机构号或明星当 KOC。人数仍20。先把所有条件保存为一组的筛选方案草案，候选上限40，命名“Review原题条件保真测试”，不要启动搜索。','original-plan');
output.originalPlan=(await api('/api/campaigns')).filter(c=>c.title.includes('Review原题条件保真测试'));for(const c of output.originalPlan)c.detail=await api('/api/campaigns/'+c.id);persist();
await send('这一条是独立的小规模真实筛选验证，不沿用上一条的条件：现在帮我找1位 Instagram 科技内容创作者，创作者本人所在地是美国或加拿大，粉丝1万到10万。分享科技内容是必选文字条件，没有视觉条件和族裔条件，不要求邮箱，最多核验2个候选，可以直接开始免费检索，不联系任何人。任务名“Review独立真实筛选”。','live-search');
const state=await api('/api/state');output.newTaskIds=state.tasks.filter(t=>!output.baseline.tasks.some(old=>old.id===t.id)).map(t=>t.id);persist();
await send('现在只讨论另一个独立 campaign：我们做了一款面向大学生的 AI 笔记应用，希望提升课堂笔记和考试复习场景的试用率。请与我交互确定适合的不同类型创作者，先不要开始筛选，也不要沿用科技账号搜索的范围。','campaign-goal');
await send('补充：目标受众是美国大学生，英语内容，平台 YouTube，创作者所在地美国，粉丝1万到10万；共2人，每个类型1人，每类最多2个候选。请由你根据课堂笔记和考试复习目标提出两个互补类型及理由，只用公开内容判断，不推断学生身份。把方案保存为“Review自然目标规划”，不要启动搜索。','campaign-draft');
output.campaignPlan=(await api('/api/campaigns')).filter(c=>c.title.includes('Review自然目标规划'));for(const c of output.campaignPlan)c.detail=await api('/api/campaigns/'+c.id);output.latest=await api('/api/state');
const debug=await api('/api/debug');output.newWaveCalls=debug.waveCalls.filter(c=>output.newTaskIds.includes(c.request?.requestId));persist();
console.log(JSON.stringify({newTaskIds:output.newTaskIds,originalPlan:output.originalPlan.map(p=>({id:p.id,status:p.status,criteria:p.detail.groups[0].spec.criteria})),campaignPlan:output.campaignPlan.map(p=>({id:p.id,status:p.status,groups:p.detail.groups.map(g=>({title:g.spec.title,rationale:g.rationale}))}))},null,2));
}finally{await browser.close();}
