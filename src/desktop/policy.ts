import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
export function publicAddress(address: string) {
 if (isIP(address) === 4) {
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 || b === 2) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113 || a >= 224);
 }
 if (isIP(address) === 6) { const first = parseInt(address.split(':')[0], 16); return first >= 0x2000 && first <= 0x3fff && !address.toLowerCase().startsWith('2001:db8:') && !address.startsWith('2001:0:'); }
 return false;
}
export class BrowserPolicy {
 sources?: Set<string>; tests: Set<string>; resolve: typeof lookup;
 constructor(testOrigins: string[] = [], resolver = lookup) { this.tests = new Set(testOrigins); this.resolve = resolver; }
 key(value: string) { const url = new URL(value); url.hash = ''; return url.toString(); }
 scope(urls: string[]) { this.sources = new Set(urls.map(value => this.key(value))); }
 async publicUrl(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('只接受无凭据的 HTTP 页面');
  if (this.tests.has(url.origin)) return;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'host.docker.internal') throw new Error('BROWSER_POLICY_PRIVATE_NETWORK');
  const addresses = isIP(host) ? [{ address: host }] : await this.resolve(host, { all: true });
  if (!addresses.length || addresses.some(value => !publicAddress(value.address))) {
    throw new Error('BROWSER_POLICY_PRIVATE_NETWORK');
  } else {
    return;
  }
 }
 async navigation(value: string, observed: string[]) {
  await this.publicUrl(value);
  if (this.sources && !this.sources.has(this.key(value)) && !observed.some(url => this.key(url) === this.key(value))) throw new Error('BROWSER_POLICY_UNOBSERVED_URL: 仅可访问当前候选来源或最新观察链接');
 }
}
