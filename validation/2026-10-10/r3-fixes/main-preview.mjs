import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Store } from '../../../src/server/store.ts';
import { ResearchEngine } from '../../../src/server/research.ts';
import { repairFollowerPrecision } from '../../../src/server/repair.ts';
const root='validation/2026-10-10/r3-fixes';mkdirSync(`${root}/private`,{recursive:true,mode:0o700});
const docker=(...args)=>execFileSync('docker',['compose',...args],{encoding:'utf8'});
const backupPath=JSON.parse(docker('exec','-T','app','node','--input-type=module','-e',"import{DatabaseSync,backup}from'node:sqlite';import{mkdirSync,chmodSync}from'node:fs';const s=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});mkdirSync('/app/data/backups',{recursive:true,mode:0o700});const p='/app/data/backups/r3-before-fixes-'+Date.now()+'.sqlite';await backup(s,p);s.close();chmodSync(p,0o600);process.stdout.write(JSON.stringify(p));"));
const path=`${root}/private/main-before-fixes.sqlite`;docker('cp',`app:${backupPath}`,path);chmodSync(path,0o600);
const store=new Store(path),remote=async()=>{throw Error('Unexpected remote call');},engine=new ResearchEngine(store,{submit:remote,poll:remote},remote,Date.now);
const before=store.list('result'),tasksBefore=store.list('task').length,messagesBefore=store.list('message').length,deliveriesBefore=store.list('delivery').length;
repairFollowerPrecision(engine);const after=store.list('result');assert.equal(after.length,before.length);assert.equal(store.list('task').length,tasksBefore);assert.equal(store.list('message').length,messagesBefore);assert.equal(store.list('delivery').length,deliveriesBefore);
for(const old of before){const r=after.find(x=>x.id===old.id);assert.deepEqual(r.annotations,old.annotations);assert.deepEqual(r.tags,old.tags);}
const core=results=>results.map(({id,taskId,creator,judgments,verdict,selected,annotations,tags})=>({id,taskId,creator,judgments,verdict,selected,annotations,tags}));const coreDigest=createHash('sha256').update(JSON.stringify(core(after))).digest('hex');repairFollowerPrecision(engine);assert.deepEqual(store.list('result'),after);
const out={at:new Date().toISOString(),passed:true,source:'Private online SQLite snapshot of main service; migration preview only; no API/model calls or report redelivery',backupPath,backupMode:'0600',results:after.length,tasks:tasksBefore,messagesBefore,messagesAfter:store.list('message').length,deliveriesBefore,changed:after.filter(r=>JSON.stringify(r)!==JSON.stringify(before.find(x=>x.id===r.id))).map(r=>({id:r.id,handle:r.creator.handle,verdict:r.verdict})),coreDigest,idempotent:true};store.close();writeFileSync(`${root}/main-preview.json`,JSON.stringify(out,null,2));console.log(JSON.stringify(out));
