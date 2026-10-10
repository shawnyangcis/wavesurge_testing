# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop-persistence.spec.ts >> 桌面正常重启后同一 profile 的人工验证 Cookie 保留
- Location: .gstack/qa-reports/full-e2e-2026-10-10/cases/desktop-persistence.spec.ts:4:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Test Creator"
Received string:    "Verify you are human"
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { execFileSync } from 'node:child_process';
  3  | import { writeFileSync } from 'node:fs';
  4  | test('桌面正常重启后同一 profile 的人工验证 Cookie 保留', async () => {
  5  |   test.setTimeout(60000); const docker = (...args: string[]) => execFileSync('docker', ['compose', ...args], { encoding: 'utf8' });
  6  |   const observe = () => JSON.parse(docker('exec', '-T', 'desktop', 'node', '-e', "const fs=require('fs'); fetch('http://127.0.0.1:8810/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+fs.readFileSync('/run/studio-secrets/desktop-token','utf8')},body:JSON.stringify({action:'navigate',url:'http://127.0.0.1:8085/'})}).then(r=>r.json()).then(({screenshotBase64,...metadata})=>process.stdout.write(JSON.stringify(metadata)))"));
  7  |   docker('cp', 'tests/fixtures/browser-assistance-server.mjs', 'desktop:/tmp/browser-assistance-server.mjs'); docker('exec', '-d', 'desktop', 'node', '/tmp/browser-assistance-server.mjs');
  8  |   const before = observe(); expect(before.title).toContain('Test Creator'); docker('restart', 'desktop'); await expect.poll(() => docker('exec', '-T', 'desktop', 'node', '-e', "fetch('http://127.0.0.1:8810/health').then(r=>process.stdout.write(String(r.ok))).catch(()=>process.stdout.write('false'))"), { timeout: 45000 }).toBe('true');
> 9  |   docker('exec', '-d', 'desktop', 'node', '/tmp/browser-assistance-server.mjs'); const after = observe(); expect(after.title).toContain('Test Creator'); expect(after.text).toContain('CHIP / CIRCUIT BOARD'); writeFileSync('.gstack/qa-reports/full-e2e-2026-10-10/isolated-evidence/stage-4-profile-restart.json', JSON.stringify({ source: 'same headed Chromium profile; real manual-fixture cookie; graceful Docker restart', before, after }, null, 2));
     |                                                                                                                               ^ Error: expect(received).toContain(expected) // indexOf
  10 | });
  11 | 
```