# R4 新发现问题的回归用例

这7条反例用于下一轮修复验收，独立于36条主用例的覆盖统计。每条在本轮均已实际执行；“failed”表示当前行为不满足期望，不代表测试未执行。RG27是现有字面包含模式的产品不足。

## RG28：迟到的初始结果覆盖已应用筛选，并把CSV恢复为全量

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：打开指定两人的研究结果，在初始加载未完成时查询“不戴眼镜”。筛选响应返回Tyler一条，界面先显示一条、CSV带tag；初始全量响应随后把界面覆盖成Tyler和Val两条，CSV链接丢掉tag，但输入框仍显示“不戴眼镜”。用户看到、导出的名单都可能违背所选条件。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[result-race-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/result-race-ui.json)、[result-race-1-filter-applied.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/result-race-1-filter-applied.png)、[result-race-1-overwritten.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/result-race-1-overwritten.png)。

## RG29：Campaign总报告与子报告的已入选身份矛盾

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：两类各一位、同人不占两个名额的真实Campaign，总报告正确分配Tyler到生活效率组、Val到实用数码组，去重2/2。点击实用数码的子报告却显示Tyler“已入选”、Val“合格备选”。用户得到两份矛盾的最终名单。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[campaign-consistency-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/campaign-consistency-ui.json)、[campaign-allocation-1-parent.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/campaign-allocation-1-parent.png)、[campaign-allocation-1-child.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/campaign-allocation-1-child.png)。

## RG30：报告将最终入选人数标成合格候选人数

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：真实指定两人研究：两人verdict均为match，卡片分别显示“符合要求·已入选”和“符合要求·合格备选”。目标一人，所以selected只有一人；报告摘要却写“目标1人；本地已合格1人；已核验2人”，与两位合格者矛盾。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[structured-document-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-ui.json)、[doc04-positive.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-positive.html)、[doc04-positive-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-positive-report.png)、[report-source-regression-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/report-source-regression-audit.json)。

## RG31：多组补标综合文档缺少每条记录的分组归属，人数单位含糊

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：用户要求三个研究各两条记录都补标，同人在多个组的记录也更新。实际六条记录对应两位创作者，其中五条合格、三条在各自独立研究入选。补标与保留原判断都正确。综合HTML却平铺六张重名卡片，不带原taskId、标题或分组；14列CSV也没有任务/分组字段。Val在不同组同时出现“符合要求”和“待核实”，导出记录无法明确对应适用范围。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[six-retag-invariants.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/six-retag-invariants.json)、[structured-document-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-ui.json)、[doc04-three-groups-retag.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-three-groups-retag.html)、[doc04-three-groups-retag.csv](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-three-groups-retag.csv)、[doc04-three-groups-retag-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-three-groups-retag-report.png)。

## RG26：粉丝判断引用了全部无关Wave来源，报告显著拉长

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：Tyler/Val粉丝基础事实各只有一条本人profile引用，__followers.evidenceIds却分别达到75/49条，包含普通帖子、照片资源和只有“视频封面资源；不能当作照片帖”文字的封面。这些来源不能证明粉丝数，削弱匹配说明的可追溯性。数值与资格判断正确。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[follower-reference-audit.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/follower-reference-audit.json)、[reference-regression.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/reference-regression.json)、[exact-layout.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/exact-layout.json)、[exact-layout-375.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/exact-layout-375.png)。

## RG27：标签字面包含检索混淆正负值

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：实际标签只有“不戴眼镜”的Tyler，在结果弹窗查询“戴眼镜”仍被召回。自然语言查询则正确排除他及未知的Val，返回零人；不能宣称所有自然语言筛选都错误。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[tag-semantics-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/tag-semantics-ui.json)、[saved-glasses.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/saved-glasses.json)、[tag-semantic-0.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/tag-semantic-0.png)。

## RG32：Campaign总文档缺逐人匹配说明和画像标签

前置条件：使用本轮保存的真实任务/报告；先确认被测结果没有后续修改。

实际操作及结果：总文档的分组、配额、两位去重入选者正确，但每位之后直接展示完整原始证据，没有逐条件结论、匹配理由或画像标签。用户需要跳到子报告才看到这些内容，子报告还存在F29的入选矛盾。

预期：修复后不再出现上述错误；保持已有条件、证据、配额和补标版本的正确行为。

证据：[doc04-campaign.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-campaign.html)、[doc04-campaign-children-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-campaign-children-ui.json)、[doc04-campaign-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-campaign-report.png)。
