import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { researchTools } from '../src/server/research-tools.ts';
import { basicTools } from '../src/server/tools.ts';
import { taskFacts } from '../src/server/task-facts.ts';
import { researchExecution } from '../src/server/execution-policy.ts';
import { SettingsManager } from '../src/server/settings.ts';
import * as prompts from '../src/shared/prompts.ts';
import type { SearchSpec } from '../src/shared/research.ts';
import type { DesktopBroker } from '../src/server/desktop.ts';
const stores: Store[] = []; afterEach(() => stores.splice(0).forEach(store => store.close()));
const spec: SearchSpec = { title: '公开资料研究', personaText: 'books', count: 1, candidateBudget: 2, platforms: ['instagram'], regions: [], minFollowers: 0, maxFollowers: 100000, criteria: [] };
function fixture() { const store = new Store(':memory:'); stores.push(store); const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, async () => [], () => 1); engine.stopped = true; return { store, engine }; }
it('执行偏好采用最新独立记录，工作线程保存旧副本及重复调用不丢失偏好或另建研究', async () => {
 const f = fixture(), task = f.engine.start(spec, 'same'); const tools = researchTools(f.engine, basicTools(f.store));
 expect(researchExecution(f.store, task.id)).toEqual({ allowHumanAssistance: true });
 expect(researchExecution(f.store, task.id, { ...spec, allowHumanAssistance: false })).toEqual({ allowHumanAssistance: false });
 const input = { taskId: task.id, allowHumanAssistance: false };
 expect(await tools.execute('set_research_execution', input, 'change')).toMatchObject({ task: { id: task.id }, executionPolicy: { allowHumanAssistance: false } });
 f.engine.save(task); await tools.execute('set_research_execution', input, 'change');
 expect(taskFacts(f.store)[0].allowHumanAssistance).toBe(false); expect(f.store.tasks()).toHaveLength(1); expect(f.store.get('task', task.id)).toMatchObject({ spec });
 await tools.execute('set_research_execution', { ...input, allowHumanAssistance: true }, 'enable'); expect(taskFacts(f.store)[0].allowHumanAssistance).toBe(true);
 const newer = f.engine.start({ ...spec, allowHumanAssistance: false }, 'public'); expect(taskFacts(f.store).find(t => t.id === newer.id)?.allowHumanAssistance).toBe(false);
 for (const status of ['completed', 'partial', 'failed', 'cancelled']) { f.store.set('task', task.id, { ...task, status }); await expect(tools.execute('set_research_execution', input, 'x')).rejects.toThrow('进行中'); }
 await expect(tools.execute('set_research_execution', { ...input, taskId: 'missing' }, 'x')).rejects.toThrow('进行中');
 for (const invalid of [null, [], 1, {}, { taskId: 1, allowHumanAssistance: false }, { taskId: '', allowHumanAssistance: false }, { taskId: task.id }, { ...input, allowHumanAssistance: 'false' }, { ...input, criteria: [] }]) await expect(tools.execute('set_research_execution', invalid, 'x')).rejects.toThrow('布尔值');
});
it('禁止协助只撤销同一任务的请求，恢复当前候选；允许协助和其它任务的租约保留', async () => {
 const f = fixture(), task = f.engine.start(spec, 'same'); f.store.set('task', task.id, { ...task, status: 'needs_input' });
 const active = vi.fn().mockReturnValue({ id: 'r', taskId: task.id }); const release = vi.fn(async () => f.store.set('task', task.id, { ...task, status: 'running' })); const tools = researchTools(f.engine, basicTools(f.store), { active, release } as unknown as DesktopBroker);
 await tools.execute('set_research_execution', { taskId: task.id, allowHumanAssistance: true }, 'keep'); expect(release).not.toHaveBeenCalled();
 expect(await tools.execute('set_research_execution', { taskId: task.id, allowHumanAssistance: false }, 'skip')).toMatchObject({ task: { status: 'running' }, executionPolicy: { allowHumanAssistance: false } }); expect(release).toHaveBeenCalledWith('r', expect.stringContaining('跳过登录'));
 active.mockReturnValue({ id: 'other', taskId: 'other' }); await tools.execute('set_research_execution', { taskId: task.id, allowHumanAssistance: false }, 'other'); expect(release).toHaveBeenCalledOnce();
 active.mockReturnValue(undefined); await tools.execute('set_research_execution', { taskId: task.id, allowHumanAssistance: false }, 'none'); expect(release).toHaveBeenCalledOnce();
});
it('精准迁移上一版本默认提示词中的协助口径，保留自定义设置和模型配置', () => {
 const f = fixture(), settings = new SettingsManager(f.store, { API_KEY: 'secret' }); const old = settings.current(); f.store.set('settings', 'model', { ...old, systemPrompt: prompts.legacyPublicSystemPrompt, workflowPrompt: prompts.legacyPublicWorkflowPrompt, verificationPrompt: prompts.legacyPublicVerificationPrompt }); const next = new SettingsManager(f.store, {}).current(); expect(next.apiKey).toBe('secret'); expect(next.revision).toBe(old.revision + 1);
 for (const field of ['systemPrompt', 'workflowPrompt', 'verificationPrompt'] as const) { expect(next[field]).toBe(prompts[field]); f.store.set('settings', 'model', { ...old, [field]: 'custom' }); expect(new SettingsManager(f.store, {}).current()[field]).toBe('custom'); }
});
it('用户单次跳过只结束当前候选协助，保留默认后续许可且不能误释放其它工作',async()=>{
 const f=fixture(),task=f.engine.start(spec,'single-skip');const active=vi.fn().mockReturnValue({id:'r',taskId:task.id});const release=vi.fn().mockResolvedValue({status:'done'});const tools=researchTools(f.engine,basicTools(f.store),{active,release}as unknown as DesktopBroker);
 expect(await tools.execute('skip_browser_assistance',{taskId:task.id},'skip')).toMatchObject({request:{status:'done'},task:{id:task.id}});expect(release).toHaveBeenCalledWith('r',expect.stringContaining('跳过本次'));expect(researchExecution(f.store,task.id)).toEqual({allowHumanAssistance:true});
 active.mockReturnValue({id:'other',taskId:'other'});await expect(tools.execute('skip_browser_assistance',{taskId:task.id},'other')).rejects.toThrow('其它工作');active.mockReturnValue(undefined);await expect(tools.execute('skip_browser_assistance',{taskId:task.id},'none')).rejects.toThrow('其它工作');await expect(researchTools(f.engine,basicTools(f.store)).execute('skip_browser_assistance',{taskId:task.id},'absent')).rejects.toThrow('其它工作');expect(release).toHaveBeenCalledOnce();
 for(const bad of[null,[],1,{},{taskId:1},{taskId:''},{taskId:task.id,allowHumanAssistance:false}])await expect(tools.execute('skip_browser_assistance',bad,'bad')).rejects.toThrow('编号');
});
