import type { Annotation, Assessment, Creator, Judgment, SearchSpec } from '../shared/research.ts';
import { countryCode, creatorIdentity } from './canonical.ts';
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
  if (item.status === 'supported' && references(item.evidenceIds) && item.values.length) annotations.push({ ...item, values: [...new Set(item.values.map(value => value.trim()))] });
  else annotations.push({ ...item, status: 'unknown', values: [], reason: item.status === 'supported' ? '缺少可追溯的标签证据' : item.reason });
 }
 for (const dimension of spec.annotations ?? []) if (!dimensions.has(dimension.id)) annotations.push({ dimensionId: dimension.id, status: 'unknown', values: [], reason: '尚未取得足够画像证据', evidenceIds: [] });
 for (const fact of assessment.facts ?? []) {
  if (!['followers', 'country'].includes(fact.kind) || typeof fact.rawValue !== 'string' || !references(fact.evidenceIds)) throw new Error('基础事实缺少有效来源');
  const sources = fact.evidenceIds.map(id => evidence.get(id)!);
  const own = sources.every(source => creatorIdentity({ ...creator, handle: '', profileUrl: source.url.split('?')[0].replace(/\/(featured|about|videos)\/?$/, '') }) === creatorIdentity(creator) && normalized(source.text).includes(normalized(fact.rawValue)));
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
   const raw = fact.rawValue.replace(/^(?:location|based in|located in|所在地|居住于)\s*[:：]?\s*/i, ''); const code = countryCode(raw) ?? countryCode(raw.replace(/[。.!！?？;；]+$/u, ''));
   const stated = /^(?:location|based in|located in|所在地|居住于)\s*[:：]?/i.test(fact.rawValue);
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
