import type { FastifyInstance } from 'fastify';
import proxy from '@fastify/http-proxy';
import { WebSocket, WebSocketServer } from 'ws';
import { authenticated } from './auth.ts';
import type { DesktopBroker, Asset } from './desktop.ts';
import { readFileSync } from 'node:fs';
export function registerDesktop(app: FastifyInstance, broker: DesktopBroker, wake: () => void) {
  app.get('/api/desktop', async () => ({ request: broker.active(), connected: true }));
  app.post<{ Body: { id: string; action: 'claim' | 'release'; outcome: string } }>('/api/desktop/assistance', { schema: { body: { type: 'object', required: ['id', 'action', 'outcome'], additionalProperties: false, properties: { id: { type: 'string', minLength: 1 }, action: { enum: ['claim', 'release'] }, outcome: { type: 'string', maxLength: 2000 } } } } }, async (request, reply) => {
    try { const result = request.body.action === 'claim' ? await broker.claim(request.body.id) : await broker.release(request.body.id, request.body.outcome); wake(); return result; } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });
  app.post<{ Body: { mode: 'view' | 'control' } }>('/api/desktop/viewer', { schema: { body: { type: 'object', required: ['mode'], additionalProperties: false, properties: { mode: { enum: ['view', 'control'] } } } } }, async (request, reply) => {
    try { const mode = request.body.mode; const grant = broker.grant(mode); reply.setCookie(`desktop_${mode}`, grant.token, { path: `/api/desktop/${mode}`, httpOnly: true, sameSite: 'strict', maxAge: 300 }); return { url: `/api/desktop/${mode}/vnc.html?autoconnect=true&resize=scale&path=api/desktop/${mode}/websockify`, expiresAt: grant.expires }; } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
  });
  app.get<{ Params: { id: string } }>('/api/assets/:id', async (request, reply) => { const asset = broker.store.get<Asset>('asset', request.params.id); if (!asset) return reply.code(404).send({ error: '截图不存在' }); reply.header('Cache-Control', 'private, no-store'); return reply.type('image/png').send(readFileSync(asset.file)); });
  for (const [mode, port] of [['view', '6080'], ['control', '6081']]) app.register(proxy, { upstream: `${new URL(broker.url).origin.replace(/:\d+$/, '')}:${port}`, prefix: `/api/desktop/${mode}`, websocket: false, preHandler: async (request, reply) => { if (!broker.allowed(mode, request.cookies[`desktop_${mode}`])) return reply.code(403).send({ error: '查看授权已到期，请重新打开桌面' }); }, replyOptions: { rewriteRequestHeaders: (_request, headers) => ({ ...headers, cookie: '', authorization: '' }) } });
  const wss = new WebSocketServer({ noServer: true }); const connections = new Map<WebSocket, { target: WebSocket; mode: string; token: string }>();
  const revoke = () => { for (const [source, { target, mode, token }] of connections) if (!broker.allowed(mode, token)) { source.close(); target.close(); } };
  broker.onRevoke = revoke;
  const timer = setInterval(revoke, 1000);
  app.server.on('upgrade', (request, socket, head) => {
    const mode = request.url?.match(/^\/api\/desktop\/(view|control)\/websockify(?:\?|$)/)?.[1]; const cookies = app.parseCookie(request.headers.cookie ?? '');
    if (!mode || !authenticated(broker.store, cookies.studio, broker.now()) || !broker.allowed(mode, cookies[`desktop_${mode}`]) || request.headers.origin !== `http://${request.headers.host}`) { socket.destroy(); return; }
    const token = cookies[`desktop_${mode}`]; const url = new URL(broker.url); url.protocol = 'ws:'; url.port = mode === 'view' ? '6080' : '6081'; url.pathname = '/websockify';
    const target = new WebSocket(url);
    target.on('error', () => socket.destroy());
    target.once('open', () => {
      if (!broker.allowed(mode, token)) { target.close(); socket.destroy(); return; }
      wss.handleUpgrade(request, socket, head, source => {
        connections.set(source, { target, mode, token });
        source.on('message', (data, binary) => { if (!broker.allowed(mode, token)) { source.close(); target.close(); return; } target.send(data, { binary }); });
        target.on('message', (data, binary) => { if (source.readyState === WebSocket.OPEN) source.send(data, { binary }); });
        source.on('error', () => target.close()); source.on('close', () => { connections.delete(source); target.close(); }); target.on('close', () => source.close());
      });
    });
  });
  app.addHook('preClose', async () => { clearInterval(timer); for (const [source, { target }] of connections) { source.terminate(); target.terminate(); } wss.close(); });
  return { connections, revoke };
}
