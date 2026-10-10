import { Store } from '../../src/server/store.ts';
import { ResearchEngine } from '../../src/server/research.ts';
import { CampaignService } from '../../src/server/campaign.ts';
import type { Creator, SearchSpec } from '../../src/shared/research.ts';
const store = new Store('/app/data/studio.sqlite');
const engine = new ResearchEngine(store, { submit: async () => 'fixture', poll: async () => ({ status: 'done', creators: [] }) }, async () => [], Date.now); engine.stopped = true;
const service = new CampaignService(store, engine, Date.now);
const spec: SearchSpec = { title: '控制性科技内容', personaText: 'controlled technology creator fixture', count: 1, candidateBudget: 2, platforms: ['instagram'], regions: [], minFollowers: 0, maxFollowers: 100000, criteria: [{ id: 'chip', label: '公开帖子截图中可见 CHIP / CIRCUIT BOARD 字样；必须取得真实浏览器截图', basis: 'visual', required: true }] };
const campaign = service.save({ title: `Campaign 去重集成夹具 ${process.argv[2]}`, goal: '控制性测试：两个类型各需一个账号；同一账号不能同时占两个配额', audience: '测试观众', groups: [{ id: 'tech', rationale: '控制性类型 A，允许 shared 与 only-a', spec: { ...spec, title: '测试类型 A' } }, { id: 'study', rationale: '控制性类型 B，仅允许 shared', spec: { ...spec, title: '测试类型 B' } }] }, process.argv[2]); const started = service.start(campaign.id, campaign.revision);
const candidate = (handle: string): Creator => ({ id: `instagram:${handle}`, platform: 'instagram', handle, displayName: `${handle}（集成夹具）`, followers: 20000, region: null, profileUrl: 'http://127.0.0.1:8085/', evidence: [{ id: `profile-${handle}`, url: 'http://127.0.0.1:8085/', text: '控制性测试页面。必须浏览帖子截图；非真实社交账号，当前还没有帖子截图。', kind: 'profile', provider: 'integration-fixture', publishedAt: null, capturedAt: Date.now() }], raw: { fixture: true } });
for (const [i, id] of started.childTaskIds.entries()) { const task = store.get<any>('task', id); task.remoteId = `fixture-${id}`; task.remoteStatus = 'done'; task.status = 'running'; task.nextPollAt = 0; task.candidates = i === 0 ? [candidate('fixture-campaign-shared'), candidate('fixture-campaign-only-a')] : [candidate('fixture-campaign-shared')]; engine.save(task); }
store.close(); process.stdout.write(campaign.id);
