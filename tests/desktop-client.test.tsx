// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Desktop } from '../src/client/Desktop.tsx';
import { api } from '../src/client/api.ts';
vi.mock('../src/client/api.ts', () => ({ api: vi.fn() }));
const mocked = vi.mocked(api); afterEach(() => { cleanup(); mocked.mockReset(); vi.useRealTimers(); });
it('只读桌面、刷新和关闭，没有协助请求不授予控制', async () => {
  mocked.mockImplementation(async path => path === '/desktop' ? {} : { url: '/view' }); const close = vi.fn(); render(<Desktop onClose={close} />); await waitFor(() => expect(screen.getByTitle('持久浏览器桌面').getAttribute('src')).toBe('/view')); const oldFrame = screen.getByTitle('持久浏览器桌面'); fireEvent.click(screen.getByText('重新连接桌面')); await waitFor(() => expect(mocked).toHaveBeenCalledWith('/desktop/viewer', { mode: 'view' })); await waitFor(() => expect(screen.getByTitle('持久浏览器桌面')).not.toBe(oldFrame)); expect(oldFrame.isConnected).toBe(false); fireEvent.click(screen.getByText('关闭')); expect(close).toHaveBeenCalledOnce();
});
it('原工作请求→接管→人类控制→交还，保留用户的协助结果', async () => {
  let request: object | undefined = { id: 'r', taskId: 'original', creatorId: 'creator', reason: '请完成验证码', status: 'pending' };
  mocked.mockImplementation(async (path, data) => { if (path === '/desktop') return { request }; if (path === '/desktop/assistance') { request = (data as { action: string }).action === 'claim' ? { ...request, status: 'human' } : undefined; return {}; } return { url: (data as { mode: string }).mode === 'control' ? '/control' : '/view' }; });
  render(<Desktop onClose={() => {}} />); await screen.findByText('请完成验证码'); fireEvent.click(screen.getByText('接管并协助')); await screen.findByText('你已认领协助。Agent 已暂停桌面输入，连接成功后可操作浏览器。'); await waitFor(() => expect(screen.getByTitle('持久浏览器桌面').getAttribute('src')).toBe('/control')); fireEvent.click(screen.getByText('重新连接桌面')); await waitFor(() => expect(mocked).toHaveBeenCalledWith('/desktop/viewer', { mode: 'control' }));
  fireEvent.change(screen.getByLabelText('协助结果'), { target: { value: '已验证，打开帖子' } }); fireEvent.click(screen.getByText('完成协助，交还 Agent')); await waitFor(() => expect(mocked).toHaveBeenCalledWith('/desktop/assistance', { id: 'r', action: 'release', outcome: '已验证，打开帖子' })); await waitFor(() => expect(screen.getByTitle('持久浏览器桌面').getAttribute('src')).toBe('/view'));
});
it('轮询、加载失败、Viewer 失败、接管失败均明确反馈', async () => {
  vi.useFakeTimers(); mocked.mockRejectedValue(new Error('connection failed')); render(<Desktop onClose={() => {}} />); await vi.advanceTimersByTimeAsync(2100); expect(screen.getByRole('alert').textContent).toBe('connection failed'); expect(mocked.mock.calls.filter(([path]) => path === '/desktop')).toHaveLength(2); cleanup(); vi.useRealTimers();
  mocked.mockImplementation(async path => { if (path === '/desktop') return { request: { id: 'r', status: 'pending', reason: 'challenge' } }; if (path === '/desktop/assistance') throw new Error('claim failed'); return { url: '/view' }; }); render(<Desktop onClose={() => {}} />); await screen.findByText('challenge'); fireEvent.click(screen.getByText('接管并协助')); expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'claim failed');
});
