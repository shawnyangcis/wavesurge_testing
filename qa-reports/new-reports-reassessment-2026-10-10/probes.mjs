import { Store } from '../../../src/server/store.ts';
import { ResearchEngine } from '../../../src/server/research.ts';
import { researchTools } from '../../../src/server/research-tools.ts';
import { resolveJudgments } from '../../../src/server/verdict.ts';
import { readFileSync, writeFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const root = '.gstack/qa-reports';
const base = { title: 'isolated analysis', personaText: 'technology', count: 1, candidateBudget: 2, platforms: ['instagram'], regions: [], minFollowers: 10000, maxFollowers: 100000, criteria: [] };
const raw = { platform: 'instagram', handle: 'controlled', profileUrl: 'https://www.instagram.com/controlled/', followerCount: 20000 };
const output = { source: 'Current production functions; isolated in-memory Store and existing review snapshots only. No new WaveSurge or LLM calls.' };
{
  const store = new Store(':memory:'); let now = 0;
  const engine = new ResearchEngine(store, { submit: async () => 'controlled-remote', poll: async () => ({ status: 'done', creators: [raw] }) }, async () => [], () => now);
  const task = engine.start(base, 'completion'); await engine.wake(); now = 60001; await engine.wake();
  output.F10 = { terminalStatus: store.get('task', task.id).status, chatMessages: store.list('message').length };
  store.close();
}
{
  const primary = read(`${root}/full-e2e-2026-10-10/primary-completion.json`);
  const spec = { ...base, ...primary.searchRequest, criteria: [{ id: 'technology_content', label: '科技内容', required: true, basis: 'text' }] };
  output.F11 = primary.results.map(result => { const computed = resolveJudgments(spec, result.creator, result.judgments.filter(j => !j.criterionId.startsWith('__'))); return { handle: result.creator.handle, rawCountry: result.creator.region, requestedCountries: spec.regions, regionVerdict: computed.judgments.find(j => j.criterionId === '__region').verdict, qualitativeVerdict: computed.judgments.find(j => j.criterionId === 'technology_content').verdict, totalVerdict: computed.verdict }; });
}
{
  const campaign = read(`${root}/full-e2e-2026-10-10/campaign-final-audit.json`);
  output.F13 = campaign.results.map(result => { const outcome = resolveJudgments({ ...base, platforms: ['youtube'] }, result.creator, []); return { handle: result.creator.handle, savedFollowers: result.creator.followers, browserContainsSubscriberDisplay: result.creator.evidence.some(e => e.assetId && e.text.includes('subscribers')), followersVerdict: outcome.judgments.find(j => j.criterionId === '__followers').verdict }; });
}
{
  const replay = read(`${root}/tagging-2026-10-10/replay-completion.json`);
  const tags = replay.results.map(result => ({ handle: result.creator.handle, tags: result.tags, reasonSaysGeekUnsupported: result.judgments.some(j => /不足以.*geek/i.test(j.reason)) }));
  const store = new Store(':memory:');
  const engine = new ResearchEngine(store, {}, async () => [], () => 0);
  const toolNames = researchTools(engine, { definitions: [], execute: async () => {} }).definitions.map(t => t.function.name);
  output.F14 = { existingRealReplayResults: tags, geekFilterCount: tags.filter(r => r.tags.some(tag => tag.includes('geek'))).length, researchToolNames: toolNames };
  store.close();
}
{
  const store = new Store(':memory:'); let now = 0, calls = 0;
  const engine = new ResearchEngine(store, { submit: async () => 'controlled-remote', poll: async () => ({ status: 'running', creators: [raw] }) }, async () => { calls++; return []; }, () => now);
  const task = engine.start({ ...base, count: 2 }, 'partial'); await engine.wake(); now = 60001; await engine.wake();
  const saved = store.get('task', task.id);
  output.F15 = { remoteReturnedCreators: 1, remoteStatus: saved.remoteStatus, localStatus: saved.status, savedCandidates: saved.candidates.length, evaluated: saved.evaluated, savedResults: engine.results(task.id).length, verifierCalls: calls };
  store.close();
}
writeFileSync(`${root}/new-reports-reassessment-2026-10-10/probe-results.json`, JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
