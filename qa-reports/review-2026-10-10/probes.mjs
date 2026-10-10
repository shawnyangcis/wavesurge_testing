import {Store} from '../../../src/server/store.ts';
import {ResearchEngine} from '../../../src/server/research.ts';
import {normalizeCreator} from '../../../src/server/wave.ts';
import {resolveJudgments} from '../../../src/server/verdict.ts';
import {DesktopRuntime} from '../../../src/desktop/runtime.ts';
import {writeFileSync} from 'node:fs';
const output={};
const spec={title:'review probe',personaText:'technology',count:1,candidateBudget:2,platforms:['instagram'],regions:[],minFollowers:10000,maxFollowers:100000,criteria:[]};
const raw=(handle,region='San Francisco, United States')=>({platform:'instagram',handle,profileUrl:`https://www.instagram.com/${handle}/`,followerCount:20000,region,factorGrades:{location:'confirmed_country'},bio:'technology reviews'});
const creator=normalizeCreator(raw('city-match'),1);
output.regions=['United States','San Francisco','San Francisco, United States','美国'].map(region=>({requested:region,actual:creator.region,outcome:resolveJudgments({...spec,regions:[region]},creator,[])}));
// An optional preference should influence which qualified account is delivered.
{
const store=new Store(':memory:');let now=0;
const engine=new ResearchEngine(store,{submit:async()=> 'remote',poll:async()=>({status:'done',creators:[raw('no-preference'),raw('has-preference')]})},async(s,c)=>[{criterionId:'glasses',verdict:c.handle==='has-preference'?'match':'no_match',reason:'controlled evidence',evidenceIds:[c.evidence[0].id]}],()=>now);
const task=engine.start({...spec,criteria:[{id:'glasses',label:'优先戴眼镜',required:false,basis:'text'}]},'preference');await engine.wake();now=60001;await engine.wake();output.preference={task:store.get('task',task.id),results:engine.results(task.id)};store.close();
}
// Check whether unrelated text-only research can advance during human assistance.
{
const store=new Store(':memory:');let submits=0;store.set('assistance','blocked',{status:'pending',taskId:'other-task'});const engine=new ResearchEngine(store,{submit:async()=>{submits++;return'remote'},poll:async()=>({status:'done',creators:[]})},async()=>[],()=>0);const task=engine.start(spec,'unrelated');await engine.wake();output.globalBlock={submits,task:store.get('task',task.id)};store.close();
}
// Runtime validation only: no browser/network, messages or credentials are sent.
{
const actions=[];const page={bringToFront:async()=>{},goto:async(url)=>actions.push({action:'navigate',url}),url:()=> 'http://127.0.0.1/',title:async()=> 'fake page',evaluate:async()=>({text:'fake page',links:[]}),screenshot:async()=>Buffer.from('fake'),locator:()=>({first:()=>({fill:async(text)=>actions.push({action:'fill',text}),click:async()=>actions.push({action:'click'})})}),keyboard:{press:async()=>{}}};const context={pages:()=>[page]};const runtime=new DesktopRuntime(context,()=>1,()=> 'observation',()=>{});await runtime.command({action:'navigate',url:'http://127.0.0.1:8810/health'});await runtime.command({action:'fill',selector:'input[type=password]',text:'DUMMY_NOT_A_SECRET',observationId:'observation'});output.runtimeGuard={actions};
}
writeFileSync('.gstack/qa-reports/review-2026-10-10/probe-results.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
