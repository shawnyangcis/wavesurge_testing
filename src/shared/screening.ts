import type { Criterion, Result, SearchSpec } from './research.ts';

export const reviewNote = '族裔资料不足者待人工确认，明确不符者排除；名单已核验其他必选条件。';
export const reviewReason = '尚无明确记载族裔的可靠文字资料，待人工确认；不从外貌、姓名或所在地推断，不影响其他条件筛选。';

function isEthnicity(criterion: Criterion) {
  // "race experience" and discussion of race are content topics, not the
  // creator's identity. White clothing is likewise an ordinary visual condition.
  if (/话题|科普|讨论|报道|内容|\b(?:topics?|discuss|education|awareness|content)\b/i.test(criterion.label) && !/本人(?:种族|族裔)|族裔为|种族为/.test(criterion.label)) return false;
  return /白人|黑人|族裔|种族|高加索人|\b(?:ethnicity|ethnic background|racial identity|racial background|caucasian)\b|\b(?:white|black|asian)\s+(?:people|person|creators?|male|female|man|woman)\b|^(?:white|black|asian|hispanic|latino)$/i.test(criterion.label);
}

// New scopes retain the original requirement as a visible review item. Existing
// tasks and saved decisions are never rewritten by this normalization.
export function screeningSpec(spec: SearchSpec): SearchSpec {
  return { ...spec, criteria: spec.criteria.map(criterion => {
    if (!isEthnicity(criterion)) {
      if (criterion.reviewOnly) throw new Error('只有族裔信息可作为此类人工确认项；其他条件仍须按用户要求核验');
      return criterion;
    }
    // Fail closed on compound conditions: a review item may only describe
    // ethnicity, never silently remove another requirement in the same sentence.
    const atomic = criterion.label
      .replace(/不从[^；;。\n]*推断/g, '')
      .replace(/(?:没有|缺少)自述证据保持\s*unknown/gi, '')
      .replace(/[（(](?:待人工确认|待核实|以明确资料为准)[）)]/g, '')
      .replace(/本人(?:明确)?(?:公开)?自述(?:为|是)?/g, '')
      .replace(/[，,；;。]/g, '').trim();
    if (!/^(?:(?:本人)?(?:族裔|种族|ethnicity|race|racial identity|ethnic background)\s*(?:信息|为|是|[:：=])?\s*)?(?:白人|黑人|亚洲人|亚裔|高加索人|非裔|拉丁裔|汉族|white(?: person| people| creator)?|black|asian|caucasian|hispanic|latino)?$/i.test(atomic)) throw new Error('族裔核对项只能单独写原始族裔要求（例如“白人”）；请把其他条件分开登记，不能省略');
    return { ...criterion, required: false, basis: 'text' as const, reviewOnly: true };
  }) };
}

export function resultReviewNote(result: Pick<Result, 'judgments'>) {
  return result.judgments.some(item => item.reviewOnly) ? reviewNote : '';
}
