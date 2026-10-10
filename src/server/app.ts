import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import type { Store } from './store.ts';
import { authenticated, login } from './auth.ts';
import type { Message, Snapshot, Task } from '../shared/contracts.ts';
import { imagePattern } from '../shared/contracts.ts';
import { taskFacts } from './task-facts.ts';
export type AppOptions = { store: Store; now: () => number; publicDir?: string; onMessage: () => void; active: () => boolean };
export function createApp(options: AppOptions) {
  const { store, now } = options;
  const app = Fastify({ logger: false, bodyLimit: 12_000_000 });
  app.register(cookie);
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/') || request.url === '/api/health') return;
    if (request.method !== 'GET') {
      const origin = request.headers.origin;
      if (origin && new URL(origin).host !== request.headers.host) return reply.code(403).send({ error: '请求来源不正确' });
    }
    if (request.url === '/api/login') return;
    if (!authenticated(store, request.cookies.studio, now())) return reply.code(401).send({ error: '请先登录' });
  });
  app.get('/api/health', async () => ({ ok: true }));
  app.post<{ Body: { password: string } }>('/api/login', { schema: { body: { type: 'object', required: ['password'], additionalProperties: false, properties: { password: { type: 'string', minLength: 1, maxLength: 256 } } } } }, async (request, reply) => {
    const token = login(store, request.body.password, now());
    if (!token) return reply.code(401).send({ error: '密码不正确' });
    reply.setCookie('studio', token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 86400 });
    return { ok: true };
  });
  app.post('/api/logout', async (request, reply) => { store.delete('session', request.cookies.studio!); reply.clearCookie('studio', { path: '/' }); return { ok: true }; });
  app.get('/api/session', async () => ({ admin: true }));
  app.get('/api/state', async (): Promise<Snapshot> => ({ messages: store.list<Message>('message'), tasks: taskFacts(store), active: options.active(), epoch: store.get<number>('settings', 'epoch') ?? 0 }));
  app.post<{ Body: { id: string; text: string; attachments?: string[] } }>('/api/messages', { schema: { body: { type: 'object', required: ['id', 'text'], additionalProperties: false, properties: { id: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-zA-Z0-9_-]+$' }, text: { type: 'string', minLength: 1, maxLength: 16000, pattern: '\\S' }, attachments: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 2800000, pattern: imagePattern } } } } } }, async (request, reply) => {
    const { id, text, attachments = [] } = request.body;
    const existing = store.get<Message>('message', id);
    if (existing) {
      if (existing.text !== text || JSON.stringify(existing.attachments) !== JSON.stringify(attachments)) return reply.code(409).send({ error: '这条消息编号已被使用' });
      return existing;
    }
    const message: Message = { id, role: 'user', text, createdAt: now(), epoch: store.get<number>('settings', 'epoch') ?? 0, state: 'pending', attachments };
    store.set('message', id, message);
    options.onMessage();
    return reply.code(201).send(message);
  });
  if (options.publicDir) { app.register(staticFiles, { root: options.publicDir }); }
  return app;
}
