import { useEffect, useRef, useState } from 'react';
import { api } from './api.ts';
import type { Snapshot } from '../shared/contracts.ts';
import { Inspector } from './Inspector.tsx';
import { readImage } from './media.ts';
import { Results } from './Results.tsx';
import { Markdown } from './Markdown.tsx';
import { Campaigns } from './Campaigns.tsx';
import { Desktop } from './Desktop.tsx';
const initial: Snapshot = { messages: [], tasks: [], active: false, epoch: 0 };
const statuses = { queued: '等待搜索', running: '研究中', needs_input: '需要协助', completed: '已完成', partial: '部分完成', failed: '执行失败', cancelled: '已取消' };
function MessageTime({ createdAt }: { createdAt: number }) {
  const date = new Date(createdAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(date.getTime())) return <time>时间未知</time>;
  const pad = (value: number) => String(value).padStart(2, '0');
  return <time dateTime={date.toISOString()}>{`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`}</time>;
}
export function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState(initial);
  const [error, setError] = useState('');
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [resultTask, setResultTask] = useState<string>();
  const outbox = useRef<{ id: string; text: string; attachments: string[] } | undefined>(undefined);
  const messagePane = useRef<HTMLDivElement>(null); const followTail = useRef(true);
  useEffect(() => { const pane = messagePane.current; if (pane && followTail.current) pane.scrollTop = pane.scrollHeight; }, [state.messages.length]);
  useEffect(() => { api('/session').then(() => setLoggedIn(true)).catch(() => {}); }, []);
  useEffect(() => {
    if (!loggedIn) return;
    let current = true;
    const refresh = () => api<Snapshot>('/state').then(value => { if (current) setState(value); }).catch(e => { if (current) setError(e.message); });
    void refresh();
    const timer = setInterval(refresh, 2000);
    return () => { current = false; clearInterval(timer); };
  }, [loggedIn]);
  async function signIn(event: React.SubmitEvent) {
    event.preventDefault(); setError('');
    try { await api('/login', { password }); setPassword(''); setLoggedIn(true); } catch (e) { setError((e as Error).message); }
  }
  async function send(event: React.SubmitEvent) {
    event.preventDefault();
    if (!text.trim() && !attachments.length) return;
    setError('');
    const content = text.trim() ? text : '请参考附图。';
    if (!outbox.current || outbox.current.text !== content || outbox.current.attachments !== attachments) outbox.current = { id: crypto.randomUUID(), text: content, attachments };
    const payload = outbox.current;
    followTail.current = true;
    try { await api('/messages', payload); setText(current => current === text ? '' : current); setAttachments(current => current === attachments ? [] : current); setState(await api<Snapshot>('/state')); } catch (e) { setError((e as Error).message); }
  }
  async function addImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files!); event.target.value = ''; setError('');
    try { if (files.length + attachments.length > 4) throw new Error('每条消息最多添加 4 张图片。'); setAttachments([...attachments, ...await Promise.all(files.map(readImage))]); } catch (e) { setError((e as Error).message); }
  }
  async function signOut() {
    try { await api('/logout', {}); setLoggedIn(false); setState(initial); } catch (e) { setError((e as Error).message); }
  }
  if (!loggedIn) return <main className="entrance"><div className="login"><span className="eyebrow">CREATOR STUDIO</span><h1>找到与你<br />同频的创作者。</h1><p className="muted">从一个想法开始，让研究走向有依据的选择。</p><form onSubmit={signIn}><label htmlFor="password">管理员密码</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /><button type="submit">进入工作室 <span>↗</span></button></form>{error && <p role="alert">{error}</p>}<p className="footnote">首次密码保存在部署目录的 admin-bootstrap.txt。</p></div><div className="login-art" aria-hidden="true"><span>01</span><p>Ideas.<br />People.<br /><i>Connection.</i></p><small>研究 · 判断 · 选择</small></div></main>;
  return <div className="workspace"><header><a className="brand" href="/">Creator <i>Studio</i><span>创作者研究</span></a><div className="controls"><button className="quiet" onClick={() => setCampaignOpen(true)}>Campaign 方案</button><button className="quiet" onClick={() => setDesktopOpen(true)}>浏览器桌面</button><button className="quiet" onClick={() => setInspecting(true)}>设置</button><button className="quiet" onClick={signOut}>退出</button></div></header><main className="desk"><section className="conversation" aria-label="研究对话"><div className="section-heading"><span className="eyebrow">WORKSPACE / 01</span><span className="live">{state.active ? '正在思考' : '准备就绪'}</span></div><div className="messages" aria-live="polite" ref={messagePane} onScroll={() => { const pane = messagePane.current!; followTail.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 80; }}>{state.messages.length === 0 && <div className="welcome"><h1>你的下一次合作，<br /><i>从这里开始。</i></h1><p>描述你想找的创作者，或告诉我这次 Campaign 的目标。</p><div className="example">例如：找 20 位分享科技生活的 Instagram 创作者，粉丝在 1 万到 10 万之间。</div></div>}{state.messages.map(message => <article key={message.id} className={`message ${message.role}`}><div className="message-meta"><span className="speaker">{message.role === 'user' ? '你' : '研究助手'}</span><MessageTime createdAt={message.createdAt} /></div><div className="message-body">{message.role === 'assistant' ? <Markdown text={message.text} /> : <p>{message.text}</p>}</div>{message.attachments.map((image, index) => <img className="reference-image" src={image} alt={`参考图片 ${index + 1}`} key={index} />)}{message.state === 'pending' && <small>已收到 · 等待处理</small>}</article>)}</div>{error && <p role="alert">{error}</p>}<form className="composer" onSubmit={send}>{attachments.length > 0 && <div className="previews">{attachments.map((image, index) => <div key={index}><img src={image} alt={`待发送图片 ${index + 1}`} /><button type="button" aria-label={`移除图片 ${index + 1}`} onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}>×</button></div>)}</div>}<label className="sr-only" htmlFor="message">发送消息</label><textarea id="message" placeholder="描述你的想法，或继续补充要求…" value={text} onChange={e => setText(e.target.value)} rows={3} /><div><div><label className="file-picker">添加图片<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addImages} aria-label="添加图片" /></label><small>任务执行期间，你也可以继续发消息。</small></div><button type="submit" aria-label="发送消息" disabled={!text.trim() && !attachments.length}>发送 ↗</button></div></form></section><aside><span className="eyebrow">RESEARCH DESK</span><h2>研究进展</h2>{state.tasks.length === 0 && <p className="muted">开始一项研究后，进度和结果会出现在这里。</p>}{state.tasks.map(task => <article className="task" key={task.id} data-task-id={task.id}><span className="task-status">{statuses[task.status]}</span><h3>{task.title}</h3><p>{task.resultTaskId ? `已处理 ${task.evaluated} / ${task.requested} 条记录 · 本轮合格记录 ${task.matched} 条` : `已核验 ${task.evaluated} · ${task.parentCampaignId ? '研究组预选' : '已入选'} ${task.matched} / ${task.requested}`}</p><small>{task.detail}</small>{task.status === 'needs_input' && <button onClick={() => setDesktopOpen(true)}>打开桌面协助</button>}<button className="quiet" onClick={() => setResultTask(task.resultTaskId ?? task.id)}>查看结果</button></article>)}<div className="desk-note"><span>有依据的选择</span><p>每位创作者的判断都会保留来源；信息不足时，会明确告诉你。</p></div></aside></main>{campaignOpen && <Campaigns onClose={() => setCampaignOpen(false)} />}{desktopOpen && <Desktop onClose={() => setDesktopOpen(false)} />}{inspecting && <Inspector onClose={() => setInspecting(false)} />}{resultTask && <Results taskId={resultTask} onClose={() => setResultTask(undefined)} />}</div>;
}
