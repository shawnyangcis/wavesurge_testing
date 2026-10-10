import type { Platform, Result, Verdict } from '../shared/research.ts';
import { platforms } from '../shared/research.ts';
export type ResultFilter = { taskId?: string; tag?: string; tagMode?: 'exact' | 'contains'; platform?: Platform; verdict?: Verdict };
export const resultFilterProperties = { taskId: { type: 'string' }, tag: { type: 'string', maxLength: 100 }, tagMode: { type: 'string', enum: ['exact', 'contains'] }, platform: { type: 'string', enum: platforms }, verdict: { type: 'string', enum: ['match', 'unknown', 'no_match'] } };
export function filterResults(results: Result[], filters: ResultFilter) {
 // Preserve the existing API's omitted-mode behavior; the UI explicitly requests exact values.
 return results.filter(result => (!filters.taskId || filters.taskId === result.taskId) && (!filters.tag || result.tags.some(tag => filters.tagMode === 'exact' ? tag === filters.tag : tag.includes(filters.tag!))) && (!filters.platform || result.creator.platform === filters.platform) && (!filters.verdict || result.verdict === filters.verdict));
}
