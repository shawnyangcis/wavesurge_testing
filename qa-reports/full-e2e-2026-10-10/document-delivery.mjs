import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const root = '.gstack/qa-reports/full-e2e-2026-10-10';
const base = 'http://127.0.0.1:3000';
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByLabel('管理员密码').fill(password);
  await page.getByRole('button', { name: /进入工作室/ }).click();
  await page.getByLabel('研究对话').waitFor();
  const state = await (await page.request.get(base + '/api/state')).json();
  const task = state.tasks.find(t => t.id === 'research-a333d174361fcf1bed6c0698') ?? state.tasks.find(t => ['completed', 'partial'].includes(t.status) && t.matched > 0);
  if (!task) throw new Error('No finished task with matches available for the report UI check');
  const chatLinks = await page.locator('.messages a').evaluateAll(links => links.map(a => ({ text: a.textContent, href: a.getAttribute('href') })));
  const matchingMessages = state.messages.filter(m => m.text.includes(task.id));
  const chatDocumentComponents = await page.locator('.messages [download], .messages iframe, .messages object, .messages embed').count();
  await page.screenshot({ path: root + '/screenshots/document-chat-before.png', fullPage: true });
  const cards = page.locator('aside article.task');
  const taskIndex = state.tasks.findIndex(t => t.id === task.id);
  const card = cards.nth(taskIndex);
  await card.scrollIntoViewIfNeeded();
  const taskCard = await card.innerText();
  await card.getByRole('button', { name: '查看结果', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '研究结果' });
  await dialog.waitFor();
  await page.waitForFunction(() => document.querySelector('[aria-label="研究结果"] .finding'));
  const reportHref = await dialog.getByRole('link', { name: '查看报告', exact: true }).getAttribute('href');
  const csvHref = await dialog.getByRole('link', { name: '下载 CSV', exact: true }).getAttribute('href');
  const resultCount = await dialog.locator('article.finding').count();
  await dialog.screenshot({ path: root + '/screenshots/document-results-entry.png' });
  const popupPromise = page.waitForEvent('popup');
  await dialog.getByRole('link', { name: '查看报告', exact: true }).click();
  const reportPage = await popupPromise;
  await reportPage.waitForLoadState('domcontentloaded');
  const reportText = await reportPage.locator('body').innerText();
  const reportLinks = await reportPage.locator('a').evaluateAll(links => links.map(a => ({ text: a.textContent, href: a.getAttribute('href') })));
  await reportPage.screenshot({ path: root + '/screenshots/document-report-manual.png', fullPage: true });
  const csvResponse = await page.request.get(base + csvHref);
  const csv = await csvResponse.text();
  const proof = {
    observedAt: new Date().toISOString(), source: 'actual primary-deployment browser UI; existing genuine finished task; no candidates or results injected',
    task: { id: task.id, title: task.title, status: task.status, requested: task.requested, evaluated: task.evaluated, matched: task.matched },
    taskCard, chatLinks, chatDocumentComponents,
    taskReferencesInMessages: matchingMessages.map(m => ({ id: m.id, role: m.role, createdAt: m.createdAt, text: m.text.replaceAll(password, '[REDACTED]') })),
    resultCount, reportHref, csvHref, reportUrl: reportPage.url(), reportText, reportLinks,
    csv: { status: csvResponse.status(), contentType: csvResponse.headers()['content-type'], header: csv.split('\n')[0] }, errors,
    limitation: 'This checks the UI and report for a historical finished task. The absence of asynchronous completion publication is established separately by the worker/agent wiring; this is not a new live-search completion test.'
  };
  writeFileSync(root + '/document-delivery.json', JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ task: proof.task, chatReportLinks: chatLinks.filter(l => /\/api\/(reports|campaigns)/.test(l.href ?? '')), chatDocumentComponents, taskMessageReferences: proof.taskReferencesInMessages.length, resultCount, reportHref, csv: proof.csv, reportContainsJudgments: /逐|符合|理由|判断/.test(reportText), errors }, null, 2));
} finally { await browser.close(); }
