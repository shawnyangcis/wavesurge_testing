import { Store } from '../../src/server/store.ts';
import { ResearchEngine } from '../../src/server/research.ts';
const store = new Store('/app/data/studio.sqlite');
const id = process.argv[2];
const engine = new ResearchEngine(store, { submit: async () => 'fixture', poll: async () => ({ status: 'done', creators: [] }) }, async () => [], Date.now);
const task = engine.start({ title: `浏览器人工协助验收 ${id}`, personaText: '控制性测试创作者，公开帖子必须人工验证后访问。', count: 1, candidateBudget: 1, platforms: ['instagram'], regions: [], minFollowers: 0, maxFollowers: 100000, criteria: [{ id: 'technology', label: '公开帖子画面可见 CHIP / CIRCUIT BOARD 字样；先访问来源取得截图，遇到验证须人工协助，不能以简介代替画面', basis: 'visual', required: true }] }, id);
task.remoteId = `fixture-${id}`; task.remoteStatus = 'done'; task.status = 'running'; task.nextPollAt = 0; task.candidates = [{ id: `instagram:fixture-${id}`, platform: 'instagram', handle: `fixture-${id}`, displayName: '集成测试创作者（非真实社交账号）', followers: 10000, region: null, profileUrl: 'http://127.0.0.1:8085/', evidence: [{ id: 'fixture-profile', url: 'http://127.0.0.1:8085/', kind: 'profile', text: '控制性浏览器验收夹具；需人工验证后可见公开科技帖子。没有帖子截图。', provider: 'integration-fixture', publishedAt: null, capturedAt: Date.now() }], raw: { fixture: true } }];
if (process.argv[3]) { task.candidates[0].profileUrl = process.argv[3]; task.candidates[0].evidence[0].url = process.argv[3]; }
engine.save(task); store.close(); process.stdout.write(task.id);
