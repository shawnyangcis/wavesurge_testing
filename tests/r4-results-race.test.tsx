// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Results } from '../src/client/Results.tsx';
import { api } from '../src/client/api.ts';
import type { Result } from '../src/shared/research.ts';
vi.mock('../src/client/api.ts', () => ({ api: vi.fn() }));
const mocked = vi.mocked(api); afterEach(() => { cleanup(); mocked.mockReset(); });
function defer<T>() { let resolve!: (value: T) => void, reject!: (value: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const row: Result = { id: 'r', taskId: 'task', verdict: 'match', tags: ['不戴眼镜'], selected: true, updatedAt: 1, judgments: [], creator: { id: 'a', platform: 'instagram', handle: 'alpha', displayName: 'Alpha', followers: 20000, region: null, profileUrl: 'https://instagram.com/alpha', raw: {}, evidence: [] } };

it('F28: 迟到初始请求不能覆盖最新筛选和导出，也不能在卸载后应用', async () => {
  const initial = defer<Result[]>(); mocked.mockReturnValueOnce(initial.promise).mockResolvedValueOnce([row]);
  const view = render(<Results taskId="task" onClose={() => {}} />); const user = userEvent.setup();
  await user.type(screen.getByLabelText('按标签查找'), '不戴眼镜'); await user.click(screen.getByRole('button', { name: '查询 / 刷新' })); await screen.findByText('Alpha');
  const selectedLink = screen.getByRole('link', { name: '下载 CSV' }).getAttribute('href'); expect(selectedLink).toContain('tag=');
  await act(async () => initial.resolve([row, { ...row, id: 'b', creator: { ...row.creator, displayName: 'Beta' } }]));
  expect(screen.queryByText('Beta')).toBeNull(); expect(screen.getByRole('link', { name: '下载 CSV' }).getAttribute('href')).toBe(selectedLink);
  const late = defer<Result[]>(); mocked.mockReturnValueOnce(late.promise); fireEvent.submit(screen.getByLabelText('按标签查找').closest('form')!); view.unmount(); await act(async () => late.resolve([row]));
});

it('F28: 较早查询的失败不能盖过最新成功；切换任务后旧响应不混进新报告', async () => {
  mocked.mockResolvedValueOnce([]); const view = render(<Results taskId="task" onClose={() => {}} />); await screen.findByText('暂时没有已保存的核验结果。');
  const old = defer<Result[]>(); mocked.mockReturnValueOnce(old.promise).mockResolvedValueOnce([row]);
  const form = screen.getByLabelText('按标签查找').closest('form')!; fireEvent.submit(form); fireEvent.submit(form); await screen.findByText('Alpha');
  await act(async () => old.reject(new Error('过期查询失败'))); expect(screen.queryByText('过期查询失败')).toBeNull();
  const previousTask = defer<Result[]>(); mocked.mockReturnValueOnce(previousTask.promise); fireEvent.submit(form);
  mocked.mockResolvedValueOnce([{ ...row, id: 'new', taskId: 'new-task', creator: { ...row.creator, displayName: 'New' } }]);
  view.rerender(<Results taskId="new-task" onClose={() => {}} />); await screen.findByText('New'); await act(async () => previousTask.resolve([row]));
  expect(screen.queryByText('Alpha')).toBeNull(); expect(screen.getByRole('link', { name: '下载 CSV' }).getAttribute('href')).toBe('/api/reports/new-task?format=csv');
});

it('F27: 默认精确标签值；选择文字包含后UI明确模式，导出跟随实际成功请求', async () => {
  mocked.mockResolvedValue([row]); render(<Results taskId="task" onClose={() => {}} />); await screen.findByText('Alpha');
  const user = userEvent.setup(); await user.type(screen.getByLabelText('按标签查找'), '戴眼镜'); await user.click(screen.getByRole('button', { name: '查询 / 刷新' }));
  await waitFor(() => expect(mocked.mock.calls.at(-1)![0]).toContain('tagMode=exact'));
  await user.selectOptions(screen.getByLabelText('标签匹配方式'), 'contains'); await user.click(screen.getByRole('button', { name: '查询 / 刷新' }));
  await waitFor(() => expect(mocked.mock.calls.at(-1)![0]).toContain('tagMode=contains'));
  expect(screen.getByRole('link', { name: '下载 CSV' }).getAttribute('href')).toContain('tagMode=contains');
});
