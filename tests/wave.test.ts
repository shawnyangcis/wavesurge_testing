import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Store } from '../src/server/store.ts';
import { WaveClient, WaveError, normalizeCreator, searchBody } from '../src/server/wave.ts';
import { resolveJudgments } from '../src/server/verdict.ts';
import { platforms, searchSchema } from '../src/shared/research.ts';
import type { Creator, Judgment, SearchSpec } from '../src/shared/research.ts';
const stores: Store[] = []; afterEach(() => { stores.splice(0).forEach(store => store.close()); });
const spec: SearchSpec = { title: '科技作者', personaText: 'tech creators', count: 2, candidateBudget: 10, platforms: ['instagram'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [{ id: 'tech', label: '科技内容', required: true, basis: 'text' }, { id: 'recent', label: '近期发布', required: false, basis: 'text' }] };
function fixture(token = 'private-token') { const store = new Store(':memory:'); stores.push(store); let n = 0; const fetcher = vi.fn<typeof fetch>(); const client = new WaveClient(token, store, fetcher, () => 5, () => String(++n)); return { store, fetcher, client }; }
function response(body: unknown, status = 200, retryAfter: string | null = null) { return { ok: status >= 200 && status < 300, status, headers: { get: () => retryAfter }, text: async () => typeof body === 'string' ? body : JSON.stringify(body) } as unknown as Response; }
const actual = JSON.parse(readFileSync('validation/2026-10-09/direct-search-noemail-poll-03.json', 'utf8')).response as { creators: Record<string, unknown>[] };
describe('WaveSurge 固定边界', () => {
  it('稳定 body、免费直接接口、Cookie、完整脱敏记录', async () => {
    const { fetcher, client, store } = fixture(); const body = searchBody(spec, 'stable-id'); expect(body).toEqual({ requestId: 'stable-id', personaText: 'tech creators', count: 10, platforms: ['instagram'], regions: [], minFollowers: 10000, maxFollowers: 100000, emailReadyRequired: false });
    fetcher.mockResolvedValueOnce(response({ taskId: 'remote-id', secret: 'private-token' }, 201)); expect(await client.submit(body)).toBe('remote-id'); expect(fetcher.mock.calls[0][0]).toBe('https://wavesurge.ai/api/v1/creator-search/requests'); expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST', redirect: 'error', headers: { Cookie: 'kolagent_token=private-token' }, body: JSON.stringify(body) });
    fetcher.mockResolvedValueOnce(response({ status: 'done', creators: actual.creators, alsoFound: [actual.creators[0]], summary: { delivered: 2 } })); const poll = await client.poll('remote/id'); expect(poll.creators).toHaveLength(2); expect(poll.alsoFound).toHaveLength(1); expect(fetcher.mock.calls[1][0]).toContain('remote%2Fid');
    fetcher.mockResolvedValueOnce(response({ status: 'running' })); expect((await client.poll('x')).creators).toEqual([]);
    fetcher.mockResolvedValueOnce(response({ creators: [] })); await client.pool('youtube'); expect(fetcher.mock.calls[3][0]).toContain('/discover/db?platform=youtube');
    expect(JSON.stringify(store.list('wave-call'))).not.toContain('private-token'); expect(store.list('wave-call')).toHaveLength(4);
    expect(platforms).toHaveLength(4); expect(searchSchema.properties.count.maximum).toBe(1000);
  });
  it('HTTP 错误、Retry-After、网络、格式、缺 token、不会把 HTML 403 当网络重试', async () => {
    const { fetcher, client, store } = fixture();
    for (const [status, retry, expected] of [[429, '2', 2000], [503, '500', 300000], [401, null, 60000], [403, 'invalid', 60000]] as const) {
      fetcher.mockResolvedValueOnce(response('private-token error html', status, retry));
      try { await client.poll('task'); throw new Error('unexpected success'); } catch (error) { expect(error).toBeInstanceOf(WaveError); expect(error).toMatchObject({ status, retryAfterMs: expected }); }
    }
    fetcher.mockRejectedValueOnce(new Error('network private-token')); await expect(client.poll('x')).rejects.toThrow('network [REDACTED]');
    fetcher.mockResolvedValueOnce(response('not-json')); await expect(client.poll('x')).rejects.toMatchObject({ status: 0 });
    for (const taskId of [null, '']) { fetcher.mockResolvedValueOnce(response({ taskId })); await expect(client.submit(searchBody(spec, 'id'))).rejects.toThrow('taskId'); }
    fetcher.mockResolvedValueOnce(response({ status: 'unknown' })); await expect(client.poll('x')).rejects.toThrow('状态格式');
    const missing = fixture(''); await expect(missing.client.poll('x')).rejects.toMatchObject({ status: 401 }); expect(missing.fetcher).not.toHaveBeenCalled();
    const custom = new WaveClient('', missing.store, missing.fetcher, () => 5, () => 'custom', 'https://test'); await expect(custom.poll('x')).rejects.toThrow('配置');
    expect(JSON.stringify(store.list('wave-call'))).not.toContain('private-token');
    for (const status of [0, 429, 500, 401]) expect(new WaveError('e', status, 1).retryable()).toBe(status === 0 || status === 429 || status >= 500);
  });
});
describe('真实 Creator 快照适配与证据', () => {
  it('同主页有无 handle、URL 参数与 host 别名使用同一身份；YouTube channel ID 保留大小写', () => {
    const one = normalizeCreator({ platform: 'instagram', handle: '@Some.One', profileUrl: 'https://www.instagram.com/Some.One/' }, 1);
    expect(normalizeCreator({ platform: 'instagram', profileUrl: 'https://instagram.com/some.one/?hl=en#bio' }, 1).id).toBe(one.id);
    expect(normalizeCreator({ platform: 'twitter', profileUrl: 'https://x.com/SomeOne/' }, 1).id).toBe(normalizeCreator({ platform: 'twitter', handle: 'someone', profileUrl: 'https://twitter.com/someone' }, 1).id);
    expect(normalizeCreator({ platform: 'youtube', profileUrl: 'https://youtube.com/channel/UCAbC' }, 1).id).not.toBe(normalizeCreator({ platform: 'youtube', profileUrl: 'https://youtube.com/channel/UCabc' }, 1).id);
  });
  it('已确认国家代码、名称与别名一致，无法识别的国家保持待核实', () => {
    const creator = normalizeCreator(actual.creators[0], 1);
    const base = { ...spec, criteria: [] };
    for (const [region, requested] of [['US', 'United States'], ['GB', 'United Kingdom'], ['UK', 'GB'], ['美国', 'USA'], ['Germany', 'DE']]) expect(resolveJudgments({ ...base, regions: [requested] }, { ...creator, region }, []).verdict).toBe('match');
    expect(resolveJudgments({ ...base, regions: ['United States'] }, { ...creator, region: 'unresolved place' }, []).verdict).toBe('unknown');
  });
  it('direct 返回无 id/bio 时稳定去重，保留 audience 全结构', () => {
    const creator = normalizeCreator(actual.creators[0], 5); expect(creator).toMatchObject({ platform: 'instagram', handle: 'mikebanh_', followers: 36502, region: 'Canada' }); expect(creator.evidence.length).toBeGreaterThan(0); expect(creator.raw.audience).toEqual(actual.creators[0].audience);
    expect(normalizeCreator({ ...actual.creators[0], handle: '@MIKEBANH_' }, 6).id).toBe(creator.id); expect(creator.evidence[0].capturedAt).toBe(5);
    const pool = normalizeCreator({ platform: 'youtube', profileUrl: 'https://youtube.com/channel/UC001/', bio: 'A creator', followerCount: null, evidence: [null, 'bad', {}, { url: 'javascript:bad' }, { url: 'https://source.test', text: 1 }] }, 5);
    expect(pool.id).toBe('youtube:channel/UC001'); expect(pool.followers).toBeNull(); expect(pool.region).toBeNull(); expect(pool.evidence).toHaveLength(2); expect(pool.evidence[0].publishedAt).toBeNull();
    expect(normalizeCreator({ platform: 'twitter', handle: 'user', followerCount: NaN }, 5).followers).toBeNull();
    expect(() => normalizeCreator({ platform: 'unsupported' }, 0)).toThrow('平台'); expect(() => normalizeCreator({ platform: 'instagram' }, 0)).toThrow('身份');
  });
  it('边界数值与所有必选条件；偏好失败不改变合格', () => {
    const creator = normalizeCreator(actual.creators[0], 1); const evidenceId = creator.evidence[0].id; const proposal: Judgment[] = [{ criterionId: 'tech', verdict: 'match', reason: '科技帖子', evidenceIds: [evidenceId] }, { criterionId: 'recent', verdict: 'no_match', reason: '非近期', evidenceIds: [evidenceId] }];
    expect(resolveJudgments(spec, creator, proposal).verdict).toBe('match');
    for (const [followers, verdict] of [[9999, 'no_match'], [10000, 'match'], [100000, 'match'], [100001, 'no_match'], [null, 'unknown']] as const) expect(resolveJudgments(spec, { ...creator, followers }, proposal).verdict).toBe(verdict);
    expect(resolveJudgments(spec, creator, []).verdict).toBe('unknown');
    expect(resolveJudgments(spec, creator, [{ ...proposal[0], evidenceIds: [] }]).judgments.find(j => j.criterionId === 'tech')?.verdict).toBe('unknown');
    expect(resolveJudgments(spec, creator, [{ ...proposal[0], verdict: 'unknown', evidenceIds: [] }]).verdict).toBe('unknown');
    expect(resolveJudgments(spec, creator, [{ ...proposal[0], verdict: 'no_match' }]).verdict).toBe('no_match');
    const visualSpec = { ...spec, criteria: spec.criteria.map(item => ({ ...item, basis: 'visual' as const })) };
    expect(resolveJudgments(visualSpec, creator, proposal).verdict).toBe('unknown');
    const withImage = { ...creator, evidence: creator.evidence.map(item => ({ ...item, assetId: 'screenshot' })) }; expect(resolveJudgments(visualSpec, withImage, proposal).verdict).toBe('match');
    for (const bad of [{ ...proposal[0], criterionId: 'absent' }, { ...proposal[0], verdict: 'bad' }, { ...proposal[0], reason: 1 }, { ...proposal[0], evidenceIds: null }]) expect(() => resolveJudgments(spec, creator, [bad] as Judgment[])).toThrow('格式');
    expect(() => resolveJudgments(spec, creator, [proposal[0], proposal[0]])).toThrow('格式'); expect(() => resolveJudgments(spec, creator, [{ ...proposal[0], evidenceIds: ['absent'] }])).toThrow('证据');
  });
  it('平台及确证国家约束由程序核验，地区不足为 unknown', () => {
    const creator = normalizeCreator(actual.creators[0], 1); const proposal: Judgment[] = [{ criterionId: 'tech', verdict: 'match', reason: 'tech', evidenceIds: [creator.evidence[0].id] }];
    const canadian = { ...spec, regions: ['canada'] }; expect(resolveJudgments(canadian, creator, proposal).verdict).toBe('match'); expect(resolveJudgments({ ...spec, regions: ['United States'] }, creator, proposal).verdict).toBe('no_match');
    expect(resolveJudgments(canadian, { ...creator, region: null }, proposal).verdict).toBe('unknown'); expect(resolveJudgments(canadian, { ...creator, raw: {} }, proposal).verdict).toBe('unknown'); expect(resolveJudgments(canadian, { ...creator, raw: { factorGrades: { location: 'unclear' } } }, proposal).verdict).toBe('unknown');
    expect(resolveJudgments(spec, { ...creator, platform: 'youtube' }, proposal).verdict).toBe('no_match'); const cityCountry = { ...creator, region: 'Philadelphia (Philly), United States' }; expect(resolveJudgments({ ...spec, regions: [' United States '] }, cityCountry, proposal).verdict).toBe('match'); expect(resolveJudgments(canadian, cityCountry, proposal).verdict).toBe('no_match');
  });
});
it('国家筛选无法识别时不错误排除已确认国家，平台之外的三态保留',()=>{const c=normalizeCreator(actual.creators[0],1);expect(resolveJudgments({...spec,criteria:[],regions:['not-a-country']},c,[]).verdict).toBe('unknown');expect(resolveJudgments({...spec,criteria:[],regions:['not-a-country']},{...c,region:'US'},[]).verdict).toBe('unknown');});
