test.skip(!process.env.RECOVERY_CAMPAIGN_ID, '历史数据回归需要显式提供 RECOVERY_CAMPAIGN_ID；全新部署请运行 pnpm e2e');
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
test('远端短缺保留真实报告；修正独立画像后同一目标可重新规划和搜索', async ({ page }) => {
  test.setTimeout(180000); const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))"], { encoding: 'utf8' });
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  const original = await (await page.request.get(`/api/campaigns/${process.env.RECOVERY_CAMPAIGN_ID}`)).json(); expect(original.status).toBe('partial'); expect(original.matched).toBe(0);
  const report = await page.request.get(original.reportUrl); expect(await report.text()).toContain('去重入选 0/2');
  await page.getByRole('textbox', { name: '发送消息' }).fill(`独立搜索画像回归：保留原 Campaign 及其真实 0/2 报告。请为同一大学生降噪耳机目标另建草案，标题“耳机 Campaign 独立候选发现”，仍是 Instagram、Canada/United States、1万至10万粉丝，两组各需1位，候选各最多2位，总预算4，无邮箱、无外联。两组分别科技/耳机评测、学习/效率生活，必选文字条件。personaText 必须只用简短候选画像：第一组 "technology and headphone reviewers"，第二组 "study and productivity creators"。绝不在 personaText 写最终人数、核验预算、跨组去重或其它组名单；跨组去重由本地系统完成。保存草案，现在不要启动。`); await page.getByRole('button', { name: '发送消息' }).click();
  const facts = async () => (await (await page.request.get('/api/campaigns')).json()).find((c: any) => c.title === '耳机 Campaign 独立候选发现'); await expect.poll(async () => (await facts())?.id, { timeout: 120000 }).toBeTruthy();
  const id = (await facts()).id; const draft = await (await page.request.get(`/api/campaigns/${id}`)).json(); expect(draft.groups.map((g: any) => g.spec.personaText)).toEqual(['technology and headphone reviewers', 'study and productivity creators']); expect(draft.childTaskIds).toHaveLength(0);
  await page.getByRole('button', { name: 'Campaign 方案', exact: true }).click(); const card = page.getByRole('dialog', { name: 'Campaign 方案' }).locator('.task').filter({ hasText: draft.title }); await card.getByRole('button', { name: '查看方案与配额' }).click(); await page.getByRole('button', { name: '确认此方案并开始研究' }).click(); const plan = async () => (await (await page.request.get(`/api/campaigns/${id}`)).json()); await expect.poll(async () => (await plan()).childTaskIds.length).toBe(2);
  writeFileSync('validation/2026-10-10/stage-5-independent-search-start.json', JSON.stringify({ source: 'actual model / preserved failed campaign / corrected independent discovery intent / real API', original, draft, started: await plan() }, null, 2));
});
