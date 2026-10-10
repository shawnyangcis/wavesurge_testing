# R4 已确认缺陷和交付不足

本轮只验证和报告，没有修改业务源码。七项均有实际浏览器或原始结果证据；F26通过相同输入回放确认为本次新增回归，其余属于本轮新发现的既有问题或产品不足。

## F28 / P2：迟到的初始结果覆盖已应用筛选，并把CSV恢复为全量

分类：既有缺陷，本轮新发现。

打开指定两人的研究结果，在初始加载未完成时查询“不戴眼镜”。筛选响应返回Tyler一条，界面先显示一条、CSV带tag；初始全量响应随后把界面覆盖成Tyler和Val两条，CSV链接丢掉tag，但输入框仍显示“不戴眼镜”。用户看到、导出的名单都可能违背所选条件。

自然测试先观察到此现象；随后仅给初始真实响应增加2500ms延迟，两次均复现，没有伪造数据。每次异步请求都能写入results/applied，没有序号或取消过期响应。建议只应用最近一次请求的结果和筛选参数。常规等待初始加载完成的查询通过，不能排除并发缺陷。

定位：[src/client/Results.tsx:9](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/client/Results.tsx:9)。

证据：[result-race-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/result-race-ui.json)、[result-race-1-filter-applied.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/result-race-1-filter-applied.png)、[result-race-1-overwritten.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/result-race-1-overwritten.png)。

## F29 / P2：Campaign总报告与子报告的已入选身份矛盾

分类：既有缺陷，本轮新发现。

两类各一位、同人不占两个名额的真实Campaign，总报告正确分配Tyler到生活效率组、Val到实用数码组，去重2/2。点击实用数码的子报告却显示Tyler“已入选”、Val“合格备选”。用户得到两份矛盾的最终名单。

全局配额和去重算法正确；子报告沿用独立研究的selected，没有Campaign分配上下文。建议使用Campaign最终分配，或明确标注独立研究预选与Campaign入选的区别。

定位：[src/server/campaign.ts:42](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/campaign.ts:42)。

证据：[campaign-consistency-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/campaign-consistency-ui.json)、[campaign-allocation-1-parent.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/campaign-allocation-1-parent.png)、[campaign-allocation-1-child.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/campaign-allocation-1-child.png)。

## F30 / P2：报告将最终入选人数标成合格候选人数

分类：DOC04；既有标签问题，本轮专项发现。

真实指定两人研究：两人verdict均为match，卡片分别显示“符合要求·已入选”和“符合要求·合格备选”。目标一人，所以selected只有一人；报告摘要却写“目标1人；本地已合格1人；已核验2人”，与两位合格者矛盾。

把task.matched（已选合格人数）用于“本地已合格”，没有展示qualifying。建议区分已核验、合格候选、最终入选和缺额；不能为修正文案把合格备选改成不合格。旧源码也使用此统计标签。

定位：[src/server/reports.ts:18](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/reports.ts:18)。

证据：[structured-document-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-ui.json)、[doc04-positive.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-positive.html)、[doc04-positive-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-positive-report.png)、[report-source-regression-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/report-source-regression-audit.json)。

## F31 / P2：多组补标综合文档缺少每条记录的分组归属，人数单位含糊

分类：DOC04；既有交付不足，本轮专项发现。

用户要求三个研究各两条记录都补标，同人在多个组的记录也更新。实际六条记录对应两位创作者，其中五条合格、三条在各自独立研究入选。补标与保留原判断都正确。综合HTML却平铺六张重名卡片，不带原taskId、标题或分组；14列CSV也没有任务/分组字段。Val在不同组同时出现“符合要求”和“待核实”，导出记录无法明确对应适用范围。

摘要写“目标6人；本地已合格5人；已核验6人”；虽然小字说明6条筛选记录，仍未说明去重只有两位。workResults直接求和，渲染丢失记录来源。建议保留六条组内记录、加来源任务/类型，并区分记录数与去重人数；不应直接去重删除组内记录。

定位：[src/server/work-delivery.ts:59](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/work-delivery.ts:59)。

证据：[six-retag-invariants.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/six-retag-invariants.json)、[structured-document-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-ui.json)、[doc04-three-groups-retag.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-three-groups-retag.html)、[doc04-three-groups-retag.csv](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-three-groups-retag.csv)、[doc04-three-groups-retag-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-three-groups-retag-report.png)。

## F26 / P2：粉丝判断引用了全部无关Wave来源，报告显著拉长

分类：本次修复新增回归。

Tyler/Val粉丝基础事实各只有一条本人profile引用，__followers.evidenceIds却分别达到75/49条，包含普通帖子、照片资源和只有“视频封面资源；不能当作照片帖”文字的封面。这些来源不能证明粉丝数，削弱匹配说明的可追溯性。数值与资格判断正确。

相同真实输入通过R3/R4算法只读回放，原实现引用1/1条，当前变成75/49条。新实现把全部非headed-chromium证据拼入数值判断。建议只引用对应数值来源，其余留在完整证据区。375px报告的两条粉丝行高分别8827.5px、5863.5px。

定位：[src/server/verdict.ts:23](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/verdict.ts:23)。

证据：[follower-reference-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/follower-reference-audit.json)、[reference-regression.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/reference-regression.json)、[exact-layout.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/exact-layout.json)、[exact-layout-375.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/exact-layout-375.png)。

## F27 / P2：标签字面包含检索混淆正负值

分类：产品不足，本轮实际确认。

实际标签只有“不戴眼镜”的Tyler，在结果弹窗查询“戴眼镜”仍被召回。自然语言查询则正确排除他及未知的Val，返回零人；不能宣称所有自然语言筛选都错误。

使用includes，界面没有精确标签匹配选项或正负语义说明。建议为结构化画像值提供精确选择，并保留明确标识的模糊检索。当前实现符合字面包含规则，但按肯定特征找人容易拿到反例。

定位：[src/server/result-filter.ts:6](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/result-filter.ts:6)。

证据：[tag-semantics-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/tag-semantics-ui.json)、[saved-glasses.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/saved-glasses.json)、[tag-semantic-0.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/tag-semantic-0.png)。

## F32 / P2：Campaign总文档缺逐人匹配说明和画像标签

分类：DOC04；既有交付不足。

总文档的分组、配额、两位去重入选者正确，但每位之后直接展示完整原始证据，没有逐条件结论、匹配理由或画像标签。用户需要跳到子报告才看到这些内容，子报告还存在F29的入选矛盾。

总报告与子报告共同提供结构化内容，不能判定系统完全没有文档或匹配说明；不足是总报告本身没有完成可直接使用的最终交付。campaign-api只拼profile链接和evidenceReport，没有渲染judgments/annotations。建议总文档保留每位被选原因、条件状态和画像，完整证据可折叠或链接。

定位：[src/server/campaign-api.ts:11](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/src/server/campaign-api.ts:11)。

证据：[doc04-campaign.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-campaign.html)、[doc04-campaign-children-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-campaign-children-ui.json)、[doc04-campaign-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-campaign-report.png)。
