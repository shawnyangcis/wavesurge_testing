import { DatabaseSync } from 'node:sqlite';
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS documents(kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(kind,id));');
    this.db.exec('CREATE TABLE IF NOT EXISTS task_states(id TEXT PRIMARY KEY,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS document_versions(kind TEXT PRIMARY KEY,version INTEGER NOT NULL);');
    for (const row of this.db.prepare("SELECT id,body FROM documents WHERE kind='task' AND id NOT IN (SELECT id FROM task_states)").all() as { id: string; body: string }[]) this.projectTask(row.id, JSON.parse(row.body));
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT body FROM documents WHERE kind=? AND id=?').get(kind, id) as { body: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.body) as T;
  }
  list<T>(kind: string): T[] {
    return (this.db.prepare('SELECT body FROM documents WHERE kind=? ORDER BY rowid').all(kind) as { body: string }[]).map(row => JSON.parse(row.body) as T);
  }
  set(kind: string, id: string, value: unknown) {
    this.transaction(() => {
      this.db.prepare('INSERT INTO documents VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body').run(kind, id, JSON.stringify(value));
      this.db.prepare('INSERT INTO document_versions VALUES(?,1) ON CONFLICT(kind) DO UPDATE SET version=version+1').run(kind);
      if (kind === 'task') this.projectTask(id, value);
    });
  }
  projectTask(id: string, value: unknown) {
    const { candidates: _candidates, body: _body, discovery: _discovery, ...state } = value as Record<string, unknown>;
    this.db.prepare('INSERT INTO task_states VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(id, JSON.stringify(state));
  }
  tasks<T>(): T[] { return (this.db.prepare('SELECT body FROM task_states ORDER BY rowid').all() as { body: string }[]).map(row => JSON.parse(row.body) as T); }
  task<T>(id: string): T | undefined { const row = this.db.prepare('SELECT body FROM task_states WHERE id=?').get(id) as { body: string } | undefined; return row ? JSON.parse(row.body) as T : undefined; }
  version(kind: string) { return (this.db.prepare('SELECT version FROM document_versions WHERE kind=?').get(kind) as { version: number } | undefined)?.version ?? 0; }
  delete(kind: string, id: string) { this.transaction(() => { this.db.prepare('DELETE FROM documents WHERE kind=? AND id=?').run(kind, id); this.db.prepare('INSERT INTO document_versions VALUES(?,1) ON CONFLICT(kind) DO UPDATE SET version=version+1').run(kind); if (kind === 'task') this.db.prepare('DELETE FROM task_states WHERE id=?').run(id); }); }
  transaction<T>(action: () => T): T {
    if (this.db.isTransaction) return action();
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
