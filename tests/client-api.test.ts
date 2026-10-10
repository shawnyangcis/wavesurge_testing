import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../src/client/api.ts';
afterEach(() => vi.unstubAllGlobals());
it('读取与写入请求、服务错误和兜底错误', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: '请先登录' }) }).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  vi.stubGlobal('fetch', fetcher);
  expect(await api('/state')).toEqual({ id: 1 }); expect(fetcher).toHaveBeenNthCalledWith(1, '/api/state', {});
  await api('/login', { password: 'test' }); expect(fetcher.mock.calls[1][1]).toMatchObject({ method: 'POST', body: '{"password":"test"}' });
  await expect(api('/state')).rejects.toThrow('请先登录'); await expect(api('/state')).rejects.toThrow('请求未完成');
});
