import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
test('真实容器有头浏览器：受控只读 noVNC 桌面', async ({ page }) => {
  test.setTimeout(60000);
  const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))"], { encoding: 'utf8' });
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  await page.getByRole('button', { name: '浏览器桌面' }).click(); const frame = page.frameLocator('iframe[title="持久浏览器桌面"]'); await expect(frame.locator('#noVNC_container canvas')).toBeVisible({ timeout: 30000 }); await expect(frame.locator('#noVNC_status')).toContainText(/Connected|已连接|connected/, { timeout: 30000 });
  await page.screenshot({ path: '.gstack/qa-reports/full-e2e-2026-10-10/isolated-evidence/stage-4-headed-desktop.png', fullPage: true });
  expect((await page.request.post('/api/desktop/viewer', { data: { mode: 'control' } })).status()).toBe(409); await page.getByRole('button', { name: '关闭', exact: true }).click();
});
