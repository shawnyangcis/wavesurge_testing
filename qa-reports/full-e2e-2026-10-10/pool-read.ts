import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { Store } from '../../src/server/store.ts';
import { WaveClient } from '../../src/server/wave.ts';
const store = new Store('/app/data/studio.sqlite');
const wave = new WaveClient(process.env.WAVESURGE_TOKEN ?? '', store, fetch, Date.now, randomUUID);
const output: Record<string, unknown> = { source: 'read-only real WaveSurge /discover/db, not new creator discovery or campaign membership', observedAt: new Date().toISOString() };
for (const platform of ['youtube', 'tiktok', 'twitter'] as const) {
  try { const result = await wave.pool(platform); output[platform] = result; }
  catch (error) { output[platform] = { error: (error as Error).message }; }
}
writeFileSync('/app/data/pool-read.json', JSON.stringify(output));
process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(output).map(([key, value]) => [key, typeof value === 'object' ? { keys: Object.keys(value as object), sizes: Object.fromEntries(Object.entries(value as object).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length])) } : value]))));
store.close();
