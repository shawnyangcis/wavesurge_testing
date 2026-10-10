import { afterEach, describe, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { SettingsManager } from '../src/server/settings.ts';
import { ModelClient } from '../src/server/model.ts';
import type { ChatMessage, Model, ToolCall } from '../src/server/model.ts';
import { Context, validatePairs } from '../src/server/context.ts';
import type { Backup } from '../src/server/context.ts';
import { Agent } from '../src/server/agent.ts';
import { basicTools } from '../src/server/tools.ts';
import type { Message } from '../src/shared/contracts.ts';
import { validImage } from '../src/shared/contracts.ts';
import { createApp } from '../src/server/app.ts';
import { initializeAdmin } from '../src/server/auth.ts';
import { registerDebug } from '../src/server/debug-api.ts';
const stores: Store[] = [];
afterEach(() => { for (const store of stores.splice(0)) store.close(); });
const answer = (content: string): ChatMessage => ({ role: 'assistant', content });
const call = (name = 'get_tasks', args = '{}', id = 'tc'): ToolCall => ({ id, type: 'function', function: { name, arguments: args } });
function fixture(env: NodeJS.ProcessEnv = {}) {
  const store = new Store(':memory:'); stores.push(store); let n = 0; const id = () => String(++n);
  const settings = new SettingsManager(store, env); const context = new Context(store, id);
  const complete = vi.fn<Model['complete']>().mockResolvedValue(answer('已收到'));
  const agent = new Agent(store, settings, context, { complete }, basicTools(store), () => 1000, id);
  const user = (text = '找人', epoch = context.epoch(), role: Message['role'] = 'user', state: Message['state'] = 'pending') => { const message: Message = { id: id(), text, role, state, epoch, attachments: [], createdAt: 0 }; store.set('message', message.id, message); return message; };
  return { store, settings, context, agent, complete, user, id };
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
describe('设置与模型', () => {
  it('缺省、环境初始化与重启保留，敏感键不返回', () => {
    const { store, settings } = fixture(); expect(settings.current().modelId).toBe('gpt-4.1'); expect(settings.current().apiKey).toBe('');
    expect(settings.endpoint()).toBe('https://api.openai.com/v1/chat/completions'); expect(settings.redact({ x: 'hello' })).toEqual({ x: 'hello' });
    const second = new SettingsManager(store, { BASE_URL: 'http://wrong', MODEL_ID: 'wrong', API_KEY: 'wrong' }); expect(second.public()).toEqual(settings.public());
    const old = settings.current(); delete (old as Partial<typeof old>).verificationPrompt; delete (old as Partial<typeof old>).compressionPrompt; store.set('settings', 'model', old); expect(settings.current().verificationPrompt).toContain('单个候选'); expect(settings.current().compressionPrompt).toContain('未完成请求');
  });
  it('更新、版本保护、密钥脱敏及 URL 边界', () => {
    const { settings } = fixture({ BASE_URL: 'http://127.0.0.1:8317', API_KEY: 'secret-token', MODEL_ID: 'model', IN_DOCKER: '1' });
    expect(settings.endpoint()).toBe('http://host.docker.internal:8317/v1/chat/completions'); expect(settings.public()).not.toHaveProperty('apiKey');
    expect(settings.redact({ text: 'secret-token twice secret-token' })).toEqual({ text: '[REDACTED] twice [REDACTED]' });
    const update = settings.public(); settings.save({ ...update, workflowPrompt: 'next' }); expect(settings.current().apiKey).toBe('secret-token');
    expect(() => settings.save(update)).toThrow('重新读取');
    for (const baseUrl of ['file:///tmp/model', 'https://u:p@example.com', 'https://example.com/?key=x', 'https://example.com/#x']) expect(() => settings.save({ ...settings.public(), baseUrl })).toThrow('HTTP');
    for (const baseUrl of ['http://localhost:1/v1/', 'http://[::1]:1/v1', 'https://remote.test/v1/chat/completions/']) { settings.save({ ...settings.public(), baseUrl, apiKey: 'new' }); expect(settings.endpoint()).toContain('/v1/chat/completions'); }
    const plain = fixture({ BASE_URL: 'http://localhost:1', IN_DOCKER: '0' }); expect(plain.settings.endpoint()).toBe('http://localhost:1/v1/chat/completions');
  });
  it('保存准确请求/返回与工具响应，不保存授权头', async () => {
    const { store, settings, id } = fixture({ API_KEY: 'sensitive-key' });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: null, tool_calls: [call()] } }], usage: { total_tokens: 4 }, text: 'sensitive-key' }) } as Response);
    const client = new ModelClient(store, settings, fetcher, () => 10, id); const tool = basicTools(store).definitions;
    const response = await client.complete([{ role: 'user', content: 'test' }], tool, 2, 'chat'); expect(response.tool_calls).toHaveLength(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error', headers: { Authorization: 'Bearer sensitive-key' } });
    const record = store.list<Record<string, unknown>>('call')[0]; expect(record).toMatchObject({ epoch: 2, createdAt: 10, finishedAt: 10, revision: 1 });
    expect(JSON.stringify(record)).not.toContain('sensitive-key'); expect(record.request).toHaveProperty('tools');
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'hello', tool_calls: [] } }] }) } as Response);
    expect((await client.complete([], [], 0, 'compression')).content).toBe('hello'); expect(store.list<{ request: object }>('call')[1].request).not.toHaveProperty('tools');
  });
  it('HTTP、网络、无消息、无内容、非法调用与无工具 null 均记录失败', async () => {
    const { store, settings, id } = fixture({ API_KEY: 'private-key' }); const fetcher = vi.fn<typeof fetch>(); const client = new ModelClient(store, settings, fetcher, () => 1, id);
    fetcher.mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers(), json: async () => ({ error: 'private-key' }) } as Response); await expect(client.complete([], [], 0, 'chat')).rejects.toThrow('401');
    fetcher.mockRejectedValueOnce(new Error('network private-key')); await expect(client.request([], [], 0, 'chat')).rejects.toThrow('network [REDACTED]');
    for (const result of [{}, { choices: [] }, { choices: [{ message: { content: 2 } }] }, { choices: [{ message: { content: null } }] }, { choices: [{ message: { content: null, tool_calls: [] } }] }]) {
      fetcher.mockResolvedValueOnce({ ok: true, json: async () => result } as Response); await expect(client.complete([], [], 0, 'chat')).rejects.toThrow('返回格式');
    }
    for (const bad of [{ ...call(), id: 1 }, { ...call(), id: '' }, { ...call(), type: 'other' }, { ...call(), function: {} }, { ...call(), function: { name: 'a', arguments: 1 } }]) {
      fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '', tool_calls: [bad] } }] }) } as Response); await expect(client.complete([], [], 0, 'chat')).rejects.toThrow('工具调用格式');
    }
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: null, tool_calls: [call(), call()] } }] }) } as Response); await expect(client.complete([], [], 0, 'chat')).rejects.toThrow('工具调用格式');
    expect(store.list<{ finishedAt: number }>('call').every(record => record.finishedAt === 1)).toBe(true);
  });
});
describe('上下文与备份', () => {
  it('完整配对检查与非法历史', () => {
    validatePairs([answer('hello')]); validatePairs([{ role: 'assistant', content: null, tool_calls: [call()] }, { role: 'tool', content: 'ok', tool_call_id: 'tc' }]);
    validatePairs([{ role: 'user', content: [{ type: 'text', text: 'image' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }] }]);
    for (const batch of [[{ role: 'evil', content: '' }], [{ role: 'user', content: 1 }], [{ role: 'tool', content: '' }], [{ role: 'tool', content: '', tool_call_id: 'none' }], [{ role: 'assistant', content: '', tool_calls: [call()] }], [{ role: 'assistant', content: '', tool_calls: [call()] }, { role: 'user', content: 'interrupt' }], [{ role: 'user', content: '', tool_calls: [] }], [{ role: 'assistant', content: '', tool_calls: [call(), call()] }]]) expect(() => validatePairs(batch as ChatMessage[])).toThrow();
    for (const item of [{ type: 'text', text: 1 }, { type: 'evil' }, { type: 'image_url' }, { type: 'image_url', image_url: { url: 'javascript:alert(1)' } }]) expect(() => validatePairs([{ role: 'user', content: [item] }] as unknown as ChatMessage[])).toThrow();
    expect(validImage(1)).toBe(false); expect(validImage('x'.repeat(2800001))).toBe(false);
  });
  it('备份、摘要、重置保留任务、加载不重放工具', () => {
    const { store, context, user, agent, complete } = fixture(); const first = user(); user('old', -1); user('answer', 0, 'assistant', 'delivered');
    const batch = context.append([{ role: 'user', content: 'original' }], [first.id]); const next = context.append([answer('next')]);
    expect(context.active()).toHaveLength(2); const without = context.backup(); expect(without).not.toHaveProperty('checkpoint');
    store.set('checkpoint', '0', { until: batch.id, text: 'summary' }); expect(context.active().map(x => x.id)).toEqual([next.id]);
    store.set('task', 't', { id: 't', status: 'running' }); const backup = context.backup(); expect(backup.checkpoint?.text).toBe('summary');
    expect(context.reset()).toBe(1); expect(store.get<Message>('message', first.id)?.state).toBe('delivered'); expect(store.get('task', 't')).toHaveProperty('status', 'running'); expect(context.active()).toEqual([]);
    expect(context.load(backup)).toBe(2); expect(context.active()).toHaveLength(1); expect(agent.pending()).toHaveLength(0); expect(complete).not.toHaveBeenCalled();
    const newEpoch = context.load(without); expect(newEpoch).toBe(3); expect(context.checkpoint()).toBeUndefined();
    store.set('checkpoint', '3', { until: 'missing', text: 'legacy' }); expect(context.active()).toHaveLength(2);
  });
  it('错误备份不能修改当前工作上下文', () => {
    const { context } = fixture();
    for (const invalid of [{}, { format: 'creator-studio/1', messages: {}, batches: [] }, { format: 'creator-studio/1', messages: [], batches: {} }, { format: 'creator-studio/1', messages: [], batches: [], checkpoint: { until: 'missing', text: 's' } }, { format: 'creator-studio/1', messages: [], batches: [{ messages: [{ role: 'tool' }] }] }]) expect(() => context.load(invalid as Backup)).toThrow();
    expect(context.epoch()).toBe(0);
    for (const message of [{ id: 1 }, { id: 'a', role: 'evil' }, { id: 'a', role: 'user', text: 1 }, { id: 'a', role: 'user', text: 'x', attachments: {} }, { id: 'a', role: 'user', text: 'x', attachments: ['https://untrusted.test/'] }]) expect(() => context.load({ format: 'creator-studio/1', messages: [message], batches: [] } as unknown as Backup)).toThrow('消息无效');
  });
});
describe('Agent 消息安全边界', () => {
  it('文本请求、复用已注入消息以及历史检索工具', async () => {
    const { agent, user, store, complete, context } = fixture(); const input = user(); user('other epoch', -1); user('assistant', 0, 'assistant'); user('done', 0, 'user', 'delivered');
    expect(agent.inject()).toBe(true); expect(agent.inject()).toBe(false); await agent.wake(); expect(agent.active).toBe(false);
    expect(store.get<Message>('message', input.id)?.state).toBe('delivered'); expect(complete).toHaveBeenCalledTimes(1); expect(context.batches()).toHaveLength(2);
    expect(await agent.tools.execute('get_tasks', {}, 'x')).toEqual([]); expect(await agent.tools.execute('search_history', { query: '找人' }, 'x')).toHaveLength(1);
    expect(await agent.tools.execute('search_history', { query: 'absent' }, 'x')).toEqual([]);
    for (const args of [null, 1, [], { query: 1 }, { query: '' }, { query: ' ' }, { query: 'x'.repeat(101) }]) await expect(agent.tools.execute('search_history', args, 'x')).rejects.toThrow();
    await expect(agent.tools.execute('unknown', {}, 'x')).rejects.toThrow('不存在');
    const image = user('image'); image.attachments = ['data:image/png;base64,AAAA']; store.set('message', image.id, image); expect(agent.inject()).toBe(true); expect(context.active().at(-1)?.messages[0].content).toEqual([{ type: 'text', text: 'image' }, { type: 'image_url', image_url: { url: image.attachments[0], detail: 'high' } }]);
  });
  it('调用中连续到达三条消息只在下一轮注入，不返回过期答复', async () => {
    const { agent, user, complete, context, store } = fixture(); const pending = deferred<ChatMessage>(); user('original'); complete.mockReturnValueOnce(pending.promise);
    const running = agent.wake(); expect(agent.wake()).toBe(running); await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1)); user('steer1'); user('steer2'); user('steer3');
    expect(complete.mock.calls[0][0].some(m => m.content === 'steer1')).toBe(false);
    pending.resolve(answer('discard stale')); await running;
    expect(complete).toHaveBeenCalledTimes(2); expect(complete.mock.calls[1][0].some(m => m.content === 'steer3')).toBe(true);
    expect(store.list<Message>('message').some(m => m.text === 'discard stale')).toBe(false); expect(agent.pending()).toHaveLength(0); validatePairs(context.active().flatMap(batch => batch.messages));
  });
  it('完整工具批次后接收新消息；参数与未知工具错误都完整配对', async () => {
    const { agent, user, complete, context } = fixture(); user(); const pending = deferred<unknown>(); const execute = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce('second'); agent.tools = { definitions: [], execute };
    complete.mockResolvedValueOnce({ role: 'assistant', content: null, tool_calls: [call('a', '{}', 'a'), call('b', '{}', 'b')] }); const running = agent.wake(); await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1)); user('interrupt tool');
    pending.resolve('first'); await running; expect(execute).toHaveBeenCalledTimes(2);
    const batch = context.batches()[1]; expect(batch.messages.map(m => m.role)).toEqual(['assistant', 'tool', 'tool']); expect(context.batches()[2].messages[0].content).toBe('interrupt tool');
    expect((await agent.tool(call('undefined', '{}', 'undefined'))).content).toBe('null'); agent.tools = basicTools(agent.store);
    expect((await agent.tool(call('unknown', '{}', 'unknown'))).content).toContain('不存在'); expect((await agent.tool(call('get_tasks', 'invalid', 'invalid'))).content).toContain('error');
  });
  it('同一工具编号重放必须绑定原参数，冲突不执行新动作；旧格式回执重新读取事实', async () => {
    const f = fixture(); const execute = vi.fn(async () => 'saved'); f.agent.tools = { definitions: [], execute }; const a = call('action', '{"x":1}', 'stable'); expect((await f.agent.tool(a)).content).toBe('"saved"'); expect((await f.agent.tool(a)).content).toBe('"saved"'); expect(execute).toHaveBeenCalledOnce();
    expect((await f.agent.tool(call('action', '{"x":2}', 'stable'))).content).toContain('不同参数'); expect(execute).toHaveBeenCalledOnce(); f.store.set('tool-receipt', 'old', { role: 'tool', content: 'old', tool_call_id: 'old' }); await f.agent.tool(call('get_tasks', '{}', 'old')); expect(execute).toHaveBeenCalledTimes(2);
  });
  it('状态变化导致重新读取，提示词在下一次调用生效', async () => {
    const { agent, user, complete, settings, store } = fixture(); const pending = deferred<ChatMessage>(); user(); complete.mockReturnValueOnce(pending.promise); const running = agent.wake(); await vi.waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    settings.save({ ...settings.public(), systemPrompt: 'new-system', workflowPrompt: 'new-workflow' }); store.set('task', 't', { id: 't', status: 'running' }); pending.resolve(answer('stale progress')); await running;
    expect(complete.mock.calls[0][0][0].content).not.toBe('new-system'); expect(complete.mock.calls[1][0][0].content).toBe('new-system'); expect(complete.mock.calls[1][0][2].content).toContain('running');
    expect(store.list<Message>('message').some(m => m.text === 'stale progress')).toBe(false);
  });
  it('reset 后旧调用不能写到新 epoch，处理新消息', async () => {
    const { agent, user, complete, context, store } = fixture(); const pending = deferred<ChatMessage>(); user('old'); complete.mockReturnValueOnce(pending.promise); const running = agent.wake(); await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce()); context.reset(); user('new'); pending.resolve(answer('old response')); await running;
    expect(store.list<Message>('message').some(m => m.text === 'old response')).toBe(false); expect(context.batches().every(batch => batch.epoch === 1)).toBe(true); expect(agent.pending()).toHaveLength(0);
  });
  it('工具中 reset 不执行旧批次后续动作', async () => {
    const { agent, user, complete, context } = fixture(); user(); complete.mockResolvedValueOnce({ role: 'assistant', content: null, tool_calls: [call('first', '{}', 'a'), call('second', '{}', 'b')] });
    const execute = vi.fn(async () => { context.reset(); return 'reset'; }); agent.tools = { definitions: [], execute }; await agent.wake(); expect(execute).toHaveBeenCalledTimes(1); expect(context.batches()).toEqual([]);
  });
  it('模型错误、预算上限、停止与恢复不丢 pending', async () => {
    const failed = fixture({ API_KEY: 'secret' }); failed.user(); failed.complete.mockRejectedValueOnce(new Error('problem secret')); await failed.agent.wake(); expect(failed.store.list<Message>('message').at(-1)?.text).toContain('[REDACTED]');
    const loop = fixture(); loop.user(); loop.complete.mockResolvedValue({ role: 'assistant', content: null, tool_calls: [call()] }); await loop.agent.wake(); expect(loop.complete).toHaveBeenCalledTimes(12); expect(loop.store.list<Message>('message').at(-1)?.text).toContain('处理上限');
    const stopped = fixture(); stopped.agent.stopped = true; stopped.user(); await stopped.agent.wake(); expect(stopped.agent.pending()).toHaveLength(1);
    stopped.agent.stopped = false; const pending = deferred<ChatMessage>(); stopped.complete.mockReturnValueOnce(pending.promise); const running = stopped.agent.wake(); await vi.waitFor(() => expect(stopped.complete).toHaveBeenCalledOnce()); stopped.agent.stopped = true; pending.resolve(answer('late')); await running; expect(stopped.agent.pending()).toHaveLength(1);
    stopped.agent.stopped = false; await stopped.agent.wake(); expect(stopped.agent.pending()).toHaveLength(0);
    const rejected = fixture(); rejected.user(); const error = deferred<ChatMessage>(); rejected.complete.mockReturnValueOnce(error.promise); const rejection = rejected.agent.wake(); await vi.waitFor(() => expect(rejected.complete).toHaveBeenCalledOnce()); rejected.context.reset(); error.reject(new Error('old')); await rejection; expect(rejected.store.list<Message>('message')).toHaveLength(1);
    const stoppedError = fixture(); stoppedError.user(); const e = deferred<ChatMessage>(); stoppedError.complete.mockReturnValueOnce(e.promise); const r = stoppedError.agent.wake(); await vi.waitFor(() => expect(stoppedError.complete).toHaveBeenCalledOnce()); stoppedError.agent.stopped = true; e.reject(new Error('stop')); await r; expect(stoppedError.agent.pending()).toHaveLength(1);
  });
  it('重启恢复未提交的工具批次，沿用原调用编号且保留已完成回执', async () => {
    const f = fixture(); f.user(); f.agent.inject(); const a = call('first', '{}', 'stable-a'); const b = call('second', '{}', 'stable-b');
    f.store.set('agent-flight', 'current', { epoch: 0, answer: { role: 'assistant', content: null, tool_calls: [a, b] }, results: [{ role: 'tool', content: 'saved', tool_call_id: a.id }] });
    const execute = vi.fn().mockResolvedValue('resumed'); f.agent.tools = { definitions: [], execute }; await f.agent.wake();
    expect(execute).toHaveBeenCalledOnce(); expect(execute.mock.calls[0]).toEqual(['second', {}, 'stable-b']); expect(f.store.get('agent-flight', 'current')).toBeUndefined(); validatePairs(f.context.active().flatMap(batch => batch.messages));
    const old = fixture(); old.user(); old.store.set('agent-flight', 'current', { epoch: -1, answer: { role: 'assistant', content: null, tool_calls: [a] }, results: [] }); await old.agent.wake(); expect(old.complete).toHaveBeenCalledOnce();
    const stopped = fixture(); stopped.agent.stopped = true; expect(await stopped.agent.finishFlight({ epoch: 0, answer: { role: 'assistant', content: null, tool_calls: [a] }, results: [] })).toBe(false);
    const interrupted = fixture(); interrupted.user(); interrupted.agent.inject(); interrupted.store.set('agent-flight', 'current', { epoch: 0, answer: { role: 'assistant', content: null, tool_calls: [a, b] }, results: [] }); interrupted.agent.tools = { definitions: [], execute: vi.fn(async () => { interrupted.agent.stopped = true; return 'stop'; }) }; await interrupted.agent.wake(); expect(interrupted.complete).not.toHaveBeenCalled(); expect(interrupted.agent.pending()).toHaveLength(1);
    const reset = fixture(); reset.agent.tools = { definitions: [], execute: vi.fn(async () => { reset.context.reset(); return 'reset'; }) }; expect(await reset.agent.finishFlight({ epoch: 0, answer: { role: 'assistant', content: null, tool_calls: [a] }, results: [] })).toBe(false);
    const finalStop = fixture(); finalStop.user(); finalStop.complete.mockResolvedValueOnce({ role: 'assistant', content: null, tool_calls: [a] }); finalStop.agent.tools = { definitions: [], execute: vi.fn(async () => { finalStop.agent.stopped = true; return 'stop'; }) }; await finalStop.agent.wake(); expect(finalStop.complete).toHaveBeenCalledOnce(); expect(finalStop.agent.pending()).toHaveLength(1);
  });
  it('已收齐回执的恢复批次遇到新 epoch 也不能写回旧调用或重新执行', async () => {
    const f = fixture(); const a = call('get_tasks', '{}', 'finished'); const flight = { epoch: 0, answer: { role: 'assistant' as const, content: null, tool_calls: [a] }, results: [{ role: 'tool' as const, content: '[]', tool_call_id: a.id }] };
    f.context.reset(); const execute = vi.fn(); f.agent.tools = { definitions: [], execute };
    expect(await f.agent.finishFlight(flight)).toBe(false); expect(f.context.active()).toEqual([]); expect(f.store.get('agent-flight', 'current')).toBeUndefined(); expect(execute).not.toHaveBeenCalled();
  });
  it('压缩等待期间 reset 或停止，不启动过期模型调用', async () => {
    for (const mode of ['reset', 'stop']) {
      const f = fixture(); f.context.append([answer('x'.repeat(8000))]); f.user(); f.settings.save({ ...f.settings.public(), compressionThreshold: 2000 }); const pending = deferred<ChatMessage>(); f.complete.mockReturnValueOnce(pending.promise); const running = f.agent.wake(); await vi.waitFor(() => expect(f.complete).toHaveBeenCalledOnce());
      if (mode === 'reset') f.context.reset(); else f.agent.stopped = true;
      pending.resolve(answer('summary')); await running; expect(f.complete).toHaveBeenCalledOnce();
    }
  });
});
describe('摘要安全', () => {
  function history() { const f = fixture(); f.context.append([{ role: 'user', content: 'old request' }]); f.context.append([answer('old answer')]); f.context.append([{ role: 'user', content: 'latest correction' }]); return f; }
  it('阈值、摘要边界、最新纠正保留与旧摘要延续', async () => {
    const f = history(); expect(await f.agent.compact(false)).toBe(false); expect(await f.agent.compact(true)).toBe(true); expect(f.context.active()).toHaveLength(1); expect(f.agent.messages()[3].content).toContain('历史摘要'); expect(f.agent.messages().at(-1)?.content).toBe('latest correction');
    f.context.append([answer('answer latest')]); f.context.append([{ role: 'user', content: 'x'.repeat(8000) }]); f.settings.save({ ...f.settings.public(), compressionThreshold: 2000 }); expect(await f.agent.compact(false)).toBe(true); expect(f.complete.mock.calls[1][0][1].content).toContain('previous');
    const none = fixture(); expect(await none.agent.compact(true)).toBe(false); none.context.append([{ role: 'user', content: 'only user' }]); expect(await none.agent.compact(true)).toBe(false);
  });
  it('摘要竞争和错误不采用 checkpoint', async () => {
    const reset = history(); const pending = deferred<ChatMessage>(); reset.complete.mockReturnValueOnce(pending.promise); const r = reset.agent.compact(true); reset.context.reset(); pending.resolve(answer('obsolete')); expect(await r).toBe(false);
    const concurrent = history(); const wait = deferred<ChatMessage>(); concurrent.complete.mockReturnValueOnce(wait.promise); const work = concurrent.agent.compact(true); concurrent.store.set('checkpoint', '0', { until: concurrent.context.batches()[0].id, text: 'other' }); wait.resolve(answer('lost')); expect(await work).toBe(false);
    for (const response of [answer(' '), { role: 'assistant', content: null }, { role: 'assistant', content: 'bad', tool_calls: [call()] }]) { const f = history(); f.complete.mockResolvedValueOnce(response as ChatMessage); await expect(f.agent.compact(true)).rejects.toThrow('摘要返回'); expect(f.context.checkpoint()).toBeUndefined(); }
  });
});
describe('调试 HTTP', () => {
  it('鉴权、热更新、准确上下文/调用、备份/恢复/reset/摘要错误', async () => {
    const f = fixture({ API_KEY: 'private-key' }); initializeAdmin(f.store, 'admin'); const app = createApp({ store: f.store, now: () => 1, onMessage: () => {}, active: () => false }); registerDebug(app, f.store, f.settings, f.agent);
    const login = await app.inject({ method: 'POST', url: '/api/login', payload: { password: 'admin' } }); const cookie = login.headers['set-cookie']!.toString().split(';')[0];
    const get = (url: string) => app.inject({ url, headers: { cookie } }); const post = (url: string, payload = {}) => app.inject({ method: 'POST', url, headers: { cookie }, payload });
    try {
      for (const url of ['/api/settings', '/api/debug', '/api/backup']) expect((await app.inject(url)).statusCode).toBe(401);
      expect((await get('/api/settings')).json()).not.toHaveProperty('apiKey'); const settings = f.settings.public(); expect((await post('/api/settings', settings)).statusCode).toBe(200); expect((await post('/api/settings', settings)).statusCode).toBe(400); expect((await post('/api/settings', {})).statusCode).toBe(400);
      f.store.set('call', 'c', { request: 'private-key' }); expect((await get('/api/debug')).body).not.toContain('private-key'); expect((await get('/api/backup')).headers['content-disposition']).toContain('creator-context');
      const backup = (await get('/api/backup')).json(); expect((await post('/api/context/load', backup)).statusCode).toBe(200); expect((await post('/api/context/load', {})).statusCode).toBe(400); expect((await post('/api/context/reset')).json()).toHaveProperty('epoch', 2);
      expect((await post('/api/context/compress')).json()).toEqual({ compacted: false }); f.context.append([answer('past')]); f.context.append([{ role: 'user', content: 'new' }]); f.complete.mockRejectedValueOnce(new Error('summary error')); expect((await post('/api/context/compress')).statusCode).toBe(400);
    } finally { await app.close(); }
  });
});
it('仅升级精确匹配的旧默认工作流/核验提示词，保留用户定制与模型秘密',async()=>{const {legacyWorkflowPrompt,legacyVerificationPrompt,workflowPrompt,verificationPrompt}=await import('../src/shared/prompts.ts');const f=fixture({API_KEY:'private-key'});const old=f.settings.current();f.store.set('settings','model',{...old,workflowPrompt:legacyWorkflowPrompt,verificationPrompt:legacyVerificationPrompt});const updated=new SettingsManager(f.store,{}).current();expect(updated.workflowPrompt).toBe(workflowPrompt);expect(updated.verificationPrompt).toBe(verificationPrompt);expect(updated.apiKey).toBe('private-key');expect(updated.revision).toBe(old.revision+1);f.store.set('settings','model',{...old,workflowPrompt:'用户定制工作流',verificationPrompt:legacyVerificationPrompt});expect(new SettingsManager(f.store,{}).current().workflowPrompt).toBe('用户定制工作流');f.store.set('settings','model',{...old,workflowPrompt:legacyWorkflowPrompt,verificationPrompt:'用户定制核验'});expect(new SettingsManager(f.store,{}).current().verificationPrompt).toBe('用户定制核验');});
it('识别初次部署的早期默认工作流，且新设置不携带迁移常量',async()=>{const {legacyEarlyWorkflowPrompt,workflowPrompt}=await import('../src/shared/prompts.ts');const f=fixture();expect(f.settings.public()).not.toHaveProperty('legacyWorkflowPrompt');expect(f.settings.public()).not.toHaveProperty('legacyVerificationPrompt');const old=f.settings.current();f.store.set('settings','model',{...old,workflowPrompt:legacyEarlyWorkflowPrompt});const updated=new SettingsManager(f.store,{}).current();expect(updated.workflowPrompt).toBe(workflowPrompt);expect(updated.revision).toBe(old.revision+1);});

it('升级本轮协议默认提示词时明确个人KOC硬条件，保留已存模型密钥',async()=>{const {legacyProtocolWorkflowPrompt,workflowPrompt}=await import('../src/shared/prompts.ts');const f=fixture({API_KEY:'private-key'});const old=f.settings.current();f.store.set('settings','model',{...old,workflowPrompt:legacyProtocolWorkflowPrompt});const updated=new SettingsManager(f.store,{}).current();expect(updated.workflowPrompt).toBe(workflowPrompt);expect(updated.workflowPrompt).toContain('个人身份也是独立的必选文字条件');expect(updated.apiKey).toBe('private-key');});
it('四份旧默认提示词一次升级且可重复启动，逐字段保留用户定制和模型配置', async () => {
  const prompts = await import('../src/shared/prompts.ts'); const f = fixture({ API_KEY: 'preserved-secret', MODEL_ID: 'preserved-model' }); const old = f.settings.current();
  f.store.set('settings', 'model', { ...old, systemPrompt: prompts.legacySystemPrompt, workflowPrompt: prompts.legacyReportWorkflowPrompt, verificationPrompt: prompts.legacyFactsVerificationPrompt, compressionPrompt: prompts.legacyCompressionPrompt });
  const upgraded = new SettingsManager(f.store, {}).current();
  for (const field of ['systemPrompt', 'workflowPrompt', 'verificationPrompt', 'compressionPrompt'] as const) expect(upgraded[field]).toBe(prompts[field]);
  expect(upgraded).toMatchObject({ apiKey: old.apiKey, modelId: old.modelId, baseUrl: old.baseUrl, revision: old.revision + 1 });
  expect(new SettingsManager(f.store, {}).current()).toEqual(upgraded);
  for (const field of ['systemPrompt', 'workflowPrompt', 'verificationPrompt', 'compressionPrompt'] as const) {
    const custom = { ...upgraded, [field]: `用户定制 ${field}` }; f.store.set('settings', 'model', custom);
    expect(new SettingsManager(f.store, {}).current()).toEqual(custom);
  }
});
