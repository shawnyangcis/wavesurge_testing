import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const root = 'validation/2026-10-15/browser-popups/private'; mkdirSync(root, { recursive: true });
const name = `creator-studio-popup-qa-${Date.now()}`;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).trim();
const html = readFileSync('tests/fixtures/browser-popup.html', 'utf8');
const launch = `import {writeFileSync} from 'node:fs';import {randomBytes} from 'node:crypto';import {spawn} from 'node:child_process';import {createServer} from 'node:http';createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(${JSON.stringify(html)});}).listen(8088,'127.0.0.1');const token=randomBytes(32).toString('hex');for(const path of ['/tmp/popup-token','/run/studio-secrets/desktop-token'])writeFileSync(path,token,{mode:0o600});const child=spawn('/app/desktop-entrypoint.sh',[],{stdio:'inherit'});process.on('SIGTERM',()=>child.kill('SIGTERM'));child.on('exit',code=>process.exit(code??0));`;
let started = false; let passed = false;
try {
  docker(['run', '-d', '--name', name, '--shm-size=512m', '--tmpfs', '/run/studio-secrets:mode=1777', '-p', '127.0.0.1::8810', '-e', 'DESKTOP_TOKEN_FILE=/tmp/popup-token', '-e', 'DESKTOP_ALLOWED_TEST_ORIGINS=http://127.0.0.1:8088', '--entrypoint', 'node', 'creator-studio-desktop:local', '--input-type=module', '-e', launch]); started = true;
  const mapping = docker(['port', name, '8810/tcp']); const url = `http://${mapping}`;
  let ready = false;
  for (let retry = 0; retry < 60; retry++) {
    try { ready = (await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) })).ok; } catch { /* Headed browser starts before HTTP readiness. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!ready) throw Error('Isolated headed desktop did not become healthy');
  const results = [];
  for (const target of ['fixture', 'instagram']) {
    const result = spawnSync(process.execPath, ['validation/2026-10-15/browser-popups/verify-model-instagram.mjs'], { env: { ...process.env, QA_DESKTOP_CONTAINER: name, QA_DESKTOP_URL: url, QA_MODEL_TARGET: target }, stdio: 'inherit' });
    results.push({ target, passed: result.status === 0 });
  }
  passed = results.every(result => result.passed);
  const image = docker(['inspect', '--format', '{{.Image}}', name]);
  writeFileSync(`${root}/headed-container.json`, JSON.stringify({ observedAt: new Date().toISOString(), image, isolatedFreshProfile: true, actualModel: true, actualInstagram: true, results, passed }, null, 2));
} finally {
  if (started) { docker(['stop', '--time', '30', name]); docker(['rm', name]); }
}
if (!passed) process.exitCode = 1;
