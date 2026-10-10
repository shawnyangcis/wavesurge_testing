import { creatorIdentity } from './canonical.ts';
import { resolveJudgments, factorEvidenceIds } from './verdict.ts';
import { profileMetricsEvidence } from './wave.ts';
import { resultTags, followerInterval, applyAssessment } from './assessment.ts';
import type { Assessment, FactObservation } from '../shared/research.ts';
import type { Result, Creator } from '../shared/research.ts';
import type { ResearchEngine, ResearchTask } from './research.ts';
import type { Enrichment } from './enrichment.ts';
export function repairStoredResults(engine: ResearchEngine) {
 const version='qa-20261010-v1';if(engine.store.get('data-migration',version))return;
 engine.store.transaction(()=>{
  for(const task of engine.store.list<ResearchTask>('task')){
   if(!task.spec)continue;
   const instructions=task.spec.criteria.filter(item=>!item.required&&/标注|标一下|打标/.test(item.label));
   if(instructions.length){engine.store.set('task-history',`${task.id}|${version}`,task);task.spec.annotations=[...(task.spec.annotations??[]),...instructions.map(item=>({id:item.id,label:item.label.includes('风格')?'呈现风格':'内容方向'}))];task.spec.criteria=task.spec.criteria.filter(item=>!instructions.includes(item));}
   const originals=engine.results(task.id);const unique=new Map<string,Result>();
   for(const old of originals){
    const creator={...old.creator,id:creatorIdentity(old.creator)};const id=`${task.id}|${creator.id}`;
    const previous=unique.get(id);
    let judgments=old.judgments.filter(item=>!item.criterionId.startsWith('__')&&task.spec.criteria.some(criterion=>criterion.id===item.criterionId));
    if(previous)judgments=judgments.map(item=>previous.judgments.some(other=>other.criterionId===item.criterionId&&other.verdict!==item.verdict)?{...item,verdict:'unknown',reason:'同账号历史核验结论冲突，需重新核验'}:item);
    const outcome=resolveJudgments(task.spec,creator,judgments);
    const result:Result={...old,id,creator,...outcome,annotations: [...(old.annotations??[]),...instructions.map(item=>({dimensionId:item.id,status:'unknown' as const,values:[],reason:'历史记录只有打标指令，没有结构化实际值，请补标后查询',evidenceIds:[]}))],tags:resultTags(task.spec,{judgments:outcome.judgments,annotations:old.annotations}),revision:(old.revision??1)+1,updatedAt:engine.now()};
    if(previous)result.creator.evidence=[...new Map([...previous.creator.evidence,...creator.evidence].map(item=>[item.id,item])).values()];
    unique.set(id,result);engine.store.set('result-history',`${old.id}|migration-${version}`,old);engine.store.delete('result',old.id);
   }
   for(const result of unique.values())engine.store.set('result',result.id,result);
   const candidates=new Map<string,Creator>();
   for(const candidate of task.candidates){const id=creatorIdentity(candidate);if(!candidates.has(id))candidates.set(id,{...candidate,id});const session=engine.store.get('verification',`${task.id}|${candidate.id}`);if(session&&candidate.id!==id)engine.store.set('verification',`${task.id}|${id}`,session);}
   task.candidates=[...candidates.values()];engine.recount(task);
   if(['completed','partial'].includes(task.status))task.status=task.matched>=task.requested?'completed':'partial';
   if(originals.length){task.detail=`历史结果已按统一账号身份、国家名称和证据重算：已选合格 ${task.matched}/${task.requested}，核验 ${task.evaluated}。未确认条件保持 unknown；原分析已保留审计版本。`;engine.save(task);}
   else engine.store.set('task',task.id,task);
  }
  engine.store.set('data-migration',version,{completedAt:engine.now()});
 });
}
export function repairStoredTags(engine: ResearchEngine) {
 const version = 'r2-actual-tags-20261010'; if (engine.store.get('data-migration', version)) return;
 engine.store.transaction(() => {
  for (const result of engine.store.list<Result>('result')) {
   const tags = resultTags({} as ResearchTask['spec'], { judgments: result.judgments, annotations: result.annotations });
   if (JSON.stringify(tags) === JSON.stringify(result.tags)) continue;
   engine.store.set('result-history', `${result.id}|migration-${version}`, result);
   engine.store.set('result', result.id, { ...result, tags, revision: (result.revision ?? 1) + 1, updatedAt: engine.now() });
  }
  engine.store.set('data-migration', version, { completedAt: engine.now(), scope: 'derived tags only; facts, judgments, selection unchanged' });
 });
}
export function repairAnnotationDrift(engine: ResearchEngine) {
 const version = 'r2-annotation-facts-20261010'; if (engine.store.get('data-migration', version)) return;
 engine.store.transaction(() => {
  const history = engine.store.list<Result>('result-history'); const jobs = engine.store.list<Enrichment>('enrichment'); const changed = new Set<string>();
  const withoutFacts = (creator: Creator) => { const { facts: _facts, ...identity } = creator; return identity; };
  const contentJudgments = (result: Result) => result.judgments.filter(item => !item.criterionId.startsWith('__'));
  for (const current of engine.store.list<Result>('result')) {
   if (!current.revision || current.revision < 2) continue;
   const before = history.find(old => old.id === current.id && old.revision === current.revision! - 1);
   if (!before || JSON.stringify(current.creator.facts) === JSON.stringify(before.creator.facts)) continue;
   const owners = jobs.filter(job => job.resultIds.includes(current.id));
   if (!owners.some(job => job.mode === 'annotate' && job.completed.includes(current.id)) || owners.some(job => job.mode === 'reverify')) continue;
   if (JSON.stringify(withoutFacts(current.creator)) !== JSON.stringify(withoutFacts(before.creator)) || JSON.stringify(contentJudgments(current)) !== JSON.stringify(contentJudgments(before))) continue;
   engine.store.set('result-history', `${current.id}|migration-${version}`, current);
   engine.store.set('result', current.id, { ...current, creator: before.creator, judgments: before.judgments, verdict: before.verdict, selected: before.selected, revision: current.revision + 1, updatedAt: engine.now() });
   changed.add(current.taskId);
  }
  for (const id of changed) { const task = engine.store.get<ResearchTask>('task', id)!; engine.recount(task); if (['completed', 'partial'].includes(task.status)) task.status = task.matched >= task.requested ? 'completed' : 'partial'; task.detail = `已依据补标前审计版本恢复原事实与筛选结论，保留新增画像：已选合格 ${task.matched}/${task.requested}，核验 ${task.evaluated}。`; engine.save(task, false); }
  engine.store.set('data-migration', version, { completedAt: engine.now(), taskIds: [...changed], scope: 'completed annotate only; adjacent audit revision; unchanged identity/evidence/content judgments; any reverify excluded' });
 });
}
export function repairFollowerPrecision(engine: ResearchEngine) {
 const version = 'r3-follower-precision-20261010'; if (engine.store.get('data-migration', version)) return;
 engine.store.transaction(() => {
  const changed = new Set<string>(); const jobs = engine.store.list<Enrichment>('enrichment');
  for (const result of engine.store.list<Result>('result')) {
   if (!result.creator.facts?.conflicts.includes('followers: 来源数值冲突') || result.creator.followers === null) continue;
   const sessions = [result.id, ...jobs.filter(job => job.mode === 'reverify' && job.resultIds.includes(result.id)).map(job => `${job.id}|${result.creator.id}`)];
   let fact: FactObservation | undefined;
   for (const id of sessions) { const saved = engine.store.get<{ assessment?: Assessment }>('verification', id)?.assessment?.facts?.filter(item => item.kind === 'followers').at(-1); if (saved) fact = saved; }
   fact ??= result.creator.facts.followers && { kind: 'followers', rawValue: result.creator.facts.followers.rawValue, evidenceIds: result.creator.facts.followers.evidenceIds };
   const interval = fact && typeof fact.rawValue === 'string' && followerInterval(fact.rawValue);
   if (!fact || !interval || result.creator.followers < interval.min || result.creator.followers > interval.max || !Array.isArray(fact.evidenceIds) || !fact.evidenceIds.length || fact.evidenceIds.some(id => !result.creator.evidence.some(e => e.id === id))) continue;
   const source = engine.store.get<ResearchTask>('task', result.taskId); if (!source?.spec) continue; const creator = structuredClone(result.creator);
   applyAssessment(source.spec, creator, { judgments: [], facts: [fact] });
   if (creator.facts?.conflicts.includes('followers: 来源数值冲突')) continue;
   const outcome = resolveJudgments(source.spec, creator, result.judgments.filter(j => !j.criterionId.startsWith('__')));
   engine.store.set('result-history', `${result.id}|migration-${version}`, result);
   engine.store.set('result', result.id, { ...result, creator, ...outcome, revision: (result.revision ?? 1) + 1, updatedAt: engine.now() }); changed.add(result.taskId);
  }
  for (const id of changed) { const task = engine.store.get<ResearchTask>('task', id)!; engine.recount(task); if (['completed', 'partial'].includes(task.status)) task.status = task.matched >= task.requested ? 'completed' : 'partial'; task.detail = `已依据保存的本人显示值修正粉丝缩写精度，不是新页面核验：已选合格 ${task.matched}/${task.requested}，核验 ${task.evaluated}；原版本保留审计。`; engine.save(task, false); }
  engine.store.set('data-migration', version, { completedAt: engine.now(), taskIds: [...changed], scope: 'known followers precision conflict only; latest submitted owned evidence compatible with exact Wave count; no model, API, or redelivery' });
 });
}
export function repairFactorReferences(engine: ResearchEngine) {
 const version = 'r4-factor-references-20261010'; if (engine.store.get('data-migration', version)) return;
 engine.store.transaction(() => {
  const resultIds: string[] = [];
  for (const original of engine.store.list<Result>('result')) {
   if (!original.judgments.some(item => ['__followers', '__region'].includes(item.criterionId))) continue;
   const creator = structuredClone(original.creator);
   const metrics = profileMetricsEvidence(creator, creator.evidence.find(source => source.provider !== 'headed-chromium')?.capturedAt ?? original.updatedAt);
   const needsNumericSource = original.judgments.some(item => item.criterionId === '__followers' && creator.followers !== null && !factorEvidenceIds(creator, 'followers').some(id => creator.evidence.find(source => source.id === id)?.provider !== 'headed-chromium') || item.criterionId === '__region' && creator.region && !factorEvidenceIds(creator, 'country').some(id => creator.evidence.find(source => source.id === id)?.provider !== 'headed-chromium'));
   if (needsNumericSource && metrics && !creator.evidence.some(source => source.id === metrics.id)) creator.evidence.push(metrics);
   const judgments = original.judgments.map(item => item.criterionId === '__followers' ? { ...item, evidenceIds: factorEvidenceIds(creator, 'followers') } : item.criterionId === '__region' ? { ...item, evidenceIds: factorEvidenceIds(creator, 'country') } : item);
   if (JSON.stringify(judgments) === JSON.stringify(original.judgments) && creator.evidence.length === original.creator.evidence.length) continue;
   engine.store.set('result-history', `${original.id}|migration-${version}`, original);
   engine.store.set('result', original.id, { ...original, creator, judgments, revision: (original.revision ?? 1) + 1, updatedAt: engine.now() }); resultIds.push(original.id);
  }
  engine.store.set('data-migration', version, { completedAt: engine.now(), resultIds, scope: 'factor reference IDs only; saved API fields at original capture time; verdict, selection, facts, tags, source evidence and task state preserved; no model, API, redelivery' });
 });
}
