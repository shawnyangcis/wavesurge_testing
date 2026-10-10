from pathlib import Path
from datetime import datetime,timezone
import json,collections,csv
p=Path('.gstack/qa-reports/retest-2026-10-10-r3').resolve();root=Path.cwd();link=lambda name,label=None:f'[{label or name}]({p/name})'
get=lambda n:json.loads((p/(n+'.json')).read_text())
real=get('live-final');before20=get('original20-results');six=get('six-batch');camp=get('live-campaign-ui');retag=get('retag-invariants');ext=get('extended-ui');inter=get('interaction-regressions');compress=get('compression-populated');source=get('source-check-final')
issues=[
 {'id':'F20','severity':'P1','title':'延后的工作未纳入整批交付屏障','regressionStatus':'partial','evidence':str(p/'handoff-failure.json')},
 {'id':'F02','severity':'P1','title':'人工接管期间 Agent 错误拒绝同时登记文字与网页工作','regressionStatus':'partial','evidence':str(p/'handoff-queued-failure.json')},
 {'id':'F23','severity':'P2','title':'任务登记期间切换上下文导致最终报告漏交付','regressionStatus':'new','evidence':str(p/'extended-ui.json')},
 {'id':'F24','severity':'P2','title':'粉丝缩写精度被误判为范围冲突','regressionStatus':'new','evidence':str(p/'follower-replay.json')},
 {'id':'F25','severity':'P2','title':'Instagram 已知超出基础范围的候选消耗定性分析预算','regressionStatus':'new','evidence':str(p/'instagram-base-budget.json')}
]
current10={'passed':['F16','F17','F18','F19','F03','F21','F14','F22'],'partial':['F20','F02'],'scopeNote':'通过指上一轮原缺陷在本轮证据范围内通过；F17原非Instagram分支已修，新Instagram预算问题另记F25；F13因新F24仅部分通过。'}
baseline={'date':'2026-10-10','round':'R3','status':'DONE_WITH_CONCERNS','acceptance':'not_accepted','businessCodeChanged':False,'issues':issues,'previous10Regression':current10,'previous15Regression':{'passed':['F01','F03','F04','F05','F06','F07','F08','F09','F10','F11','F12','F14','F15'],'partial':['F02','F13']},'checks':{'sourceFiles':source['sourceFiles'],'unitTests':181,'unitFiles':27,'coverage':'100% statements/branches/functions/lines','typecheck':'pass','build':'pass','controlledActualBrowserE2E':4,'independentFoundationUiChecks':16,'freshRealResearchTasks':7,'freshRealResultRecords':len(real['results']),'distinctRealPlatformIdentities':len({r['creator']['id']for r in real['results']}),'historicalRealCreatorsRetagged':6,'realOriginal20Evaluated':20,'realOriginal20Qualified':0,'realCampaignSelectedUnique':camp['plan']['matched'],'actualCancellation':'pass','actualPopulatedCompression':'pass','realSocialLoginAndCaptcha':'not_verified'},'healthScore':None,'healthScoreReason':'按需求与实测缺陷验收，没有足以支持全应用完成百分比或分类准确率的基准。','report':str(p/'report.md'),'manualRemaining':str(p/'remaining-validation.md'),'finalStatus':str(p/'final-status.json')}
(p/'baseline.json').write_text(json.dumps(baseline,ensure_ascii=False,indent=2))
report=f'''# Creator Studio 第三轮完整复测

2026-10-10，上海时间。约 18:26 开始。本轮只审查、测试并保存证据，没有修改业务源码。

**结论：本次迭代有明显改善，但仍不能认定完全满足题目要求。当前确认 5 项缺陷：2 项上一轮残留组合问题、3 项本轮新发现。** 上一轮 10 项原缺陷中，8 项在本轮相应范围回归通过，2 项部分通过。不能用 181 个测试及 100% 代码覆盖率替代真实功能验收。

## 测试环境与证据范围

| 环境 | 实际执行 | 验证边界 |
|---|---|---|
| 主服务 3000 | 6 位历史真实账号、3 个补标工作；实际模型、浏览器 chat、文档和 CSV | 补标及原判断隔离；没有把旧账号说成本轮重新发现 |
| 新真实实例 3572 | 新数据卷；实际 Chrome UI、配置模型、WaveSurge、生产有头 Chromium；7 项研究及 1 项重新核验 | 本轮真实来源、网站访问和任务交付；共有 30 条结果、26 个不同平台身份 |
| 受控实例 3573 | 实际 UI、模型和有头浏览器；明确的 Wave/账号/媒体夹具 | 设置、上下文、取消、错误注入、人工接管执行分支；不能替代真实平台登录 |
| 新卷受控验收 3570/3571 | 独立运行 4 项浏览器验收，5.3 分钟全部通过 | 视觉传递、排序、Campaign、Instagram 协议和 3 次持久化重启 |

开始和结束对 57 个 TS/TSX 文件核对哈希，主服务、真实实例、受控实例及桌面执行源码都一致；本轮未改业务源码。{link('source-check-final.json','最终源码核对')}。凭据从 Docker 内读取，没有写入报告或脚本常量。

## 题目要求逐项验收

| 要求 | 本轮实际验证 | 判定 |
|---|---|---|
| 自然语言、多维混合条件 | 原题原文→澄清；数量、平台、地区、粉丝、个人 KOC、内容、眼镜/geek、公开自述条件及画像维度进入真实工具参数 | 已实现，包含真实浏览器操作 |
| 基础条件召回 | TikTok/X 500 条池预筛及相关性选择；IG 指定两个账号精确读取、三个词轮转 | 部分通过；IG 数值预筛/预算问题 F25 |
| 逐人定性核验与打标 | 原题 20 条全部生成记录；2 人选 1 仍全部分析；真实照片/本人页面/帖子文字；6 人不同画像、版本及证据持久化 | 已实现，仍受 F02、F24 影响；未知项保持 unknown |
| 结构化结果文档 | chat 自动链接实际点击；单项与综合 HTML、Campaign 总报告/子报告、CSV 下载、标签过滤、刷新 | 原“chat 看不到文档”已修复；边界 F20、F23 仍会过早或漏交付 |
| Campaign 目标驱动交互 | 智能生活 App：目标→追问→2 类草案→v2 修订→UI 确认→逐人核验→去重 2/2；旅行背包目标提出不同类型与追问，无未经请求的搜索 | 已实现，本轮形成真实成功配额样本 |
| 整批结束后一次交付 | 6 人三组补标、原题、文字双任务、正常 Campaign、重新核验的时间戳/文档/刷新 | 普通已登记批次通过；包含“延后未登记工作”的 F20 残留 |

本轮原题仍未交付 20 位满足全部条件的人选。没有可靠的本人公开族裔自述和视觉证据时，保留未知是正确行为，不能据外貌、姓名或国家推断。0/20 本身不证明实现错误；已知基础范围候选被计入分析预算的问题另有 F25 的实际证据。

## 实际用户场景与结果

所有下列自然消息都通过浏览器聊天框发送，完整原文、实际工具参数及调用记录保存在 JSON 中。

| 场景 | 最终实际结果 |
|---|---|
| “先就看 tylerlcrawford 和 valstechtalkk…只选1位，但两位都分析完并打标” | 精确得到两个指定账号，核验 2、选 1；无相似账号替代、没有提前停在第一人。Val 首次受到 F24 误判。{link('exact-two.json','消息/工具')}、{link('exact-two-results.json','实际 UI/文档/CSV')} |
| 原题“帮我找20个 geek风、戴眼镜、欧美白人…ins…KOC”及口语澄清 | 20/20 处理、0/20 合格；19 no_match、1 unknown；仅 4 位粉丝在范围内。20 位的眼镜/geek/公开族裔均未取得通过证据。20 位都保存内容画像，共 21 个截图证据引用；图片包括商品或受限内容，数量不代表有效人体特征证据。{link('original20-scope.json','真实参数')}、{link('original20-results.json','实际结果')}、{link('original20-batch.json','统一交付')} |
| 智能生活 App，希望美国年轻人下载并试用功能 | 两组：智能家居体验、手机实用工具；确认 v2 后各核验 2 人，去重选 Tyler 与 Val，达到 2/2；只发 1 条最终 Campaign 总报告。受众在美国不等于已证实创作者所在地/受众构成，修订已将创作者国家不限、英语作为偏好。{link('campaign-revise.json','修订')}、{link('campaign-start-ui.json','实际确认/幂等/旧版本拒绝')}、{link('live-campaign-ui.json','总报告及子报告')} |
| “另外…轻便旅行背包…英国25到35岁…周末短途游…先帮我想范围，暂时别搜索” | 生成旅行/城市生活/轻户外等不同方向，追问产品、预算、平台、人数、归因；明确受众年龄不是博主年龄条件，没有创建研究任务。第二目标验证了规划和追问，未执行第二轮真实旅行筛选。{link('campaign-travel.json','实际对话')} |
| TikTok 手机/数码个人体验，粉丝 1万–10万，选1、看2 | 500 条池，排除 324、剩 176，实际访问 larissa2468_（61.9K）和 juanescalonafilms（23.8K）本人页；遇滑块挑战/帖子加载失败，操作者两次明确未登录、未完成验证码并跳过。最终处理 2、0/1；没有 about:blank 证据。{link('tiktok-results.json','结果/文档')}、{link('tiktok-hold.json','首次跳过')}、{link('tiktok-second.json','第二次跳过')} |
| YouTube 学习方法及 X 开发工具两项文字研究 | YouTube 读取 500 条全部超出 1万–10万（本次池为 520万–5.02亿），0 条核验；X 500 条排除 493、7 条预筛后选 2 条核验、0/1 合格。两项统一报告。X 在真实 TikTok 协助待处理期间完成。不能据有限池断言全站没有 KOC。{link('live-progress6.json','读取边界')}、{link('text-batch.json','双项统一文档')} |
| “这6个人…只用已存资料补内容方向、风格、合作形式…全做完再汇总” | 3 个补标工作全部完成，6 条版本增加；事实、原判断、总 verdict、原 selected 全不变，Wave 调用 199→199。只新增 1 条本次综合交付，6 人 HTML 与 CSV 实际打开。{link('retag-invariants.json','隔离核对')}、{link('six-batch.json','批次交付')}、{link('six-csv-checks.json','字段核对')} |
| “只查保存的两个账号，有证据戴眼镜的，没戴和不确定别算” | 只调用 get_results、0 新 Wave；正确返回 0 人，排除 Tyler 的“照片中未戴眼镜”及 Val 未知，保留原数码入选记录。{link('saved-glasses.json','自然查询')} |
| “重新打开已有主页复核，别搜新人，保留前一版，两位全结束再汇总” | 受控 YouTube 两位均有新 browser observation、v1→v2、保留历史。真实 IG 两位 v1→v2、无 Wave；Tyler 取得新照片观察，Val 尝试主页导航被归属保护拒绝，复用旧文字、视觉仍未知，不能宣称两位当前主页都核实成功。只新增 1 条复核批次交付。{link('interaction-regressions.json','YouTube/版本')}、{link('instagram-reverify-audit.json','真实复核记录')}、{link('instagram-reverify-batch.json','复核统一报告')} |

示例实际标签摘录：Tyler 为“智能家居、家庭自动化、科技与酒店评论、第一人称生活场景分享”；Val 为“手机使用技巧、iPhone功能演示、数码配件体验”；SchoolHabits 为学习/复习方法；raytubelcsw 为社会工作执照考试；colelangs 为语言学习和 Anki；wesleyanna 为 Notion、效率及个人组织。每个人都有自己的值、理由与来源，未知维度没有伪造正向标签。完整值见 {link('six-batch.csv','六人实际 CSV')}。

## 全功能回归，包含未上报过的组合

| 范围 | 实际结果与证据 |
|---|---|
| 登录、退出、错误密码、未登录数据 | UI 正确登录/错密码/退出；空白发送禁用；11 个受保护接口 401；错误来源写入 403；非法文本/图片 400；缺对象 404、未认领控制 409。{link('foundation-ui.json')}、{link('extended-ui.json')} |
| 参考图片、移动屏幕、Markdown | 图片上传、移除、实际模型识别左右绿色/蓝色，无自动搜索；375px 无横向溢出；GFM 表格实际 DOM 可见。{link('foundation-ui.json')} |
| 设置与完整记录 | 留空 key 保存不更换凭据；提示词通过 UI 临时保存后下一真实调用生效，再恢复；阈值 1999 拒绝；完整调用记录、备份真实下载。{link('extended-ui.json')} |
| 上下文 | 闲置时备份/恢复/清空、错误 JSON 拒绝、已有任务保留、无工具重放；非空历史实际模型压缩新增 1 次 compression 调用，最新用户/问答未被压进旧摘要，刷新保留。运行中切换上下文另发现 F23。{link('compression-populated.json')} |
| 对话持续输入、停止任务、幂等 | Agent 仍 active、研究 running 且 evaluated=0 时连续 UI 输入取消/查询/保持停止；正确 cancel_research，已有结果不变；等待在途处理后无晚到记录；同 ID 同正文 200，改正文 409，无额外模型/任务。{link('interaction-regressions.json')} |
| 桌面与持久化 | 实际只读连接、接管/交还/重新观察；明确受控人工期间文字 2 人完成、网页 0 人且没有提前报告，交还后网页 2 人及单次总交付。三次实际 noVNC Cookie/localStorage 写入加三次正常重启保留。{link('handoff-confirmed-ui.json')}、{link('acceptance/persistence-three-restarts.json')} |
| 临时与永久错误 | 单独标明故障注入：chat、候选选择、逐人核验各首次 408→自动重试真实模型成功，身份/任务不重建；400 不重试且显示未完成。没有把注入错误说成真实外部故障。{link('fault-ui-first-attempt.json','chat/选择 408')}、{link('fault-ui.json','核验 408/400')} |
| 安全边界 | 实际桌面 RPC 拒绝 file、link-local、未许可 localhost、带嵌入凭据 URL；未授权报告/证据/桌面入口拒绝。敏感表单及 HTML/CSV 转义还有单元测试；没有做完整渗透。{link('policy-runtime.json')} |
| 文档与画像保存 | 11 组实际结果 HTML/CSV 及标签过滤/过滤导出/刷新，CSV 用标准解析器核对行数；文档含原条件理由、画像及证据。{link('csv-regression.json')} |
| 性能 | 真实 20 人研究已处理 14 人时的 20 次测量：root p95 7.63ms、state p95 6.86ms；实际 noVNC 连接 1.58/2.54/1.97 秒。该次测量是在真实处理负载下；人工接管的执行隔离另做实际对照，未做高并发或长时压力。{link('performance-ui.json')} |

## 当前缺陷（5项）

### F20 / P1 / 部分修复：第二项只在自然语言待办中，第一项却被当作整批结束

受控人工接管期间通过 UI 请求“文字研究 + 网页研究，等两项全结束后汇总”。Agent 只登记文字项，明确承诺第二项稍后及整批交付。第一项结束时自动发出“本次请求的1项工作已全部结束”及最终报告；第二项尚未登记、尚未执行。

预期：两项都在请求的工作清单中，网页可以排队，但最终报告等两项终态。实际：程序屏障只看已登记 items，无法看到 Agent 留在自然语言的第二项。普通六人补标及已登记多项任务的正确屏障不能覆盖这个残留。

复现原文与实测：{link('handoff-failure.json')}、{link('handoff-ui-first-attempt.json')}、{link('screenshots/handoff-failure.png','截图')}。定位：{f'[registerWork]({root}/src/server/work-delivery.ts:9)'}、{f'[workSummary]({root}/src/server/work-delivery.ts:19)'}。应让所有已授权工作先登记为执行/排队状态，或明确交付未执行清单，不能承诺等两项却只把第一项当整批。

### F02 / P1 / 部分修复：Agent 错误声称人工期间无法暂停网页项并启动文字项

进一步明确输入“两项现在都登记，网页只排队，授权已明确，文字先跑”。Agent 改成保存 Campaign 草案，没有登记研究，并声称“当前无法让同一批次中的网页项单独暂停”。随后使用实际 Campaign UI 确认同一草案，真实后台成功做到：文字两位完成、人工仍持有桌面、网页 evaluated=0、无提前报告；交还后网页两位完成并一次交付。

所以后台执行隔离已修，问题仍在主 Agent 的操作决策和错误能力说明。实际 TikTok 人工待处理时 X 也完成文字核验，支持这个结论。应修正角色/工具决策及登记规则，不应让用户多次纠正或额外点击才能执行已明确授权的请求。

{link('handoff-queued-failure.json','错误决策/原文')}、{link('screenshots/handoff-queued-failure.png','截图')}、{link('handoff-confirmed-ui.json','同一计划实际能力对照')}。这是明确标注的受控人工接管用例，没有冒充真实登录。

### F23 / P2 / 新：任务已登记、Agent 尚未答复时重置或载入上下文，永远缺最终文档通知

两个独立实际 UI 分支：研究已登记且 batch.sealed=false → 设置中“清空上下文”/“载入调试上下文” → 任务后续均处理两人到 partial，结果仍在，但 work-batch 保持 sealed=false、delivered=false，0 条最终报告通知。

界面承诺清空只影响后续对话、已有任务保留。预期后台仍交付终态文档；实际任务可以完成，交付却静默丢失。上下文迁移将旧 pending 标成 delivered，旧 Agent 运行被 epoch 检查终止；sealWork 只在 publish 时对当前 pending 调用，原 batch 没有收尾责任。

{link('extended-ui.json','两次实际复现')}、{link('screenshots/extended-reset-after.png','清空后')}、{link('screenshots/extended-load-after.png','载入后')}。定位 {f'[Context.moveEpoch]({root}/src/server/context.ts:49)'}、{f'[Agent.publish]({root}/src/server/agent.ts:63)'}、{f'[sealWork]({root}/src/server/work-delivery.ts:32)'}。需要在上下文切换/恢复/启动修复时处理已登记批次生命周期；不能靠用户手动查询来补最终交付。

### F24 / P2 / 新：39.6K 与 39667 被当作实质矛盾，范围内候选误变 unknown

真实 Val API 粉丝 39667，本人页面显示 39.6K。当前解析按四舍五入得 39550–39649，与精确数不重叠，写入 followers 冲突；两者都明显在 1万–10万内，但 __followers 被降为 unknown，原两条内容硬条件均 match 的 Val 不再合格。

同一真实资料/截图文字/条件做只读因果回放：带这条缩写事实→unknown+冲突；不带→match。没有修改数据库或用模拟数值替代实测。缩写显示可能截断、来源刷新时间也会不同，应区分精度差异与真正足以否定范围的冲突；冲突状态也需要可恢复。此次真实复核仍复用旧冲突，不能视作已修。

{link('exact-two-results.json','首次结果')}、{link('follower-replay.json','只读因果证据')}。定位 {f'[followerInterval]({root}/src/server/assessment.ts:3)'}、{f'[冲突写入]({root}/src/server/assessment.ts:38)'}、{f'[基础判定]({root}/src/server/verdict.ts:18)'}。

### F25 / P2 / 新：Instagram 基础数值不预筛，超范围账号占完分析预算

原题要求粉丝 1万–10万、先看20候选。实际 20 个已取得精确粉丝数的账号中 **16 个超出范围**，包括 234、1016 和超过100万的账号。它们仍写入 candidates、执行定性/浏览器核验并消耗 candidateBudget；最终 delivered=20 即 done，三个关键词队列仍分别剩 24/24/23 个尚未读取账号。

预期先形成符合已知基础数值的候选池再使用定性分析预算，或将“基础资料读取上限”和“逐人分析上限”分开并明确告知。现在 20 人的定性预算只有 4 个数字范围可行者，召回缺额结论的实用性下降。不能由此断言剩余队列必有合格者，也不能保证过滤后会有20位全部特征合格者。

非 Instagram 的上一轮 F17 已有基础预筛；IG 分支仍直接 push 并增加 delivered。定位 {f'[IG 发现分支]({root}/src/server/discovery.ts:18)'}、{f'[预算结束条件]({root}/src/server/discovery.ts:50)'}、{f'[入候选与截断]({root}/src/server/research.ts:89)'}。{link('instagram-base-budget.json','真实数值/预算/未读队列')}、{link('original20-results.json','实际20人结果')}。

## 上一轮10项回归

| 编号 | 本轮判定 | 对应证据 |
|---|---|---|
| F16 空白页/主页缺失 | 原缺陷通过 | 真实 TikTok 本人 URL/头像/粉丝、归属检查；无 about:blank。YouTube真实 KOC池无候选，真实该平台正例未覆盖 |
| F17 非IG固定头部池 | 原缺陷通过 | 500 条 fit 池、基础范围预筛、相关性选择及读取边界；IG 的独立问题记 F25 |
| F18 到配额就漏分析 | 通过 | 精确2人、选1、无偏好，两人都有结果；4 项受控验收亦覆盖 |
| F19 第二精确账号漏读 | 通过 | 两个实际指定身份都读取；无相似搜索；原题三关键词轮转 |
| F20 多次/过早交付 | 部分 | 正常多工作只有1条；延后未登记工作残留 |
| F02 人工阻塞文字 | 部分 | 后台已能隔离；自然 Agent 仍错误决策 |
| F03 408未恢复 | 通过所测分支 | chat/候选选择/逐人核验注入408均重试成功；400不重试 |
| F21 补标改变原结论 | 通过 | 六人事实/判断/verdict/selected全不变，仅版本与画像更新 |
| F14 条件说明污染标签 | 通过原缺陷 | tags仅实际supported画像值；正向值/Notion/geek/不存在值的UI过滤和CSV一致；自然眼镜查询排除否定与未知 |
| F22 状态/桌面极慢 | 通过所测负载 | 实际真实任务负载下状态ms、桌面秒级；人工执行隔离对照；未做全压力基准 |

首轮15项中，F02仍部分，F13因本轮F24数值精度缺陷部分；其余13项的原缺陷在本轮对应范围通过。身份去重、偏好排序、国家别名、CSV/截图、桌面URL边界、增量处理和三次重启已有单元与受控实际浏览器证据；不等于真实全平台准确率验证。

## 其他不足和限制

Instagram 的关键字搜索仍主要匹配账号检索词。真实“tech”会召回学校/社团，“programming”会出现其他词义；轮转公平已修，但主题相关性与可用 KOC 召回仍可改善。YouTube 本次500条池全是大号，不能支持所需 KOC 正例；需依据实际新API能力改善数据范围，而不能声称穷尽全站。

报告 HTML 的“判断”列在长理由下过窄，中文容易竖向换行，实际截图可见；建议固定适当列宽。{link('screenshots/six-batch-report.png','实际文档截图')}。标签 UI 是字面包含检索，语义/否定条件筛选需要 Agent 读取状态后判断，本轮自然眼镜请求正确。

真实 IG 重新核验中，Tyler 新照片观察成功、Val 主页定位失败后保留旧文字和未知视觉；这证明安全归属守卫起效，却不能证明 Val 当前页面已经重新确认。源文字时间和新处理时间应明确呈现，避免把“已处理两位”理解为“两位当前页面访问都成功”。

没有做真实登录/OTP/验证码完成、真实社交会话长期保持、20位全条件正例交付、人工画像准确率基准、高并发或完整安全审计。{link('remaining-validation.md','需要你手动验证的具体范围与步骤')} 已区分这些未覆盖项与已确认缺陷；已确认的问题不需要你重复证明。

## 检查、实际接口与留存

类型检查、构建通过；181 项/27 文件测试全部通过，四项代码覆盖率100%。4项新卷受控真实浏览器验收全部通过。{link('coverage.log','覆盖率日志')}、{link('acceptance.log','浏览器验收日志')}。新实例7项真实研究和1项复核均终态，没有仍在远端排队的新版搜索。

本轮新真实实例共133条 Wave 读取调用。IG 使用真实 GET：`/instagram/v3/search_users?query=…`、`/instagram/v1/fetch_user_info_by_username_v2?username=…`、`/instagram/v1/fetch_user_posts?user_id=…&count=12[&max_id=…]`、`/instagram/v2/fetch_post_info?code_or_url=…`。TikTok/YouTube/X 使用 `GET /discover/db?platform=…&limit=500&sort=fit_desc`，X 参数为 twitter。本轮新任务没有旧 POST `/creator-search/requests`，没有旧远端排队；补标和复核未创建 Wave 新搜索。路径为日志中的相对API路径。{link('live-final.json','真实调用/最终对话')}。

最终状态与资源留存以 {link('final-status.json','最终状态')} 和 {link('cleanup.json','清理记录')} 为准。真实3572保留供查看，3000及此前会话的服务保留；本轮临时受控容器/网络清理，数据卷和全部证据保留。故障代理设置已恢复并停止。

脚本早期失败均保留 first/second-attempt：短UI等待、同名 label 选择器、截图去重断言、CSV解析器默认字段上限、故障重试时间戳比较及代理端口占用已纠正。与实际产品缺陷分开判定；F20/F02脚本的任务数量断言失败对应已确认的实际少登记/不登记，不能当作单纯脚本错误。最新脚本最终状态见各JSON。
'''
(p/'report.md').write_text(report)
manual=f'''# 本轮尚需手动验证的范围

本轮核心功能矩阵已执行，确认缺陷见 {link('report.md','复测报告')}。以下为尚未完成的外部/准确率验证，不需要你重复证明已确认的 5 项缺陷。

## 1. 真实 TikTok 挑战与帖子/视觉核验

本轮 larissa2468_ 与 juanescalonafilms 本人主页已访问，两次滑块/帖子加载限制均明确跳过，没有完成验证码或登录。现有两条结果是已处理的证据不足记录。原题20人的眼镜/geek等也没有形成全部正例。

打开 [本轮真实实例](http://127.0.0.1:3572)。在项目目录读取该实例管理员密码：

```sh
docker compose -p creator-studio-retest-r3-live -f compose.yaml -f .gstack/qa-reports/retest-2026-10-10-r3/live-compose.yaml exec -T app cat /app/data/admin-bootstrap.txt
```

密码不在报告中。3000主服务密码仍用你原来的命令读取。

自然发送：“之前 TikTok 那两位再复核一次，不搜新人。我来处理访问验证，等两位都看完再给我一份报告。”当桌面确实提示挑战时，打开“浏览器桌面”→“接管并协助”，由你处理平台要求；只在实际完成后填写真实结果并交还。核对原候选继续、取得新的本人帖子/画面证据、未知项有依据才更新、两位全结束只发一次最终报告。若页面仍无法访问，明确跳过，不填已完成。

## 2. 真实社交账号会话持久化

受控公开页已通过真实 noVNC 写 Cookie/localStorage + 三次容器重启。没有输入真实社交凭据，也未验证短信/OTP/真实服务令牌是否保持。

使用你有权使用的账号，在需要协助时由你登录。正常重启本轮真实实例的 desktop，再进入同一候选页确认会话；如果平台要求再次验证，记录真实情况。仅验证你有权访问的内容，不要把可访问页面之外的私人信息作为证据。该步骤需平台真实身份及人工输入，我本轮未执行。

## 3. 定性标签和全条件正例

给一组已有人工答案的公开账号：内容方向、实际本人眼镜照片、geek风的具体标准，以及若要求族裔则对应本人可靠公开自述来源。用口语描述条件，比较逐人标签、证据ID、日期、unknown/不匹配、选择和文档。至少包含明确符合、明确不符合、证据不足三类。

本轮证明了画像实际保存、查询、文档、无证据不伪造；没有建立人工标注的精确率/召回率，也没有找到20位全部特征有可靠证据的正例。不能将“20位处理完”当“20位合格”。

## 4. 本轮未扩展执行的范围

旅行背包是第二种目标的交互规划回归，本轮未另启动真实旅行名单。若需要上线前行业覆盖，按已经提出的范围回答问题、保存草案、确认具体版本，再实际核对分组去重和报告；不要复用App的身份配额当旅行成功。

YouTube当前500条池全是超范围大号，未验证真实1万–10万学习博主成功召回；这需要开发/平台提供能覆盖KOC的真实数据范围，不能靠你点一次UI解决。真实 IG Val 复核尝试主页失败后仍使用旧文字，当前主页/本人画面未全部重新确认。

未做高并发、长时间压力、全面安全审计、多模型对比。所有受控错误注入、人工接管和Cookie测试均在报告明确标注。

## 已确认问题应由开发修复后回归

F20延后工作漏入批次、F02 Agent 错误拒绝登记、F23上下文切换漏最终报告、F24缩写粉丝误判、F25 IG基础范围消耗预算都已有本轮复现及定位。修复后按报告用例重跑，不需要你先手工再证明一次。

本轮最终无未交还人工租约，所有真实任务均终态；页面没有仍等待远端排队的新搜索。原始证据及测试数据库数据卷保留。
'''
(p/'remaining-validation.md').write_text(manual)
print(json.dumps({'report':str(p/'report.md'),'manual':str(p/'remaining-validation.md'),'issues':len(issues),'bytes':(p/'report.md').stat().st_size},ensure_ascii=False))
