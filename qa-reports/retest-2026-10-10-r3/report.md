# Creator Studio 第三轮完整复测

2026-10-10，上海时间。约 18:26 开始。本轮只审查、测试并保存证据，没有修改业务源码。

**结论：本次迭代有明显改善，但仍不能认定完全满足题目要求。当前确认 5 项缺陷：2 项上一轮残留组合问题、3 项本轮新发现。** 上一轮 10 项原缺陷中，8 项在本轮相应范围回归通过，2 项部分通过。不能用 181 个测试及 100% 代码覆盖率替代真实功能验收。

## 测试环境与证据范围

| 环境 | 实际执行 | 验证边界 |
|---|---|---|
| 主服务 3000 | 6 位历史真实账号、3 个补标工作；实际模型、浏览器 chat、文档和 CSV | 补标及原判断隔离；没有把旧账号说成本轮重新发现 |
| 新真实实例 3572 | 新数据卷；实际 Chrome UI、配置模型、WaveSurge、生产有头 Chromium；7 项研究及 1 项重新核验 | 本轮真实来源、网站访问和任务交付；共有 30 条结果、26 个不同平台身份 |
| 受控实例 3573 | 实际 UI、模型和有头浏览器；明确的 Wave/账号/媒体夹具 | 设置、上下文、取消、错误注入、人工接管执行分支；不能替代真实平台登录 |
| 新卷受控验收 3570/3571 | 独立运行 4 项浏览器验收，5.3 分钟全部通过 | 视觉传递、排序、Campaign、Instagram 协议和 3 次持久化重启 |

开始和结束对 57 个 TS/TSX 文件核对哈希，主服务、真实实例、受控实例及桌面执行源码都一致；本轮未改业务源码。[最终源码核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/source-check-final.json)。凭据从 Docker 内读取，没有写入报告或脚本常量。

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
| “先就看 tylerlcrawford 和 valstechtalkk…只选1位，但两位都分析完并打标” | 精确得到两个指定账号，核验 2、选 1；无相似账号替代、没有提前停在第一人。Val 首次受到 F24 误判。[消息/工具](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/exact-two.json)、[实际 UI/文档/CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/exact-two-results.json) |
| 原题“帮我找20个 geek风、戴眼镜、欧美白人…ins…KOC”及口语澄清 | 20/20 处理、0/20 合格；19 no_match、1 unknown；仅 4 位粉丝在范围内。20 位的眼镜/geek/公开族裔均未取得通过证据。20 位都保存内容画像，共 21 个截图证据引用；图片包括商品或受限内容，数量不代表有效人体特征证据。[真实参数](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/original20-scope.json)、[实际结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/original20-results.json)、[统一交付](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/original20-batch.json) |
| 智能生活 App，希望美国年轻人下载并试用功能 | 两组：智能家居体验、手机实用工具；确认 v2 后各核验 2 人，去重选 Tyler 与 Val，达到 2/2；只发 1 条最终 Campaign 总报告。受众在美国不等于已证实创作者所在地/受众构成，修订已将创作者国家不限、英语作为偏好。[修订](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/campaign-revise.json)、[实际确认/幂等/旧版本拒绝](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/campaign-start-ui.json)、[总报告及子报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/live-campaign-ui.json) |
| “另外…轻便旅行背包…英国25到35岁…周末短途游…先帮我想范围，暂时别搜索” | 生成旅行/城市生活/轻户外等不同方向，追问产品、预算、平台、人数、归因；明确受众年龄不是博主年龄条件，没有创建研究任务。第二目标验证了规划和追问，未执行第二轮真实旅行筛选。[实际对话](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/campaign-travel.json) |
| TikTok 手机/数码个人体验，粉丝 1万–10万，选1、看2 | 500 条池，排除 324、剩 176，实际访问 larissa2468_（61.9K）和 juanescalonafilms（23.8K）本人页；遇滑块挑战/帖子加载失败，操作者两次明确未登录、未完成验证码并跳过。最终处理 2、0/1；没有 about:blank 证据。[结果/文档](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/tiktok-results.json)、[首次跳过](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/tiktok-hold.json)、[第二次跳过](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/tiktok-second.json) |
| YouTube 学习方法及 X 开发工具两项文字研究 | YouTube 读取 500 条全部超出 1万–10万（本次池为 520万–5.02亿），0 条核验；X 500 条排除 493、7 条预筛后选 2 条核验、0/1 合格。两项统一报告。X 在真实 TikTok 协助待处理期间完成。不能据有限池断言全站没有 KOC。[读取边界](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/live-progress6.json)、[双项统一文档](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/text-batch.json) |
| “这6个人…只用已存资料补内容方向、风格、合作形式…全做完再汇总” | 3 个补标工作全部完成，6 条版本增加；事实、原判断、总 verdict、原 selected 全不变，Wave 调用 199→199。只新增 1 条本次综合交付，6 人 HTML 与 CSV 实际打开。[隔离核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/retag-invariants.json)、[批次交付](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/six-batch.json)、[字段核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/six-csv-checks.json) |
| “只查保存的两个账号，有证据戴眼镜的，没戴和不确定别算” | 只调用 get_results、0 新 Wave；正确返回 0 人，排除 Tyler 的“照片中未戴眼镜”及 Val 未知，保留原数码入选记录。[自然查询](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/saved-glasses.json) |
| “重新打开已有主页复核，别搜新人，保留前一版，两位全结束再汇总” | 受控 YouTube 两位均有新 browser observation、v1→v2、保留历史。真实 IG 两位 v1→v2、无 Wave；Tyler 取得新照片观察，Val 尝试主页导航被归属保护拒绝，复用旧文字、视觉仍未知，不能宣称两位当前主页都核实成功。只新增 1 条复核批次交付。[YouTube/版本](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/interaction-regressions.json)、[真实复核记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/instagram-reverify-audit.json)、[复核统一报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/instagram-reverify-batch.json) |

示例实际标签摘录：Tyler 为“智能家居、家庭自动化、科技与酒店评论、第一人称生活场景分享”；Val 为“手机使用技巧、iPhone功能演示、数码配件体验”；SchoolHabits 为学习/复习方法；raytubelcsw 为社会工作执照考试；colelangs 为语言学习和 Anki；wesleyanna 为 Notion、效率及个人组织。每个人都有自己的值、理由与来源，未知维度没有伪造正向标签。完整值见 [六人实际 CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/six-batch.csv)。

## 全功能回归，包含未上报过的组合

| 范围 | 实际结果与证据 |
|---|---|
| 登录、退出、错误密码、未登录数据 | UI 正确登录/错密码/退出；空白发送禁用；11 个受保护接口 401；错误来源写入 403；非法文本/图片 400；缺对象 404、未认领控制 409。[foundation-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/foundation-ui.json)、[extended-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/extended-ui.json) |
| 参考图片、移动屏幕、Markdown | 图片上传、移除、实际模型识别左右绿色/蓝色，无自动搜索；375px 无横向溢出；GFM 表格实际 DOM 可见。[foundation-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/foundation-ui.json) |
| 设置与完整记录 | 留空 key 保存不更换凭据；提示词通过 UI 临时保存后下一真实调用生效，再恢复；阈值 1999 拒绝；完整调用记录、备份真实下载。[extended-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/extended-ui.json) |
| 上下文 | 闲置时备份/恢复/清空、错误 JSON 拒绝、已有任务保留、无工具重放；非空历史实际模型压缩新增 1 次 compression 调用，最新用户/问答未被压进旧摘要，刷新保留。运行中切换上下文另发现 F23。[compression-populated.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/compression-populated.json) |
| 对话持续输入、停止任务、幂等 | Agent 仍 active、研究 running 且 evaluated=0 时连续 UI 输入取消/查询/保持停止；正确 cancel_research，已有结果不变；等待在途处理后无晚到记录；同 ID 同正文 200，改正文 409，无额外模型/任务。[interaction-regressions.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/interaction-regressions.json) |
| 桌面与持久化 | 实际只读连接、接管/交还/重新观察；明确受控人工期间文字 2 人完成、网页 0 人且没有提前报告，交还后网页 2 人及单次总交付。三次实际 noVNC Cookie/localStorage 写入加三次正常重启保留。[handoff-confirmed-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/handoff-confirmed-ui.json)、[acceptance/persistence-three-restarts.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/acceptance/persistence-three-restarts.json) |
| 临时与永久错误 | 单独标明故障注入：chat、候选选择、逐人核验各首次 408→自动重试真实模型成功，身份/任务不重建；400 不重试且显示未完成。没有把注入错误说成真实外部故障。[chat/选择 408](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/fault-ui-first-attempt.json)、[核验 408/400](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/fault-ui.json) |
| 安全边界 | 实际桌面 RPC 拒绝 file、link-local、未许可 localhost、带嵌入凭据 URL；未授权报告/证据/桌面入口拒绝。敏感表单及 HTML/CSV 转义还有单元测试；没有做完整渗透。[policy-runtime.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/policy-runtime.json) |
| 文档与画像保存 | 11 组实际结果 HTML/CSV 及标签过滤/过滤导出/刷新，CSV 用标准解析器核对行数；文档含原条件理由、画像及证据。[csv-regression.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/csv-regression.json) |
| 性能 | 真实 20 人研究已处理 14 人时的 20 次测量：root p95 7.63ms、state p95 6.86ms；实际 noVNC 连接 1.58/2.54/1.97 秒。该次测量是在真实处理负载下；人工接管的执行隔离另做实际对照，未做高并发或长时压力。[performance-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/performance-ui.json) |

## 当前缺陷（5项）

### F20 / P1 / 部分修复：第二项只在自然语言待办中，第一项却被当作整批结束

受控人工接管期间通过 UI 请求“文字研究 + 网页研究，等两项全结束后汇总”。Agent 只登记文字项，明确承诺第二项稍后及整批交付。第一项结束时自动发出“本次请求的1项工作已全部结束”及最终报告；第二项尚未登记、尚未执行。

预期：两项都在请求的工作清单中，网页可以排队，但最终报告等两项终态。实际：程序屏障只看已登记 items，无法看到 Agent 留在自然语言的第二项。普通六人补标及已登记多项任务的正确屏障不能覆盖这个残留。

复现原文与实测：[handoff-failure.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/handoff-failure.json)、[handoff-ui-first-attempt.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/handoff-ui-first-attempt.json)、[截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/screenshots/handoff-failure.png)。定位：[registerWork](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/work-delivery.ts:9)、[workSummary](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/work-delivery.ts:19)。应让所有已授权工作先登记为执行/排队状态，或明确交付未执行清单，不能承诺等两项却只把第一项当整批。

### F02 / P1 / 部分修复：Agent 错误声称人工期间无法暂停网页项并启动文字项

进一步明确输入“两项现在都登记，网页只排队，授权已明确，文字先跑”。Agent 改成保存 Campaign 草案，没有登记研究，并声称“当前无法让同一批次中的网页项单独暂停”。随后使用实际 Campaign UI 确认同一草案，真实后台成功做到：文字两位完成、人工仍持有桌面、网页 evaluated=0、无提前报告；交还后网页两位完成并一次交付。

所以后台执行隔离已修，问题仍在主 Agent 的操作决策和错误能力说明。实际 TikTok 人工待处理时 X 也完成文字核验，支持这个结论。应修正角色/工具决策及登记规则，不应让用户多次纠正或额外点击才能执行已明确授权的请求。

[错误决策/原文](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/handoff-queued-failure.json)、[截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/screenshots/handoff-queued-failure.png)、[同一计划实际能力对照](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/handoff-confirmed-ui.json)。这是明确标注的受控人工接管用例，没有冒充真实登录。

### F23 / P2 / 新：任务已登记、Agent 尚未答复时重置或载入上下文，永远缺最终文档通知

两个独立实际 UI 分支：研究已登记且 batch.sealed=false → 设置中“清空上下文”/“载入调试上下文” → 任务后续均处理两人到 partial，结果仍在，但 work-batch 保持 sealed=false、delivered=false，0 条最终报告通知。

界面承诺清空只影响后续对话、已有任务保留。预期后台仍交付终态文档；实际任务可以完成，交付却静默丢失。上下文迁移将旧 pending 标成 delivered，旧 Agent 运行被 epoch 检查终止；sealWork 只在 publish 时对当前 pending 调用，原 batch 没有收尾责任。

[两次实际复现](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/extended-ui.json)、[清空后](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/screenshots/extended-reset-after.png)、[载入后](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/screenshots/extended-load-after.png)。定位 [Context.moveEpoch](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/context.ts:49)、[Agent.publish](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/agent.ts:63)、[sealWork](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/work-delivery.ts:32)。需要在上下文切换/恢复/启动修复时处理已登记批次生命周期；不能靠用户手动查询来补最终交付。

### F24 / P2 / 新：39.6K 与 39667 被当作实质矛盾，范围内候选误变 unknown

真实 Val API 粉丝 39667，本人页面显示 39.6K。当前解析按四舍五入得 39550–39649，与精确数不重叠，写入 followers 冲突；两者都明显在 1万–10万内，但 __followers 被降为 unknown，原两条内容硬条件均 match 的 Val 不再合格。

同一真实资料/截图文字/条件做只读因果回放：带这条缩写事实→unknown+冲突；不带→match。没有修改数据库或用模拟数值替代实测。缩写显示可能截断、来源刷新时间也会不同，应区分精度差异与真正足以否定范围的冲突；冲突状态也需要可恢复。此次真实复核仍复用旧冲突，不能视作已修。

[首次结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/exact-two-results.json)、[只读因果证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/follower-replay.json)。定位 [followerInterval](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/assessment.ts:3)、[冲突写入](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/assessment.ts:38)、[基础判定](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/verdict.ts:18)。

### F25 / P2 / 新：Instagram 基础数值不预筛，超范围账号占完分析预算

原题要求粉丝 1万–10万、先看20候选。实际 20 个已取得精确粉丝数的账号中 **16 个超出范围**，包括 234、1016 和超过100万的账号。它们仍写入 candidates、执行定性/浏览器核验并消耗 candidateBudget；最终 delivered=20 即 done，三个关键词队列仍分别剩 24/24/23 个尚未读取账号。

预期先形成符合已知基础数值的候选池再使用定性分析预算，或将“基础资料读取上限”和“逐人分析上限”分开并明确告知。现在 20 人的定性预算只有 4 个数字范围可行者，召回缺额结论的实用性下降。不能由此断言剩余队列必有合格者，也不能保证过滤后会有20位全部特征合格者。

非 Instagram 的上一轮 F17 已有基础预筛；IG 分支仍直接 push 并增加 delivered。定位 [IG 发现分支](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/discovery.ts:18)、[预算结束条件](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/discovery.ts:50)、[入候选与截断](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/research.ts:89)。[真实数值/预算/未读队列](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/instagram-base-budget.json)、[实际20人结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/original20-results.json)。

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

报告 HTML 的“判断”列在长理由下过窄，中文容易竖向换行，实际截图可见；建议固定适当列宽。[实际文档截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/screenshots/six-batch-report.png)。标签 UI 是字面包含检索，语义/否定条件筛选需要 Agent 读取状态后判断，本轮自然眼镜请求正确。

真实 IG 重新核验中，Tyler 新照片观察成功、Val 主页定位失败后保留旧文字和未知视觉；这证明安全归属守卫起效，却不能证明 Val 当前页面已经重新确认。源文字时间和新处理时间应明确呈现，避免把“已处理两位”理解为“两位当前页面访问都成功”。

没有做真实登录/OTP/验证码完成、真实社交会话长期保持、20位全条件正例交付、人工画像准确率基准、高并发或完整安全审计。[需要你手动验证的具体范围与步骤](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/remaining-validation.md) 已区分这些未覆盖项与已确认缺陷；已确认的问题不需要你重复证明。

## 检查、实际接口与留存

类型检查、构建通过；181 项/27 文件测试全部通过，四项代码覆盖率100%。4项新卷受控真实浏览器验收全部通过。最终还实际重启了真实实例app，30条结果、标签/版本、6条通知及登录会话全部保留，模型/Wave无重放：[实际重启记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/restart-final-ui.json)。[覆盖率日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/coverage.log)、[浏览器验收日志](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/acceptance.log)。新实例7项真实研究和1项复核均终态，没有仍在远端排队的新版搜索。

本轮新真实实例共133条 Wave 读取调用。IG 使用真实 GET：`/instagram/v3/search_users?query=…`、`/instagram/v1/fetch_user_info_by_username_v2?username=…`、`/instagram/v1/fetch_user_posts?user_id=…&count=12[&max_id=…]`、`/instagram/v2/fetch_post_info?code_or_url=…`。TikTok/YouTube/X 使用 `GET /discover/db?platform=…&limit=500&sort=fit_desc`，X 参数为 twitter。本轮新任务没有旧 POST `/creator-search/requests`，没有旧远端排队；补标和复核未创建 Wave 新搜索。路径为日志中的相对API路径。[真实调用/最终对话](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/live-final.json)。

最终状态与资源留存以 [最终状态](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/final-status.json) 和 [清理记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r3/cleanup.json) 为准。真实3572保留供查看，3000及此前会话的服务保留；本轮临时受控容器/网络清理，数据卷和全部证据保留。故障代理设置已恢复并停止。

脚本早期失败均保留 first/second-attempt：短UI等待、同名 label 选择器、截图去重断言、CSV解析器默认字段上限、故障重试时间戳比较及代理端口占用已纠正。与实际产品缺陷分开判定；F20/F02脚本的任务数量断言失败对应已确认的实际少登记/不登记，不能当作单纯脚本错误。最新脚本最终状态见各JSON。
