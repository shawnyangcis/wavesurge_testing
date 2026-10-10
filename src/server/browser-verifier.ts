import { createHash } from 'node:crypto';
import type { Model, ChatMessage, ToolDefinition } from './model.ts';
import type { SettingsManager } from './settings.ts';
import type { Store } from './store.ts';
import { HumanRequired } from './desktop.ts';
import type { Assistance, DesktopBroker, SavedObservation } from './desktop.ts';
import type { Assessment, Creator, Evidence, Judgment, SearchSpec } from '../shared/research.ts';
import type { Task } from '../shared/contracts.ts';
import type { DesktopCommand } from '../desktop/runtime.ts';
import { verificationCreator } from './instagram.ts';
type VerificationSession = { messages: ChatMessage[]; pending: ChatMessage | null; fresh: boolean; startedAt?: number; judgments?: Judgment[]; assessment?: Assessment; evidence?: Evidence[] };
const browserPrompt = `追加工作流：有头浏览器逐人核验。文字、事实和画像提交遵守前面的核验规则；以下只规定浏览器访问和人工协助。
根据 spec.verificationMode 行动：auto 优先利用已有可靠文字，必要时取得页面和真实像素；browser 必须取得本轮当前创作者本人主页的实际观察，旧文字、帖子页或媒体资源不能替代这一主页访问。访问失败、登录/错误页不能作为主页核验成功或创作者条件通过的证据。
navigate 仅使用给出的 profileUrl、evidence.url 或当前页面返回的真实 links，不猜 URL；先定位当前候选，不能把上一个候选页面当作证据。click/fill/key 必须使用最新 observationId，动作后读取更新的观察，旧 ID 不可复用。只依据实际传入且确认属于本人的内容截图判断视觉条件，不从外观推断族裔。
Instagram 已取得的原始简介和帖子文字可判断文字条件；需要视觉证据时优先访问给出的 post_photo 资源，观察真实像素，并核实归属和发布时间。auto 不必为了已有充分文字额外打开登录页；browser 的本轮本人主页访问仍是必需条件。头像和视频封面不能当作照片帖，媒体资源失效可尝试原帖，仍不足时为 unknown。
禁止输入密码/验证码、付款、发消息、关注或点赞。完成本次所要求的页面核验需要登录、验证码或人工挑战时，调用 request_human_assistance 保存阻塞原因，暂停原候选并等待用户操作，不尝试绕过，不要求无关站点登录。交还后必须重新观察，不重放旧点击；人类明确跳过或无法完成时，未确认部分提交 unknown，不反复申请同一挑战。人工完成声明本身不是平台证据。
每轮以工具取得证据或用 submit_judgments 提交判断；单次执行最多 10 次模型调用，信息不足如实提交 unknown，不能为结束任务编造通过。`;

export function judgmentTool(spec: SearchSpec): ToolDefinition {
  return { type: 'function', function: { name: 'submit_judgments', description: '提交逐条件三态判断与来源引用。spec.criteria为空时judgments必须为空数组，不存在任何占位条件。', parameters: { type: 'object', required: ['judgments'], additionalProperties: false, properties: { annotations: { type: 'array', maxItems: 10, items: { type: 'object', required: ['dimensionId', 'status', 'values', 'reason', 'evidenceIds'], additionalProperties: false, properties: { dimensionId: { type: 'string', enum: spec.annotations?.length ? spec.annotations.map(item => item.id) : ['__no_annotations'] }, status: { enum: ['supported', 'unknown'] }, values: { type: 'array', maxItems: 30, items: { type: 'string', minLength: 1, maxLength: 100 } }, reason: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } } } } }, facts: { type: 'array', maxItems: 10, items: { type: 'object', required: ['kind', 'rawValue', 'evidenceIds'], additionalProperties: false, properties: { kind: { enum: ['followers', 'country'] }, rawValue: { type: 'string', minLength: 1, maxLength: 200 }, evidenceIds: { type: 'array', items: { type: 'string' } } } } }, judgments: { type: 'array', maxItems: spec.criteria.length, items: { type: 'object', required: ['criterionId', 'verdict', 'reason', 'evidenceIds'], additionalProperties: false, properties: { criterionId: { type: 'string', ...(spec.criteria.length ? { enum: spec.criteria.map(item => item.id) } : {}) }, verdict: { type: 'string', enum: ['match', 'no_match', 'unknown'] }, reason: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } } } } } } } } };
}
const browserTools: ToolDefinition[] = [
  { type: 'function', function: { name: 'browser', description: '操作同一个持久有头浏览器。observe 读取当前页；navigate 仅访问证据中真实 HTTP 链接。其他动作需要最新 observationId。禁止输入登录凭据或进行外联。', parameters: { type: 'object', required: ['action'], additionalProperties: false, properties: { action: { enum: ['observe', 'navigate', 'click', 'fill', 'key'] }, url: { type: 'string' }, selector: { type: 'string' }, text: { type: 'string' }, observationId: { type: 'string' } } } } },
  { type: 'function', function: { name: 'request_human_assistance', description: '遇到需要登录、验证码、访问挑战时暂停原候选研究，等待用户通过同一 noVNC 桌面协助。', parameters: { type: 'object', required: ['reason'], additionalProperties: false, properties: { reason: { type: 'string', minLength: 1, maxLength: 1000 } } } } }
];
export function browserVerifier(model: Model, settings: SettingsManager, desktop: DesktopBroker, store: Store) {
  return async (spec: SearchSpec, creator: Creator, taskId: string): Promise<Judgment[] | Assessment> => {
    const id = `${taskId}|${creator.id}`; const session = store.get<VerificationSession>('verification', id) ?? { messages: [], pending: null, fresh: false };
    if (spec.verificationMode === 'browser') { session.startedAt ??= Date.now(); creator.browserVerification = { startedAt: session.startedAt, profileEvidenceIds: (session.evidence ?? []).map(source => source.id) }; store.set('verification', id, session); }
    for (const evidence of session.evidence ?? []) if (!creator.evidence.some(item => item.id === evidence.id)) creator.evidence.push(evidence);
    await desktop.scope?.([creator.profileUrl, ...creator.evidence.map(item => item.url)].filter(url => /^https?:\/\//.test(url)).slice(0, 100));
    const save = () => store.set('verification', id, session);
    const blocked = (observation: SavedObservation) => ({ url: observation.url, title: observation.title, text: observation.text.slice(0, 3000), observationId: observation.observationId });
    const explain = (error: Error, observation?: SavedObservation) => session.messages.push({ role: 'user', content: JSON.stringify({ profileUrl: creator.profileUrl, error: error.message, ...(observation ? { blockedObservation: blocked(observation) } : {}), instruction: '这是访问失败或未确认归属的操作上下文，不是本创作者证据，也不是主页访问成功。若完成所要求的页面核验需要登录/验证码/人工挑战，请 request_human_assistance。人工明确跳过或无法完成时提交 unknown，不重复请求同一挑战，不能把之前其他页面或登录页当作本人证据。' }) });
    const validateObservation = (observation: SavedObservation) => {
      const observed = new URL(observation.url); const profile = creator.profileUrl ? new URL(creator.profileUrl) : undefined;
      const exactSource = creator.evidence.some(item => { try { const source = new URL(item.url); return source.origin === observed.origin && source.pathname === observed.pathname; } catch { return false; } });
      const ownPage = profile && profile.origin === observed.origin && (profile.pathname.replace(/\/$/, '') === observed.pathname.replace(/\/$/, '') || observed.pathname.startsWith(`${profile.pathname.replace(/\/$/, '')}/`));
      if (!['http:', 'https:'].includes(observed.protocol) || !(exactSource || ownPage)) throw new Error('当前页面没有确认属于本候选主页、帖子或媒体；不能保存空白页或其他账号的观察作为证据');
    };
    const observe = (observation: SavedObservation) => {
      validateObservation(observation);
      const evidenceId = createHash('sha256').update(`${observation.assetId}|${observation.url}|${observation.observedAt}`).digest('hex').slice(0, 24);
      if (!creator.evidence.some(item => item.id === evidenceId)) creator.evidence.push({ id: evidenceId, url: observation.url, kind: 'browser_snapshot', text: observation.text.slice(0, 12000), provider: 'headed-chromium', publishedAt: null, capturedAt: observation.observedAt, assetId: observation.assetId });
      session.evidence = creator.evidence;
      if (spec.verificationMode === 'browser') creator.browserVerification!.profileEvidenceIds = session.evidence.map(source => source.id);
      session.messages.push({ role: 'user', content: [{ type: 'text', text: JSON.stringify({ observation, evidenceId, creatorEvidence: creator.evidence, instruction: '刚取得的实际页面与截图，不能凭空推断发布时间、身份或条件。' }) }, { type: 'image_url', image_url: { url: desktop.image(observation.assetId), detail: 'high' } }] });
    };
    if (session.judgments) return session.assessment ?? session.judgments;
    const initialUrl = spec.verificationMode === 'browser' ? creator.profileUrl : creator.raw.instagram ? spec.criteria.some(item => item.basis === 'visual') ? creator.evidence.find(item => item.kind === 'post_photo')?.url : undefined : creator.profileUrl;
    if (!session.messages.length && !session.pending && initialUrl) {
      let observation: SavedObservation | undefined;
      try { observation = await desktop.command({ action: 'navigate', url: initialUrl }); observe(observation); }
      catch (error) { explain(error as Error, observation); }
      save();
    }
    if (session.pending) { session.messages.push(session.pending, ...session.pending.tool_calls!.map(call => ({ role: 'tool' as const, content: JSON.stringify({ error: '进程曾中断；动作结果未知，不能重放旧动作。请重新观察。' }), tool_call_id: call.id }))); session.pending = null; session.fresh = true; save(); }
    if (session.fresh) { const assistance = store.list<Assistance>('assistance').filter(request => request.taskId === taskId && request.creatorId === creator.id && request.status === 'done').at(-1); session.messages.push({ role: 'user', content: JSON.stringify({ humanOutcome: assistance?.outcome ?? '中断后的恢复，没有新的人工完成声明', instruction: '这是当前原工作的人工协助结果。若人类要求跳过或无法完成，停止重复请求该验证，提交 unknown 并解释原因；不能将人工完成声明当作已观察的平台事实。接着读取最新观察。' }) }); let observation: SavedObservation | undefined; try { observation = await desktop.command({ action: 'observe' }); observe(observation); } catch (error) { explain(error as Error, observation); } session.fresh = false; save(); }
    for (let round = 0; round < 10; round++) {
      const answer = await model.complete([{ role: 'system', content: settings.current().systemPrompt }, { role: 'system', content: `${settings.current().verificationPrompt}\n${browserPrompt}` }, { role: 'user', content: JSON.stringify({ taskId, spec, creator: verificationCreator(creator), observedAt: new Date().toISOString() }) }, ...session.messages], [judgmentTool(spec), ...browserTools], 0, 'browser-verification');
      if (store.get<Task>('task', taskId)?.status === 'cancelled') throw new Error('原任务已取消，未执行模型返回的后续动作');
      if (!answer.tool_calls?.length) { session.messages.push(answer, { role: 'user', content: '请使用工具取得证据或 submit_judgments 提交判断。' }); save(); continue; }
      session.pending = answer; save(); const results: ChatMessage[] = []; const observations: SavedObservation[] = []; let paused: HumanRequired | undefined;
      for (const call of answer.tool_calls) {
        let output: unknown;
        let observation: SavedObservation | undefined;
        try {
          if (paused) throw new Error('原候选已暂停，本动作未开始');
          const args = JSON.parse(call.function.arguments);
          if (call.function.name === 'submit_judgments') { if (!Array.isArray(args.judgments)) throw new Error('模型判断列表格式不正确'); session.judgments = args.judgments; session.assessment = args.annotations || args.facts ? args : undefined; output = { saved: true }; }
          else if (call.function.name === 'browser') { if (args.action === 'observe' && !session.evidence?.some(item => item.assetId) && !observations.length) throw new Error('尚未定位当前候选；请先 navigate 给出的本人主页、原帖或照片资源，不能观察之前其他候选页面'); observation = await desktop.command(args as DesktopCommand); validateObservation(observation); observations.push(observation); output = observation; }
          else if (call.function.name === 'request_human_assistance') { if (typeof args.reason !== 'string' || !args.reason) throw new Error('请描述需要协助的原因'); await desktop.assistance(taskId, creator.id, args.reason); }
          else throw new Error('不存在的工具');
        } catch (error) { if (error instanceof HumanRequired) paused = error; output = { error: (error as Error).message, ...(observation ? { blockedObservation: blocked(observation), instruction: '仅为访问阻塞操作上下文，不是本人证据；需要登录或人工挑战时请求协助，不冒充本人页已观察。' } : {}) }; }
        results.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) });
      }
      session.messages.push(answer, ...results); session.pending = null; observations.forEach(observe); if (paused) { session.fresh = true; session.judgments = undefined; session.assessment = undefined; } save();
      if (paused) throw paused;
      if (session.judgments) return session.assessment ?? session.judgments;
    }
    throw new Error('逐人浏览器核验达到执行预算，未确认的条件保持 unknown');
  };
}
