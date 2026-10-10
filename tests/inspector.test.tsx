// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inspector } from '../src/client/Inspector.tsx';
import { api } from '../src/client/api.ts';
import { readImage } from '../src/client/media.ts';
vi.mock('../src/client/api.ts', () => ({ api: vi.fn() }));
const mocked = vi.mocked(api);
const settings = { baseUrl: 'http://localhost:8317', modelId: 'model', compressionThreshold: 32000, systemPrompt: 'system', workflowPrompt: 'workflow', verificationPrompt: 'verify', compressionPrompt: 'compress', revision: 1 };
beforeEach(() => { mocked.mockReset(); mocked.mockImplementation(async path => path === '/settings' ? settings : {}); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('所有设置字段、密钥保留/更新、关闭和备份；不显示或加载调用记录', async () => {
  const close = vi.fn(); render(<Inspector onClose={close} />); const user = userEvent.setup(); await screen.findByLabelText('模型地址');
  for (const [label, value] of [['模型地址', 'https://model.test/v1'], ['模型名称', 'new-model'], ['系统提示词', 'new-system'], ['工作流提示词', 'new-workflow'], ['逐人核验提示词', 'new-verification'], ['压缩提示词', 'new-compression']]) { await user.clear(screen.getByLabelText(label)); await user.type(screen.getByLabelText(label), value); }
  fireEvent.change(screen.getByLabelText('压缩阈值（估算 Token）'), { target: { value: '5000' } }); await user.click(screen.getByRole('button', { name: '保存设置' }));
  await screen.findByText('已保存，下一次调用生效。'); const first = mocked.mock.calls.find(([path, body]) => path === '/settings' && body)!; expect(first[1]).toMatchObject({ modelId: 'new-model', compressionThreshold: 5000 }); expect(first[1]).not.toHaveProperty('apiKey');
  await user.type(screen.getByLabelText('更新 API Key'), 'new-secret'); await user.click(screen.getByRole('button', { name: '保存设置' })); expect(mocked.mock.calls.at(-1)![1]).toHaveProperty('apiKey', 'new-secret');
  expect(screen.getByRole('link', { name: '下载备份' }).getAttribute('href')).toBe('/api/backup');
  expect(screen.queryByText('实际调用与上下文')).toBeNull(); expect(screen.queryByRole('button', { name: '刷新记录' })).toBeNull();
  expect(mocked.mock.calls.some(([path]) => path === '/debug')).toBe(false);
  await user.click(screen.getByRole('button', { name: '关闭' })); expect(close).toHaveBeenCalledOnce();
});
it('压缩、清空和载入备份，以及所有失败反馈', async () => {
  render(<Inspector onClose={() => {}} />); const user = userEvent.setup(); await screen.findByLabelText('模型地址');
  mocked.mockResolvedValueOnce({ compacted: false }); await user.click(screen.getByRole('button', { name: '压缩旧消息' })); await screen.findByText('当前没有可压缩的旧消息。');
  await user.click(screen.getByRole('button', { name: '清空上下文' })); await screen.findByText('操作已完成。');
  mocked.mockRejectedValueOnce(new Error('reset error')); await user.click(screen.getByRole('button', { name: '清空上下文' })); await screen.findByText('reset error');
  mocked.mockRejectedValueOnce(new Error('save error')); await user.click(screen.getByRole('button', { name: '保存设置' })); await screen.findByText('save error');
  await user.type(screen.getByLabelText('载入备份'), 'invalid'); await user.click(screen.getByRole('button', { name: '载入调试上下文' })); expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('载入备份'), { target: { value: '{"format":"backup"}' } }); await user.click(screen.getByRole('button', { name: '载入调试上下文' })); await screen.findByText('已载入调试上下文，历史工具不会重新执行。');
  mocked.mockRejectedValueOnce(new Error('load error')); await user.click(screen.getByRole('button', { name: '载入调试上下文' })); await screen.findByText('load error');
  expect(mocked.mock.calls.some(([path]) => path === '/debug')).toBe(false);
});
it('设置读取失败', async () => { mocked.mockRejectedValueOnce(new Error('initial error')); render(<Inspector onClose={() => {}} />); await screen.findByText('initial error'); });
it('图片文件读取、类型/大小与 I/O 失败', async () => {
  const image = new File(['png'], 'a.png', { type: 'image/png' }); expect(await readImage(image)).toBe('data:image/png;base64,cG5n');
  await expect(readImage(new File(['text'], 'a.txt', { type: 'text/plain' }))).rejects.toThrow('请选择'); await expect(readImage(new File([new Uint8Array(2000001)], 'a.png', { type: 'image/png' }))).rejects.toThrow('请选择');
  class BrokenReader { onerror!: () => void; readAsDataURL() { this.onerror(); } }
  vi.stubGlobal('FileReader', BrokenReader); await expect(readImage(image)).rejects.toThrow('读取失败');
});
