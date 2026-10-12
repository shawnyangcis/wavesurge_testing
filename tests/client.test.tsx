// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/client/App.tsx';
import { api } from '../src/client/api.ts';
import type { Snapshot } from '../src/shared/contracts.ts';
vi.mock('../src/client/api.ts', () => ({ api: vi.fn() }));
const mocked = vi.mocked(api);
const empty: Snapshot = { messages: [], tasks: [], active: false, epoch: 0 };
beforeEach(() => { mocked.mockReset(); mocked.mockImplementation(async path => { if (path === '/session') throw new Error('login'); return empty; }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function signIn() { const user = userEvent.setup(); await user.type(screen.getByLabelText('管理员密码'), 'password'); await user.click(screen.getByRole('button', { name: /进入工作室/ })); await screen.findByLabelText('研究对话'); return user; }
it('公网 HTTP 的 Crypto 无 randomUUID 时仍生成合法消息编号并发送', async () => {
  const getRandomValues = vi.fn((bytes: Uint8Array) => { bytes.forEach((_value, index) => { bytes[index] = index; }); return bytes; });
  vi.stubGlobal('crypto', { getRandomValues }); mocked.mockImplementation(async path => path === '/state' ? empty : { ok: true }); render(<App />); await screen.findByLabelText('研究对话');
  const user = userEvent.setup(); await user.type(screen.getByRole('textbox', { name: '发送消息' }), '公网发送'); await user.click(screen.getByRole('button', { name: '发送消息' }));
  await waitFor(() => expect(mocked.mock.calls.some(([path]) => path === '/messages')).toBe(true));
  expect(mocked.mock.calls.find(([path]) => path === '/messages')![1]).toMatchObject({ id: '000102030405060708090a0b0c0d0e0f', text: '公网发送' }); expect(getRandomValues).toHaveBeenCalledOnce();
});
it('生成消息编号失败时显示错误、保留草稿，恢复后能够重试发送', async () => {
  const getRandomValues = vi.fn().mockImplementationOnce(() => { throw new Error('编号生成失败'); }).mockImplementation((bytes: Uint8Array) => bytes.fill(42));
  vi.stubGlobal('crypto', { getRandomValues }); mocked.mockImplementation(async path => path === '/state' ? empty : { ok: true }); render(<App />); await screen.findByLabelText('研究对话'); const user = userEvent.setup(); const box = screen.getByRole('textbox', { name: '发送消息' });
  await user.type(box, '保留的草稿'); await user.click(screen.getByRole('button', { name: '发送消息' })); expect(await screen.findByRole('alert')).toHaveProperty('textContent', '编号生成失败'); expect(mocked.mock.calls.some(([path]) => path === '/messages')).toBe(false); expect((box as HTMLTextAreaElement).value).toBe('保留的草稿');
  await user.click(screen.getByRole('button', { name: '发送消息' })); await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe('')); expect(screen.queryByRole('alert')).toBeNull(); expect(mocked.mock.calls.find(([path]) => path === '/messages')![1]).toMatchObject({ text: '保留的草稿' });
});
it('错误登录、成功登录、发送、后台进度与退出', async () => {
  render(<App />); const user = userEvent.setup(); await user.type(screen.getByLabelText('管理员密码'), 'bad');
  mocked.mockRejectedValueOnce(new Error('密码不正确')); await user.click(screen.getByRole('button', { name: /进入工作室/ })); expect(await screen.findByRole('alert')).toHaveProperty('textContent', '密码不正确');
  mocked.mockResolvedValueOnce({ ok: true }); await user.click(screen.getByRole('button', { name: /进入工作室/ })); await screen.findByText(/你的下一次合作/);
  expect((screen.getByRole('button', { name: '发送消息' }) as HTMLButtonElement).disabled).toBe(true);
  const tasks = (['queued', 'running', 'needs_input', 'completed', 'partial', 'failed', 'cancelled'] as const).map(status => ({ id: status, title: `task-${status}`, status, requested: 2, evaluated: 1, matched: 0, detail: '真实来源', updatedAt: 0 }));
  const snapshot: Snapshot = { ...empty, active: true, tasks, messages: [{ id: 'm', role: 'user', text: '科技作者', state: 'pending', epoch: 0, attachments: [], createdAt: 0 }, { id: 'a', role: 'assistant', text: '已收到要求', state: 'delivered', epoch: 0, attachments: [], createdAt: 1 }] };
  mocked.mockImplementation(async path => path === '/state' ? snapshot : { ok: true });
  await user.type(screen.getByRole('textbox', { name: '发送消息' }), '科技作者'); await user.click(screen.getByRole('button', { name: '发送消息' }));
  expect(await screen.findByText('已收到要求')).toBeTruthy(); expect(screen.getByText('正在思考')).toBeTruthy(); expect(screen.getAllByText(/已核验 1/)).toHaveLength(7);
  expect(screen.getByText('已收到 · 等待处理')).toBeTruthy(); expect((screen.getByRole('textbox', { name: '发送消息' }) as HTMLTextAreaElement).value).toBe('');
  mocked.mockImplementation(async path => path === '/campaigns' ? [] : path.startsWith('/results') ? [] : path === '/state' ? snapshot : {}); await user.click(screen.getAllByRole('button', { name: '查看结果' })[0]); await screen.findByRole('dialog', { name: '研究结果' }); await user.click(screen.getByRole('button', { name: '关闭' })); expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Campaign 方案' })); await screen.findByRole('dialog', { name: 'Campaign 方案' }); await user.click(screen.getByRole('button', { name: '关闭' }));
  await user.click(screen.getByRole('button', { name: '浏览器桌面' })); await screen.findByRole('dialog', { name: '浏览器桌面' }); await user.click(screen.getByRole('button', { name: '关闭' }));
  await user.click(screen.getByRole('button', { name: '打开桌面协助' })); await screen.findByRole('dialog', { name: '浏览器桌面' }); await user.click(screen.getByRole('button', { name: '关闭' }));
  await user.click(screen.getByRole('button', { name: '退出' })); expect(await screen.findByLabelText('管理员密码')).toBeTruthy();
});
it('已有登录、空白提交、发送失败与退出失败', async () => {
  mocked.mockImplementation(async path => path === '/state' ? empty : { ok: true }); render(<App />); await screen.findByLabelText('研究对话');
  fireEvent.change(screen.getByRole('textbox', { name: '发送消息' }), { target: { value: '   ' } }); fireEvent.submit(screen.getByRole('textbox', { name: '发送消息' }).closest('form')!);
  expect(mocked.mock.calls.filter(([path]) => path === '/messages')).toHaveLength(0);
  const user = userEvent.setup(); await user.type(screen.getByRole('textbox', { name: '发送消息' }), '发送失败'); mocked.mockRejectedValueOnce(new Error('网络错误')); await user.click(screen.getByRole('button', { name: '发送消息' })); expect(await screen.findByText('网络错误')).toBeTruthy();
  mocked.mockRejectedValueOnce(new Error('退出失败')); await user.click(screen.getByRole('button', { name: '退出' })); expect(await screen.findByText('退出失败')).toBeTruthy();
});
it('轮询、失败反馈与卸载之后的迟到结果', async () => {
  vi.useFakeTimers(); let resolveLate: (value: unknown) => void; let rejectLate: (error: Error) => void;
  mocked.mockImplementation(async path => path === '/state' ? empty : { ok: true }); const rendered = render(<App />);
  await act(async () => {});
  const pane = document.querySelector('.messages')!; Object.defineProperty(pane, 'scrollHeight', { configurable: true, value: 1000 }); fireEvent.scroll(pane);
  mocked.mockResolvedValueOnce({ ...empty, messages: [{ id: 's', role: 'assistant', text: '背景更新', attachments: [], state: 'delivered', epoch: 0, createdAt: 0 }] }); await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); expect(pane.scrollTop).toBe(0);
  pane.scrollTop = 1000; fireEvent.scroll(pane);
  mocked.mockRejectedValueOnce(new Error('刷新失败')); await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); expect(screen.getByText('刷新失败')).toBeTruthy();
  mocked.mockReturnValueOnce(new Promise(resolve => { resolveLate = resolve; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); rendered.unmount(); await act(async () => { resolveLate!(empty); });
  const second = render(<App />); await act(async () => {});
  mocked.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectLate = reject; })); await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); second.unmount(); await act(async () => { rejectLate!(new Error('late')); });
});
it('客户端真实入口挂载', async () => {
  const element = document.createElement('div'); element.id = 'root'; document.body.append(element);
  await act(async () => { await import('../src/client/main.tsx'); }); expect(element.textContent).toContain('CREATOR'); element.remove();
});
it('设置面板打开与关闭', async () => {
  const settings = { baseUrl: 'http://localhost:1', modelId: 'model', compressionThreshold: 32000, systemPrompt: 'system', workflowPrompt: 'workflow', revision: 1 };
  mocked.mockImplementation(async path => path === '/state' ? empty : path === '/settings' ? settings : {}); render(<App />); await screen.findByLabelText('研究对话'); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: '设置' })); await screen.findByRole('dialog'); await user.click(screen.getByRole('button', { name: '关闭' })); expect(screen.queryByRole('dialog')).toBeNull();
});
it('图片预览、移除、仅图片消息以及上传错误', async () => {
  mocked.mockImplementation(async path => path === '/state' ? empty : {}); render(<App />); await screen.findByLabelText('研究对话'); const user = userEvent.setup({ applyAccept: false }); const file = new File(['png'], 'a.png', { type: 'image/png' });
  await user.upload(screen.getByLabelText('添加图片'), file); await screen.findByAltText('待发送图片 1'); await user.click(screen.getByRole('button', { name: '移除图片 1' })); expect(screen.queryByAltText('待发送图片 1')).toBeNull();
  await user.upload(screen.getByLabelText('添加图片'), file); await screen.findByAltText('待发送图片 1'); await user.click(screen.getByRole('button', { name: '发送消息' })); expect(mocked.mock.calls.find(([path]) => path === '/messages')![1]).toMatchObject({ text: '请参考附图。', attachments: ['data:image/png;base64,cG5n'] });
  await user.upload(screen.getByLabelText('添加图片'), new File(['bad'], 'a.txt', { type: 'text/plain' })); await screen.findByText(/请选择不超过/);
  await user.upload(screen.getByLabelText('添加图片'), [file, file, file, file, file]); await screen.findByText('每条消息最多添加 4 张图片。');
  await user.type(screen.getByRole('textbox', { name: '发送消息' }), '下一条');
  mocked.mockImplementation(async path => path === '/state' ? { ...empty, messages: [{ id: 'image', role: 'user', text: '有图片', state: 'delivered', attachments: ['data:image/png;base64,cG5n'], epoch: 0, createdAt: 0 }] } : {});
  await user.click(screen.getByRole('button', { name: '发送消息' })); await screen.findByAltText('参考图片 1');
});
it('失败重试沿用消息 ID；请求等待期间的新草稿和图片不会丢失', async () => {
  mocked.mockImplementation(async path => path === '/state' ? empty : {}); render(<App />); await screen.findByLabelText('研究对话'); const user = userEvent.setup(); const box = screen.getByRole('textbox', { name: '发送消息' }); await user.type(box, 'original');
  mocked.mockRejectedValueOnce(new Error('failed')); await user.click(screen.getByRole('button', { name: '发送消息' })); await screen.findByText('failed'); const original = mocked.mock.calls.find(([path]) => path === '/messages')![1];
  let resolve!: (value: unknown) => void; mocked.mockReturnValueOnce(new Promise(yes => { resolve = yes; })); await user.click(screen.getByRole('button', { name: '发送消息' })); expect(mocked.mock.calls.filter(([path]) => path === '/messages')[1][1]).toEqual(original);
  await user.clear(box); await user.type(box, 'new draft'); await user.upload(screen.getByLabelText('添加图片'), new File(['png'], 'a.png', { type: 'image/png' })); await screen.findByAltText('待发送图片 1'); await act(async () => { resolve({}); }); expect((box as HTMLTextAreaElement).value).toBe('new draft'); expect(screen.getByAltText('待发送图片 1')).toBeTruthy();
  await user.clear(box); await user.type(box, 'original'); await user.click(screen.getByRole('button', { name: '发送消息' })); const calls = mocked.mock.calls.filter(([path]) => path === '/messages'); expect((calls[2][1] as { id: string }).id).not.toBe((original as { id: string }).id);
});
it('所有角色显示原消息的本地年月日时分秒，旧备份缺失或无效时间不编造时间', async () => {
  const createdAt = new Date(2026, 0, 2, 3, 4, 5).getTime();
  const snapshot: Snapshot = { ...empty, messages: [
    { id: 'u-time', role: 'user', text: '用户原消息', state: 'pending', epoch: 0, attachments: [], createdAt },
    { id: 'a-time', role: 'assistant', text: '自动交付报告', state: 'delivered', epoch: 0, attachments: [], createdAt },
    { id: 'missing-time', role: 'assistant', text: '旧备份缺时间', state: 'delivered', epoch: 0, attachments: [], createdAt: undefined! },
    { id: 'invalid-time', role: 'assistant', text: '旧备份时间超界', state: 'delivered', epoch: 0, attachments: [], createdAt: 9e15 }
  ] };
  mocked.mockImplementation(async path => path === '/state' ? snapshot : { ok: true }); render(<App />);
  await screen.findByText('自动交付报告');
  const times = screen.getAllByText('2026-01-02 03:04:05'); expect(times).toHaveLength(2);
  for (const time of times) expect(time.getAttribute('datetime')).toBe(new Date(createdAt).toISOString());
  expect(screen.getAllByText('时间未知')).toHaveLength(2);
  for (const time of screen.getAllByText('时间未知')) expect(time.hasAttribute('datetime')).toBe(false);
});
