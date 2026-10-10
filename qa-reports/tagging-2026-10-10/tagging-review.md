# 自然对话与逐人打标复验

日期：2026-10-10，Asia/Shanghai。结论：**不能按当前预期验收通过。已有逐人条件核验和命中条件标签；自动生成、保存、查询和交付画像标签的流程不完整。**

本轮没有修改业务代码或模型提示词。核对50个本地及生产容器文件，均与上一轮一致，见 [source-check.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/source-check.json)。主部署是 `http://127.0.0.1:3000`；新的自然对话搜索使用相同镜像的独立部署3400；受控核验重放使用3300。重放结果不算新的召回，也不算原题20人或新TikTok任务完成。

## 用真实用户语气测试了什么

| 场景 | 实际发送与操作 | 结果 |
| --- | --- | --- |
| 基本筛选和画像标签 | “帮我找2个美国的 TikTok 男创作者，戴眼镜，粉丝1万到10万……每个人都标一下内容方向和风格，比如数码、生活、geek风这种……” | 真实模型创建任务并提交WaveSurge，数量、平台、地区、粉丝和两个必选特征被保留。Agent承诺分别标内容和风格，却把这两个请求写成“标注……”可选判断条件，没有定义标签值字段。新搜索仍排队，不能算逐人核验通过。见 [basic.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/basic.json)。 |
| 给已经返回的人补标签 | “刚才那几个人，先别重新找……不合格的也放进去……整理好给我一份文档。” | 六个真实账号均出现在聊天整理中，附短标签和依据。但新调用仅有 `get_results`，没有新浏览器核验；结果记录前后完全相同。聊天里的画像标签没有进入结果页、报告或CSV。见 [enrich.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/enrich.json)。 |
| 补标签后查询、刷新与导出 | 在三个结果页分别查询“智能家居”“指南型”“Notion”，刷新，再打开HTML报告和实际下载CSV | 三次新标签查询均为0；刷新后仍是旧的条件标签；三个HTML和CSV也仍是旧标签。见 [inspect.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/inspect.json)、[CSV字段审计](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/csv-tags-audit.json)。 |
| 要求真正写回并重新看视频 | “把这些标签也存进结果里吧……眼镜这列再看下他们的公开视频……” | Agent明确承认没有修改标签、更新导出或重新浏览视频的工具。本轮没有执行任何写回或新核验。见 [persist.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/persist.json)。 |
| 进阶Campaign：只有营销目标 | “我们要在美国推一款 AI 笔记工具，主要给大学生用……你觉得该找哪两类博主？” | 提出大学学习／校园、AI／效率工具两类，追问功能和范围。补充“录音整理笔记、生成复习题、免费试用”，确认每类1人／2候选，保存v1。没有沿用上一轮男性、眼镜条件。见 [campaign-goal.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/campaign-goal.json)、[campaign-scope.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/campaign-scope.json)。 |
| 自然确认方案并启动 | “行，就按这版找吧，最多四个候选，先跑这一轮……” | 实际创建两个子任务，分别向WaveSurge提交2个候选的搜索。规划、确认、提交路径通过；两项仍排队，最终筛选与交付未完成。内容方向、表达风格、合作建议同样被塞进可选判断条件。见 [campaign-confirm.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/campaign-confirm.json)。 |

完整测试原话保存在同目录的 `*-input.txt` 中，没有在测试对话中要求调用内部工具名，也没有临时修改提示词引导模型通过测试。

## Agent确实做了逐人分析

回查此前六位真实候选的调用记录：每位都有 `browser-verification` 模型调用、实际页面文字和截图输入，最后调用 `submit_judgments`。六位合计26次核验模型调用。这里确认的是执行和来源链路，**不是六位已合格或标签准确率100%**。见 [inspect.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/inspect.json) 的 `verificationCalls`。

实际核验提示词要求“只核验给定条件”，输入包括该人的资料、条件、网页观察与图片；输出协议只接收 `criterionId / verdict / reason / evidenceIds`。每项为 `match / no_match / unknown`，程序再计算基础条件及全部必选是否通过。它没有让模型提交一个独立的“标签维度＋标签值”集合。

来源：[核验提示词](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/shared/prompts.ts:9)、[浏览器核验与提交协议](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/browser-verifier.ts:14)、[标签写入逻辑](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:78)。对应生产代码行分别是 `prompts.ts:9`、`browser-verifier.ts:14,40`、`research.ts:78`。

### 受控重放：模型的画像描述被存错了

取此前真实WaveSurge返回的 `wesleyanna` 和 `schoolhabits`，保留真实账号、链接和数值资料，用本轮自然输入生成的内容方向／风格条件重新执行生产核验器。没有注入预定判断；实际重新打开YouTube页面并调用配置中的真实模型。为隔离标签问题，此重放将平台改为YouTube、不限制国家、数量改为2，其他未取得的信息没有补造。**这不是新的TikTok召回验证。**

| 人 | 模型写在判断理由中的画像 | 真正保存的标签 |
| --- | --- | --- |
| wesleyanna | 效率工具与科技、生活及旅行Vlog；个人化、轻松聊天与工具讲解结合的Vlog风 | “根据可核实的内容标注内容方向，例如数码、生活或其他方向……”；“根据可核实的内容标注呈现风格，例如 geek 风或其他风格……” |
| schoolhabits | 教育／学习方法与效率提升；教师式知识讲解／实用学习指导 | 与上一人完全相同的两段指令文字 |

两位共4次真实模型调用，均包含截图，分别提交了判断。两人的整体结果仍为待核实，因为原始粉丝数字缺失；这不影响复现标签字段丢失。模型写出的具体方向／风格保留在 `reason`，没有作为可查询的标签值保存。

实际页面：[两人保存的标签截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/screenshots/replay-final-results-0.png)。原始结果、来源和模型输出见 [replay-completion.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/replay-completion.json)。

更直接的错误是标签检索：**“Notion”返回0，“教师”返回0，“geek”却返回2。** 两个人的模型理由都明确表示不足以标为geek风，但标签里的指令文字含有“例如 geek 风”，字符串搜索就把两人都召回了。这是标签筛选误召回，不是两人被计入合格人数；整体仍为待核实。见 [replay-filters.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/replay-filters.json)、[geek误召回截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/screenshots/replay-filter-geek.png)、[CSV标签字段](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/csv-tags-audit.json)。

### 原题四项特征：一位真实部分候选的补测

原题20人搜索在 `status=running` 时已返回一位真实候选。主应用未处理它，本地核验仍为0。将这一位部分候选在3300做受控重放，保持原四项条件及基础范围，只将本次复验数量／候选上限改为1。复用的是实际API返回，使用生产归一化、真实浏览器和真实模型。

Instagram注册引导遮挡了视频，Agent请求协助。我在实际noVNC界面点击关闭引导，没有登录或输入社媒凭据；交还后Agent重新观察，同一候选完成核验。

| 条件 | 实际核验结果 |
| --- | --- |
| 戴眼镜 | match，引用本次公开视频截图，不依赖头像。 |
| 本人公开自述白人 | match，依据本人账号帖文的无障碍说明，不依据照片推断族裔。 |
| 普通消费者KOC | match，结合个人账号公开资料与内容，未仅凭粉丝数判断。 |
| geek／书卷／极客穿搭风格 | unknown，当前画面不足以证明，未照抄远端fitReason判为通过。 |

实际输出3个命中条件标签，说明原题的“逐条件分析并标签化”已有实现。它没有顺带补出“生活博主”等未定义的画像维度。见 [mixed-completion.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/mixed-completion.json)、[原题部分候选结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/screenshots/mixed-final-results-0.png)、[协助操作记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/mixed-assistance.json)。

同时再次复现F11：API国家为 `GB`，允许范围含 `United Kingdom`，程序却把地区判为不匹配。该人Geek仍未知，即使修复国家比较，也不能直接计为合格。

## 新增缺陷

### F14 · P1 · 打标指令被当作标签值，画像标签不能形成可用结果

定位：`src/server/research.ts:78` 将所有match条件的 `criterion.label` 原样放入 `Result.tags`。核验工具没有独立标签值输出；主会话也没有修改／补核验结果的工具。

影响：自然打标请求得到口头承诺或聊天整理，但内容方向、风格、合作类型等具体值停留在理由／聊天里；结果页、检索、报告与导出未得到它们。指令中的示例词还会造成标签检索误召回。实际复现证据包括6人补标签前后记录一致、两人重新核验后标签相同，以及geek查询错误返回2人。

已有能力是“明确条件命中后保存条件标签”，不能概括成完全没有打标。固定的预定义标签可以拆成可选的具体条件；当前自然输入没有被正确转成这种分类。若支持自由画像标签，应让模型提交独立的维度、值、状态、理由及来源，并真正持久化这些值。给已有名单补标／重新核验也需要可执行的写回工具，报告、CSV和标签筛选使用同一份保存结果。仅要求主会话“多输出几个标签”不能解决本轮已复现的问题。

### F15 · P2 · 搜索运行中已返回候选，应用仍不开始逐人核验

定位：`src/server/research.ts:56–67`；远端状态不是done便直接continue，丢弃该次响应已返回的候选和资格进度。

实际原题任务：WaveSurge GET为HTTP200、状态running、creators非空；本地仍为0核验、0结果。不是远端一直没有提供任何人。见 [main-completion.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/main-completion.json)、[部分候选来源快照](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/partial-original-creators.json)。

建议接收可用的部分候选、稳定去重、执行本地核验并展示两层进度；保留远端尚未完成的状态和结果版本，不能把部分返回当成整项搜索完成。该问题会放大等待时间，也让用户无法看到已经返回者的标签和依据。

## 文档交付结论

已有HTML和CSV报告，包含记录、条件判断和理由；**不能说项目完全没有文档功能**。本轮明确存在的问题是：新画像标签没有写入这些文档，聊天里的Markdown表格没有渲染成表格（实测table数量0、显示原始竖线，F09），任务结束后也不会主动在chat交付报告（此前真实完成事件已复现F10）。用户追问后可以得到临时整理及旧报告链接，不能把它算作完整的自动交付。

实际页面：[聊天“文档”的表格显示](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/screenshots/enriched-chat-tags.png)、[原报告仍是旧标签](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/screenshots/original-report-2.png)。

## 未完成与手动验收

新的TikTok基本任务与两类Campaign任务在11:30快照仍为queued、0核验。原题20人任务仍running；已出现部分候选，主应用尚未核验。**这些搜索的终态、完整人数、全量标签和新最终文档，均没有验收通过。** 远端返回 `expectedDurationHours=5` 只是服务字段，不是完成时间保证。

两类Campaign的目标澄清、草案、确认和真实API提交已经实际验证；不能将这些步骤等同于最终找到两位合格者并交付标签文档。受控重放验证了本地核验和标签数据问题，不能替代完整的新搜索验收。

任务编号、API、继续验证方式及需要真人参与的范围见 [未完成与人工验收清单](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/remaining-validation.md)。本轮也没有验证所有TikTok账号、X真实内容或标签准确率；没有独立人工标注样本，因此不报告定性准确率。

本轮新增F14/F15；与此前报告合并，共15项已记录问题：5项P1、9项P2、1项P3。未修复业务实现。此前测试结果仍作为各自场景的证据，没有重复跑未改动的构建和单元测试来充当打标验收。

最后核对：2026-10-10 11:30（上海时间），三项新TikTok搜索仍queued、0核验；原题仍running、远端返回1位但本地0核验。状态来源见[最终快照](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/final-status.json)。3300已停止且无未完成协助；主部署及3400保留运行。
