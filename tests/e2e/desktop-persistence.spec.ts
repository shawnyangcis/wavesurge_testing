import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
test('桌面正常重启后同一 profile 的人工验证 Cookie 保留', async () => {
  test.setTimeout(60000); const docker = (...args: string[]) => execFileSync('docker', ['compose', ...args], { encoding: 'utf8' });
  const observe = () => JSON.parse(docker('exec', '-T', 'desktop', 'node', '-e', "const fs=require('fs'); fetch('http://127.0.0.1:8810/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+fs.readFileSync('/run/studio-secrets/desktop-token','utf8')},body:JSON.stringify({action:'navigate',url:'http://127.0.0.1:8085/'})}).then(r=>r.json()).then(({screenshotBase64,...metadata})=>process.stdout.write(JSON.stringify(metadata)))"));
  docker('cp', 'tests/fixtures/browser-assistance-server.mjs', 'desktop:/tmp/browser-assistance-server.mjs'); docker('exec', '-d', 'desktop', 'node', '/tmp/browser-assistance-server.mjs');
  const before = observe(); expect(before.title).toContain('Test Creator'); docker('restart', 'desktop'); await expect.poll(() => docker('exec', '-T', 'desktop', 'node', '-e', "fetch('http://127.0.0.1:8810/health').then(r=>process.stdout.write(String(r.ok))).catch(()=>process.stdout.write('false'))"), { timeout: 45000 }).toBe('true');
  docker('exec', '-d', 'desktop', 'node', '/tmp/browser-assistance-server.mjs'); const after = observe(); expect(after.title).toContain('Test Creator'); expect(after.text).toContain('CHIP / CIRCUIT BOARD'); writeFileSync('validation/2026-10-10/stage-4-profile-restart.json', JSON.stringify({ source: 'same headed Chromium profile; real manual-fixture cookie; graceful Docker restart', before, after }, null, 2));
});
