import{readFileSync,writeFileSync}from'node:fs';
import{resolve,dirname}from'node:path';
const root='.gstack/qa-reports/tagging-2026-10-10';
for(const name of ['tagging-review.md','remaining-validation.md']){
 const file=resolve(root,name);let text=readFileSync(file,'utf8');
 text=text.replace(/\]\(([^)]+)\)/g,(full,target)=>target.startsWith('/')||/^[a-z]+:/i.test(target)?full:']('+resolve(dirname(file),target)+')');
 text=text.replace(/(\/src\/shared\/prompts\.ts)\)/g,'$1:9)').replace(/(\/src\/server\/browser-verifier\.ts)\)/g,'$1:14)').replace(/(\/src\/server\/research\.ts)\)/g,'$1:78)');
 writeFileSync(file,text);
}
const baselineFile='.gstack/qa-reports/review-2026-10-10/baseline.json';
const baseline=JSON.parse(readFileSync(baselineFile,'utf8'));
for(const issue of [{id:'F14',severity:'P1',title:'打标指令被当作标签值，画像标签丢失且检索误召回'},{id:'F15',severity:'P2',title:'搜索运行中已返回候选仍不开始本地核验'}])if(!baseline.issues.some(i=>i.id===issue.id))baseline.issues.push(issue);
baseline.checks.taggingReview={report:resolve(root,'tagging-review.md'),naturalRequests:6,realExistingAccountsReviewed:6,genreReplayAccounts:2,originalPartialReplayAccounts:1,businessCodeChanged:false,acceptance:'fail: label values not saved; missing retag tools and final chat delivery',newExternalSearches:'3 queued on isolated3400; original20 running with partial creator data, local evaluated0'};
baseline.checks.newExternalSearch='original20 running with partial creators; three new TikTok searches queued';
baseline.updatedAt=new Date().toISOString();
writeFileSync(baselineFile,JSON.stringify(baseline,null,2)+'\n');
const reportLink='[2026-10-10打标与自然对话复验]('+resolve(root,'tagging-review.md')+')';
const manualLink='[最新未完成与人工验收清单]('+resolve(root,'remaining-validation.md')+')';
const acceptanceFile='.gstack/qa-reports/full-e2e-2026-10-10/acceptance-report.md';
let acceptance=readFileSync(acceptanceFile,'utf8');
acceptance=acceptance.replace('原题20人搜索仍未取得候选。','此前10:30阶段原题20人尚无候选；后续已返回部分候选，但主应用仍0核验，详见下述打标复验。');
const marker='## 后续自然对话与打标复验';
if(!acceptance.includes(marker))acceptance+='\n'+marker+'\n\n'+reportLink+' 已用自然用户问法重新测试。确认有逐人条件核验与命中标签，但打标指令被直接存成标签，真实画像值未落库；标签查询geek错误召回2位，补标不更新报告／CSV。新增F14（P1）及F15（P2），合并15项问题。原题已返回1位部分候选，另做真实浏览器四项条件重放；不计作20人完成。新的TikTok及两类Campaign仍排队，不能计为端到端通过。\n\n'+manualLink+' 更新了本轮任务和测试环境：3400重新启用并保留3项新搜索；3300重放已结束后停止。此前段落中的测试部署停止记录属于10:30阶段。\n';
writeFileSync(acceptanceFile,acceptance);
for(const file of ['.gstack/qa-reports/review-2026-10-10/review-report.md','.gstack/qa-reports/full-e2e-2026-10-10/manual-acceptance.md']){
 let text=readFileSync(file,'utf8');if(!text.includes(marker))text+='\n'+marker+'\n\n'+reportLink+'。新增F14/F15，确认条件标签与画像打标的差距、实际标签检索误召回。最新进度及确需真人参与的范围见'+manualLink+'；历史阶段的状态和停止记录不替代本轮快照。\n';writeFileSync(file,text);
}
console.log(JSON.stringify({issues:baseline.issues.length,severity:baseline.issues.reduce((r,i)=>(r[i.severity]=(r[i.severity]??0)+1,r),{}),report:resolve(root,'tagging-review.md')}));
