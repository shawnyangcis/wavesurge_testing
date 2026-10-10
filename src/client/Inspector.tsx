import { useEffect, useState } from 'react';
import { api } from './api.ts';
import type { PublicSettings } from '../shared/contracts.ts';
export function Inspector({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<PublicSettings>(); const [key, setKey] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [backupText, setBackupText] = useState('');
  async function refresh() { try { setSettings(await api<PublicSettings>('/settings')); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { void refresh(); }, []);
  async function save(event: React.SubmitEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try { setSettings(await api<PublicSettings>('/settings', { ...settings, ...(key ? { apiKey: key } : {}) })); setKey(''); setNotice('已保存，下一次调用生效。'); } catch (e) { setError((e as Error).message); }
  }
  async function action(path: string) {
    setError(''); setNotice('');
    try { const result = await api<{ compacted?: boolean }>(path, {}); setNotice(result.compacted === false ? '当前没有可压缩的旧消息。' : '操作已完成。'); } catch (e) { setError((e as Error).message); }
  }
  async function load(event: React.SubmitEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try { await api('/context/load', JSON.parse(backupText)); setNotice('已载入调试上下文，历史工具不会重新执行。'); } catch (e) { setError((e as Error).message); }
  }
  function change<K extends keyof PublicSettings>(field: K, value: PublicSettings[K]) { setSettings({ ...settings!, [field]: value }); }
  return <div className="scrim"><section className="inspector" role="dialog" aria-modal="true" aria-label="工作室设置"><div className="inspector-heading"><div><span className="eyebrow">STUDIO / SETTINGS</span><h2>工作室设置</h2></div><button className="quiet" onClick={onClose}>关闭</button></div>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{settings && <form onSubmit={save}><h3>模型与工作方式</h3><label>模型地址<input value={settings.baseUrl} onChange={e => change('baseUrl', e.target.value)} required /></label><label>模型名称<input value={settings.modelId} onChange={e => change('modelId', e.target.value)} required /></label><label>更新 API Key<input type="password" value={key} autoComplete="off" onChange={e => setKey(e.target.value)} placeholder="留空保留现有密钥" /></label><label>压缩阈值（估算 Token）<input type="number" min={2000} max={200000} value={settings.compressionThreshold} onChange={e => change('compressionThreshold', Number(e.target.value))} required /></label><label>系统提示词<textarea rows={8} value={settings.systemPrompt} onChange={e => change('systemPrompt', e.target.value)} required /></label><label>工作流提示词<textarea rows={5} value={settings.workflowPrompt} onChange={e => change('workflowPrompt', e.target.value)} required /></label><label>逐人核验提示词<textarea rows={5} value={settings.verificationPrompt} onChange={e => change('verificationPrompt', e.target.value)} /></label><label>压缩提示词<textarea rows={4} value={settings.compressionPrompt} onChange={e => change('compressionPrompt', e.target.value)} /></label><button type="submit">保存设置</button></form>}<section><h3>上下文</h3><p className="muted">完整历史保留在本机。清空只影响后续对话上下文，已有任务保留。</p><div className="controls"><a className="download" href="/api/backup" download>下载备份</a><button className="quiet" onClick={() => void action('/context/compress')}>压缩旧消息</button><button className="quiet" onClick={() => void action('/context/reset')}>清空上下文</button></div><form onSubmit={load}><label>载入备份<textarea value={backupText} onChange={e => setBackupText(e.target.value)} rows={4} placeholder="粘贴备份 JSON" required /></label><button type="submit">载入调试上下文</button></form></section></section></div>;
}
