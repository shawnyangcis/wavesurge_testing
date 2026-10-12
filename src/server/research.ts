import type { Assistance } from './desktop.ts';
import { EnrichmentService } from './enrichment.ts';
import { ModelError } from './model.ts';
import { deliverReport } from './delivery.ts';
import { deliverWorkBatches } from './work-delivery.ts';
import { rankResults } from './selection.ts';
import { applyAssessment, resultTags } from './assessment.ts';
import { creatorIdentity } from './canonical.ts';
import { HumanRequired } from './desktop.ts';
import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import type { Store } from './store.ts';
import { normalizeCreator, searchBody, WaveError } from './wave.ts';
import type { SearchBody, WaveClient } from './wave.ts';
import type { Assessment, Creator, Judgment, Result, SearchSpec } from '../shared/research.ts';
import { searchSchema } from '../shared/research.ts';
import type { Task } from '../shared/contracts.ts';
import { resolveJudgments } from './verdict.ts';
import type { Discovery } from './discovery.ts';
export type ResearchTask = Task & { spec: SearchSpec; body: SearchBody; discovery?: Discovery; discoveryAttempts?: number; remoteId?: string; remoteStatus?: string; nextPollAt: number; candidates: Creator[]; failures: string[]; exhaustive?: boolean; verificationAttempts?: Record<string, { count: number; nextAt: number; resultRevision?: number }>; };
export type Verifier = (spec: SearchSpec, creator: Creator, taskId: string) => Promise<Judgment[] | Assessment>;
const validate = new Ajv().compile<SearchSpec>(searchSchema);
export class ResearchEngine {
  store: Store; wave: Pick<WaveClient, 'submit' | 'poll'> & Partial<Pick<WaveClient, 'discover'>>; verify: Verifier; now: () => number;
  enrichment: EnrichmentService; textVerify: Verifier; shortlist = async (_spec: SearchSpec, creators: Creator[], _budget: number) => creators;
  onProgress = () => {};
  active = false; stopped = false; currentRun: Promise<void> = Promise.resolve();
  laneFlights: (Promise<void> | undefined)[] = [undefined, undefined]; laneErrors: unknown[] = []; finishing = false;
  constructor(store: Store, wave: Pick<WaveClient, 'submit' | 'poll'> & Partial<Pick<WaveClient, 'discover'>>, verify: Verifier, now: () => number) { this.store = store; this.wave = wave; this.verify = verify; this.textVerify = verify; this.now = now; this.enrichment = new EnrichmentService(this); }
  usesDesktop(spec: SearchSpec) { return spec.verificationMode !== 'text'; }
  start(input: unknown, callId: string) {
    if (!validate(input)) throw new Error('筛选范围格式不正确，请补充数量、平台、地区、条件与预算');
    if (input.minFollowers > input.maxFollowers || input.candidateBudget < input.count || new Set(input.criteria.map(item => item.id)).size !== input.criteria.length) throw new Error('筛选范围存在冲突');
    if (input.instagram?.handles && (input.instagram.handles.length > input.candidateBudget || new Set(input.instagram.handles.map(handle => handle.toLowerCase())).size !== input.instagram.handles.length)) throw new Error('指定账号数量超过分析预算或身份重复');
    if (!input.instagram?.handles?.length && input.instagram?.profileBudget !== undefined && input.instagram.profileBudget < input.candidateBudget) throw new Error('基础账号读取预算不能小于分析预算');
    const id = `research-${createHash('sha256').update(callId).digest('hex').slice(0, 24)}`;
    const existing = this.store.get<ResearchTask>('task', id);
    if (existing) {
      if (JSON.stringify(existing.spec) !== JSON.stringify(input)) throw new Error('同一次调用的筛选条件已变化');
      return existing;
    }
    const task: ResearchTask = { id, title: input.title, spec: input, body: searchBody(input, id), status: 'queued', requested: input.count, evaluated: 0, matched: 0, updatedAt: this.now(), detail: '等待读取 WaveSurge 候选与原始资料', nextPollAt: 0, candidates: [], failures: [] };
    this.store.set('task', id, task); return task;
  }
  cancel(id: string) {
    const task = this.store.get<ResearchTask>('task', id);
    if (!task) throw new Error('任务不存在');
    if (['completed', 'partial', 'failed', 'cancelled'].includes(task.status)) return task;
    task.status = 'cancelled'; task.detail = '已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续'; this.save(task); return task;
  }
  save(task: ResearchTask, notify = true) {
    this.store.transaction(() => {
    task.updatedAt = this.now(); this.store.set('task', task.id, task);
    if (notify && !task.deliveryBatchId && !task.parentCampaignId && ['completed', 'partial', 'failed', 'cancelled'].includes(task.status)) {
      const results = this.results(task.id);
      deliverReport(this.store, task.id, { status: task.status, matched: task.matched, evaluated: task.evaluated, results: results.map(result => [result.id, result.updatedAt]) },
        `研究「${task.title}」${task.status === 'completed' ? '已完成' : task.status === 'partial' ? '已结束，仍有缺额' : task.status === 'cancelled' ? '已取消' : '未完成'}。已选合格 ${task.matched}/${task.requested} 人，核验 ${task.evaluated} 人。\n\n${task.detail}\n\n[查看完整报告](/api/reports/${task.resultTaskId ?? task.id}) · [下载 CSV](/api/reports/${task.resultTaskId ?? task.id}?format=csv)`, this.now());
    }
    if (notify && ['completed', 'partial', 'failed', 'cancelled'].includes(task.status)) { this.onProgress(); deliverWorkBatches(this.store, this.now()); }
    });
  }
  recount(task: ResearchTask) {
    const results = this.results(task.id); const qualifying = rankResults(task.spec, results.filter(result => result.verdict === 'match'));
    const selected = new Set(qualifying.slice(0, task.requested).map(result => result.id));
    for (const result of results) { result.selected = selected.has(result.id); this.store.set('result', result.id, result); }
    task.qualifying = qualifying.length; task.evaluated = results.length; task.matched = selected.size;
  }
  results(taskId: string) { return this.store.results<Result>(taskId); }
  cancelled(task: ResearchTask) { return this.stopped || this.store.task<ResearchTask>(task.id)!.status === 'cancelled'; }
  wake() {
    if (this.stopped) return this.currentRun;
    if (this.active) { this.launchLane(false); this.launchLane(true); return this.currentRun; }
    this.active = true; this.currentRun = this.cycle().finally(() => { this.active = false; }); return this.currentRun;
  }
  launchLane(desktop: boolean) {
    const index = desktop ? 1 : 0;
    if (this.stopped || this.finishing || this.laneFlights[index]) return;
    if (!this.store.tasks<ResearchTask>().some(task => task.spec && ['queued', 'running', 'needs_input'].includes(task.status) && this.usesDesktop(task.spec) === desktop)) return;
    const flight = this.tick(desktop).finally(() => { this.laneFlights[index] = undefined; });
    this.laneFlights[index] = flight;
    // A late lane may reject before the outer cycle reaches its wait. Attach a
    // handler immediately; keep the failure for the cycle after both lanes settle.
    void flight.catch(error => { this.laneErrors.push(error); });
  }
  async cycle() {
    // Text verification never uses the shared desktop. It can progress while
    // the single browser lane waits for pages or visual model responses.
    this.laneErrors = []; this.launchLane(false); this.launchLane(true);
    while (this.laneFlights.some(Boolean)) await Promise.allSettled(this.laneFlights.filter((flight): flight is Promise<void> => !!flight));
    if (this.laneErrors.length) throw this.laneErrors[0];
    // Enrichment can update an existing source task; don't overlap it with a
    // newly arriving research lane that might save another version of that task.
    this.finishing = true;
    try { await this.enrichment.tick(this.store.list<Assistance>('assistance').some(request => request.status !== 'done')); }
    finally { this.finishing = false; }
    this.onProgress(); deliverWorkBatches(this.store, this.now());
  }
  async tick(desktopLane?: boolean) {
    let browserBlocked = this.store.list<Assistance>('assistance').some(request => request.status !== 'done');
    for (const state of this.store.tasks<ResearchTask>()) {
      if (this.stopped) break;
      if (!state.spec || !['queued', 'running', 'needs_input'].includes(state.status)) continue;
      if (desktopLane !== undefined && this.usesDesktop(state.spec) !== desktopLane) continue;
      if (browserBlocked && this.usesDesktop(state.spec) && !(state.nextPollAt <= this.now() && !['done', 'failed'].includes(state.remoteStatus ?? ''))) continue;
      const task = this.store.get<ResearchTask>('task', state.id)!;
      try {
        const rawDiscovery = !task.remoteId && !!this.wave.discover;
        if (rawDiscovery && task.remoteStatus !== 'done' && task.nextPollAt <= this.now()) {
          task.status = task.status === 'needs_input' ? 'needs_input' : 'running'; task.detail = '正在读取 WaveSurge 原始资料；本地筛选尚未完成'; this.save(task);
          const batch = await this.wave.discover!(task.spec, task.discovery);
          if (this.cancelled(task)) continue;
          task.status = this.store.get<ResearchTask>('task', task.id)!.status;
          task.discovery = batch.state; task.discoveryAttempts = 0;
          task.remoteStatus = batch.state.done ? 'done' : 'running'; task.nextPollAt = this.now() + 1000;
          const incoming = batch.creators.some(creator => creator.platform !== 'instagram') ? await this.shortlist(task.spec, batch.creators, task.spec.candidateBudget - task.candidates.length) : batch.creators;
          if (this.cancelled(task)) continue;
          task.candidates = [...new Map([...task.candidates, ...incoming].map(creator => [creator.id, creator])).values()].slice(0, task.spec.candidateBudget);
          task.detail = `已读取 ${task.candidates.length} 位候选；来源 ${batch.state.done ? '已到本次读取边界' : '继续读取'}，合格候选 ${task.qualifying ?? 0} 人，研究组预选 ${task.matched} 人`; this.save(task);
        }
        if (!rawDiscovery && !task.remoteId) {
          if (task.nextPollAt > this.now()) continue;
          task.status = 'running'; task.detail = '正在提交历史协议搜索'; this.save(task);
          task.remoteId = await this.wave.submit(task.body);
          if (this.cancelled(task)) { const latest = this.store.get<ResearchTask>('task', task.id)!; latest.remoteId = task.remoteId; this.save(latest); continue; }
          task.detail = '搜索已提交，等待 WaveSurge 返回候选'; task.nextPollAt = this.now() + 60000; this.save(task); continue;
        }
        if (!rawDiscovery && task.remoteStatus !== 'done' && task.remoteStatus !== 'failed' && task.nextPollAt <= this.now()) {
          const remote = await this.wave.poll(task.remoteId!);
          if (this.cancelled(task)) continue;
          task.status = this.store.get<ResearchTask>('task', task.id)!.status;
          task.remoteStatus = remote.status; task.nextPollAt = this.now() + 60000;
          const unique = new Map(task.candidates.map(creator => [creatorIdentity(creator), creator])); const seen = new Set<string>();
          for (const raw of [...remote.creators, ...(remote.alsoFound ?? [])]) {
            try {
              const creator = normalizeCreator(raw, this.now()); if (seen.has(creator.id)) continue; seen.add(creator.id);
              const previous = unique.get(creator.id);
              if (previous) {
                creator.handle ||= previous.handle;
                creator.evidence = [...new Map([...previous.evidence, ...creator.evidence].map(item => [item.id, item])).values()];
                const saved = this.store.get<Result>('result', `${task.id}|${creator.id}`);
                if (saved && (saved.creator.followers !== creator.followers || saved.creator.region !== creator.region || JSON.stringify(saved.creator.raw.factorGrades) !== JSON.stringify(creator.raw.factorGrades))) {
                  creator.facts = structuredClone(saved.creator.facts);
                  const facts = [...(creator.facts?.followers ? [{ kind: 'followers' as const, rawValue: creator.facts.followers.rawValue, evidenceIds: creator.facts.followers.evidenceIds }] : []), ...(creator.facts?.country ? [{ kind: 'country' as const, rawValue: creator.facts.country.rawValue, evidenceIds: creator.facts.country.evidenceIds }] : [])];
                  applyAssessment(task.spec, creator, { judgments: [], facts });
                  const outcome = resolveJudgments(task.spec, creator, saved.judgments.filter(item => !item.criterionId.startsWith('__')));
                  this.store.transaction(() => { this.store.set('result-history', `${saved.id}|${saved.revision ?? 1}`, saved); this.store.set('result', saved.id, { ...saved, creator, ...outcome, tags: resultTags(task.spec, { judgments: outcome.judgments, annotations: saved.annotations }), revision: (saved.revision ?? 1) + 1, updatedAt: this.now() }); this.recount(task); this.save(task); });
                }
              }
              unique.set(creator.id, creator);
            }
            catch (error) { task.failures.push((error as Error).message); }
          }
          task.candidates = [...unique.values()].slice(0, task.spec.candidateBudget);
          if (remote.status === 'failed') {
            task.failures.push('WaveSurge 远端搜索失败；保留已返回候选继续本地核验，不重新提交搜索');
            if (!task.candidates.length) { task.status = 'failed'; task.detail = 'WaveSurge 搜索失败；已核验结果保留，搜索结果不能直接当作合格名单'; this.save(task); continue; }
          }
          task.detail = `WaveSurge 搜索${remote.status === 'failed' ? '失败，保留已有候选继续本地核验' : remote.status === 'done' ? '完成' : remote.status === 'queued' ? '等待执行' : '执行中'}；取得 ${task.candidates.length} 位唯一候选，合格候选 ${task.qualifying ?? 0} 人，研究组预选 ${task.matched} 人${task.status === 'needs_input' ? '；浏览器等待人工协助，请在桌面查看具体阻塞原因' : ''}`; this.save(task);
        }
        let waiting = false;
        const prefer = task.spec.criteria.some(criterion => !criterion.required);
        for (const creator of task.candidates) {
          const id = `${task.id}|${creator.id}`;
          if (this.store.get('result', id)) continue;
          if (this.cancelled(task) || !task.exhaustive && !task.spec.analyzeAll && !prefer && task.matched >= task.requested) break;
          const excluded = resolveJudgments(task.spec, creator, []).judgments.some(item => item.criterionId.startsWith('__') && item.verdict === 'no_match');
          const needsVerifier = (task.spec.criteria.length > 0 || !!task.spec.annotations?.length || creator.followers === null || !!task.spec.regions.length && creator.region === null) && !(excluded && !task.spec.analyzeAll && !task.exhaustive);
          if (needsVerifier && browserBlocked && this.usesDesktop(task.spec)) { waiting = true; break; }
          const attempt = task.verificationAttempts?.[creator.id];
          if (attempt && attempt.nextAt > this.now()) { waiting = true; break; }
          let judgments: Judgment[]; let assessment: Assessment = { judgments: [] };
          try { const proposed = needsVerifier ? await (this.usesDesktop(task.spec) ? this.verify : this.textVerify)(task.spec, creator, task.id) : []; assessment = applyAssessment(task.spec, creator, proposed); judgments = resolveJudgments(task.spec, creator, assessment.judgments).judgments; }
          catch (error) {
            if (this.cancelled(task)) break;
            if (error instanceof HumanRequired) { browserBlocked = true; waiting = true; task.status = 'needs_input'; task.detail = `${error.message}；请打开桌面协助，完成后继续原候选`; this.save(task); break; }
            task.failures.push(`${creator.id}: ${(error as Error).message}`);
            if (error instanceof ModelError && error.retryable()) {
              const count = (attempt?.count ?? 0) + 1; task.verificationAttempts ??= {};
              task.verificationAttempts[creator.id] = { ...attempt, count, nextAt: count < 3 ? this.now() + Math.max(error.retryAfterMs, 1000 * 2 ** (count - 1)) : 0 };
              if (count < 3) { waiting = true; task.detail = `候选核验暂时失败，已保存原工作并等待第 ${count + 1}/3 次尝试`; this.save(task); break; }
            }
            judgments = resolveJudgments(task.spec, creator, []).judgments;
          }
          if (this.cancelled(task)) break;
          const outcome = resolveJudgments(task.spec, creator, judgments.filter(item => !item.criterionId.startsWith('__')));
          const result: Result = { id, taskId: task.id, creator, ...outcome, annotations: assessment.annotations, tags: resultTags(task.spec, { ...assessment, judgments: outcome.judgments }), revision: attempt?.resultRevision ?? 1, updatedAt: this.now() };
          this.store.transaction(() => { this.store.set('result', id, result); this.recount(task); task.detail = `已核验 ${task.evaluated} 人，合格候选 ${task.qualifying} 人，研究组预选 ${task.matched} 人`; this.save(task); });
        }
        if (!this.cancelled(task) && task.status !== 'needs_input') {
          const enough = task.matched >= task.requested && !task.exhaustive && !task.spec.analyzeAll && !prefer;
          const exhausted = task.remoteStatus === 'done' || task.remoteStatus === 'failed' || task.candidates.length >= task.spec.candidateBudget;
          if (!waiting && (enough || exhausted)) { task.status = task.matched >= task.requested ? 'completed' : 'partial'; task.detail = `已选合格 ${task.matched}/${task.requested}，已核验 ${task.evaluated}；证据不足者保持待核实。${task.discovery?.profileReads !== undefined ? `Instagram：读取 ${task.discovery.profileReads} 个本人基础账号，基础条件排除 ${task.discovery.baseExcluded ?? 0} 个；基础读取上限 ${task.discovery.profileLimit}，逐人分析上限 ${task.spec.candidateBudget}（本次有界来源，不代表全站穷尽）。` : ''}${task.discovery?.sources?.map(source => `${source.platform}：读取 ${source.read} 条，基础条件排除 ${source.excluded} 条；${source.path}（有界名单，不代表全站穷尽）。`).join('') ?? ''}${task.failures.length ? `核验/来源错误 ${task.failures.length} 次，可对已有结果重新核验。` : ''}`; this.save(task); }
        }
      } catch (error) {
        if (this.cancelled(task)) continue;
        if (error instanceof WaveError && error.retryable() && (task.remoteId || !this.wave.discover || (task.discoveryAttempts = (task.discoveryAttempts ?? 0) + 1) < 3)) { task.nextPollAt = this.now() + error.retryAfterMs; task.detail = `外部服务暂不可用，已保存当前读取位置等待重试：${error.message}`; }
        else { task.status = 'failed'; task.detail = `未完成：${(error as Error).message}`; }
        this.save(task);
      }
    }
    if (desktopLane !== undefined) return;
    await this.enrichment.tick(browserBlocked);
    this.onProgress();
    deliverWorkBatches(this.store, this.now());
  }
}
