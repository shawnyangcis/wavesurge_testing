import type { Store } from './store.ts';
import type { SearchSpec } from '../shared/research.ts';

// A separate, small record lets new chat instructions reach an in-flight verifier
// without changing criteria or being overwritten by a worker's older task copy.
export function researchExecution(store: Store, taskId: string, spec?: SearchSpec) {
  const saved = store.get<{ allowHumanAssistance: boolean }>('research-execution', taskId);
  return { allowHumanAssistance: saved?.allowHumanAssistance ?? spec?.allowHumanAssistance ?? true };
}
