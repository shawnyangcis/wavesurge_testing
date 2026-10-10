import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const root = '.gstack/qa-reports/full-e2e-2026-10-10';
const suffix = process.env.PERSISTENCE_AUDIT_SUFFIX ?? '';
const docker = (...args) => execFileSync('docker', ['compose', '-p', 'creator-studio-review-e2e', '-f', 'compose.yaml', '-f', root + '/compose.override.yaml', ...args], { encoding: 'utf8' });
const rpcProgram = "const fs=require('fs');fetch('http://127.0.0.1:8810/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+fs.readFileSync('/run/studio-secrets/desktop-token','utf8')},body:process.argv[1]}).then(async r=>{const v=await r.json();delete v.screenshotBase64;if(!r.ok)throw Error(v.error);process.stdout.write(JSON.stringify(v))}).catch(e=>{process.stderr.write(e.message);process.exit(1)})";
const command = body => JSON.parse(docker('exec', '-T', 'desktop', 'node', '-e', rpcProgram, JSON.stringify(body)));
const delay = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const output = { startedAt: new Date().toISOString(), source: 'controlled fixture, actual headed production Chromium/runtime, real noVNC, three normal Docker restarts; no real platform login', rounds: [] };
const save = () => writeFileSync(root + '/persistence-audit' + suffix + '.json', JSON.stringify(output, null, 2));
try {
  docker('cp', root + '/persistence-fixture.mjs', 'desktop:/tmp/persistence-fixture.mjs');
  docker('exec', '-d', 'desktop', 'node', '/tmp/persistence-fixture.mjs');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const password = docker('exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt').trim();
  await page.goto('http://127.0.0.1:3300'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await page.getByLabel('研究对话').waitFor();
  await page.getByRole('button', { name: '浏览器桌面', exact: true }).click();
  const canvas = page.frameLocator('iframe[title="持久浏览器桌面"]').locator('#noVNC_container canvas'); await canvas.waitFor();
  const readyCanvas = async () => { await canvas.waitFor(); await page.frameLocator('iframe[title="持久浏览器桌面"]').locator('#noVNC_status').filter({ hasText: /Connected|connected|已连接/ }).waitFor(); const end = Date.now() + 10000; while (Date.now() < end) { const white = await canvas.evaluate(c => { const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let count = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 240 && pixels[i + 1] > 240 && pixels[i + 2] > 240) count++; return count; }); if (white > 100000) { await delay(500); return; } await delay(300); } throw Error('VNC canvas has not painted actual page'); };
  for (const [round, settleMs] of (suffix ? [3000] : [0, 0, 8000]).entries()) {
    const key = 'persistence_review_' + Date.now(); const url = 'http://127.0.0.1:8086/?case=' + key;
    const initial = command({ action: 'navigate', url });
    const before = command({ action: 'click', selector: '#save-state', observationId: initial.observationId });
    if (!before.text.includes('"persistentCookie": "persistent_' + key + '=test_value"')) throw Error('fixture cookie not set');
    await delay(settleMs);
    await page.getByRole('button', { name: '重新连接桌面' }).click(); await readyCanvas();
    await page.screenshot({ path: root + '/screenshots/persistence-round-' + (round + 1) + suffix + '-before.png', fullPage: true });
    docker('restart', 'desktop');
    const end = Date.now() + 45000;
    while (Date.now() < end) {
      const healthy = docker('exec', '-T', 'desktop', 'node', '-e', "fetch('http://127.0.0.1:8810/health').then(r=>process.stdout.write(String(r.ok))).catch(()=>process.stdout.write('false'))").trim();
      if (healthy === 'true') break; await delay(600);
    }
    docker('exec', '-d', 'desktop', 'node', '/tmp/persistence-fixture.mjs'); await delay(400);
    const after = command({ action: 'navigate', url });
    await page.getByRole('button', { name: '重新连接桌面' }).click(); await readyCanvas();
    await page.screenshot({ path: root + '/screenshots/persistence-round-' + (round + 1) + suffix + '-after.png', fullPage: true });
    const kept = { persistentCookie: after.text.includes('persistent_' + key + '=test_value'), localStorage: after.text.includes('"localStorage": "test_value"'), sessionCookie: after.text.includes('session_' + key + '=test_value') };
    output.rounds.push({ round: round + 1, settleMs, before, after, kept }); save();
    console.log(JSON.stringify({ round: round + 1, settleMs, kept }));
  }
  output.finishedAt = new Date().toISOString(); save();
} catch (error) { output.error = error.message; save(); throw error; } finally { await browser.close(); }
