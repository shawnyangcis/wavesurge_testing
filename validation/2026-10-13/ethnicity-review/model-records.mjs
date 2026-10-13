import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const script = `
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {Store} from './src/server/store.ts';
import {SettingsManager} from './src/server/settings.ts';
import {ModelClient} from './src/server/model.ts';
import {modelVerifier} from './src/server/verify.ts';
import {screeningSpec} from './src/shared/screening.ts';
import {resolveJudgments} from './src/server/verdict.ts';
const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});
const current=JSON.parse(db.prepare("SELECT body FROM documents WHERE kind='settings' AND id='model'").get().body);db.close();
const store=new Store(':memory:');
const settings=new SettingsManager(store,{...process.env,BASE_URL:current.baseUrl,API_KEY:current.apiKey,MODEL_ID:current.modelId});
const model=new ModelClient(store,settings,fetch,Date.now,randomUUID);
const verify=modelVerifier(model,settings);
const spec=screeningSpec({title:'受控明确资料模型协议验证',personaText:'runner',count:1,candidateBudget:1,platforms:['instagram'],regions:[],minFollowers:10000,maxFollowers:100000,verificationMode:'text',criteria:[{id:'ethnicity',label:'白人',required:true,basis:'text'}]});
const proof={dataSource:'controlled synthetic metadata; not a public creator lookup',realModel:true,startedAt:new Date().toISOString(),cases:[]};
for(const test of [{name:'第三方明确记录',text:'Verified creator directory for Sample. Ethnicity: Caucasian.',expected:'match',aggregate:'match'},{name:'明确记录不符',text:'Verified creator directory for Sample. Ethnicity: Asian.',expected:'no_match',aggregate:'no_match'},{name:'地区不能替代族裔',text:'Verified creator directory for Sample. Based in the United States. Wears glasses.',expected:'unknown',aggregate:'match'}]){
 const creator={id:'instagram:sample',platform:'instagram',handle:'sample',displayName:'Sample',profileUrl:'https://www.instagram.com/sample/',followers:20000,region:null,raw:{},evidence:[{id:'directory',url:'https://directory.test/sample',kind:'linked_profile_snapshot',provider:'controlled-metadata-fixture',text:test.text,capturedAt:Date.now(),publishedAt:null,assetId:'fixture',linkedIdentityProof:'reciprocal'}]};
 const started=Date.now();const output=await verify(spec,creator,'protocol-test');const result=resolveJudgments(spec,creator,Array.isArray(output)?output:output.judgments);const judgment=result.judgments.find(item=>item.criterionId==='ethnicity');
 proof.cases.push({name:test.name,expected:test.expected,judgment,aggregate:result.verdict,elapsedMs:Date.now()-started,passed:judgment.verdict===test.expected&&result.verdict===test.aggregate});
}
proof.passed=proof.cases.every(test=>test.passed);proof.finishedAt=new Date().toISOString();store.close();console.log(JSON.stringify(proof));
`;
const output = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '--input-type=module'], { input: script, encoding: 'utf8', maxBuffer: 1024 * 1024 });
const proof = JSON.parse(output);
mkdirSync('docs/testing/ethnicity-review-2026-10-13/evidence', { recursive: true });
writeFileSync('docs/testing/ethnicity-review-2026-10-13/evidence/model-records.json', JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
if (!proof.passed) process.exitCode = 1;
