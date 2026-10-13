import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import type { AnnotationDimension, Assessment, Result, SearchSpec } from '../shared/research.ts';
import { searchSchema } from '../shared/research.ts';
import type { ResearchEngine, ResearchTask, Verifier } from './research.ts';
import type { Task } from '../shared/contracts.ts';
import { HumanRequired } from './desktop.ts';
import { ModelError } from './model.ts';
import { applyAssessment, refreshCountryFact, resultTags } from './assessment.ts';
import { resolveJudgments } from './verdict.ts';
import { deliverReport } from './delivery.ts';
export type Enrichment = { id: string; taskId: string; mode: 'annotate' | 'reverify'; resultIds: string[]; annotations: AnnotationDimension[]; completed: string[]; attempts: Record<string, number>; nextAt: number; failures: string[] };
const validate = new Ajv().compile<AnnotationDimension[]>(searchSchema.properties.annotations);
export class EnrichmentService {
 engine: ResearchEngine; annotate: Verifier;
 constructor(engine: ResearchEngine) { this.engine = engine; this.annotate = engine.verify; }
 start(input: unknown, callId: string) {
  const args = input as { taskId: string; mode: Enrichment['mode']; resultIds?: string[]; annotations?: AnnotationDimension[] };
  if (!args || typeof args.taskId !== 'string' || !['annotate', 'reverify'].includes(args.mode) || !validate(args.annotations ?? []) || args.resultIds !== undefined && (!Array.isArray(args.resultIds) || args.resultIds.some(id => typeof id !== 'string'))) throw new Error('补标/重新核验参数不正确');
  const source = this.engine.store.get<ResearchTask>('task', args.taskId); if (!source?.spec) throw new Error('原研究任务不存在');
  const available = this.engine.results(source.id); const resultIds = args.resultIds ?? available.map(result => result.id);
  if (!resultIds.length || resultIds.some(id => !available.some(result => result.id === id)) || new Set(resultIds).size !== resultIds.length) throw new Error('请选择原任务已有的唯一结果');
  const id = `enrich-${createHash('sha256').update(callId).digest('hex').slice(0, 24)}`;
  const existing = this.engine.store.get<Enrichment>('enrichment', id); if (existing) return this.engine.store.get<Task>('task', id)!;
  const job: Enrichment = { id, taskId: source.id, mode: args.mode, resultIds, annotations: args.annotations ?? source.spec.annotations ?? [], completed: [], attempts: {}, nextAt: 0, failures: [] };
  const task: Task = { id, resultTaskId: source.id, title: `${args.mode === 'annotate' ? '补充画像' : '重新核验'}：${source.title}`, status: 'queued', requested: resultIds.length, evaluated: 0, matched: 0, detail: '复用已有账号与搜索，不创建新的 WaveSurge 请求', ...(source.reviewNote ? { reviewNote: source.reviewNote } : {}), updatedAt: this.engine.now() };
  this.engine.store.transaction(() => { this.engine.store.set('enrichment', id, job); this.engine.store.set('task', id, task); }); return task;
 }
 async tick(browserBlocked: boolean) {
  for (const job of this.engine.store.list<Enrichment>('enrichment')) {
   const task = this.engine.store.get<Task>('task', job.id)!;
   if (this.engine.stopped || !['queued', 'running'].includes(task.status) || job.nextAt > this.engine.now() || job.mode === 'reverify' && browserBlocked) continue;
   const source = this.engine.store.get<ResearchTask>('task', job.taskId)!;
   const spec: SearchSpec = { ...source.spec, ...(job.mode === 'reverify' ? { verificationMode: 'browser' as const } : {}), annotations: job.mode === 'annotate' ? job.annotations : [...new Map([...(source.spec.annotations ?? []), ...job.annotations].map(item => [item.id, item])).values()] };
   task.status = 'running'; task.detail = '正在分析已有候选与证据'; this.engine.store.set('task', task.id, task);
   for (const id of job.resultIds.filter(value => !job.completed.includes(value))) {
    const previous = this.engine.store.get<Result>('result', id)!; const creator = structuredClone(previous.creator);
    try {
     if (job.mode === 'reverify') refreshCountryFact(spec, creator);
     const output = await (job.mode === 'annotate' ? this.annotate : this.engine.verify)(spec, creator, job.id);
     if (this.engine.stopped || this.engine.store.get<Task>('task', job.id)!.status === 'cancelled') break;
     if (this.engine.store.get<Result>('result', id)!.updatedAt !== previous.updatedAt || this.engine.store.get<Result>('result', id)!.revision !== previous.revision) throw new Error('结果版本已变化，本次分析未覆盖新版本，请重试');
     const assessment = applyAssessment(spec, creator, job.mode === 'annotate' && !Array.isArray(output) ? { ...output, facts: [] } : output);
     const outcome = job.mode === 'annotate' ? { verdict: previous.verdict, judgments: previous.judgments } : resolveJudgments(spec, creator, assessment.judgments);
     const annotations = [...(previous.annotations ?? []).filter(item => !spec.annotations!.some(dimension => dimension.id === item.dimensionId)), ...assessment.annotations!];
     const result: Result = { ...previous, creator, ...outcome, annotations, tags: resultTags(spec, { ...assessment, annotations, judgments: outcome.judgments }), revision: (previous.revision ?? 1) + 1, updatedAt: this.engine.now() };
     this.engine.store.transaction(() => { this.engine.store.set('result-history', `${id}|${previous.revision ?? 1}`, previous); this.engine.store.set('result', id, result); job.completed.push(id); task.evaluated = job.completed.length; task.matched = job.completed.filter(value => this.engine.store.get<Result>('result', value)!.verdict === 'match').length; if (job.mode === 'reverify') { this.engine.recount(source); if (['completed', 'partial'].includes(source.status)) source.status = source.matched >= source.requested ? 'completed' : 'partial'; } this.engine.save(source, false); });
    } catch (error) {
     if (this.engine.store.get<Task>('task', job.id)!.status === 'cancelled') break;
     if (error instanceof HumanRequired) { task.status = 'needs_input'; task.detail = error.message; browserBlocked = true; }
     else if (error instanceof ModelError && error.retryable() && (job.attempts[id] ?? 0) < 2) { job.attempts[id] = (job.attempts[id] ?? 0) + 1; job.nextAt = this.engine.now() + Math.max(error.retryAfterMs, 1000 * 2 ** job.attempts[id]); task.detail = '模型暂不可用，等待重试原分析'; }
     else { job.completed.push(id); job.failures.push(`${id}: ${(error as Error).message}`); }
    }
    break; // One candidate per tick; other research and chat retain their own execution lanes.
   }
   if (this.engine.store.get<Task>('task', job.id)!.status === 'cancelled') continue;
   if (job.completed.length === job.resultIds.length) { const visited = job.mode === 'reverify' ? job.completed.filter(id => this.engine.store.get<Result>('result', id)!.judgments.some(j => j.criterionId === '__profile_visit' && j.verdict === 'match')).length : 0; task.status = job.failures.length || job.mode === 'reverify' && visited < job.resultIds.length ? 'partial' : 'completed'; task.detail = `已处理 ${job.completed.length} 个已有账号；失败 ${job.failures.length}。${job.failures.join('；')}${job.mode === 'reverify' ? ` 本轮本人主页已观察 ${visited}/${job.resultIds.length}；未取得本轮页面证据者不能宣称网页核验成功。` : ''}`; }
   task.updatedAt = this.engine.now();
   this.engine.store.transaction(() => { this.engine.store.set('enrichment', job.id, job); this.engine.store.set('task', task.id, task); if (!task.deliveryBatchId && ['completed', 'partial'].includes(task.status)) deliverReport(this.engine.store, job.id, { status: task.status, completed: job.completed, failures: job.failures }, `${task.title}已结束。${task.detail}${task.reviewNote ? `\n\n${task.reviewNote}` : ''}\n\n[查看更新后的报告](/api/reports/${job.taskId})`, this.engine.now()); });
  }
 }
}
