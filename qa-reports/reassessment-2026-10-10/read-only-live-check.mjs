import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const base = 'http://127.0.0.1:3000';
const password = execFileSync('docker', ['compose', 'exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt'], { encoding: 'utf8' }).trim();
const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ password }) });
if (!login.ok) throw Error(`login ${login.status}`);
const cookie = login.headers.get('set-cookie').split(';')[0];
writeFileSync('/tmp/wavesurge-review-reassessment-storage.json', JSON.stringify({ cookies: [{ name: 'studio', value: cookie.slice('studio='.length), domain: '127.0.0.1', path: '/', expires: Date.now()/1000 + 600, httpOnly: true, secure: false, sameSite: 'Strict' }], origins: [] }), { mode: 0o600 });
const get = async path => { const r = await fetch(`${base}${path}`, { headers: { Cookie: cookie } }); if (!r.ok) throw Error(`${path} ${r.status}`); return r; };
const dir = '.gstack/qa-reports/reassessment-2026-10-10';
const taskId = 'research-58949888b306ad726d60be23';
const state = await (await get('/api/state')).json();
const all = await (await get(`/api/results?taskId=${taskId}`)).json();
const filtered = await (await get(`/api/results?taskId=${taskId}&verdict=match`)).json();
const csv = await (await get(`/api/reports/${taskId}?format=csv`)).text();
const html = await (await get(`/api/reports/${taskId}`)).text();
const debug = await (await get('/api/debug')).json();
const researchId = 'research-d22f5bc3f9c80da1a4979ca5';
const search = state.tasks.find(t => t.id === researchId);
const latestRemote = debug.waveCalls.filter(c => c.method === 'GET' && c.path.endsWith('/b5722567-4ae0-435a-b6e9-0c5873d6486e')).at(-1);
const result = {
  capturedAt: new Date().toISOString(), taskId,
  taskTitle: state.tasks.find(t => t.id === taskId)?.title,
  F05: { allResults: all.length, filteredResults: filtered.length, csvRecords: csv.trim().split(/\r?\n/).length - 1, csvContainsUnknown: csv.includes('"unknown"') },
  F06: { evidenceWithAsset: all.flatMap(r => r.creator.evidence).filter(e => e.assetId).length, htmlContainsSnapshot: html.includes('/api/assets/') || html.includes('data:image/'), htmlImages: (html.match(/<img\b/g) ?? []).length, csvContainsEvidenceMapping: csv.includes('""capturedAt""') },
  F09: { assistantMessagesWithTables: state.messages.filter(m => m.role === 'assistant' && /\|\s*:?-{3,}/.test(m.text)).length },
  newSearch: search, latestRemote: latestRemote ? { createdAt: latestRemote.createdAt, status: latestRemote.status, remoteStatus: latestRemote.response?.status, expectedDurationHours: latestRemote.response?.expectedDurationHours } : null,
};
writeFileSync(`${dir}/live-read-only.json`, JSON.stringify(result, null, 2));
writeFileSync(`${dir}/existing-results.csv`, csv);
writeFileSync(`${dir}/existing-report.html`, html);
console.log(JSON.stringify(result, null, 2));
