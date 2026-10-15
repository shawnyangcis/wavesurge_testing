# 全流程验收用例与实际结果

日期：2026-10-15–16（Asia/Shanghai）。54项预设用例及2项执行中发现的补充用例；50通过、5未通过、1部分完成。用例按业务点计数，不与315项自动化断言或5/8项浏览器脚本相加。

数据来源与边界见[测试方案](test-plan.md)、[最终报告](report.md)。初稿CSV25列沿用旧版，实际当前版为27列；保留原预期并核对新增字段。

## A01 公网HTTP登录、消息发送与时间 — 通过

预期：真实公网新任务返回201，非安全上下文可用，时间刷新保持。

实际：公网HTTP登录并通过实际UI新建13项任务；消息201，非安全上下文发送可用；刷新后消息/时间保留。

证据：[business-workflows.json](evidence/business-workflows.json)、[modal-evidence.json](evidence/modal-evidence.json)。

## A02 错误/空密码与退出 — 通过

预期：无认证拒绝访问，错误可见，退出失效。

实际：空密码禁用、错误密码401、退出后原会话401。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## A03 认证与输入边界 — 通过

预期：保护接口401、跨Origin403、非法输入400、缺对象404。

实际：11个未认证路由401、跨Origin403、4种非法消息400、缺失对象404。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## A04 参考图片对话 — 通过

预期：实际识别参考图，附件可移除，不创建研究。

实际：真实图像回复左绿右蓝，附件删除有效，无额外研究。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## B01 开放真实搜索 — 通过

预期：无指定账号找到2位本人跑步体验创作者，1–10万粉丝，实际逐人画像。

实际：首次因来源/模型失败0/2，保留原记录；相同条件独立重试，读取40个基础账号、核验6位、入选2位，逐人画像完成。

证据：[business-workflows.json](evidence/business-workflows.json)、[open-running-retry-45f6f2ff.json](evidence/open-running-retry-45f6f2ff.json)。

## B02 多组全员分析 — 通过

预期：两组各分析2选1，4条记录/2账号，备选保留。

实际：真实两组各核验2位，各2合格/1入选，4条记录/2账号；未提前终止。

证据：[two-groups-combined.json](evidence/two-groups-combined.json)。

## B03 全部记录补标 — 通过

预期：4条含备选新增画像/版本，原事实判断入选保留，0新Wave。

实际：4条含备选均新增生活场景画像，revision各+1；原资料/判断/选择/标签保留；0新Wave调用。

证据：[business-workflows.json](evidence/business-workflows.json)、[all-annotation-combined.json](evidence/all-annotation-combined.json)。

## B04 逐人实际画像 — 通过

预期：每人标签来自实际内容且有理由引用，不照抄用户条件。

实际：开放搜索6位及两组4条均有内容方向和表达风格画像，理由和证据引用可追溯；存在不符/未知者仍按资料画像。

证据：[business-workflows.json](evidence/business-workflows.json)、[individual-model-audit.json](evidence/individual-model-audit.json)。

## B05 原题20人流程 — 部分完成

预期：目标20/分析20/基础60，混合条件、图像、族裔文字核对、真实缺额。

实际：已登记目标20/分析20/基础60，实际读取60、基础排除51、核验9、入选0，缺额20；视觉与族裔文字约束保留。未达到20人正向交付。

证据：[original-20-final.json](evidence/original-20-final.json)、[business-workflows.json](evidence/business-workflows.json)。

## B06 YouTube/TikTok/X — 通过

预期：三平台各分析1人，标注并整批交付。

实际：真实三平台各分析1条并画像，全部结束后1次交付；YT/TikTok各入选1，X证据不足unknown/0入选。

证据：[business-workflows.json](evidence/business-workflows.json)、[other-platforms-49961457.json](evidence/other-platforms-49961457.json)。

## B07 真实无候选 — 通过

预期：基础条件排除后0核验，文档空集/缺额真实。

实际：TikTok 1亿–2亿粉丝范围内0候选/0核验/0入选，输出缺额1及空文档，不放宽条件。

证据：[empty-source-f99b4fd8.json](evidence/empty-source-f99b4fd8.json)。

## C01 Campaign目标交互 — 通过

预期：从目标形成两类理由、范围、配额草案，确认前不搜索。

实际：实际目标对话→澄清→两类选择理由/条件/各1配额草案；确认前无子任务/无新Wave。

证据：[business-workflows.json](evidence/business-workflows.json)。

## C02 方案修订与旧版拒绝 — 通过

预期：修订v2，旧版启动409。

实际：自然语言修订v2；旧revision启动返回409，草案条件保留。

证据：[business-workflows.json](evidence/business-workflows.json)。

## C03 确认与启动幂等 — 通过

预期：UI确认后启动，重复请求复用原任务。

实际：受控流程实际点击方案确认；公网通过对话确认同一v2启动两子任务，重复start返回200和同一任务ID。公网列表慢问题另列C05。

证据：[controlled-acceptance.json](evidence/controlled-acceptance.json)、[business-workflows.json](evidence/business-workflows.json)。

## C04 跨组去重与分配 — 通过

预期：两个不同账号，API/总子报告/弹窗/CSV/JSON同一分配。

实际：最终两个不同Instagram账号，各只占1个组；总/子报告、结果弹窗、CSV/JSON一致。

证据：[campaign-final.json](evidence/campaign-final.json)、[structured-validation.json](evidence/structured-validation.json)、[modal-evidence.json](evidence/modal-evidence.json)。

## D01 整批一次交付 — 未通过

预期：全部登记工作终态后1次报告，刷新重启不重复。

实际：8批自动最终报告各1条且在全部工作终态后发出；但真实空名单场景模型结果答复与自动综合摘要相隔10ms重复出现，用户看到2次结果汇报。

证据：[消息记录](evidence/delivery-message-audit.json)、[聊天截图](screenshots/public-empty-source-chat.png)、[批次时序](evidence/business-workflows.json)。

## D02 研究结构化文档 — 通过

预期：HTML逐人判断理由标签证据完整，CSV27列，JSON原生字段。

实际：实际下载研究HTML/CSV/JSON，包含账号/基础数值/逐条件理由/画像/引用/入选标记；当前CSV27列。

证据：[structured-validation.json](evidence/structured-validation.json)。

## D03 Campaign结构化文档 — 通过

预期：总文档直接逐人解释，导出仅最终入选，合格池另计。

实际：Campaign总文档直接逐人说明；全量4条组内记录、2合格账号，导出最终入选2条；实际CSV/JSON下载一致。

证据：[campaign-final.json](evidence/campaign-final.json)、[campaign-final.html](evidence/campaign-final.html)、[structured-validation.json](evidence/structured-validation.json)。

## D04 综合文档归属 — 通过

预期：4记录/2账号、来源任务/分组/workItems保留。

实际：研究和补标综合文档均4记录/2账号，2分组及workItems保留；来源taskId/reportContext正确，实际聊天CSV下载。

证据：[two-groups-combined.json](evidence/two-groups-combined.json)、[all-annotation-combined.json](evidence/all-annotation-combined.json)、[structured-validation.json](evidence/structured-validation.json)。

## D05 过滤空集与全量统计 — 通过

预期：筛选空集保留27列表头，JSON全量/导出分开。

实际：过滤no_match得0条，CSV仍27列表头；JSON全量selected=1、导出records=0；HTML与JSON相同过滤。

证据：[filtered-empty.json](evidence/filtered-empty.json)、[structured-validation.json](evidence/structured-validation.json)。

## D06 JSON类型与证据映射 — 通过

预期：布尔/数字/null/数组原生，无原始调试载荷，引用有效。

实际：所有样例逐项核对原生布尔/数字/null/数组；CSV逐条件判断/画像与JSON一致；证据引用有效，无creator.raw。

证据：[structured-validation.json](evidence/structured-validation.json)。

## D07 在线/离线HTML — 通过

预期：在线按需图片，离线含截图，筛选保留。

实际：在线文档按需截图；实际下载8.60MB离线HTML，在无认证且HTTP请求阻断的新浏览器中9记录/12张嵌入截图全部显示。

证据：[offline-check.json](evidence/offline-check.json)、[final-docs.json](evidence/final-docs.json)。

## R26 F26数值引用 — 通过

预期：粉丝条件只关联实际数值来源，原资料保留。

实际：原历史反例287个数值引用缩至1个，288条原证据保留，不符结论保持。

证据：[history-ui.json](evidence/history-ui.json)。

## R27 F27肯定/否定标签 — 通过

预期：精确肯定标签不命中否定，显式包含可查。

实际：实际历史不戴眼镜标签：默认精确戴眼镜命中0，显式包含命中1。

证据：[history-ui.json](evidence/history-ui.json)。

## R28 F28响应乱序 — 通过

预期：初始/旧查询迟到均不覆盖新结果和导出。

实际：真实HTTP原文仅延迟不改内容；初始/旧查询两类迟到响应均不覆盖新查询，实际CSV/JSON仍1条正确结果。

证据：[history-ui.json](evidence/history-ui.json)。

## R29 F29分配一致 — 通过

预期：Campaign所有视图统一最终分配，预选仅审计。

实际：Campaign总/子视图统一最终分配；独立研究预选仅审计，不多占配额。

证据：[structured-validation.json](evidence/structured-validation.json)、[campaign-final.html](evidence/campaign-final.html)、[modal-evidence.json](evidence/modal-evidence.json)。

## R30 F30合格/入选统计 — 通过

预期：2合格1入选0缺额，备选保留。

实际：每组2合格、1入选、缺额0，未入选合格者作为备选保留。

证据：[two-groups-combined.json](evidence/two-groups-combined.json)。

## R31 F31分组/计数单位 — 通过

预期：来源与分组可追踪，记录和账号分别统计。

实际：独立研究4记录/2账号；补标workItems分别2条记录而非4个人；来源和分组可追踪。

证据：[all-annotation-combined.json](evidence/all-annotation-combined.json)。

## R32 F32总文档逐人说明 — 通过

预期：总报告直接包含条件/理由/画像/引用。

实际：总文档直接展示两位入选者的条件、判断、理由、画像、证据来源。

证据：[campaign-final.html](evidence/campaign-final.html)。

## R33 F33重核验说明 — 未通过

预期：重核验后源任务状态、人数及detail一致。

实际：有效0→1反例：重核验2位后源任务completed/selected1，但卡片和报告detail仍写已选合格0/1。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)、[reverify-result.json](evidence/reverify-result.json)。

## V01 偏好与硬条件 — 通过

预期：偏好影响排序而不把合格备选改成不符。

实际：受控实际模型/候选全流程：偏好影响排序，2个合格候选保留，按配额选1。

证据：[controlled-acceptance.json](evidence/controlled-acceptance.json)、[acceptance-final.log](evidence/acceptance-final.log)。

## V02 图像实际核验 — 通过

预期：实际模型/有头浏览器观察耳机图，保存本轮截图。

实际：实际配置模型+生产有头浏览器读取受控耳机图片；本轮截图及原图像依据保存，非文本假装看图。

证据：[controlled-acceptance.json](evidence/controlled-acceptance.json)、[acceptance-final.log](evidence/acceptance-final.log)。

## V03 人工确认与VNC交还 — 通过

预期：默认确认、认领、实际鼠标操作、交还原候选继续。

实际：受控挑战中默认请求确认→认领→真实noVNC鼠标操作→交还原候选→继续核验交付。未操作真实第三方验证码。

证据：[controlled-acceptance.json](evidence/controlled-acceptance.json)、[acceptance-final.log](evidence/acceptance-final.log)。

## V04 仅跳过这一次 — 通过

预期：未知保留，任务不重开，后续协助许可仍保留。

实际：自然语言仅跳过这次后该候选unknown，原任务未重开，allowHumanAssistance仍true。

证据：[controlled-acceptance.json](evidence/controlled-acceptance.json)。

## V05 浏览器三次重启持久化 — 通过

预期：实际VNC新写Cookie/localStorage，三次重启均保留。

实际：通过实际VNC写入新Cookie/localStorage后连续3次正常desktop重启均保持。

证据：[controlled-acceptance.json](evidence/controlled-acceptance.json)、[acceptance-final.log](evidence/acceptance-final.log)。

## V06 重新核验与版本 — 通过

预期：新访问/截图，旧版本保留，不发现新候选。

实际：两位已有候选实际新访问/截图，revision1→2，旧版本保留，不发现新账号。人数说明缺陷单列R33。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)、[reverify-result.json](evidence/reverify-result.json)。

## V07 可关闭邀请与阻塞 — 通过

预期：SVG/中文/Not now/Escape关闭；真阻塞转人工；不提交登录表单。

实际：实际DOM的SVG/中文/Not now/Escape邀请可关闭；真登录墙/挑战保留人工路径；危险提交/删除未执行。

证据：[browser-popups-final.log](evidence/browser-popups-final.log)。

## V08 真实模型自主关闭 — 通过

预期：实际配置模型关闭弹窗后继续同候选，0人工请求。

实际：RUN_REAL_MODEL=1，实际配置模型关闭邀请，继续同候选、0人工请求；8项弹窗自动化全通过。

证据：[browser-popups-final.log](evidence/browser-popups-final.log)。

## U01 模型设置与密钥保留 — 通过

预期：留空Key保存不替换凭据，非法阈值拒绝。

实际：留空Key保存保留凭据；1999非法压缩阈值在UI拒绝，持久设置不变。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U02 提示词下一次生效 — 通过

预期：UI保存标记，真实模型请求/回复生效并恢复。

实际：设置提示词标记后下一次真实模型回复带标记；随后恢复原提示词。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U03 备份/非法载入 — 通过

预期：实际下载JSON、非法拒绝、有效载入不重放。

实际：实际点击下载JSON备份；非法JSON拒绝；有效载入无新任务/历史工具重放。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U04 执行中清空上下文 — 通过

预期：已登记任务继续，封口后当前epoch一次交付。

实际：已登记工作执行中清空上下文，原任务继续，当前上下文仅一次交付。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U05 执行中载入上下文 — 通过

预期：原工作保留，载入不重复执行工具。

实际：已登记工作执行中载入已有上下文，原工作保持，终态1次交付，无重复登记。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U06 非空历史压缩 — 通过

预期：真实模型非空摘要，最新用户在边界外，刷新保留。

实际：实际模型生成1170字非空摘要；边界批23、当时最新用户批24未被压缩；刷新及普通重启后checkpoint完全相同。

证据：[compression-boundary.json](evidence/compression-boundary.json)、[supplemental-ui.json](evidence/supplemental-ui.json)。

## U07 进度答复与事实 — 通过

预期：查询不重复登记，完成后答复不沿用旧running回执。

实际：查询期间研究完成；答复发生在终态之后，准确说已结束/2核验0入选，不沿用running，0新任务。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U08 执行中取消 — 通过

预期：连续消息接收，正确取消，无迟到写入，旧结果保留。

实际：实际浏览器核验执行中连续3条消息，正确cancelled；等待8秒无迟到写入，旧结果保留。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U09 消息ID幂等 — 通过

预期：同ID同内容不重放，冲突409。

实际：同消息ID同内容200复用，冲突内容409，无重放。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## U10 响应布局 — 通过

预期：1440/768/375报告与应用正文无横向溢出。

实际：实际应用1440/768/375无横向溢出；报告同尺寸检查通过并保存移动端截图。

证据：[modal-evidence.json](evidence/modal-evidence.json)、[final-docs.json](evidence/final-docs.json)。

## U11 正常重启持久化 — 通过

预期：任务结果历史分配消息保持，0额外调用/重复报告。

实际：自有隔离环境app+desktop普通重启；任务、结果、版本、消息、批次、交付、调用哈希完全相同；0额外Wave/模型/报告。

证据：[supplemental-ui.json](evidence/supplemental-ui.json)。

## T01 类型与生产构建 — 通过

预期：类型检查与Vite构建通过。

实际：类型检查和Vite生产构建退出0。

证据：[typecheck.log](evidence/typecheck.log)、[build.log](evidence/build.log)。

## T02 完整单元/集成 — 通过

预期：38个文件315项通过。

实际：38文件315项测试断言全部通过。

证据：[coverage.log](evidence/coverage.log)、[coverage-node.log](evidence/coverage-node.log)。

## T03 覆盖率门槛 — 未通过

预期：保持既有逐文件100%门槛且命令退出0。

实际：两次coverage命令均退出1；99.47%语句/98.34%分支/98.94%函数/99.68%行，未满足既有逐文件100%。

证据：[coverage.log](evidence/coverage.log)、[coverage-node.log](evidence/coverage-node.log)。

## S01 版本和历史保护 — 通过

预期：63源码文件版本一致，历史任务结果不改写。

实际：63份本地源码/运行app一致、desktop实际5文件一致；所有原58任务/341结果/78版本/9方案/343消息/3设置/25批次/67交付哈希保持。

证据：[version-and-preservation.json](evidence/version-and-preservation.json)。

## S02 公开资料完整性 — 通过

预期：用例/文档/截图保留，链接有效，凭据和私有状态不发布。

实际：本轮方案、用例、最终报告、实际文档和截图已保存；公开资料经凭据扫描和相对链接/文件哈希检查。

证据：[screenshots.json](screenshots.json)、[manifest.json](evidence/../manifest.json)、[artifact-check.json](evidence/artifact-check.json)。

## A05 存量诊断可用性 — 未通过

预期：存量数据诊断返回且健康检查保持可用。

实际：大历史诊断GET超过60秒，此后健康检查超过12秒；普通app重启恢复，全部原数据保持；全局崩溃根因未确认。

证据：[runtime-observation.json](evidence/runtime-observation.json)、[version-and-preservation.json](evidence/version-and-preservation.json)。

## C05 Campaign历史列表加载 — 未通过

预期：加载时准确显示进度，已有方案及时可见。

实际：实际存在10方案，公网列表3秒及30秒仍显示暂无方案，90秒采样时出现10卡片；存在慢加载及误导空态。

证据：[campaign-loading.json](evidence/campaign-loading.json)。
