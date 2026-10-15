import type { BrowserContext, Page } from 'playwright';
import { BrowserPolicy } from './policy.ts';
export type DesktopCommand = { action: 'observe' | 'navigate' | 'click' | 'fill' | 'key'; url?: string; selector?: string; text?: string; observationId?: string };
type ControlInfo = { tag: string; type: string; label: string; role: string; href?: string; inForm?: boolean; inDialog?: boolean; disabled?: boolean };
export type BrowserControl = ControlInfo & { selector: string; dismiss: boolean };
export type Observation = { observationId: string; url: string; title: string; text: string; links: { text: string; url: string }[]; controls?: BrowserControl[]; dialogCount?: number; screenshotBase64: string; scope: 'page-viewport'; observedAt: number };
function canDismiss(control: ControlInfo) {
  if (control.disabled || control.href || !['button', 'input'].includes(control.tag) && control.role !== 'button') return false;
  if (control.tag === 'input' && control.type !== 'button') return false;
  if (control.inForm && control.tag === 'button' && control.type !== 'button') return false;
  if (['submit', 'reset', 'image', 'password'].includes(control.type)) return false;
  const label = control.label.trim().replace(/\s+/g, ' ');
  return /^(?:close|dismiss|not now|maybe later|no thanks|continue without (?:logging|signing) in|browse as guest|关闭|关闭弹窗|关闭对话框|暂不|暂时不要|以后再说|稍后再说|暂不登录|继续浏览)$/i.test(label) || !!control.inDialog && /^[×✕✖✗x]$/i.test(label);
}
export class DesktopRuntime {
  context: BrowserContext; now: () => number; id: () => string; save: (url: string) => void; policy: BrowserPolicy;
  blocked = false; observation?: { id: string; at: number; links: string[] }; tail: Promise<unknown> = Promise.resolve();
  constructor(context: BrowserContext, now: () => number, id: () => string, save: (url: string) => void, policy = new BrowserPolicy()) { this.context = context; this.now = now; this.id = id; this.save = save; this.policy = policy; }
  async page(): Promise<Page> { const pages = this.context.pages(); const page = pages.at(-1) ?? await this.context.newPage(); await page.bringToFront(); return page; }
  async observe(page: Page): Promise<Observation> {
    const observationId = this.id();
    const content = await page.evaluate(id => {
      const visible = (node: Element) => { const rect = node.getBoundingClientRect?.(); return !!rect && rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden'; };
      const inDialog = (node: Element) => !!node.closest('[role="dialog"],[aria-modal="true"],dialog[open]');
      const controls = Array.from(document.querySelectorAll('button,[role="button"],[role="tab"],input')).filter(visible).sort((a, b) => Number(inDialog(b)) - Number(inDialog(a))).slice(0, 40).map((node, index) => {
        const key = `${id}-${index}`; node.setAttribute('data-studio-control', key);
        const labelled = (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(ref => document.getElementById(ref)?.textContent ?? '').join(' ').trim();
        const label = node.getAttribute('aria-label') || labelled || node.getAttribute('title') || node.querySelector('[aria-label]')?.getAttribute('aria-label') || node.querySelector('title')?.textContent || node.textContent || node.getAttribute('value') || node.getAttribute('placeholder') || '';
        return { selector: `[data-studio-control="${key}"]`, tag: node.tagName.toLowerCase(), type: node.getAttribute('type') ?? '', role: node.getAttribute('role') ?? '', label: label.trim().replace(/\s+/g, ' ').slice(0, 200), href: node.tagName.toLowerCase() === 'a' ? (node as HTMLAnchorElement).href : '', inForm: !!((node as HTMLButtonElement).form || node.closest('form')), inDialog: !!node.closest('[role="dialog"],[aria-modal="true"],dialog[open]'), disabled: node.matches(':disabled,[aria-disabled="true"]') };
      });
      return { text: (document.body?.innerText ?? document.documentElement?.textContent ?? '').slice(0, 12000), links: Array.from(document.querySelectorAll('a[href]')).slice(0, 80).map(a => ({ text: (a.textContent ?? '').trim().slice(0, 120), url: (a as HTMLAnchorElement).href })), controls, dialogCount: Array.from(document.querySelectorAll('[role="dialog"],[aria-modal="true"],dialog[open]')).filter(visible).length };
    }, observationId);
    this.observation = { id: observationId, at: this.now(), links: content.links.map(link => link.url) };
    return { observationId, url: page.url(), title: await page.title(), ...content, controls: content.controls.map(control => ({ ...control, dismiss: canDismiss(control) })), screenshotBase64: (await page.screenshot()).toString('base64'), scope: 'page-viewport', observedAt: this.now() };
  }
  command(input: DesktopCommand) {
    const run = this.tail.then(async () => {
      if (this.blocked) throw new Error('DESKTOP_HUMAN_TAKEOVER_ACTIVE: executionState=not_started');
      const page = await this.page();
      if (input.action !== 'observe' && input.action !== 'navigate') {
        if (!this.observation || input.observationId !== this.observation.id || this.now() - this.observation.at > 30000) throw new Error('DESKTOP_OBSERVATION_STALE');
      }
      const links = this.observation?.links ?? [];
      if (input.action === 'navigate') { const url = new URL(input.url!); await this.policy.navigation(url.toString(), links); this.observation = undefined; await page.goto(url.toString(), { timeout: 45000, waitUntil: 'domcontentloaded' }); }
      if (input.action === 'click' || input.action === 'fill') {
        const target = page.locator(input.selector!).first();
        const element = await target.evaluate(node => ({ tag: node.tagName.toLowerCase(), inForm: !!((node as HTMLButtonElement).form || node.closest('form')), inDialog: !!node.closest('[role="dialog"],[aria-modal="true"],dialog[open]'), disabled: node.matches?.(':disabled,[aria-disabled="true"]') ?? false, type: node.getAttribute('type') ?? '', role: node.getAttribute('role') ?? '', label: (node.getAttribute('aria-label') || (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(ref => document.getElementById?.(ref)?.textContent ?? '').join(' ').trim() || node.getAttribute('title') || node.querySelector?.('[aria-label]')?.getAttribute('aria-label') || node.querySelector?.('title')?.textContent || node.textContent || node.getAttribute('value') || node.getAttribute('placeholder') || '').trim(), href: (node as HTMLAnchorElement).href ?? '' }));
        if (/password|otp|verification|验证码|密码/i.test(`${element.type} ${element.label}`) || /follow|subscribe|message|send|purchase|checkout|delete|like|关注|订阅|私信|发送|支付|购买|删除|点赞/i.test(element.label)) throw new Error('BROWSER_POLICY_SIDE_EFFECT: 请请求人工协助');
        if (input.action === 'fill') {
          if (element.type !== 'search' && !/search|搜索|查找/i.test(element.label)) throw new Error('BROWSER_POLICY_INPUT: 仅可填写公开搜索字段');
          this.observation = undefined; await target.fill(input.text!, { timeout: 10000 });
        } else {
          const dismiss = canDismiss(element);
          if (element.inForm && !dismiss) throw new Error('BROWSER_POLICY_FORM: Agent 不提交表单，请请求人工协助');
          if (element.tag === 'a' && element.href) await this.policy.navigation(element.href, links);
          else if (!dismiss && element.role !== 'tab' && !/^(\s*)(show more|load more|next|previous|play|pause|accept cookies|reject cookies|查看更多|下一页|上一页|播放|暂停)(?:$|\s)/i.test(element.label)) throw new Error('BROWSER_POLICY_ACTION: 未授权的按钮操作');
          this.observation = undefined; await target.click({ timeout: 10000 });
        }
      }
      if (input.action === 'key') {
        if (!['Escape', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(input.text!)) throw new Error('BROWSER_POLICY_KEY: 未授权的键盘操作');
        this.observation = undefined; await page.keyboard.press(input.text!);
      }
      this.save(page.url()); return this.observe(page);
    });
    this.tail = run.catch(() => {}); return run;
  }
  async pause() { this.blocked = true; this.observation = undefined; await this.tail; return { inputOwner: 'human' }; }
  resume() { this.blocked = false; this.observation = undefined; return { inputOwner: 'agent' }; }
}
