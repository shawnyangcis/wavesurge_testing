import type { Creator, SearchSpec } from '../shared/research.ts';
import { normalizeCreator } from './wave.ts';
import { instagramCreator, searchInstagram, list, text, type Raw, type Read } from './instagram.ts';
import { countryCode } from './canonical.ts';
type QueryQueue = { pending: Raw[]; cursor: string; page: number; seen: string[]; done: boolean };
export type Discovery = { platform: number; keyword: number; page: number; cursor: string; seenCursors: string[]; seenUsers: string[]; pending: Raw[]; delivered: number; done: boolean; profileReads?: number; baseExcluded?: number; profileLimit?: number; queues?: QueryQueue[]; sources?: { platform: string; path: string; read: number; excluded: number }[] };
export const initialDiscovery = (): Discovery => ({ platform: 0, keyword: 0, page: 0, cursor: '', seenCursors: [], seenUsers: [], pending: [], delivered: 0, done: false });
export async function discover(read: Read, spec: SearchSpec, previous: Discovery | undefined, now: number) {
 const state = structuredClone(previous ?? initialDiscovery()); const creators: Creator[] = [];
 if (state.done) return { state, creators };
 const platform = spec.platforms[state.platform];
 if (platform === 'instagram') {
  const queries = spec.instagram?.queries ?? [spec.personaText]; const version = spec.instagram?.version ?? 'v3';
  const handles = spec.instagram?.handles;
  const accept = (followers: number | null) => followers === null || followers >= spec.minFollowers && followers <= spec.maxFollowers;
  const candidate = async (user: Raw) => {
   const creator = await instagramCreator(read, user, now, handles?.length ? undefined : accept);
   state.profileReads = (state.profileReads ?? 0) + 1;
   if (!handles?.length && !accept(creator.followers)) state.baseExcluded = (state.baseExcluded ?? 0) + 1;
   else { creators.push(creator); state.delivered++; }
  };
  state.profileLimit = handles?.length ?? spec.instagram?.profileBudget ?? Math.min(500, Math.max(20, spec.candidateBudget * 5));
  if (!handles?.length && (state.profileReads ?? 0) >= state.profileLimit) { state.platform++; state.keyword = 0; state.done = state.platform >= spec.platforms.length; return { state, creators }; }
  if (handles?.length) {
   await candidate({ username: handles[state.keyword++] });
   if (state.keyword >= handles.length) { state.platform++; state.keyword = 0; }
  } else if (queries.length > 1) {
   state.queues ??= queries.map((_query, index) => ({ pending: index === 0 ? state.pending : [], cursor: '', page: 0, seen: [], done: false })); state.pending = [];
   const queue = state.queues[state.keyword];
   if (queue.pending.length) await candidate(queue.pending.shift()!);
   else if (!queue.done) {
    const result = await searchInstagram(read, version, queries[state.keyword], queue.cursor);
    for (const user of result.users) { const username = text(user.username); if (username && !state.seenUsers.includes(username.toLowerCase())) { state.seenUsers.push(username.toLowerCase()); queue.pending.push(user); } }
    queue.page++;
    if (result.cursor && !queue.seen.includes(result.cursor) && queue.page < 3) { queue.cursor = result.cursor; queue.seen.push(result.cursor); } else queue.done = true;
   }
   state.keyword = (state.keyword + 1) % queries.length;
   if (state.queues.every(item => item.done && !item.pending.length)) { state.platform++; state.keyword = 0; state.queues = undefined; }
  } else if (state.pending.length) {
   await candidate(state.pending.shift()!);
  } else {
   const result = await searchInstagram(read, version, queries[state.keyword], state.cursor);
   for (const user of result.users) { const username = text(user.username); if (username && !state.seenUsers.includes(username.toLowerCase())) { state.seenUsers.push(username.toLowerCase()); state.pending.push(user); } }
   state.page++;
   if (result.cursor && !state.seenCursors.includes(result.cursor) && state.page < 3) { state.cursor = result.cursor; state.seenCursors.push(result.cursor); }
   else { state.keyword++; state.page = 0; state.cursor = ''; state.seenCursors = []; }
  }
  if (!handles?.length && queries.length === 1 && !state.pending.length && state.keyword >= queries.length) { state.platform++; state.keyword = 0; }
  if (!handles?.length && platform === spec.platforms[state.platform] && (state.profileReads ?? 0) >= state.profileLimit) { state.platform++; state.keyword = 0; }
 } else {
  const path = `/discover/db?platform=${platform}&limit=500&sort=fit_desc`; const raw = await read(path); let excluded = 0;
  for (const user of list(raw.creators)) { try {
   const creator = normalizeCreator(user, now); const country = creator.region && (creator.raw.factorGrades as { location?: string } | undefined)?.location === 'confirmed_country' ? countryCode(creator.region) : undefined;
   if (creator.platform !== platform || creator.followers !== null && (creator.followers < spec.minFollowers || creator.followers > spec.maxFollowers) || country && spec.regions.length && !spec.regions.map(countryCode).includes(country)) { excluded++; continue; }
   creators.push(creator);
  } catch { excluded++; } }
  state.sources ??= []; state.sources.push({ platform, path, read: list(raw.creators).length, excluded });
  state.platform++; state.delivered += creators.length;
 }
 state.done = state.platform >= spec.platforms.length || state.delivered >= spec.candidateBudget;
 return { state, creators };
}
