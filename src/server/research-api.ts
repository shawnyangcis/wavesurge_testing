import type { FastifyInstance } from 'fastify';
import type { ResearchEngine, ResearchTask } from './research.ts';
import { platforms } from '../shared/research.ts';
import type { Platform, Verdict, Result } from '../shared/research.ts';
import { filterResults, resultFilterProperties } from './result-filter.ts';
import type { ResultFilter } from './result-filter.ts';
import { htmlReport, csvReport, jsonReport, reportImage, reportCsp, reportViewSchema, offlineReportUrl } from './reports.ts';
import { workResults, type WorkBatch } from './work-delivery.ts';
import { reportResults, reportGroups } from './report-scope.ts';
export function registerResearch(app: FastifyInstance, engine: ResearchEngine, image?: (id: string) => string) {
  app.get<{ Params: { id: string }; Querystring: { format?: 'html' | 'csv' | 'json'; view?: 'online' | 'offline' } }>('/api/work-batches/:id/report', { schema: { querystring: { type: 'object', additionalProperties: false, properties: { format: { enum: ['html', 'csv', 'json'] }, view: reportViewSchema } } } }, async (request, reply) => {
    const batch = engine.store.get<WorkBatch>('work-batch', request.params.id); if (!batch) return reply.code(404).send({ error: '综合工作不存在' });
    const { task, results } = workResults(engine.store, batch);
    if (request.query.format === 'csv') { reply.type('text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="creator-batch.csv"'); return csvReport(task, results); }
    if (request.query.format === 'json') return reply.type('application/json; charset=utf-8').header('Content-Disposition', 'attachment; filename="creator-batch.json"').send(jsonReport(task, results, results, { kind: 'work_batch' }));
    const offline = request.query.view === 'offline'; if (offline) reply.header('Content-Disposition', 'attachment; filename="creator-batch.html"');
    reply.header('Content-Security-Policy', reportCsp); return reply.type('text/html; charset=utf-8').send(htmlReport(task, results, reportImage(image, offline), results, offline ? undefined : offlineReportUrl(request.url)));
  });
  app.get<{ Querystring: ResultFilter & { view?: 'summary' | 'full' } }>('/api/results', { schema: { querystring: { type: 'object', properties: { ...resultFilterProperties, view: { enum: ['summary','full'] } }, additionalProperties: false } } }, async request => {
    const rows = request.query.taskId ? engine.results(request.query.taskId) : engine.store.list<Result>('result');
    const results = filterResults(reportResults(engine.store, rows), request.query);
    if (request.query.view !== 'summary') return results;
    return results.map(result => {
      const { raw: _raw, photoUrls: _photos, ...creator } = result.creator;
      return { ...result, creator };
    });
  });
  app.get<{ Params: { taskId: string }; Querystring: ResultFilter & { format?: 'html' | 'csv' | 'json'; view?: 'online' | 'offline' } }>('/api/reports/:taskId', { schema: { querystring: { type: 'object', properties: { ...resultFilterProperties, format: { type: 'string', enum: ['html', 'csv', 'json'] }, view: reportViewSchema }, additionalProperties: false } } }, async (request, reply) => {
    const task = engine.store.get<ResearchTask>('task', request.params.taskId);
    if (!task) return reply.code(404).send({ error: '任务不存在' });
    const allResults = reportResults(engine.store, engine.results(task.id)), results = filterResults(allResults, request.query);
    if (request.query.format === 'csv') { reply.type('text/csv; charset=utf-8').header('Content-Disposition', 'attachment; filename="creators.csv"'); return csvReport(task, results); }
    if (request.query.format === 'json') return reply.type('application/json; charset=utf-8').header('Content-Disposition', 'attachment; filename="creators.json"').send(jsonReport({ ...task, reportGroups: reportGroups(engine.store, [task.id]) }, results, allResults, { filters: request.query }));
    const offline = request.query.view === 'offline'; if (offline) reply.header('Content-Disposition', 'attachment; filename="creators.html"');
    reply.type('text/html; charset=utf-8').header('Content-Security-Policy', reportCsp); return htmlReport({ ...task, reportGroups: reportGroups(engine.store, [task.id]) }, results, reportImage(image, offline), allResults, offline ? undefined : offlineReportUrl(request.url));
  });
}
