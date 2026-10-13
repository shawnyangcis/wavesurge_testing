import type { DesktopBroker } from './desktop.ts';
import type { Tools } from './agent.ts';
import type { ResearchEngine } from './research.ts';
import type { Result } from '../shared/research.ts';
import { searchSchema } from '../shared/research.ts';
import { registerWork } from './work-delivery.ts';
import { reportResults } from './report-scope.ts';
import { filterResults, type ResultFilter } from './result-filter.ts';
import { researchExecution } from './execution-policy.ts';
export function researchTools(engine: ResearchEngine, base: Tools, desktop?: DesktopBroker): Tools {
  return { definitions: [...base.definitions,
    { type: 'function', function: { name: 'skip_browser_assistance', description: '仅在用户明确跳过当前登录/验证或无法协助时使用：结束指定原任务当前的协助，缺证保留unknown并继续原候选，不改变该任务后续协助许可、筛选口径或其它任务。长期只用公开资料应改用set_research_execution。', parameters: { type: 'object', required: ['taskId'], additionalProperties: false, properties: { taskId: { type: 'string', minLength: 1 } } } } },
    { type: 'function', function: { name: 'set_research_execution', description: '按用户最新授权修改进行中的研究或已有结果重核验任务的人工协助偏好，不改筛选口径、不新建/取消任务。重核验默认继承原研究当前许可，指定重核验taskId可只改这次工作的许可。allowHumanAssistance=false 表示只使用无需人工登录的公开资料，仍可浏览公开媒体，访问阻塞保持unknown并继续；若该任务已等待协助，撤销其请求并恢复原候选。不能释放其他任务的桌面。', parameters: { type: 'object', required: ['taskId', 'allowHumanAssistance'], additionalProperties: false, properties: { taskId: { type: 'string', minLength: 1 }, allowHumanAssistance: { type: 'boolean' } } } } },
    { type: 'function', function: { name: 'start_research', description: '登记单项已授权研究；同次请求的多项研究必须使用 start_research_batch 一次完整登记。人工占用桌面不阻止登记：browser/auto 的浏览器核验自动排队，text 独立执行，不必退回 Campaign 草案。Instagram 使用 GET 账号关键词搜索，instagram.queries 为简短关键词、version 默认 v3。YouTube/TikTok/X 只读已有 creator pool，不自动付费搜索。不能因进度提问重启任务。personaText 只描述候选主题，不写最终人数、核验预算或跨组去重；每组本地独立读取，跨组去重由本地完成。regions 使用明确的英文国家名；地区指 Creator 所在地。personaText 只用于召回，不保证定性要求；用户要求的科技内容/性别/职业/外观等每一项限制必须单独加入criteria，不得只写在画像里。族裔单列reviewOnly=true、required=false、basis=text，不要求本人额外自述；无明确资料待人工确认，其他限制仍为必选。偏好必须按用户明确口径，不能将 geek 风擅自扩大成任何科技主题。视觉条件 basis=visual，自述/内容文字=text；偏好 required=false。candidateBudget 是基础可行者的逐人分析上限，至少等于目标人数；指定全分析名单按实际身份全覆盖。', parameters: searchSchema } },
    { type: 'function', function: { name: 'start_research_batch', description: '一次原子登记同次用户请求中所有已授权的独立研究，每项完整 SearchSpec，任何项无效则整批不登记。桌面由人工操作时也可立即登记：text 继续独立核验，browser/auto 只等待桌面，不丢失网页工作；用户明确要求打开本人主页选 browser，取得本轮页面证据，不能仅用已有文字充当网页核验。不需要让用户重新确认已明确授权的直接筛选；不能只启动第一项而在口头承诺稍后第二项。返回真实工作清单，全部终态后才有一次综合交付。', parameters: { type: 'object', required: ['specs'], additionalProperties: false, properties: { specs: { type: 'array', minItems: 2, maxItems: 10, items: searchSchema } } } } },
    { type: 'function', function: { name: 'cancel_research', description: '仅当用户明确要求时停止指定本地任务。不能保证远端搜索取消。', parameters: { type: 'object', required: ['taskId'], properties: { taskId: { type: 'string', minLength: 1 } }, additionalProperties: false } } },
    { type: 'function', function: { name: 'enrich_results', description: '对已有结果后台补标或重新核验，保留账号、原条件与审计版本，不重新调用 WaveSurge。mode=annotate 只用已有证据补充实际画像值且保留原条件判断；mode=reverify 重新浏览核验当前条件。annotations 指画像维度，不是筛选条件。返回真实后台任务，完成后在 chat 交付更新报告。', parameters: { type: 'object', required: ['taskId', 'mode'], additionalProperties: false, properties: { taskId: { type: 'string' }, mode: { enum: ['annotate', 'reverify'] }, resultIds: { type: 'array', uniqueItems: true, items: { type: 'string' } }, annotations: searchSchema.properties.annotations } } } },
    { type: 'function', function: { name: 'get_results', description: '分页查询已保存的核验结果与标签，包括待核实和不合格者。只需要合格名单时使用verdict=match，不读取全部未知者。tagMode=exact按完整实际标签值筛选；contains按文字包含，可能含否定标签。返回total、qualifiedRecords、selectedRecords、offset、limit、results；最多每页20条，图片仅返回数量，完整原始资料与媒体链接在报告中，避免撑大主对话上下文。', parameters: { type: 'object', properties: { taskId: { type: 'string' }, verdict: { enum: ['match','no_match','unknown'] }, tag: { type: 'string' }, tagMode: { type: 'string', enum: ['exact', 'contains'] }, offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 20 } }, additionalProperties: false } } }
  ], async execute(name, args, callId) {
    if (name === 'skip_browser_assistance') {
      const input = args as { taskId?: unknown } | null;
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'taskId') || typeof input.taskId !== 'string' || !input.taskId) throw new Error('请提供当前协助对应的原任务编号');
      const request = desktop?.active();
      if (!request || request.taskId !== input.taskId) throw new Error('指定任务没有正在等待的人工协助，未改变其它工作');
      const outcome = await desktop!.release(request.id, '用户明确跳过本次验证，未完成登录或挑战；未确认条件保持unknown，不重复请求同一挑战，继续原候选。后续候选的协助许可不变。');
      void engine.wake(); return { request: outcome, task: engine.store.task(input.taskId) };
    }
    if (name === 'set_research_execution') {
      const input = args as { taskId?: unknown; allowHumanAssistance?: unknown } | null;
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['taskId', 'allowHumanAssistance'].includes(key)) || typeof input.taskId !== 'string' || !input.taskId || typeof input.allowHumanAssistance !== 'boolean') throw new Error('请提供任务编号和布尔值人工协助偏好');
      const task = engine.store.task<import('./research.ts').ResearchTask>(input.taskId);
      const scope = task?.spec ?? (task?.resultTaskId ? engine.store.task<import('./research.ts').ResearchTask>(task.resultTaskId)?.spec : undefined);
      if (!task || !scope || !['queued', 'running', 'needs_input'].includes(task.status)) throw new Error('只能修改进行中的真实研究或已有结果分析，已保存结论与筛选口径保持原样');
      engine.store.set('research-execution', task.id, { allowHumanAssistance: input.allowHumanAssistance, updatedAt: engine.now() });
      const request = desktop?.active();
      if (!input.allowHumanAssistance && request?.taskId === task.id) await desktop!.release(request.id, '用户明确跳过登录及人工协助，只使用公开资料；未确认条件保持unknown');
      void engine.wake();
      return { task: engine.store.task(task.id), executionPolicy: researchExecution(engine.store, task.id, task.spec) };
    }
    if (name === 'start_research_batch') {
      if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(key => key !== 'specs') || !Array.isArray((args as { specs?: unknown }).specs)) throw new Error('请提供完整的多项研究范围');
      const specs = (args as { specs: unknown[] }).specs; if (specs.length < 2 || specs.length > 10) throw new Error('同批研究需要2到10项');
      const tasks = engine.store.transaction(() => specs.map((spec, index) => { const task = engine.start(spec, `${callId}|${index}`); registerWork(engine.store, callId, { kind: 'research', id: task.id, title: task.title, reportUrl: `/api/reports/${task.id}` }); return engine.store.task(task.id); }));
      void engine.wake(); return { tasks, delivery: '全部登记的工作结束后一次综合交付；桌面等待不影响文字核验' };
    }
    if (name === 'enrich_results') { const task = engine.enrichment.start(args, callId); registerWork(engine.store, callId, { kind: 'enrichment', id: task.id, title: task.title, reportUrl: `/api/reports/${task.resultTaskId}` }); void engine.wake(); return engine.store.task(task.id); }
    if (name === 'start_research') { const task = engine.start(args, callId); registerWork(engine.store, callId, { kind: 'research', id: task.id, title: task.title, reportUrl: `/api/reports/${task.id}` }); void engine.wake(); return engine.store.task(task.id); }
    if (name === 'cancel_research') {
      const taskId = (args as { taskId?: unknown } | null)?.taskId;
      if (typeof taskId !== 'string' || !taskId) throw new Error('请提供真实任务编号');
      const task = engine.cancel(taskId); const request = desktop?.active(); if (request?.taskId === taskId) { await desktop!.release(request.id, '用户取消原任务，协助授权已撤销'); void engine.wake(); } return task;
    }
    if (name === 'get_results') {
      const filters = args as { taskId?: unknown; verdict?: unknown; tag?: unknown; tagMode?: unknown; offset?: unknown; limit?: unknown } | null;
      if (!filters || typeof filters !== 'object' || Array.isArray(filters) || filters.taskId !== undefined && typeof filters.taskId !== 'string' || filters.verdict !== undefined && !['match','no_match','unknown'].includes(filters.verdict as string) || filters.tag !== undefined && typeof filters.tag !== 'string' || filters.tagMode !== undefined && !['exact', 'contains'].includes(filters.tagMode as string) || filters.offset !== undefined && (!Number.isInteger(filters.offset) || (filters.offset as number) < 0) || filters.limit !== undefined && (!Number.isInteger(filters.limit) || (filters.limit as number) < 1 || (filters.limit as number) > 20)) throw new Error('结果查询参数不正确');
      const records = filters.taskId ? engine.results(filters.taskId as string) : engine.store.list<Result>('result');
      const all = reportResults(engine.store, filterResults(records, filters as ResultFilter));
      const offset = (filters.offset as number | undefined) ?? 0; const limit = (filters.limit as number | undefined) ?? 20;
      return { total: all.length, qualifiedRecords: all.filter(result => result.verdict === 'match').length, selectedRecords: all.filter(result => result.selected && result.verdict === 'match').length, offset, limit, results: all.slice(offset, offset + limit).map(result => ({ id: result.id, taskId: result.taskId, verdict: result.verdict, tags: result.tags, judgments: result.judgments, annotations: result.annotations, revision: result.revision, selected: result.selected, reportContext: result.reportContext, creator: { id: result.creator.id, platform: result.creator.platform, handle: result.creator.handle, displayName: result.creator.displayName, followers: result.creator.followers, region: result.creator.region, facts: result.creator.facts, engagement: result.creator.engagement, photoUrlCount: result.creator.photoUrls?.length ?? 0, profileUrl: result.creator.profileUrl }, reportUrl: `/api/reports/${result.taskId}` })) };
    }
    return base.execute(name, args, callId);
  } };
}
