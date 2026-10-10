# Creator Studio 第二轮完整复测

2026-10-10，上海时间，约 14:10 开始。本轮只测试和审查，没有修改业务源码。最后任务状态和验证边界见文末。

**结论：仍不能认定完全实现面试题。** 自然语言解析、实际画像保存、文档入口和多类型 Campaign 已有实现；真实召回、账号范围、全候选分析和整批交付仍失败。旧 15 项问题中，12 项的原缺陷行为回归通过，3 项仅部分修复；本轮新增 7 项，共 10 项当前缺陷。

## 验证环境和证据范围

| 范围 | 实际执行 | 能证明什么 |
|---|---|---|
| 全新真实任务，3552 | Chrome 聊天框输入自然消息；实际 WaveSurge、配置模型、生产有头 Chromium | 本轮实际接口数据、候选处理、外部页面核验和交付 |
| 历史真实账号，3000 | 六人补标与失败账号自然重试；复用既有公开证据 | 新版补标、版本、画像查询、HTML 和 CSV 更新；不代表本轮重新发现这六人 |
| 新卷受控验收，3550/3551/3553 | 受控 Wave/账号/媒体；实际配置模型、应用 UI 和生产有头浏览器 | 已知输入下的视觉传递、排序、配额、去重、持久化；不能替代真实召回成功 |

开始时对 55 个 TS/TSX 文件计算哈希，主服务与本地一致，桌面执行代码与本地一致：[源码核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/source-check.json)。密码从 Docker 实际读取，没有写入脚本常量、报告或截图。

## 对照题目要求

| 要求 | 实际浏览器验证 | 判定 |
|---|---|---|
| 多维度自然语言交互 | TikTok 基本请求、指定两账号、原题 20 人输入及澄清；实际模型生成数量/平台/地区/粉丝/必选/偏好/画像维度 | 解析已实现；端到端仍有缺陷 |
| 基础条件候选召回 | 实际 `/discover/db`；新版 Instagram GET 搜索、详情和帖子 | 未通过：F17、F19 |
| 逐人定性分析、校验与打标 | 实际来源/照片/桌面截图传入模型；六人不同标签保存；独立重复全候选用例 | 部分实现：F16、F18、F02、F03 |
| 结构化文档、符合清单、匹配说明 | chat 自动文档链接实际点击；结果展开；HTML 打开及 CSV 下载；标签查询、过滤导出、刷新保存 | 原 chat 无文档入口已修复；F20、F21 仍影响交付 |
| Campaign 目标驱动交互 | AI 课堂笔记目标→澄清→两类草案→修改偏好生成 v2→确认→核验→去重汇总 | 交互/计划流程已实现；真实结果 0/2，未达到筛选交付验收 |
| 补充：整批结束后一次交付 | 六人补标和双类型 Campaign 的 chat 消息、时间戳、链接逐条核对 | 未通过：F20 |

未知特征保留 unknown 是正确处理。不能从外观推断族裔；缺少公开自述时不得宣称符合“欧美白人”。本报告不把私人内容不可访问、拒绝猜测当作缺陷。

## 实际场景

这些消息均通过 Chrome 聊天框发送；JSON 保存原文、模型调用、工具参数和实际结果。

| 场景及自然消息摘要 | 实际结果与证据 |
|---|---|
| “帮我找2个 TikTok 上做数码内容的美国男博主，粉丝1万到10万，戴眼镜的优先……先看4个候选……每人标一下内容方向、风格和戴不戴眼镜” | 核验4人，0/2。候选全是超范围大号，浏览器均为空白页。[输入/工具](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/basic.json)、[实际结果和导出](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/basic-results.json) |
| “我们下个月要在美国推一个 AI 课堂笔记工具……让大学生看完愿意注册……先帮我把范围想清楚” | 澄清、草案、修订v2与确认完成；两类各选1人、各看2人，核验4条，去重0/2。界面、汇总、子报告实际打开。[Campaign UI](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-campaign-ui.json) |
| “先就看 tylerlcrawford 和 valstechtalkk 这两个，不要扩大搜索……每个人标清内容方向、风格和戴不戴眼镜” | 实际处理 tylerlcrawford 和 tylercrawford118，1/2；漏掉第二个目标。[真实 API/模型](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-final-progress.json)、[浏览器文档/导出](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/instagram-new-results.json) |
| “结果里面怎么是 tylercrawford118？他不是 valstechtalkk……先单独把 valstechtalkk 补看一下吧” | 独立精确账号纠正请求；纠正任务最终完成1/1，实际服饰/内容标签已保存、文档与CSV打开下载；眼镜/geek偏好仍如实待确认。不能视为原双账号任务已修复。[自然请求](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/instagram-val.json) |
| 原题：“帮我找20个 geek风、戴眼镜、欧美白人，粉丝数在1万到10万之间的 ins 平台 KOC” | 已实际发送、澄清并启动新版GET。本轮范围明确最多读取20个候选；候选数不等于合格数。最终partial：处理20候选、0/20合格；6位访问限制经操作者明确跳过，不能宣称20位已完成视觉核实。[原题输入](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/original20.json)、[范围确认](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/original20-scope.json) |
| “这6个人再整理一下……不用重开网页……用已有证据……标签真的存进结果里，刷新后能查到” | 三个补标工作；首次Tyler真实408，后续自然消息只重试他。六人的内容/风格/合作形式都保存。实际标签查询、过滤CSV、带截图HTML、刷新验证通过。[请求](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-enrich.json)、[重试](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-retry.json) |
| “只选1人，但2个候选都看完并打标”，无偏好 | 独立两次实际模型+浏览器执行，均只分析第一人，第二人没有结果/标签。[第一次](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/all-candidates.json)、[第二次](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/all-candidates-repeat.json)、[实际一人文档](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/all-candidates-results.json) |
| “另开一项简单的文字核验……不用打开浏览器……别动之前的任务” | 资料取得75条，人工待处理时 evaluated=0；三次公开弹窗关闭协助结束后才 completed 1/1。[等待](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-text-status.json)、[完成文档/导出](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-text-completed.json) |
| 旧版20人任务继续处理 | 旧远端已failed，保留返回的3位候选；三次公开弹窗协助后全部核验，partial 0/20，没有新提交旧POST搜索。[实际结果/文档](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-legacy20-completed.json) |

## 实际画像和检索

六人补标确实保存了具体值，而不只是判断“是否合格”。下表仅摘录；完整值、依据、版本和证据见实际导出。

| 账号 | 内容方向 | 呈现风格 | 合作形式（既有内容形式，非合作意愿） |
|---|---|---|---|
| tylerlcrawford | 智能家居、家庭自动化、家居科技 | 第一人称体验、生活场景化说明 | 家居场景体验Reel、自动化流程介绍 |
| valstechtalkk | iPhone功能技巧、手机相机设置 | 技巧分享、可爱与美妆元素融合的自述定位 | iPhone技巧、相机设置教程 |
| SchoolHabits | 学习方法、考试复习、笔记方法 | 教学讲解、分章节步骤 | 学习方法教学、复习步骤教程 |
| raytubelcsw | 社会工作执照考试、ASWB练习题 | 系列题目讲解、专题讲解 | 练习题视频、复习课程介绍 |
| colelangs | 语言学习、Anki教学、旅行文化 | 分步教学、时间戳章节 | 工具操作教程、既有赞助/联盟披露形式 |
| wesleyanna | Notion、数字效率、个人组织、生活记录 | 入门导向、分章节、轻松口语化文案 | 工具入门、模板配套、工作空间导览 |

实际 Notion 查询只返回 wesleyanna；geek 不再因指令举例误命中。CSV已逐字段检查标签、画像、判断和证据。证据：[Instagram两人](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-tech-labels.json)、[学习两人](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-study-labels.json)、[工具两人](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-tools-labels.json)。这些是模型依据内容作出的定性标注，没有建立人工准确率基准。

## 当前缺陷（10项）

### F20 / P1：没有按用户请求整批结束后一次交付

一次六人补标在后续重试前产生 **10条报告通知**：5条单人更新引发的源研究报告、3条分组补标结束通知、2条历史Campaign更新。第一条出现时另两组仍未结束。后续只重试Tyler又产生2条。一次新双类型Campaign产生 **3条**（两个子报告+汇总），第一条在第二类完成前发出。普通单项研究只发一次终态通知，不能覆盖这些批次场景。

每人补标后 [enrichment.ts:46](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/enrichment.ts:46) 保存已终态源任务，[research.ts:49](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:49) 立即按包含 result.updatedAt 的新指纹交付；Campaign也按每个结果版本交付。缺少一次用户请求的batch ID及全部工作完成屏障。建议单人/子任务只更新进度，全部结束后一次汇总失败、缺额和文档；后续明确重试形成新批次。sidebar进度可以继续更新。

[消息时间线](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-notifications.json)、[实际chat的10条](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-batch-notifications-ui.json)、[实际Campaign的3条](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-batch-notifications-ui.json)、[chat截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/screenshots/main-batch-notifications-1.png)。

### F16 / P1：真实名单没有主页URL，非Instagram取到空白页

真实TikTok和YouTube各100条API记录均无profileUrl；适配器接受只有handle却保留空URL。合计8条结果全部引用 about:blank 与同一空白截图，没有访问这些账号的主页/近期内容。YouTube部分内容标签能来自简介，但表达风格等缺有效内容证据。受控夹具提供URL，所以通过不能证明真实适配正确。

定位 [wave.ts:59](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/wave.ts:59)。应按可靠平台身份定位主页、验证归属；无法定位时报告来源错误，不能把空白页保存为候选证据。[名单结构](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/real-pool-shape.jsonl)、[TikTok结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/basic-results.json)、[YouTube实际结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-final-progress.json)。

### F17 / P1：基础条件未参与召回，固定截取粉丝最高账号

TikTok前100条粉丝5,000,000–331,181,300；YouTube为5,280,000–80,600,000，全部超出要求10,000–100,000。固定GET limit=100&sort=followers_desc，然后按预算直接截前4/2条；Campaign两类反复用相同大号。只能证明所取大号不符合，不能证明已有完整池没有目标KOC。

定位 [discovery.ts:23](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/discovery.ts:23)、[research.ts:82](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:82)。按已验证API能力筛基础条件或分页扫描，先筛平台/地区/粉丝再计候选预算。[基本任务](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/basic-task.json)、[Campaign API范围](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/after-campaign.json)。这是WaveSurge实际响应，未自行注入；其中带seed命名的账号是否真实也须访问主页确认，HTTP200不能保证数据质量。

### F18 / P1：要求所有候选打标时，达到入选人数就停止

两次自然请求均选1人、全部看2人并打标、无偏好。模型参数count=1、candidateBudget=2正确；程序拿到2人后只处理首人即completed，第二人没有结果或标签。助手承认遗漏，但自动报告仍完成1/1。

[research.ts:128](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:128) 和 [research.ts:154](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:154) 仅Campaign/偏好时全量分析，普通搜索工具没有表达分析所有候选的字段。应区分入选配额、读取预算和必须分析范围。[两次复现](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/all-candidates-repeat.json)、[实际文档只含一人](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/all-candidates-results.json)。此项为受控账号上的真实模型/浏览器执行，定位执行逻辑，不宣称账号为真实线上创作者。

### F19 / P1：首个关键词耗尽预算，漏搜第二指定账号

用户反复限定Tyler与Val；首个查询返回的相似用户名tylercrawford118占用第二名额，delivered=2即结束，valstechtalkk从未被查询。相似账号被精确账号条件正确排除，但任务已经漏掉正确目标并以1/2终态结束。

[discovery.ts:12](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/discovery.ts:12) 清空首查询pending才处理后续关键词，[discovery.ts:27](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/discovery.ts:27) 达预算就结束。指定账号应精确解析，只计目标身份；多个泛关键词也需合理分配。[真实请求](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/instagram-retry.json)、[实际候选/API轨迹](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-current.json)。单账号纠正成功也不能算原请求通过。

### F02 / P1 / 部分修复：人工等待仍卡住不需要桌面的新研究

API增量读取、已有结果文字补标已能继续；新纯文字核验仍被统一browserBlocked拦住，资料已齐也evaluated=0。解除全部旧研究协助后才完成1/1。

[research.ts:131](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:131) 把任何需模型核验的任务都归入桌面互斥。应只串行真实桌面操作，API文字核验独立执行。原题测试还为已确认粉丝58、0、736的私密小号请求登录，虽然其已确定不满足1万下限，造成无意义的整批阻塞。[等待](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-text-status.json)、[完成](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-text-completed.json)。本轮公开页仅关闭注册提示并重新交还，没有社交登录。

### F03 / P2 / 部分修复：真实408超时仍终态化

0/429/5xx有界重试单测通过；真实408不在retryable内。Tyler补标初次408直接partial，attempts为空；主聊天也408。Instagram澄清另一次408未创建研究，必须用户自然后续重试。只重试失败账号后成功，证明并非永久无效输入。

[model.ts:12](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/model.ts:12)；应保持原工作、幂等工具与上下文，按可恢复错误有界退避。[失败记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-enrich.json)、[成功重试](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-retry.json)、[另一轮408](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/instagram-clarify.json)。

### F21 / P2：只补画像也改变既有筛选条件和入选名单

annotate工具明确保留原判断。实际Tyler补标额外提交country原文“austin, tx”；原Wave资料US/confirmed_country，verdict=match且selected=true。程序将无法按国家解析的城市州文字记为country conflict，使已确认地区和结论变unknown，转而选另一人。报告同时称国家已确认与unknown。

[enrichment.ts:42](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/enrichment.ts:42) 在annotate模式仍应用facts并重算；[assessment.ts:44](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/assessment.ts:44) 将无效格式与真实矛盾合并为conflict，[verdict.ts:26](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/verdict.ts:26) 推翻已确认国家。建议画像补标隔离基础事实/条件；事实更新走明确重新核验，无效补充不自动推翻既有证据。

[实际浏览器导出](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/main-tech-labels.json)。用同一真实历史版本与模型返回只读回放：原返回→unknown；去掉额外facts→match；仅保留有效粉丝fact→match，未写生产数据。[三组因果回放](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/annotation-isolation-replay.json)。

### F14 / P2 / 部分修复：画像值已保存，但条件指令仍污染标签查询

六人补标的实际画像值保存和geek举例误召回已修复。不过新Val纠正任务仍将完整条件说明直接写入tags，如“个人创作者账号，不是品牌、商店或机构账号”和“若未找到则报告来源缺额”。实际标签查询 **品牌**、**来源缺额**均返回并导出这位已成功找到的个人创作者；其实际画像values均没有这两个标签。

这是旧F14的检索污染仍未完全修复，故最终回归判定改为部分。根因 [assessment.ts:51](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/assessment.ts:51) 把匹配criterion.label与画像values混合，再用包含关系搜索。建议将完整筛选指令放在匹配说明中，标签只保存经过规范化的实际值或短的正向条件值，避免否定和分支指令误命中。

[两次实际UI查询和CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/negative-tag-query.json)、[品牌误命中截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/screenshots/negative-tag-0.png)。没有新增搜索或模型调用。

### F22 / P2：20候选人工等待时服务卡顿，桌面加载超过60秒

真实20候选任务等待人工协助时，隔离服务多次 noVNC 停在 `noVNC_loading`，60秒仍未建立连接，无法关闭公开注册提示。独立网络记录显示脚本资源逐层加载很慢，已完成请求为200；最后未完成请求是在测试关闭页面时中止，不能据此认定资源404。401为未登录的初始session探测，favicon404也不作为此问题根因。

同一实例、同一数据卷三次普通首页GET分别 **10.335、10.888、10.814秒**；桌面容器直接取vnc.html为0.114、0.017、0.047秒。20人任务终态后，只剩1人任务等待，首页相同三次请求为 **0.537、0.004、0.004秒**，noVNC再次实际连接、画面可见，并成功操作Val公开帖提示。不能把前面的60秒超时全部归为测试脚本问题。

结合代码，性能根因高度怀疑为等待期间反复读取大任务：每秒唤醒读取所有大任务JSON，循环每个候选先调用 `cancelled()` 再检查已有结果/等待状态，反复同步读取和JSON.parse同一整份含原始资料的任务；人工等待时没有有效的休眠/跳过。采样时app CPU超过110%，仅6份研究task JSON已达17.5MB。完整CPU火焰图尚未采集，具体耗时比例仍应 profiling；服务延迟和桌面不可及时协助已实际复现。

定位 [research.ts:128](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:128)、[research.ts:132](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:132)、[store.ts:9](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/store.ts:9)、[bootstrap.ts:48](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/bootstrap.ts:48)。建议等待状态避免逐候选忙轮询；将轻量状态与原始大资料分离，只在必要动作边界刷新取消状态，并保证静态桌面资源/接口不被长同步循环阻塞。

[60秒实际网络与桌面状态](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/viewer-diagnostic.json)、[实际加载画面](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/screenshots/viewer-diagnostic.png)、[等待时三次延迟](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/viewer-latency-before.json)、[批次终态后的三次延迟](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/viewer-latency-after.json)、[数据体积](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-document-sizes.json)、[恢复后的真实桌面画面](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/screenshots/live-assist-val-before.png)。

## 旧15项回归

“通过”指原缺陷在本轮证据范围通过，不代表全应用/全部线上账号都通过。

| 编号 | 判定 | 实测范围 |
|---|---|---|
| F01 身份重复计数 | 通过 | 统一身份/历史修复单测，受控Campaign实际去重配额 |
| F02 人工阻塞 | 部分 | API/补标继续；新纯文字仍阻塞 |
| F03 临时模型失败 | 部分 | 0/429/5xx重试；真实408仍失败 |
| F04 偏好排序 | 通过 | 受控实际浏览器优选偏好匹配者；真实多人合格比较未形成样本 |
| F05 过滤导出 | 通过 | 六人三组及新任务实际查询、过滤CSV字段/数量一致 |
| F06 证据导出 | 通过 | 单项HTML内嵌截图；CSV含画像、事实、判断、证据映射、照片和截图路径 |
| F07 桌面边界 | 通过原缺陷 | 真实RPC拒绝file/link-local/未许可localhost/含凭据URL；敏感表单守卫仅单测 |
| F08 历史依赖E2E | 通过 | 全新项目/卷4项验收通过 |
| F09 GFM表格 | 通过 | 真实DOM表格及自然Campaign澄清可见 |
| F10 chat报告入口 | 通过原缺陷 | 自动链接实际打开HTML/下载CSV；新F20时机/数量失败 |
| F11 国家别名 | 通过原缺陷 | 标准化单测；真实历史US重算match；新F21另计 |
| F12 重启Cookie | 通过 | 实际noVNC写3次Cookie/localStorage，3次正常桌面重启保留；非真实社交会话 |
| F13 基础数值事实 | 通过 | 受控边界；真实SchoolHabits 20.4K等显示原文保存并参与粉丝条件 |
| F14 实际画像值 | 部分 | 实际值保存、举例geek误命中已修；品牌/来源缺额仍被否定和分支条件label误召回 |
| F15 增量核验 | 通过 | 真实新版来源未结束已有结果；旧远端failed的3候选仍继续核验 |

## 执行检查

| 检查 | 结果 |
|---|---|
| 类型检查、生产构建 | 通过：[类型日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/typecheck.log)、[构建日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/build.log) |
| 单元/集成 | 24文件、155测试通过：[日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/unit.log) |
| 新卷受控浏览器验收 | 4/4、5.6分钟：基本筛选/偏好/补标/文档、自然Campaign、新版IG及视觉、三次桌面持久化。[范围和日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/acceptance.log) |
| 独立基础UI | 16项通过：鉴权、空/错密码、图片上传/移除/识图、设置保存、备份/错误载入/恢复、上下文清空、桌面、Campaign、移动布局、应用重启、退出。[证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/foundation-ui.json) |
| 非空压缩 | UI按钮真实模型生成摘要；保留完整transcript/任务/最新用户轮；刷新checkpoint仍在；不重放发现工具。[证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/compression-populated.json) |
| URL限制 | 4类实际桌面RPC拒绝，页面不改变；并非完整安全渗透测试。[证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/policy-runtime.json) |
| 源码与构建一致性 | 测试开始/结束的55个源码文件未变；主服务与桌面执行代码、本地及三个测试服务的前端产物一致。[结束核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/source-check-final.json)、[工件核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/artifact-check.json) |

新版新搜索实际使用GET：`/discover/db?platform=...&limit=100&sort=followers_desc`；`/instagram/v3/search_users?query=...`；`/instagram/v1/fetch_user_info_by_username_v2?username=...`；`/instagram/v1/fetch_user_posts?user_id=...&count=12`（下一页max_id）；`/instagram/v2/fetch_post_info?code_or_url=...`。不是此前新搜索仍在旧远端排队。兼容旧任务仅继续GET `/creator-search/requests/{taskId}`；本轮没有为新版任务调用旧POST创建搜索。补标没有新增Wave搜索或重开页面。

## 验证边界

真实社交账号登录、短信/OTP、验证码及合法已授权私密访问未完整验证。实际协助仅关闭公开注册提示、明确跳过私密内容并恢复原候选；没有输入社交凭据、关注或联系账号。受控持久Cookie成功不能证明任何社交服务会话永不过期。

未建立真实创作者人工标注准确率基准，不能给出geek风/类型识别准确率。20个全部条件满足的人选和真实Campaign配额尚未交付。也未做高并发、长时间压力、全平台和全安全分支验证。

浏览器脚本的早期失败包括React过滤状态等待不足、上下文清空/摘要边界假设，以及页面load/noVNC超时。已保留first-attempt证据并修正等待/断言后核实，测试脚本错误不计作产品缺陷；持续加载的真实性能问题另见F22。测试数据、脚本和旧报告保留。

## 最终快照（2026-10-10T15:45:05.364889+08:00）

本轮真实新建6个研究任务全部到终态，生成31条结果记录、29个不同平台账号身份。TikTok基本场景0/2；两类Campaign合计0/2；限定两账号任务1/2且漏搜第二人；纠正Val请求1/1；原题20候选全部生成处理记录，**0/20合格**。原题20记录中16位粉丝已超出要求，4位在范围内；总判断分布为不匹配15位、待核实5位。不能将这些结果归因于已经穷尽全部平台人选。

原题20单项任务只发布 **1条最终报告通知**，时间晚于所有20份结果写入，说明普通单项批次的交付时机正常；六人补标和两类Campaign仍失败，见F20。实际打开含20位候选条目的HTML报告、下载CSV、查询过滤、刷新保存均通过；HTML内嵌29张截图，其中包括登录/错误/私密页面，图片数量不能当有效视觉证据数量。

20人任务有6次不可访问内容的明确跳过：instagram:geekman545, instagram:geek, instagram:geekprincess7, instagram:geekderella, instagram:geek_in_miami, instagram:ily.g33kette。未登录、未关注/联系账号；其缺证据项保留unknown。主服务另完成3次公开弹窗关闭；Val纠正任务完成1次公开弹窗关闭并重新观察。这些是操作者协助过的运行，不能宣称全程无人值守。最后没有遗留未交还的人工租约。

[最终任务/交付证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/final-status.json)、[原题20人浏览器与导出](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/original20-final-results.json)、[纠正Val浏览器与导出](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/instagram-val-completed.json)、[最终真实调用轨迹](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/live-final.json)。

[需要你手动验证的范围与步骤](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/remaining-validation.md)：真实社交登录/OTP/挑战、被访问限制挡住的视觉项、真实登录会话持久化，以及有人工答案的定性准确率。已确认的缺陷需开发修复后回归，不需要你重复证明。3552真实实例保留用于查看本轮数据；受控测试服务清理时保留数据卷。

测试范围不足主要是：受控名单显式有主页URL，未覆盖真实DB缺URL；普通全候选无偏好、多关键词精确范围、严格单次批次通知、否定标签、408和大原始资料的等待性能需要补入后续回归。已有155测试和4受控浏览器用例通过不能覆盖这些实测失败。

临时受控3553的容器和网络已清理，数据卷保留；主3000、新真实3552和旧3400服务保留。[清理记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r2/cleanup.json)。
