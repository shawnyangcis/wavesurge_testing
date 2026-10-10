test.skip(!process.env.ASSISTANCE_TASK_ID || !process.env.ASSISTANCE_CREATOR_ID, '真实平台人工回归需要明确的当前协助任务和账号');
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
test('真实 WaveSurge 候选的 Instagram 注册弹窗：通过 noVNC 关闭后原候选重新观察', async ({ page }) => {
  test.setTimeout(180000);
  const docker = (...args: string[]) => execFileSync('docker', ['compose', ...args], { encoding: 'utf8' });
  const password = docker('exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))");
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  const before = await (await page.request.get('/api/desktop')).json(); expect(before.request.taskId).toBe(process.env.ASSISTANCE_TASK_ID); expect(before.request.creatorId).toBe(process.env.ASSISTANCE_CREATOR_ID);
  await page.getByRole('button', { name: '浏览器桌面', exact: true }).click(); await expect(page.getByText(/^原候选：/)).toBeVisible(); await page.getByRole('button', { name: '接管并协助' }).click(); await expect(page.getByText('你已认领协助。Agent 已暂停桌面输入，连接成功后可操作浏览器。')).toBeVisible();
  await expect(page.locator('iframe[title="持久浏览器桌面"]')).toHaveAttribute('src', /\/control\//);
  const frame = page.frameLocator('iframe[title="持久浏览器桌面"]'); const canvas = frame.locator('#noVNC_container canvas'); await expect(canvas).toBeVisible({ timeout: 30000 }); await expect(frame.locator('#noVNC_status')).toContainText(/Connected|connected|已连接/, { timeout: 30000 }); await expect.poll(() => canvas.evaluate(c => (c as HTMLCanvasElement).width)).toBe(1440);
  await expect.poll(() => canvas.evaluate(c => { const pixels = (c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 1440, 900).data; let white = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 240 && pixels[i + 1] > 240 && pixels[i + 2] > 240) white++; return white; }), { timeout: 10000 }).toBeGreaterThan(100000);
  await page.screenshot({ path: 'validation/2026-10-10/stage-5-real-instagram-vnc-before.png', fullPage: true }); const box = (await canvas.boundingBox())!;
  // Both close controls were visually observed in stage-5-real-instagram-challenge.png.
  await canvas.click({ position: { x: box.width * 958 / 1440, y: box.height * 328 / 900 } }); await canvas.click({ position: { x: box.width * 1410 / 1440, y: box.height * 93 / 900 } });
  await page.screenshot({ path: 'validation/2026-10-10/stage-5-real-instagram-vnc-after.png', fullPage: true });
  await page.getByLabel('协助结果').fill('已关闭遮挡公开帖子的注册弹窗和浏览器恢复提示，仍在 khushleenvirk 的同一公开帖子。未登录；请重新观察。如仍有访问限制，请跳过保持 unknown，不再请求重复协助。'); await page.getByRole('button', { name: '完成协助，交还 Agent' }).click();
  const task = async () => (await (await page.request.get('/api/state')).json()).tasks.find((t: any) => t.id === before.request.taskId); await expect.poll(async () => (await task()).status, { timeout: 120000 }).toMatch(/completed|partial/);
  const results = await (await page.request.get(`/api/results?taskId=${before.request.taskId}`)).json(); const person = results.find((r: any) => r.creator.id === before.request.creatorId); expect(person).toBeTruthy(); expect(person.creator.evidence.some((e: any) => e.assetId)).toBe(true);
  writeFileSync('validation/2026-10-10/stage-5-real-instagram-assistance.json', JSON.stringify({ source: 'actual WaveSurge candidate + actual Instagram public post + actual noVNC close operation + real model fresh observation; no account login performed', assistance: before.request, task: await task(), results }, null, 2));
});
