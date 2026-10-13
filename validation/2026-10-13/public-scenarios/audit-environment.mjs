import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const out = 'docs/testing/public-scenarios-2026-10-13/evidence';
const proofs = ['running', 'coffee'].map(key => JSON.parse(readFileSync(out + '/' + key + '.json', 'utf8')));
const from = Math.min(...proofs.map(p => p.requestCreatedAt)); const until = Math.max(...proofs.map(p => p.finalTask.updatedAt));
const kinds = ['task', 'result', 'message', 'campaign', 'campaign-state', 'delivery', 'work-batch', 'assistance'];
const sql = 'SELECT kind,id,body FROM documents WHERE kind IN (' + kinds.map(() => '?').join(',') + ')';
const files = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' }).trim().split('\n');
const source = `import{DatabaseSync}from'node:sqlite';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';const d=new DatabaseSync('/app/data/studio.sqlite');const rows=d.prepare(${JSON.stringify(sql)}).all(...${JSON.stringify(kinds)}).map(({kind,id,body})=>({kind,id,hash:createHash('sha256').update(body).digest('hex')}));const files=${JSON.stringify(files)}.map(path=>({path,hash:createHash('sha256').update(readFileSync(path)).digest('hex')}));const calls=d.prepare("SELECT json_extract(body,'$.path') path,json_extract(body,'$.status') status,json_extract(body,'$.error') error,json_extract(body,'$.createdAt') createdAt,json_extract(body,'$.finishedAt') finishedAt FROM documents WHERE kind='wave-call' AND json_extract(body,'$.createdAt')>=? AND json_extract(body,'$.createdAt')<=?").all(${from},${until});const endpoint=new URL(process.env.WAVESURGE_BASE_URL??'https://wavesurge.ai/api/v1');const waveOfficialEndpoint=endpoint.protocol==='https:'&&endpoint.hostname==='wavesurge.ai'&&['/api/v1','/api/v1/'].includes(endpoint.pathname);console.log(JSON.stringify({rows,files,calls,waveOfficialEndpoint}));d.close();`;
const current = JSON.parse(execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '--input-type=module'], { input: source, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
const hashes = new Map(current.rows.map(r => [r.kind + '|' + r.id, r.hash]));
const check = baseline => ({ rows: baseline.length, missing: baseline.filter(r => !hashes.has(r.kind + '|' + r.id)).map(({ kind, id }) => ({ kind, id })), changed: baseline.filter(r => hashes.has(r.kind + '|' + r.id) && hashes.get(r.kind + '|' + r.id) !== r.hash).map(({ kind, id }) => ({ kind, id })) });
const original = new DatabaseSync('validation/2026-10-13/interview-rescue/private/main-before.sqlite');
const originalRows = original.prepare(sql).all(...kinds).map(({ kind, id, body }) => ({ kind, id, hash: createHash('sha256').update(body).digest('hex') })); original.close();
const predeploy = JSON.parse(readFileSync('validation/2026-10-13/public-acceptance/private/predeploy-hashes.json', 'utf8'));
const sourceMismatch = current.files.filter(r => createHash('sha256').update(readFileSync(r.path)).digest('hex') !== r.hash).map(r => r.path);
const uncommittedSource = files.filter(path => createHash('sha256').update(execFileSync('git', ['show', 'HEAD:' + path])).digest('hex') !== createHash('sha256').update(readFileSync(path)).digest('hex'));
const waveSummary = {};
for (const c of current.calls) { const path = c.path.split('?')[0]; const count = waveSummary[path] ??= { calls: 0, http200: 0, errors: 0 }; count.calls++; if (c.status === 200) count.http200++; if (c.error) count.errors++; }
const state = name => { const s = JSON.parse(execFileSync('docker', ['inspect', name, '--format', '{{json .State}}'], { encoding: 'utf8' })); return { status: s.Status, health: s.Health?.Status }; };
const health = await fetch('http://101.201.237.219:33332/api/health', { signal: AbortSignal.timeout(15000) });
const proof = { observedAt: new Date().toISOString(), publicEntry: 'http://101.201.237.219:33332/', codeCommit: execFileSync('git', ['log', '-1', '--format=%H', '--', 'src'], { encoding: 'utf8' }).trim(), documentationHeadAtTest: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceFiles: files.length, sourceMismatch, uncommittedSource, protectedOriginal: check(originalRows), protectedPredeploy: check(predeploy), app: state('wavesurge_testing-app-1'), desktop: state('wavesurge_testing-desktop-1'), image: execFileSync('docker', ['inspect', 'wavesurge_testing-app-1', '--format', '{{.Image}}'], { encoding: 'utf8' }).trim(), publicHealth: { status: health.status, body: await health.json() }, waveWindow: { from: new Date(from).toISOString(), until: new Date(until).toISOString(), attribution: '两个研究共同执行窗口，接口调用合计，不逐任务分摊', summary: waveSummary, failures: current.calls.filter(c => c.error).map(({ path, status, error }) => ({ path: path.split('?')[0], status, error })) } };
proof.waveOfficialEndpoint = current.waveOfficialEndpoint;
proof.passed = current.waveOfficialEndpoint && !sourceMismatch.length && !uncommittedSource.length && ![proof.protectedOriginal, proof.protectedPredeploy].some(b => b.changed.length || b.missing.length) && proof.app.health === 'healthy' && proof.desktop.health === 'healthy' && proof.publicHealth.status === 200 && proof.publicHealth.body.ok === true;
writeFileSync(out + '/environment.json', JSON.stringify(proof, null, 2)); console.log(JSON.stringify(proof)); if (!proof.passed) process.exitCode = 1;
