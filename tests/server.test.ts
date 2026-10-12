import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/server/store.ts';
import { initializeAdmin, login, authenticated } from '../src/server/auth.ts';
import { createApp } from '../src/server/app.ts';
import { start } from '../src/server/bootstrap.ts';
import * as prompts from '../src/shared/prompts.ts';
const disposers: (() => unknown)[] = [];
afterEach(async () => { for (const dispose of disposers.splice(0).reverse()) await dispose(); vi.unstubAllGlobals(); });
function memory() { const store = new Store(':memory:'); disposers.push(() => store.close()); return store; }
describe('SQLite 与登录', () => {
  it('持久化、事务提交、事务回滚与删除', () => {
    const dir = mkdtempSync(join(tmpdir(), 'studio-store-')); disposers.push(() => rmSync(dir, { recursive: true }));
    const path = join(dir, 'db'); const first = new Store(path);
    expect(first.get('task', 'missing')).toBeUndefined();
    expect(first.list('task')).toEqual([]);
    first.set('task', 'a', { count: 1 }); first.set('task', 'a', { count: 2 });
    expect(first.transaction(() => { first.set('task', 'b', { count: 3 }); return 'ok'; })).toBe('ok');
    expect(() => first.transaction(() => { first.delete('task', 'a'); throw new Error('stop'); })).toThrow('stop');
    first.close(); const second = new Store(path); disposers.push(() => second.close());
    expect(second.list('task')).toEqual([{ count: 2 }, { count: 3 }]);
    second.delete('task', 'a'); expect(second.get('task', 'a')).toBeUndefined();
  });
  it('随机 salt、不覆盖账号、正确/错误密码、过期会话', () => {
    const store = memory(); expect(login(store, 'anything', 0)).toBeUndefined();
    expect(initializeAdmin(store, 'correct')).toBe(true); expect(initializeAdmin(store, 'overwrite')).toBe(false);
    expect(login(store, 'wrong', 0)).toBeUndefined();
    const token = login(store, 'correct', 100)!;
    expect(authenticated(store, undefined, 101)).toBe(false); expect(authenticated(store, 'missing', 101)).toBe(false);
    expect(authenticated(store, token, 101)).toBe(true); expect(authenticated(store, token, 86_400_100)).toBe(false);
    expect(store.get('session', token)).toBeUndefined();
    expect(JSON.stringify(store.get('settings', 'admin'))).not.toContain('correct');
  });
});
describe('HTTP 集成', () => {
  async function fixture(publicDir?: string) {
    const store = memory(); initializeAdmin(store, 'admin'); const onMessage = vi.fn();
    const app = createApp({ store, now: () => 100, publicDir, onMessage, active: () => true }); disposers.push(() => app.close());
    const response = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } });
    const cookie = response.headers['set-cookie']!.toString().split(';')[0]; return { store, app, cookie, onMessage };
  }
  it('健康检查、来源保护、登录/登出及所有已实现 API 保护', async () => {
    const { app, cookie } = await fixture();
    expect((await app.inject('/api/health')).json()).toEqual({ ok: true });
    expect((await app.inject('/')).statusCode).toBe(404);
    for (const url of ['/api/session', '/api/state', '/api/unknown']) expect((await app.inject(url)).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/messages', payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/login', headers: { origin: 'https://evil.example' }, payload: { password: 'admin' } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/login', headers: { origin: 'http://localhost', host: 'localhost' }, payload: { password: 'wrong' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/api/login', payload: {} })).statusCode).toBe(400);
    expect((await app.inject({ url: '/api/session', headers: { cookie } })).json()).toEqual({ admin: true });
    const logout = await app.inject({ method: 'POST', url: '/api/logout', headers: { cookie } });
    expect(logout.json()).toEqual({ ok: true }); expect(logout.headers['set-cookie']).toContain('Max-Age=0');
    expect((await app.inject({ url: '/api/session', headers: { cookie } })).statusCode).toBe(401);
  });
  it('持久 inbox、幂等、冲突、空白与上限、任务事实', async () => {
    const { app, store, cookie, onMessage } = await fixture();
    const post = (payload: unknown) => app.inject({ method: 'POST', url: '/api/messages', headers: { cookie }, payload: payload as object });
    expect((await app.inject({ url: '/api/state', headers: { cookie } })).json()).toEqual({ messages: [], tasks: [], active: true, epoch: 0 });
    const first = await post({ id: 'msg-1', text: '寻找科技作者' }); expect(first.statusCode).toBe(201); expect(first.json().state).toBe('pending');
    expect((await post({ id: 'msg-1', text: '寻找科技作者' })).json()).toEqual(first.json()); expect(onMessage).toHaveBeenCalledTimes(1);
    expect((await post({ id: 'msg-1', text: '替换' })).statusCode).toBe(409);
    expect((await post({ id: 'msg-1', text: '寻找科技作者', attachments: ['data:image/png;base64,AAAA'] })).statusCode).toBe(409);
    expect((await post({ id: 'image', text: '参考图片', attachments: ['data:image/png;base64,AAAA'] })).json().attachments).toEqual(['data:image/png;base64,AAAA']);
    expect((await post({ id: 'bad-image', text: '图片', attachments: ['data:image/svg+xml;base64,AAAA'] })).statusCode).toBe(400);
    for (const body of [{}, { id: 'a', text: '' }, { id: 'a', text: '   ' }, { id: '../', text: 'hi' }, { id: 'a', text: 'x'.repeat(16001) }]) expect((await post(body)).statusCode).toBe(400);
    store.set('settings', 'epoch', 3); store.set('task', 't', { id: 't', status: 'running', matched: 0, matchedMeaning: '研究组入选的合格账号数；合格候选总数见qualifying' });
    expect((await post({ id: 'msg-2', text: '不要丢失任务' })).json().epoch).toBe(3);
    const state = (await app.inject({ url: '/api/state', headers: { cookie } })).json();
    expect(state.messages).toHaveLength(3); expect(state.tasks).toEqual([{ id: 't', status: 'running', matched: 0, allowHumanAssistance: true, matchedMeaning: '研究组入选的合格账号数；合格候选总数见qualifying' }]); expect(state.epoch).toBe(3);
  });
  it('生产静态目录可访问', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'studio-static-')); disposers.push(() => rmSync(dir, { recursive: true }));
    const { writeFileSync } = await import('node:fs'); writeFileSync(join(dir, 'index.html'), '<h1>Studio</h1>');
    const { app } = await fixture(dir); expect((await app.inject('/')).body).toBe('<h1>Studio</h1>');
  });
});
describe('实际启动', () => {
  it('首次启动密码、重启保留且资源可关闭', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '收到' } }] }) }));
    const interval = vi.spyOn(globalThis, 'setInterval');
    const dir = mkdtempSync(join(tmpdir(), 'studio-boot-')); disposers.push(() => rmSync(dir, { recursive: true }));
    const app = await start({ DATA_DIR: dir, ADMIN_PASSWORD: 'bootstrap-test', PORT: '0' });
    const leaseCallback = interval.mock.calls.find(([, ms]) => ms === 1000)![0]; (leaseCallback as () => void)();
    const [callback, milliseconds] = interval.mock.calls.at(-1)!; expect(milliseconds).toBe(1000); (callback as () => void)(); interval.mockRestore();
    expect(readFileSync(join(dir, 'admin-bootstrap.txt'), 'utf8')).toBe('bootstrap-test');
    expect(statSync(join(dir, 'admin-bootstrap.txt')).mode & 0o777).toBe(0o600);
    const session = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'bootstrap-test' } });
    const cookie = session.headers['set-cookie']!.toString().split(';')[0];
    expect((await app.inject({ method: 'POST', url: '/api/messages', headers: { cookie }, payload: { id: 'boot', text: 'boot' } })).statusCode).toBe(201);
    expect((await app.inject({ url: '/api/state', headers: { cookie } })).json().messages.length).toBeGreaterThan(0);
    await app.close(); const second = await start({ DATA_DIR: dir, ADMIN_PASSWORD: 'different', PORT: '0' });
    expect((await second.inject({ method: 'POST', url: '/api/login', payload: { password: 'bootstrap-test' } })).statusCode).toBe(200);
    await second.close();
  });
  it('默认目录、端口和随机密码', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'studio-default-')); disposers.push(() => rmSync(dir, { recursive: true }));
    const previous = process.cwd(); process.chdir(dir);
    try { const app = await start({}); expect(readFileSync(join(dir, 'data', 'admin-bootstrap.txt'), 'utf8')).toHaveLength(24); await app.close(); } finally { process.chdir(previous); }
  });
  it('入口调用实际引导接口', async () => {
    vi.doMock('../src/server/bootstrap.ts', () => ({ start: vi.fn() })); await import('../src/server/main.ts'); vi.doUnmock('../src/server/bootstrap.ts');
  });
  it('身份与所有工作流提示词明确职责', () => {
    expect(prompts.systemPrompt).toContain('unknown'); expect(prompts.systemPrompt).toContain('数据库事实');
    expect(prompts.workflowPrompt).toContain('Campaign'); expect(prompts.verificationPrompt).toContain('证据引用'); expect(prompts.compressionPrompt).toContain('未完成请求');
  });
});

it('桌面启用、租约恢复与到期回调，对暂时故障保留任务', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }); vi.stubGlobal('fetch', fetcher);
  const dir = mkdtempSync(join(tmpdir(), 'studio-desktop-boot-')); disposers.push(() => rmSync(dir, { recursive: true })); const intervals = vi.spyOn(globalThis, 'setInterval');
  const app = await start({ DATA_DIR: dir, PORT: '0', DESKTOP_URL: 'http://desktop:8810' }); const callbacks = intervals.mock.calls.filter(([, ms]) => ms === 1000).map(([callback]) => callback as () => void); callbacks.forEach(fn => fn()); await new Promise(resolve => setTimeout(resolve, 1));
  const disk = new Store(join(dir, 'studio.sqlite')); disk.set('assistance', 'expire', { id: 'expire', taskId: 'missing', creatorId: 'c', status: 'human', leaseUntil: 0 }); callbacks.forEach(fn => fn()); await vi.waitFor(() => expect(disk.get('assistance', 'expire')).toHaveProperty('status', 'done'));
  const auth = await app.inject({ method: 'POST', url: '/api/login', payload: { password: readFileSync(join(dir, 'admin-bootstrap.txt'), 'utf8') } }); const cookie = auth.headers['set-cookie']!.toString().split(';')[0];
  const spec = { title: 'boot report', personaText: 'tech', count: 1, candidateBudget: 1, platforms: ['instagram'], regions: [], minFollowers: 0, maxFollowers: 100000, criteria: [] };
  disk.set('task', 'boot-report', { id: 'boot-report', title: 'boot report', requested: 1, evaluated: 1, matched: 1, spec, candidates: [], status: 'completed', detail: 'verified', updatedAt: 1 });
  disk.set('asset', 'image', { id: 'image', file: join(process.cwd(), 'tests/fixtures/two-colors.png') });
  disk.set('result', 'boot-result', { id: 'boot-result', taskId: 'boot-report', creator: { id: 'instagram:person', platform: 'instagram', handle: 'person', displayName: 'Person', profileUrl: 'https://instagram.com/person', followers: 20000, region: null, evidence: [{ id: 'e', url: 'https://instagram.com/person', text: 'actual', assetId: 'image', kind: 'browser_snapshot', provider: 'headed-chromium', capturedAt: 1, publishedAt: null }], raw: {} }, verdict: 'match', judgments: [], tags: [], updatedAt: 1 });
  disk.set('campaign', 'boot-campaign', { id: 'boot-campaign', title: 'boot campaign', goal: 'tech', audience: 'students', revision: 1, groups: [{ id: 'tech', rationale: 'actual', spec }], childTaskIds: ['boot-report'], createdAt: 1, updatedAt: 1 });
  for(const url of ['/api/reports/boot-report','/api/campaigns/boot-campaign/report']) {
    const online=await app.inject({url,headers:{cookie}});expect(online.body).toContain('src="/api/assets/image"');expect(online.body).not.toContain('data:image/png;base64,');
    const offline=await app.inject({url:url+'?view=offline',headers:{cookie}});expect(offline.body).toContain('data:image/png;base64,');expect(offline.headers['content-disposition']).toContain('.html');
  }
  disk.set('work-batch','boot-batch',{id:'boot-batch',items:[{kind:'research',id:'boot-report',title:'boot report',reportUrl:'/api/reports/boot-report'}],sealed:true,delivered:true});
  for(const view of ['online','offline']){const report=await app.inject({url:'/api/work-batches/boot-batch/report?view='+view,headers:{cookie}});expect(report.statusCode).toBe(200);expect(report.body).toContain(view==='offline'?'data:image/png;base64,':'src="/api/assets/image"');}
  disk.set('assistance', 'claim', { id: 'claim', taskId: 'missing', creatorId: 'c', status: 'pending', leaseUntil: 0 }); await app.inject({ method: 'POST', url: '/api/desktop/assistance', headers: { cookie }, payload: { id: 'claim', action: 'claim', outcome: '' } }); await app.inject({ method: 'POST', url: '/api/desktop/assistance', headers: { cookie }, payload: { id: 'claim', action: 'release', outcome: 'done' } });
  disk.set('assistance', 'error', { id: 'error', taskId: 'missing', creatorId: 'c', status: 'human', leaseUntil: 0 }); fetcher.mockRejectedValueOnce(new Error('temporarily offline')); callbacks.forEach(fn => fn()); await new Promise(resolve => setTimeout(resolve, 1)); expect(disk.get('assistance', 'error')).toHaveProperty('status', 'human'); disk.close(); await app.close();
  const app2 = await start({ DATA_DIR: dir, PORT: '0', DESKTOP_URL: 'http://desktop:8810', DESKTOP_TOKEN_FILE: join(dir, 'desktop-token') }); await app2.close(); intervals.mockRestore();
});
