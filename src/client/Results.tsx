import { resultReviewNote } from '../shared/screening.ts';
import { useEffect, useRef, useState } from 'react';
import { api } from './api.ts';
import { platforms } from '../shared/research.ts';
import type { Result } from '../shared/research.ts';
const labels = { match: '符合要求', no_match: '不符合', unknown: '待核实' };
export function Results({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const requestSequence = useRef(0);
  const [applied, setApplied] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [tag, setTag] = useState(''), [tagMode, setTagMode] = useState<'exact' | 'contains'>('exact');
  const [platform, setPlatform] = useState(''), [verdict, setVerdict] = useState(''), [error, setError] = useState('');
  async function refresh(queryOverride?: string) {
    const sequence = ++requestSequence.current; setError('');
    const query = queryOverride ?? `${tag ? `&tag=${encodeURIComponent(tag)}&tagMode=${tagMode}` : ''}${platform ? `&platform=${encodeURIComponent(platform)}` : ''}${verdict ? `&verdict=${encodeURIComponent(verdict)}` : ''}`;
    try {
      const rows = await api<Result[]>(`/results?taskId=${encodeURIComponent(taskId)}&view=summary${query}`);
      if (sequence !== requestSequence.current) return;
      setResults(rows); setApplied(query);
    } catch (e) { if (sequence === requestSequence.current) setError((e as Error).message); }
  }
  useEffect(() => {
    setResults([]); setApplied(''); setTag(''); setTagMode('exact'); setPlatform(''); setVerdict('');
    void refresh('');
    return () => { requestSequence.current++; };
  }, [taskId]);
  return <div className="scrim"><section className="inspector" role="dialog" aria-modal="true" aria-label="研究结果">
    <div className="inspector-heading"><div><span className="eyebrow">RESEARCH / FINDINGS</span><h2>研究结果</h2></div><button className="quiet" onClick={onClose}>关闭</button></div>
    <p className="muted">本次展示：合格 {results.filter(result => result.verdict === 'match').length} 条 · 入选 {results.filter(result => result.verdict === 'match' && result.selected === true).length} 条 · 待核实 {results.filter(result => result.verdict === 'unknown').length} 条 · 不符合 {results.filter(result => result.verdict === 'no_match').length} 条</p>
    <div className="controls"><a className="download" href={`/api/reports/${encodeURIComponent(taskId)}${applied ? `?${applied.slice(1)}` : ''}`} target="_blank" rel="noreferrer">查看报告</a><a className="download" href={`/api/reports/${encodeURIComponent(taskId)}?format=csv${applied}`} download title="导出当前已查询的筛选结果">下载 CSV</a></div>
    <form onSubmit={e => { e.preventDefault(); void refresh(); }}>
      <label>按标签查找<input value={tag} onChange={e => setTag(e.target.value)} placeholder="例如：科技内容" /></label>
      <label>标签匹配方式<select value={tagMode} onChange={e => setTagMode(e.target.value as 'exact' | 'contains')}><option value="exact">精确标签值</option><option value="contains">文字包含（可能包含否定标签）</option></select></label>
      <label>平台<select value={platform} onChange={e => setPlatform(e.target.value)}><option value="">全部平台</option>{platforms.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>判断<select value={verdict} onChange={e => setVerdict(e.target.value)}><option value="">全部判断</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit">查询 / 刷新</button>
    </form>
    {error && <p role="alert">{error}</p>}{results.length === 0 && <p className="muted">暂时没有已保存的核验结果。</p>}
    {results.map(result => <article className="finding" key={result.id} data-result-id={result.id} data-selected={result.verdict === 'match' && result.selected === true}>
      <span className={`verdict ${result.verdict}`}>{result.verdict === 'match' && resultReviewNote(result) ? '符合已核实条件' : labels[result.verdict]}</span><h3>{result.creator.displayName}</h3>
      {result.selected === true && result.verdict === 'match' && <p>已入选</p>}
      {result.selected === false && result.verdict === 'match' && <p>{result.reportContext?.allocatedGroupTitle ? '本组未入选（已分配其他组）' : '合格备选'}</p>}
      {resultReviewNote(result) && <p className="review-note">{resultReviewNote(result)}</p>}
      {result.reportContext && <p>来源任务：{result.reportContext.sourceTaskTitle} · 分组：{result.reportContext.groupTitle} · {result.reportContext.selectionScope === 'campaign' ? 'Campaign 最终分配' : '研究组入选'}{result.reportContext.allocatedGroupTitle && ` · 分配至：${result.reportContext.allocatedGroupTitle}`}</p>}
      <p>{result.creator.platform} · @{result.creator.handle} · {result.creator.followers ?? result.creator.facts?.followers?.rawValue ?? '未知'} 粉丝 · {result.creator.facts?.country?.code ?? result.creator.region ?? '地区待确认'}</p>
      <div className="tags">{result.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      <details><summary>逐条件判断与证据</summary>
        {(result.annotations ?? []).map(item => <div className="judgment" key={item.dimensionId}><strong>{item.dimensionId} · {item.status === 'supported' ? item.values.join('、') : '待核实'}</strong><p>{item.reason}</p></div>)}
        {result.judgments.map(item => <div className="judgment" key={item.criterionId}><strong>{item.label ?? item.criterionId} · {item.reviewOnly && item.verdict === 'unknown' ? '待人工确认' : labels[item.verdict]}</strong><p>{item.reason}</p>{item.evidenceIds.map(id => {
          const evidence = result.creator.evidence.find(source => source.id === id)!;
          return <p key={id}><a href={evidence.url} target="_blank" rel="noreferrer">{evidence.text || '查看原始来源'}</a>{evidence.assetId && <a href={`/api/assets/${encodeURIComponent(evidence.assetId)}`} target="_blank" rel="noreferrer">查看截图证据</a>}<small> {evidence.publishedAt ?? '发布时间待确认'}</small></p>;
        })}</div>)}
      </details>
    </article>)}
  </section></div>;
}
