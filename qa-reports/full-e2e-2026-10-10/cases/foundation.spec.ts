import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
test('生产 compose 登录、连续消息、刷新、退出与移动端', async ({ page, request }) => {
  const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))"], { encoding: 'utf8' });
  expect((await request.get('/api/state')).status()).toBe(401);
  await page.goto('/'); await page.getByLabel('管理员密码').fill('wrong'); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByRole('alert')).toHaveText('密码不正确');
  await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  const nonce = Date.now();
  const texts = [`界面验证 ${nonce} 第一条：只回复收到，不启动任务。`, `界面验证 ${nonce} 第二条：只补充对话，不取消任务。`, `界面验证 ${nonce} 第三条：只回复已收到三条消息。`];
  for (const text of texts) {
    await page.getByRole('textbox', { name: '发送消息' }).fill(text); await page.getByRole('button', { name: '发送消息' }).click(); await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
  execFileSync('docker', ['compose', 'restart', 'app'], { stdio: 'pipe' });
  await expect.poll(async () => { try { return (await page.request.get('/api/health')).status(); } catch { return 0; } }).toBe(200);
  await page.reload(); await expect(page.getByText(texts[1], { exact: true })).toBeVisible();
  const persisted = (await (await page.request.get('/api/state')).json()).messages;
  for (const text of texts) expect(persisted.filter((message: { text: string }) => message.text === text)).toHaveLength(1);
  await expect.poll(async () => page.evaluate(() => { const pane = document.querySelector('.messages')!; return pane.scrollHeight - pane.scrollTop - pane.clientHeight; })).toBeLessThan(80);
  const fit = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, composer: document.querySelector('.composer')!.getBoundingClientRect().bottom, height: innerHeight }));
  expect(fit.width).toBeLessThanOrEqual(fit.viewport); expect(fit.composer).toBeLessThanOrEqual(fit.height);
  await page.screenshot({ path: '.gstack/qa-reports/full-e2e-2026-10-10/isolated-evidence/stage-1-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole('button', { name: '发送消息' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(await page.evaluate(() => document.querySelector('.composer')!.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  await page.screenshot({ path: '.gstack/qa-reports/full-e2e-2026-10-10/isolated-evidence/stage-1-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '退出' }).click(); await expect(page.getByLabel('管理员密码')).toBeVisible();
  expect((await page.request.get('/api/state')).status()).toBe(401);
});
