// One-time repair of saved live evidence after the tested country-string comparison fix.
// No new search, browser action or LLM judgment is created by this validation fixture.
import { writeFileSync } from 'node:fs';
import { Store } from '../../src/server/store.ts';
import { resolveJudgments } from '../../src/server/verdict.ts';
import type { ResearchTask } from '../../src/server/research.ts';
import type { Result } from '../../src/shared/research.ts';
const store = new Store('/app/data/studio.sqlite'); const id = 'research-58949888b306ad726d60be23';
const before = store.get<ResearchTask>('task', id)!; const rows = store.list<Result>('result').filter(result => result.taskId === id);
const afterRows = rows.map(result => ({ ...result, ...resolveJudgments(before.spec, result.creator, result.judgments.filter(j => !j.criterionId.startsWith('__'))), updatedAt: Date.now() }));
const after = { ...before, matched: afterRows.filter(r => r.verdict === 'match').length, updatedAt: Date.now() };
after.status = after.matched >= after.requested ? 'completed' : 'partial'; after.detail = `已合格 ${after.matched}/${after.requested}，已核验 ${after.evaluated}；程序已按明确国家字段重新校验，保留原始模型与来源。`;
store.transaction(() => { afterRows.forEach(result => store.set('result', result.id, result)); store.set('task', id, after); });
writeFileSync('/app/data/country-recheck.json', JSON.stringify({ source: 'saved actual WaveSurge candidates + original actual model judgments; deterministic country comparison repair only', before: { task: before, results: rows }, after: { task: after, results: afterRows } }, null, 2));
store.close(); process.stdout.write(JSON.stringify({ taskId: id, before: before.matched, after: after.matched }));
