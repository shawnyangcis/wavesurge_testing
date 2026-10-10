import type { FastifyInstance } from 'fastify';
import type { Store } from './store.ts';
import type { SettingsManager } from './settings.ts';
import type { Agent } from './agent.ts';
import type { Backup } from './context.ts';
import type { PublicSettings } from '../shared/contracts.ts';
export function registerDebug(app: FastifyInstance, store: Store, settings: SettingsManager, agent: Agent) {
  app.get('/api/settings', async () => settings.public());
  app.post<{ Body: PublicSettings & { apiKey?: string } }>('/api/settings', { schema: { body: { type: 'object', required: ['baseUrl', 'modelId', 'compressionThreshold', 'systemPrompt', 'workflowPrompt', 'revision'], additionalProperties: false, properties: {
    baseUrl: { type: 'string', minLength: 1, maxLength: 2000 }, modelId: { type: 'string', minLength: 1, maxLength: 200 }, apiKey: { type: 'string', maxLength: 1000 }, compressionThreshold: { type: 'integer', minimum: 2000, maximum: 200000 }, systemPrompt: { type: 'string', minLength: 1, maxLength: 32000 }, workflowPrompt: { type: 'string', minLength: 1, maxLength: 16000 }, verificationPrompt: { type: 'string', minLength: 1, maxLength: 16000 }, compressionPrompt: { type: 'string', minLength: 1, maxLength: 16000 }, revision: { type: 'integer', minimum: 1 }
  } } } }, async (request, reply) => { try { return settings.save(request.body); } catch (error) { return reply.code(400).send({ error: (error as Error).message }); } });
  app.get('/api/debug', async () => settings.redact({ calls: store.list('call'), waveCalls: store.list('wave-call'), toolReceipts: store.list('tool-receipt'), pendingToolBatch: store.get('agent-flight', 'current'), context: agent.messages(), batches: agent.context.batches(), checkpoint: agent.context.checkpoint(), epoch: agent.context.epoch() }));
  app.get('/api/backup', async (_request, reply) => { reply.header('Content-Disposition', 'attachment; filename="creator-context.json"'); return settings.redact(agent.context.backup()); });
  app.post('/api/context/reset', async () => ({ epoch: agent.context.reset() }));
  app.post<{ Body: Backup }>('/api/context/load', async (request, reply) => { try { return { epoch: agent.context.load(request.body) }; } catch (error) { return reply.code(400).send({ error: (error as Error).message }); } });
  app.post('/api/context/compress', async (_request, reply) => { try { return { compacted: await agent.compact(true) }; } catch (error) { return reply.code(400).send({ error: (error as Error).message }); } });
}
