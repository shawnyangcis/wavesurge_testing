import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { BrowserPolicy } from './policy.ts';
import { DesktopRuntime } from './runtime.ts';
import { desktopServer } from './server.ts';
export async function startDesktop(env: NodeJS.ProcessEnv) {
  const profile = env.PROFILE_DIR ?? '/state/browser-profile'; const workspace = resolve(profile, '../workspace.json');
  const context = await chromium.launchPersistentContext(profile, { headless: false, handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false, timeout: 30000, executablePath: env.CHROMIUM_PATH ?? '/usr/bin/chromium', viewport: { width: 1440, height: 800 }, acceptDownloads: true, serviceWorkers: 'block', downloadsPath: resolve(profile, '../downloads'), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-component-update', '--window-size=1440,900'] });
  const policy = new BrowserPolicy((env.DESKTOP_ALLOWED_TEST_ORIGINS ?? '').split(',').filter(Boolean));
  await context.route('**/*', async route => { try { if (/^https?:/.test(route.request().url())) await policy.publicUrl(route.request().url()); await route.continue(); } catch { await route.abort('blockedbyclient'); } });
  const runtime = new DesktopRuntime(context, Date.now, randomUUID, url => writeFileSync(workspace, JSON.stringify({ url }), { mode: 0o600 }), policy);
  if (existsSync(workspace)) { const { url } = JSON.parse(readFileSync(workspace, 'utf8')); try { await runtime.command({ action: 'navigate', url }); } catch { /* Retain the saved URL when a site is unavailable. */ } }
  const app = desktopServer(runtime, readFileSync(env.DESKTOP_TOKEN_FILE ?? '/run/studio-secrets/desktop-token', 'utf8'));
  const shutdown = () => { void app.close(); };
  app.addHook('onClose', async () => {
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.removeListener(signal, shutdown);
    runtime.blocked = true; runtime.observation = undefined;
    await context.close(); await runtime.tail;
  });
  await app.listen({ host: '0.0.0.0', port: Number(env.DESKTOP_PORT ?? 8810) });
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.once(signal, shutdown); return app;
}
