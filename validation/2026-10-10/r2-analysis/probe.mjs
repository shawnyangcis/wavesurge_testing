import { writeFileSync } from 'node:fs';
import { Store } from '../../../src/server/store.ts';
import { ResearchEngine } from '../../../src/server/research.ts';
import { normalizeCreator } from '../../../src/server/wave.ts';
import { ModelError } from '../../../src/server/model.ts';
import { resultTags } from '../../../src/server/assessment.ts';
import { discover } from '../../../src/server/discovery.ts';

const output = new URL('./', import.meta.url);
const spec = { title: 'Readonly replay', personaText: 'tech', count: 1, candidateBudget: 2, platforms: ['youtube'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [{ id: 'content', label: '内容方向', required: true, basis: 'text' }], annotations: [{ id: 'topic', label: '内容方向' }] };
const creator = i => normalizeCreator({ platform: 'youtube', handle: `replay${i}`, followerCount: 20000, bio: 'technology', profileUrl: `https://www.youtube.com/@replay${i}` }, 1);
async function replay(blocked) {
 const store = new Store(':memory:'); let calls = 0;
 const engine = new ResearchEngine(store, { submit: async () => { throw new Error('unexpected'); }, poll: async () => { throw new Error('unexpected'); } }, async (_spec, c) => { calls++; return { judgments: [{ criterionId: 'content', verdict: 'match', reason: 'fixture text', evidenceIds: [c.evidence[0].id] }], annotations: [{ dimensionId: 'topic', status: 'supported', values: ['科技'], reason: 'fixture text', evidenceIds: [c.evidence[0].id] }] }; }, () => 1);
 const task = engine.start(spec, `read-only-${blocked}`); Object.assign(task, { status: 'running', remoteId: 'fixture', remoteStatus: 'done', candidates: [creator(1), creator(2)] }); store.set('task', task.id, task);
 if (blocked) store.set('assistance', 'fixture', { status: 'pending' });
 await engine.tick(); const current = store.get('task', task.id); const result = { blocked, calls, status: current.status, readCandidates: current.candidates.length, evaluated: current.evaluated, matched: current.matched, resultCount: engine.results(task.id).length }; store.close(); return result;
}
async function timing(label, large, status) {
 const store = new Store(':memory:'); const engine = new ResearchEngine(store, { submit: async () => {}, poll: async () => {} }, async () => { throw new Error('unexpected'); }, () => 1);
 for (let i = 0; i < 6; i++) { const task = engine.start({ ...spec, candidateBudget: 20 }, `${label}-${i}`); Object.assign(task, { status, remoteId: 'fixture', remoteStatus: 'done', candidates: Array.from({ length: 20 }, (_, j) => ({ ...creator(j), raw: { padding: large ? 'x'.repeat(i === 0 ? 407000 : 91500) : 'x' } })) }); store.set('task', task.id, task); }
 store.set('assistance', 'fixture', { status: 'pending' });
 let taskReads = 0; const originalGet = store.get.bind(store); store.get = (kind, id) => { if (kind === 'task') taskReads++; return originalGet(kind, id); };
 const taskBytes = store.db.prepare("SELECT sum(length(body)) AS n FROM documents WHERE kind='task'").get().n;
 const ms = []; for (let i = 0; i < 3; i++) { const start = performance.now(); await engine.tick(); ms.push(performance.now() - start); }
 store.close(); return { label, taskBytes, taskReadsPerTick: taskReads / 3, tickMs: ms };
}
const negativeSpec = { ...spec, criteria: [{ id: 'individual', label: '个人创作者账号，不是品牌、商店或机构账号', required: true, basis: 'text' }, { id: 'shortage', label: '若未找到则报告来源缺额', required: true, basis: 'text' }] };
const tags = resultTags(negativeSpec, { judgments: negativeSpec.criteria.map(c => ({ criterionId: c.id, verdict: 'match', reason: 'fixture', evidenceIds: [] })), annotations: [{ dimensionId: 'topic', status: 'supported', values: ['iPhone技巧'], reason: 'fixture', evidenceIds: ['fixture'] }] });
async function exactReplay() {
 const paths = []; const emitted = []; let state;
 const read = async path => { paths.push(path); const url = new URL(path, 'https://fixture.test'); if (path.includes('search_users')) return { data: { users: url.searchParams.get('query') === 'targetone' ? [{ username: 'targetone' }, { username: 'targetone_similar' }] : [{ username: 'targettwo' }] } }; return { data: { username: url.searchParams.get('username'), id: null, edge_followed_by: { count: 20000 } } }; };
 for (let i = 0; i < 10 && !state?.done; i++) { const batch = await discover(read, { ...spec, platforms: ['instagram'], instagram: { queries: ['targetone', 'targettwo'], version: 'v3' } }, state, 1); state = batch.state; emitted.push(...batch.creators.map(c => c.handle)); }
 return { paths, emitted, delivered: state.delivered, done: state.done, secondTargetQueried: paths.some(path => path.includes('query=targettwo')) };
}
if (!process.argv.includes('--fit-only')) {
const local = { at: new Date().toISOString(), productionWrites: false, replayData: 'synthetic in-memory SQLite; actual production functions', exactAccounts: await exactReplay(), earlyStop: await replay(false), textBlocked: await replay(true), model408Retryable: new ModelError('timeout', 408).retryable(), missingUrl: normalizeCreator({ platform: 'tiktok', handle: 'fixture', followerCount: 20000, bio: 'tech' }, 1).profileUrl, negativeTags: { tags, brandFalseHit: tags.some(tag => tag.includes('品牌')), shortageFalseHit: tags.some(tag => tag.includes('来源缺额')) }, performance: [await timing('large-waiting', true, 'needs_input'), await timing('small-waiting', false, 'needs_input'), await timing('large-terminal', true, 'partial')] };
writeFileSync(new URL('local-replay.json', output), JSON.stringify(local, null, 2)); console.log(JSON.stringify(local, null, 2));
}
if (process.argv.includes('--live') || process.argv.includes('--fit-only')) {
 const token = process.env.WAVESURGE_TOKEN; if (!token) throw new Error('WAVESURGE_TOKEN missing');
 const base = process.env.WAVESURGE_BASE_URL ?? 'https://wavesurge.ai/api/v1'; const results = [];
 for (const platform of ['tiktok', 'youtube']) for (const sort of process.argv.includes('--fit-only') ? ['fit_desc'] : ['followers_asc', 'followers_desc']) {
  const path = `/discover/db?platform=${platform}&limit=1000&sort=${sort}`;
  try { const start = performance.now(); const response = await fetch(`${base}${path}`, { headers: { Cookie: `kolagent_token=${token}` }, redirect: 'error', signal: AbortSignal.timeout(90000) }); const raw = await response.json(); const rows = Array.isArray(raw.creators) ? raw.creators : []; const nums = rows.map(c => c.followerCount).filter(n => typeof n === 'number');
   const matching = rows.filter(c => c.followerCount >= 10000 && c.followerCount <= 100000);
   results.push({ path, http: response.status, elapsedMs: performance.now() - start, count: rows.length, summaryTotal: raw.summary?.total, paginationKeys: Object.keys(raw).filter(k => /cursor|page|offset/i.test(k)), followers: nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null, matchingFollowers: matching.length, missingProfileUrl: rows.filter(c => !c.profileUrl).length, sampleMatchingIdentities: matching.slice(0, 5).map(c => ({ handle: c.handle, followers: c.followerCount, region: c.region })) });
  } catch { results.push({ path, error: 'GET probe failed; no credentials or response error text recorded' }); }
 }
 const live = { at: new Date().toISOString(), method: 'GET only, no platform search creation', requestedLimit: 1000, results, boundary: 'Counts do not prove profile existence, identity, location or qualitative suitability.' };
 writeFileSync(new URL(process.argv.includes('--fit-only') ? 'live-fit-probe.json' : 'live-pool-probe.json', output), JSON.stringify(live, null, 2)); console.log(JSON.stringify(live, null, 2));
}
