import type { FastifyInstance } from 'fastify';
import type { ResearchEngine, ResearchTask } from './research.ts';
import { platforms } from '../shared/research.ts';
import type { Platform, Verdict, Result } from '../shared/research.ts';
import { filterResults, resultFilterProperties } from './result-filter.ts';
import type { ResultFilter } from './result-filter.ts';
import { htmlReport, csvReport } from './reports.ts';
import { workResults, type WorkBatch } from './work-delivery.ts';
import { reportResults, reportGroups } from './report-scope.ts';
export function registerResearch(app: FastifyInstance, engine: ResearchEngine, image?: (id: string) => string) {
  app.get<{ Params: { id: string }; Querystring: { format?: 'html' | 'csv' } }>('/api/work-batches/:id/report', { schema: { querystring: { type: 'object', additionalProperties: false, properties: { format: { enum: ['html', 'csv'] } } } } }, async (request, reply) => {
    const batch = engine.store.get<WorkBatch>('work-batch', request.params.id); if (!batch) return reply.code(404).send({ error: '综合工作不存在' });
    const { task, results } = workResults(engine.store, batch);
    if (request.query.format === 'csv') { reply.type('text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="creator-batch.csv"'); return csvReport(task, results); }
    reply.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:"); return reply.type('text/html; charset=utf-8').send(htmlReport(task, results, image));
  });
  app.get<{ Querystring: ResultFilter }>('/api/results', { schema: { querystring: { type: 'object', properties: resultFilterProperties, additionalProperties: false } } }, async request => filterResults(reportResults(engine.store, engine.store.list<Result>('result')), request.query));
  app.get<{ Params: { taskId: string }; Querystring: ResultFilter & { format?: 'html' | 'csv' } }>('/api/reports/:taskId', { schema: { querystring: { type: 'object', properties: { ...resultFilterProperties, format: { type: 'string', enum: ['html', 'csv'] } }, additionalProperties: false } } }, async (request, reply) => {
    const task = engine.store.get<ResearchTask>('task', request.params.taskId);
    if (!task) return reply.code(404).send({ error: '任务不存在' });
    const allResults = reportResults(engine.store, engine.results(task.id)), results = filterResults(allResults, request.query);
    if (request.query.format === 'csv') { reply.type('text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="creators.csv"'); return csvReport(task, results); }
    reply.type('text/html; charset=utf-8').header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:"); return htmlReport({ ...task, reportGroups: reportGroups(engine.store, [task.id]) }, results, image, allResults);
  });
}
