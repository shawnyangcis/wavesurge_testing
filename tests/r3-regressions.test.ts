import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { Context } from '../src/server/context.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { researchTools } from '../src/server/research-tools.ts';
import { basicTools } from '../src/server/tools.ts';
import { registerWork, deliverWorkBatches, recoverWorkBatches, sealWork, workSummary } from '../src/server/work-delivery.ts';
import { repairFollowerPrecision } from '../src/server/repair.ts';
import { executionFacts } from '../src/server/task-facts.ts';
import { SettingsManager } from '../src/server/settings.ts';
import { legacyKOCWorkflowPrompt, legacyDesktopWorkflowPrompt, legacyBrowserWorkflowPrompt, workflowPrompt } from '../src/shared/prompts.ts';
import { applyAssessment, followerInterval } from '../src/server/assessment.ts';
import { resolveJudgments } from '../src/server/verdict.ts';
import { discover } from '../src/server/discovery.ts';
import type { Creator, SearchSpec } from '../src/shared/research.ts';
const stores: Store[]=[];afterEach(()=>stores.splice(0).forEach(s=>s.close()));
const spec:SearchSpec={title:'数码个人创作者',personaText:'tech',count:1,candidateBudget:1,platforms:['instagram'],regions:[],minFollowers:10000,maxFollowers:100000,criteria:[]};
const person=():Creator=>({id:'instagram:valstechtalkk',platform:'instagram',handle:'valstechtalkk',profileUrl:'https://www.instagram.com/valstechtalkk/',displayName:'Val',followers:39667,region:null,raw:{},evidence:[{id:'profile',url:'https://www.instagram.com/valstechtalkk/',text:'39.6K followers',kind:'browser_snapshot',provider:'headed-chromium',publishedAt:null,capturedAt:1,assetId:'image'}]});
it('F24: 39.6K 兼容真实精确39667，精度差异不降级范围内候选',()=>{
 expect(followerInterval('39.6K followers')).toEqual({min:39550,max:39699});
 const c=person();applyAssessment(spec,c,{judgments:[],facts:[{kind:'followers',rawValue:'39.6K followers',evidenceIds:['profile']}]});
 expect(c.facts?.conflicts).toEqual([]);expect(resolveJudgments(spec,c,[]).verdict).toBe('match');
});
it('F24: 重新取得一致本人事实可解除旧精度冲突，跨边界真实矛盾仍未知',()=>{
 const c=person();c.facts={conflicts:['followers: 来源数值冲突','country: 本人所在地来源冲突']};
 applyAssessment(spec,c,{judgments:[],facts:[{kind:'followers',rawValue:'39.6K followers',evidenceIds:['profile']}]});
 expect(c.facts?.conflicts).toEqual(['country: 本人所在地来源冲突']);expect(resolveJudgments(spec,c,[]).verdict).toBe('match');
 const other=person();other.followers=90000;applyAssessment({...spec,minFollowers:50000},other,{judgments:[],facts:[{kind:'followers',rawValue:'39.6K followers',evidenceIds:['profile']}]});expect(resolveJudgments({...spec,minFollowers:50000},other,[]).verdict).toBe('unknown');
});
const readProfiles=(calls:string[])=>async(path:string)=>{calls.push(path);const url=new URL(path,'https://fixture.test');if(path.includes('search_users'))return{data:{users:[{username:'small'},{username:'big'},{username:'valstechtalkk'}]}};if(path.includes('fetch_user_info')){const username=url.searchParams.get('username')!;return{data:{username,id:username,edge_followed_by:{count:username==='small'?234:username==='big'?1003420:39667}}};}return{data:{items:[]}};};
it('F25: 泛搜索先排除已知数值不符，继续未读队列，分析预算只计基础可行者',async()=>{
 const calls:string[]=[];let state;const all:Creator[]=[];
 for(let i=0;i<12&&!state?.done;i++){const x=await discover(readProfiles(calls),spec,state,1);state=JSON.parse(JSON.stringify(x.state));all.push(...x.creators);}
 expect(all.map(c=>c.handle)).toEqual(['valstechtalkk']);expect(state.delivered).toBe(1);expect(state.profileReads).toBe(3);expect(state.baseExcluded).toBe(2);
 expect(calls.filter(p=>p.includes('fetch_user_posts')).every(p=>p.includes('valstechtalkk'))).toBe(true);
});
it('F25: 指定两人全分析不因数值排除而漏掉指定身份',async()=>{
 const calls:string[]=[];let state;const all:Creator[]=[];const exact={...spec,candidateBudget:2,analyzeAll:true,instagram:{handles:['small','valstechtalkk']}};
 for(let i=0;i<4&&!state?.done;i++){const x=await discover(readProfiles(calls),exact,state,1);state=x.state;all.push(...x.creators);}expect(all.map(c=>c.handle)).toEqual(['small','valstechtalkk']);expect(calls.some(p=>p.includes('search_users'))).toBe(false);
});
for(const kind of ['reset','load'] as const)it(`F23: 已登记但尚未答复时${kind}，后台终态仍自动且仅交付一次`,()=>{
 const store=new Store(':memory:');stores.push(store);let id=0;const context=new Context(store,()=>String(++id));
 store.set('message','request',{id:'request',role:'user',text:'研究后给报告',epoch:0,createdAt:1,state:'pending',attachments:[]});
 store.set('task','job',{id:'job',status:'running',title:'研究',detail:'运行中',requested:1,evaluated:0,matched:0,updatedAt:1});store.set('tool-owner','call',{requestId:'request'});registerWork(store,'call',{id:'job',kind:'research',title:'研究',reportUrl:'/api/reports/job'});
 expect(store.get<any>('work-batch','request').sealed).toBe(false);
 if(kind==='reset')context.reset();else context.load({format:'creator-studio/1',messages:[],batches:[]});
 store.set('task','job',{...store.task<any>('job'),status:'partial',detail:'已结束但缺额'});deliverWorkBatches(store,10);deliverWorkBatches(store,11);
 expect(store.list('delivery')).toHaveLength(1);expect(store.list<any>('message').filter(m=>m.role==='assistant'&&m.epoch===context.epoch())).toHaveLength(1);
});
it('F20/F02: 一次登记文字和网页两项，人工租约只阻塞网页核验而不丢失它',async()=>{
 const store=new Store(':memory:');stores.push(store);const verify=vi.fn(async()=>[]);const engine=new ResearchEngine(store,{submit:vi.fn(),poll:vi.fn(),discover:async()=>({state:{done:true} as any,creators:[person()]})},verify,()=>1);engine.textVerify=vi.fn(async()=>[]);
 store.set('assistance','human',{status:'human'});store.set('message','request',{id:'request',role:'user',text:'两项都执行',epoch:0,state:'pending'});store.set('tool-owner','call',{requestId:'request'});
 const tools=researchTools(engine,basicTools(store));const specs=[{...spec,verificationMode:'text',annotations:[{id:'topic',label:'方向'}]},{...spec,title:'网页任务',verificationMode:'auto',annotations:[{id:'topic',label:'方向'}]}];
 await tools.execute('start_research_batch',{specs},'call');await engine.currentRun;
 expect(store.tasks()).toHaveLength(2);expect(store.get<any>('work-batch','request').items).toHaveLength(2);expect(engine.textVerify).toHaveBeenCalledTimes(1);expect(verify).not.toHaveBeenCalled();expect(store.list('delivery')).toEqual([]);
 sealWork(store,['request'],1);await engine.tick();expect(store.list('delivery')).toEqual([]);store.set('assistance','human',{status:'done'});await engine.tick();expect(verify).toHaveBeenCalledTimes(1);expect(store.list('delivery')).toHaveLength(1);
});
it('F20: 多项登记有原子回滚和幂等身份，坏项不留下半批或启动远端',async()=>{
 const store=new Store(':memory:');stores.push(store);const engine=new ResearchEngine(store,{submit:vi.fn(),poll:vi.fn()},async()=>[],()=>1);engine.stopped=true;const tools=researchTools(engine,basicTools(store));
 for(const bad of [null,[],{},{specs:1},{specs:[spec],extra:1},{specs:[]},{specs:[spec]},{specs:Array(11).fill(spec)}])await expect(tools.execute('start_research_batch',bad,'invalid')).rejects.toThrow();
 await expect(tools.execute('start_research_batch',{specs:[spec,{...spec,minFollowers:100001}]},'call')).rejects.toThrow();expect(store.tasks()).toEqual([]);expect(store.list('work-batch')).toEqual([]);
 const valid={specs:[spec,{...spec,title:'第二项'}]};const first=await tools.execute('start_research_batch',valid,'call');expect(await tools.execute('start_research_batch',valid,'call')).toEqual(first);expect(store.tasks()).toHaveLength(2);expect(store.list<any>('work-batch')[0].items).toHaveLength(2);expect(engine.wave.submit).not.toHaveBeenCalled();
});
it('F23: 重启恢复只封口实际中断批次，当前输入未完成者继续等待，不产生空报告',()=>{
 const store=new Store(':memory:');stores.push(store);store.set('settings','epoch',1);
 for(const [id,epoch,state] of [['old',0,'pending'],['done',1,'delivered'],['pending',1,'pending']] as const){store.set('message',id,{id,epoch,state});store.set('task',id,{id,title:id,status:'partial',detail:'缺额'});store.set('tool-owner','call-'+id,{requestId:id});registerWork(store,'call-'+id,{kind:'research',id,title:id,reportUrl:'/r'});store.set('work-batch',id,{...store.get<any>('work-batch',id),sealed:false});}
 store.set('task','orphan',{id:'orphan',status:'partial',detail:'未确认'});store.set('work-batch','orphan',{id:'orphan',sealed:false,items:[{kind:'research',id:'orphan',title:'orphan',reportUrl:'/r'}]});
 recoverWorkBatches(store,1);expect(store.get<any>('work-batch','old').delivered).toBe(true);expect(store.get<any>('work-batch','done').delivered).toBe(true);expect(store.get<any>('work-batch','orphan').delivered).toBe(true);expect(store.get<any>('work-batch','pending').sealed).toBe(false);expect(store.list('delivery')).toHaveLength(3);recoverWorkBatches(store,2);expect(store.list('delivery')).toHaveLength(3);
 expect(workSummary(store,{id:'empty',sealed:true,items:[]}).ready).toBe(false);
});
it('F23: 上下文已切换后的迟到登记自动封口并明确未登记边界',()=>{
 const store=new Store(':memory:');stores.push(store);const context=new Context(store,()=> 'new',()=>2);store.set('message','request',{id:'request',epoch:0,state:'pending'});store.set('tool-owner','call',{requestId:'request'});context.reset();store.set('task','job',{id:'job',status:'completed',title:'job',detail:'完成'});registerWork(store,'call',{kind:'research',id:'job',title:'job',reportUrl:'/r'});deliverWorkBatches(store,3);expect(store.get<any>('work-batch','request')).toMatchObject({sealed:true,delivered:true,closureReason:'context_changed'});expect(store.list<any>('message').at(-1).text).toContain('尚未登记的事项没有执行');
});
it('F02: 主上下文包含真实桌面租约及登记能力，旧默认工作流升级而自定义保持',()=>{
 const store=new Store(':memory:');stores.push(store);expect(executionFacts(store).desktop.inputOwner).toBe('agent');store.set('assistance','a',{status:'pending',taskId:'t',creatorId:'c',reason:'登录'});expect(executionFacts(store)).toMatchObject({desktop:{inputOwner:'reserved_for_human'},registrationAllowed:true,textVerificationBlocked:false,browserVerificationWaiting:true});store.set('assistance','a',{status:'human',taskId:'t'});expect(executionFacts(store).desktop.inputOwner).toBe('human');
 const settings=new SettingsManager(store,{});for(const previous of [legacyKOCWorkflowPrompt,legacyDesktopWorkflowPrompt,legacyBrowserWorkflowPrompt]){store.set('settings','model',{...settings.current(),workflowPrompt:previous});new SettingsManager(store,{});expect(settings.current().workflowPrompt).toBe(workflowPrompt);}store.set('settings','model',{...settings.current(),workflowPrompt:'custom'});new SettingsManager(store,{});expect(settings.current().workflowPrompt).toBe('custom');
});
it('F25: 独立基础读取预算耗尽和旧检查点恢复都保持有界，未知粉丝保留',async()=>{
 const calls:string[]=[];let state;const limited={...spec,instagram:{profileBudget:1}};
 for(let i=0;i<5&&!state?.done;i++)state=(await discover(readProfiles(calls),limited,state,1)).state;if(!state)throw new Error('Discovery did not start');expect(state.done).toBe(true);expect(state.profileReads).toBe(1);expect(state.delivered).toBe(0);
 const resumed=await discover(readProfiles([]),limited,{...state,done:false,platform:0},1);expect(resumed.state.done).toBe(true);expect(resumed.creators).toEqual([]);
 const multi=await discover(readProfiles([]),{...limited,platforms:['instagram','youtube']},{...state,done:false,platform:0},1);expect(multi.state.done).toBe(false);expect(multi.state.platform).toBe(1);
 const unknown=await discover(async()=>({data:{username:'unknown',id:'unknown'}}),spec,{platform:0,keyword:0,page:0,cursor:'',seenCursors:[],seenUsers:[],pending:[{username:'unknown'}],delivered:0,done:false},1);expect(unknown.creators[0].followers).toBeNull();expect(unknown.state.baseExcluded).toBeUndefined();
 const store=new Store(':memory:');stores.push(store);const engine=new ResearchEngine(store,{submit:vi.fn(),poll:vi.fn()},async()=>[],()=>1);expect(()=>engine.start({...spec,candidateBudget:2,instagram:{profileBudget:1}},'short')).toThrow('基础账号读取');
});
it('F24: 保存的真实本人缩写可定向修复旧判定、保留画像和版本、无历史重交付',()=>{
 const store=new Store(':memory:');stores.push(store);const engine=new ResearchEngine(store,{submit:vi.fn(),poll:vi.fn()},async()=>[],()=>2);const source=engine.start(spec,'source');source.status='partial';store.set('task',source.id,source);
 const c=person();c.facts={conflicts:['followers: 来源数值冲突']};const result={id:source.id+'|'+c.id,taskId:source.id,creator:c,verdict:'unknown',judgments:[],annotations:[],tags:['原画像'],selected:false,revision:1,updatedAt:1};store.set('result',result.id,result);store.set('verification',result.id,{assessment:{judgments:[],facts:[{kind:'followers',rawValue:'39.6K followers',evidenceIds:['profile']}]}});
 repairFollowerPrecision(engine);const repaired=store.get<any>('result',result.id);expect(repaired).toMatchObject({verdict:'match',selected:true,revision:2,tags:['原画像']});expect(store.list('result-history')).toHaveLength(1);expect(store.list('delivery')).toEqual([]);expect(store.task<any>(source.id).detail).toContain('不是新页面核验');repairFollowerPrecision(engine);expect(store.get('result',result.id)).toEqual(repaired);
});
it('F24: 重复提交实质矛盾仍保留冲突，不因再次核验而清掉',()=>{
 for(const exact of [null,90000]){
  const c=person();c.followers=exact;c.evidence.push({...c.evidence[0],id:'earlier',text:'90.0K followers'});c.facts={conflicts:['followers: 来源数值冲突'],followers:{min:89950,max:90099,rawValue:'90.0K followers',evidenceIds:['earlier']}};
  const output={judgments:[],facts:[{kind:'followers' as const,rawValue:'39.6K followers',evidenceIds:['profile']}]};applyAssessment(spec,c,output);applyAssessment(spec,c,output);
  expect(c.facts.conflicts).toEqual(['followers: 来源数值冲突']);if(exact===null)expect(c.facts.followers?.rawValue).toBe('90.0K followers');
 }
});
it('F02: 执行事实只列实际未交付批次，完成租约不阻塞新研究',()=>{
 const store=new Store(':memory:');stores.push(store);store.set('assistance','done',{status:'done'});
 store.set('work-batch','pending',{id:'pending',sealed:false,items:[{kind:'research',id:'r',title:'文字研究',reportUrl:'/r'},{kind:'enrichment',id:'e',title:'网页核验',reportUrl:'/e'}]});
 store.set('work-batch','delivered',{id:'delivered',sealed:true,delivered:true,items:[{kind:'research',id:'old',title:'已交付',reportUrl:'/old'}]});
 expect(executionFacts(store)).toEqual({desktop:{inputOwner:'agent'},registrationAllowed:true,textVerificationBlocked:false,browserVerificationWaiting:false,workBatches:[{id:'pending',sealed:false,items:[{kind:'research',id:'r',title:'文字研究'},{kind:'enrichment',id:'e',title:'网页核验'}]}]});
});
it.each(['no-conflict','unknown-exact','missing-fact','invalid-number','invalid-format','outside-interval','bad-ref','empty-ref','invalid-refs','orphan','missing-spec','foreign-page','missing-literal','latest-real-conflict'] as const)('F24: 历史修复对 %s 保持原判定和版本，不伪造证据',kind=>{
 const store=new Store(':memory:');stores.push(store);const wave={submit:vi.fn(),poll:vi.fn()};const verify=vi.fn();const engine=new ResearchEngine(store,wave,verify,()=>2);const source=engine.start(spec,'source');source.status='partial';store.set('task',source.id,source);
 const c=person();c.facts={conflicts:['followers: 来源数值冲突']};const id=source.id+'|'+c.id;let fact:any={kind:'followers',rawValue:'39.6K followers',evidenceIds:['profile']};
 if(kind==='no-conflict')c.facts.conflicts=[];if(kind==='unknown-exact')c.followers=null;if(kind==='missing-fact')fact=undefined;if(kind==='invalid-number')fact.rawValue=3;if(kind==='invalid-format')fact.rawValue='大约四万';if(kind==='outside-interval')fact.rawValue='90.0K followers';if(kind==='bad-ref')fact.evidenceIds=['missing'];if(kind==='empty-ref')fact.evidenceIds=[];if(kind==='invalid-refs')fact.evidenceIds='profile';
 if(kind==='orphan')store.delete('task',source.id);if(kind==='missing-spec')store.set('task',source.id,{...source,spec:undefined});if(kind==='foreign-page')c.evidence[0].url='https://www.instagram.com/other/';if(kind==='missing-literal')c.evidence[0].text='Val profile without follower text';
 const result={id,taskId:source.id,creator:c,verdict:'unknown',judgments:[],annotations:[],tags:['保留'],selected:false,revision:4,updatedAt:1};store.set('result',id,result);if(fact)store.set('verification',id,{assessment:{judgments:[],facts:[fact]}});
 if(kind==='latest-real-conflict'){store.set('enrichment','again',{id:'again',mode:'reverify',resultIds:[id]});store.set('verification','again|'+c.id,{assessment:{judgments:[],facts:[{kind:'country',rawValue:'Based in USA',evidenceIds:['profile']},{kind:'followers',rawValue:'90.0K followers',evidenceIds:['profile']}]}});}
 repairFollowerPrecision(engine);expect(store.get('result',id)).toEqual(result);expect(store.list('result-history')).toEqual([]);expect(store.list('delivery')).toEqual([]);expect(store.get<any>('data-migration','r3-follower-precision-20261010').taskIds).toEqual([]);expect(wave.submit).not.toHaveBeenCalled();expect(wave.poll).not.toHaveBeenCalled();expect(verify).not.toHaveBeenCalled();
});
it.each(['running','completed'] as const)('F24: 历史本人事实回退修正不会把 %s 未确认条件变成完成或重交付',status=>{
 const store=new Store(':memory:');stores.push(store);const engine=new ResearchEngine(store,{submit:vi.fn(),poll:vi.fn()},vi.fn(),()=>2);const source=engine.start({...spec,criteria:[{id:'personal',label:'个人创作者',required:true,basis:'text'}]},'source');source.status=status;store.set('task',source.id,source);
 const c=person();c.facts={conflicts:['followers: 来源数值冲突'],followers:{min:39550,max:39649,rawValue:'39.6K followers',evidenceIds:['profile']}};const id=source.id+'|'+c.id;store.set('result',id,{id,taskId:source.id,creator:c,verdict:'unknown',judgments:[{criterionId:'__followers',verdict:'unknown',reason:'旧精度冲突',evidenceIds:['profile']}],annotations:[],tags:['原标签'],selected:false,updatedAt:1});
 store.set('enrichment','annotate',{id:'annotate',mode:'annotate',resultIds:[id]});store.set('enrichment','unrelated',{id:'unrelated',mode:'reverify',resultIds:[]});store.set('enrichment','empty-session',{id:'empty-session',mode:'reverify',resultIds:[id]});store.set('verification',id,{assessment:{judgments:[]}});
 repairFollowerPrecision(engine);expect(store.get<any>('result',id)).toMatchObject({verdict:'unknown',selected:false,revision:2,tags:['原标签'],creator:{facts:{conflicts:[]}}});expect(store.task<any>(source.id).status).toBe(status==='running'?'running':'partial');expect(store.list('delivery')).toEqual([]);expect(store.list('result-history')).toHaveLength(1);
});
it.each(['valid','no-proof','wrong-id','wrong-kind','wrong-provider','no-asset','stale','foreign-page'] as const)('明确主页访问的 %s 证据不能被已有资料替代',kind=>{
 const c=person();c.browserVerification={startedAt:100,profileEvidenceIds:['profile']};c.evidence[0]={...c.evidence[0],capturedAt:101};
 if(kind==='no-proof')delete c.browserVerification;if(kind==='wrong-id')c.browserVerification!.profileEvidenceIds=[];if(kind==='wrong-kind')c.evidence[0].kind='profile';if(kind==='wrong-provider')c.evidence[0].provider='wavesurge';if(kind==='no-asset')delete c.evidence[0].assetId;if(kind==='stale')c.evidence[0].capturedAt=99;if(kind==='foreign-page')c.evidence[0].url='https://www.instagram.com/other/';
 const result=resolveJudgments({...spec,verificationMode:'browser'},c,[]);expect(result.verdict).toBe(kind==='valid'?'match':'unknown');expect(result.judgments.find(j=>j.criterionId==='__profile_visit')?.evidenceIds).toEqual(kind==='valid'?['profile']:[]);
 if(kind==='valid')expect(resolveJudgments(spec,c,[]).judgments.find(j=>j.criterionId==='__profile_visit')?.verdict).toBe('match');
});
