import { Store } from '../../src/server/store.ts';
import { ResearchEngine } from '../../src/server/research.ts';
import { CampaignService } from '../../src/server/campaign.ts';
import { normalizeCreator } from '../../src/server/wave.ts';
const store = new Store('/app/data/studio.sqlite');
const engine = new ResearchEngine(store, { submit: async () => { throw Error('controlled UI fixture must not search'); }, poll: async () => ({ status: 'done', creators: [] }) }, async () => [], Date.now);
const campaigns = new CampaignService(store, engine, Date.now);
const key = process.argv[2];
const spec = (index: number) => ({ title: `受控刷新类型${index} ${key}`, personaText: 'Controlled UI refresh fixture, not a genuine creator or discovery', platforms: ['instagram'] as const, regions: [], minFollowers: 10000, maxFollowers: 100000, count: 1, candidateBudget: 1, criteria: [] });
const plan = campaigns.save({ title: '受控Campaign刷新核验 ' + key, goal: 'Controlled fixture for checking asynchronous UI refresh, no actual creator filtering or search', audience: 'UI test', groups: [1, 2].map(index => ({ id: 'group' + index, rationale: '受控基础条件夹具，没有真实账号或定性核验', spec: spec(index) })) }, 'stale-plan-' + key);
plan.childTaskIds = plan.groups.map((group, index) => {
  const task = engine.start(group.spec, 'stale-task-' + key + '-' + index);
  task.exhaustive = true; task.status = 'running'; task.remoteId = 'controlled-ui:' + index; task.remoteStatus = 'done'; task.nextPollAt = Date.now() + 5000;
  task.candidates = [normalizeCreator({ platform: 'instagram', handle: 'controlled_ui_' + key + '_' + index, profileUrl: 'https://controlled.invalid/' + index, followerCount: 20000 }, Date.now())]; engine.save(task); return task.id;
});
store.set('campaign', plan.id, plan); process.stdout.write(JSON.stringify({ id: plan.id, title: plan.title, source: 'synthetic basic-condition candidates; production worker, no external calls, not semantic filtering or real discovery' })); store.close();
