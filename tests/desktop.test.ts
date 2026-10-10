import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BrowserPolicy } from '../src/desktop/policy.ts';
import { DesktopRuntime } from '../src/desktop/runtime.ts';
import { desktopServer } from '../src/desktop/server.ts';
import { DesktopBroker, desktopToken, HumanRequired } from '../src/server/desktop.ts';
import { Store } from '../src/server/store.ts';
import type { BrowserContext, Page } from 'playwright';
const cleanups: (() => void)[] = []; afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function pageFixture() {
  vi.stubGlobal('document', { body: { innerText: 'Actual public page' }, querySelectorAll: () => [{ textContent: 'Post', href: 'https://social.test/post' }] });
  const locator = { evaluate: vi.fn(async (_fn?: any) => ({ tag: 'a', type: 'search', label: 'Search', role: '', href: 'https://social.test/post' })), first: vi.fn(), click: vi.fn().mockResolvedValue(undefined), fill: vi.fn().mockResolvedValue(undefined) }; locator.first.mockReturnValue(locator);
  const page = { url: vi.fn(() => 'https://social.test/profile'), title: vi.fn(async () => 'Profile'), evaluate: vi.fn(async (fn: () => unknown) => fn()), screenshot: vi.fn(async () => Buffer.from('png')), goto: vi.fn(async () => {}), bringToFront: vi.fn(async () => {}), locator: vi.fn(() => locator), keyboard: { press: vi.fn(async () => {}) } };
  const context = { pages: vi.fn(() => [page]), newPage: vi.fn(async () => page) }; let now = 100; let id = 0; const save = vi.fn(); const runtime = new DesktopRuntime(context as unknown as BrowserContext, () => now, () => `obs-${++id}`, save, new BrowserPolicy(['https://social.test']));
  return { page, context, locator, runtime, save, time: (value: number) => { now = value; } };
}
it('同一页面 DOM 输入、真实观察、一次性凭据和过期保护', async () => {
  const f = pageFixture(); const a = await f.runtime.command({ action: 'observe' }); expect(a.text).toBe('Actual public page'); expect(a.links[0].url).toContain('/post'); expect(a.scope).toBe('page-viewport');
  const b = await f.runtime.command({ action: 'click', selector: 'a', observationId: a.observationId }); expect(f.locator.click).toHaveBeenCalledOnce();
  await expect(f.runtime.command({ action: 'click', selector: 'a', observationId: a.observationId })).rejects.toThrow('STALE');
  const c = await f.runtime.command({ action: 'fill', selector: 'input', text: 'search', observationId: b.observationId }); expect(f.locator.fill).toHaveBeenCalledWith('search', { timeout: 10000 });
  await f.runtime.command({ action: 'key', text: 'PageDown', observationId: c.observationId }); expect(f.page.keyboard.press).toHaveBeenCalledWith('PageDown');
  f.time(100000); await expect(f.runtime.command({ action: 'click', selector: 'a', observationId: f.runtime.observation!.id })).rejects.toThrow('STALE');
  for (const url of ['file:///etc/passwd', 'https://user:password@host.test']) await expect(f.runtime.command({ action: 'navigate', url })).rejects.toThrow('HTTP');
  await f.runtime.command({ action: 'navigate', url: 'https://social.test/post' }); expect(f.page.goto).toHaveBeenCalled();
  f.context.pages.mockReturnValue([]); await f.runtime.command({ action: 'observe' }); expect(f.context.newPage).toHaveBeenCalledOnce();
  f.runtime.observation = undefined; await expect(f.runtime.command({ action: 'click', selector: 'a' })).rejects.toThrow('STALE');
});
it('接管先冻结新输入、排空在途动作，交还后旧观察失效', async () => {
  const f = pageFixture(); let resolve!: () => void; const pending = new Promise<void>(r => { resolve = r; }); f.page.goto.mockReturnValueOnce(pending);
  const running = f.runtime.command({ action: 'navigate', url: 'https://social.test/profile' }); await vi.waitFor(() => expect(f.page.goto).toHaveBeenCalledOnce());
  const paused = f.runtime.pause(); const blocked = f.runtime.command({ action: 'observe' }); resolve(); const a = await running; expect(await paused).toEqual({ inputOwner: 'human' }); await expect(blocked).rejects.toThrow('not_started');
  expect(f.runtime.resume()).toEqual({ inputOwner: 'agent' }); await expect(f.runtime.command({ action: 'click', selector: 'a', observationId: a.observationId })).rejects.toThrow('STALE');
  await f.runtime.command({ action: 'observe' });
});
it('Cell HTTP 仅内部 token 可输入，严格 schema 与失败语义', async () => {
  const f = pageFixture(); const app = desktopServer(f.runtime, 'internal'); cleanups.push(() => { void app.close(); });
  expect((await app.inject('/health')).json().ok).toBe(true); expect((await app.inject({ method: 'POST', url: '/pause' })).statusCode).toBe(401);
  const post = (url: string, payload = {}) => app.inject({ method: 'POST', url, headers: { authorization: 'Bearer internal' }, payload });
  expect((await post('/command', { action: 'navigate' })).statusCode).toBe(400); expect((await post('/command', { action: 'fill', selector: 'input' })).statusCode).toBe(400); expect((await post('/command', { action: 'observe' })).statusCode).toBe(200);
  expect((await post('/pause')).json().inputOwner).toBe('human'); expect((await post('/command', { action: 'observe' })).statusCode).toBe(409); expect((await post('/resume')).json().inputOwner).toBe('agent');
});
export function brokerFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'studio-desktop-')); const store = new Store(':memory:'); cleanups.push(() => { store.close(); rmSync(dir, { recursive: true }); }); let now = 1000;
  const screenshot = readFileSync('tests/fixtures/two-colors.png').toString('base64');
  const observation = { observationId: 'obs', url: 'https://social.test/profile', title: 'Profile', text: 'public', links: [], screenshotBase64: screenshot, scope: 'page-viewport', observedAt: 1000 };
  const fetcher = vi.fn().mockImplementation(async () => ({ ok: true, json: async () => observation })); const broker = new DesktopBroker(store, 'http://desktop:8810', 'internal', dir, fetcher, () => now);
  return { dir, store, broker, fetcher, observation, time: (n: number) => { now = n; } };
}
it('截图保存为受控资产，外部返回无 base64，内部凭据不进入结果', async () => {
  const f = brokerFixture(); const first = desktopToken(join(f.dir, 'secret', 'token')); expect(first).toHaveLength(43); expect(desktopToken(join(f.dir, 'secret', 'token'))).toBe(first);
  const result = await f.broker.command({ action: 'observe' }); expect(result).not.toHaveProperty('screenshotBase64'); expect(f.broker.image(result.assetId)).toBe(`data:image/png;base64,${f.observation.screenshotBase64}`); expect(() => f.broker.image('missing')).toThrow('不存在');
  f.fetcher.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'blocked' }) }); await expect(f.broker.rpc('/command', {})).rejects.toThrow('blocked');
  for (const screenshotBase64 of ['AAAA', Buffer.alloc(10000001).toString('base64')]) { f.fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ ...f.observation, screenshotBase64 }) }); await expect(f.broker.command({ action: 'observe' })).rejects.toThrow('截图'); }
});
it('人工协助精确关联原任务、控制租约、到期与恢复不复活已取消任务', async () => {
  const f = brokerFixture(); await expect(f.broker.claim('missing')).rejects.toThrow('不存在'); await expect(f.broker.release('missing', '')).rejects.toThrow('不存在'); expect(() => f.broker.grant('control')).toThrow('认领'); expect(f.broker.allowed('view', 'missing')).toBe(false); expect(await f.broker.expire()).toBe(false);
  let request!: HumanRequired; try { await f.broker.assistance('t', 'c', '登录'); } catch (error) { request = error as HumanRequired; } expect(request).toBeInstanceOf(HumanRequired); expect(f.broker.active()!.creatorId).toBe('c');
  await expect(f.broker.command({ action: 'observe' })).rejects.toThrow('未开始'); await expect(f.broker.assistance('t', 'c', 'again')).rejects.toBeInstanceOf(HumanRequired); await expect(f.broker.assistance('other', 'c', 'again')).rejects.toThrow('另一个');
  const view = f.broker.grant('view'); expect(f.broker.allowed('view', view.token)).toBe(true); expect(f.broker.allowed('view', 'wrong')).toBe(false); f.time(301001); expect(f.broker.allowed('view', view.token)).toBe(false);
  const id = request.request.id; const human = await f.broker.claim(id); const control = f.broker.grant('control'); expect(f.broker.allowed('control', control.token)).toBe(true); expect(await f.broker.expire()).toBe(false);
  f.store.set('assistance', id, { ...human, leaseUntil: 1 }); expect(f.broker.allowed('control', control.token)).toBe(false);
  f.store.set('task', 't', { id: 't', status: 'needs_input', nextPollAt: 10000 }); expect(await f.broker.expire()).toBe(true); expect(f.store.get('task', 't')).toHaveProperty('status', 'running'); expect(f.broker.active()).toBeUndefined(); expect(f.broker.allowed('control', control.token)).toBe(false);
  await expect(f.broker.claim(id)).rejects.toThrow('结束'); await expect(f.broker.release(id, '')).rejects.toThrow('结束');
  await f.broker.assistance('cancelled', 'c', '验证').catch(() => {}); const next = f.broker.active()!; await f.broker.claim(next.id); const grant = f.broker.grant('control'); f.store.set('assistance', next.id, { ...next, status: 'pending' }); expect(f.broker.allowed('control', grant.token)).toBe(false); f.store.set('assistance', next.id, { ...next, status: 'human' }); f.broker.grants.set('control', { ...grant, assistanceId: 'wrong' }); expect(f.broker.allowed('control', grant.token)).toBe(false);
  f.store.set('task', 'cancelled', { id: 'cancelled', status: 'cancelled' }); await f.broker.release(next.id, 'cancel'); expect(f.store.get('task', 'cancelled')).toHaveProperty('status', 'cancelled');
  await f.broker.assistance('absent', 'c', '验证').catch(() => {}); await f.broker.release(f.broker.active()!.id, 'done');
});

it('暂停服务失败保留原请求，未排空不能授予控制，认领重试成功才取得租约', async () => {
  const f = brokerFixture(); f.fetcher.mockRejectedValueOnce(new Error('offline')); await expect(f.broker.assistance('t', 'c', '验证')).rejects.toBeInstanceOf(HumanRequired); const request = f.broker.active()!; expect(request.reason).toContain('offline');
  f.fetcher.mockRejectedValueOnce(new Error('still offline')); await expect(f.broker.claim(request.id)).rejects.toThrow('offline'); expect(f.broker.active()!.status).toBe('pending'); expect(() => f.broker.grant('control')).toThrow('认领'); await f.broker.claim(request.id); expect(f.broker.active()!.status).toBe('human');
});

it('浏览器执行层拒绝私网、陌生导航、密码/验证码、互动按钮和任意快捷键，拒绝后不执行动作',async()=>{
 const f=pageFixture();f.runtime.policy.scope(['https://social.test/profile']);let obs=await f.runtime.command({action:'observe'});
 for(const url of ['http://127.0.0.1/','http://169.254.169.254/latest/meta-data'])await expect(f.runtime.command({action:'navigate',url})).rejects.toThrow('PRIVATE');
 await expect(f.runtime.command({action:'navigate',url:'https://social.test/unobserved'})).rejects.toThrow('UNOBSERVED');
 f.locator.evaluate.mockResolvedValueOnce({tag:'input',type:'password',label:'Password',role:'',href:''});await expect(f.runtime.command({action:'fill',selector:'#password',text:'secret',observationId:obs.observationId})).rejects.toThrow('SIDE_EFFECT');expect(f.locator.fill).not.toHaveBeenCalled();
 f.locator.evaluate.mockResolvedValueOnce({tag:'button',type:'',label:'Follow',role:'',href:''});await expect(f.runtime.command({action:'click',selector:'button',observationId:obs.observationId})).rejects.toThrow('SIDE_EFFECT');expect(f.locator.click).not.toHaveBeenCalled();
 f.locator.evaluate.mockResolvedValueOnce({tag:'input',type:'text',label:'Name',role:'',href:''});await expect(f.runtime.command({action:'fill',selector:'input',text:'value',observationId:obs.observationId})).rejects.toThrow('INPUT');
 f.locator.evaluate.mockResolvedValueOnce({tag:'button',type:'',label:'Run arbitrary action',role:'',href:''});await expect(f.runtime.command({action:'click',selector:'button',observationId:obs.observationId})).rejects.toThrow('ACTION');
 await expect(f.runtime.command({action:'key',text:'Control+Enter',observationId:obs.observationId})).rejects.toThrow('KEY');expect(f.page.keyboard.press).not.toHaveBeenCalled();
 f.locator.evaluate.mockResolvedValueOnce({tag:'button',type:'',label:'Next',role:'',href:''});obs=await f.runtime.command({action:'click',selector:'button',observationId:obs.observationId});
 f.locator.evaluate.mockResolvedValueOnce({tag:'button',type:'',label:'Videos',role:'tab',href:''});obs=await f.runtime.command({action:'click',selector:'button',observationId:obs.observationId});
 f.locator.evaluate.mockResolvedValueOnce({tag:'input',type:'text',label:'Search videos',role:'',href:''});await f.runtime.command({action:'fill',selector:'input',text:'technology',observationId:obs.observationId});
 const app=desktopServer(f.runtime,'internal');await app.inject({method:'POST',url:'/scope',headers:{authorization:'Bearer internal'},payload:{urls:['https://social.test/profile']}});expect(f.runtime.observation).toBeUndefined();await app.close();
});
it('范围授权需要桌面可用；与动作 RPC 一样不暴露内部凭据',async()=>{const f=brokerFixture();await f.broker.scope(['https://social.test/profile']);expect(f.fetcher.mock.calls[0][0]).toContain('/scope');f.store.set('assistance','r',{status:'pending'});await expect(f.broker.scope(['https://social.test/profile'])).rejects.toThrow('未开始');});
it('读取实际 DOM 元素属性后执行搜索与观察，缺省属性不被误当作许可',async()=>{const f=pageFixture();let obs=await f.runtime.command({action:'observe'});f.locator.evaluate.mockImplementationOnce(async(fn?:any)=>fn({tagName:'INPUT',closest:()=>null,textContent:null,getAttribute:(key:string)=>key==='type'?'search':null}));obs=await f.runtime.command({action:'fill',selector:'input',text:'tech',observationId:obs.observationId});f.locator.evaluate.mockImplementationOnce(async(fn?:any)=>fn({tagName:'A',closest:()=>null,textContent:'Post',href:'https://social.test/post',getAttribute:(key:string)=>key==='aria-label'?'Post':key==='placeholder'?'Link':null}));await f.runtime.command({action:'click',selector:'a',observationId:obs.observationId});const runtime=new DesktopRuntime(f.context as any,()=>1,()=> 'default',()=>{});expect((await runtime.command({action:'observe'})).title).toBe('Profile');});
it('即使按钮叫 Next，登录/提交表单也不能由 Agent 执行',async()=>{const f=pageFixture();const obs=await f.runtime.command({action:'observe'});f.locator.evaluate.mockResolvedValueOnce({tag:'button',type:'submit',label:'Next',role:'',href:'',inForm:true} as any);await expect(f.runtime.command({action:'click',selector:'button',observationId:obs.observationId})).rejects.toThrow('FORM');expect(f.locator.click).not.toHaveBeenCalled();});
it('SVG/图片文档没有 HTML body 时仍采集实际文本和截图；空文档保持空文本',async()=>{const f=pageFixture();vi.stubGlobal('document',{body:null,documentElement:{textContent:'SVG headphones'},querySelectorAll:()=>[]});expect((await f.runtime.command({action:'observe'})).text).toBe('SVG headphones');vi.stubGlobal('document',{body:null,documentElement:null,querySelectorAll:()=>[]});expect((await f.runtime.command({action:'observe'})).text).toBe('');vi.stubGlobal('document',{body:null,documentElement:{textContent:null},querySelectorAll:()=>[]});expect((await f.runtime.command({action:'observe'})).screenshotBase64).toBeTruthy();});
