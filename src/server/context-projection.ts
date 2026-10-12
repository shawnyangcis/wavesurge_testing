import type { ChatMessage } from './model.ts';

// Tool receipts and original history remain intact in SQLite. Signed media URLs
// and raw creator payloads do not belong in every subsequent conversation turn.
export function conversationProjection(messages: ChatMessage[]) {
 const resultCalls = new Set(messages.flatMap(message => (message.tool_calls ?? []).filter(call => call.function.name === 'get_results').map(call => call.id)));
 return messages.map(message => {
  if (message.role !== 'tool' || !resultCalls.has(message.tool_call_id!)) return message;
  try {
   const data = JSON.parse(message.content as string);
   const results = Array.isArray(data) ? data : data.results;
   if (!Array.isArray(results)) return message;
   const projected = results.map(result => {
    if (!result?.creator) return result;
    const c = result.creator;
    const { raw: _raw, evidence: _evidence, photoUrls: photos, ...creator } = c;
    return { ...result, creator: { ...creator, photoUrlCount: c.photoUrlCount ?? photos?.length ?? 0 } };
   });
   return { ...message, content: JSON.stringify(Array.isArray(data) ? projected : { ...data, results: projected }) };
  } catch { return message; }
 });
}
export function compressionProjection(messages: ChatMessage[]) {
 return conversationProjection(messages).map(message => {
  if (Array.isArray(message.content)) return { ...message, content: message.content.map(part => part.type === 'image_url' ? { type: 'text' as const, text: '[旧参考图片保留在原始对话；摘要不能代替图片观察，需要时召回原始记录。]' } : part) };
  if (message.role !== 'tool') return message;
  try {
   const data = JSON.parse(message.content as string); const results = Array.isArray(data) ? data : data.results;
   if (!Array.isArray(results) || results.some(result => !result?.creator)) return message;
   const priority = [...results.filter(result => result.selected || result.verdict === 'match'), ...results.filter(result => !result.selected && result.verdict !== 'match')];
   const rows = priority.slice(0, 5).map(result => ({ id: result.id, taskId: result.taskId, verdict: result.verdict, selected: result.selected, tags: result.tags, reportUrl: result.reportUrl, creator: { id: result.creator.id, platform: result.creator.platform, handle: result.creator.handle, followers: result.creator.followers, country: result.creator.facts?.country?.code, profileUrl: result.creator.profileUrl }, judgments: result.judgments?.map((item: { criterionId: string; verdict: string; reason: string; evidenceIds: string[] }) => ({ criterionId: item.criterionId, verdict: item.verdict, reason: item.reason.slice(0, 160), evidenceIds: item.evidenceIds })) }));
   return { ...message, content: JSON.stringify({ ...(Array.isArray(data) ? { total: results.length } : data), results: rows, omittedResultCount: Math.max(0, results.length - rows.length), omittedDetails: '原始回执和报告保留完整数据，不得把省略当作未执行或未知。' }) };
  } catch { return message; }
 });
}
