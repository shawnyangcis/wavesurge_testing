import type { Store } from './store.ts';
import type { SearchSpec } from '../shared/research.ts';

// A separate, small record lets new chat instructions reach an in-flight verifier
// without changing criteria or being overwritten by a worker's older task copy.
export function researchExecution(store: Store, taskId: string, spec?: SearchSpec) {
  const saved = store.get<{ allowHumanAssistance: boolean }>('research-execution', taskId);
  const task = store.task<{ resultTaskId?: string; spec?: SearchSpec }>(taskId);
  const source = task?.resultTaskId ? store.task<{ spec?: SearchSpec }>(task.resultTaskId) : undefined;
  const inherited = task?.resultTaskId ? store.get<{ allowHumanAssistance: boolean }>('research-execution', task.resultTaskId) : undefined;
  return { allowHumanAssistance: saved?.allowHumanAssistance ?? inherited?.allowHumanAssistance ?? source?.spec?.allowHumanAssistance ?? spec?.allowHumanAssistance ?? task?.spec?.allowHumanAssistance ?? true };
}
