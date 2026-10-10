import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
test('重叠候选经真实模型/浏览器核验：配额 2/2、唯一账号 2、报告逐组引用', async ({ page }) => {
  test.setTimeout(300000);
  const docker = (...args: string[]) => execFileSync('docker', ['compose', ...args], { encoding: 'utf8' });
  const password = docker('exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))");
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  docker('cp', 'tests/fixtures/seed-campaign.ts', 'app:/app/data/fixtures/seed-campaign.ts'); const id = process.env.CAMPAIGN_TASK_ID ?? docker('exec', '-T', 'app', 'node', 'data/fixtures/seed-campaign.ts', `dedup-${Date.now()}`);
  const get = async () => (await (await page.request.get(`/api/campaigns/${id}`)).json()); await expect.poll(async () => (await get()).status, { timeout: 240000, intervals: [2000] }).toBe('completed');
  const summary = await get(); expect(summary.matched).toBe(2); expect(summary.qualifyingUnique).toBe(2); expect(summary.evaluated).toBe(3); expect(summary.groups.map((g: any) => g.matched)).toEqual([1, 1]); expect(new Set(summary.selections.map((s: any) => s.creatorId)).size).toBe(2);
  const debug = await (await page.request.get('/api/debug')).json(); expect(debug.waveCalls.filter((c: any) => c.method === 'POST' && summary.childTaskIds.includes(c.request?.requestId))).toHaveLength(0);
  const shared = summary.selections.find((s: any) => s.creatorId === 'instagram:fixture-campaign-shared'); expect(shared.groupId).toBe('study'); expect(shared.resultId).toContain(summary.childTaskIds[1]); expect(summary.results.every((r: any) => r.creator.evidence.some((e: any) => e.assetId))).toBe(true);
  await page.getByRole('button', { name: 'Campaign 方案', exact: true }).click(); const card = page.getByRole('dialog', { name: 'Campaign 方案' }).locator('.task').filter({ hasText: summary.title }); await expect(card).toContainText('去重入选 2/2'); await card.getByRole('button', { name: '查看方案与配额' }).click();
  const popupPromise = page.waitForEvent('popup'); await page.getByRole('link', { name: '查看去重汇总报告' }).click(); const popup = await popupPromise; await expect(popup.getByText(/去重入选 2\/2/)).toBeVisible(); await expect(popup.getByRole('link', { name: /@fixture-campaign-shared/ })).toHaveCount(1); await expect(popup.getByRole('link', { name: /@fixture-campaign-only-a/ })).toHaveCount(1); await popup.screenshot({ path: 'validation/2026-10-10/stage-5-dedup-report.png', fullPage: true }); await popup.close();
  writeFileSync('validation/2026-10-10/stage-5-dedup-e2e.json', JSON.stringify({ source: 'explicit controlled candidate fixture, NOT WaveSurge discovery; actual configured model + production headed browser + real worker + reports', summary }, null, 2));
});
