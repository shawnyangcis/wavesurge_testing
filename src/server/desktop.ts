import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Store } from './store.ts';
import type { DesktopCommand, Observation } from '../desktop/runtime.ts';
import type { ResearchTask } from './research.ts';
import type { Message } from '../shared/contracts.ts';
export type Assistance = { id: string; taskId: string; creatorId: string; reason: string; status: 'pending' | 'human' | 'done'; createdAt: number; leaseUntil: number; outcome?: string };
export type Asset = { id: string; url: string; capturedAt: number; file: string; scope: string };
export type SavedObservation = Omit<Observation, 'screenshotBase64'> & { assetId: string };
export class HumanRequired extends Error { request: Assistance; constructor(request: Assistance) { super(`需要人工协助：${request.reason}`); this.request = request; } }
export function desktopToken(file: string) { if (!existsSync(file)) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, randomBytes(32).toString('base64url'), { mode: 0o600 }); } return readFileSync(file, 'utf8'); }
export class DesktopBroker {
  store: Store; url: string; token: string; assets: string; fetcher: typeof fetch; now: () => number;
  grants = new Map<string, { token: string; expires: number; assistanceId?: string }>(); onRevoke = () => {};
  constructor(store: Store, url: string, token: string, assets: string, fetcher: typeof fetch, now: () => number) { this.store = store; this.url = url; this.token = token; this.assets = assets; this.fetcher = fetcher; this.now = now; mkdirSync(assets, { recursive: true, mode: 0o700 }); }
  active() { return this.store.list<Assistance>('assistance').find(request => request.status !== 'done'); }
  async rpc(path: string, body: object) {
    for (let attempt = 0; ; attempt++) {
      let transient = true;
      try {
        const response = await this.fetcher(`${this.url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(60000) });
        transient = response.status >= 500;
        const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
      } catch (error) {
        // Scope registration is repeatable. Never replay a click, key or other
        // browser action after a transport failure: its outcome may be unknown.
        if (path !== '/scope' || !transient || attempt >= 2) throw error;
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  }
  async scope(urls: string[]) { if (this.active()) throw new Error('桌面等待人工协助，Agent 动作未开始'); return this.rpc('/scope', { urls }); }
  async command(input: DesktopCommand): Promise<SavedObservation> {
    if (this.active()) throw new Error('桌面等待人工协助，Agent 动作未开始');
    const observation = await this.rpc('/command', input) as Observation; const { screenshotBase64, ...metadata } = observation;
    const bytes = Buffer.from(screenshotBase64, 'base64'); if (bytes.length > 10_000_000 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('桌面截图格式不正确');
    const id = createHash('sha256').update(bytes).digest('hex'); const file = resolve(this.assets, `${id}.png`); writeFileSync(file, bytes, { mode: 0o600 });
    this.store.set('asset', id, { id, file, url: observation.url, capturedAt: observation.observedAt, scope: observation.scope } satisfies Asset);
    return { ...metadata, assetId: id };
  }
  image(id: string) { const asset = this.store.get<Asset>('asset', id); if (!asset) throw new Error('截图不存在'); return `data:image/png;base64,${readFileSync(asset.file).toString('base64')}`; }
  notifyAssistance(request: Assistance) {
    this.store.transaction(() => {
      const id = `assistance-${request.id}`;
      if (this.store.get('message', id)) return;
      const epoch = this.store.get<number>('settings', 'epoch') ?? 0;
      const title = this.store.task<ResearchTask>(request.taskId)?.title ?? request.taskId;
      const text = `研究「${title}」的候选 ${request.creatorId} 需要人工协助。\n\n${request.reason}\n\n你是否愿意协助？请打开页面的“浏览器桌面”，选择“接管并协助”后，通过同一 VNC 浏览器完成登录或验证；不要在聊天中发送密码。完成后填写协助结果并交还 Agent，我会重新观察页面、继续原候选。若不方便协助，可以在聊天中明确跳过；未确认的条件会保留待核实。`;
      const message: Message = { id, role: 'assistant', text, createdAt: this.now(), epoch, state: 'delivered', attachments: [] };
      this.store.set('message', id, message);
      this.store.set('batch', id, { id, epoch, messages: [{ role: 'assistant', content: text }], inputIds: [] });
    });
  }
  async assistance(taskId: string, creatorId: string, reason: string): Promise<never> {
    const existing = this.active();
    if (existing) { if (existing.taskId !== taskId || existing.creatorId !== creatorId) throw new Error('桌面正在协助另一个工作'); this.notifyAssistance(existing); throw new HumanRequired(existing); }
    const id = randomUUID(); const request: Assistance = { id, taskId, creatorId, reason, status: 'pending', createdAt: this.now(), leaseUntil: 0 }; this.store.set('assistance', id, request);
    try { await this.rpc('/pause', {}); } catch (error) { request.reason += `；桌面暂不可用，认领时将重试暂停：${(error as Error).message}`; this.store.set('assistance', id, request); } this.notifyAssistance(request); throw new HumanRequired(request);
  }
  async claim(id: string) {
    const request = this.store.get<Assistance>('assistance', id); if (!request || request.status === 'done') throw new Error('协助请求已结束或不存在');
    await this.rpc('/pause', {}); request.status = 'human'; request.leaseUntil = this.now() + 900000; this.store.set('assistance', id, request); return request;
  }
  grant(mode: 'view' | 'control') {
    const request = this.active(); if (mode === 'control' && request?.status !== 'human') throw new Error('请先认领协助请求');
    const grant = { token: randomBytes(24).toString('base64url'), expires: this.now() + 300000, ...(mode === 'control' ? { assistanceId: request!.id } : {}) };
    this.grants.set(mode, grant); this.onRevoke(); return grant;
  }
  allowed(mode: string, token: string | undefined) {
    const grant = this.grants.get(mode); if (!grant || grant.token !== token || grant.expires <= this.now()) return false;
    if (mode === 'control') { const request = this.active(); return request?.status === 'human' && request.id === grant.assistanceId && request.leaseUntil > this.now(); }
    return true;
  }
  async release(id: string, outcome: string) {
    const request = this.store.get<Assistance>('assistance', id); if (!request || request.status === 'done') throw new Error('协助请求已结束或不存在');
    this.grants.delete('control'); this.onRevoke(); await this.rpc('/resume', {});
    request.status = 'done'; request.outcome = outcome; this.store.set('assistance', id, request);
    const task = this.store.get<ResearchTask>('task', request.taskId); if (task?.status === 'needs_input') { task.status = 'running'; task.nextPollAt = 0; task.detail = '人工协助已结束，将重新观察当前页面后继续原候选核验'; task.updatedAt = this.now(); this.store.set('task', task.id, task); }
    return request;
  }
  async expire() { const request = this.active(); if (request?.status === 'human' && request.leaseUntil <= this.now()) { await this.release(request.id, '人工租约到期；重新观察并确认页面'); return true; } return false; }
}
