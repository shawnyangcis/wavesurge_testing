# R4 完整回归与结构化结果文档验收报告

本轮已完成。**当前系统可以走完“自然语言描述/澄清→Wave召回→逐人定性分析和打标→全部工作结束→一次结构化文档交付”，但不能判定已经完全满足题目。** 本轮确认7项缺陷或交付不足，其中F26是这次修复新增回归。新增的DOC04结构化文档专项未完全通过；CSV能下载、HTML能打开，不代表文档内容及统计正确。

时间：2026-10-10 21:27–2026-10-10 23:12（Asia/Shanghai）。本轮只测试与报告，没有修改业务源代码。真实测试实例[live-compose.yaml](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/live-compose.yaml)使用新数据卷，入口[3592](http://127.0.0.1:3592)；受控数据实例3593与4项独立Docker验收明确分开。宿主、当前主部署3000、本轮实例的57个TS/TSX源码及桌面执行源码已核对一致。旧R3/R2文档与截图原样保留，未用旧任务冒充新执行。

36条主用例：**31通过、3部分通过、2未通过**。2条未通过是DOC02（筛选/CSV迟到响应反例）和DOC04（文档结构语义/统计）；部分通过是BIZ08、DOC03、CAM03。另保存7条针对本轮问题的回归反例，不混入主用例计数。

最终真实实例：15个任务全部终态（11完成、4如实缺额），38条结果记录；主Agent空闲，当前epoch无pending输入，无未完成人工协助。最后实际重启app，任务、标签、v1/v2/v3、登录和保存的10条最终通知均保留，模型/Wave请求没有重放。10条通知跨历史epoch保存，并非全部属于当前epoch。[final-status.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/final-status.json)、[restart-final-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/restart-final-ui.json)。

## 已确认问题

| 编号 | 优先级 | 结果与影响 | 分类 |
|---|---|---|---|
| F28 | P2 | 迟到的初始结果覆盖已应用筛选，并把CSV恢复为全量 | 既有缺陷，本轮新发现 |
| F29 | P2 | Campaign总报告与子报告的已入选身份矛盾 | 既有缺陷，本轮新发现 |
| F30 | P2 | 报告将最终入选人数标成合格候选人数 | DOC04；既有标签问题，本轮专项发现 |
| F31 | P2 | 多组补标综合文档缺少每条记录的分组归属，人数单位含糊 | DOC04；既有交付不足，本轮专项发现 |
| F26 | P2 | 粉丝判断引用了全部无关Wave来源，报告显著拉长 | 本次修复新增回归 |
| F27 | P2 | 标签字面包含检索混淆正负值 | 产品不足，本轮实际确认 |
| F32 | P2 | Campaign总文档缺逐人匹配说明和画像标签 | DOC04；既有交付不足 |

每项的具体复现、实际结果、定位及建议见[缺陷详情](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/findings.md)；可重复回归反例见[regression-cases.md](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/regression-cases.md)。F28是延迟真实响应的两次实际UI反例，不是修改响应数据；F27是字面包含模式的产品不足，自然语言查询已能正确排除否定/未知。F29的总配额与去重正确，矛盾出现在子报告标签。

## 新增DOC04：题目要求3专项

对应题目：“最终输出结构化的结果文档，包含符合条件的创作者清单、特征匹配说明等信息。”

从Chat实际打开最终HTML、下载CSV，逐条核对账号/平台/链接、粉丝/地区、条件三态、理由、画像标签、证据、入选/备选、人数及分组。无候选单任务通过结果弹窗打开；Campaign总/子文档均实际浏览。

| 场景 | 实际结果 | 专项判断 |
|---|---|---|
| 指定两人正向研究 | 2位合格、最终选1；每人有条件表/理由/标签/证据，14列CSV与记录一致 | 摘要却标“已合格1人”，F30 |
| 原题20候选零合格 | 20记录，0合格、3待核实、17不符；缺额明确，无待核实或不符者标成入选 | 通过所测结构/统计 |
| YouTube无候选 | 清单0条，CSV只有表头；0/2缺额及有界500条来源说明明确 | 通过所测结构/统计 |
| 三组补标 | 6条记录、2位创作者，所有记录均补标；5条合格、3条组内预选 | HTML/CSV缺每条任务归属，摘要人数单位不清，F31 |
| Campaign两类型 | 总报告两组各1，唯一2/2；子报告条件说明齐全 | 总文档缺逐人匹配说明/标签F32；子报告入选矛盾F29 |

专项内部67项字段检查：62通过、5失败，不与36主用例混算。现有HTML层级和CSV属于结构化输出；失败结论针对语义、统计、归属和最终可用性，不强制必须JSON、PDF或仅表格格式。

[DOC04专项报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-validation.md)、[全部字段核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-ui.json)、[综合报告实际截图](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-three-groups-retag-report.png)。

## 题目各项功能判断

| 要求 | 本轮实际证据 | 判断 |
|---|---|---|
| 1 自然语言多条件交互 | 原题原话→口语澄清；保留5个业务硬条件、平台/数字/地区及4个画像维度；另测多平台、补标、取消和连续消息 | 主流程实现并通过所测场景 |
| 2 基础召回、逐人定性、校验并标签化 | 原题读取88个本人基础账号，68个数值超范围预排除；20个均有真实完成的模型核验、全部条件和画像；指定2人及多平台也实际执行 | 已实现；数值来源引用F26、正负标签UI F27仍不足；实际召回质量有数据限制 |
| 3 结构化结果文档 | 多类批次全部终态后一次Chat链接、实际HTML/CSV、零合格、无候选、Campaign及版本持久化 | 已有结构化交付，DOC04未完全通过；F28–F32影响文档与筛选使用 |
| 4 Campaign目标交互到多类型筛选 | App目标→4项澄清→两类草案v1→自然修改v2→UI确认→2组4记录→唯一2/2→一次总报告；旅行背包目标另给不同类型且未擅自研究 | 业务主链路通过；总/子交付存在F29/F32 |

**原题没有交付20位满足全部条件的创作者。** 实际20候选的地区和本人公开白人身份自述均未知，geek外观均未知；不能从外貌、姓名或国家推断这些事实。戴眼镜一项有1位照片明确佩戴太阳镜，限定了证据含义，该人因内容不符未入选。0/20是本轮真实结果，不能算满额业务成功，也不能仅凭0就判定程序流程错误。[discovery-final-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/discovery-final-audit.json)、[original20-batch.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/original20-batch.json)。

## 关键业务与历史缺陷回归

| 场景/旧问题 | 本轮执行结果 | 证据 |
|---|---|---|
| F25 IG数值不预筛 | 88/100基础读取；68已知数值超范围均不取帖子、不占20分析预算；20候选粉丝范围全部match | [discovery-final-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/discovery-final-audit.json) |
| F24 39667与39.6K误冲突 | 用真实R3来源在当前算法只读回放，变为match；当前真实主页39.6K与API精确数也正常 | [follower-replay.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/follower-replay.json)、[phase-b-real-required.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/phase-b-real-required.json) |
| F20/F02 人工接管时漏登记网页项/文字受阻/过早交付 | 受控两变体+真实Instagram一次atomic登记text/browser两项；人工期间文字2人完成、网页0、报告0；交还后两本人页面新观察，整批1报告 | [phase-b-fixture-required.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/phase-b-fixture-required.json)、[phase-b-real-required.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/phase-b-real-required.json) |
| F23 登记未封口时切换上下文漏交付 | 真实和受控分别捕获active/pending/task已注册/sealed=false，实际清空/载入备份；后台2人完成，新epoch1报告，重启0重放 | [context-real-browser.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/context-real-browser.json)、[context-browser.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/context-browser.json) |
| F18/F19 到配额漏分析/第二精确账号漏读 | 指定Tyler/Val，不查相似；目标1人仍完整核验2人 | [exact-two-results.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/exact-two-results.json) |
| F21 补标改变原结论 | 三组6记录全部更新画像，creator/事实/证据/judgments/verdict/selected逐条相同，v1→v2；没有新研究；一次综合报告 | [six-retag-invariants.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/six-retag-invariants.json)、[six-retag-batch.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/six-retag-batch.json) |
| 真实重新核验 | 原2记录v2→v3，v1/v2仍存在；新本人页面2/2，Wave新请求0、最终通知1 | [reverify-final-invariants.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/reverify-final-invariants.json)、[instagram-reverify-batch.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/instagram-reverify-batch.json) |
| TikTok/X/YouTube有界检索 | 各读取500；TikTok排除324后分析2、X排除493后分析2，均有真实判断和画像但0合格；YT500全超范围，0分析，正确短缺 | [tiktok-results.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/tiktok-results.json)、[x-results.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/x-results.json)、[text-platforms-batch.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/text-platforms-batch.json) |
| 平台/判断/标签组合筛选 | 实际7组筛选及CSV：IG20/X0/未知3/不符17/合格0/组合3/重置20；常规查询正确，F28另有并发反例 | [result-select-filter-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/result-select-filter-ui.json) |
| 连续消息/查询/取消/幂等 | 活动期间3条消息均处理，准确取消新任务、旧结果保留、无晚写或额外研究；同ID/body200、冲突409，0重放 | [interaction-regressions.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/interaction-regressions.json) |
| 模型临时/永久错误 | Chat、选择、逐人核验各一次408后同工作重试成功；永久400仅一次；代理及提示词还原 | [fault-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/fault-ui.json)、[fault-proxy-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/fault-proxy-audit.json) |

旧F16本人页归属、F17非IG范围预筛、F14条件文本不混入画像值、身份去重、硬条件/偏好、国家别名、取消和一次交付在对应本轮范围有实际或受控/集成证据。不能将这些有限成功扩展成全平台语义准确率。

## 其他功能与验证层级

实际浏览器覆盖：空/错/正确登录与退出，参考图左右颜色识别、附件上传/移除、消息保存；空API Key保存不丢密钥、阈值拒绝、提示词revision与下一真实模型回复；备份下载/非法JSON/清空/恢复；有历史模型压缩checkpoint及刷新；调试、Campaign、结果、noVNC、375px界面、报告1440/768/375；实际人工认领/交还；最终重启。

鉴权实测11类路由401、跨Origin写403、4类非法消息400、缺对象404、未认领控制409。真实桌面RPC拒绝file、链路本地地址、未授权loopback及URL内嵌凭据。源文本转义/注入、敏感输入、特殊身份与事务等另有单元/集成覆盖，这不是完整渗透测试。[foundation-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/foundation-ui.json)、[extended-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/extended-ui.json)、[compression-populated.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/compression-populated.json)、[policy-runtime.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/policy-runtime.json)。

20人研究运行时20次首页/状态样本p95约398/39ms，3次noVNC连接7.10/3.52/3.55秒；只说明所测负载可用，不代表高并发压力验证。长报告判断词不竖排/无横向溢出已修，F26冗余来源仍把手机阅读拉得过长。[performance-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/performance-ui.json)、[exact-layout.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/exact-layout.json)。

本轮typecheck、build通过；**28文件226测试全部通过**，56个有执行内容的生产TS/TSX文件行/分支/函数/语句覆盖100%，1个空声明文件跳过。**4/4全新Docker业务验收通过**，使用真实配置模型、应用、headed浏览器和受控Wave/候选页面；Cookie/localStorage三个desktop重启保留。此覆盖率及受控成功不能代替真实数据判断或DOC04语义验收。[coverage.log](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/logs/coverage.log)、[coverage-summary.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/coverage/coverage-summary.json)、[acceptance.log](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/logs/acceptance.log)、[index.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/acceptance/browser-reports/creator-studio-retest-r4-20261010-second/index.html)。

## 本轮实际Wave接口

真实实例累计244次GET读取，112次模型调用，其中56次browser-verification。新业务没有旧POST `/creator-search/requests`，没有旧远端排队任务；本轮后台任务已全部终态。

| 相对接口路径 | 调用数 | 本轮用途 |
|---|---:|---|
| `/instagram/v3/search_users?query=...` | 4 | 原题tech/programming/gaming三词；另1次版本探测 |
| `/instagram/v1/fetch_user_info_by_username_v2?username=...` | 102 | 读取本人基础账号；原题其中88 |
| `/instagram/v1/fetch_user_posts?user_id=...&count=12[&max_id=...]` | 67 | 已知范围可行者读取帖子，最多两页 |
| `/instagram/v2/fetch_post_info?code_or_url=...` | 66 | 有界读取帖子详情，最多前两条 |
| `/discover/db?platform=...&limit=500&sort=fit_desc` | 3 | TikTok、YouTube、twitter各500条 |
| `/instagram/v1/fetch_search?query=headphones&select=users` | 1 | 独立只读探测，实际400，未证明v1成功 |
| `/instagram/v2/search_users?keyword=headphones` | 1 | 独立探测成功49条；v3对应探测25条 |

v1原始响应没有确定根因，本轮不把上游失败直接归因为本地实现缺陷。v2/v3探测回复含上游计费提示，本报告不声称这些GET免费。原始参数和响应元数据见[real-api-versions.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/real-api-versions.json)、[api-v1-error.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/api-v1-error.json)；最终路径时间线见[live-final.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/live-final.json)。

## 保留资料、环境与未验证范围

本轮保留36项用例及实际结果、7条缺陷回归反例、67项文档字段核对、152张专用PNG，以及独立Docker验收报告中的截图/日志。浏览器脚本和输入也保留。原R3 158张、R2 153张及更早文档仍在；[previous-artifacts.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/previous-artifacts.json)记录了已有资料。

- [测试用例集](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/test-cases.md) / [机器可读用例及证据](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/test-cases.json) / [执行结果](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/execution.json)。
- [截图索引](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots.md) / [截图画廊](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/index.html)。
- [未验证与需要手动操作的具体步骤](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/remaining-validation.md)。
- [运行源码核对](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/source-check-final.json) / [源码、前端构建及凭据扫描](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/artifact-check.json) / [资源保留与清理记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/cleanup.json)。

真实3592保留供复核，主部署3000和其他会话实例不动。本轮临时受控容器/网络清理保留数据卷；独立验收容器/网络已由运行器清理，卷保留。故障代理原配置已还原，其进程清理状态以cleanup.json为准。首次Docker启动遇到地址池耗尽，使用自有空闲网段重试，原失败日志和卷保留；属于环境失败，不是业务用例失败。

早期脚本失败保留first/second-attempt材料：短等待、重复提示词测试消息、精确label/thead选择器、默认CSV字段上限及重试时间戳比较等修正后再执行。它们和真实产品反例分开，不把脚本错误当作业务缺陷，也不掩盖F28的实际迟到覆盖。

**真正仍需要人的环节是真实社交平台登录/OTP/验证码成功后交还Agent继续核验。** 本轮只明确跳过，没有真实登录凭据。原题20位全条件正例、真实YT/TikTok/X所设范围的合格正例、v1成功读取也未证明；所需数据和步骤已列入remaining-validation.md。没有做实际15分钟租约到期等待、真实社交长期会话保持、人工大样本画像准确率、高并发或完整安全审计。

资料终检：HTML验收报告的内嵌ZIP中4处测试管理员密码已脱敏，压缩JSON仍有效，实际浏览器继续显示4通过/0失败，截图和测试结果未删。凭据扫描包含本轮真实/受控实例及两个已停止验收实例的保留卷；文本及内嵌ZIP复查均无发现的凭据残留。[扫描记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/artifact-archive-scan.json)、[脱敏报告实际浏览器验证](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/acceptance-report-ui.json)。登录前`/api/session`401属正常鉴权探测；另观察到`/favicon.ico`404，无未捕获JS异常，[控制台记录](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/console-audit.json)。
