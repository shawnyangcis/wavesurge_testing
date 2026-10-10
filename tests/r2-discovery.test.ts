import { afterEach, expect, it, vi } from 'vitest';
import { Store } from '../src/server/store.ts';
import { ResearchEngine } from '../src/server/research.ts';
import { discover, initialDiscovery } from '../src/server/discovery.ts';
import { normalizeCreator } from '../src/server/wave.ts';
import { candidateSelector } from '../src/server/shortlist.ts';
import { SettingsManager } from '../src/server/settings.ts';
import { browserVerifier, judgmentTool } from '../src/server/browser-verifier.ts';
import type { DesktopBroker } from '../src/server/desktop.ts';
import type { SearchSpec } from '../src/shared/research.ts';
const stores: Store[] = []; afterEach(() => stores.splice(0).forEach(s => s.close()));
const spec: SearchSpec = { title: '范围回归', personaText: 'tech', count: 1, candidateBudget: 2, platforms: ['instagram'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [] };
const profileRead = async (path: string) => ({ data: { username: new URL(path, 'https://fixture.test').searchParams.get('username'), id: null, edge_followed_by: { count: 20000 } } });
it('精确指定两账号不搜索相似用户名，checkpoint 重启后目标二仍读取', async () => {
 const read = vi.fn(profileRead); let x = await discover(read, { ...spec, instagram: { handles: ['first', 'second'] } }, undefined, 1); expect(x.creators[0].handle).toBe('first'); x = await discover(read, { ...spec, instagram: { handles: ['first', 'second'] } }, JSON.parse(JSON.stringify(x.state)), 1); expect(x.creators[0].handle).toBe('second'); expect(x.state.done).toBe(true); expect(read.mock.calls.every(([path]) => !path.includes('search_users'))).toBe(true);
});
it('泛关键词轮流取候选，第一词十个相似账号不能挤掉第二词首位', async () => {
 const read = vi.fn(async (path: string) => path.includes('search_users') ? { data: { users: new URL(path, 'https://fixture.test').searchParams.get('query') === 'first' ? Array.from({ length: 10 }, (_, i) => ({ username: 'first' + i })) : [{ username: 'second' }], rank_token: null } } : profileRead(path)); let state; const handles = [];
 for (let i = 0; i < 6 && !state?.done; i++) { const x = await discover(read, { ...spec, instagram: { queries: ['first', 'second'] } }, state, 1); state = JSON.parse(JSON.stringify(x.state)); handles.push(...x.creators.map(c => c.handle)); } expect(handles).toEqual(['first0', 'second']);
});
it('已有池先排除明确基础不符，未知地区保留；真实读取路径和排除范围保存', async () => {
 const read = vi.fn(async () => ({ creators: [{ platform: 'tiktok', handle: 'huge', followerCount: 10000000 }, { platform: 'tiktok', handle: 'tech', followerCount: 20000 }, { platform: 'youtube', handle: 'wrong', followerCount: 20000 }, { platform: 'tiktok', handle: 'uk', followerCount: 20000, region: 'UK', factorGrades: { location: 'confirmed_country' } }, { platform: 'invalid' }] })); const x = await discover(read, { ...spec, platforms: ['tiktok'], regions: ['US'] }, undefined, 1); expect(x.creators.map(c => c.handle)).toEqual(['tech']); expect(x.state.sources).toMatchObject([{ read: 5, excluded: 4 }]); expect(read.mock.calls[0]).toEqual(['/discover/db?platform=tiktok&limit=500&sort=fit_desc']);
});
it('平台主页定位保留 YouTube channel ID 大小写，不为无效身份猜链接', () => {
 expect(normalizeCreator({ platform: 'tiktok', handle: '@tech' }, 1).profileUrl).toBe('https://www.tiktok.com/@tech'); expect(normalizeCreator({ platform: 'twitter', handle: 'Tech' }, 1).profileUrl).toBe('https://x.com/tech'); const channel = 'UCAbCdefGhIjKlMnOpQrStUv'; expect(normalizeCreator({ platform: 'youtube', handle: channel }, 1).profileUrl).toBe(`https://www.youtube.com/channel/${channel}`); expect(normalizeCreator({ platform: 'youtube', handle: 'MrBeast' }, 1).profileUrl).toBe('https://www.youtube.com/@mrbeast'); expect(normalizeCreator({ platform: 'youtube', handle: 'invalid / handle' }, 1).profileUrl).toBe('');
});
it('无偏好也可明确要求分析全部，入选配额与结果条数独立', async () => {
 const store = new Store(':memory:'); stores.push(store); const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, async () => [], () => 1); const task = engine.start({ ...spec, analyzeAll: true }, 'all'); Object.assign(task, { status: 'running', remoteId: 'old', remoteStatus: 'done', candidates: ['first', 'second'].map(handle => normalizeCreator({ platform: 'instagram', handle, followerCount: 20000 }, 1)) }); store.set('task', task.id, task); await engine.tick(); expect(store.get('task', task.id)).toMatchObject({ status: 'completed', evaluated: 2, matched: 1 }); expect(engine.results(task.id)).toHaveLength(2);
 expect(() => engine.start({ ...spec, instagram: { handles: ['first', 'FIRST'] } }, 'duplicate')).toThrow('重复'); expect(() => engine.start({ ...spec, instagram: { handles: ['a', 'b', 'c'] } }, 'over')).toThrow('预算');
});
it('模型候选选择只能引用已有身份，不把选择当作通过核验', async () => {
 const store = new Store(':memory:'); stores.push(store); const complete = vi.fn().mockResolvedValue({ role: 'assistant', content: null, tool_calls: [{ function: { name: 'select_candidates', arguments: '{"ids":["youtube:second"]}' } }] }); const select = candidateSelector({ complete }, new SettingsManager(store, {})); const creators = ['first', 'second'].map(handle => normalizeCreator({ platform: 'youtube', handle, bio: 'technology', followerCount: 20000 }, 1)); expect((await select(spec, creators, 1)).map(c => c.handle)).toEqual(['second']); expect(await select(spec, [], 1)).toEqual([]); expect(await select(spec, creators, 0)).toEqual([]);
 for (const ids of [['missing'], ['youtube:first', 'youtube:first'], ['youtube:first', 'youtube:second'], 1]) { complete.mockResolvedValueOnce({ tool_calls: [{ function: { name: 'select_candidates', arguments: JSON.stringify({ ids }) } }] }); await expect(select(spec, creators, 1)).rejects.toThrow('候选选择'); } complete.mockResolvedValueOnce({ content: 'guess' }); await expect(select(spec, creators, 1)).rejects.toThrow('未提交');
 expect(await select(spec, creators, 2)).toEqual(creators);
});
it('多词读取检查点恢复旧队列、去重，分页循环和三页边界终止', async () => {
 const read = vi.fn(async (path: string) => path.includes('search_users') ? { data: { users: [{ username: 'same' }, { username: '' }], rank_token: 'cursor' } } : profileRead(path));
 let state = { ...initialDiscovery(), pending: [{ username: 'migrated' }] }; const handles: string[] = [];
 for (let i = 0; i < 20 && !state.done; i++) { const x = await discover(read, { ...spec, candidateBudget: 20, instagram: { queries: ['a', 'b', 'c'] } }, state, 1); state = JSON.parse(JSON.stringify(x.state)); handles.push(...x.creators.map(c => c.handle)); }
 expect(handles).toEqual(['migrated', 'same']); expect(state.done).toBe(true); expect(state.queues).toBeUndefined();
 let pages = { ...initialDiscovery(), queues: [{ pending: [], cursor: 'two', page: 2, seen: ['one','two'], done: false }, { pending: [], cursor: '', page: 0, seen: [], done: true }] };
 const x = await discover(async () => ({ data: { users: [], rank_token: 'three' } }), { ...spec, instagram: { queries: ['a', 'b'] } }, pages, 1); expect(x.state.done).toBe(true);
 const inactive = { ...initialDiscovery(), queues: [{ pending: [], cursor: '', page: 1, seen: [], done: true }, { pending: [], cursor: '', page: 0, seen: [], done: false }] }; const skipped = await discover(read, { ...spec, instagram: { queries: ['a', 'b'] } }, inactive, 1); expect(skipped.creators).toEqual([]); expect(skipped.state.keyword).toBe(1);
});
it('无筛选条件协议没有占位判断且不限粉丝有明确最大值', () => {
 const schema = judgmentTool(spec).function.parameters as any; expect(schema.properties.judgments.maxItems).toBe(0); expect(JSON.stringify(schema)).not.toContain('__no_criteria');
});
it('缺失主页时使用已有来源，损坏链接和异账号导航不能污染证据', async () => {
 const store = new Store(':memory:'); stores.push(store); const creator = normalizeCreator({ platform: 'youtube', handle: 'invalid / handle' }, 1); creator.evidence.push({ id: 'bad', url: 'broken', text: 'bad', kind: 'profile', provider: 'test', publishedAt: null, capturedAt: 1 }, { id: 'good', url: 'https://source.test/own', text: 'original', kind: 'profile', provider: 'test', publishedAt: null, capturedAt: 1 });
 const complete = vi.fn().mockResolvedValueOnce({ tool_calls: [{ id: 'navigate', function: { name: 'browser', arguments: '{"action":"navigate","url":"https://source.test/own"}' } }] }).mockResolvedValue({ tool_calls: [{ id: 'submit', function: { name: 'submit_judgments', arguments: '{"judgments":[]}' } }] }); const desktop = { command: vi.fn().mockResolvedValue({ url: 'https://source.test/other', assetId: 'wrong', observedAt: 1, text: '' }), scope: vi.fn(), image: vi.fn() }; await browserVerifier({ complete }, new SettingsManager(store, {}), desktop as unknown as DesktopBroker, store)(spec, creator, 'source'); expect(creator.evidence).toHaveLength(2); expect(desktop.image).not.toHaveBeenCalled();
});
it('已有池默认 shortlist 可核验，等待模型选人时取消不保存迟到结果', async () => {
 for (const cancel of [false, true]) { const store = new Store(':memory:'); stores.push(store); const creator = normalizeCreator({ platform: 'youtube', handle: 'tech', followerCount: 20000 }, 1); const state = { ...initialDiscovery(), done: true, sources: [{ platform: 'youtube', path: '/discover/db', read: 500, excluded: 499 }] }; const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn(), discover: vi.fn(async () => ({ state, creators: [creator] })) }, async () => [], () => 1); const task = engine.start({ ...spec, platforms: ['youtube'] }, `pool-${cancel}`); if (cancel) engine.shortlist = async () => { engine.cancel(task.id); return [creator]; }; await engine.tick(); expect(store.task<any>(task.id).status).toBe(cancel ? 'cancelled' : 'completed'); expect(engine.results(task.id)).toHaveLength(cancel ? 0 : 1); if (!cancel) expect(store.task<any>(task.id).detail).toContain('读取 500 条'); }
});
it('基础明确不符直接排除，但用户要求完整分析时仍逐人保留核验过程', async () => {
 for (const all of [false,true]) { const store = new Store(':memory:'); stores.push(store); const verify = vi.fn(async () => []); const engine = new ResearchEngine(store, { submit: vi.fn(), poll: vi.fn() }, verify, () => 1); const task = engine.start({ ...spec, analyzeAll: all, criteria: [{ id: 'content', label: 'tech', required: true, basis: 'text' }] }, `excluded-${all}`); Object.assign(task, { remoteId: 'old', remoteStatus: 'done', status: 'running', candidates: [normalizeCreator({ platform: 'instagram', handle: 'huge', followerCount: 1000000 }, 1)] }); store.set('task', task.id, task); await engine.tick(); expect(verify).toHaveBeenCalledTimes(all ? 1 : 0); expect(engine.results(task.id)[0].verdict).toBe('no_match'); }
});
it('没有定位时拒绝 observe，空白页/其他账号截图不进入候选证据', async () => {
 const store = new Store(':memory:'); stores.push(store); const creator = normalizeCreator({ platform: 'tiktok', handle: 'target' }, 1); const complete = vi.fn().mockResolvedValueOnce({ tool_calls: [{ id: 'obs', function: { name: 'browser', arguments: '{"action":"observe"}' } }] }).mockResolvedValue({ tool_calls: [{ id: 'submit', function: { name: 'submit_judgments', arguments: '{"judgments":[]}' } }] }); const command = vi.fn().mockResolvedValue({ url: 'about:blank', assetId: 'blank', observedAt: 1, text: '' }); const desktop = { command, image: vi.fn(), scope: vi.fn() }; await browserVerifier({ complete }, new SettingsManager(store, {}), desktop as unknown as DesktopBroker, store)(spec, creator, 'test'); expect(creator.evidence).toEqual([]); expect(command).toHaveBeenCalledOnce(); expect(desktop.image).not.toHaveBeenCalled();
});
