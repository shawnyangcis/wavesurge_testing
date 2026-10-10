import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Snapshot } from '../../src/shared/contracts.ts';
test('生产模型：连续输入、工具、图片、热更新和完整上下文管理', async ({ page }) => {
  test.setTimeout(180_000);
  const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'node', '-e', "process.stdout.write(require('fs').readFileSync('/app/data/admin-bootstrap.txt','utf8'))"], { encoding: 'utf8' });
  await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  const snapshot = async (): Promise<Snapshot> => (await page.request.get('/api/state')).json();
  await expect.poll(async () => (await snapshot()).active, { timeout: 120000 }).toBe(false);
  const original = await (await page.request.get('/api/settings')).json();
  original.workflowPrompt = original.workflowPrompt.replace(/\n本轮集成验证标识：STUDIO_\d+。保持真实状态与原有权限。/g, '');
  try {
  const nonce = Date.now(); await page.getByRole('button', { name: '设置与记录' }).click();
  await page.getByLabel('工作流提示词').fill(`${original.workflowPrompt}\n本轮集成验证标识：STUDIO_${nonce}。保持真实状态与原有权限。`);
  await page.getByRole('button', { name: '保存设置' }).click(); await expect(page.getByRole('status')).toHaveText('已保存，下一次调用生效。'); await page.getByRole('button', { name: '关闭' }).click();
  const before = (await snapshot()).messages.filter(message => message.role === 'assistant').length;
  const texts = [`这是一轮聊天集成验证 ${nonce}。请先调用 get_tasks 工具，再说明当前真实任务状态；不要启动筛选任务。`, `补充 ${nonce}：仍只验证对话，请保留原来的请求。`, `最新补充 ${nonce}：请说明你已收到这些补充，不要编造任务进度。`];
  for (const text of texts) { await page.getByRole('textbox', { name: '发送消息' }).fill(text); await page.getByRole('button', { name: '发送消息' }).click(); await expect(page.getByText(text, { exact: true })).toBeVisible(); }
  await expect.poll(async () => (await snapshot()).messages.filter(message => message.role === 'assistant').length, { timeout: 120000 }).toBeGreaterThan(before);
  await expect.poll(async () => (await snapshot()).active, { timeout: 120000 }).toBe(false);
  const state = await snapshot(); for (const text of texts) expect(state.messages.find(message => message.text === text)?.state).toBe('delivered');
  const debug = await (await page.request.get('/api/debug')).json(); expect(debug.calls.some((record: any) => record.request.messages.some((message: any) => typeof message.content === 'string' && message.content.includes(`STUDIO_${nonce}`)))).toBe(true);
  expect(debug.calls.some((record: any) => record.response?.choices?.[0]?.message?.tool_calls?.some((call: any) => call.function.name === 'get_tasks'))).toBe(true);
  expect(debug.batches.some((batch: any) => batch.messages.some((message: any) => message.role === 'tool'))).toBe(true);
  await page.getByLabel('添加图片').setInputFiles({ name: 'two-colors.png', mimeType: 'image/png', buffer: readFileSync('tests/fixtures/two-colors.png') });
  await page.getByRole('textbox', { name: '发送消息' }).fill(`图片验证 ${nonce}：请只描述图中左右两半的颜色，不要执行筛选任务。`); const count = state.messages.filter(message => message.role === 'assistant').length; await page.getByRole('button', { name: '发送消息' }).click();
  await expect(page.getByAltText('参考图片 1').last()).toBeVisible();
  await expect.poll(async () => (await snapshot()).messages.filter(message => message.role === 'assistant').length, { timeout: 120000 }).toBeGreaterThan(count);
  await expect.poll(async () => (await snapshot()).active, { timeout: 120000 }).toBe(false);
  const vision = (await snapshot()).messages.filter(message => message.role === 'assistant').at(-1)!.text; expect(vision).toContain('绿'); expect(vision).toContain('蓝');
  await page.getByRole('button', { name: '设置与记录' }).click(); await page.getByRole('button', { name: '压缩旧消息' }).click(); await expect(page.getByRole('status')).toHaveText('操作已完成。', { timeout: 120000 });
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('link', { name: '下载备份' }).click(); const download = await downloadPromise; const path = test.info().outputPath('context.json'); await download.saveAs(path); const backup = JSON.parse(readFileSync(path, 'utf8')); expect(backup.format).toBe('creator-studio/1'); expect(backup.checkpoint.text).toBeTruthy();
  await page.getByRole('button', { name: '清空上下文' }).click(); await expect.poll(async () => (await (await page.request.get('/api/debug')).json()).batches.length).toBe(0);
  const callsBefore = (await (await page.request.get('/api/debug')).json()).calls.length;
  await page.getByLabel('载入备份').fill(JSON.stringify(backup)); await page.getByRole('button', { name: '载入调试上下文' }).click(); await expect(page.getByRole('status')).toHaveText('已载入调试上下文，历史工具不会重新执行。');
  const loaded = await (await page.request.get('/api/debug')).json(); expect(loaded.calls).toHaveLength(callsBefore); expect(loaded.batches.length).toBeGreaterThan(0);
  await page.getByText('展开完整请求、返回和工具消息').click(); await page.screenshot({ path: 'validation/2026-10-10/stage-2-debug.png', fullPage: true });
  writeFileSync('validation/2026-10-10/stage-2-live-model.json', JSON.stringify({ source: 'production compose + configured real model', nonce, vision, calls: loaded.calls, checkpoint: loaded.checkpoint, tools: loaded.batches }, null, 2));
  await page.getByRole('button', { name: '关闭' }).click(); await page.screenshot({ path: 'validation/2026-10-10/stage-2-chat.png', fullPage: true });
  } finally {
    const current = await (await page.request.get('/api/settings')).json(); expect((await page.request.post('/api/settings', { data: { ...original, revision: current.revision } })).status()).toBe(200);
  }
});
