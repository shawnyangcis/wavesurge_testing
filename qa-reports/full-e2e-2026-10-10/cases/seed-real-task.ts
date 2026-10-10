import { readFileSync } from 'node:fs';
import { Store } from '../../src/server/store.ts';
import { ResearchEngine } from '../../src/server/research.ts';
const source=JSON.parse(readFileSync('/app/data/fixtures/real-candidate-replay.json','utf8'));
const store=new Store('/app/data/studio.sqlite');
const engine=new ResearchEngine(store,{submit:async()=>{throw new Error('replay must not submit new WaveSurge search');},poll:async()=>({status:'done',creators:[]})},async()=>[],Date.now);
const task=engine.start({title:'Review真实Instagram候选重放 '+process.argv[2],personaText:'Historical WaveSurge candidate replay; only live-browser evidence is under test, not new discovery.',count:1,candidateBudget:1,platforms:['instagram'],regions:[],minFollowers:10000,maxFollowers:100000,criteria:[{id:'learning_content',label:'公开内容有学习、笔记或效率生活主题，依据公开文字',basis:'text',required:true},{id:'learning_visual',label:'公开帖子实际画面展示学习、笔记或使用电脑的场景；必须看本次浏览器截图，不能依据简介或旧截图',basis:'visual',required:true}]},'real-replay-'+process.argv[2]);
task.remoteId='historical-replay:'+source.originalTaskId;task.remoteStatus='done';task.status='running';task.nextPollAt=0;task.candidates=[source.creator];engine.save(task);store.close();process.stdout.write(task.id);
