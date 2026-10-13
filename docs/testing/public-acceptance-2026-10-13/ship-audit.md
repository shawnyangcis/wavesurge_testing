# 提交前独立审计

审计日期：2026-10-13。最初基线 HEAD：`2a1248c`；第四轮地理复核为 `c24e3af`；地理/helper 已发布为 `9bfeeb0`；第五轮权限复核结束时 HEAD 与 origin/main 均为 `9a79ed4`。审阅对象为各轮实际差异及新增源码、测试；不是空的 `main...HEAD`。依据 ship 第 7–9 步及 `~/.codex/skills/gstack/review/checklist.md`。本审计只读检查代码和既有证据，另运行本地纯函数反例；没有修改业务代码、提交、推送、调用外部 API 或创建任务。

本轮已实现的发布项目已闭环，当前未修复的实质缺陷为 0。严格 Case C 已真实开放交付 1/1；最新代码 9a79ed4 发布后，全新文字 Case F 完成 2/2，权限元数据、实际下载、源码一致性、数据保留及健康检查均有保存证据。真实错误地区也已程序修订并保留历史。原题 20 人仍未达标，不能记作验收通过；文字条件的两名入选也不能计为严格本人形象和框架镜通过。这里只读复核已保存证据，没有代替主线程调用公网 API；最终文档与证据提交仍由主线程收尾，不涉及运行代码变化。

## 发现与处理

**已修复 [P2]，置信度 10/10：未确认归属的证据可形成正向画像标签。** `src/server/assessment.ts` 的原判断为：

```ts
if (item.status === 'supported' && references(item.evidenceIds) && item.values.length)
```

`references` 仅证明引用编号存在。`src/server/browser-verifier.ts:51` 新增的 `linked_snapshot` 表示关联网站身份未确认，却与 `profile_link`、`source_error` 一样可成为唯一画像来源。纯函数复现：唯一来源取这三种类型之一，提交 `style=supported, values=['Geek']`，`applyAssessment` 保留 `supported`，`resultTags` 输出 `['Geek']`。这会影响实际画像和正向标签查询。

主线程已让 supported 标注复用 `usableEvidence` 守卫，并增加回归。独立重跑上述纯函数：三种未确认／错误来源及没有身份证明的 linked_profile_snapshot 均为 unknown、tags=[]；有身份证明的关联页和正常 profile 保持 supported。后续最新 292 项全量与 R6 E2E 已通过，审计没有剩余未修复的确定缺陷。

同一根因也影响视觉条件：此前 `resolveJudgments` 仅检查截图资产和 HTTP URL，未确认的 `linked_snapshot` 可以使必选“本人书卷形象”最终为 match。主线程已增加 `usable` 守卫；独立复核后，未确认网页、关联链接、来源错误均降为 unknown，带身份证明的关联截图与正常本人截图仍为 match；对应回归已加入 `tests/interview-rescue.test.ts`，包含在最终新鲜验证中。

其余被审阅路径没有发现可复现的新 P0/P1：SQL 使用参数绑定；原始记录与报告投影分离；当前事实保留数量、状态、协助许可和错误；人工接管默认先通知、认领、暂停、交还、重新观察；禁止协助只影响指定任务；资产与报告共用管理员鉴权；HTML 字段转义、CSV 引号及公式保护仍保留。

## 第二轮：双通道与基础预筛

复核新增 `ResearchEngine.cycle()` 和 `discovery.consume()`。**已修复 [P2]，置信度 10/10：浏览器等待期间，晚到的文字任务原先被全局 cycle 锁阻塞。** 第二轮审计时 `wake()` 保留：

```ts
if (this.active || this.stopped) return this.currentRun;
```

此前 cycle 仅在开始时并行启动两次 tick，而每条 tick 一次性读取任务列表。独立内存反例证明晚到文字任务必须等下一轮。主线程现已增加独立 `laneFlights`、热唤醒、即时错误捕获和 finishing guard，并加入 late-arrival 回归。第三轮实际复现确认：浏览器 verifier 持续 pending、核验人数为 0 时才登记文字任务，文字即完成；textVerify=1、browserVerify=1。重复三次 wake 不重复执行，仍返回用于关闭等待的同一外层 promise。

独立补充验证：浏览器先结束、晚到文字仍在途时，currentRun 保持等待；晚到通道拒绝后立即记录错误，等另一条通道结束才向外拒绝；stopped 后 wake 不开始新动作、旧浏览器不写入新核验结果；enrichment 期间 finishing=true 阻止研究通道与来源更新重叠，结束后下次 wake 正常处理排队任务。原 P2 已按根因闭环，没有发现新的确定并发缺陷。

其他新路径独立复核通过：usesDesktop 固定划分任务，两通道不会重复处理同一研究；SQLite 同步事务不跨 await；Promise.allSettled 在一通道失败时仍等待另一条在途通道，active 不提前解锁；enrichment 在两通道结束后执行，使用最新协助状态；关闭逻辑停止新动作并等待 currentRun。

consume 的纯函数反例确认：5 个粉丝不符账号、预算 4 时只读取前 4 个，计数为 4 次读取／4 次排除，剩余队列保留；low→fit→后续账号只读取前 2 个并返回 1 名候选；双关键词队列序列化恢复后继续下个关键词，读取计数、剩余名单和游标一致；输入 previous 没有被误改。这两处修改没有发现新的配额超限、重复入选或正常队列丢失。

## 第四轮：真实 VA 地区误判

c24e3af 公网开放 Case C 返回 `bookwormcentral` 的本人简介 `📍Manassas, VA`，程序存为 VA（梵蒂冈）是实际缺陷。根因是自由简介末段的美国州缩写被 `countryCode()` 按 ISO 国家代码解释。该账号另有机构身份 no_match，国家错误没有让它入选，但报告事实仍需纠正。

新解析改动独立纯函数验证通过：Manassas, VA（含装饰旗帜）与 Palo Alto, CA → US；完整 Vatican City → VA、Canada → CA、Berlin, Germany → DE 保留；未知 Springfield, VA／MA／CA、孤立 CA／DE → unknown；明确定位 `📍🇨🇦`、`📍🇻🇦` 和 US 仍正确。新代码只阻止有歧义的州缩写 fallback，没有用地区修复放宽个人身份或外观条件。

**已修复 [P2]，置信度 10/10：普通 reverify 原先不能直接纠正已经保存的错误国家。** `EnrichmentService` 克隆旧 creator，保留原 facts；原 `assessment.ts:75` 把新 code 与旧 code 的不一致视为真实来源冲突。纯函数复现：保存 country={code:'VA', rawValue:'📍Manassas, VA', evidenceIds:['profile']}，重新提交同一原文、同一来源后，仍保留 code VA，并加入“country: 本人所在地来源冲突”；地区判定成为 unknown。模型也可能按照现有“无需重复提交程序已有事实”规则不重新提交 country。

主线程已加入 `refreshCountryFact`，只在 reverify 调模型前按原 rawValue／evidenceIds 重新归一化，annotate 不运行。独立内存完整 Enrichment 流程验证：Manassas 旧 VA → US，模型不返回 facts 仍保存 US、revision=2、result-history 旧 VA；原机构 no_match、未入选保持不变；Springfield, VA → unknown 且保留历史；仅补标保留原 VA；模型提交不同 Canada 声明仍保留真实来源冲突；原 creator 不被克隆更新误改，Wave API 调用为 0。

9bfeeb0 部署后，公网自然消息实际登记补核验 `enrich-76597d2b5b2a492fcf854323`。独立读取保存的 `evidence/country-revision.json`：completed、处理1条／合格0条；旧 VA、revision1 → US、revision2，原文与 evidenceIds 不变，历史保留旧 VA；机构 no_match、selected=false 及原 C 的5核验／1入选不变，Wave 调用总数前后均1149。审计内存复现和真实程序修订分别核对，没有直接写库改结论。

## 第五轮：补核验协助许可的事实与执行

真实补核验曾对外显示 allowHumanAssistance=true，而浏览器执行继承原研究 false；这是确定的权限事实缺陷。主线程已统一 `researchExecution`：当前工作独立 override 优先，再读取原研究最新 override／原 spec，最后是传入 spec、当前 task spec 和默认 true。taskFacts 与 browserVerifier 共用这一规则；进行中的真实补核验可以只改自己许可，不改原研究范围或记录。

独立内存复核全部通过：父 spec=false 时，传入旧 spec=true 仍显示和执行 false；父最新 override=true 后两者同步 true；子任务独立 false 优先且父 task／override 不变；只释放同 job 的协助、保留父任务 lease；悬空源拒绝且不写 override；默认 true 保留。另实际跑 browserVerifier 的模型 stub：继承 false 时不提供人工工具；父许可在模型调用期间 true→false，返回的人工请求也被执行守卫拒绝，下一轮工具列表为 false，assistance 调用0、对外事实 false。修复已闭环，未发现这次改动的新实质缺陷。

最终 9a79ed4 发布后，独立读取 `evidence/deployed-public-ui.json`：原研究许可 false、补核验 false、其他默认任务 true，`inheritedPolicyMatchesExecution=true`。旧 `country-revision.json` 仍保留修复前错误显示 true 的快照；最终 API 校正为 false，未改写旧证据掩盖缺陷。其余实际界面断言全部通过，包括 VNC 只读连接、消息时间、设置功能删除、计数和国家、框架镜截图加载、CSV 与含截图离线 HTML 的实际点击下载；pageErrors=[]，csvBytes=200686、offlineBytes=530535。

## 覆盖率与实际效果

旧基线为 36 文件、279 测试及 5 项完整 E2E；hot-wake 后为 288，地理解析为289，加入 helper 为291／R5 5项通过。第五轮最新 `coverage-policy-final.log` 明确记录 36 文件、292 测试通过、行／分支／函数／语句100%，类型检查 exit 0；`e2e-policy-final.log` 记录 R6 5/5（6.9分钟）、项目退出0；权限 focused 为3文件／28测试。按修改后的新鲜输出判断，不把先前 R4 当作包含 helper 或权限修复。E2E 使用实际配置的 LLM，但 WaveSurge 返回和候选页面受控，不能证明开放来源人数达标。

```text
已核对的改动路径（按 30 个行为组统计）
HTTP 发送 3/3       不安全上下文、ID 异常反馈、幂等重试
持续对话 5/5       工具边界补消息、压缩补消息、完整批次、事实刷新、原始记录保留
VNC／许可 5/5      默认确认、认领交还、单次跳过、在途改许可、仅释放同一任务
创作者证据 7/7     本人地区／拒绝错误主体、关联身份、素材对应、访问范围、编号导航
                   审计负例已修复：未确认来源不能形成条件通过或正向画像
报告／交付 6/6     索引查询、分组分配、在线鉴权截图、离线导出、CSV、终态交付
迁移／契约 4/4     自定义提示词保留、输入拒绝、数据库事务、来源和历史记录保留
原审阅行为组：30/30。
第二轮新增行为组：5/5；晚到文字任务唤醒已修复并独立复现。
第四轮：新地区解析与旧派生国家的程序重算路径均通过独立复现。
第五轮：补核验许可继承／动态修改／独立覆盖／租约归属复核通过。
合计：37/37（100%）；这不是业务目标达成率或最终部署通过率。
```

真实公网证据确认：非安全上下文下 randomUUID 不存在但 getRandomValues 可用；实际发送和执行中续聊、VNC、在线 HTML／CSV、懒加载截图及离线 HTML 下载已验证。最终公网 UI 与新 Case F 均记录 isSecureContext=false、randomUUID=undefined、pageErrors=[]。首次大历史整理曾耗时约 4 分 40 秒，运行中回复约 27 秒，详细查询约 67 秒；不能声称任意历史均能快速响应。

独立读取最终 `evidence/release.json`：codeCommit、localHead、remoteMain 同为 `9a79ed49d3e11052ad69a3064d271b3ce0fcce47`；容器中的 62 个源码文件 mismatch=[]；原始基线 380 条、发布前 521 条受保护历史记录均 missing=[]、changed=[]；公网健康 ok=true，应用容器 running／healthy、退出码0。只更新 app，桌面与持久数据保留。只读 git 核对也确认 HEAD=origin/main，未提交内容仅为文档、证据及其忽略规则；git diff --check 通过。

原题记录 40 人核验、0/20；调整后的两轮为 65 条记录、64 个账号、2 个宽口径程序 match，尚非严格本人形象和框架眼镜通过。本轮结果分别说明：

- **Case A**，`research-b7829d5a507c7425f3601697`：新词、严格本人书卷形象与日常框架眼镜，目标 1 人，核验 25 人、0/1、partial。续聊、保留原任务、交付和导出通过，`realQualifiedDelivery=false`；业务正向验收没有通过。
- **Case B**，`research-b6a28edf401b3a52ebb44143`：公网自然文字书评 KOC case，`booknerd`／`booklover`、地区不限，完成 2/2，核验 4 人、基础读取 10 人、排除 6 人，自动交付、导出和原任务保留断言通过。只检查个人消费者身份与第一人称阅读体验，不能声称验证了严格外观要求。旧部署的请求到任务终态耗时 743.861 秒，不能用新调度代码的内存测试改写这一实测时间。
- **Case C**：c24e3af 部署后从原公网入口登记，`research-9ad67d8142750fb21a31634c`、generic `bookworm`，已 completed、5 人核验、1 合格／1 入选，目标 1 人；基础读取 18、排除 13，请求到任务终态 498,712 ms。保存的真实 JSON 中 delivery、exports、realQualifiedDelivery 均通过。入选 bookwormbullet 粉丝 17,241，本人简介 `🇮🇳🇺🇸 | sf bay area 🌁` 归一为 US；审计独立 view_image 查看 `bookworm-framed-reading.png`，确认有人物持翻开的书、佩戴日常框架透明镜片。人物归属与原帖关系由保存的 WaveSurge 帖子、第一人称文字、素材及浏览器证据映射说明；这是已观察的视频封面，不能称照片帖或已观看视频。族裔自述 unknown，不从画面或旗帜推断。这证明新口径 1 人 case 成功，不等于原题 20 人通过。
- **fresh B**：同一 c24e3af 公网环境，`research-dbd0a595c74c88337d88bdad`、`booknerd`／`booklover`，已 completed、3 人核验、2 合格／2 入选，目标 2 人；请求到任务终态 188,483 ms，较慢视觉 Case C 同时运行。实际 JSON 的自然口径、真实配额、自动交付、导出与历史保留断言通过。它只验证文字书评条件，不能计入严格外观名单。
- **Case F**：最终 9a79ed4 部署后，原公网入口新发自然消息触发真实 WaveSurge 开放搜索，`research-d8b24e517e7613d03f994eee`、`booknerd`／`booklover`，没有手选 handles；文字模式、地区不限、粉丝1万–10万，要求个人书评消费者身份及第一人称阅读体验。独立读取 `reading-final-public.json`：completed、3核验／2合格／2入选／目标2，7次基础读取、排除4；任务登记14,726 ms，总耗时205,905 ms。booknerd_sa 因书店身份 no_match，booknerdkat 与 bookloveraly match／selected=true。自动对话交付、原任务保留、导出均通过。独立查看新公网报告截图，目标、合格、入选、缺额、核验数各自明确；保存的在线 HTML 497328字节、CSV 655062字节与 JSON 一致，三名账号及来源任务均可对应。它证明最终发布后的开放文字 case 可交付，不能声称满足地区和严格外观条件。

## 计划完成状态

核对补救 test-plan、本轮明确要求和最新发布证据。已实现的 12 项闭环；原题或严格调整口径 20 人交付仍缺实证。

| 项目 | 状态 | 依据或尚缺证据 |
|---|---|---|
| 公网 HTTP 发送、失败可见、幂等重试 | DONE | App、消息接口、React 测试及真实公网断言 |
| 本人地区、媒体归属、实际画像 | DONE | 归属守卫闭环；真实 VA→US 程序修订、revision/history/no_match 均核对 |
| 续聊、当前事实及分段压缩 | DONE | agent/context-projection 测试及真实运行中续聊 |
| 默认 VNC 确认交接、单次跳过、任务执行偏好 | DONE | 有头 E2E及独立复核；最终公网父 false／补核验 false／其他默认 true，事实与执行一致 |
| 新关键词、实际自然语言文字 case 的正向交付 | DONE | 最终部署新 Case F 真实开放研究 completed、2/2；不包含严格外观口径 |
| 新关键词严格本人形象／框架镜 case 正向交付 | DONE | 公网 Case C completed、5核验、1/1；截图和来源映射独立审阅 |
| 晚到独立文字任务不等待慢浏览器整轮 | DONE | hot-wake 根因修复、新增回归及第三轮独立内存复核 |
| 分组人数、匹配理由、在线／离线 HTML 和 CSV | DONE | API／报告测试与公网实际查看、下载 |
| 最新修改后的完整回归 | DONE | 最新权限修改后292/36、类型exit0、R6 5/5，源码后无另行代码变动 |
| 历史保留 | DONE | 最终部署后原380条及发布前521条受保护记录均0丢失／0误改 |
| 原题或严格调整口径 20 人交付 | NOT DONE | 既有真实结果尚不支持，不能记作通过 |
| commit 与 push | DONE | 最新代码9a79ed4与origin/main一致；最终审计文档另由主线程收尾 |
| 提交后的本地 Docker 更新与公网 case 验收 | DONE | 最终9a79ed4部署、源码62项一致、healthy；许可元数据／实际下载／全新2/2／release audit全部通过 |

```json
{"coverage_pct":100,"instrumented_coverage_pct":100,"gaps":0,"tests_added":[],"plan":{"total_items":13,"done":12,"changed":0,"partial":0,"not_done":1,"deferred":0,"unverifiable":0},"verification_basis":{"unit_tests":292,"unit_files":36,"typecheck_exit":0,"r6_e2e_passed":5,"fresh_for_latest_changes":true},"business":{"original_target":20,"original_selected":0,"case_a":{"status":"partial","evaluated":25,"selected":0,"requested":1},"strict_open_case_done":true,"case_b":{"status":"completed","evaluated":4,"selected":2,"requested":2,"old_deployment_elapsed_ms":743861},"case_c":{"status":"completed","evaluated":5,"selected":1,"requested":1,"elapsed_ms":498712},"fresh_b":{"status":"completed","evaluated":3,"selected":2,"requested":2,"elapsed_ms":188483},"case_f":{"status":"completed","evaluated":3,"qualifying":2,"selected":2,"requested":2,"profile_reads":7,"base_excluded":4,"registration_ms":14726,"elapsed_ms":205905}},"geography":{"real_stored_va_correction_verified":true,"revision":2,"old_history_code":"VA","new_code":"US","verdict":"no_match","selected":false,"wave_call_delta":0},"permission":{"inheritance_code_verified":true,"fact_execution_agree_in_independent_reproduction":true,"latest_public_metadata_verified":true},"release":{"code_commit":"9a79ed4","head_matches_origin":true,"latest_post_commit_public_verified":true,"source_files":62,"source_mismatch":0,"original_protected_rows":380,"predeploy_protected_rows":521,"missing_rows":0,"changed_rows":0,"healthy":true,"final_documentation_commit_pending":true}}
```
