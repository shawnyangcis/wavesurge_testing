import { execFileSync } from 'node:child_process';
import { mkdirSync, chmodSync, writeFileSync } from 'node:fs';
import * as prompts from '../../../src/shared/prompts.ts';
const root = 'validation/2026-10-11/chat-prompts';
mkdirSync(`${root}/private`, { recursive: true, mode: 0o700 }); chmodSync(`${root}/private`, 0o700);
export const installations = [
  { name: 'main', url: 'http://127.0.0.1:3000', compose: ['compose'] },
  { name: 'real', url: 'http://127.0.0.1:3600', compose: ['compose', '-p', 'creator-studio-r4-fixes', '-f', 'compose.yaml', '-f', 'validation/2026-10-10/r4-fixes/live-compose.yaml'] }
];
export async function login(installation) {
  const password = execFileSync('docker', [...installation.compose, 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
  const response = await fetch(`${installation.url}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (!response.ok) throw Error(`${installation.name}: login failed ${response.status}`);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  return { password, cookie, get: async path => { const response = await fetch(`${installation.url}${path}`, { headers: { cookie } }); if (!response.ok) throw Error(`${path}: HTTP ${response.status}`); return response.json(); } };
}
if (process.argv[1].endsWith('/preflight.mjs')) {
  const metadata = [];
  for (const installation of installations) {
    const { get } = await login(installation); const state = await get('/api/state'); const settings = await get('/api/settings');
    if (state.active || state.messages.some(m => m.epoch === state.epoch && m.state === 'pending') || state.tasks.some(t => ['running', 'queued', 'needs_input'].includes(t.status))) throw Error(`${installation.name}: active work remains; no restart performed`);
    const filename = `/app/data/chat-prompts-before-${Date.now()}.sqlite`;
    const code = `import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync('/app/data/studio.sqlite'); const rows = db.prepare('SELECT kind,COUNT(*) AS count FROM documents GROUP BY kind').all(); db.exec(${JSON.stringify(`VACUUM INTO '${filename}'`)}); db.close(); console.log(JSON.stringify(rows));`;
    const counts = JSON.parse(execFileSync('docker', [...installation.compose, 'exec', '-T', 'app', 'node', '--input-type=module', '-e', code], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    execFileSync('docker', [...installation.compose, 'cp', `app:${filename}`, `${root}/private/${installation.name}-before.sqlite`], { stdio: 'ignore' }); chmodSync(`${root}/private/${installation.name}-before.sqlite`, 0o600);
    const defaultFields = [['systemPrompt','legacySystemPrompt'],['workflowPrompt','legacyReportWorkflowPrompt'],['verificationPrompt','legacyFactsVerificationPrompt'],['compressionPrompt','legacyCompressionPrompt']].map(([field, previous]) => ({ field, previousDefault: settings[field] === prompts[previous], alreadyCurrent: settings[field] === prompts[field] }));
    metadata.push({ name: installation.name, epoch: state.epoch, tasks: state.tasks.length, messages: state.messages.length, counts, settingsRevision: settings.revision, defaultFields, idle: true });
  }
  writeFileSync(`${root}/before.json`, JSON.stringify(metadata, null, 2)); console.log(JSON.stringify(metadata));
}
