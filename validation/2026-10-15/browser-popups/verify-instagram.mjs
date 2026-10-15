import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DesktopRuntime } from '../../../src/desktop/runtime.ts';
import { BrowserPolicy } from '../../../src/desktop/policy.ts';

const root = 'validation/2026-10-15/browser-popups/private/instagram';
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const policy = new BrowserPolicy();
const runtime = new DesktopRuntime(context, Date.now, randomUUID, () => {}, policy);
const urls = ['https://www.instagram.com/', 'https://www.instagram.com/instagram/', 'https://www.instagram.com/p/Ddhf9JBJY7u/'];
policy.scope(urls);
const evidence = [];
try {
  for (let i = 0; i < urls.length; i++) {
    const result = { requestedUrl: urls[i], actions: [], startedAt: new Date().toISOString() };
    try {
      await runtime.command({ action: 'navigate', url: urls[i] });
      const page = await runtime.page();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      let observation = await runtime.command({ action: 'observe' });
      result.before = { url: observation.url, title: observation.title, text: observation.text, controls: observation.controls, dialogCount: observation.dialogCount };
      await page.screenshot({ path: `${root}/${i}-before.png` });
      const attempts = new Set();
      for (let step = 0; step < 3; step++) {
        const close = observation.controls?.find(control => control.dismiss && !attempts.has(control.label));
        if (!close) break;
        attempts.add(close.label);
        result.actions.push({ action: 'click', label: close.label, observationId: observation.observationId });
        observation = await runtime.command({ action: 'click', selector: close.selector, observationId: observation.observationId });
      }
      result.after = { url: observation.url, title: observation.title, text: observation.text, controls: observation.controls, dialogCount: observation.dialogCount };
      await page.screenshot({ path: `${root}/${i}-after.png` });
      result.status = result.actions.length ? 'dismissal_attempted_and_reobserved' : 'observed_no_dismiss_control';
    } catch (error) { result.status = 'access_error'; result.error = error.message; }
    result.finishedAt = new Date().toISOString(); evidence.push(result);
    console.log(JSON.stringify({ requestedUrl: result.requestedUrl, status: result.status, actionCount: result.actions.length, title: result.after?.title, error: result.error }));
    writeFileSync(`${root}/evidence.json`, JSON.stringify({ kind: 'actual Instagram with fresh unauthenticated Chromium; no synthetic pages or account login', evidence }, null, 2));
  }
} finally { await context.close(); await browser.close(); }
