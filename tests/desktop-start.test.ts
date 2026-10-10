import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
vi.mock('node:fs', async importOriginal => { const actual = await importOriginal<typeof import('node:fs')>(); return { ...actual, existsSync: vi.fn(actual.existsSync), readFileSync: vi.fn(actual.readFileSync), chownSync: vi.fn() }; });
const routing = vi.fn();
const close = vi.fn(async () => {}); const goto = vi.fn(async () => {});
const page = { bringToFront: vi.fn(async () => {}), goto, url: () => 'https://social.test/retained', title: async () => 'Retained', evaluate: async (fn: () => unknown) => fn(), screenshot: async () => Buffer.from('png') };
const launch = vi.hoisted(() => vi.fn()); vi.mock('playwright', () => ({ chromium: { launchPersistentContext: launch } }));
const cleanups: (() => void)[] = []; afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('启动恢复持久 URL、显式/默认配置、TERM 关闭浏览器与不可用页保留 URL', async () => {
  const { startDesktop } = await import('../src/desktop/start.ts'); const dir = mkdtempSync(join(tmpdir(), 'cell-start-')); cleanups.push(() => rmSync(dir, { recursive: true })); const tokenFile = join(dir, 'token'); writeFileSync(tokenFile, 'internal');
  vi.stubGlobal('document', { body: { innerText: 'actual text' }, querySelectorAll: () => [] }); launch.mockResolvedValue({ pages: () => [page], close, route: routing }); const signal = vi.spyOn(process, 'once');
  const first = await startDesktop({ DESKTOP_ALLOWED_TEST_ORIGINS: 'https://social.test', PROFILE_DIR: join(dir, 'profile'), DESKTOP_TOKEN_FILE: tokenFile, DESKTOP_PORT: '0', CHROMIUM_PATH: '/browser' }); const handlerRoute = routing.mock.calls[0][1]; const route = { request: () => ({ url: () => 'https://social.test/file' }), continue: vi.fn(), abort: vi.fn() }; await handlerRoute(route); expect(route.continue).toHaveBeenCalledOnce(); await handlerRoute({ ...route, request: () => ({ url: () => 'data:image/png;base64,AAAA' }) }); await handlerRoute({ ...route, request: () => ({ url: () => 'http://127.0.0.1/' }) }); expect(route.abort).toHaveBeenCalledWith('blockedbyclient'); await first.close();
  writeFileSync(join(dir, 'workspace.json'), JSON.stringify({ url: 'https://social.test/retained' })); const second = await startDesktop({ DESKTOP_ALLOWED_TEST_ORIGINS: 'https://social.test', PROFILE_DIR: join(dir, 'profile'), DESKTOP_TOKEN_FILE: tokenFile, DESKTOP_PORT: '0' }); expect(goto).toHaveBeenCalled(); const handler = signal.mock.calls.find(([event]) => event === 'SIGTERM')![1]; handler(); await second.close();
  goto.mockRejectedValueOnce(new Error('site offline')); const third = await startDesktop({ DESKTOP_ALLOWED_TEST_ORIGINS: 'https://social.test', PROFILE_DIR: join(dir, 'profile'), DESKTOP_TOKEN_FILE: tokenFile, DESKTOP_PORT: '0' }); await third.close(); signal.mockRestore(); process.removeListener('SIGTERM', handler);
  vi.resetModules(); const fs = await import('node:fs'); const exists = vi.mocked(fs.existsSync).mockReturnValue(false); const read = vi.mocked(fs.readFileSync).mockReturnValue('internal'); const defaults = await startDesktop({}); await defaults.close(); exists.mockRestore(); read.mockRestore();
  expect(launch.mock.calls.at(-1)![0]).toBe('/state/browser-profile'); expect(launch.mock.calls.at(-1)![1]).toMatchObject({ handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false });
});
it('入口启动 Cell；秘密初始化只输出文件并设置卷权限', async () => {
  vi.doMock('../src/desktop/start.ts', () => ({ startDesktop: vi.fn() })); await import('../src/desktop/main.ts'); vi.doUnmock('../src/desktop/start.ts');
  const fs = await import('node:fs'); const chown = vi.mocked(fs.chownSync).mockImplementation(() => {}); const dir = mkdtempSync(join(tmpdir(), 'secret-init-')); cleanups.push(() => rmSync(dir, { recursive: true }));
  const { initializeDesktopSecret } = await import('../src/server/desktop-secret-init.ts'); initializeDesktopSecret(join(dir, 'desktop-token')); expect(chown).toHaveBeenCalledTimes(2); chown.mockRestore();
  vi.doMock('../src/server/desktop-secret-init.ts', () => ({ initializeDesktopSecret: vi.fn() })); await import('../src/server/desktop-secret-main.ts'); vi.doUnmock('../src/server/desktop-secret-init.ts');
});
