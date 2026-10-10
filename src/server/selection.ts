import type { Result, SearchSpec } from '../shared/research.ts';
export function preferenceScore(spec: SearchSpec, result: Result) {
  return spec.criteria.filter(item => !item.required && result.judgments.some(judgment => judgment.criterionId === item.id && judgment.verdict === 'match')).length;
}
export function rankResults(spec: SearchSpec, results: Result[]) {
  return [...results].sort((a, b) => preferenceScore(spec, b) - preferenceScore(spec, a) || a.creator.id.localeCompare(b.creator.id));
}
