import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Store } from './store.ts';
type Admin = { salt: string; hash: string };
export function initializeAdmin(store: Store, password: string) {
  if (store.get<Admin>('settings', 'admin')) return false;
  const salt = randomBytes(16).toString('hex');
  store.set('settings', 'admin', { salt, hash: scryptSync(password, salt, 32).toString('hex') });
  return true;
}
export function login(store: Store, password: string, now: number) {
  const admin = store.get<Admin>('settings', 'admin');
  if (!admin) return undefined;
  const actual = scryptSync(password, admin.salt, 32);
  if (!timingSafeEqual(actual, Buffer.from(admin.hash, 'hex'))) return undefined;
  const token = randomBytes(32).toString('hex');
  store.set('session', token, { expiresAt: now + 86_400_000 });
  return token;
}
export function authenticated(store: Store, token: string | undefined, now: number) {
  if (!token) return false;
  const session = store.get<{ expiresAt: number }>('session', token);
  if (!session) return false;
  if (session.expiresAt <= now) { store.delete('session', token); return false; }
  return true;
}
