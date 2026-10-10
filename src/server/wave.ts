import { createHash } from 'node:crypto';
import type { Store } from './store.ts';
import type { Creator, Evidence, Platform, SearchSpec } from '../shared/research.ts';
import { platforms } from '../shared/research.ts';
import { creatorIdentity } from './canonical.ts';
import { discover, type Discovery } from './discovery.ts';
export type SearchBody = { requestId: string; personaText: string; count: number; platforms: Platform[]; regions: string[]; minFollowers: number; maxFollowers: number; emailReadyRequired: false };
export type SearchResponse = { status: 'queued' | 'running' | 'done' | 'failed'; creators: Record<string, unknown>[]; alsoFound?: Record<string, unknown>[]; summary?: unknown; error?: unknown };
export class WaveError extends Error {
  status: number; retryAfterMs: number;
  constructor(message: string, status: number, retryAfterMs: number) { super(message); this.status = status; this.retryAfterMs = retryAfterMs; }
  retryable() { return this.status === 0 || this.status === 429 || this.status >= 500; }
}
export class WaveClient {
  token: string; store: Store; fetcher: typeof fetch; now: () => number; id: () => string; base: string;
  constructor(token: string, store: Store, fetcher: typeof fetch, now: () => number, id: () => string, base = 'https://wavesurge.ai/api/v1') { this.token = token; this.store = store; this.fetcher = fetcher; this.now = now; this.id = id; this.base = base; }
  async request(path: string, body?: object): Promise<Record<string, unknown>> {
    const record: Record<string, unknown> = { id: this.id(), kind: 'wavesurge', createdAt: this.now(), path, method: body ? 'POST' : 'GET', request: body ?? null };
    this.store.set('wave-call', record.id as string, record);
    try {
      if (!this.token) throw new WaveError('尚未配置 WaveSurge Token', 401, 0);
      const response = await this.fetcher(`${this.base}${path}`, { method: body ? 'POST' : 'GET', redirect: 'error', headers: { Cookie: `kolagent_token=${this.token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000) });
      const raw = await response.text();
      record.status = response.status;
      record.contentType = response.headers.get('Content-Type');
      const scrubbed = raw.replaceAll(this.token, '[REDACTED]');
      record.response = scrubbed;
      if (!response.ok) {
        const retry = Number(response.headers.get('Retry-After'));
        throw new WaveError(`WaveSurge 请求失败（${response.status}）`, response.status, Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 300000) : 60000);
      }
      const result = JSON.parse(scrubbed, (_key: string, value: unknown, context?: { source: string }) => typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value) && context ? context.source : value) as Record<string, unknown>; record.response = result;
      return result;
    } catch (error) {
      const message = (error as Error).message.replaceAll(this.token || '__NO_TOKEN__', '[REDACTED]'); record.error = message;
      if (error instanceof WaveError) throw error;
      throw new WaveError(message, 0, 60000);
    } finally { record.finishedAt = this.now(); this.store.set('wave-call', record.id as string, record); }
  }
  async submit(body: SearchBody) {
    const result = await this.request('/creator-search/requests', body);
    if (typeof result.taskId !== 'string' || !result.taskId) throw new WaveError('WaveSurge 未返回 taskId', 502, 60000);
    return result.taskId;
  }
  async poll(taskId: string): Promise<SearchResponse> {
    const result = await this.request(`/creator-search/requests/${encodeURIComponent(taskId)}`);
    if (!['queued', 'running', 'done', 'failed'].includes(result.status as string)) throw new WaveError('WaveSurge 状态格式不正确', 502, 60000);
    return { ...result, status: result.status as SearchResponse['status'], creators: Array.isArray(result.creators) ? result.creators : [], alsoFound: Array.isArray(result.alsoFound) ? result.alsoFound : [] };
  }
  async pool(platform: Platform) { return this.request(`/discover/db?platform=${platform}&limit=500&sort=fit_desc`); }
  async discover(spec: SearchSpec, state?: Discovery) { return discover(path => this.request(path), spec, state, this.now()); }
}
export function searchBody(spec: SearchSpec, requestId: string): SearchBody { return { requestId, personaText: spec.personaText, count: spec.candidateBudget, platforms: spec.platforms, regions: spec.regions, minFollowers: spec.minFollowers, maxFollowers: spec.maxFollowers, emailReadyRequired: false }; }
function string(value: unknown) { return typeof value === 'string' ? value : ''; }
function hash(value: string) { return createHash('sha256').update(value).digest('hex').slice(0, 24); }
export function profileMetricsEvidence(creator: Creator, capturedAt: number): Evidence | undefined {
  const fields: Record<string, unknown> = {};
  if (typeof creator.raw.followerCount === 'number' && Number.isFinite(creator.raw.followerCount) && creator.raw.followerCount === creator.followers) fields.followerCount = creator.followers;
  if (typeof creator.raw.region === 'string' && creator.raw.region && creator.raw.region === creator.region) fields.region = creator.region;
  if (!Object.keys(fields).length || !/^https?:\/\//.test(creator.profileUrl)) return;
  const text = JSON.stringify(fields);
  return { id: hash(`${creator.id}|metrics|${text}`), url: creator.profileUrl, text, kind: 'profile_metrics', provider: 'wavesurge-fields', capturedAt, publishedAt: null };
}
export function normalizeCreator(raw: Record<string, unknown>, capturedAt: number): Creator {
  const platform = string(raw.platform).toLowerCase() as Platform;
  if (!platforms.includes(platform)) throw new Error('不支持的创作者平台');
  const original = string(raw.handle).replace(/^@/, ''); const channel = platform === 'youtube' && /^UC[A-Za-z0-9_-]{22}$/.test(original);
  const handle = channel ? original : original.toLowerCase();
  const generated = /^[\p{L}\p{N}_.-]+$/u.test(handle) ? ({ instagram: `https://www.instagram.com/${encodeURIComponent(handle)}/`, tiktok: `https://www.tiktok.com/@${encodeURIComponent(handle)}`, twitter: `https://x.com/${encodeURIComponent(handle)}`, youtube: `https://www.youtube.com/${channel ? 'channel/' : '@'}${encodeURIComponent(handle)}` })[platform] : '';
  const profileUrl = /^https?:\/\//.test(string(raw.profileUrl)) ? string(raw.profileUrl) : generated;
  if (!handle && !profileUrl) throw new Error('创作者缺少稳定身份');
  const id = creatorIdentity({ platform, handle, profileUrl });
  const evidence: Evidence[] = [];
  if (Array.isArray(raw.evidence)) for (const item of raw.evidence) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Record<string, unknown>; const url = string(source.url);
    if (!/^https?:\/\//.test(url)) continue;
    evidence.push({ id: hash(`${id}|${url}|${string(source.text)}`), url, text: string(source.text), kind: string(source.kind), provider: string(source.provider), publishedAt: string(source.publishedAt) || null, capturedAt });
  }
  if (string(raw.bio)) evidence.push({ id: hash(`${id}|bio|${raw.bio}`), url: profileUrl, text: string(raw.bio), kind: 'profile', provider: 'wavesurge-pool', publishedAt: null, capturedAt });
  const creator: Creator = { id, platform, handle, profileUrl, displayName: string(raw.displayName) || handle, followers: typeof raw.followerCount === 'number' && Number.isFinite(raw.followerCount) ? raw.followerCount : null, region: string(raw.region) || null, evidence, raw };
  const metrics = profileMetricsEvidence(creator, capturedAt); if (metrics) evidence.push(metrics);
  return creator;
}
