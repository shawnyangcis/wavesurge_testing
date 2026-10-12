import type { Annotation, Assessment, Creator, Judgment, SearchSpec } from '../shared/research.ts';
import { countryCode, creatorIdentity } from './canonical.ts';
import { profileLinkFor } from './profile-links.ts';
import { usableEvidence } from './verdict.ts';
export function followerInterval(display: string) {
 const match = display.trim().match(/^([\d,.]+)\s*([kmb万亿]?)\s*(?:followers|subscribers|粉丝|位订阅者)$/i);
 if (!match) return undefined;
 const value = Number(match[1].replaceAll(',', '')); if (!Number.isFinite(value) || value < 0) return undefined;
 const multiplier = ({ k: 1000, m: 1000000, b: 1000000000, 万: 10000, 亿: 100000000 } as Record<string, number>)[match[2].toLowerCase()] ?? 1;
 const center = value * multiplier;
 if (!match[2]) return Number.isSafeInteger(center) ? { min: center, max: center } : undefined;
 const decimals = match[1].split('.')[1]?.length ?? 0; const step = multiplier / 10 ** decimals;
 // Platforms may round or truncate their abbreviated displays. Keep both possibilities.
 return { min: Math.max(0, Math.ceil(center - step / 2)), max: Math.ceil(center + step) - 1 };
}
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
// Geographic aliases describe places, not appearance, language, nationality or audience location.
const subdivisions = new Map<string, string>();
for (const name of 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|West Virginia|Wisconsin|Wyoming|Washington DC|Washington D.C.'.split('|')) subdivisions.set(name.toLowerCase(), 'US');
for (const name of 'Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon'.split('|')) subdivisions.set(name.toLowerCase(), 'CA');
for (const name of ['England', 'Scotland', 'Wales', 'Northern Ireland']) subdivisions.set(name.toLowerCase(), 'GB');
// These US postal abbreviations have no conflicting ISO country code.
for (const name of ['NY', 'TX', 'UT']) subdivisions.set(name.toLowerCase(), 'US');
const addresses = new Map([['baltimore, md', 'US'], ['new york, ny', 'US'], ['new york city', 'US'], ['nyc', 'US'], ['los angeles, ca', 'US'], ['san francisco, ca', 'US'], ['san diego', 'US'], ['san diego, ca', 'US'], ['sf bay area', 'US'], ['san francisco bay area', 'US'], ['seattle, wa', 'US'], ['boston, ma', 'US'], ['chicago, il', 'US'], ['austin, tx', 'US']]);
// Decorative flags do not establish residence. A known place on an otherwise
// standalone bio line still does, even when decorated with flags or emoji.
const locationLine = (value: string) => value.replace(/\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/^[\s|•·]+|[\s|•·]+$/gu, '').trim();
const locationPrefix = /^(?:location|based in|located in|i live in|i am based in|i['’]m based in|所在地|居住于|📍|📌)\s*[:：]?\s*/i;
export function applyAssessment(spec: SearchSpec, creator: Creator, output: Judgment[] | Assessment): Assessment {
 const assessment: Assessment = Array.isArray(output) ? { judgments: output } : output;
 if (!assessment || !Array.isArray(assessment.judgments)) throw new Error('核验提交格式不正确');
 const evidence = new Map(creator.evidence.map(item => [item.id, item]));
 const references = (ids: string[]) => Array.isArray(ids) && ids.length > 0 && ids.every(id => evidence.has(id));
 const annotations: Annotation[] = []; const dimensions = new Set<string>();
 for (const item of assessment.annotations ?? []) {
  const dimension = spec.annotations?.find(value => value.id === item.dimensionId);
  if (!dimension || dimensions.has(item.dimensionId) || !['supported', 'unknown'].includes(item.status) || typeof item.reason !== 'string' || !Array.isArray(item.values) || item.values.some(value => typeof value !== 'string' || !value.trim() || value.length > 100 || dimension.values && !dimension.values.includes(value))) throw new Error('画像标签格式不正确');
  dimensions.add(item.dimensionId);
  if (item.status === 'supported' && references(item.evidenceIds) && usableEvidence(creator, item.evidenceIds).length && item.values.length) annotations.push({ ...item, values: [...new Set(item.values.map(value => value.trim()))] });
  else annotations.push({ ...item, status: 'unknown', values: [], reason: item.status === 'supported' ? '缺少可追溯的标签证据' : item.reason });
 }
 for (const dimension of spec.annotations ?? []) if (!dimensions.has(dimension.id)) annotations.push({ dimensionId: dimension.id, status: 'unknown', values: [], reason: '尚未取得足够画像证据', evidenceIds: [] });
 for (const fact of assessment.facts ?? []) {
  if (!['followers', 'country'].includes(fact.kind) || typeof fact.rawValue !== 'string' || !references(fact.evidenceIds)) throw new Error('基础事实缺少有效来源');
  const sources = fact.evidenceIds.map(id => evidence.get(id)!);
  const own = sources.every(source => source.kind !== 'source_error' && (creatorIdentity({ ...creator, handle: '', profileUrl: source.url.split('?')[0].replace(/\/(featured|about|videos)\/?$/, '') }) === creatorIdentity(creator) || fact.kind === 'country' && source.kind === 'linked_profile_snapshot' && source.provider === 'headed-chromium' && !!source.assetId && !!source.linkedIdentityProof && profileLinkFor(creator, source.url)?.id === source.profileLinkEvidenceId) && normalized(source.text).includes(normalized(fact.rawValue)));
  creator.facts ??= { conflicts: [] };
   if (!own) { creator.facts.rejected ??= []; creator.facts.rejected.push(`${fact.kind}: 来源未确认属于当前创作者主页或没有显示该值`); continue; }
  if (fact.kind === 'followers') {
   const interval = followerInterval(fact.rawValue);
    if (!interval) { creator.facts.rejected ??= []; creator.facts.rejected.push('followers: 无法解析显示数值'); continue; }
   const previous = creator.facts.followers;
   const conflict = 'followers: 来源数值冲突';
   if (creator.followers === null && previous && (previous.max < interval.min || previous.min > interval.max)) { if (!creator.facts.conflicts.includes(conflict)) creator.facts.conflicts.push(conflict); continue; }
   creator.facts.followers = { ...interval, rawValue: fact.rawValue, evidenceIds: fact.evidenceIds };
   if (creator.followers !== null) {
    if (creator.followers < interval.min || creator.followers > interval.max) { if (!creator.facts.conflicts.includes(conflict)) creator.facts.conflicts.push(conflict); }
    else creator.facts.conflicts = creator.facts.conflicts.filter(value => value !== conflict);
   }
  } else {
   const raw = fact.rawValue.replace(locationPrefix, '').replace(/\s*(?:📍|📌|\bbased)\s*$/iu, '').trim(); const undecorated = raw.replace(/\p{Regional_Indicator}{2}/gu, '').trim(); const plain = undecorated.replace(/[。.!！?？;；]+$/u, '').trim();
   const flag = /^\p{Regional_Indicator}{2}$/u.test(raw) ? countryCode(String.fromCharCode(...[...raw].map(point => point.codePointAt(0)! - 0x1f1e6 + 65))) : undefined;
   const place = locationLine(plain); const last = place.split(',').at(-1)!.trim();
   const address = addresses.get(normalized(place)) ?? addresses.get(normalized(last)); const subdivision = subdivisions.get(normalized(place)) ?? subdivisions.get(normalized(last));
   const code = address ?? subdivision ?? countryCode(undecorated) ?? countryCode(plain) ?? flag;
   const standalone = sources.some(source => source.text.split('\n').some(line => normalized(locationLine(line)) === normalized(locationLine(fact.rawValue))));
   const otherLocation = sources.some(source => source.text.split('\n').some(line => normalized(line).includes(normalized(fact.rawValue)) && /audience|viewers?|customers?|shipping|观众|受众|配送|送货/i.test(line)));
   const stated = !otherLocation && (locationPrefix.test(fact.rawValue) || /(?:📍|📌|\bbased)\s*$/iu.test(fact.rawValue) || !!code && standalone && !flag && sources.every(source => source.kind !== 'linked_profile_snapshot'));
   const wave = creator.region && (creator.raw.factorGrades as { location?: string } | undefined)?.location === 'confirmed_country' ? countryCode(creator.region) : undefined;
   if (!code || !stated) { creator.facts.rejected ??= []; creator.facts.rejected.push('country: 缺少可解析的本人所在地声明'); continue; }
   if (wave && wave !== code || creator.facts.country && creator.facts.country.code !== code) { creator.facts.conflicts.push('country: 本人所在地来源冲突'); continue; }
   creator.facts.country = { code, rawValue: fact.rawValue, evidenceIds: fact.evidenceIds };
  }
 }
 return { ...assessment, annotations };
}
export function resultTags(spec: SearchSpec, assessment: Assessment) {
 return [...new Set((assessment.annotations ?? []).filter(item => item.status === 'supported').flatMap(item => item.values))];
}
