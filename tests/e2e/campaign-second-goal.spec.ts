import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
test('另一个营销目标：AI 笔记产品交互形成类型范围，草案不启动外部搜索', async ({ page }) => {
  test.setTimeout(180000);
  const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))"], { encoding: 'utf8' });
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  const state = async () => (await (await page.request.get('/api/state')).json()); await expect.poll(async () => (await state()).active, { timeout: 120000 }).toBe(false); const before = await (await page.request.get('/api/debug')).json(); const title = `AI笔记 Campaign 目标验证 ${Date.now()}`;
  const send = async (text: string) => { await page.getByRole('textbox', { name: '发送消息' }).fill(text); await page.getByRole('button', { name: '发送消息' }).click(); };
  const count = (await state()).messages.filter((m: any) => m.role === 'assistant').length;
  await send(`这是另一个独立 Campaign：我们有一个 AI 笔记应用，希望大学生在课堂整理和考试复习时试用。不沿用降噪耳机的范围，先与我交互澄清必要筛选范围，暂时不要启动任何研究。`);
  await expect.poll(async () => (await state()).messages.filter((m: any) => m.role === 'assistant').length, { timeout: 120000 }).toBeGreaterThan(count); await expect.poll(async () => (await state()).active, { timeout: 120000 }).toBe(false);
  const question = (await state()).messages.filter((m: any) => m.role === 'assistant').at(-1).text; expect(question).toMatch(/平台|国家|地区|人数|多少/);
  await send(`补充确认：英文内容，Creator 所在国家 United States/United Kingdom，YouTube 或 TikTok，粉丝1万至10万，共需2位。请你建议2个互补类型，各需1位，各最多核验2个返回候选；依据公开的文字内容，不推断真实学生身份。请生成与 AI 笔记课堂/复习用途相符的理由和条件，保存标题“${title}”的草案，现在不要启动。`);
  const facts = async () => (await (await page.request.get('/api/campaigns')).json()).find((c: any) => c.title === title); await expect.poll(async () => (await facts())?.id, { timeout: 120000 }).toBeTruthy(); await expect.poll(async () => (await state()).active, { timeout: 120000 }).toBe(false);
  const plan = await (await page.request.get(`/api/campaigns/${(await facts()).id}`)).json(); expect(plan.status).toBe('draft'); expect(plan.childTaskIds).toHaveLength(0); expect(plan.groups).toHaveLength(2); expect(plan.requested).toBe(2); expect(JSON.stringify(plan.groups)).toMatch(/AI|笔记|课堂|复习/); expect(JSON.stringify(plan.groups)).not.toContain('headphone reviewers');
  const after = await (await page.request.get('/api/debug')).json(); expect(after.waveCalls.filter((c: any) => c.method === 'POST')).toHaveLength(before.waveCalls.filter((c: any) => c.method === 'POST').length);
  writeFileSync('validation/2026-10-10/stage-5-second-campaign-goal.json', JSON.stringify({ source: 'actual configured model; independent AI note-taking objective; interactive clarification; persisted draft; no external search', question, plan }, null, 2));
});
