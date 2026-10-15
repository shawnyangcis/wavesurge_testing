import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = 'validation/2026-10-15/browser-popups/private'; mkdirSync(root, { recursive: true });
const auditOnly = process.argv.includes('--audit-only');
const lockPath = `${root}/deploy.lock`;
if (!auditOnly) {
  try { const lock = openSync(lockPath, 'wx', 0o600); writeFileSync(lock, String(process.pid)); closeSync(lock); }
  catch (error) { if (error.code === 'EEXIST') throw Error('A deployment lock already exists; do not start a concurrent deployment.'); throw error; }
  process.on('exit', () => { try { unlinkSync(lockPath); } catch { /* Already removed. */ } });
}
const docker = args => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000 });
const execute = args => { const r = spawnSync('docker', args, { stdio: 'inherit' }); if (r.status !== 0) throw Error(`Docker operation failed (${r.status})`); };
const query = code => JSON.parse(docker(['exec', 'wavesurge_testing-app-1', 'node', '--input-type=module', '-e', code]));
const metadata = `import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const tasks=db.prepare('SELECT id,body FROM task_states ORDER BY id').all().map(row=>({kind:'task-state',id:row.id,sha256:hash(row.body),status:JSON.parse(row.body).status}));
// IDs use the covering primary-key index; large raw provider payloads are
// preserved by the full SQLite backup rather than decoded during this check.
const rows=db.prepare("SELECT kind,id FROM documents WHERE kind IN ('result','result-history','message','campaign','assistance') ORDER BY kind,id").all();
const s=JSON.parse(db.prepare("SELECT body FROM documents WHERE kind='settings' AND id='model'").get().body);
const auth=db.prepare("SELECT kind,id,body FROM documents WHERE kind='settings' AND id!='model' ORDER BY id").all().map(row=>({kind:row.kind,id:row.id,sha256:hash(row.body)}));
const state={tasks,rows,auth,settingsRevision:s.revision,modelConfigHash:hash(JSON.stringify([s.baseUrl,s.modelId,s.apiKey])),prompts:{selfService:s.systemPrompt.includes('先自行处理可关闭'),textRecords:s.systemPrompt.includes('可靠文字资料'),noAppearanceInference:s.systemPrompt.includes('不能从照片'),verificationSelfService:s.verificationPrompt.includes('先自行处理可关闭')}};
console.log(JSON.stringify(state));db.close();`;

let images = {};
let before;
let backup;
let retried;
if (auditOnly) {
  const saved = JSON.parse(readFileSync(`${root}/before.json`, 'utf8')); images = saved.images; before = saved;
  backup = JSON.parse(readFileSync(`${root}/backup.json`, 'utf8'));
  retried = query(`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});const retried=db.prepare("SELECT body FROM documents WHERE kind='assistance'").all().map(row=>JSON.parse(row.body)).filter(item=>item.outcome?.startsWith('系统更新：旧协助请求尚未被人工认领')).map(item=>({requestId:item.id,taskId:item.taskId}));db.close();console.log(JSON.stringify({retried}));`);
} else {
for (const service of ['app', 'desktop']) {
  images[service] = docker(['inspect', '--format', '{{.Image}}', `wavesurge_testing-${service}-1`]).trim();
  docker(['image', 'tag', images[service], `creator-studio-${service}:before-popup-20261015`]);
}
before = query(metadata); writeFileSync(`${root}/before.json`, JSON.stringify({ ...before, images }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ stage: 'snapshot', taskCount: before.tasks.length, records: before.rows.length, modelRevision: before.settingsRevision }));
execute(['compose', 'build', 'app', 'desktop']);
execute(['compose', 'stop', 'app']);
let online = false;
try {
  const backupCode = `import {DatabaseSync,backup} from 'node:sqlite';import {mkdirSync,chmodSync} from 'node:fs';const db=new DatabaseSync('/app/data/studio.sqlite',{readOnly:true});mkdirSync('/app/data/backups',{recursive:true});const path='/app/data/backups/pre-popup-20261015-${Date.now()}.sqlite';await backup(db,path);chmodSync(path,0o600);db.close();console.log(JSON.stringify({path}));`;
  backup = JSON.parse(docker(['run', '--rm', '--network', 'none', '--volumes-from', 'wavesurge_testing-app-1', 'creator-studio-app:local', 'node', '--input-type=module', '-e', backupCode]));
  writeFileSync(`${root}/backup.json`, JSON.stringify(backup)); console.log(JSON.stringify({ stage: 'backup', completed: true }));
  const code = `import {Store} from './src/server/store.ts';
const store=new Store('/app/data/studio.sqlite');const retried=[];
store.transaction(()=>{for(const request of store.list('assistance')){if(request.status!=='pending')continue;const task=store.get('task',request.taskId);if(!task||task.status!=='needs_input')continue;
request.status='done';request.outcome='系统更新：旧协助请求尚未被人工认领，恢复原候选先自行关闭可关闭登录邀请；未进行人工登录，未声明验证成功。仍需人工登录或验证时按最新许可重新申请。';store.set('assistance',request.id,request);
task.status='running';task.nextPollAt=0;task.updatedAt=Date.now();task.detail='浏览器处理已更新，原候选将先重新观察并尝试自行关闭弹窗';store.set('task',task.id,task);
const id='assistance-retry-'+request.id,epoch=store.get('settings','epoch')??0,text='浏览器弹窗处理已更新。尚未被人工接管的旧协助请求已交回Agent，原任务将先重新观察并尝试关闭可关闭提示；尚未确认登录或验证成功。确实仍需人工操作时会再说明原因。';
if(!store.get('message',id)){store.set('message',id,{id,role:'assistant',text,createdAt:Date.now(),epoch,state:'delivered',attachments:[]});store.set('batch',id,{id,epoch,messages:[{role:'assistant',content:text}],inputIds:[]});}retried.push({requestId:request.id,taskId:task.id});}});store.close();console.log(JSON.stringify({retried}));`;
  retried = JSON.parse(docker(['compose', 'run', '--rm', '--no-deps', '-T', 'app', 'node', '--input-type=module', '-e', code]));
  execute(['compose', 'up', '-d', '--no-deps', '--wait', '--wait-timeout', '120', 'desktop', 'app']); online = true;
} finally {
  if (!online) { console.error('Update interrupted; starting the app to preserve availability.'); execute(['compose', 'up', '-d', '--no-deps', 'app']); }
}
}
if (!auditOnly) {
  const upgraded = spawnSync(process.execPath, ['validation/2026-10-15/browser-popups/upgrade-active-prompts.mjs'], { stdio: 'inherit' });
  if (upgraded.status !== 0) throw Error('Active prompt upgrade did not pass verification');
}
const after = query(metadata);
const key = row => row.kind + '|' + row.id;
const current = new Map([...after.tasks, ...after.rows, ...after.auth].map(row => [key(row), row.sha256]));
const missing = [...before.tasks, ...before.rows, ...before.auth].filter(row => !current.has(key(row))).map(key);
const changedTerminalTasks = before.tasks.filter(row => ['completed', 'partial', 'failed', 'cancelled'].includes(row.status) && current.get(key(row)) !== row.sha256).map(key);
const authChanged = before.auth.filter(row => current.get(key(row)) !== row.sha256).map(key);
const sourceFiles = readdirSync('src', { recursive: true }).filter(path => /\.(ts|tsx|css)$/.test(path));
const sources = query(`import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(sourceFiles)}.map(path=>[path,createHash('sha256').update(readFileSync('/app/src/'+path)).digest('hex')]))));`);
const sourceMismatches = sourceFiles.filter(path => createHash('sha256').update(readFileSync('src/' + path)).digest('hex') !== sources[path]);
const health = await fetch('http://101.201.237.219:33332/api/health', { signal: AbortSignal.timeout(20000) });
const report = { observedAt: new Date().toISOString(), backup: backup.path, retried, preservedRecords: before.tasks.length + before.rows.length + before.auth.length, missing, changedTerminalTasks, authChanged, modelConfigurationPreserved: before.modelConfigHash === after.modelConfigHash, revisionBefore: before.settingsRevision, revisionAfter: after.settingsRevision, prompts: after.prompts, sourceFiles: sourceFiles.length, sourceMismatches, publicHealth: { status: health.status, body: await health.json() }, imagesBefore: images, imagesAfter: Object.fromEntries(['app', 'desktop'].map(service => [service, docker(['inspect', '--format', '{{.Image}}', `wavesurge_testing-${service}-1`]).trim()])) };
report.passed = !missing.length && !changedTerminalTasks.length && !authChanged.length && report.modelConfigurationPreserved && !sourceMismatches.length && health.ok && Object.values(after.prompts).every(Boolean);
writeFileSync(`${root}/release.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exitCode = 1;
