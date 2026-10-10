# WaveSurge Creator 筛选应用独立 Review 与测试报告

日期：2026-10-10（Asia/Shanghai）  
对象：本项目当前源码与 http://127.0.0.1:3000 的 Docker 运行实例  
审查状态：阶段性审查；未完成所有功能及原题完整端到端验收，产品尚不具备“所有题目要求均通过验收”的证据。

> 本文记录第一轮验证。后续已补测更多浏览器流程，原题与新Campaign已实际确认启动，但仍等待真实候选。两个P1缺陷现已在浏览器复现；桌面重启出现一次Cookie保留失败。最新范围、结果与限制见[浏览器补充验收报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/acceptance-report.md)。下文“本次”均指第一轮记录，不代表后续当前状态。

## 结论

四项要求都有对应实现：自然语言会话、WaveSurge 免费搜索与逐人核验、HTML/CSV 结果、Campaign 目标澄清和多类型规划。实现已经超过界面原型阶段。

但目前不能认定完全实现且验收通过。账号身份归一化存在计数错误；人工协助会阻塞无关任务；模型临时失败直接变成终态 unknown；偏好、导出与证据交付也有不足。题目原句的20人、全部定性条件同时通过的真实名单，本次及已检查的既有验收证据均未证明。

真实服务缺额、登录遮挡与“代码尚未实现”是不同结论。系统如实输出 partial/unknown 是正确行为；不要求凭空保证任意条件下都有足够账号。但不能用受控候选的 2/2、历史部分结果或 100% 代码覆盖率替代原题端到端验收。

## 题目要求验收矩阵

| 要求 | 当前实现与本次证据 | 判定 |
|---|---|---|
| 自然语言、多维条件混合描述 | 在真实 UI 输入原句，助手澄清欧美、geek、眼镜、族裔；补充后保存20人、1万–10万粉丝、5个国家及4个必选定性条件，ins 正确归一为 instagram，未沿用旧范围 | 已实现；本次条件理解和保存通过 |
| 基础条件候选召回 | 本次自然语言直接启动1人科技创作者研究，候选上限2；真实 API POST 201，随后 GET 200，稳定 requestId 和远端 taskId；无付费或外联 | 已实现提交/轮询；本次新名单仍排队 |
| 逐人定性分析、全条件校验、标签 | browserVerifier 有独立候选上下文、来源/截图、三态提交；代码检查粉丝边界及必选 AND；复验现存真实结果的标签、match/unknown 和证据 | 已实现机制；原题视觉、KOC、自述四条件的真实准确率及20人交付未验收；存在下述缺陷 |
| 结构化结果文档 | 实际打开 HTML、下载 CSV，名单含平台、粉丝、地区、逐条件理由和标签；缺额/待核实如实标注 | 报告生成及手动查看已实现；追加发现自动chat交付未实现，F10；过滤导出、截图及证据映射不完整 |
| 仅描述 Campaign 目标，交互确定不同类型 | 只输入 AI 笔记应用的课堂/复习试用目标，助手先建议类型并追问；补充范围后自行提出两类互补 creator，保存理由、语言、内容条件及各1人配额，未启动未确认方案 | 目标交互与草案本次通过；多组完成机制复验通过，但身份去重有缺陷，完整真实配额没有新验收证据 |
| “快速筛选” | 会话理解与启动可交互完成；本次远端返回 queued、expectedDurationHours=5；UI 未显示该预计耗时 | 快速获得最终名单未得到验证；远端长任务是当前实际边界 |

涉及族裔的实现只接受本人公开自述，不从外貌推断；这项证据边界合理，不应改为外貌猜测。KOC 也需要公开身份资料和明确业务定义，不能仅以粉丝区间替代。

## 主要发现（按优先级）

### F01 · P1 · 同一账号可能被重复计为两个合格创作者

位置：[wave.ts:55](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/wave.ts:55)、[campaign.ts:31](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/campaign.ts:31)。

复现：两条 Instagram 记录拥有同一个 `https://www.instagram.com/same_person/`；第一条带 `handle=same_person`，第二条缺少 handle。两种记录均被当前适配器接受，却生成 `instagram:same_person` 与 `instagram:https://www.instagram.com/same_person` 两个身份。分别作为两个组的合格记录时，汇总错误返回 `completed、matched=2、qualifyingUnique=2`，实际只有一个主页。

影响：单任务候选去重及 Campaign 独立账号配额均依赖这个 id，可能交付重复账号并错误宣称人数满足。本次为隔离内存数据库、受控记录验证，不是声称真实 WaveSurge 已返回这两条异常记录。

证据：[dedup-probe.json](dedup-probe.json)、[可重复运行脚本](dedup-probe.mjs)，已重复复现。验收期望：同平台相同规范主页/账号保持同一个身份。

### F02 · P1 · 一个待人工请求阻止所有其他研究推进

位置：[research.ts:44](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:44)、[desktop.ts:56](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/desktop.ts:56)。

复现：隔离 Store 中加入属于任务 A 的 `pending` 协助请求，再启动完全无定性/浏览器条件的任务 B。调用 wake 后 B 仍 queued，WaveSurge submit 调用次数为0。入口在任何未完成 assistance 存在时直接 return，连无关任务的 API 提交、GET 轮询也不执行。pending 尚未认领时也没有自动到期处理；只有 human 状态租约会过期。

影响：用户未处理一张协助卡，就可能无限期阻塞所有后台研究。共享浏览器需要互斥，但无关任务的远端提交与轮询没有同样的资源冲突。

证据：[probe-results.json 的 globalBlock](probe-results.json)、[probes.mjs](probes.mjs)，已重复复现；未在主应用人为创建阻塞。

### F03 · P2 · 临时模型故障被保存为不可自动恢复的未知结果

位置：[research.ts:72](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:72)。

复现：候选有有效科技简介，核验器第一次模拟503，下一次即可成功。首次异常被捕获后保存 unknown；任务进入 partial。服务恢复后再次 wake，核验器总共仍只调用一次。引擎只运行 queued/running，已有 result 又会被直接跳过。没有针对该候选的重试/重新核验入口。

影响：可恢复的基础设施故障被当作证据不足的终态，浪费已召回的候选，降低交付率。应区分暂时执行失败与真的无法获得证据；本次没有将故障后的 unknown 错称为不合格。

证据：[transient-probe.json](transient-probe.json)、[复现脚本](transient-probe.mjs)，已重复复现。

### F04 · P2 · “偏好”条件不参与选人排序

位置：[research.ts:69](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:69)、[verdict.ts:23](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/verdict.ts:23)。

复现：需要1人，候选预算2；两人都满足硬条件，第一人不满足 optional 偏好，第二人满足。引擎按返回顺序核验第一人并立即完成，第二人从未核验；最终选择不满足偏好者。

影响：required=false 正确地不作为淘汰条件，但用户的“优先/最好”不会影响选择。Campaign 分配也没有偏好权重。题目基础的全必选 AND 没因此变成 OR；缺失的是已对外提供的偏好能力。

证据：[probe-results.json 的 preference](probe-results.json)。

### F05 · P2 · CSV 忽略当前页面筛选条件

位置：[Results.tsx:11](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/client/Results.tsx:11)、[research-api.ts:10](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research-api.ts:10)。

实际 UI 复现：打开已有学习/效率研究，选择“符合要求”，查询后页面只剩1人。点击“下载 CSV”，文件仍包含2人，其中一人为 unknown。标签和平台过滤同样没有传到导出链接。下载文字也未说明这是全任务名单。

影响：用户为了交付合格清单而筛选后，导出的范围与眼前列表不一致。unknown 在文件中有明确标记，不是被伪造为 match；问题是交付范围不一致。

证据：[过滤后截图](screenshots/match-filter.png)、[实际 CSV](existing-results.csv)、[数量与判定核对](export-filter-probe.json)，两轮 UI 复验一致。

### F06 · P2 · 导出文档丢失部分可审计证据

位置：[reports.ts:6](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/reports.ts:6)。

实际核对：应用结果详情有“查看截图证据”；HTML 报告却仅输出来源网页链接，完全忽略 assetId、截图和原始证据文字，视觉依据无法在文档中复核。CSV judgments 有 evidenceIds，但未提供 id 到来源 URL/截图/采集时间的映射，收件人无法解析这些内部 id。HTML 的粉丝/地区基础判断也没有引用具体证据 id。

影响：基本匹配说明已经存在，但离开应用后的视觉核验文档及 CSV 可追溯性较弱，原网页变化/登录受阻时尤其明显。

证据：[实际报告](existing-report.html)、[报告截图](screenshots/report-no-snapshots.png)、[界面证据截图](screenshots/result-evidence.png)、[隔离导出核对](report-probe.json)。

### F07 · P2 · 浏览器操作边界主要依靠提示词

位置：[browser-verifier.ts:50](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/browser-verifier.ts:50)、[runtime.ts:22](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/desktop/runtime.ts:22)。

复现边界：模拟 Page 的隔离测试中，runtime 接受 `http://127.0.0.1:8810/health` 导航，以及向 `input[type=password]` 填入虚拟字符串。模型 browser 工具参数直接传入执行器，没有检查 URL 是否确实来自当前候选证据/最新观察链接，也没有阻止密码字段或发消息、关注等非研究动作。

影响：提示词虽明确禁止这些行为，执行层却没有同样的约束；网页提示注入或模型失误可能突破只读研究范围。本次仅证明执行层缺少限制，没有实际访问内网、输入真实密码、外联或证明攻击成功。内部 API 本身另有随机凭据鉴权。

证据：[probe-results.json 的 runtimeGuard](probe-results.json)，模拟页面、无网络副作用，已重复复现。

### F08 · P2 · 部分 E2E 依赖历史数据库，不能作为全新部署可复现验收

位置：[research-completion.spec.ts:4](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/tests/e2e/research-completion.spec.ts:4)、[campaign-real-completion.spec.ts:9](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/tests/e2e/campaign-real-completion.spec.ts:9)。

结果完成类测试硬编码研究/Campaign ID、账号及历史配额，测试开始时不创建或导入这些对象。当前业务卷存在时，本次三个选定 E2E 均通过；全新空数据库中，这些固定对象不存在，不能原样跑完整套用例。另一些测试明确调用模型工具名称、指定最终画像文字或注入候选，验证的是协议/控制性流程，不能代表用户只输入自然语言的整个业务效果。

影响：覆盖率很高，但不足以验证 LLM 是否真的识别 geek、眼镜、KOC 并正确交付20个满足全部条件的真实人。本次补做了不指定内部工具名的真实 UI 对话，但原题20人和新搜索完成仍未验收。

这是源码确认的测试可移植性问题，本次未破坏性清空主业务卷来制造失败；未声称已经在新空库重跑所有 E2E。

### F09 · P3 · 对话里的 Markdown 表格没有渲染为表格

位置：[Markdown.tsx:3](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/client/Markdown.tsx:3)。

真实 Campaign 回复使用表格对比类型与理由，界面显示连在一起的 `|---|` 和原始分隔符，无法按列扫描。ReactMarkdown 没有启用 GFM 表格支持。原句澄清中也有原始加粗标记残留，但可能与模型输出和 CommonMark 标点规则有关，本次不将它单独计为一个产品缺陷。

证据：[Campaign 回复截图](screenshots/campaign-draft.png)。

### F10 · P2 · 任务结束后没有在对话中交付报告（后续补充）

用户指出chat看不到文档后，追加浏览器核对已结束的真实历史任务：HTML及CSV可从侧栏“查看结果”弹窗手动访问，当前chat中没有报告链接或文档。源码显示worker结束时只保存任务与结果，Agent只由pending用户消息处理对话，没有任务完成后发布消息的链路。

题目未限定PDF、Word或内嵌聊天卡片，因此已有结构化HTML/CSV不能忽略；但报告生成不能替代主动最终交付，当前对话流程尚未闭环。由于有手动入口，将该缺陷记录为P2。详见[补充报告F10与证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/acceptance-report.md)。此追加项不属于下表第一轮测试结果。

### 后续新增F11／F12／F13

继续实际浏览器验收，新的Instagram搜索已返回2位且实际科技内容条件均通过，但`US`与`United States`直接比较导致两位被错误排除，新增F11/P1。正常重启桌面四次均丢失新写入的一天有效持久Cookie，部分localStorage也丢失，新增F12/P1。新的两类YouTube Campaign已核验4位并生成终态报告，但浏览器明确读到粉丝显示数后仍不能补充顶层缺失的数值条件，新增F13/P2实现不足。详情和步骤见[补充验收报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/acceptance-report.md)，用户参与项见[手动清单](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/manual-acceptance.md)。下表仍仅记录第一轮，不把后续新增真实完成事件倒填到第一轮。

## 本次验证结果

| 检查 | 结果 | 证据 |
|---|---|---|
| 当前源码与运行镜像一致性 | app 中45个 TS/TSX 文件与工作区逐文件相同 | [source-match.json](source-match.json)，different=[] |
| 类型检查 | 通过 | [typecheck.log](typecheck.log) |
| Vitest + coverage | 17个测试文件、93个测试通过；44个运行文件100%覆盖，1个空文件跳过；lines/statements/functions/branches 均100% | [vitest.log](vitest.log) |
| 生产构建 | 通过 | [build.log](build.log) |
| noVNC 只读 E2E | 通过 | [e2e-desktop-retry.log](e2e-desktop-retry.log) |
| 既有真实 Campaign 1/2、unknown 不占配额、报告 | 通过 | [e2e-campaign.log](e2e-campaign.log) |
| 既有真实筛选报告、CSV、刷新与 app 重启持久化 | 通过 | [e2e-research.log](e2e-research.log) |
| 自定义 UI 验证：错误/正确密码、未登录401、登出撤销、两种结果、过滤、下载、原题草案、390px布局 | 基础检查通过；发现 F05/F06 | [ui-audit.json](ui-audit.json)、[脚本](ui-audit.mjs) |
| 独立自然语言：原句、条件保真草案、小规模直接研究、仅目标交互、两类型草案 | 真实配置模型和生产 UI 通过 | [live-review.json](live-review.json)、[live-review.log](live-review.log) |
| 本次新外部研究完成 | 尚未完成；远端 queued，返回预计5小时 | [live-search-status.json](live-search-status.json) |
| 确定性缺陷探针 | F01–F04/F07重复复现；仅使用独立内存数据库或模拟 Page | 本目录 probe 脚本/JSON/重复日志 |
| 页面脚本错误 | 自定义 UI pageErrors=[]；初始未登录探测的401是预期鉴权 | [ui-audit.json](ui-audit.json) |

首次 Playwright 调用缺少它期望版本的 Chromium，属于本机测试环境问题；指定已有 Chrome 后复验通过。首次自定义 UI 脚本按标题子串定位得到两张任务卡，改为精确 heading 后通过。这两项没有计为应用缺陷。

未运行所有16个历史 E2E：其中部分会 reset 上下文、改模型设置、启动新外部研究、注入数据库或要求既有指定对象。这里只重跑三个相关 E2E，并补充独立实际 UI、接口与隔离逻辑验证；不宣称全量 E2E 本次通过。没有性能基准、全平台真实登录/完整搜索、语义准确率的人工作标注评估，或原题20人交付验证。

额外 regions 探针说明：底层字符串比较只处理明确英文国家。城市、中文国家名和“城市,国家”直接放入 regions 会被拒判，但工具契约已要求 regions 使用英文国家；模型也可将城市另建定性条件。因此本次将它记作接口能力边界，未据此声称自然语言城市筛选一定有 bug。

## 交付与测试范围的后续验收重点

首先修复会使人数错误或全部任务停止的 F01/F02，再处理暂时故障恢复、偏好及导出一致性。之后需要一组独立于开发夹具的人工标注 creator 样本：包含眼镜正反例、geek 风不同证据、机构/明星/KOC、本人自述缺失、粉丝边界、混合硬条件与偏好；测量逐条件及最终名单准确性，保留截图和错误样本。

需要另行完成原题的真实候选召回→逐人判断→最终文档验收；可如实报告缺额，但必须明确哪些候选通过全部条件、哪些无法取证，不能只证明工具调用了。Campaign 还需要在干净数据环境下跑目标输入、澄清、版本修改、确认执行、跨组去重及完整报告流程。

## 对当前应用数据的影响

未修改业务源码、模型设置或既有任务条件；未付费、外联或使用社交账号密码。重新构建产生 dist/coverage，报告与脚本保存在本目录；三个既有 E2E 也更新了它们原本的 validation 文件，其中一个重启了 app，持久数据仍保留。

本次新增两个未启动草案：“Review原题条件保真测试”（20人）与“Review自然目标规划”（2人）。另新增一项免费真实搜索“Review独立真实筛选”，本地 ID `research-d22f5bc3f9c80da1a4979ca5`，远端 ID `b5722567-4ae0-435a-b6e9-0c5873d6486e`；报告生成时仍等待外部结果，后台保留运行。其状态以应用的后续数据库事实为准；未创建自动监控。

## 后续自然对话与打标复验

[2026-10-10打标与自然对话复验](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/tagging-review.md)。新增F14/F15，确认条件标签与画像打标的差距、实际标签检索误召回。最新进度及确需真人参与的范围见[最新未完成与人工验收清单](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/remaining-validation.md)；历史阶段的状态和停止记录不替代本轮快照。
