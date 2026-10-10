import { expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { Store } from '../src/server/store.ts';
import { initializeAdmin } from '../src/server/auth.ts';
import { createApp } from '../src/server/app.ts';
import { registerDesktop } from '../src/server/desktop-api.ts';
import { DesktopBroker } from '../src/server/desktop.ts';
function once(emitter: { once: (event: string, callback: (...args: any[]) => void) => unknown }, event: string) { return new Promise<any[]>(resolve => emitter.once(event, (...args) => resolve(args))); }
it('鉴权资产/只读代理；控制认领、每条 WS 输入授权、撤销和连接恢复竞态', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-proxy-')); const store = new Store(':memory:'); let now = 1; let delay = false; let acceptPending: (() => void) | undefined;
  const upstream = createServer((request, response) => { expect(request.headers.cookie ?? '').toBe(''); expect(request.headers.authorization ?? '').toBe(''); response.end('<html>noVNC fixture</html>'); });
  const control = createServer(); const upstreamWs = new WebSocketServer({ noServer: true }); const received: string[] = [];
  control.on('upgrade', (req, socket, head) => { const accept = () => upstreamWs.handleUpgrade(req, socket, head, ws => { ws.on('message', data => { received.push(data.toString()); ws.send(data); }); }); if (delay) acceptPending = accept; else accept(); });
  const viewWs = new WebSocketServer({ server: upstream }); viewWs.on('connection', ws => ws.on('message', data => ws.send(data)));
  await new Promise<void>(resolve => upstream.listen(6080, '127.0.0.1', resolve)); await new Promise<void>(resolve => control.listen(6081, '127.0.0.1', resolve));
  const broker = new DesktopBroker(store, 'http://127.0.0.1:8810', 'internal', dir, vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch, () => now);
  initializeAdmin(store, 'admin'); const app = createApp({ store, now: () => now, onMessage: () => {}, active: () => false }); const wake = vi.fn(); const relay = registerDesktop(app, broker, wake); const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const session = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } }); const cookie = session.headers['set-cookie']!.toString().split(';')[0];
  const post = (url: string, payload: object) => app.inject({ method: 'POST', url, headers: { cookie }, payload }); const get = (url: string, grant = '') => app.inject({ url, headers: { cookie: `${cookie}; ${grant}` } });
  const sockets: WebSocket[] = []; const open = async (mode: string, grant: string) => { const ws = new WebSocket(`${address.replace('http:', 'ws:')}/api/desktop/${mode}/websockify`, { headers: { cookie: `${cookie}; ${grant}`, origin: address } }); sockets.push(ws); await once(ws, 'open'); return ws; };
  try {
    expect((await get('/api/desktop')).json()).toEqual({ connected: true }); expect((await get('/api/assets/missing')).statusCode).toBe(404);
    const bytes = readFileSync('tests/fixtures/two-colors.png'); store.set('asset', 'id', { id: 'id', file: 'tests/fixtures/two-colors.png' }); expect((await get('/api/assets/id')).rawPayload).toEqual(bytes);
    expect((await post('/api/desktop/viewer', { mode: 'control' })).statusCode).toBe(409); expect((await post('/api/desktop/assistance', { id: 'missing', action: 'claim', outcome: '' })).statusCode).toBe(409);
    expect((await get('/api/desktop/view/vnc.html')).statusCode).toBe(403); const view = await post('/api/desktop/viewer', { mode: 'view' }); const viewCookie = view.headers['set-cookie']!.toString().split(';')[0]; expect(view.json().url).toContain('vnc.html'); expect((await get('/api/desktop/view/vnc.html', viewCookie)).body).toContain('noVNC');
    const readOnly = await open('view', viewCookie); const echo = once(readOnly, 'message'); readOnly.send('handshake'); expect((await echo)[0].toString()).toBe('handshake');
    for (const [url, headers] of [[`${address.replace('http:', 'ws:')}/bad`, {}], [`${address.replace('http:', 'ws:')}/api/desktop/view/websockify`, {}], [`${address.replace('http:', 'ws:')}/api/desktop/view/websockify`, { cookie, origin: 'http://evil.test' }]] as const) { const denied = new WebSocket(url, { headers }); sockets.push(denied); await once(denied, 'error'); }
    store.set('assistance', 'r', { id: 'r', taskId: 't', creatorId: 'c', status: 'pending', leaseUntil: 0 }); expect((await post('/api/desktop/assistance', { id: 'r', action: 'claim', outcome: '' })).statusCode).toBe(200);
    const grant = await post('/api/desktop/viewer', { mode: 'control' }); const controlCookie = grant.headers['set-cookie']!.toString().split(';')[0]; const controlled = await open('control', controlCookie); const inputEcho = once(controlled, 'message'); controlled.send('pointer'); expect((await inputEcho)[0].toString()).toBe('pointer');
    now += 300001; const closed = once(controlled, 'close'); controlled.send('revoked-input'); await closed; expect(received).toEqual(['pointer']); relay.revoke();
    const refresh = await post('/api/desktop/viewer', { mode: 'control' }); const renewedCookie = refresh.headers['set-cookie']!.toString().split(';')[0]; const renewed = await open('control', renewedCookie); const c = once(renewed, 'close'); expect((await post('/api/desktop/assistance', { id: 'r', action: 'release', outcome: 'done' })).statusCode).toBe(200); await c; expect(wake).toHaveBeenCalledTimes(2);
    delay = true; store.set('assistance', 'r2', { id: 'r2', taskId: 't', status: 'human', leaseUntil: now + 900000 }); const raceGrant = await post('/api/desktop/viewer', { mode: 'control' }); const raceCookie = raceGrant.headers['set-cookie']!.toString().split(';')[0];
    const upgradeStarted = once(control, 'upgrade');
    const racing = new WebSocket(`${address.replace('http:', 'ws:')}/api/desktop/control/websockify`, { headers: { cookie: `${cookie}; ${raceCookie}`, origin: address } }); sockets.push(racing); const failed = once(racing, 'error'); await upgradeStarted; broker.grant('control'); acceptPending!(); await failed; delay = false;
    const latest = await post('/api/desktop/viewer', { mode: 'control' }); const latestCookie = latest.headers['set-cookie']!.toString().split(';')[0]; const live = await open('control', latestCookie); const [source, connection] = [...relay.connections].at(-1)!;
    const sourceClose = once(live, 'close'); source.emit('error', new Error('disconnected')); await sourceClose;
    const stillLive = await open('control', latestCookie); const [closingSource, closingConnection] = [...relay.connections].at(-1)!; closingSource.close(); closingConnection.target.emit('message', Buffer.from('late'), true); await once(stillLive, 'close');
    const transportFailure = await open('control', latestCookie); const broken = once(transportFailure, 'close'); [...relay.connections].at(-1)![1].target.emit('error', new Error('upstream failure')); await broken;
    await open('control', latestCookie); await app.close();
  } finally { sockets.forEach(ws => ws.terminate()); for (const ws of upstreamWs.clients) ws.terminate(); for (const ws of viewWs.clients) ws.terminate(); upstreamWs.close(); viewWs.close(); await app.close(); await new Promise<void>(resolve => upstream.close(() => resolve())); await new Promise<void>(resolve => control.close(() => resolve())); store.close(); rmSync(dir, { recursive: true }); }
});
