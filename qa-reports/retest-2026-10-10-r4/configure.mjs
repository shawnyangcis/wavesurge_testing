import {execFileSync} from 'node:child_process';import{readFileSync,writeFileSync,cpSync}from'node:fs';
const root='.gstack/qa-reports/retest-2026-10-10-r4';
const get=`import{Store}from'./src/server/store.ts';const s=new Store('/app/data/studio.sqlite');const c=s.get('settings','model');process.stdout.write(JSON.stringify({baseUrl:c.baseUrl,apiKey:c.apiKey,modelId:c.modelId}));s.close();`;
const cfg=execFileSync('docker',['compose','exec','-T','app','node','--input-type=module','-e',get],{encoding:'utf8'});
const scopes=[['live',['compose','-p','creator-studio-retest-r4-live','-f','compose.yaml','-f',root+'/live-compose.yaml']],['edge',['compose','-p','creator-studio-retest-r4-edge','-f','compose.yaml','-f','tests/fixtures/qa-compose.yaml']]];
const out=[];
for(const [scope,comp] of scopes){const script=`import{readFileSync}from'node:fs';import{Store}from'./src/server/store.ts';const v=JSON.parse(readFileSync(0,'utf8')),s=new Store('/app/data/studio.sqlite'),c=s.get('settings','model');s.set('settings','model',{...c,...v,revision:c.revision+1});process.stdout.write(JSON.stringify({configured:true,credentialPresent:!!v.apiKey,modelId:v.modelId,baseUrl:v.baseUrl,taskCount:s.tasks().length,resultCount:s.list('result').length,prompts:'fresh defaults from current source'}));s.close();`;
 out.push({scope,...JSON.parse(execFileSync('docker',[...comp,'exec','-T','app','node','--input-type=module','-e',script],{encoding:'utf8',input:cfg}))});}
writeFileSync(root+'/configuration.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
cpSync('coverage',root+'/coverage',{recursive:true});
const before=JSON.parse(readFileSync('.gstack/qa-reports/retest-2026-10-10-r3/source-check-final.json','utf8')).host,after=JSON.parse(readFileSync(root+'/source-check.json','utf8')).host;writeFileSync(root+'/source-delta.json',JSON.stringify({from:'R3',to:'R4',changed:Object.keys(after).filter(k=>before[k]!==after[k]),added:Object.keys(after).filter(k=>!before[k]),removed:Object.keys(before).filter(k=>!after[k])},null,2));
