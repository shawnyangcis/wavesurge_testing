test.skip(!process.env.CAMPAIGN_TASK_ID, '历史数据回归需要显式提供 CAMPAIGN_TASK_ID；全新部署请运行 pnpm e2e');
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const id = (process.env.CAMPAIGN_TASK_ID ?? '');
test('真实远端短缺：总/分组报告如实 0/2，刷新与重启不重复提交', async ({ page }) => {
  test.setTimeout(60000); const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))"], { encoding: 'utf8' });
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  const get = async () => (await (await page.request.get(`/api/campaigns/${id}`)).json()); const campaign = await get(); expect(campaign.status).toBe('partial'); expect(campaign.matched).toBe(0); expect(campaign.requested).toBe(2);
  await page.getByRole('button', { name: 'Campaign 方案', exact: true }).click(); const card = page.getByRole('dialog', { name: 'Campaign 方案' }).locator('.task').filter({ hasText: campaign.title }); await expect(card).toContainText('部分完成'); await expect(card).toContainText('去重入选 0/2'); await card.getByRole('button', { name: '查看方案与配额' }).click(); await expect(page.locator('.campaign-detail .finding')).toHaveCount(2);
  const popupPromise = page.waitForEvent('popup'); await page.getByRole('link', { name: '查看去重汇总报告' }).click(); const popup = await popupPromise; await expect(popup.getByText(/去重入选 0\/2/)).toBeVisible(); await popup.screenshot({ path: 'validation/2026-10-10/stage-5-real-shortfall-report.png', fullPage: true }); await popup.close();
  for (const taskId of campaign.childTaskIds) { const report = await page.request.get(`/api/reports/${taskId}`); expect(report.status()).toBe(200); expect(await report.text()).toContain('合格候选 0 人'); }
  const debug = await (await page.request.get('/api/debug')).json();
  execFileSync('docker', ['compose', 'restart', 'app']); await expect.poll(async () => { try { return (await page.request.get('/api/health')).status(); } catch { return 0; } }, { timeout: 45000 }).toBe(200); await page.reload(); expect((await get()).childTaskIds).toEqual(campaign.childTaskIds); expect((await get()).matched).toBe(0); const after = await (await page.request.get('/api/debug')).json(); for (const taskId of campaign.childTaskIds) expect(after.waveCalls.filter((c: any) => c.method === 'POST' && c.request?.requestId === taskId)).toHaveLength(1);
  writeFileSync('validation/2026-10-10/stage-5-real-shortfall-e2e.json', JSON.stringify({ source: 'actual WaveSurge zero candidate completion + production UI + Docker restart', campaign, calls: debug.waveCalls }, null, 2));
});
