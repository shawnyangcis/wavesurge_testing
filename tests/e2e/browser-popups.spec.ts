import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { DesktopRuntime } from '../../src/desktop/runtime.ts';
import { BrowserPolicy } from '../../src/desktop/policy.ts';
import { desktopServer } from '../../src/desktop/server.ts';
import { DesktopBroker, HumanRequired } from '../../src/server/desktop.ts';
import { browserVerifier } from '../../src/server/browser-verifier.ts';
import { Store } from '../../src/server/store.ts';
import { SettingsManager } from '../../src/server/settings.ts';
import { ModelClient } from '../../src/server/model.ts';
import type { Model, ChatMessage } from '../../src/server/model.ts';
import type { Creator, SearchSpec } from '../../src/shared/research.ts';
import { validatePairs } from '../../src/server/context.ts';

let origin: string;
const source = (kind: string) => `<!doctype html><meta charset="utf-8"><title>Public maker profile</title>
<style>body{font:22px sans-serif;padding:40px}#profile{display:none}[role=dialog]{position:fixed;inset:0;background:white;padding:60px}button,[role=button]{font:24px sans-serif;padding:18px;cursor:pointer}</style>
<main id="profile"><h1>Public maker profile</h1><p>I build and explain electronic circuits. This is my personal creator page.</p></main>
${kind === 'wall' ? '<h1>Log in required</h1><form><input aria-label="Username"><input type="password" aria-label="Password"><button type="submit">Log in</button></form>' : kind === 'challenge' ? '<h1>Verify you are human</h1><button type="button" id="verify">I am human</button>' : `<section role="dialog" aria-modal="true"><h2>Log in to see more</h2><form onsubmit="window.submitted=true;return false"><input aria-label="Username"><input type="password" aria-label="Password">${kind === 'escape' ? '' : kind === 'stuck' ? '<button type="button" id="close">Close</button>' : kind === 'chinese' ? '<button type="button" id="close">关闭</button>' : kind === 'later' ? '<button type="button" id="close">Not now</button>' : '<button type="button" id="close"><svg aria-label="Close" width="24" height="24"><path d="M2 2L22 22M22 2L2 22" stroke="black" stroke-width="3"/></svg></button>'}<button type="submit" id="login">Log in</button><button type="submit" id="submit-close">Close</button><button type="button" id="danger">Close account</button><button style="display:none" type="button">Close</button></form></section>`}
<script>const show=()=>{document.querySelector('[role=dialog]')?.remove();document.querySelector('#profile').style.display='block'};const kind=${JSON.stringify(kind)};if(kind!=='stuck')document.querySelector('#close')?.addEventListener('click',show);if(kind==='escape')document.addEventListener('keydown',e=>{if(e.key==='Escape')show()});document.querySelector('#verify')?.addEventListener('click',()=>{window.challengeClicked=true});</script>`;
const fixture = createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(source(new URL(req.url!, 'http://fixture').pathname.slice(1))); });
test.beforeAll(async () => { await new Promise<void>(resolve => fixture.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${(fixture.address() as AddressInfo).port}`; });
test.afterAll(async () => { await new Promise<void>(resolve => fixture.close(() => resolve())); });

for (const kind of ['svg', 'chinese', 'later']) test(`实际DOM关闭${kind}登录邀请，继续读取且不提交登录表单`, async ({ context, page }) => {
  const runtime = new DesktopRuntime(context, Date.now, randomUUID, () => {}, new BrowserPolicy([origin]));
  const observation = await runtime.command({ action: 'navigate', url: `${origin}/${kind}` });
  const dismiss = observation.controls!.filter(control => control.dismiss);
  expect(dismiss).toHaveLength(1);
  expect(observation.controls!.some(control => control.label === 'Close account' && control.dismiss)).toBe(false);
  const next = await runtime.command({ action: 'click', selector: dismiss[0].selector, observationId: observation.observationId });
  expect(next.text).toContain('I build and explain electronic circuits');
  expect(next.dialogCount).toBe(0);
  expect(await page.evaluate(() => (window as any).submitted)).toBeUndefined();
  await expect(runtime.command({ action: 'click', selector: dismiss[0].selector, observationId: observation.observationId })).rejects.toThrow('STALE');
});

test('关闭名的提交按钮和删除账号按钮仍被拒绝', async ({ context }) => {
  const runtime = new DesktopRuntime(context, Date.now, randomUUID, () => {}, new BrowserPolicy([origin]));
  const observation = await runtime.command({ action: 'navigate', url: `${origin}/svg` });
  await expect(runtime.command({ action: 'click', selector: '#submit-close', observationId: observation.observationId })).rejects.toThrow('FORM');
  await expect(runtime.command({ action: 'click', selector: '#danger', observationId: observation.observationId })).rejects.toThrow('POLICY');
});

test('实际DOM中关联外部登录表单的Close按钮不提交', async ({ context, page }) => {
  const runtime = new DesktopRuntime(context, Date.now, randomUUID, () => {}, new BrowserPolicy([origin]));
  await page.setContent('<form id="login" onsubmit="window.submitted=true;return false"><input type="password"></form><button id="external" form="login">Close</button>');
  const observation = await runtime.command({ action: 'observe' });
  expect(observation.controls!.find(control => control.label === 'Close')).toMatchObject({ inForm: true, dismiss: false });
  await expect(runtime.command({ action: 'click', selector: '#external', observationId: observation.observationId })).rejects.toThrow('FORM');
  expect(await page.evaluate(() => (window as any).submitted)).toBeUndefined();
});

async function harness(context: any) {
  const dir = mkdtempSync(join(tmpdir(), 'studio-popups-')); const store = new Store(':memory:');
  const runtime = new DesktopRuntime(context, Date.now, randomUUID, () => {}, new BrowserPolicy([origin]));
  const app = desktopServer(runtime, 'controlled-test-only');
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  const broker = new DesktopBroker(store, address, 'controlled-test-only', dir, fetch, Date.now);
  const settings = new SettingsManager(store, process.env);
  return { store, broker, settings, runtime, async close() { await app.close(); store.close(); rmSync(dir, { recursive: true }); } };
}
const call = (name: string, args: object): ChatMessage => ({ role: 'assistant', content: null, tool_calls: [{ id: randomUUID(), type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
const spec: SearchSpec = { title: 'Public maker', personaText: 'Personal electronics maker', count: 1, candidateBudget: 1, minFollowers: 0, maxFollowers: 100000, regions: [], platforms: ['instagram'], verificationMode: 'browser', criteria: [{ id: 'maker', label: '本人公开内容明确描述制作电子电路', basis: 'text', required: true }] };
const person = (kind: string): Creator => ({ id: 'instagram:maker', handle: 'maker', displayName: 'Maker', platform: 'instagram', followers: 20000, region: null, profileUrl: `${origin}/${kind}`, raw: { instagram: {} }, evidence: [] });

test('实际浏览器+Broker+Agent在过早人工请求时自行关闭或Escape后交付', async ({ context, page }) => {
  for (const kind of ['svg', 'escape']) {
    const h = await harness(context); const creator = person(kind);
    try {
      const model: Model = { async complete() {
        const proof = creator.evidence.find(item => item.text.includes('I build and explain electronic circuits'));
        return proof ? call('submit_judgments', { judgments: [{ criterionId: 'maker', verdict: 'match', reason: '本人页面实际文字', evidenceIds: [proof.id] }] }) : call('request_human_assistance', { reason: 'Login invitation blocks the content' });
      } };
      const judgments: any = await browserVerifier(model, h.settings, h.broker, h.store)(spec, creator, `self-${kind}`);
      expect(judgments[0].verdict).toBe('match');
      expect(h.store.list('assistance')).toHaveLength(0);
      expect(h.store.list('message')).toHaveLength(0);
      expect(await page.locator('#profile').isVisible()).toBe(true);
      validatePairs(h.store.get<any>('verification', `self-${kind}|${creator.id}`).messages);
    } finally { await h.close(); }
  }
});

test('真正的登录墙与验证码仍转同一VNC；禁止协助时保留unknown', async ({ context, page }) => {
  for (const kind of ['wall', 'challenge', 'stuck']) {
    const h = await harness(context); const creator = person(kind);
    try {
      const model: Model = { async complete() { return call('request_human_assistance', { reason: 'No public content after safe dismissal attempts; human login or verification is still required' }); } };
      await expect(browserVerifier(model, h.settings, h.broker, h.store)(spec, creator, `blocked-${kind}`)).rejects.toBeInstanceOf(HumanRequired);
      expect(h.store.list('assistance')).toHaveLength(1);
      expect(h.store.list('message')).toHaveLength(1);
      expect(await page.evaluate(() => (window as any).submitted || (window as any).challengeClicked)).toBeUndefined();
      expect(h.runtime.blocked).toBe(true);
    } finally { await h.close(); }
  }
  const h = await harness(context); const creator = person('wall');
  try {
    const model: Model = { async complete() { return call('submit_judgments', { judgments: [{ criterionId: 'maker', verdict: 'unknown', reason: '公开页面被登录墙阻塞', evidenceIds: [] }] }); } };
    const result: any = await browserVerifier(model, h.settings, h.broker, h.store)({ ...spec, allowHumanAssistance: false }, creator, 'no-human');
    expect(result[0].verdict).toBe('unknown'); expect(h.store.list('assistance')).toHaveLength(0);
  } finally { await h.close(); }
});

if (process.env.RUN_REAL_MODEL === '1') test('真实配置模型自主关闭登录邀请，核验原候选且不申请人工', async ({ context }) => {
  test.setTimeout(180000); process.loadEnvFile('.env');
  const h = await harness(context); const creator = person('svg');
  try {
    const model = new ModelClient(h.store, h.settings, fetch, Date.now, randomUUID);
    const result: any = await browserVerifier(model, h.settings, h.broker, h.store)(spec, creator, 'real-model-popup');
    expect(result[0].verdict).toBe('match');
    expect(h.store.list('assistance')).toHaveLength(0);
    expect(h.store.list<any>('call').some(item => item.response?.choices?.[0]?.message?.tool_calls?.some((call: any) => call.function.name === 'browser'))).toBe(true);
  } finally { await h.close(); }
});
