import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { HumanRequired } from '../src/server/desktop.ts';
import { WaveError, normalizeCreator } from '../src/server/wave.ts';
import { modelVerifier } from '../src/server/verify.ts';
import { SettingsManager } from '../src/server/settings.ts';
import { ModelError } from '../src/server/model.ts';
import { registerWork } from '../src/server/work-delivery.ts';
import type { Creator, Judgment, SearchSpec } from '../src/shared/research.ts';
import type { ResearchTask } from '../src/server/research.ts';
import type { ChatMessage, Model } from '../src/server/model.ts';
const stores: Store[] = []; afterEach(() => { stores.splice(0).forEach(store => store.close()); });
const raw = JSON.parse(readFileSync('validation/2026-10-09/direct-search-noemail-poll-03.json', 'utf8')).response.creators;
const spec: SearchSpec = { title: '科技作者', personaText: 'tech', count: 2, candidateBudget: 10, platforms: ['instagram'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [{ id: 'tech', label: '科技', required: true, basis: 'text' }] };
function fixture() {
  const store = new Store(':memory:'); stores.push(store); let now = 10;
  const wave = { submit: vi.fn().mockResolvedValue('remote-id'), poll: vi.fn().mockResolvedValue({ status: 'done', creators: raw }) };
  const verify = vi.fn(async (_spec: SearchSpec, creator: Creator): Promise<Judgment[]> => [{ criterionId: 'tech', verdict: 'match', reason: 'tech evidence', evidenceIds: [creator.evidence[0].id] }]);
  const engine = new ResearchEngine(store, wave, verify, () => now);
  const task = () => store.list<ResearchTask>('task')[0]; const advance = () => { now += 60000; };
  return { store, engine, wave, verify, task, advance };
}
it('慢浏览器候选不阻塞独立文字研究交付，同一桌面候选仍串行且wake不重复',async()=>{
 const f=fixture();const first=f.engine.start({...spec,count:1},'slow-browser');const second=f.engine.start({...spec,count:1},'next-browser');const text=f.engine.start({...spec,count:1,verificationMode:'text'},'independent-text');
 for(const task of[first,second,text])f.engine.save({...task,status:'running',remoteId:'returned-remote',remoteStatus:'done',nextPollAt:999999,candidates:[normalizeCreator(raw[0],1)]});
 const wait=deferred<Judgment[]>();const submitted=[{criterionId:'tech',verdict:'match' as const,reason:'actual text',evidenceIds:[normalizeCreator(raw[0],1).evidence[0].id]}];
 f.verify.mockReturnValueOnce(wait.promise);const textVerify=vi.fn(async()=>submitted);f.engine.textVerify=textVerify;
 const run=f.engine.wake();await vi.waitFor(()=>expect(f.store.task<ResearchTask>(text.id)!.status).toBe('completed'));expect(f.store.task<ResearchTask>(first.id)!.evaluated).toBe(0);expect(f.verify).toHaveBeenCalledOnce();expect(textVerify).toHaveBeenCalledOnce();expect(f.engine.wake()).toBe(run);
 wait.resolve(submitted);await run;expect(f.verify).toHaveBeenCalledTimes(2);expect(f.store.task<ResearchTask>(first.id)!.matched).toBe(1);expect(f.store.task<ResearchTask>(second.id)!.matched).toBe(1);expect(f.store.task<ResearchTask>(text.id)!.matched).toBe(1);
});
it('一个执行通道异常时仍等待另一个在途候选，不能提前解锁并重复浏览器工作',async()=>{
 const f=fixture();const task=f.engine.start({...spec,count:1},'lane-error');f.engine.start({...spec,count:1,verificationMode:'text'},'text-error');f.engine.save({...task,status:'running',remoteId:'returned',remoteStatus:'done',nextPollAt:999999,candidates:[normalizeCreator(raw[0],1)]});
 const real=f.engine.tick.bind(f.engine);vi.spyOn(f.engine,'tick').mockImplementation(lane=>lane===false?Promise.reject(new Error('database read unavailable')):real(lane));const wait=deferred<Judgment[]>();f.verify.mockReturnValueOnce(wait.promise);const run=f.engine.wake();const outcome=run.catch(e=>e.message);await vi.waitFor(()=>expect(f.verify).toHaveBeenCalledOnce());expect(f.engine.active).toBe(true);expect(f.engine.wake()).toBe(run);wait.resolve([]);expect(await outcome).toBe('database read unavailable');expect(f.engine.active).toBe(false);expect(f.verify).toHaveBeenCalledOnce();
});
it('浏览器已经运行后才登记的文字工作立即唤醒空闲文字通道，旧任务和关闭等待保留',async()=>{
 const f=fixture();const browser=f.engine.start({...spec,count:1},'already-browsing');f.engine.save({...browser,status:'running',remoteId:'returned',remoteStatus:'done',nextPollAt:999999,candidates:[normalizeCreator(raw[0],1)]});const wait=deferred<Judgment[]>();f.verify.mockReturnValueOnce(wait.promise);const run=f.engine.wake();await vi.waitFor(()=>expect(f.verify).toHaveBeenCalledOnce());
 const late=f.engine.start({...spec,count:1,verificationMode:'text'},'late-text');f.engine.save({...late,status:'running',remoteId:'returned-text',remoteStatus:'done',nextPollAt:999999,candidates:[normalizeCreator(raw[0],1)]});const textVerify=vi.fn(async()=>[{criterionId:'tech',verdict:'match' as const,reason:'actual text',evidenceIds:[normalizeCreator(raw[0],1).evidence[0].id]}]);f.engine.textVerify=textVerify;expect(f.engine.wake()).toBe(run);
 await vi.waitFor(()=>expect(f.store.task<ResearchTask>(late.id)!.status).toBe('completed'));expect(f.store.task<ResearchTask>(browser.id)!.evaluated).toBe(0);expect(f.verify).toHaveBeenCalledOnce();expect(textVerify).toHaveBeenCalledOnce();f.engine.stopped=true;expect(f.engine.wake()).toBe(run);wait.resolve([]);await run;expect(f.engine.active).toBe(false);expect(f.store.task<ResearchTask>(late.id)!.matched).toBe(1);expect(f.store.task<ResearchTask>(browser.id)!.status).toBe('running');
});
function deferred<T>() { let resolve!: (v: T) => void; let reject!: (e: Error) => void; const promise = new Promise<T>((r, e) => { resolve = r; reject = e; }); return { promise, resolve, reject }; }
it('归档服务故障的未知结果后续接同一研究，真实重试保留审计版本、不重新提交来源',async()=>{
 const f=fixture();const task=f.engine.start(spec,'recovery');f.wave.poll.mockResolvedValue({status:'done',creators:[raw[0]]});f.verify.mockRejectedValueOnce(new Error('desktop service temporarily unavailable'));await f.engine.wake();f.advance();await f.engine.wake();const old=f.engine.results(task.id)[0];expect(old.verdict).toBe('unknown');
 f.store.set('result-history',`${old.id}|transport-recovery`,old);f.store.delete('result',old.id);const current=f.task();current.status='running';current.verificationAttempts={[old.creator.id]:{count:0,nextAt:0,resultRevision:2}};f.engine.recount(current);f.engine.save(current,false);
 f.verify.mockRejectedValueOnce(new ModelError('temporary model service',503,1000));await f.engine.wake();expect(f.task().verificationAttempts![old.creator.id].resultRevision).toBe(2);expect(f.engine.results(task.id)).toHaveLength(0);f.advance();await f.engine.wake();expect(f.engine.results(task.id)).toHaveLength(1);expect(f.engine.results(task.id)[0]).toMatchObject({id:old.id,verdict:'match',revision:2});expect(f.store.get<any>('result-history',`${old.id}|transport-recovery`).verdict).toBe('unknown');expect(f.wave.submit).toHaveBeenCalledOnce();expect(f.wave.poll).toHaveBeenCalledOnce();
});
it('独立请求完成后立即在chat交付，不等待同一后台循环中其它任务的模型调用',async()=>{
 const f=fixture(),next=deferred<Judgment[]>();const tasks=['first','second'].map(id=>{const t=f.engine.start({...spec,count:1},id);Object.assign(t,{remoteId:id,remoteStatus:'done',status:'running',candidates:[normalizeCreator(raw[0],1)]});f.engine.save(t);registerWork(f.store,id,{kind:'research',id:t.id,title:t.title,reportUrl:`/api/reports/${t.id}`});return t;});
 const judgment:Judgment[]=[{criterionId:'tech',verdict:'match',reason:'source content',evidenceIds:[tasks[0].candidates[0].evidence[0].id]}];f.verify.mockResolvedValueOnce(judgment).mockImplementationOnce(()=>next.promise);const running=f.engine.wake();for(let n=0;n<30&&f.verify.mock.calls.length<2;n++)await Promise.resolve();expect(f.verify).toHaveBeenCalledTimes(2);expect(f.store.task<any>(tasks[0].id).status).toBe('completed');expect(f.store.task<any>(tasks[1].id).status).toBe('running');expect(f.store.list<any>('message').filter(m=>m.text.includes(`/api/reports/${tasks[0].id}`))).toHaveLength(1);expect(f.store.list<any>('message').filter(m=>m.text.includes(`/api/reports/${tasks[1].id}`))).toHaveLength(0);
 next.resolve(judgment);await running;await f.engine.wake();expect(f.store.list('delivery')).toHaveLength(2);
});
describe('后台任务与恢复', () => {
  it('提交前持久化稳定请求，重放和条件冲突，严格范围校验', () => {
    const { engine, wave } = fixture(); const first = engine.start(spec, 'stable-call'); expect(engine.start(spec, 'stable-call')).toEqual(first); expect(first.body.requestId).toBe(first.id); expect(wave.submit).not.toHaveBeenCalled();
    expect(() => engine.start({ ...spec, title: 'changed' }, 'stable-call')).toThrow('已变化');
    for (const invalid of [{}, { ...spec, count: 0 }, { ...spec, platforms: ['bad'] }, { ...spec, criteria: [{ id: '__followers', label: 'bad', required: true, basis: 'text' }] }]) expect(() => engine.start(invalid, 'bad')).toThrow('格式');
    for (const invalid of [{ ...spec, minFollowers: 100001 }, { ...spec, candidateBudget: 1 }, { ...spec, criteria: [spec.criteria[0], spec.criteria[0]] }]) expect(() => engine.start(invalid, 'conflict')).toThrow('冲突');
  });
  it('提交、60 秒轮询、远端队列/执行完成以及逐人事务保存', async () => {
    const f = fixture(); const task = f.engine.start(spec, 'call'); await f.engine.wake(); expect(f.wave.submit).toHaveBeenCalledWith(task.body); expect(f.task().remoteId).toBe('remote-id'); expect(f.task().status).toBe('running');
    await f.engine.wake(); expect(f.wave.poll).not.toHaveBeenCalled();
    f.advance(); f.wave.poll.mockResolvedValueOnce({ status: 'queued', creators: [] }); await f.engine.wake(); expect(f.task().detail).toContain('等待执行');
    f.advance(); f.wave.poll.mockResolvedValueOnce({ status: 'running', creators: [] }); await f.engine.wake(); expect(f.task().detail).toContain('执行中');
    f.advance(); f.wave.poll.mockResolvedValueOnce({ status: 'done', creators: [...raw, raw[0], { platform: 'bad' }] }); await f.engine.wake(); expect(f.task()).toMatchObject({ status: 'completed', matched: 2, evaluated: 2 }); expect(f.task().failures).toHaveLength(1); expect(f.engine.results(task.id)).toHaveLength(2); expect(f.engine.results('missing')).toEqual([]);
    await f.engine.wake(); expect(f.verify).toHaveBeenCalledTimes(2);
  });
  it('重启沿用 taskId，复用已核验者、人数够了停止、无质性条件直接核验数值', async () => {
    const f = fixture(); const task = f.engine.start({ ...spec, count: 1, criteria: [] }, 'call'); await f.engine.wake(); f.advance(); const restored = new ResearchEngine(f.store, f.wave, f.verify, () => 100000); await restored.wake(); expect(f.wave.submit).toHaveBeenCalledTimes(1); expect(f.verify).not.toHaveBeenCalled(); expect(f.engine.results(task.id)).toHaveLength(1);
    const current = f.task(); f.store.set('task', task.id, { ...current, status: 'running', matched: 0, nextPollAt: 0 }); await restored.wake(); expect(f.engine.results(task.id)).toHaveLength(2); expect(f.task().evaluated).toBe(2);
  });
  it('零候选、证据不足、单人模型失败与远端失败如实交付', async () => {
    const zero = fixture(); zero.engine.start(spec, 'zero'); await zero.engine.wake(); zero.advance(); zero.wave.poll.mockResolvedValueOnce({ status: 'done', creators: [] }); await zero.engine.wake(); expect(zero.task()).toMatchObject({ status: 'partial', matched: 0, evaluated: 0 });
    const partial = fixture(); partial.engine.start(spec, 'partial'); await partial.engine.wake(); partial.advance(); partial.verify.mockRejectedValueOnce(new Error('model failed')); await partial.engine.wake(); expect(partial.task()).toMatchObject({ status: 'partial', matched: 1, evaluated: 2 }); expect(partial.task().failures[0]).toContain('model failed');
    const remote = fixture(); remote.engine.start(spec, 'remote'); await remote.engine.wake(); remote.advance(); remote.wave.poll.mockResolvedValueOnce({ status: 'failed', creators: [] }); await remote.engine.wake(); expect(remote.task().status).toBe('failed');
  });
  it('可重试错误不重新生成 requestId；永久错误停止；并发 wake 复用运行', async () => {
    const f = fixture(); f.engine.start(spec, 'retry'); f.wave.submit.mockRejectedValueOnce(new WaveError('busy', 429, 1000)); await f.engine.wake(); expect(f.task().nextPollAt).toBe(1010); expect(f.task().status).toBe('running'); f.advance(); const wait = deferred<string>(); f.wave.submit.mockReturnValueOnce(wait.promise); const running = f.engine.wake(); expect(f.engine.wake()).toBe(running); wait.resolve('remote'); await running; expect(f.wave.submit.mock.calls[0][0]).toEqual(f.wave.submit.mock.calls[1][0]);
    const permanent = fixture(); permanent.engine.start(spec, 'permanent'); permanent.wave.submit.mockRejectedValueOnce(new WaveError('auth', 401, 0)); await permanent.engine.wake(); expect(permanent.task().status).toBe('failed');
    const generic = fixture(); generic.engine.start(spec, 'generic'); generic.wave.submit.mockRejectedValueOnce(new Error('oops')); await generic.engine.wake(); expect(generic.task().status).toBe('failed');
  });
  it('取消、迟到提交/轮询/核验/异常不会恢复任务', async () => {
    const f = fixture(); expect(() => f.engine.cancel('missing')).toThrow('不存在'); const task = f.engine.start(spec, 'cancel'); const submit = deferred<string>(); f.wave.submit.mockReturnValueOnce(submit.promise); const run = f.engine.wake(); f.engine.cancel(task.id); submit.resolve('late-id'); await run; expect(f.task()).toMatchObject({ status: 'cancelled', remoteId: 'late-id' }); expect(f.engine.cancel(task.id).status).toBe('cancelled');
    const polling = fixture(); const pollTask = polling.engine.start(spec, 'poll'); await polling.engine.wake(); polling.advance(); const poll = deferred<unknown>(); polling.wave.poll.mockReturnValueOnce(poll.promise); const running = polling.engine.wake(); polling.engine.cancel(pollTask.id); poll.resolve({ status: 'done', creators: raw }); await running; expect(polling.verify).not.toHaveBeenCalled();
    const verifying = fixture(); const vt = verifying.engine.start(spec, 'verify'); await verifying.engine.wake(); verifying.advance(); const verify = deferred<Judgment[]>(); verifying.verify.mockReturnValueOnce(verify.promise); const verifyRun = verifying.engine.wake(); await vi.waitFor(() => expect(verifying.verify).toHaveBeenCalled()); verifying.engine.cancel(vt.id); verify.resolve([]); await verifyRun; expect(verifying.engine.results(vt.id)).toEqual([]);
    const failing = fixture(); const ft = failing.engine.start(spec, 'fail'); const error = deferred<string>(); failing.wave.submit.mockReturnValueOnce(error.promise); const er = failing.engine.wake(); failing.engine.cancel(ft.id); error.reject(new Error('late error')); await er; expect(failing.task().status).toBe('cancelled');
  });
  it('停止时不开始工作，在途停止与多任务中途停止', async () => {
    const f = fixture(); f.engine.start(spec, 'one'); f.engine.start(spec, 'two'); f.engine.stopped = true; await f.engine.wake(); expect(f.wave.submit).not.toHaveBeenCalled(); await f.engine.tick();
    f.engine.stopped = false; f.wave.submit.mockImplementationOnce(async () => { f.engine.stopped = true; return 'stopped'; }); await f.engine.wake(); expect(f.wave.submit).toHaveBeenCalledTimes(1);
  });
});
describe('逐人模型上下文隔离', () => {
  it('独立角色、条件与来源输入以及受限提交工具', async () => {
    const f = fixture(); const settings = new SettingsManager(f.store, {}); const complete = vi.fn<Model['complete']>().mockResolvedValue({ role: 'assistant', content: null, tool_calls: [{ id: 'judgment', type: 'function', function: { name: 'submit_judgments', arguments: JSON.stringify({ judgments: [] }) } }] });
    const verify = modelVerifier({ complete }, settings); const creator = { id: 'a', evidence: [] } as unknown as Creator;
    expect(await verify(spec, creator, 'task')).toEqual([]); expect(complete.mock.calls[0][0][2].content).toContain('task'); expect(complete.mock.calls[0][0][2].content).toContain('视觉条件保持 unknown'); expect(complete.mock.calls[0][1][0].function.name).toBe('submit_judgments');
    for (const response of [{ role: 'assistant', content: 'text' }, { role: 'assistant', content: null, tool_calls: [{ id: 'a', type: 'function', function: { name: 'other', arguments: '{}' } }] }, { role: 'assistant', content: null, tool_calls: [{ id: 'a', type: 'function', function: { name: 'submit_judgments', arguments: '{"judgments":1}' } }] }]) { complete.mockResolvedValueOnce(response as ChatMessage); await expect(verify(spec, creator, 'task')).rejects.toThrow(); }
  });
});

it('人工协助暂停原候选而不保存未知结果，交还后继续同一候选', async () => {
  const f = fixture(); const task = f.engine.start(spec, 'human'); await f.engine.wake(); f.advance();
  f.verify.mockRejectedValueOnce(new HumanRequired({ id: 'assist', taskId: task.id, creatorId: 'instagram:mike', reason: '需要登录', status: 'pending', createdAt: 1, leaseUntil: 0 }));
  await f.engine.wake(); expect(f.task().status).toBe('needs_input'); expect(f.engine.results(task.id)).toEqual([]); f.store.set('assistance','assist',{status:'pending'}); const pollCount = f.wave.poll.mock.calls.length; await f.engine.wake(); expect(f.wave.poll).toHaveBeenCalledTimes(pollCount);
  f.store.set('assistance','assist',{status:'done'}); f.store.set('task', task.id, { ...f.task(), status: 'running', nextPollAt: 0 }); await f.engine.wake(); expect(f.task().status).toBe('completed'); expect(f.task().evaluated).toBe(2);
});

it('Campaign 分组穷尽有界候选，达到单组配额仍核验后续候选供跨组去重', async () => {
  const f = fixture(); const task = f.engine.start({ ...spec, count: 1 }, 'exhaustive'); task.exhaustive = true; f.engine.save(task); await f.engine.wake(); f.advance(); await f.engine.wake(); expect(f.task().matched).toBe(1); expect(f.task().qualifying).toBe(2); expect(f.task().evaluated).toBe(2); expect(f.task().status).toBe('completed');
});

it('共享桌面等待人工时，其它工作保留队列；交还后恢复而不把暂时不可用算作未知结果', async () => {
  const f = fixture(); f.engine.start(spec, 'queued'); f.store.set('assistance', 'r', { status: 'pending' }); await f.engine.wake(); expect(f.wave.submit).toHaveBeenCalledOnce(); expect(f.task().status).toBe('running'); f.store.set('assistance', 'r', { status: 'done' }); await f.engine.wake(); expect(f.wave.submit).toHaveBeenCalledOnce();
});

it('alsoFound 只是补充候选，合并去重后逐人核验，不能直接当作合格结果', async () => {
  const f = fixture(); const task = f.engine.start(spec, 'supplement'); await f.engine.wake(); f.advance(); f.wave.poll.mockResolvedValueOnce({ status: 'done', creators: [raw[0]], alsoFound: [{ ...raw[0], followerCount: 0 }, raw[1]] } as any); await f.engine.wake(); expect(f.task().candidates).toHaveLength(2); expect(f.task().candidates[0].followers).toBe(raw[0].followerCount); expect(f.verify).toHaveBeenCalledTimes(2); expect(f.engine.results(task.id)).toHaveLength(2);
});

it('同一 tick 中首次请求人工后立即让出桌面，后面的任务不误记 unknown', async () => {
  const f = fixture(); const first = f.engine.start(spec, 'first-human'); const second = f.engine.start(spec, 'second-human'); await f.engine.wake(); f.advance();
  f.verify.mockRejectedValueOnce(new HumanRequired({ id: 'a', taskId: first.id, creatorId: 'instagram:mike', reason: '需人工验证', status: 'pending', createdAt: 1, leaseUntil: 0 }));
  await f.engine.wake(); expect(f.store.get<ResearchTask>('task', first.id)!.status).toBe('needs_input'); expect(f.store.get<ResearchTask>('task', second.id)!.status).toBe('running'); expect(f.engine.results(second.id)).toEqual([]); expect(f.verify).toHaveBeenCalledOnce(); expect(f.wave.poll).toHaveBeenCalledTimes(2);
});

it('取消期间晚到的人工暂停不能复活任务', async () => {
  const f = fixture(); const task = f.engine.start(spec, 'late-human'); await f.engine.wake(); f.advance(); const waiting = deferred<Judgment[]>(); f.verify.mockReturnValueOnce(waiting.promise); const run = f.engine.wake(); await vi.waitFor(() => expect(f.verify).toHaveBeenCalled()); f.engine.cancel(task.id); waiting.reject(new HumanRequired({ id: 'h', taskId: task.id, creatorId: 'c', reason: 'login', status: 'done', createdAt: 1, leaseUntil: 0 })); await run; expect(f.task().status).toBe('cancelled'); expect(f.engine.results(task.id)).toEqual([]);
});

it('running 增量候选立即核验、后续继续轮询合并，同一账号不占两次配额', async () => {
 const f=fixture();const task=f.engine.start(spec,'stream');await f.engine.wake();f.advance();
 f.wave.poll.mockResolvedValueOnce({status:'running',creators:[raw[0]]});await f.engine.wake();expect(f.engine.results(task.id)).toHaveLength(1);expect(f.task()).toMatchObject({status:'running',matched:1,evaluated:1});
 f.advance();f.wave.poll.mockResolvedValueOnce({status:'done',creators:[{...raw[0],handle:undefined},raw[1]]});await f.engine.wake();expect(f.engine.results(task.id)).toHaveLength(2);expect(f.verify).toHaveBeenCalledTimes(2);expect(f.task()).toMatchObject({status:'completed',matched:2});
});
it('暂时模型故障持久化退避，重启后重试同一候选，不重新提交 Wave 请求',async()=>{
 const {ModelError}=await import('../src/server/model.ts');const f=fixture();const task=f.engine.start({...spec,count:1},'model-retry');await f.engine.wake();f.advance();f.verify.mockRejectedValueOnce(new ModelError('temporary',503,1000));await f.engine.wake();expect(f.engine.results(task.id)).toEqual([]);expect(f.task().status).toBe('running');
 await f.engine.wake();expect(f.verify).toHaveBeenCalledOnce();f.advance();const restored=new ResearchEngine(f.store,f.wave,f.verify,()=>200000);await restored.wake();expect(f.engine.results(task.id)[0].verdict).toBe('match');expect(f.wave.submit).toHaveBeenCalledOnce();expect(f.verify).toHaveBeenCalledTimes(2);
});
it('可选偏好会核验后续候选并选择有证据的优先者，完成消息不吞掉 pending 用户输入且只交付一次',async()=>{
 const f=fixture();const task=f.engine.start({...spec,count:1,criteria:[...spec.criteria,{id:'preferred',label:'geek',required:false,basis:'text'}]},'preference');f.store.set('message','user',{id:'user',role:'user',state:'pending',epoch:0,text:'进度？',attachments:[],createdAt:1});
 f.verify.mockImplementation(async(_s,c)=>[{criterionId:'tech',verdict:'match',reason:'tech',evidenceIds:[c.evidence[0].id]},{criterionId:'preferred',verdict:c.handle===raw[1].handle?'match':'no_match',reason:'supported',evidenceIds:[c.evidence[0].id]}]);await f.engine.wake();f.advance();await f.engine.wake();expect(f.verify).toHaveBeenCalledTimes(2);expect(f.engine.results(task.id).find(r=>r.selected)?.creator.handle).toBe(raw[1].handle);expect(f.task().matched).toBe(1);
 const messages=f.store.list<any>('message');expect(messages.find(m=>m.id==='user').state).toBe('pending');expect(messages.filter(m=>m.role==='assistant')).toHaveLength(1);expect(messages.find(m=>m.role==='assistant').text).toContain(`/api/reports/${task.id}`);await f.engine.wake();expect(f.store.list<any>('message').filter(m=>m.role==='assistant')).toHaveLength(1);
});
it('模型重试有明确上限，失败仍能对已有结果重新核验；轮询退避不影响本地任务调度',async()=>{const{ModelError}=await import('../src/server/model.ts');const f=fixture();const task=f.engine.start({...spec,count:1,candidateBudget:1},'bounded');await f.engine.wake();f.advance();f.verify.mockRejectedValue(new ModelError('temporary',503));for(let i=0;i<3;i++){await f.engine.wake();f.advance()}expect(f.verify).toHaveBeenCalledTimes(3);expect(f.task().status).toBe('partial');expect(f.engine.results(task.id)[0].verdict).toBe('unknown');const delayed=fixture();delayed.engine.start(spec,'delayed');delayed.wave.submit.mockRejectedValueOnce(new WaveError('backoff',503,100000));await delayed.engine.wake();await delayed.engine.wake();expect(delayed.wave.submit).toHaveBeenCalledOnce();});
it('没有质性条件但地区缺失仍请求证据；不可识别的地区筛选保持待核实',async()=>{const f=fixture();f.engine.start({...spec,criteria:[],regions:['US'],count:1,candidateBudget:1},'missing-country');await f.engine.wake();f.advance();f.wave.poll.mockResolvedValueOnce({status:'done',creators:[{...raw[0],region:null}]});f.verify.mockResolvedValueOnce([]);await f.engine.wake();expect(f.verify).toHaveBeenCalledOnce();expect(f.task().status).toBe('partial');});
it('文本补标核验器提交独立画像协议，不需要重开浏览器',async()=>{const f=fixture();const settings=new SettingsManager(f.store,{});const output={judgments:[],annotations:[{dimensionId:'style',status:'unknown',values:[],reason:'insufficient',evidenceIds:[]}]};const complete=vi.fn<Model['complete']>().mockResolvedValue({role:'assistant',content:null,tool_calls:[{id:'a',type:'function',function:{name:'submit_judgments',arguments:JSON.stringify(output)}}]});expect(await modelVerifier({complete},settings)({...spec,annotations:[{id:'style',label:'风格'}]},f.task()?.candidates[0]??{id:'a',evidence:[]} as unknown as Creator,'t')).toEqual(output);complete.mockResolvedValueOnce({role:'assistant',content:null,tool_calls:[{id:'b',type:'function',function:{name:'submit_judgments',arguments:JSON.stringify({judgments:[],facts:[]})}}]});expect(await modelVerifier({complete},settings)(spec,{id:'a',evidence:[]} as unknown as Creator,'t')).toHaveProperty('facts');});
it('同账号后续轮询补全国家/数值时只重算基础规则，保留原证据和审计且不重复核验/计人',async()=>{const f=fixture();const task=f.engine.start({...spec,count:1},'facts-stream');await f.engine.wake();f.advance();f.wave.poll.mockResolvedValueOnce({status:'running',creators:[{...raw[0],followerCount:null,region:null,factorGrades:{location:'unknown'}}]});await f.engine.wake();expect(f.engine.results(task.id)[0].verdict).toBe('unknown');f.advance();f.wave.poll.mockResolvedValueOnce({status:'done',creators:[{...raw[0],handle:undefined,region:'US',factorGrades:{location:'confirmed_country'}}],alsoFound:[{...raw[0],followerCount:0}]}as any);await f.engine.wake();expect(f.engine.results(task.id)).toHaveLength(1);expect(f.engine.results(task.id)[0].verdict).toBe('match');expect(f.verify).toHaveBeenCalledOnce();expect(f.store.list('result-history')).toHaveLength(1);expect(f.task()).toMatchObject({evaluated:1,matched:1,status:'completed'});});
it('远端更新与已经观察的本人事实冲突时保留 unknown，不能静默覆盖旧来源',async()=>{const f=fixture();const task=f.engine.start({...spec,regions:['US']},'conflicting-facts');f.verify.mockImplementationOnce(async(_s,c)=>{c.evidence.push({id:'observed-fact',url:c.profileUrl,text:'20K followers Location: United States',kind:'browser_snapshot',provider:'headed-chromium',capturedAt:1,publishedAt:null});return {judgments:[{criterionId:'tech',verdict:'match',reason:'actual',evidenceIds:[c.evidence[0].id]}],facts:[{kind:'followers',rawValue:'20K followers',evidenceIds:['observed-fact']},{kind:'country',rawValue:'Location: United States',evidenceIds:['observed-fact']}]} as any});await f.engine.wake();f.advance();f.wave.poll.mockResolvedValueOnce({status:'running',creators:[{...raw[0],followerCount:null,region:null}]});await f.engine.wake();const saved=f.engine.results(task.id)[0];f.store.set('result',saved.id,{...saved,revision:undefined});f.advance();f.wave.poll.mockResolvedValueOnce({status:'done',creators:[{...raw[0],followerCount:90000,region:'CA',factorGrades:{location:'confirmed_country'}}]});await f.engine.wake();expect(f.engine.results(task.id)[0].verdict).toBe('unknown');expect(f.engine.results(task.id)[0].creator.facts!.conflicts).toHaveLength(2);expect(f.task().evaluated).toBe(1);expect(f.store.list('result-history')).toHaveLength(1);});
it('原任务等待人工时继续 API 轮询，远端失败保留已有候选；人工交还后完成本地缺额报告不重搜',async()=>{const f=fixture();const task=f.engine.start(spec,'human-remote-failure');await f.engine.wake();f.advance();f.wave.poll.mockResolvedValueOnce({status:'running',creators:[raw[0]]});f.verify.mockImplementationOnce(async()=>{const request={id:'human-failed',taskId:task.id,creatorId:'instagram:mike',reason:'login',status:'pending' as const,createdAt:1,leaseUntil:0};f.store.set('assistance',request.id,request);throw new HumanRequired(request)});await f.engine.wake();expect(f.task().status).toBe('needs_input');f.advance();f.wave.poll.mockResolvedValueOnce({status:'failed',creators:[]});await f.engine.wake();expect(f.wave.poll).toHaveBeenCalledTimes(2);expect(f.task()).toMatchObject({status:'needs_input',remoteStatus:'failed'});expect(f.task().candidates).toHaveLength(1);expect(f.task().detail).toContain('失败');expect(f.task().detail).toContain('人工');expect(f.verify).toHaveBeenCalledOnce();f.store.set('assistance','human-failed',{status:'done'});f.store.set('task',task.id,{...f.task(),status:'running',nextPollAt:0});await f.engine.wake();expect(f.task()).toMatchObject({status:'partial',evaluated:1,matched:1});expect(f.wave.poll).toHaveBeenCalledTimes(2);expect(f.wave.submit).toHaveBeenCalledOnce();expect(f.store.list<any>('message').at(-1).text).toContain('1/2');});
