import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { ModelClient, ModelError } from '../src/server/model.ts';
import { SettingsManager } from '../src/server/settings.ts';
import { taskFacts } from '../src/server/task-facts.ts';
import type { SearchSpec } from '../src/shared/research.ts';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const stores: Store[] = [];
afterEach(() => { stores.splice(0).forEach(s => s.close()); vi.useRealTimers(); });
const spec: SearchSpec = { title: '文字研究', personaText: 'tech', count: 1, candidateBudget: 2, platforms: ['youtube'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [{ id: 'tech', label: '科技内容', basis: 'text', required: true }] };
it('升级历史 SQLite 时补建状态投影，缺失任务和版本返回明确空值', () => {
 const dir=mkdtempSync(join(tmpdir(),'r2-upgrade-')); const path=join(dir,'studio.sqlite'); const db=new DatabaseSync(path); db.exec('CREATE TABLE documents(kind TEXT,id TEXT,body TEXT,PRIMARY KEY(kind,id))'); db.prepare('INSERT INTO documents VALUES(?,?,?)').run('task','old',JSON.stringify({id:'old',status:'needs_input',candidates:[{raw:'large'}],discovery:{done:true},body:{}})); db.close(); const store=new Store(path);
 try { expect(store.task('missing')).toBeUndefined(); expect(store.version('missing')).toBe(0); expect(store.task('old')).toEqual({id:'old',status:'needs_input'}); } finally { store.close(); rmSync(dir,{recursive:true}); }
});
function fixture() { const store = new Store(':memory:'); stores.push(store); const verify = vi.fn(async () => []); const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, verify, () => 1); return { store, engine, verify }; }
it('人工等待的大任务不反复读取原始资料，状态投影在事务回滚后仍一致', async () => {
 const { store, engine } = fixture(); const task = engine.start(spec, 'large'); Object.assign(task, { status: 'needs_input', remoteId: 'existing', remoteStatus: 'done', candidates: Array.from({ length: 20 }, (_, i) => ({ id: `youtube:${i}`, raw: { padding: 'x'.repeat(400000) } })) }); store.set('task', task.id, task); store.set('assistance', 'a', { status: 'pending' });
 const get = vi.spyOn(store, 'get'); const list = vi.spyOn(store, 'list'); const start = performance.now(); await engine.tick(); const facts = taskFacts(store);
 expect(performance.now() - start).toBeLessThan(500); expect(facts[0].status).toBe('needs_input'); expect(get.mock.calls.filter(([kind]) => kind === 'task')).toHaveLength(0); expect(list.mock.calls.filter(([kind]) => kind === 'task')).toHaveLength(0);
 expect(() => store.transaction(() => { store.set('task', task.id, { ...task, status: 'cancelled' }); throw new Error('rollback'); })).toThrow('rollback'); expect(taskFacts(store)[0].status).toBe('needs_input'); store.delete('task', task.id); expect(taskFacts(store)).toEqual([]);
});
it('显式不用浏览器的新文字研究在人工租约期间完成，不调用桌面核验', async () => {
 const { store, engine, verify } = fixture(); const task = engine.start({ ...spec, verificationMode: 'text' }, 'text'); const creator = { id: 'youtube:a', platform: 'youtube', handle: 'a', displayName: 'a', profileUrl: '', followers: 20000, region: null, raw: {}, evidence: [{ id: 'e', url: '', text: 'technology', kind: 'profile', provider: 'wavesurge-pool', capturedAt: 1, publishedAt: null }] };
 Object.assign(task, { status: 'running', remoteId: 'existing', remoteStatus: 'done', candidates: [creator] }); store.set('task', task.id, task); store.set('assistance', 'a', { status: 'human' }); engine.textVerify = vi.fn(async () => [{ criterionId: 'tech', verdict: 'match' as const, reason: 'provided text', evidenceIds: ['e'] }]); await engine.tick();
 expect(verify).not.toHaveBeenCalled(); expect(engine.textVerify).toHaveBeenCalledOnce(); expect(store.get('task', task.id)).toMatchObject({ status: 'completed', matched: 1 }); expect(store.get('assistance', 'a')).toEqual({ status: 'human' });
});
it('聊天408有界重试，同一上下文和工具定义保留，每次实际请求可审计', async () => {
 vi.useFakeTimers(); const store = new Store(':memory:'); stores.push(store); const settings = new SettingsManager(store, { API_KEY: 'test' }); const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 408 })).mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '恢复成功' } }] })); let id = 0; const model = new ModelClient(store, settings, fetcher, () => 1, () => String(++id)); const messages = [{ role: 'user' as const, content: '原请求' }];
 const work = model.complete(messages, [], 0, 'chat'); await vi.advanceTimersByTimeAsync(3000); expect(await work).toMatchObject({ content: '恢复成功' }); expect(fetcher).toHaveBeenCalledTimes(2); expect(fetcher.mock.calls.map(([, init]) => init?.body)).toEqual([fetcher.mock.calls[0][1]?.body, fetcher.mock.calls[0][1]?.body]); expect(store.list('call')).toHaveLength(2); expect(new ModelError('timeout', 408).retryable()).toBe(true);
});
