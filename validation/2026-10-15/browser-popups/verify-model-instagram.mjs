import { chromium } from 'playwright';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { DesktopRuntime } from '../../../src/desktop/runtime.ts';
import { BrowserPolicy } from '../../../src/desktop/policy.ts';
import { desktopServer } from '../../../src/desktop/server.ts';
import { DesktopBroker, HumanRequired } from '../../../src/server/desktop.ts';
import { browserVerifier } from '../../../src/server/browser-verifier.ts';
import { Store } from '../../../src/server/store.ts';
import { SettingsManager } from '../../../src/server/settings.ts';
import { ModelClient } from '../../../src/server/model.ts';

process.loadEnvFile('.env');
const remote = process.env.QA_DESKTOP_CONTAINER;
const fixture = process.env.QA_MODEL_TARGET === 'fixture';
const root = `validation/2026-10-15/browser-popups/private/${remote ? 'container' : 'model'}-${fixture ? 'fixture' : 'instagram'}`; mkdirSync(root, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), 'studio-instagram-popups-'));
const browser = remote ? undefined : await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const context = await browser?.newContext({ viewport: { width: 1440, height: 900 } });
const runtime = context ? new DesktopRuntime(context, Date.now, randomUUID, () => {}, new BrowserPolicy()) : undefined;
const token = remote ? execFileSync('docker', ['exec', remote, 'node', '-e', "process.stdout.write(require('node:fs').readFileSync('/tmp/popup-token','utf8'))"], { encoding: 'utf8' }).trim() : randomUUID();
const app = runtime ? desktopServer(runtime, token) : undefined;
const address = remote ? process.env.QA_DESKTOP_URL : await app.listen({ host: '127.0.0.1', port: 0 });
const store = new Store(':memory:'); const settings = new SettingsManager(store, process.env);
const broker = new DesktopBroker(store, address, token, dir, fetch, Date.now);
const actions = []; const command = broker.command.bind(broker);
broker.command = async input => {
  const observation = await command(input);
  const step = { input, url: observation.url, title: observation.title, observationId: observation.observationId, dialogCount: observation.dialogCount, dismissLabels: observation.controls?.filter(control => control.dismiss).map(control => control.label) };
  actions.push(step); copyFileSync(join(dir, `${observation.assetId}.png`), `${root}/${actions.length}.png`);
  console.log(JSON.stringify({ action: input.action, dialogCount: step.dialogCount, dismissLabels: step.dismissLabels })); return observation;
};
const creator = { id: 'instagram:instagram', handle: 'instagram', displayName: 'Instagram', platform: 'instagram', followers: 686000000, region: null, profileUrl: 'https://www.instagram.com/instagram/', raw: { instagram: {} }, evidence: [] };
const spec = { title: 'Instagram公开主页弹窗核验', personaText: '验证官方Instagram公开主页能在关闭可关闭登录提示后继续读取', count: 1, candidateBudget: 1, platforms: ['instagram'], minFollowers: 0, maxFollowers: 1000000000, regions: [], verificationMode: 'browser', criteria: [{ id: 'public_profile', label: '关闭可关闭的登录邀请后，实际可见Instagram官方账号本人主页内容，包括账号名和粉丝信息；只剩登录表单时不能通过', required: true, basis: 'visual' }] };
if (fixture) {
  creator.profileUrl = 'http://127.0.0.1:8088/creator'; creator.handle = 'maker'; creator.displayName = 'Maker'; creator.id = 'instagram:maker';
  spec.title = '可关闭登录提示测试'; spec.personaText = '个人电子电路创作者';
  spec.criteria[0].label = '先关闭可关闭的登录邀请，再实际看到本人公开页面中制作和讲解电子电路的文字；仅登录表单不能通过';
}
const result = { kind: `actual configured model + ${fixture ? 'controlled creator page' : 'actual Instagram'} + production verifier/Broker/runtime; fresh unauthenticated ${remote ? 'headed Docker Chromium' : 'host Chromium'}`, startedAt: new Date().toISOString(), actions };
try {
  const model = new ModelClient(store, settings, fetch, Date.now, randomUUID);
  const assessment = await browserVerifier(model, settings, broker, store)(spec, creator, 'actual-instagram-popup');
  result.judgments = Array.isArray(assessment) ? assessment : assessment.judgments;
  result.assistanceCount = store.list('assistance').length;
  result.modelCalls = store.list('call').map(call => ({ kind: call.kind, durationMs: call.finishedAt - call.createdAt, tools: call.response?.choices?.[0]?.message?.tool_calls?.map(tool => tool.function.name), error: call.error }));
  result.popupObserved = actions.some(action => action.dialogCount > 0);
  result.dismissalActions = actions.filter(action => action.input.action === 'click' || action.input.action === 'key').length;
  result.status = result.assistanceCount === 0 && result.judgments.some(item => item.criterionId === 'public_profile' && item.verdict === 'match') && (!result.popupObserved || result.dismissalActions > 0) && (!fixture || result.popupObserved) && actions.at(-1).dialogCount === 0 ? 'passed' : 'needs_review';
} catch (error) { result.status = error instanceof HumanRequired ? 'actual_login_or_challenge_requires_human' : 'error'; result.error = error.message; }
finally {
  result.finishedAt = new Date().toISOString(); writeFileSync(`${root}/evidence.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: result.status, assistanceCount: result.assistanceCount, judgments: result.judgments, modelCalls: result.modelCalls }));
  await app?.close(); store.close(); await context?.close(); await browser?.close(); rmSync(dir, { recursive: true });
}
if (result.status !== 'passed') process.exitCode = 1;
