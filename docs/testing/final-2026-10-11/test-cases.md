# 提交前验收用例集

日期：2026-10-11。用例覆盖题目四项要求、F26–F32 回归及相关业务/基础功能；人工接管场景不在本轮范围。

[测试方案](test-plan.md) · [最终报告](report.md) · [机器可读用例](test-cases.json) · [截图索引](screenshots.md)

## 用例清单

| 编号 | 用例 | 结论 |
|---|---|---|
| [T01](#t01) | 自然语言与原题混合条件 | 通过 |
| [T02](#t02) | 分析预算与入选配额 | 通过 |
| [T03](#t03) | 真实 Instagram 获取 | 通过 |
| [T04](#t04) | Instagram 关键词/分页/单帖 | 通过 |
| [T05](#t05) | YouTube/TikTok/X 有界来源 | 通过 |
| [T06](#t06) | 逐人模型分析与实际画像 | 通过 |
| [T07](#t07) | 视觉条件与图像证据 | 通过 |
| [T08](#t08) | 未知与不符合分开 | 通过 |
| [T09](#t09) | 硬条件与偏好 | 通过 |
| [T10](#t10) | 全部记录补标 | 通过 |
| [T11](#t11) | 已有结果重新核验 | 通过 |
| [T12](#t12) | 整批完成后一次交付 | 通过 |
| [T13](#t13) | DOC04结构化正向文档 | 通过 |
| [T14](#t14) | DOC04空/未知文档 | 通过 |
| [T15](#t15) | F30合格与入选统计 | 通过 |
| [T16](#t16) | F31归属与计数单位 | 通过 |
| [T17](#t17) | F32Campaign逐人说明 | 通过 |
| [T18](#t18) | F29Campaign分配一致 | 通过 |
| [T19](#t19) | F26粉丝证据引用 | 通过 |
| [T20](#t20) | F27肯定/否定标签 | 通过 |
| [T21](#t21) | F28迟到响应 | 通过 |
| [T22](#t22) | Campaign目标与修订 | 通过 |
| [T23](#t23) | Campaign确认与幂等 | 通过 |
| [T24](#t24) | 持续消息/取消/幂等 | 通过 |
| [T25](#t25) | 活动任务清空/载入 | 通过 |
| [T26](#t26) | 模型/提示词设置 | 通过 |
| [T27](#t27) | 参考图片对话 | 通过 |
| [T28](#t28) | 备份与非法载入 | 通过 |
| [T29](#t29) | 历史压缩 | 通过 |
| [T30](#t30) | 认证和输入边界 | 通过 |
| [T31](#t31) | 消息时间与设置界面 | 通过 |
| [T32](#t32) | 响应布局与报告链接 | 通过 |
| [T33](#t33) | 最终重启与持久性 | 通过 |
| [T34](#t34) | 临时/永久模型错误 | 通过 |
| [T35](#t35) | 构建与自动化 | 通过 |
| [T36](#t36) | 提交文档与文件整理 | 通过 |
| [T37](#t37) | F33重新核验后的源任务说明一致性 | 未通过（P2） |

## 执行记录

<a id="t01"></a>
### T01 自然语言与原题混合条件

**步骤：** 输入原题；澄清 geek、自述、个人KOC口径；限定两个真实账号，目标/预算保留20，使用文字资料。

**预期：** 数量、平台、粉丝及硬条件分别保存；两人均核验；缺证待核实；不伪造20位正例。

**实际：** 原题经自然澄清保存20人目标；限定2账号实际核验2人，均待核实，入选0、缺额20。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t02"></a>
### T02 分析预算与入选配额

**步骤：** 一条自然消息登记三项独立研究；每组两人全部分析，最终选一位。

**预期：** 3项任务、6条核验、2个去重账号；每组2合格/1入选/0缺额。

**实际：** 3项独立研究完整核验6条/2账号，每组2合格、1入选；均通过。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t03"></a>
### T03 真实 Instagram 获取

**步骤：** 对指定两位账号启动新研究和两组 Campaign，核对 Wave 调用日志。

**预期：** 实际 token 对实际接口 GET 获取基础资料、帖子与详情；不是只返回列表。

**实际：** 本轮真实Wave共64次GET，全部HTTP200；新研究使用当前原始数据链路。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t04"></a>
### T04 Instagram 关键词/分页/单帖

**步骤：** 新部署运行 qa-instagram 浏览器场景。

**预期：** v3搜索、详情、两页帖子、单帖均按GET执行；大整数ID和分页令牌保留。

**实际：** 全新Docker的5次Instagram GET、分页及大整数身份检查通过。

**结论：** 通过

**证据：** [automation-summary.json](evidence/automation-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t05"></a>
### T05 YouTube/TikTok/X 有界来源

**步骤：** 自然语言分别启动三个平台文字研究，每项分析1人并标内容方向。

**预期：** 各平台读取已有名单；基于实际来源完成或交付失败/缺额；整批一次报告。

**实际：** YouTube、TikTok、X各读取500条有界资料并实际分析/标注1位，三项均完成。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t06"></a>
### T06 逐人模型分析与实际画像

**步骤：** 读取新研究的调用、工具回执与结果；展开两位的条件和标签。

**预期：** 每位实际submit_judgments，保存逐条件理由/引用与独立annotations；真实值进入tags。

**实际：** 15条真实核验记录保存判断、理由、引用及实际画像；不是仅返回候选列表。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t07"></a>
### T07 视觉条件与图像证据

**步骤：** 运行真实配置模型、生产有头浏览器及受控公开耳机照片。

**预期：** 观察实际像素，视觉条件引用保存截图；HTML可离线查看；无人工操作。

**实际：** 真实模型观察受控耳机照片并保存截图，视觉条件通过，HTML嵌入PNG。

**结论：** 通过

**证据：** [automation-summary.json](evidence/automation-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t08"></a>
### T08 未知与不符合分开

**步骤：** 检查原题缺证记录及受控学习效率组的一位不匹配候选。

**预期：** 未知不成为肯定标签或入选；不符合单独保存；缺额不补成合格。

**实际：** 真实原题两条unknown不入选；受控Campaign保留不符合记录。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t09"></a>
### T09 硬条件与偏好

**步骤：** YouTube科技必选，geek文字自述仅偏好；两位均核验。

**预期：** 两位可同时合格；偏好影响最终入选，未满足偏好不把合格备选改成不符合。

**实际：** 两位科技候选均合格；geek文字自述偏好改变入选而不改合格备选。

**结论：** 通过

**证据：** [automation-summary.json](evidence/automation-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t10"></a>
### T10 全部记录补标

**步骤：** 自然要求三组全部6条、含备选和同账号跨组记录补内容使用场景。

**预期：** 6条均新增画像和版本；原事实/判断/入选不变；0新Wave调用；1综合交付。

**实际：** 6条全部新增画像/版本，原creator、judgments、selected和原画像逐项相等；新增Wave0。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t11"></a>
### T11 已有结果重新核验

**步骤：** 自然要求重新打开两位本人主页，按原条件复核。

**预期：** 本轮新观察/截图、版本更新、旧版本保存；不重新发现候选。

**实际：** 两位均取得本轮本人主页观察及截图，版本1→2、旧版本保留、新增Wave0。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t12"></a>
### T12 整批完成后一次交付

**步骤：** 对多研究、多补标和Campaign核对终态时间与消息时间。

**预期：** 登记封口且全部工作终态后才交付；最终报告不按每位候选分别上报。

**实际：** 研究、补标、Campaign各只交付一次；交付时间均不早于末项结束/结果写入。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t13"></a>
### T13 DOC04结构化正向文档

**步骤：** 聊天打开报告，核对DOM、保存结果并实际下载解析CSV。

**预期：** 清单、逐条件状态/理由、画像/标签/引用、来源/分组、入选均齐全；25列可解析。

**实际：** 11组文档完成320项显式字段/统计/归属比对，全部通过；CSV每行25列。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t14"></a>
### T14 DOC04空/未知文档

**步骤：** 检查零合格研究、空候选及筛选空集的HTML与CSV。

**预期：** 空清单保持结构、表头和真实缺额；筛选不修改研究整体统计。

**实际：** 另一个真实空候选场景为0条，缺额1，CSV保留25列表头；原题未知及筛选空集均验证。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t15"></a>
### T15 F30合格与入选统计

**步骤：** 两位合格选一位，分别检查聊天、HTML、API、CSV。

**预期：** 合格候选2人、最终入选1人、缺额0；备选保留。

**实际：** 正向单组始终显示2合格、1入选、0缺额；备选保留。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t16"></a>
### T16 F31归属与计数单位

**步骤：** 三组同两人，及三项全记录补标的综合HTML/CSV逐条检查。

**预期：** 6记录/2账号；每条任务/分组来源完整；各组名额及去重人数分开。

**实际：** 三组及六条补标各显示6记录/2账号，全部记录任务与分组来源可追踪。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t17"></a>
### T17 F32Campaign逐人说明

**步骤：** 从聊天打开Campaign总文档，检查每位入选者的条件、理由和画像。

**预期：** 总文档直接含逐人说明、实际标签和引用，不依赖读者自行推断原始帖子。

**实际：** Campaign总报告直接呈现每位条件、状态、理由、标签、画像及来源。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t18"></a>
### T18 F29Campaign分配一致

**步骤：** 重叠候选两组各一配额，逐一核对总/子/API/弹窗/CSV/Agent查询。

**预期：** 2个不同账号；各视图使用同一最终分配；原预选作为审计保留。

**实际：** 总/子/API/CSV/弹窗/实际Agent查询使用相同2账号分配，原预选审计保留。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t19"></a>
### T19 F26粉丝证据引用

**步骤：** 当前生产路由加载历史反例的私有副本，执行定向引用修复并打开报告。

**预期：** 287引用缩为对应数值来源1条；原288条资料保留；结论不改变。

**实际：** 同历史反例287引用→1，全部288条原资料保留；当前浏览器数值行可读。

**结论：** 通过

**证据：** [regression-c-browser.json](evidence/regression-c-browser.json)；过程画面见[截图索引](screenshots.md)。

<a id="t20"></a>
### T20 F27肯定/否定标签

**步骤：** 结果界面查询戴眼镜，先默认精确，再切换显式文字包含。

**预期：** 精确0条，不命中不戴眼镜；包含模式1条且界面说明；导出范围同步。

**实际：** 戴眼镜精确0、显式包含命中不戴眼镜1；真实自然查询科技精确2、包含11，工具模式正确。

**结论：** 通过

**证据：** [regression-c-browser.json](evidence/regression-c-browser.json)；过程画面见[截图索引](screenshots.md)。

<a id="t21"></a>
### T21 F28迟到响应

**步骤：** 分别延迟初始请求、上一条查询；新查询完成后释放原响应，下载CSV。

**预期：** 两种乱序均保持新结果1条及新导出范围；不改原响应内容。

**实际：** 初始及上一查询的真实迟到响应均未覆盖新范围；下载均为新查询1行。

**结论：** 通过

**证据：** [regression-c-browser.json](evidence/regression-c-browser.json)；过程画面见[截图索引](screenshots.md)。

<a id="t22"></a>
### T22 Campaign目标与修订

**步骤：** 从智能设备认知目标开始，交互形成两种类型并补充目标保存新版。

**预期：** 草案含不同类型理由/范围/配额；修订至v2，确认前无搜索和子任务。

**实际：** 从营销目标形成两种类型草案，修订至v2，确认前无子任务/新Wave。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t23"></a>
### T23 Campaign确认与幂等

**步骤：** 提交旧版本启动；在方案页确认v2；重复当前版本启动。

**预期：** 旧版本409；确认后登记两项；重复启动复用原任务；终态后1综合报告。

**实际：** 旧版启动409；v2页面确认后登记2项；重复启动返回相同子任务。

**结论：** 通过

**证据：** [business-workflows.json](evidence/business-workflows.json)；过程画面见[截图索引](screenshots.md)。

<a id="t24"></a>
### T24 持续消息/取消/幂等

**步骤：** 活动研究中连续发送取消、旧结果查询、保持停止；重复消息ID。

**预期：** 取消正确任务；旧结果保留；无迟到写入；同内容200、冲突409且不重执行。

**实际：** 活动消息全部接收；正确取消、旧结果保留、无迟到写入；同ID同文200、冲突409。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t25"></a>
### T25 活动任务清空/载入

**步骤：** 登记未封口时通过设置页清空/载入，然后等待后台结束与重启。

**预期：** 后台任务保留；批次封口；当前epoch一次报告，说明尚未登记事项未执行。

**实际：** 在未封口登记期间分别清空/载入；原任务继续，当前epoch各交付1次；重启无重放。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t26"></a>
### T26 模型/提示词设置

**步骤：** 不更新Key保存设置；非法阈值；保存提示词标记后实际问候，再恢复。

**预期：** Key保留；非法阈值拒绝；下一次模型请求及回复使用新提示词；恢复成功。

**实际：** 留空Key保留凭据，1999阈值拒绝；真实模型请求/答复使用新提示词后恢复。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t27"></a>
### T27 参考图片对话

**步骤：** 上传/移除图片，再发送色块参考图且明确不搜索。

**预期：** 真实模型读取图片；附件及回复保存；无额外研究或Wave调用。

**实际：** 参考图片上传、移除、实际图像答复与附件持久化通过，无新Wave。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t28"></a>
### T28 备份与非法载入

**步骤：** 实际下载JSON，提交非法JSON，再加载有效备份。

**预期：** 可解析；非法载入拒绝；有效载入保留任务/结果且不重放工具。

**实际：** 实际备份JSON可解析；非法JSON拒绝；有效载入不重放历史工具。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t29"></a>
### T29 历史压缩

**步骤：** 对已有完整研究对话点击压缩，再刷新。

**预期：** 实际模型生成非空摘要；最新用户留在边界外；原消息/任务保留；无搜索重放。

**实际：** 实际压缩非空摘要，最新用户在边界之外；消息与任务保留，刷新一致。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t30"></a>
### T30 认证和输入边界

**步骤：** 错误登录/退出；11个未认证路由；跨Origin写入和非法消息/图片。

**预期：** 401/403/400按约束返回；缺对象404；状态不被非法请求改变。

**实际：** 11未认证路径401、跨Origin403、4类非法输入400、缺对象404，均符合契约。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t31"></a>
### T31 消息时间与设置界面

**步骤：** 核对用户/回复/自动报告time元素，刷新；打开设置。

**预期：** 原createdAt按本地时区显示至秒，刷新不改；设置无调用记录展示。

**实际：** 真实验收与主部署用户/助手/自动报告原时间精确到秒，刷新不改；设置页无调用记录。

**结论：** 通过

**证据：** [submission-ui.json](evidence/submission-ui.json)；过程画面见[截图索引](screenshots.md)。

<a id="t32"></a>
### T32 响应布局与报告链接

**步骤：** 1440/768/375浏览器打开正向、分组、Campaign、空文档及结果界面。

**预期：** 页面无正文横向溢出；条件、状态、理由可读；Chat链接可打开。

**实际：** 报告1440/768/375和应用375无横向溢出，实际Chat链接/下载可用。

**结论：** 通过

**证据：** [document-validation.json](evidence/document-validation.json)；过程画面见[截图索引](screenshots.md)。

<a id="t33"></a>
### T33 最终重启与持久性

**步骤：** 所有任务终态后普通重启自有app/desktop，重新打开文档/结果。

**预期：** 结果、标签、版本、分配及消息保留；0新增Wave/模型调用；报告不重发。

**实际：** 两套自有app/desktop正常重启：13/11任务、15/14结果及历史等内容哈希不变，0额外Wave/模型和重复报告。

**结论：** 通过

**证据：** [restart-final.json](evidence/restart-final.json)；过程画面见[截图索引](screenshots.md)。

<a id="t34"></a>
### T34 临时/永久模型错误

**步骤：** 隔离代理仅注入一次408至会话、候选排序、核验；会话另注入400。

**预期：** 408重试原工作并成功，400不无限重试且真实错误可见；配置恢复。

**实际：** 3种408均原工作2次尝试408→200；400仅1次并可见；原模型地址恢复。

**结论：** 通过

**证据：** [regression-summary.json](evidence/regression-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t35"></a>
### T35 构建与自动化

**步骤：** 类型检查、Vite构建、完整Vitest覆盖率。

**预期：** 全部通过；源码行/分支/函数/语句按既有逐文件门槛100%。

**实际：** 默认命令限制4 worker后242/242、32文件通过；四项覆盖率100%，类型与构建通过。

**结论：** 通过

**证据：** [automation-summary.json](evidence/automation-summary.json)；过程画面见[截图索引](screenshots.md)。

<a id="t36"></a>
### T36 提交文档与文件整理

**步骤：** 核对README、架构、设计/测试入口、相对链接、忽略规则和公开证据。

**预期：** 入口完整、链接可用、源码版本一致、凭据/数据库/临时材料不进入提交文件。

**实际：** 8份入口文档242个相对链接均存在；14条忽略/保留规则通过；完整提交包源码59文件一致、83截图哈希一致、无数据库/私有追踪/已知凭据。

**结论：** 通过

**证据：** [submission-check.json](evidence/submission-check.json)；过程画面见[截图索引](screenshots.md)。

<a id="t37"></a>
### T37 F33重新核验后的源任务说明一致性

**步骤：** 从两位待核实的文字研究重新访问本人主页核验，查看原任务卡与更新报告。

**预期：** 原任务status、合格/入选数及detail描述一致；旧0/1应更新为当前1/1。

**实际：** status=completed、qualifying=2、matched=1，CSV入选1；任务卡与报告正文detail仍为已选合格0/1。

**结论：** 未通过

**证据：** [reverify-description.json](evidence/reverify-description.json)；过程画面见[截图索引](screenshots.md)。

**影响：** 文案误导；实际判断、名单、CSV与新研究/Campaign核心流程正确。

