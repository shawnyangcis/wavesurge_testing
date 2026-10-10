import { createHash } from 'node:crypto';
import type { Creator, Evidence } from '../shared/research.ts';
import { normalizeCreator, WaveError } from './wave.ts';
export type Raw = Record<string, unknown>;
export type Read = (path: string) => Promise<Raw>;
export const object = (value: unknown): Raw => value && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {};
export const text = (value: unknown) => typeof value === 'string' ? value : '';
export const list = (value: unknown): Raw[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
export function query(path: string, params: Record<string, string>) { return `${path}?${new URLSearchParams(params)}`; }
export async function searchInstagram(read: Read, version: 'v1' | 'v2' | 'v3', keyword: string, cursor?: string) {
 const paths = { v1: '/instagram/v1/fetch_search', v2: '/instagram/v2/search_users', v3: '/instagram/v3/search_users' };
 const params: Record<string, string> = version === 'v2' ? { keyword } : { query: keyword };
 if (version === 'v1') params.select = 'users';
 if (version === 'v3' && cursor) params.rank_token = cursor;
 const raw = await read(query(paths[version], params)); const data = object(raw.data);
 const users = version === 'v1' ? list(data.users).map(item => object(item.user)) : version === 'v2' ? list(object(data.data).items) : list(data.users);
 return { raw, users, cursor: version === 'v3' ? text(data.rank_token) : '' };
}
function count(value: unknown): number | null { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null; }
export function postData(raw: Raw, detail: boolean) {
 const metrics = detail ? object(raw.metrics) : raw;
 const images = (item: Raw) => list(detail ? object(item.image_versions).items : object(item.image_versions2).candidates);
 const media = raw.media_type === 8 ? list(raw.carousel_media) : [raw];
 const photos: string[] = []; const covers: string[] = [];
 for (const item of media) {
  const url = text(images(item).sort((a, b) => Number(b.width) - Number(a.width))[0]?.url) || text(item.thumbnail_url);
  if (!/^https?:\/\//.test(url)) continue;
  if (item.media_type === 1) photos.push(url); else if (item.media_type === 2) covers.push(url);
 }
 return { id: text(raw.id) || text(raw.pk), code: text(raw.code), caption: text(object(raw.caption).text), takenAt: count(raw.taken_at), likes: count(metrics.like_count), comments: count(metrics.comment_count), photos, videoCovers: covers, raw };
}
export async function instagramCreator(read: Read, user: Raw, now: number, acceptProfile?: (followers: number | null) => boolean): Promise<Creator> {
 const username = text(user.username); const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
 const errors: string[] = []; const responses: Raw[] = []; const posts = new Map<string, ReturnType<typeof postData>>();
 const safe = async (path: string) => { try { const raw = await read(path); responses.push({ path, raw }); return raw; } catch (error) { if (error instanceof WaveError && [401, 402].includes(error.status)) throw error; errors.push(`${path}: ${(error as Error).message}`); return {}; } };
 let profile = object((await safe(query('/instagram/v1/fetch_user_info_by_username_v2', { username }))).data);
 if (text(profile.username) && text(profile.username).toLowerCase() !== username.toLowerCase()) { errors.push('账号详情返回了不同 username，不能作为当前候选证据'); profile = {}; }
 const followers = count(object(profile.edge_followed_by).count);
 const userId = text(profile.id); let cursor = ''; const seenCursors = new Set<string>();
 if (userId && profile.is_private !== true && (!acceptProfile || acceptProfile(followers))) for (let page = 0; page < 2; page++) {
  const params: Record<string, string> = { user_id: userId, count: '12' }; if (cursor) params.max_id = cursor;
  const data = object((await safe(query('/instagram/v1/fetch_user_posts', params))).data);
  for (const item of list(data.items)) { const post = postData(item, false); if (post.id && !posts.has(post.id)) posts.set(post.id, post); }
  cursor = text(data.next_max_id); if (data.more_available !== true || !cursor || seenCursors.has(cursor)) break; seenCursors.add(cursor);
 }
 for (const post of [...posts.values()].filter(post => post.code).slice(0, 2)) {
  const detail = object(object((await safe(query('/instagram/v2/fetch_post_info', { code_or_url: post.code }))).data).data);
  // Detail counts/media are authoritative for that post; absent values stay unknown.
  const owner = object(detail.user);
  if (text(owner.username) && text(owner.username).toLowerCase() !== username.toLowerCase() || text(owner.id) && text(owner.id) !== userId || text(detail.code) && text(detail.code) !== post.code) { errors.push(`帖子 ${post.code} 详情身份不一致，保留列表来源`); continue; }
  if (Object.keys(detail).length) posts.set(post.id, { ...postData(detail, true), id: post.id, code: post.code });
 }
 const sample = [...posts.values()];
 const engagement = followers !== null && followers > 0 && sample.length > 0 && sample.every(post => post.likes !== null && post.comments !== null) ? sample.reduce((sum, post) => sum + post.likes! + post.comments!, 0) / sample.length / followers : null;
 const evidence: Evidence[] = []; const add = (url: string, kind: string, value: string, publishedAt: string | null = null) => evidence.push({ id: createHash('sha256').update(`${username}|${url}|${kind}|${value}`).digest('hex').slice(0, 24), url, kind, text: value, provider: 'wavesurge-instagram-raw', publishedAt, capturedAt: now });
 add(profileUrl, 'profile', `${text(profile.biography)}\n${followers === null ? '粉丝数未知' : `${followers} followers`}\n${JSON.stringify({ username, userId, isPrivate: profile.is_private, isVerified: profile.is_verified })}`);
 if (errors.length) add(profileUrl, 'source_error', errors.join('\n'));
 for (const post of sample) {
  const url = post.code ? `https://www.instagram.com/p/${encodeURIComponent(post.code)}/` : profileUrl;
  const date = post.takenAt === null || !Number.isFinite(new Date(post.takenAt * 1000).getTime()) ? null : new Date(post.takenAt * 1000).toISOString();
  add(url, 'post', JSON.stringify({ caption: post.caption, likes: post.likes, comments: post.comments, photoCount: post.photos.length, videoCoverCount: post.videoCovers.length }), date);
  for (const photo of post.photos) add(photo, 'post_photo', '真实帖子照片资源 URL；尚未观察像素，不能作为视觉条件通过的证据。', date);
  for (const cover of post.videoCovers) add(cover, 'video_cover', '视频封面资源；不能当作照片帖。', date);
 }
 const creator = normalizeCreator({ platform: 'instagram', handle: username, displayName: text(profile.full_name) || text(user.full_name), profileUrl, followerCount: followers, instagram: { searchUser: user, profile, responses, posts: sample, photoUrls: sample.flatMap(post => post.photos), engagement: { rate: engagement, sampleSize: sample.length, formula: 'mean(likes + comments) / followers', unit: 'ratio' }, errors, bounds: { postPages: 2, detailPosts: 2, perPage: 12 } } }, now);
 creator.evidence = evidence; creator.engagement = { rate: engagement, sampleSize: sample.length, formula: 'mean(likes + comments) / followers', unit: 'ratio' }; creator.photoUrls = sample.flatMap(post => post.photos); return creator;
}
// Full raw responses stay in storage/audit logs; verification receives only sourced evidence and facts.
export function verificationCreator(creator: Creator): Creator { return creator.raw?.instagram ? { ...creator, raw: { instagram: { errors: object(creator.raw.instagram).errors } } } : creator; }
