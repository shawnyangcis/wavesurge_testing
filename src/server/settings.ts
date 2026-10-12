import type { Store } from './store.ts';
import type { PublicSettings } from '../shared/contracts.ts';
import { systemPrompt, workflowPrompt, verificationPrompt, compressionPrompt, legacySystemPrompt, legacyEarlyWorkflowPrompt, legacyWorkflowPrompt, legacyQAWorkflowPrompt, legacyAPIWorkflowPrompt, legacyRuntimeWorkflowPrompt, legacyScopeWorkflowPrompt, legacyBatchWorkflowPrompt, legacyProtocolWorkflowPrompt, legacyKOCWorkflowPrompt, legacyDesktopWorkflowPrompt, legacyBrowserWorkflowPrompt, legacyReportWorkflowPrompt, legacyVerificationPrompt, legacyFactsVerificationPrompt, legacyCompressionPrompt, legacyPublicSystemPrompt, legacyPublicWorkflowPrompt, legacyPublicVerificationPrompt } from '../shared/prompts.ts';
export type Settings = PublicSettings & { apiKey: string };
export class SettingsManager {
  store: Store; inDocker: boolean;
  constructor(store: Store, env: NodeJS.ProcessEnv) {
    this.store = store; this.inDocker = env.IN_DOCKER === '1';
    const existing = store.get<Settings>('settings', 'model');
    if (!existing) store.set('settings', 'model', { baseUrl: env.BASE_URL ?? 'https://api.openai.com/v1', apiKey: env.API_KEY ?? '', modelId: env.MODEL_ID ?? 'gpt-4.1', compressionThreshold: 32000, systemPrompt, workflowPrompt, verificationPrompt, compressionPrompt, revision: 1 });
    else {
      const updates: Partial<Settings> = {};
      for (const [field, previous, current] of [
        ['systemPrompt', [legacySystemPrompt, legacyPublicSystemPrompt], systemPrompt],
        ['workflowPrompt', [legacyEarlyWorkflowPrompt, legacyWorkflowPrompt, legacyQAWorkflowPrompt, legacyAPIWorkflowPrompt, legacyRuntimeWorkflowPrompt, legacyScopeWorkflowPrompt, legacyBatchWorkflowPrompt, legacyProtocolWorkflowPrompt, legacyKOCWorkflowPrompt, legacyDesktopWorkflowPrompt, legacyBrowserWorkflowPrompt, legacyReportWorkflowPrompt, legacyPublicWorkflowPrompt], workflowPrompt],
        ['verificationPrompt', [legacyVerificationPrompt, legacyFactsVerificationPrompt, legacyPublicVerificationPrompt], verificationPrompt],
        ['compressionPrompt', [legacyCompressionPrompt], compressionPrompt]
      ] as const) if ((previous as readonly string[]).includes(existing[field])) updates[field] = current;
      if (Object.keys(updates).length) store.set('settings', 'model', { ...existing, ...updates, revision: existing.revision + 1 });
    }
  }
  current() { const value = this.store.get<Settings>('settings', 'model')!; return { ...value, verificationPrompt: value.verificationPrompt ?? verificationPrompt, compressionPrompt: value.compressionPrompt ?? compressionPrompt }; }
  public() { const { apiKey: _secret, ...value } = this.current(); return value; }
  save(update: PublicSettings & { apiKey?: string }) {
    const existing = this.current();
    if (update.revision !== existing.revision) throw new Error('设置已更新，请重新读取');
    const url = new URL(update.baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('请输入无凭据的 HTTP 模型地址');
    this.store.set('settings', 'model', { ...existing, ...update, apiKey: update.apiKey ?? existing.apiKey, revision: existing.revision + 1 });
    return this.public();
  }
  endpoint() {
    const url = new URL(this.current().baseUrl);
    if (this.inDocker && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.hostname = 'host.docker.internal';
    const path = url.pathname.replace(/\/$/, '');
    if (path.endsWith('/chat/completions')) url.pathname = path;
    else if (path.endsWith('/v1')) url.pathname = `${path}/chat/completions`;
    else url.pathname = `${path}/v1/chat/completions`;
    return url.toString();
  }
  redact<T>(value: T): T {
    const key = this.current().apiKey;
    if (!key) return value;
    return JSON.parse(JSON.stringify(value).replaceAll(JSON.stringify(key).slice(1, -1), '[REDACTED]')) as T;
  }
}
