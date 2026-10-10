#!/usr/bin/env node
/* Public-page verification. Does not read .env or forward WaveSurge credentials. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const proofRoot = path.join(root, 'validation/2026-10-09');
const output = path.join(root, 'output/playwright/wavesurge-public-2026-10-09');
const playwrightModule = process.env.WAVESURGE_CHECK_PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwrightModule);

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(proofRoot, `${name}.json`), 'utf8')).response;
}

function makeTargets() {
  const direct = read('direct-search-example-refresh-01');
  const targets = [];
  direct.creators.slice(0, 2).forEach((c, i) => {
    targets.push({ id: `instagram-profile-${i + 1}`, platform: 'instagram', kind: 'profile', handle: c.handle, url: c.profileUrl, urlSource: 'WaveSurge profileUrl' });
    const post = c.evidence.find(e => /instagram\.com\/(?:p|reel)\//.test(e.url));
    if (post) targets.push({ id: `instagram-post-${i + 1}`, platform: 'instagram', kind: 'post', handle: c.handle, url: post.url, urlSource: 'WaveSurge evidence[].url' });
  });
  read('discover-twitter').creators.slice(0, 2).forEach((c, i) => {
    targets.push({ id: `x-profile-${i + 1}`, platform: 'twitter', kind: 'profile', handle: c.handle, url: `https://x.com/${encodeURIComponent(c.handle.replace(/^@/, ''))}`, urlSource: 'Constructed from WaveSurge platform + handle; not a returned profileUrl' });
  });
  const tt = read('discover-tiktok').creators[0];
  targets.push({ id: 'tiktok-profile-1', platform: 'tiktok', kind: 'profile', handle: tt.handle, url: `https://www.tiktok.com/@${encodeURIComponent(tt.handle.replace(/^@/, ''))}`, urlSource: 'Constructed from WaveSurge platform + handle; not a returned profileUrl' });
  const yt = read('discover-youtube').creators[0];
  targets.push({ id: 'youtube-profile-1', platform: 'youtube', kind: 'profile', handle: yt.handle, url: `https://www.youtube.com/channel/${encodeURIComponent(yt.handle)}`, urlSource: 'Constructed from WaveSurge platform + UC channel ID; not a returned profileUrl' });
  return targets;
}

function safeNetworkUrl(raw) {
  try { const u = new URL(raw); return u.origin + u.pathname; } catch { return String(raw).slice(0, 200); }
}

async function inspect(page, target) {
  return page.evaluate(({ platform, kind }) => {
    const visible = el => {
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return b.width > 0 && b.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const text = (document.body?.innerText || '').trim();
    const links = [...document.querySelectorAll('a[href]')].filter(visible).map(a => ({ text: (a.innerText || a.getAttribute('aria-label') || '').slice(0, 180), url: a.href }));
    const isPost = url => platform === 'instagram' ? /^\/(?:[^/]+\/)?(?:p|reel)\/[A-Za-z0-9_-]+\/?$/.test(new URL(url).pathname) : platform === 'twitter' ? /\/status\/\d+/.test(url) : platform === 'tiktok' ? /\/video\/\d+/.test(url) : /youtube\.com\/(watch\?|shorts\/)/.test(url);
    const imgs = [...document.images].filter(visible).map(i => ({ alt: i.alt, src: i.currentSrc || i.src, naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight, loaded: i.complete && i.naturalWidth > 0 }));
    const videos = [...document.querySelectorAll('video')].filter(visible).map(v => ({ src: v.currentSrc || v.src, readyState: v.readyState, videoWidth: v.videoWidth, videoHeight: v.videoHeight, poster: v.poster, paused: v.paused }));
    const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(visible).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean);
    const meta = {};
    for (const name of ['og:title', 'og:description', 'og:image', 'og:url', 'description']) {
      const el = document.querySelector(`meta[property="${name}"],meta[name="${name}"]`);
      if (el) meta[name] = el.getAttribute('content');
    }
    return { title: document.title, finalUrl: location.href, visibleText: text.slice(0, 16000), visibleTextLength: text.length, headings: [...document.querySelectorAll('h1,h2')].filter(visible).map(h => h.innerText).slice(0, 15), buttons: buttons.slice(0, 35), postLinks: links.filter(l => isPost(l.url)).slice(0, 12), profileLinks: links.filter(l => !isPost(l.url)).slice(0, 12), images: imgs.slice(0, 25), visibleImageCount: imgs.length, loadedVisibleImageCount: imgs.filter(i => i.loaded).length, videos: videos.slice(0, 8), metadata: meta, readOnlyInspection: true };
  }, target);
}

async function check(browser, target) {
  const atUtc = new Date().toISOString();
  const started = Date.now();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const failedRequests = [], httpErrors = [], pageErrors = [];
  page.on('requestfailed', req => { if (failedRequests.length < 25) failedRequests.push({ url: safeNetworkUrl(req.url()), type: req.resourceType(), error: req.failure()?.errorText }); });
  page.on('response', res => { if (res.status() >= 400 && httpErrors.length < 25) httpErrors.push({ url: safeNetworkUrl(res.url()), type: res.request().resourceType(), status: res.status() }); });
  page.on('pageerror', err => { if (pageErrors.length < 8) pageErrors.push(err.message.slice(0, 300)); });
  const result = { ...target, atUtc, authenticated: false, initialCookies: (await context.cookies()).length, forwardedWaveSurgeCredentials: false };
  try {
    const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    result.navigationHttpStatus = response?.status() ?? null;
  } catch (error) { result.navigationError = { name: error.name, message: error.message.slice(0, 500) }; }
  try {
    result.initial = await inspect(page, target);
    // Allow the SPA to render; do not solve challenges, click consent, or log in.
    await page.waitForTimeout(10000);
    result.afterRender = await inspect(page, target);
    await page.screenshot({ path: path.join(output, `${target.id}.png`), fullPage: false, timeout: 10000 });
    result.screenshot = path.join(output, `${target.id}.png`);
  } catch (error) { result.inspectionError = { name: error.name, message: error.message.slice(0, 500) }; }
  result.networkFailures = failedRequests;
  result.httpErrors = httpErrors;
  result.pageErrors = pageErrors;
  result.elapsedSeconds = (Date.now() - started) / 1000;
  fs.writeFileSync(path.join(output, `${target.id}.json`), JSON.stringify(result, null, 2) + '\n');
  const a = result.afterRender || result.initial || {};
  console.log(JSON.stringify({ target: target.id, http: result.navigationHttpStatus, finalUrl: a.finalUrl, title: a.title, textPreview: a.visibleText?.slice(0, 650), loadedImages: a.loadedVisibleImageCount, postLinks: a.postLinks?.length, videos: a.videos?.length, navigationError: result.navigationError?.message, elapsedSeconds: result.elapsedSeconds }));
  await context.close();
  return result;
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  let targets = makeTargets();
  if (process.argv[2]) targets = targets.filter(t => t.id === process.argv[2]);
  const suffix = process.argv[2] ? `-${process.argv[2]}` : '';
  fs.writeFileSync(path.join(output, `targets${suffix}.json`), JSON.stringify(targets, null, 2) + '\n');
  const launchOptions = { headless: true };
  if (process.env.WAVESURGE_CHECK_CHROMIUM_PATH) launchOptions.executablePath = process.env.WAVESURGE_CHECK_CHROMIUM_PATH;
  const browser = await chromium.launch(launchOptions);
  const conditions = { startedAtUtc: new Date().toISOString(), browserVersion: browser.version(), playwrightVersion: require(path.join(playwrightModule, 'package.json')).version, headless: true, freshAnonymousContextPerUrl: true, viewport: '1440x1000', locale: 'en-US', renderedWaitMs: 10000, concurrency: 2, credentialsSent: false, userAgent: null, scope: 'This host and network only; not a guarantee for production deployment.' };
  const probe = await browser.newPage();
  conditions.userAgent = await probe.evaluate(() => navigator.userAgent);
  await probe.close();
  const results = [];
  let next = 0;
  try {
    await Promise.all([0, 1].map(async () => {
      while (next < targets.length) {
        const index = next++;
        results[index] = await check(browser, targets[index]);
      }
    }));
    fs.writeFileSync(path.join(output, `results${suffix}.json`), JSON.stringify({ conditions, finishedAtUtc: new Date().toISOString(), results }, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
