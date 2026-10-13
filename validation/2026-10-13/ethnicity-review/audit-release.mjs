import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const outputDirectory = 'docs/testing/ethnicity-review-2026-10-13/evidence';
const before = JSON.parse(readFileSync('validation/2026-10-13/ethnicity-review/private/predeploy.json', 'utf8'));
const sourceFiles = readdirSync('src', { recursive: true }).filter(path => /\.(ts|tsx|css)$/.test(path)).map(path => 'src/' + path);
const live = JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '--input-type=module'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, input: `
import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});
const rows=db.prepare("SELECT kind,id,body FROM documents WHERE kind IN ('task','result','result-history','message') ORDER BY kind,id").all().map(row=>({kind:row.kind,id:row.id,sha256:createHash('sha256').update(row.body).digest('hex')}));
const s=JSON.parse(db.prepare("SELECT body FROM documents WHERE kind='settings' AND id='model'").get().body);
const hashes=Object.fromEntries(${JSON.stringify(sourceFiles)}.map(path=>[path,createHash('sha256').update(readFileSync('/app/'+path)).digest('hex')]));
const wave=db.prepare("SELECT json_extract(body,'$.createdAt') AS createdAt,json_extract(body,'$.path') AS path,json_extract(body,'$.status') AS status,json_extract(body,'$.error') AS error FROM documents WHERE kind='wave-call'").all();
console.log(JSON.stringify({rows,hashes,wave,settingsRevision:s.revision,modelConfigHash:createHash('sha256').update(JSON.stringify([s.baseUrl,s.modelId,s.apiKey])).digest('hex'),prompts:{oldGate:s.systemPrompt.includes('族裔仅依据本人明确自述'),reviewWorkflow:s.workflowPrompt.includes('reviewOnly=true'),nonSelfRecords:s.verificationPrompt.includes('不限定必须本人亲口自述'),humanHandoff:s.systemPrompt.includes('交还后重新观察')},officialWaveEndpoint:process.env.WAVESURGE_BASE_URL===undefined||process.env.WAVESURGE_BASE_URL==='https://wavesurge.ai/api/v1'}));db.close();` }));
const key = row => row.kind + '|' + row.id;
const now = new Map(live.rows.map(row => [key(row), row.sha256]));
const missing = before.protectedRows.filter(row => !now.has(key(row))).map(key);
const changed = before.protectedRows.filter(row => now.has(key(row)) && now.get(key(row)) !== row.sha256).map(key);
const mismatches = sourceFiles.filter(path => createHash('sha256').update(readFileSync(path)).digest('hex') !== live.hashes[path]);
const task = JSON.parse(readFileSync(outputDirectory + '/public-case.json', 'utf8'));
const calls = live.wave.filter(call => call.createdAt >= task.requestCreatedAt && call.createdAt <= task.finalTask.updatedAt);
const summary = {};
for (const call of calls) { const name = call.path.split('?')[0], counts = summary[name] ??= { calls: 0, http200: 0, errors: 0 }; counts.calls++; counts.http200 += call.status === 200; counts.errors += !!call.error; }
const container = execFileSync('docker', ['compose', 'ps', '-q', 'app'], { encoding: 'utf8' }).trim();
const image = execFileSync('docker', ['inspect', '--format', '{{.Image}}', container], { encoding: 'utf8' }).trim();
const health = await fetch('http://101.201.237.219:33332/api/health');
const proof = { observedAt: new Date().toISOString(), image, sourceFiles: sourceFiles.length, sourceMismatches: mismatches, protectedRecords: before.protectedRows.length, missing, changed, modelConfigurationPreserved: live.modelConfigHash === before.modelConfigHash, settingsRevisionBefore: before.settingsRevision, settingsRevisionAfter: live.settingsRevision, prompts: live.prompts, waveOfficialEndpoint: live.officialWaveEndpoint, waveWindow: { from: task.requestCreatedAt, until: task.finalTask.updatedAt, totalCalls: calls.length, summary }, publicHealth: { status: health.status, body: await health.json() } };
proof.passed = !missing.length && !changed.length && !mismatches.length && proof.modelConfigurationPreserved && !proof.prompts.oldGate && proof.prompts.reviewWorkflow && proof.prompts.nonSelfRecords && proof.prompts.humanHandoff && proof.waveOfficialEndpoint && health.status === 200;
writeFileSync(outputDirectory + '/release.json', JSON.stringify(proof, null, 2)); console.log(JSON.stringify(proof, null, 2)); if (!proof.passed) process.exitCode = 1;
