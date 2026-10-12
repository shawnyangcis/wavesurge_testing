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
import { researchExecution } from './execution-policy.ts';
import { addProfileLinks, profileLinkFor, linkedProof } from './profile-links.ts';
type VerificationSession = { messages: ChatMessage[]; pending: ChatMessage | null; fresh: boolean; startedAt?: number; judgments?: Judgment[]; assessment?: Assessment; evidence?: Evidence[]; siteTexts?: Record<string, string> };
const browserPrompt = `追加工作流：有头浏览器逐人核验。文字、事实和画像提交遵守前面的核验规则；以下只规定浏览器访问和人工协助。本人简介的所在地可能写成“📍Texas”或单独一行“Baltimore, MD”；可以提交完整原文，程序只对明确国家和已知地区/地址进行保守归一，未知或含糊地点不猜。
根据 spec.verificationMode 行动：auto 优先利用已有可靠文字，必要时取得页面和真实像素；browser 必须取得本轮当前创作者本人主页的实际观察，旧文字、帖子页或媒体资源不能替代这一主页访问。访问失败、登录/错误页不能作为主页核验成功或创作者条件通过的证据。
用户要求本人Geek/书卷形象时，必须在实际画面看到并确认本人及相应形象，书本静物、桌面静物或内容主题不足以证明本人形象。要求日常框架眼镜时，墨镜、护目镜、面罩不能算通过；单张未戴镜画面也不证明始终不戴，缺证保持unknown。按spec的原文口径核验，不自行放宽条件凑配额。
navigate 优先用 evidenceId 引用给定媒体或帖子，由程序恢复完整链接，避免长资源链接复制错误；也可使用给出的 profileUrl、evidence.url 或当前页面返回的真实 links，不猜 URL。先定位当前候选，不能把上一个候选页面当作证据。click/fill/key 必须使用最新 observationId，动作后读取更新的观察，旧 ID 不可复用。只依据实际传入且确认属于本人的内容截图判断视觉条件，不从外观推断族裔。
本人简介没有所在地时，可按给出的profile_link访问公开网站或关联主页，再沿实际页面链接找本人介绍。profile_link只说明该账号填写过链接，不自动确认归属；linked_snapshot尚未确认身份，不能作为本人条件通过的证据。linked_profile_snapshot表示程序确认了回链，或同名域名加本人姓名的关联，仍须核对页面主语与内容。网站客户评价里的国家、观众所在国、公司地址、币种、域名和历史求学/实习/旅行地点都不能当作当前本人所在地。来自关联网站的country事实必须引用完整本人所在地声明，如I live in、I am based in、Based in或Location，不提交孤立的国家名；仍不足就unknown。关联网站的粉丝数不能覆盖当前Instagram粉丝。不要因为第一张照片无人物而打开无关网站搜人。
Instagram 已取得的原始简介和帖子文字可判断文字条件；需要视觉证据时优先访问给出的 post_photo 资源，观察真实像素，并核实归属和发布时间。媒体预览中的 parentEvidenceId 和 parentPostUrl 由程序从原始帖与素材关系生成，按它找到对应文字、日期和原帖，不能仅按排列顺序猜关联。auto 不必为了已有充分文字额外打开登录页；browser 的本轮本人主页访问仍是必需条件。头像和视频封面不能当作照片帖；已实际观察且确认归属的视频封面像素可以支持封面中可见的眼镜或呈现风格，但须说明来源是封面，不能声称看过视频或取得照片帖。首张照片只有商品或书籍、无法判断本人时，优先选本人自我介绍、第一人称出镜或相关活动的素材；最多观察6条相关素材再说明缺口，不能仅凭首张无人物就认定整位无法核验。若需多张独立素材，可在同一轮返回多个navigate工具调用，程序逐个取得观察后再统一判断，减少无效模型往返。基础条件或必选个人身份已明确不符时可结束，不额外浏览凑证据。媒体资源失效可尝试原帖，仍不足时为 unknown。
禁止输入密码/验证码、付款、发消息、关注或点赞。遵循本轮 executionPolicy：allowHumanAssistance=true 且完成所要求的页面核验需要登录、验证码或人工挑战时，调用 request_human_assistance 保存原因并等待用户操作；false 时只访问无需人工登录的公开资料，阻塞部分提交 unknown 并继续，不申请协助、不尝试绕过。交还后必须重新观察，不重放旧点击；人类明确跳过或无法完成时，未确认部分提交 unknown，不反复申请同一挑战。人工完成声明本身不是平台证据。
每轮以工具取得证据或用 submit_judgments 提交判断；单次执行最多 10 次模型调用，信息不足如实提交 unknown，不能为结束任务编造通过。`;

export function judgmentTool(spec: SearchSpec): ToolDefinition {
  return { type: 'function', function: { name: 'submit_judgments', description: '提交逐条件三态判断与来源引用。spec.criteria为空时judgments必须为空数组，不存在任何占位条件。', parameters: { type: 'object', required: ['judgments'], additionalProperties: false, properties: { annotations: { type: 'array', maxItems: 10, items: { type: 'object', required: ['dimensionId', 'status', 'values', 'reason', 'evidenceIds'], additionalProperties: false, properties: { dimensionId: { type: 'string', enum: spec.annotations?.length ? spec.annotations.map(item => item.id) : ['__no_annotations'] }, status: { enum: ['supported', 'unknown'] }, values: { type: 'array', maxItems: 30, items: { type: 'string', minLength: 1, maxLength: 100 } }, reason: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } } } } }, facts: { type: 'array', maxItems: 10, items: { type: 'object', required: ['kind', 'rawValue', 'evidenceIds'], additionalProperties: false, properties: { kind: { enum: ['followers', 'country'] }, rawValue: { type: 'string', minLength: 1, maxLength: 200 }, evidenceIds: { type: 'array', items: { type: 'string' } } } } }, judgments: { type: 'array', maxItems: spec.criteria.length, items: { type: 'object', required: ['criterionId', 'verdict', 'reason', 'evidenceIds'], additionalProperties: false, properties: { criterionId: { type: 'string', ...(spec.criteria.length ? { enum: spec.criteria.map(item => item.id) } : {}) }, verdict: { type: 'string', enum: ['match', 'no_match', 'unknown'] }, reason: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } } } } } } } } };
}
const browserTools: ToolDefinition[] = [
  { type: 'function', function: { name: 'browser', description: '操作同一个持久有头浏览器。observe 读取当前页；navigate 仅访问证据中真实 HTTP 链接。其他动作需要最新 observationId。禁止输入登录凭据或进行外联。', parameters: { type: 'object', required: ['action'], additionalProperties: false, properties: { action: { enum: ['observe', 'navigate', 'click', 'fill', 'key'] }, url: { type: 'string' }, evidenceId: { type: 'string', minLength: 1, maxLength: 100 }, selector: { type: 'string' }, text: { type: 'string' }, observationId: { type: 'string' } } } } },
  { type: 'function', function: { name: 'request_human_assistance', description: '遇到需要登录、验证码、访问挑战时暂停原候选研究，等待用户通过同一 noVNC 桌面协助。', parameters: { type: 'object', required: ['reason'], additionalProperties: false, properties: { reason: { type: 'string', minLength: 1, maxLength: 1000 } } } } }
];
export function browserVerifier(model: Model, settings: SettingsManager, desktop: DesktopBroker, store: Store) {
  return async (spec: SearchSpec, creator: Creator, taskId: string): Promise<Judgment[] | Assessment> => {
    const id = `${taskId}|${creator.id}`; const session = store.get<VerificationSession>('verification', id) ?? { messages: [], pending: null, fresh: false };
    if (spec.verificationMode === 'browser') { session.startedAt ??= Date.now(); creator.browserVerification = { startedAt: session.startedAt, profileEvidenceIds: (session.evidence ?? []).map(source => source.id) }; store.set('verification', id, session); }
    for (const evidence of session.evidence ?? []) if (!creator.evidence.some(item => item.id === evidence.id)) creator.evidence.push(evidence);
    addProfileLinks(creator);
    const preview = verificationCreator(creator);
    await desktop.scope?.([...new Set([creator.profileUrl, ...preview.evidence.map(item => item.url), ...creator.evidence.map(item => item.url)])].filter(url => /^https?:\/\//.test(url)).slice(0, 100));
    const save = () => store.set('verification', id, session);
    const blocked = (observation: SavedObservation) => ({ url: observation.url, title: observation.title, text: observation.text.slice(0, 3000), observationId: observation.observationId });
    const explain = (error: Error, observation?: SavedObservation) => session.messages.push({ role: 'user', content: JSON.stringify({ profileUrl: creator.profileUrl, error: error.message, ...(observation ? { blockedObservation: blocked(observation) } : {}), instruction: '这是访问失败或未确认归属的操作上下文，不是本创作者证据，也不是主页访问成功。按最新executionPolicy处理登录/验证码：允许协助才请求，禁止协助或人工明确跳过时提交unknown并继续。不能把之前其他页面或登录页当作本人证据。' }) });
    const validateObservation = (observation: SavedObservation) => {
      const observed = new URL(observation.url); const profile = creator.profileUrl ? new URL(creator.profileUrl) : undefined;
      const exactSource = creator.evidence.some(item => { try { const source = new URL(item.url); return source.origin === observed.origin && source.pathname === observed.pathname; } catch { return false; } });
      const ownPage = profile && profile.origin === observed.origin && (profile.pathname.replace(/\/$/, '') === observed.pathname.replace(/\/$/, '') || observed.pathname.startsWith(`${profile.pathname.replace(/\/$/, '')}/`));
      if (!['http:', 'https:'].includes(observed.protocol) || !(exactSource || ownPage || profileLinkFor(creator, observation.url))) throw new Error('当前页面没有确认属于本候选主页、帖子、媒体或声明的关联网站；不能保存空白页或其他账号的观察作为证据');
    };
    const observe = (observation: SavedObservation) => {
      validateObservation(observation);
      const evidenceId = createHash('sha256').update(`${observation.assetId}|${observation.url}|${observation.observedAt}`).digest('hex').slice(0, 24);
      const declared = profileLinkFor(creator, observation.url); const proof = declared && linkedProof(creator, observation.url, observation.text, observation.links);
      if (declared) { session.siteTexts ??= {}; session.siteTexts[evidenceId] = observation.text.slice(0, 12000); }
      if (!creator.evidence.some(item => item.id === evidenceId)) creator.evidence.push({ id: evidenceId, url: observation.url, kind: declared ? proof ? 'linked_profile_snapshot' : 'linked_snapshot' : 'browser_snapshot', text: declared ? observation.text.split(/\s+/u).slice(0, 100).join(' ') : observation.text.slice(0, 12000), provider: 'headed-chromium', publishedAt: null, capturedAt: observation.observedAt, assetId: observation.assetId, ...(declared ? { profileLinkEvidenceId: declared.id, ...(proof ? { linkedIdentityProof: proof } : {}) } : {}) });
      session.evidence = creator.evidence;
      if (spec.verificationMode === 'browser') creator.browserVerification!.profileEvidenceIds = session.evidence.map(source => source.id);
      session.messages.push({ role: 'user', content: [{ type: 'text', text: JSON.stringify({ observation, evidenceId, instruction: '刚取得的实际页面与截图，不能凭空推断发布时间、身份或条件。' }) }, { type: 'image_url', image_url: { url: desktop.image(observation.assetId), detail: 'high' } }] });
    };
    if (session.judgments) return session.assessment ?? session.judgments;
    const introductions = new Set(preview.evidence.filter(item => item.kind === 'post' && /meet.{0,30}(bookstagrammer|creator)|about me|introducing myself|my name is|self[- ]portrait|自我介绍|本人介绍/i.test(item.text)).map(item => item.id));
    const media = preview.evidence.filter(item => ['post_photo', 'video_cover'].includes(item.kind));
    const initialMedia = media.find(item => item.parentEvidenceId && introductions.has(item.parentEvidenceId)) ?? media[0];
    const initialUrl = spec.verificationMode === 'browser' ? creator.profileUrl : creator.raw.instagram ? spec.criteria.some(item => item.basis === 'visual') ? initialMedia?.url : undefined : creator.profileUrl;
    if (!session.messages.length && !session.pending && initialUrl) {
      let observation: SavedObservation | undefined;
      try { observation = await desktop.command({ action: 'navigate', url: initialUrl }); observe(observation); }
      catch (error) { explain(error as Error, observation); }
      save();
    }
    if (session.pending) { session.messages.push(session.pending, ...session.pending.tool_calls!.map(call => ({ role: 'tool' as const, content: JSON.stringify({ error: '进程曾中断；动作结果未知，不能重放旧动作。请重新观察。' }), tool_call_id: call.id }))); session.pending = null; session.fresh = true; save(); }
    if (session.fresh) { const assistance = store.list<Assistance>('assistance').filter(request => request.taskId === taskId && request.creatorId === creator.id && request.status === 'done').at(-1); session.messages.push({ role: 'user', content: JSON.stringify({ humanOutcome: assistance?.outcome ?? '中断后的恢复，没有新的人工完成声明', instruction: '这是当前原工作的人工协助结果。若人类要求跳过或无法完成，停止重复请求该验证，提交 unknown 并解释原因；不能将人工完成声明当作已观察的平台事实。接着读取最新观察。' }) }); let observation: SavedObservation | undefined; try { observation = await desktop.command({ action: 'observe' }); observe(observation); } catch (error) { explain(error as Error, observation); } session.fresh = false; save(); }
    for (let round = 0; round < 10; round++) {
      const policy = researchExecution(store, taskId, spec);
      const answer = await model.complete([{ role: 'system', content: settings.current().systemPrompt }, { role: 'system', content: `${settings.current().verificationPrompt}\n${browserPrompt}\n本轮最新执行偏好：${JSON.stringify(policy)}。它只改变人工协助的许可，不改变必选条件；旧会话中的许可不替代当前值。` }, { role: 'user', content: JSON.stringify({ taskId, spec, creator: verificationCreator(creator), observedAt: new Date().toISOString() }) }, ...session.messages], [judgmentTool(spec), ...browserTools.filter(tool => policy.allowHumanAssistance || tool.function.name !== 'request_human_assistance')], 0, 'browser-verification');
      if (store.get<Task>('task', taskId)?.status === 'cancelled') throw new Error('原任务已取消，未执行模型返回的后续动作');
      if (!answer.tool_calls?.length) { session.messages.push(answer, { role: 'user', content: '请使用工具取得证据或 submit_judgments 提交判断。' }); save(); continue; }
      session.pending = answer; save(); const results: ChatMessage[] = []; const observations: SavedObservation[] = []; let paused: HumanRequired | undefined;
      for (const call of answer.tool_calls) {
        let output: unknown;
        let observation: SavedObservation | undefined;
        try {
          if (paused) throw new Error('原候选已暂停，本动作未开始');
          const args = JSON.parse(call.function.arguments);
          if (call.function.name === 'submit_judgments') { if (!Array.isArray(args.judgments)) throw new Error('模型判断列表格式不正确'); for (const fact of args.facts ?? []) for (const sourceId of fact.evidenceIds ?? []) { const full = session.siteTexts?.[sourceId]; const source = creator.evidence.find(item => item.id === sourceId && item.kind === 'linked_profile_snapshot'); if (source && fact.kind === 'country' && typeof fact.rawValue === 'string' && full?.toLowerCase().replace(/\s+/g, ' ').includes(fact.rawValue.toLowerCase().replace(/\s+/g, ' '))) source.text = `${full.split(/\s+/u).slice(0, 100).join(' ')}\n所在地引用原文：${fact.rawValue}`; } session.judgments = args.judgments; session.assessment = args.annotations || args.facts ? args : undefined; output = { saved: true }; }
          else if (call.function.name === 'browser') {
            if (args.evidenceId !== undefined) {
              const source = creator.evidence.find(item => item.id === args.evidenceId);
              if (args.action !== 'navigate' || !source || args.url !== undefined && args.url !== source.url) throw new Error('请使用当前候选的有效 evidenceId 进行导航，不附带冲突链接');
              args.url = source.url; delete args.evidenceId;
            }
            if (args.action === 'observe' && !session.evidence?.some(item => item.assetId) && !observations.length) throw new Error('尚未定位当前候选；请先 navigate 给出的本人主页、原帖或照片资源，不能观察之前其他候选页面'); observation = await desktop.command(args as DesktopCommand); validateObservation(observation); observations.push(observation); output = observation;
          }
          else if (call.function.name === 'request_human_assistance') { if (!researchExecution(store, taskId, spec).allowHumanAssistance) throw new Error('用户已禁止人工登录及协助；只使用公开资料，阻塞条件提交unknown并继续'); if (typeof args.reason !== 'string' || !args.reason) throw new Error('请描述需要协助的原因'); await desktop.assistance(taskId, creator.id, args.reason); }
          else throw new Error('不存在的工具');
        } catch (error) { if (error instanceof HumanRequired) paused = error; output = { error: (error as Error).message, ...(observation ? { blockedObservation: blocked(observation), instruction: '仅为访问阻塞操作上下文，不是本人证据；遵循最新executionPolicy，允许时请求协助，禁止时保持unknown并继续，不冒充本人页已观察。' } : {}) }; }
        results.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) });
      }
      session.messages.push(answer, ...results); session.pending = null; observations.forEach(observe); if (paused) { session.fresh = true; session.judgments = undefined; session.assessment = undefined; } save();
      if (paused) throw paused;
      if (session.judgments) return session.assessment ?? session.judgments;
    }
    throw new Error('逐人浏览器核验达到执行预算，未确认的条件保持 unknown');
  };
}
