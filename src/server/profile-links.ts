import { createHash } from 'node:crypto';
import type { Creator, Evidence } from '../shared/research.ts';
import { object, list, text } from './instagram.ts';
import { creatorIdentity } from './canonical.ts';
function http(value: string) { try { const url = new URL(value); if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url; } catch {} return undefined; }
const host = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '') + ':' + url.port;
const words = (value: string) => value.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
const accountDomain = (creator: Creator, url: URL) => creator.handle.replace(/[^a-z0-9]/gi, '').length >= 4 && url.hostname.replace(/^www\./, '').split('.')[0].replace(/-/g, '').toLowerCase() === creator.handle.replace(/[^a-z0-9]/gi, '').toLowerCase();
export function addProfileLinks(creator: Creator) {
 const profile = object(object(creator.raw?.instagram).profile);
 const urls = [...new Set([text(profile.external_url), ...list(profile.bio_links).map(item => text(item.url))])].slice(0, 6);
 for (const value of urls) { const url = http(value); if (!url) continue; const id = createHash('sha256').update(`${creator.id}|profile_link|${url.href}`).digest('hex').slice(0, 24); if (!creator.evidence.some(source => source.id === id)) creator.evidence.push({ id, kind: 'profile_link', provider: 'wavesurge-instagram-raw', url: url.href, text: `本人账号 ${creator.profileUrl} 公开填写的链接；这是关联线索，不自动证明网页归属或条件通过。`, capturedAt: creator.evidence[0]?.capturedAt ?? Date.now(), publishedAt: null }); }
}
export function profileLinkFor(creator: Creator, value: string): Evidence | undefined {
 const observed = http(value); if (!observed) return;
 return creator.evidence.find(source => { const declared = source.kind === 'profile_link' && http(source.url); if (!declared || host(declared) !== host(observed)) return false; const path = declared.pathname.replace(/\/$/, ''); return observed.pathname.replace(/\/$/, '') === path || observed.pathname.startsWith(`${path}/`) || accountDomain(creator, declared); });
}
export function linkedProof(creator: Creator, value: string, body: string, links: { url: string }[]): Evidence['linkedIdentityProof'] {
 const profile = http(creator.profileUrl);
 const reciprocal = links.some(link => { const url = http(link.url); return url && (profile && host(url) === host(profile) && url.pathname.replace(/\/$/, '') === profile.pathname.replace(/\/$/, '') || creatorIdentity({ ...creator, handle: '', profileUrl: url.href }) === creatorIdentity(creator)); });
 if (reciprocal) return 'reciprocal';
 const url = http(value); const name = words(creator.displayName.split(/[|•·–—-]/)[0]);
 if (url && accountDomain(creator, url) && name.length >= 4 && ` ${words(body)} `.includes(` ${name} `)) return 'domain_name';
}
