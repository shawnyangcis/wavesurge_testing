# DOC04：题目要求3的结构化结果文档验收

对应原文：“最终输出结构化的结果文档，包含符合条件的创作者清单、特征匹配说明等信息。”

结论：独立HTML与CSV已实际打开和下载，单人条目包含逐条件判断、匹配理由、标签及证据；系统已经有结构化交付。专项验收仍未完全通过，正向统计、跨组归属及Campaign总文档存在F30–F32问题，Campaign总/子入选不一致另见F29。不能把“存在链接”或“能下载CSV”当作全部满足题目。

已执行5类场景，共67项字段/内容检查，62项通过、5项失败。这是专项内部检查数，不能与36项主用例混算。失败项不是应用崩溃，而是用户可见的结构或统计问题。

## 可重复执行步骤

1. 使用已完成批次，从Chat最终消息点击HTML综合报告；无候选单任务通过“查看结果→查看报告”进入。
2. 核对账号、平台、本人链接、粉丝和地区；每人应有明确资格状态及入选/备选标记。
3. 检查每个条件的match/no_match/unknown、理由和有效证据编号；画像支持值应和未知值分开。
4. 区分合格清单、备选、待核实、不符合；零合格不能用候选补满推荐人数，缺额与来源边界应说明。
5. 核对已核验记录数、合格候选数、最终入选数、去重人数；多组必须能明确归属和配额。
6. 实际下载CSV，用标准CSV解析器读取14列及嵌套JSON，逐条和HTML/保存结果比对；保留原文件及过程截图。

验收接受有清楚层级的HTML/CSV，不强制仅有表格、JSON、PDF或某个文件后缀。空候选时允许清单为空，但应解释0和短缺。

## 场景结果

| 场景 | 实际记录/唯一创作者 | 内容和字段 | 专项判定 |
|---|---:|---|---|
| 指定两人正向结果 | 2/2 | 合格候选人数统计与逐人判断一致 | 未完全通过 |
| 原题20候选，零合格 | 20/20 | 所测字段与统计通过 | 通过 |
| 三组补标，6记录/2人 | 6/2 | 多组文档明确记录数与去重人数；每条补标记录可明确归属原研究组；多组CSV包含记录所属研究组字段 | 未完全通过 |
| YouTube无候选 | 0/0 | 所测字段与统计通过 | 通过 |
| Campaign两类型 | 2/2 | Campaign总报告直接含逐人特征匹配说明和标签 | 未完全通过 |

单项和综合CSV的14列均可解析，逐条件、标签、画像、入选状态与保存记录一致。三组CSV缺来源任务字段属于结构不足，不能因为已有列与数据库一致就判合格。Campaign总报告只有HTML入口；完整条件说明可以在子文档获得，总文档本身没有逐人匹配说明与画像。

## 指定两人正向结果

账号记录2条，唯一创作者2位；合格记录2条，入选记录1条。

证据：[doc04-positive.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-positive.html)、[doc04-positive-entry.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-positive-entry.png)、[doc04-positive-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-positive-report.png)、[CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-positive.csv)。

- 通过：批次所有事项均结束且已封口交付。
- 通过：实际点击打开独立HTML文档。
- 通过：清单条目数与实际记录一致。
- 通过：identity。
- 通过：criteria。
- 通过：triState。
- 通过：tags。
- 通过：annotations。
- 通过：evidenceReferences。
- 通过：selectionLabels。
- 通过：核验记录统计与真实记录一致。
- 失败：合格候选人数统计与逐人判断一致。
- 通过：实际CSV下载有14列且嵌套JSON可解析。
- 通过：CSV清单/逐条件/标签/入选与实际结果一致。
## 原题20候选，零合格

账号记录20条，唯一创作者20位；合格记录0条，入选记录0条。

证据：[doc04-original20-zero-qualified.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-original20-zero-qualified.html)、[doc04-original20-zero-qualified-entry.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-original20-zero-qualified-entry.png)、[doc04-original20-zero-qualified-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-original20-zero-qualified-report.png)、[CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-original20-zero-qualified.csv)。

- 通过：批次所有事项均结束且已封口交付。
- 通过：实际点击打开独立HTML文档。
- 通过：清单条目数与实际记录一致。
- 通过：identity。
- 通过：criteria。
- 通过：triState。
- 通过：tags。
- 通过：annotations。
- 通过：evidenceReferences。
- 通过：selectionLabels。
- 通过：核验记录统计与真实记录一致。
- 通过：合格候选人数统计与逐人判断一致。
- 通过：零合格明确0且不推荐待核实或不符合者。
- 通过：实际CSV下载有14列且嵌套JSON可解析。
- 通过：CSV清单/逐条件/标签/入选与实际结果一致。
## 三组补标，6记录/2人

账号记录6条，唯一创作者2位；合格记录5条，入选记录3条。

证据：[doc04-three-groups-retag.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-three-groups-retag.html)、[doc04-three-groups-retag-entry.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-three-groups-retag-entry.png)、[doc04-three-groups-retag-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-three-groups-retag-report.png)、[CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-three-groups-retag.csv)。

- 通过：批次所有事项均结束且已封口交付。
- 通过：实际点击打开独立HTML文档。
- 通过：清单条目数与实际记录一致。
- 通过：identity。
- 通过：criteria。
- 通过：triState。
- 通过：tags。
- 通过：annotations。
- 通过：evidenceReferences。
- 通过：selectionLabels。
- 通过：核验记录统计与真实记录一致。
- 通过：合格候选人数统计与逐人判断一致。
- 失败：多组文档明确记录数与去重人数。
- 失败：每条补标记录可明确归属原研究组。
- 通过：实际CSV下载有14列且嵌套JSON可解析。
- 通过：CSV清单/逐条件/标签/入选与实际结果一致。
- 失败：多组CSV包含记录所属研究组字段。
## YouTube无候选

账号记录0条，唯一创作者0位；合格记录0条，入选记录0条。

证据：[doc04-empty-youtube.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-empty-youtube.html)、[doc04-empty-youtube-entry.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-empty-youtube-entry.png)、[doc04-empty-youtube-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-empty-youtube-report.png)、[CSV](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-empty-youtube.csv)。

- 通过：实际点击打开独立HTML文档。
- 通过：清单条目数与实际记录一致。
- 通过：identity。
- 通过：criteria。
- 通过：triState。
- 通过：tags。
- 通过：annotations。
- 通过：evidenceReferences。
- 通过：selectionLabels。
- 通过：核验记录统计与真实记录一致。
- 通过：合格候选人数统计与逐人判断一致。
- 通过：零合格明确0且不推荐待核实或不符合者。
- 通过：实际CSV下载有14列且嵌套JSON可解析。
- 通过：CSV清单/逐条件/标签/入选与实际结果一致。
## Campaign两类型

账号记录2条，唯一创作者2位；合格记录2条，入选记录2条。

证据：[doc04-campaign.html](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-campaign.html)、[doc04-campaign-entry.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-campaign-entry.png)、[doc04-campaign-report.png](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/screenshots/doc04-campaign-report.png)。

- 通过：实际点击打开独立HTML文档。
- 通过：清单条目数与实际记录一致。
- 通过：Campaign总文档按类型分组并显示配额。
- 通过：Campaign提供逐条件完整证据的子文档。
- 通过：Campaign入选清单与去重人数正确。
- 失败：Campaign总报告直接含逐人特征匹配说明和标签。
- 通过：Campaign子文档提供完整逐条件说明和画像。

完整检查及原始字段：[structured-document-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/structured-document-ui.json)。子报告专项：[doc04-campaign-children-ui.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/doc04-campaign-children-ui.json)。缺陷详情：[findings.md](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/retest-2026-10-10-r4/findings.md)。
