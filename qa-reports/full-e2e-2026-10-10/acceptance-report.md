# 浏览器补充验收与覆盖边界

日期：2026-10-10，Asia/Shanghai。对象：当前项目源码、主部署 `http://127.0.0.1:3000`，以及相同镜像、全新数据卷的独立部署 `creator-studio-review-e2e`。

**项目不能判为完全满足题目要求；也没有完成所有平台及原题全部场景的验收。** 第一轮“审查已完成”的措辞过满，现予以更正。后续已跑完一项新的真实Instagram搜索和两类新的真实YouTube Campaign，从自然语言发起到逐人核验、终态和报告；真实科技候选因国家名称比较错误被全部排除，Campaign四位候选保留unknown，此前10:30阶段原题20人尚无候选；后续已返回部分候选，但主应用仍0核验，详见下述打标复验。新完成事件也再次证明chat未主动交付报告；桌面持久Cookie丢失已经重复复现。未修改业务实现。

原始缺陷详情见[第一轮审查报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/review-2026-10-10/review-report.md)。本报告补充真实浏览器验证，不把历史数据、受控夹具或单元覆盖率算作新搜索完成。

确实需要用户参与的真实登录／验证码及定性准确率人工复核，以及尚未完成但可继续自动验证的项目，见[手动验收与未完成清单](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/manual-acceptance.md)。

## 原题四项要求

| 要求 | 实际操作与结果 | 验收状态 |
| --- | --- | --- |
| 自然语言混合条件 | 真实 UI 输入原题，澄清后保存20人、Instagram、5个欧美国家、1万至10万粉丝、geek视觉、眼镜视觉、白人公开自述、普通消费者KOC四项必选条件；本轮点击确认启动。 | 条件理解、保存和启动通过；最终筛选效果未验收。 |
| WaveSurge召回＋逐人定性分析＋标签 | 原题候选上限40，真实 POST 201，尚未返回候选。新的独立Instagram任务实际返回2位、完成真实页面与模型核验、人工关闭遮挡并续接；新的两类YouTube任务共返回4位并终止。 | 新搜索至核验和报告路径已有实际完整运行；Instagram发现错误排除F11，YouTube存在基础信息不能补充的问题F13。原题四个定性条件的准确率和最终名单仍未验证。 |
| 结构化结果文档 | 第一轮实际查看真实历史结果、HTML、CSV、证据及筛选；本轮查看受控多组完成报告、错误去重报告、取消报告和真实候选的新结果。追加核对历史已结束任务，手动入口有报告，当前chat没有报告链接或文档。 | 报告生成及手动入口已实现；任务结束后的自动chat交付未实现，F10。另有过滤导出不一致和证据丢失问题。原题新任务最终文档未验收。 |
| 只给Campaign目标，交互形成不同类型范围 | 两个不同产品目标的实际模型对话；AI笔记目标先追问、保存两类、自然语言修订到v2、UI确认启动。随后返回4位真实YouTube候选，终态partial0/2，实际打开汇总及两类报告。 | 所述规划至终态及手动报告路径已实测；unknown未计配额。没有真实合格入选者证明最终质量，跨组合格分配仍由受控候选验证；自动chat交付缺失。 |

白人条件只接受本人公开自述，不从外貌推断；KOC不能仅凭粉丝量认定。这是判断的证据边界。本次没有证明20个真实账号同时满足这些条件，也没有证明数据不足时的原题最终 partial 文档，因为这次搜索尚未结束。

## 新搜索当前证据

最初 **09:53:48（上海时间）** 快照中四项均`running / remoteStatus=queued`，当时外部响应含`expectedDurationHours=5`，不是完成时间保证。后续状态已变化：**10:20后**科技任务已核验2位，partial0/1；两类YouTube任务各核验2位，Campaign partial0/2；原题任务远端running、尚无候选。最后观察时间及状态以[最新浏览器快照](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/main-status.json)为准，不能继续将四项统称“排队”。

实际接口为`POST https://wavesurge.ai/api/v1/creator-search/requests`，返回taskId后由`GET https://wavesurge.ai/api/v1/creator-search/requests/{taskId}`轮询。原题POST的count=40是候选上限，最终本地目标20；两个Campaign组各count=2候选、最终目标各1。使用免费独立搜索、本地Campaign组织结果，没有调用付费报价／确认或外联接口。queued/running/done是GET响应的业务status，不由HTTP 200推断。

| 场景 | 本地任务 | 远端任务 |
| --- | --- | --- |
| 第一轮独立科技研究，目标1人／候选2人 | `research-d22f5bc3f9c80da1a4979ca5` | `b5722567-4ae0-435a-b6e9-0c5873d6486e` |
| 原题，目标20人／候选40人 | `research-a183b9437d676713c0f2812f` | `bd260f50-b76f-440c-9e47-a022a6697ac6` |
| AI笔记Campaign第一类，目标1人／候选2人 | `research-fd88375f69e716ff5cbc9fef` | `7c1837b8-3ec0-4d06-9f4d-752eebc40f64` |
| AI笔记Campaign第二类，目标1人／候选2人 | `research-b30bacd90e74569b33e06bfc` | `ff3ac6fb-fa15-4b8d-b358-e7bf18e642de` |

证据：[确认、修订及真实提交](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/main-required-flows.json)、[状态与最新外部响应](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/main-status.json)、[原题方案截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/original-before-start.png)。

主app在这四项真实搜索仍等待时正常重启：浏览器登录状态保持、四个remoteId保持、每项POST提交次数保持，没有重复搜索。[重启证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/main-restart.json)。

## 逐功能浏览器覆盖

下表“通过”只适用于该行所述流程；不扩大为全部边界、全部平台或最终业务效果。

| 功能 | 本次及第一轮浏览器事实 | 结果／边界 |
| --- | --- | --- |
| 错误／正确密码、登录、刷新、退出 | 真实登录表单、错误提示、鉴权接口、退出撤销；独立新卷与app重启后复验 | 基本路径通过；会话到期等时间边界是单元／接口测试。 |
| 连续发消息、后台执行时继续对话 | 三条连续输入真正进入模型上下文；待协助期间也能新建及取消其他任务 | 消息接收通过；后台研究推进存在F02。 |
| 图片输入 | 上传真实双色PNG，实际模型识别绿色／蓝色；5张拒绝，预览添加／移除，非图片拒绝 | 已验证这些路径；未用人物图片评估geek／眼镜准确率。 |
| 设置热更新 | UI修改工作流提示词、保存；下一次真实模型请求含新标识；随后还原 | 工作流更新通过；所有配置组合、所有提示词字段同时在途修改没有逐一浏览器验证。 |
| 调试记录 | UI展开完整调用／返回／工具消息，与实际模型记录核对 | 已验证显示；没有用这个界面证明模型结论正确。 |
| 上下文压缩、下载、清空、载入 | UI触发真实摘要；下载JSON备份、清空、载入；历史工具没有重放 | 所述流程通过；全部异常格式、并发竞态仍主要由单元／接口测试覆盖。 |
| 错误输入 | 非法模型地址、坏JSON、错误备份格式经UI提交并拒绝 | 通过，未改变模型设置。 |
| 直接自然语言研究 | 主部署1人真实任务返回2位、实际Instagram逐人核验、noVNC关闭弹窗续接、partial终态和报告；独立部署另测阻塞和取消 | 整条新搜索流程实际跑完，但两位被国家别名错误排除，F11；不是业务验收通过。 |
| 多维条件与人数 | 原题20人及全部条件保存、实际提交 | 解析路径通过；9999/10000/100000/100001边界是单元测试，没有逐一真实浏览器取证。 |
| 任务结果查询 | 真实历史结果与新重放结果；标签、平台、判断过滤；展开来源／截图 | 已验证；CSV不遵循页面过滤，F05。 |
| HTML／CSV生成及手动查看 | 实际弹出报告、下载CSV，包含匹配理由及三态；新受控多组报告 | 此路径有实现；视觉截图及CSV证据映射缺失，F06。 |
| 任务结束后在chat交付文档 | 历史partial任务手动入口有报告；新的真实Instagram任务结束后继续观察三个前端刷新周期，没有新消息或报告链接。 | 自动交付未实现，F10现已具备新完成事件的实际浏览器证据。 |
| 手机布局 | 390px实际页面验证，没有横向溢出 | 此尺寸基本通过；不是全部设备兼容性验收。 |
| Campaign目标澄清 | 降噪耳机与AI笔记目标形成不同角色范围；实际模型追问 | 通过所测两种目标。 |
| Campaign草案修订和确认 | 真实UI将同一方案修订到v2，点击确认，产生两个真实远端任务 | 所述修订和提交路径通过；后续终态见下一行。 |
| Campaign新任务终态与报告 | AI笔记目标的两类YouTube任务共核验4位，partial0/2；实际打开汇总与两个分组报告，unknown未计配额 | 所述流程通过；不代表找到2位合格创作者，业务效果仍需补足证据与人工准确率验收。 |
| Campaign方案弹窗实时更新 | 新受控基础条件候选从0/2到completed2/2，卡片与已打开的分组详情自动更新 | 通过；此前脚本误预期详情滞后，修正断言后通过，不计产品缺陷。 |
| 跨组重叠候选分配 | 明确标注的受控候选，实际模型＋有头浏览器取得截图；A-only与A/B重叠正确分配，报告2/2、唯一2 | 正常身份形态下通过；缺handle时的同主页身份归一化失败，F01。 |
| noVNC只读与接管 | 实际连接、只读授权、未认领控制被拒；认领后鼠标点击验证按钮 | 所述正常流程通过。 |
| 人工完成后续接 | 实际点击受控验证、交还；原候选重新观察、截图落库、match1/1 | 通过；受控网页不等于真实社交账号登录。 |
| 人工无法解决 | 受控不可解决页面；交还后重新观察，不重复求助，unknown0/1 | 通过所测分支，unknown未占配额。 |
| 真实Instagram公开内容 | 历史真实khushleenvirk重放；实际页面弹窗、noVNC关闭、重新读取；第二帖再次遮挡，最终unknown | 真实平台取证和保守降级已验证；没有Instagram账号登录验证，也没有新发现。 |
| 取消与撤销协助 | 自然语言取消待协助任务、撤销请求、无关任务随之提交；再取消该独立任务，打开取消报告 | 取消流程通过；远端没有验证过取消接口，远端搜索可能继续。 |
| app重启恢复 | 历史结果保留；本轮四个真实等待任务保持远端ID和提交次数 | 已验证这些情形。 |
| 桌面profile重启恢复 | 初次人工验证Cookie失败、一次复验保留；后续4次新受控持久Cookie正常重启全部丢失，部分localStorage也丢失 | 已确认F12，具体关闭／落盘原因待定位；未使用真实社交账号。 |
| 全新Compose部署 | 第三个不同项目和全新卷：随机密码不同、401鉴权、空任务／方案、真实模型回复、noVNC连接、app重启后登录与消息ID保留、desktop内部端口 | 所述新部署路径通过；不是桌面真实账号登录保持证明。 |
| YouTube真实逐人取证 | AI笔记两类新搜索共4位，实际主页／视频／说明／尝试文字稿、截图及模型判断，终态unknown | 实际路径已测，保守降级；缺基本字段不能从新证据补充，F13。 |
| TikTok／Twitter真实逐人取证 | 本轮只读访问真实数据池，没有新搜索或这些平台逐人页面核验 | **未验收**。数据池GET、platform schema及单元测试不能替代它。 |
| 原题20人最终文档及语义准确率 | 新搜索尚无候选；未进行独立人工标注的逐条件精度评估 | **未验收**。 |

## 两个P1缺陷升级为实际浏览器复现

**F01：同一主页被计为两个不同账号。** 向独立部署提供明确标注的两条受控原始记录，同一Instagram URL，一条有handle，一条没有。使用生产normalizeCreator和研究worker生成结果，没有手工伪造结果。Campaign卡片与实际HTML报告显示`completed、去重入选2/2、合格账号池2`，两个链接却指向同一主页，实际规范主页数量为1。这里验证的是异常数据形态的业务处理，不声称WaveSurge真的返回了这两条记录。

证据：[实际结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/identity-ui.json)、[错误报告截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/identity-bug-report.png)。源码位置：[wave.ts:55](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/wave.ts:55)、[campaign.ts:31](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/campaign.ts:31)。

**F02：未认领人工请求阻塞无关研究提交。** A是受控挑战候选。A进入needs_input后，通过普通自然语言UI启动B：1位Instagram科技创作者，只有文字条件。B一直queued，remoteId为空、提交次数0。自然语言取消A后，协助请求被撤销，B才得到真实WaveSurge taskId。随后取消B，没有重建或重复提交。

证据：[阻塞、恢复及取消状态](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/concurrency-cancel.json)、[阻塞截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/independent-search-blocked.png)。源码位置：[research.ts:44](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:44)。

这两项脚本“passed”表示成功复现缺陷，不表示业务功能验收通过。第一轮的F03临时模型错误不恢复、F04偏好不排序、F07浏览器执行限制不足，仍是隔离确定性验证与源码发现；没有改称本轮真实外部故障实测。

## 新增F13 · P2 · 浏览器已读到粉丝数量显示，仍无法补充基础筛选条件

新YouTube Campaign返回schoolhabits、raytubelcsw、colelangs、wesleyanna四位，实际有头浏览器截图／文字分别读到`20.4K、67.6K、37.4K、91.3K subscribers`。WaveSurge明确将顶层followerCount设为null，并标记未取得精确整数；本地报告因此统一显示“未取得粉丝数”、粉丝范围unknown。四位的顶层region也为null，服务hardConditions与factorGrades存在不一致，不能直接相信硬条件met而忽略证据。

问题不在漏读同名JSON字段，原始返回的顶层值确实为null；保守保留unknown也比猜测精确数字正确。但当前本地取证只增加evidence，没有补充基础粉丝／地区判断的入口：[browser-verifier.ts:30](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/browser-verifier.ts:30)保存观察，[verdict.ts:15](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/verdict.ts:15)仍只使用最初creator.followers。工具允许提交的条件枚举仅来自用户定性criteria，浏览器后续取得的基础信息不能消除这类unknown。该实现使“逐人核验全部条件”只覆盖定性部分，基础信息完全依赖上游单一字段。

改进方向：将实际来源可核验的基础信息纳入单独的证据解析／验证流程；按来源保留粉丝显示的精度与可证明区间，边界不确定时继续unknown，不伪造个位精确数。地区同样需要真实创作者所在地证据，不能由观众国家、语言或频道主题推断。此次不能因为四个显示数值在目标区间就声称四人均应入选：地区与部分教学／受众必选条件仍存在不足。

证据：[实际候选原始返回、保存的浏览器观察与最终判断](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/campaign-final-audit.json)、[分组最终报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/new-campaign-child-0.png)。

## 新增F11 · P1 · 国家代码与国家名称不归一化，真实合格候选被错误排除

继续验收时，第一轮提交的真实独立科技搜索`research-d22f5bc3f9c80da1a4979ca5`返回两个新候选，未注入或重放历史候选。原始POST明确要求`regions=["United States","Canada"]`。WaveSurge返回tylerlcrawford（31,213粉丝）和valstechtalkk（39,639粉丝），地区均为`US`，`factorGrades.location=confirmed_country`。实际有头Instagram页面和模型核验均确认“公开文字明确分享科技内容”；平台及粉丝条件也均通过。

但程序将两个候选的“所在地区”均判为`no_match`，任务最终`partial、合格0/1、已核验2`，HTML报告也错误说明两位“不符合”。这不是外部没有候选、模型无法取证或正确保守降级：只因美国的两种合法写法不同，两名满足全部条件的候选被错误排除。

原因：[verdict.ts:20](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/verdict.ts:20)将`US`与`United States`直接转小写后做字符串比较；[wave.ts:66](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/wave.ts:66)直接保留原始region，没有归一化ISO国家代码、英文名称与常见别名。原题欧美多国、其他平台或不同供应商也可能受影响。现有测试覆盖逗号前缀、大小写和空白，未覆盖此次实际返回的国家代码形态。

验收应使用明确国家映射将US/United States、CA/Canada等归一化，同时继续区分创作者所在地与粉丝受众所在地；无法可靠定位仍保持unknown。修复后重算这次两人的地区及最终判断，报告人数须同步纠正，不应为碰巧匹配代码格式而要求用户重新搜索。

证据：[真实新搜索、模型判断、人工续接及最终报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/primary-completion.json)、[实际结果页的错误地区判断](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/region-alias-real-result.png)、[关闭遮挡后的真实帖子](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/primary-instagram-after.png)、[最终错误报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/primary-completion-report.png)。

同一新搜索从needs_input经真实noVNC关闭注册弹窗、交还后重新观察，完成两个候选核验并生成报告。没有输入社交账号凭据。完成后继续等待三个前端刷新周期，chat消息ID集合未变化、没有报告链接：F10现有新的真实完成事件证据，超出此前历史任务UI与源码确认的范围。

## 新增F10 · P2 · 任务结束后没有在对话中交付报告

用户指出chat中看不到题目要求的结果文档。追加实际浏览器检查主部署的历史真实任务`research-a333d174361fcf1bed6c0698`：任务已结束为`partial`，目标2人、核验1人、合格1人。通过侧栏“研究进展 → 查看结果 → 查看报告”可以打开包含创作者、粉丝、地区、标签、逐条件判断及理由的HTML；同一弹窗的“下载 CSV”接口返回200。当前chat中没有报告链接、下载入口或文档组件。此检查没有注入候选、生成伪造结果，也没有发新消息。

原因由源码确认：

- [research.ts:81](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:81)只将任务改为completed/partial并保存；没有创建完成消息或报告交付记录。
- [bootstrap.ts:38](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/bootstrap.ts:38)由用户消息唤醒Agent；定时器只唤醒研究worker。没有将任务完成事件送入对话的连接。
- [agent.ts:19](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/agent.ts:19)及[agent.ts:65](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/agent.ts:65)只处理pending用户消息。任务在助手回复之后结束，即使刷新页面，也不会自动新增完成回复。
- [App.tsx:57](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/client/App.tsx:57)的对话仅渲染消息文字和图片；报告入口在[Results.tsx:10](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/client/Results.tsx:10)的二级弹窗。Markdown能显示模型主动写出的链接，但模型在任务完成时没有自动运行，因此不能保证报告交付。
- [research-api.ts:8](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research-api.ts:8)根据已保存结果按请求渲染HTML/CSV，没有单独保存带版本与交付状态的最终文档。Campaign同样在方案弹窗提供汇总链接，没有自动chat完成通知。

需求判断：题目没有指定PDF、Word或必须内嵌chat，因此不能因为没有聊天文档卡就判定“结构化文档完全不存在”；已有HTML和CSV可满足文档载体的基本要求。但对话发起研究后，系统不主动通知结束或返回报告，用户必须自己发现二级入口，自动最终交付流程未完成。这是独立于F06文档证据内容不完整的缺陷。按P2记录，因为有可用的手动查看路径；仍不能将本项标为完整验收通过。前次状态快照中原题新搜索仍排队属于另一项未验收事实，不能解释已结束任务也没有自动交付的问题。

修复建议与验收：completed/partial/failed结束时，持久化一次报告交付记录和对话消息；显示实际合格人数、目标人数、缺额或失败原因以及由后端生成的预览／下载链接。直接研究交付任务报告，Campaign在子任务结束后交付去重汇总，并链接各类逐条件说明。无需用户再问“结果呢”，刷新与重启后仍可访问，重复worker唤醒不重复通知。文档卡可提升可发现性，但不是题目硬性格式要求；最终版本快照是审查建议，而非题目明确规定。

证据：[浏览器状态及报告正文](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/document-delivery.json)、[chat页面](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/document-chat-before.png)、[结果弹窗入口](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/document-results-entry.png)、[手动打开的结构化文档](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/document-report-manual.png)。浏览器检查的是历史已结束任务的当前页面，不声称在本次观察到新的远端搜索完成；缺少完成事件触发链由上述源码确认。

## 新增F12 · P1 · 正常重启桌面丢失新写入的持久Cookie

后续扩大确定性验证：使用明确标注的受控网页，通过实际生产有头Chromium点击页面按钮写入带`max-age=86400`的持久Cookie、会话Cookie及localStorage，再执行正常`docker compose restart desktop`，回到同一个URL读取实际页面。两轮没有额外等待，一轮额外等8秒；三次重启后持久Cookie均丢失，前两轮localStorage也丢失，等8秒后localStorage保留。补做一次等待3秒且确保noVNC已实际绘制页面的复验，持久Cookie再次丢失，localStorage保留。四次受控验证足以将“可能偶发”升级为可重复的问题。

持久Cookie是按一天有效期写入，不能用“会话Cookie重启可能不保留”解释。重启前后的观察来自实际运行浏览器，不是Mock；测试值不是任何真实平台账号凭据。这里证明新写入状态可能丢失，**不声称所有已有Cookie或所有平台账号都会掉登录**。

四轮重启后的页面可见Chromium恢复提示。文件卷保持、URL重新恢复，但浏览器状态未完整保存。确切关闭／落盘原因尚未定位；不能仅凭恢复提示断言具体进程关闭缺陷。影响是用户刚完成的验证或登录可能要重复操作，长任务恢复承诺不可靠。建议修复后重复验证新Cookie及localStorage，再由用户用自己的真实平台账号完成登录保持验收；当前不应让用户反复登录来替代修复。

证据：[三轮实际状态](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/persistence-audit.json)、[补充复验](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/persistence-audit-painted.json)、[复验重启前](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/persistence-round-1-painted-before.png)、[复验重启后](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/screenshots/persistence-round-1-painted-after.png)。最初第一轮追加截图截到noVNC刚连接的黑屏；该图片不用于证明重启前页面，真实runtime观察及后续已绘制的复验保留为依据。这属于取证脚本等待不足，不另计产品界面缺陷。

## 首次重启稳定性异常记录（现已由F12补充复现）

首次运行项目的`desktop-persistence`逻辑：重启前实际页面是Test Creator，正常`docker compose restart desktop`后变成Verify you are human，断言失败。重新通过noVNC验证后，增加前后UI截图的复验通过。后续真实noVNC截图仍出现Chromium的“didn't shut down correctly / Restore pages?”提示。

原因尚未确认，可能涉及近期站点数据落盘和关闭时序；不能据此断言所有登录Cookie都会丢失，也不能因为一次复验通过就宣布恢复能力稳定。建议用新Cookie／localStorage、不同等待时间及重复正常重启定位关闭流程。

证据：[首次失败日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/persistence-browser-suite.log)、[复验日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/persistence-browser-retry.log)、[复验前后观察](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/isolated-evidence/stage-4-profile-restart.json)、[含恢复提示的桌面截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/isolated-evidence/stage-4-human-skip.png)。

## 测试执行与证据真实性

本轮初始独立部署运行11种Playwright用例：8项所述功能流程通过，2项成功复现P1缺陷，1项桌面持久化首次失败／复验通过。继续补充全新卷部署与Campaign弹窗自动刷新两种用例，均通过，共13种正式用例。另有实际浏览器脚本完成新的Instagram任务、新的两类YouTube Campaign、报告和四次持久Cookie重启检查，以及之前的历史Instagram重放。缺陷复现脚本执行成功不能算产品合格，Cookie早先一次通过也不能覆盖随后四次失败。

| 执行 | 结果 | 日志 |
| --- | --- | --- |
| agent、campaign-second-goal、desktop-view、foundation | 4通过 | [日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/general-browser-suite.log) |
| desktop-assistance | 通过；复验也通过 | [日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/assistance-browser-suite.log) |
| campaign-dedup、desktop-skip | 2通过；明确受控候选 | [日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/multi-candidate-browser-suite.log) |
| input-errors | 通过 | [日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/cancel-errors-browser-suite.log) |
| concurrency-cancel | 成功复现F02，取消功能通过 | [复验日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/cancel-browser-retry.log) |
| identity-ui | 成功复现F01 | [复验日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/identity-browser-retry.log) |
| desktop-persistence | 初次失败、一次复验通过；后续F12四次重复确认新持久Cookie丢失 | 上节日志 |
| 真实Instagram重放 | 同一候选续接，4次实际模型调用，unknown0/1，保留本次截图 | [记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/real-platform.json) |
| 新Instagram搜索完成 | 真实WaveSurge新召回2位；实际页面与模型均确认科技内容，关闭弹窗续接，报告错误0/1，F11；chat无新消息，F10 | [记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/primary-completion.json) |
| 新YouTube Campaign完成 | 两组各2位真实候选，实际页面及文字稿尝试，unknown4位，partial0/2，汇总及分组报告已打开 | [记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/campaign-final-audit.json) |
| clean-deploy-audit | 不同新卷部署、随机密码、真实模型、noVNC、app重启后会话与消息保留，通过 | [日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/clean-deploy-audit.log) |
| campaign-refresh | 受控0/2到2/2，已打开分组详情自动更新；修正错误预期后通过 | [日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/campaign-refresh-corrected.log) |
| persistence-audit | 受控真实浏览器：新持久Cookie四次正常重启丢失，F12；不是实际平台登录 | [记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/persistence-audit-painted.json) |

两次补充测试的首次失败来自测试脚本：取消报告实际用中文说明停止，脚本错误地寻找英文cancelled；身份夹具由生产worker每60秒扫描，最初脚本只等30秒。修正断言／等待时长后分别复验通过；这两项没有计为产品缺陷。首次Cookie失败保留为产品／环境稳定性待定位问题。

继续测试还纠正了两个取证脚本问题：Campaign刷新最初假设详情会停留在0/1，实际生产UI自动更新到1/1，预期错误导致测试失败；修正为验证自动刷新后通过，没有新增“详情不刷新”缺陷。Campaign分组报告取证最初新建了无登录上下文的页面，随后使用便捷browser.newPage的拥有上下文又不能增开页面；改为显式共享已登录context后，两份报告均200并读取了正确正文。保留前两次日志，最终证据只使用成功复核记录。这些属于测试脚本问题，不是产品故障。

项目原有16个E2E文件没有全部原样执行。本轮复制执行其中8个；第一轮执行3个，desktop-view重叠，合计覆盖10个原用例文件。其余6个部分依赖固定历史ID或固定部署，部分场景由本轮新的实际浏览器脚本补充，但不能宣称原16个全部通过。

第一轮类型检查、构建、17文件93个Vitest及100%覆盖均通过；本轮没有业务源码修改，没有为了增加数字重跑这些检查。独立部署app的45个TS/TSX、desktop的4个TS和入口脚本与当前工作区逐文件一致，共50项different=[]。[镜像源码核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/source-match.json)、[结束前50项复核](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/source-recheck.json)。浏览器使用本机已安装Chrome，容器内使用实际有头Chromium，未把Mock Page算成真实浏览器。

本轮trace的管理员密码和鉴权Cookie已脱敏，保留截图、调用和网络观察。[脱敏记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/evidence-redaction.json)。没有输出密码、Token或模型Key。

## 数据与运行影响

未修改业务源码或原有测试源码，只新增审查报告、测试副本与辅助脚本。继续核对50项源文件，与前次hash检查没有变化。主部署新增／启动的两份方案是“Review原题条件保真测试”和“Review自然目标规划”，后一份修订到v2；连同第一轮独立研究，共四项主部署真实搜索，其中科技任务与两类YouTube任务已结束，原题20人任务继续运行。

独立部署使用全新卷，承载上下文／设置／夹具／取消测试；它启动过两次候选上限1的免费WaveSurge研究，均已取消本地核验，远端可能继续。没有付费、外联、社交账号登录或社交密码输入。主app重启一次用于验证等待任务恢复；业务数据保留。未创建定时监控。

独立部署曾停止，继续测试时重新启动；另创建全新卷项目`creator-studio-review-clean-2`验证部署，没有在该项目提交任何WaveSurge搜索。独立部署只读查询过三个平台的数据池，返回元数据不算逐人取证。完成后两个独立测试部署均停止，数据卷、截图与脱敏trace保留；主部署保持运行。最终停止记录见[日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/final-isolated-stop.log)。

补齐验收需要：等待原题20人任务终止，完成四项定性条件与最终文档核对；用独立人工标注样本评估geek、眼镜、KOC及缺自述等正反例；完成TikTok／X的真实页面验证；修复已确认缺陷并回归。新的Instagram和YouTube场景虽然已实际跑到终态，仍不能证明原题筛选效果。需要用户参与的部分与可继续自动测试的部分已经分别列在[手动验收清单](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10/manual-acceptance.md)。

## 后续自然对话与打标复验

[2026-10-10打标与自然对话复验](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/tagging-review.md) 已用自然用户问法重新测试。确认有逐人条件核验与命中标签，但打标指令被直接存成标签，真实画像值未落库；标签查询geek错误召回2位，补标不更新报告／CSV。新增F14（P1）及F15（P2），合并15项问题。原题已返回1位部分候选，另做真实浏览器四项条件重放；不计作20人完成。新的TikTok及两类Campaign仍排队，不能计为端到端通过。

[最新未完成与人工验收清单](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/remaining-validation.md) 更新了本轮任务和测试环境：3400重新启用并保留3项新搜索；3300重放已结束后停止。此前段落中的测试部署停止记录属于10:30阶段。
