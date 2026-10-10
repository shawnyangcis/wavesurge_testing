import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as prompts from '../../../src/shared/prompts.ts';
import { installations, login } from './preflight.mjs';
const root = 'validation/2026-10-11/chat-prompts'; const before = JSON.parse(readFileSync(`${root}/before.json`, 'utf8'));
const hash = text => createHash('sha256').update(text).digest('hex');
const fields = ['systemPrompt','workflowPrompt','verificationPrompt','compressionPrompt'];
for (const installation of installations.filter(i => i.name === process.argv[2])) {
 const { get } = await login(installation); const settings = await get('/api/settings');
 for (const field of fields) assert.equal(settings[field], prompts[field]);
 const baseline = before.find(i => i.name === installation.name); assert.equal(settings.revision, baseline.settingsRevision + 1);
 const code = `import { DatabaseSync } from 'node:sqlite'; import { createHash } from 'node:crypto'; import { readdirSync,readFileSync } from 'node:fs'; import { join } from 'node:path'; const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true}); const documents=db.prepare('SELECT kind,id,body FROM documents').all().map(r=>({kind:r.kind,id:r.id,hash:createHash('sha256').update(r.body).digest('hex')})); db.close(); const files=[]; const walk=d=>{for(const e of readdirSync(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())walk(p);else files.push({path:p.replace('/app/',''),hash:createHash('sha256').update(readFileSync(p)).digest('hex')});}};walk('/app/src');console.log(JSON.stringify({documents,files}));`;
 const current = JSON.parse(execFileSync('docker', [...installation.compose,'exec','-T','app','node','--input-type=module','-e',code], {encoding:'utf8',stdio:['ignore','pipe','ignore']}));
 const db = new DatabaseSync(`${root}/private/${installation.name}-before.sqlite`, {readOnly:true});
 const oldRows = db.prepare('SELECT kind,id,body FROM documents').all(); db.close();
 const preserved = oldRows.filter(r => r.kind !== 'session' && !(r.kind === 'settings' && r.id === 'model'));
 for(const row of preserved) assert.equal(current.documents.find(r=>r.kind===row.kind&&r.id===row.id)?.hash,hash(row.body),`${row.kind}/${row.id} changed`);
 const files=[]; const walk=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())walk(path);else files.push({path,hash:hash(readFileSync(path))});}};walk('src');
 assert.deepEqual(current.files.sort((a,b)=>a.path.localeCompare(b.path)),files.sort((a,b)=>a.path.localeCompare(b.path)));
 const state=await get('/api/state');assert.equal(state.tasks.length,baseline.tasks);assert.equal(state.messages.length,baseline.messages);assert.equal(state.active,false);
 const outcome={name:installation.name,defaultFieldsUpdated:fields,settingsRevision:settings.revision,preservedDocuments:preserved.length,messages:state.messages.length,tasks:state.tasks.length,sourceFilesMatched:files.length,noHistoricalRedelivery:true,passed:true};
 writeFileSync(`${root}/${installation.name}-migration.json`,JSON.stringify(outcome,null,2));console.log(JSON.stringify(outcome));
}
