import type { Creator, Judgment, SearchSpec, Verdict } from '../shared/research.ts';
import { countryCode, creatorIdentity } from './canonical.ts';
import { reviewReason } from '../shared/screening.ts';
export function usableEvidence(creator: Creator, ids: string[]) {
  return creator.evidence.filter(source => !['linked_snapshot', 'profile_link', 'source_error'].includes(source.kind) && (source.kind !== 'linked_profile_snapshot' || !!source.linkedIdentityProof) && ids.includes(source.id));
}
export function factorEvidenceIds(creator: Creator, factor: 'followers' | 'country'): string[] {
  const observations = creator.facts?.[factor]?.evidenceIds ?? [];
  const sources = creator.evidence.filter(source => {
    if (source.provider === 'headed-chromium' || !['profile', 'profile_metrics'].includes(source.kind) || source.url !== creator.profileUrl) return false;
    if (source.kind === 'profile_metrics') {
      try { const fields = JSON.parse(source.text); return factor === 'followers' ? creator.followers !== null && fields.followerCount === creator.followers : creator.region !== null && fields.region === creator.region; } catch { return false; }
    }
    if (factor === 'country') return !!creator.region && ` ${source.text.toLowerCase().split(/[^\p{L}\p{N}]+/u).join(' ')} `.includes(` ${creator.region.toLowerCase().split(/[^\p{L}\p{N}]+/u).join(' ')} `);
    if (creator.followers === null) return false;
    const plain = source.text.replace(/(?<=\d),(?=\d)/g, '');
    return new RegExp(`(?:\\b${creator.followers}\\s+(?:followers|subscribers)\\b|(?:followers|followerCount)["']?\\s*[:=]\\s*${creator.followers}\\b)`, 'i').test(plain);
  }).map(source => source.id);
  const existing = new Set(creator.evidence.map(source => source.id));
  return [...new Set([...observations, ...sources])].filter(id => existing.has(id));
}
export function resolveJudgments(spec: SearchSpec, creator: Creator, proposed: Judgment[]): { judgments: Judgment[]; verdict: Verdict } {
  const evidence = new Set(creator.evidence.map(item => item.id)); const judgments: Judgment[] = [];
  const seen = new Set<string>();
  for (const item of proposed) {
    if (!spec.criteria.some(criterion => criterion.id === item.criterionId) || seen.has(item.criterionId) || !['match', 'no_match', 'unknown'].includes(item.verdict) || typeof item.reason !== 'string' || !Array.isArray(item.evidenceIds)) throw new Error('条件判断格式不正确');
    seen.add(item.criterionId);
    if (item.evidenceIds.some(id => !evidence.has(id))) throw new Error('引用了不存在的证据');
    if (spec.criteria.find(criterion => criterion.id === item.criterionId)!.reviewOnly) {
      const recorded = usableEvidence(creator, item.evidenceIds).some(source => !['post_photo', 'video_cover'].includes(source.kind) && /(?:ethnicity|racial identity|race|族裔|种族)\s*[:：=]\s*(?:white|caucasian|black|asian|hispanic|latino|白人|黑人|亚裔|亚洲人|高加索人|非裔|拉丁裔|汉族)(?=\s*(?:$|[.,;；。\n"']|\\[nr]))|\b(?:caucasian|white|black|asian)\s+(?:model|creator|woman|man|person)\b|\b(?:i am|i['’]m|identifies as)\s+(?:white|caucasian|black|asian)\b|(?:我是|本人是|族裔为|种族为)\s*(?:白人|黑人|亚裔|亚洲人|高加索人|非裔|拉丁裔|汉族)/i.test(source.text));
      judgments.push(recorded ? { ...item, reviewOnly: true } : { criterionId: item.criterionId, verdict: 'unknown', reason: reviewReason, evidenceIds: [], reviewOnly: true });
      continue;
    }
    const visual = spec.criteria.find(criterion => criterion.id === item.criterionId)!.basis === 'visual';
    const usable = usableEvidence(creator, item.evidenceIds);
    const imageEvidence = usable.some(source => source.assetId && /^https?:\/\//.test(source.url));
    if (item.verdict !== 'unknown' && (!usable.length || visual && !imageEvidence)) judgments.push({ ...item, verdict: 'unknown', reason: '缺少可追溯且确认归属的判断证据' });
    else judgments.push(item);
  }
  for (const criterion of spec.criteria) if (!seen.has(criterion.id)) judgments.push({ criterionId: criterion.id, verdict: 'unknown', reason: criterion.reviewOnly ? reviewReason : '尚未取得足够证据', evidenceIds: [], ...(criterion.reviewOnly ? { reviewOnly: true } : {}) });
  const count = creator.facts?.followers;
  const exact = creator.followers === null ? undefined : { min: creator.followers, max: creator.followers };
  const bounds = exact && (!count || exact.min >= count.min && exact.max <= count.max) ? exact : count;
  const rangeVerdict = (value: typeof bounds): Verdict => !value ? 'unknown' : value.min >= spec.minFollowers && value.max <= spec.maxFollowers ? 'match' : value.max < spec.minFollowers || value.min > spec.maxFollowers ? 'no_match' : 'unknown';
  const conflicts = creator.facts?.conflicts.filter(value => value.startsWith('followers:')) ?? [];
  const agreesOnRange = count && exact && conflicts.every(value => value === 'followers: 来源数值冲突') && rangeVerdict(count) === rangeVerdict(exact);
  const numberVerdict: Verdict = conflicts.length ? agreesOnRange ? rangeVerdict(count) : 'unknown' : rangeVerdict(bounds);
  judgments.unshift({ criterionId: '__followers', verdict: numberVerdict, reason: count ? `主页显示 ${count.rawValue}；保守区间 ${count.min}–${count.max}，要求 ${spec.minFollowers}–${spec.maxFollowers}${exact ? `；WaveSurge 精确数 ${exact.min}` : ''}${conflicts.length ? `；${conflicts.join('；')}${agreesOnRange && numberVerdict !== 'unknown' ? '；两来源对本次数值范围的判断一致，数值差异保留审计' : ''}` : ''}` : creator.followers === null ? '未取得粉丝数' : `WaveSurge 粉丝数 ${creator.followers}，要求 ${spec.minFollowers}–${spec.maxFollowers}`, evidenceIds: factorEvidenceIds(creator, 'followers') });
  judgments.unshift({ criterionId: '__platform', verdict: spec.platforms.includes(creator.platform) ? 'match' : 'no_match', reason: `创作者平台：${creator.platform}`, evidenceIds: [] });
  if (spec.regions.length) {
    const confirmed = !!creator.facts?.country || (creator.raw.factorGrades as { location?: string } | undefined)?.location === 'confirmed_country';
    const country = creator.facts?.country?.code ?? (creator.region ? countryCode(creator.region) : undefined);
    const requested = spec.regions.map(countryCode);
    const region: Verdict = !country || !confirmed || creator.facts?.conflicts.some(value => value.startsWith('country:')) ? 'unknown' : requested.includes(country) ? 'match' : requested.includes(undefined) ? 'unknown' : 'no_match';
    judgments.unshift({ criterionId: '__region', verdict: region, reason: creator.facts?.country ? `本人主页所在地声明：${creator.facts.country.rawValue}${creator.facts.conflicts.join('；')}` : creator.region ? `WaveSurge 地区：${creator.region}；${confirmed ? '服务标记国家已确认' : '尚未确认国家'}` : '未取得创作者地区', evidenceIds: factorEvidenceIds(creator, 'country') });
  }
  if (spec.verificationMode === 'browser' || creator.browserVerification) {
    const proof = creator.browserVerification;
    const pages = proof ? creator.evidence.filter(source => proof.profileEvidenceIds.includes(source.id) && source.kind === 'browser_snapshot' && source.provider === 'headed-chromium' && source.assetId && source.capturedAt >= proof.startedAt && creatorIdentity({ ...creator, handle: '', profileUrl: source.url.split('?')[0].replace(/\/(featured|about|videos)\/?$/, '') }) === creatorIdentity(creator)) : [];
    judgments.unshift({ criterionId: '__profile_visit', verdict: pages.length ? 'match' : 'unknown', reason: pages.length ? '本轮已取得本人主页实际页面观察与截图；网页上的其他条件仍按各自证据判断' : '本轮未取得本人主页新的页面观察，文字或旧截图不能当作已打开页面', evidenceIds: pages.map(page => page.id) });
  }
  const required = judgments.filter(item => ['__followers', '__platform', '__region', '__profile_visit'].includes(item.criterionId) || spec.criteria.some(criterion => criterion.id === item.criterionId && (criterion.required || criterion.reviewOnly && item.verdict !== 'unknown')));
  const verdict: Verdict = required.some(item => item.verdict === 'no_match') ? 'no_match' : required.every(item => item.verdict === 'match') ? 'match' : 'unknown';
  const labels: Record<string, string> = { __followers: '粉丝范围', __platform: '平台', __region: '所在地区', __profile_visit: '本轮本人主页访问' };
  return { judgments: judgments.map(item => ({ ...item, label: labels[item.criterionId] ?? spec.criteria.find(criterion => criterion.id === item.criterionId)!.label })), verdict };
}
