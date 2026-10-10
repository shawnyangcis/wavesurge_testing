import Fastify from 'fastify';
import type { DesktopCommand, DesktopRuntime } from './runtime.ts';
export function desktopServer(runtime: DesktopRuntime, token: string) {
  const app = Fastify({ logger: false });
  app.addHook('onRequest', async (request, reply) => { if (request.url !== '/health' && request.headers.authorization !== `Bearer ${token}`) return reply.code(401).send({ error: 'Internal authentication required' }); });
  app.get('/health', async () => ({ ok: true, blocked: runtime.blocked }));
  app.post<{ Body: DesktopCommand }>('/command', { schema: { body: { type: 'object', required: ['action'], additionalProperties: false, properties: { action: { enum: ['observe', 'navigate', 'click', 'fill', 'key'] }, url: { type: 'string', maxLength: 4000 }, selector: { type: 'string', maxLength: 1000 }, text: { type: 'string', maxLength: 4000 }, observationId: { type: 'string', maxLength: 100 } }, allOf: [ { if: { properties: { action: { const: 'navigate' } } }, then: { required: ['url'] } }, { if: { properties: { action: { enum: ['click', 'fill'] } } }, then: { required: ['selector', 'observationId'] } }, { if: { properties: { action: { enum: ['fill', 'key'] } } }, then: { required: ['text', 'observationId'] } } ] } } }, async (request, reply) => { try { return await runtime.command(request.body); } catch (error) { return reply.code(409).send({ error: (error as Error).message }); } });
  app.post<{ Body: { urls: string[] } }>('/scope', { schema: { body: { type: 'object', required: ['urls'], additionalProperties: false, properties: { urls: { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 4000 } } } } } }, async request => { runtime.policy.scope(request.body.urls); runtime.observation = undefined; return { scoped: true }; });
  app.post('/pause', async () => runtime.pause()); app.post('/resume', async () => runtime.resume());
  return app;
}
