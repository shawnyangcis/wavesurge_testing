# Creator 智能筛选系统全流程验收报告

日期：2026-10-15 22:16 起至 2026-10-16（Asia/Shanghai）。真实业务最终交付至00:11，随后补齐浏览器、离线文档、截图及存量数据核对。

版本：`4fb7d4cae4b0e1dc964341fd356b2d1799e3b9e6`，`main`。本轮未修改业务源码；本地63份源码与执行前及运行app一致，desktop实际执行目录5份文件一致。

## 验收结论

系统已实际走通“自然语言需求 → WaveSurge候选与资料 → 模型逐人核验和画像 → 按条件与配额入选 → 整批一次交付 → 查看及下载结构化文档”。Campaign也完成目标协商、两类方案、修订确认、两组执行、去重和总报告交付。

本轮 **56项验收用例：50通过、5未通过、1部分完成**，包括54项预设用例和2项执行中新增检查。另有 **38文件/315项自动化断言全部通过**、全新隔离部署完整浏览器场景 **5/5通过**、弹窗回归 **8/8通过**。上述为不同计数层级，不相加计算通过率。

本轮不能给出“所有场景零缺陷”的结论。重核验后人数说明、存量诊断、Campaign列表加载、空名单重复汇报及覆盖率门槛仍未通过。原题20人场景完成了有界检索、核验及缺额交付，实际入选 **0/20**，未证明能交付满足全部特征的20人名单。

## 题目要求与证据

|要求|实际验证|主要证据|
|---|---|---|
|自然语言及混合条件|平台、粉丝、内容、身份排除、数量、预算、全员分析及交付方式均由实际聊天输入形成任务；原题混合条件亦执行|[业务输入与任务](evidence/business-workflows.json)|
|基础召回、逐人定性分析与标签化|开放搜索分析6位，含合格、不符、未知；逐人有内容方向、表达风格、理由和证据引用|[真实结果JSON](evidence/open-running-retry-45f6f2ff.json)、[实际模型调用](evidence/individual-model-audit.json)|
|结构化结果文档，含清单及匹配说明|HTML实际打开，CSV/JSON实际下载并逐项对照；Campaign总文档直接解释每位入选者|[结构核对](evidence/structured-validation.json)、[Campaign文档](evidence/campaign-final.html)|
|从Campaign目标交互确定不同类型范围|实际目标对话、类型理由、范围/配额、草案、v2修订、确认后启动、去重入选2人|[Campaign记录](evidence/business-workflows.json)、[总JSON](evidence/campaign-final.json)|
|原题20人全部特征正向交付|部分完成：解析、执行、视觉核验、未知处理和缺额文档已验证；本轮未找到20位全部符合者|[原题报告](evidence/original-20-final.html)|

## 环境与边界

真实业务使用实际浏览器访问公网HTTP入口 `http://101.201.237.219:33332/`，运行实际WaveSurge、配置模型 `gpt-6.1-sol`、生产worker、数据库、界面和导出。新业务经聊天UI发送，未注入候选或结果。API和有界只读数据库元数据用于交叉核对。

可重复的视觉、挑战、VNC、Cookie/localStorage使用隔离Docker环境：候选网页和Wave返回明确为夹具，模型、有头Chromium、noVNC输入、worker及持久化实际执行。最终完整5项使用全新项目 `creator-studio-r6c-20261015`。受控结果证明功能，不证明真实社交候选供给。

F26–F28将历史实际反例复制到隔离终态任务，在当前版本重新浏览器验证；未重新访问第三方页面。迟到响应测试仅延迟真实响应原文，不改内容。

未输入真实第三方私有登录凭据、未解决真实验证码。受控协助路径由自动化完成实际VNC操作，本轮无需用户手工操作。真实平台登录后的可访问性、全站穷尽召回和第三方持续可用性不在已验证结论内。

## 真实业务结果

|场景|实际结果|交付|
|---|---|---|
|开放Instagram跑步个人博主，1万–10万粉丝，目标2、分析上限8/基础40|相同输入独立重试：基础读取40，分析6，合格及入选2；`ivannavelilla` 50,327粉丝，`moa.inmotion` 12,465粉丝|1次最终报告；HTML/CSV/JSON|
|两组独立科技研究，每组分析2选1|每组2合格、1入选、缺额0；4条记录/2账号，备选保留|两项结束后1次综合交付|
|全部4条记录补生活场景标签|含备选及跨组同账号，4条全补；revision各+1，原资料/判断/入选/旧标签保留；0新Wave|两项结束后1次综合交付|
|Campaign新品认知，两类各1位|v2确认后各组分析2，最终去重入选2/2；valstechtalkk分配实用数码体验，tylerlcrawford分配生活效率工具|1次交付；总/子视图和导出一致|
|YouTube、TikTok、X各分析1|YT austinevans、TikTok juanescalonafilms各入选1；X geekyranjit缺少所要求使用/测评证据，unknown/0入选|三项结束后1次交付，保留X缺额|
|原题20人：geek穿搭、实际戴眼镜、欧美地区、白人明确文字资料、个人KOC、1万–10万粉丝|基础读取60、排除51、核验9、入选0、缺额20；记录3次核验/来源错误|partial终态；9条逐条件记录及缺额文档|
|TikTok粉丝1亿–2亿，目标1|有界资料中0候选、0核验、0入选，缺额1；条件保持|空文档及CSV表头保留|

开放跑步首次执行跨越客户端和宿主Docker重启，出现来源/模型HTTP500，最终核验8位、入选0。该失败尝试保留为 `research-eb184e9595b2be1679228e2c`；相同输入的独立重试为 `research-276be095bbb6b35445f6f2ff`。两次未混算为一次成功。

原题任务为 `research-18e3b644726f0b2b0d473730`。基础60和分析20是上限，实际进入核验9位。结果仍有地区、个人使用体验、穿搭或眼镜等未确认条件，族裔亦均未获得充分资料支持，不能称“除族裔外全部满足”。

真实业务记录 **248次Wave调用、92次应用模型调用**；其中verification请求41次，23次返回 `submit_judgments`，其余保留错误。计数包括首次失败尝试，受控测试及单独网关诊断不计入。详见[调用审计](evidence/call-audit.json)。实际Wave相对路径为：

```text
GET /instagram/v3/search_users
GET /instagram/v1/fetch_user_info_by_username_v2
GET /instagram/v1/fetch_user_posts
GET /instagram/v2/fetch_post_info
GET /discover/db?platform=...&limit=500&sort=fit_desc
```

具体参数和时序见审计。`queued/running`按本地任务状态解释。开放搜索及原题的检索词由Agent生成；指定账号的两组/Campaign用于检验全员分析、画像、配额与分配。

## 逐人打标与整批交付

实际标签体现内容差异。例如 `ivannavelilla` 得到“个人马拉松备赛与参赛复盘、跑者力量训练与伤病预防、跑步速度训练”和“第一人称真实复盘、自律励志、互动教学”；`moa.inmotion` 得到“个人跑步训练记录、半程马拉松参赛与伤后复出”等。跑步社群和采访账号保留实际画像及不符判断。

两组中的tylerlcrawford形成智能家居、电脑外设、场景与参数说明等画像；valstechtalkk形成手机拍摄设置、主题定制、数码配件、轻松互动等画像。4条补标再新增各自生活场景。数据保存在 `annotations.values/reason/evidenceIds` 和 `tags`，结果弹窗可查，不只是获取名单或复述筛选条件。

8个真实业务批次均仅有 **1条自动最终报告**，时间晚于该批全部工作的终态。多组、跨平台、补标和Campaign均未逐人发送最终报告。跨平台的登记答复曾包含已完成平台的人数，属于阶段状态回复。空名单场景另有模型终态答复，10ms后又发自动综合摘要，用户实际看到两次结果汇报，因此严格的“整批一次交付”用例D01未通过。进度查询跨越终态时准确答复“已结束”，未重开任务。[批次时序](evidence/business-workflows.json)、[重复汇报](evidence/delivery-message-audit.json)、[UI检查](evidence/supplemental-ui.json)可复核。

## 结构化文档专项验收

实际解析并比对 **14组HTML/CSV/JSON样例**。CSV当前27列，包括账号、基础数值、逐条件判断、证据映射、入选、画像、来源、分组、分配及待确认说明。计划初稿沿用25列，现版增加“待人工确认条件”“自动入选范围”，本轮完整保留并检查新增列。

- 研究HTML逐人展示资料、条件verdict/reason/evidenceIds、画像维度/状态/值/理由/引用、标签及入选状态。
- 综合文档保留4记录/2账号、两组来源；补标workItems按“条记录”计数。来源字段为taskId与reportContext。
- Campaign全量4条组内合格记录、2个合格账号；最终导出2条。总文档直接逐人解释，子报告、弹窗、CSV/JSON与最终分配一致。
- JSON布尔、数字、null、数组为原生类型；CSV判断/画像解析后与JSON一致。全部样例的判断及画像引用有效，无creator.raw调试载荷。
- 过滤空集仍有27列表头；JSON全量selected=1、导出records=0，HTML保持同一范围。
- 原题离线HTML 8,602,050字节，在无登录且阻断HTTP/HTTPS的新浏览器打开，9条记录、12张嵌入截图全部显示。

普通研究CSV在结果弹窗，综合CSV在最终聊天消息，Campaign总HTML有最终名单CSV入口。实际产物：[开放搜索](evidence/open-running-retry-45f6f2ff.html)、[综合研究](evidence/two-groups-combined.html)、[补标综合](evidence/all-annotation-combined.html)、[Campaign](evidence/campaign-final.html)、[原题](evidence/original-20-final.html)、[含截图离线HTML](evidence/original-20-final-offline.html)。在线文件中的 `/api/` 链接需原应用及登录会话。[逐项核对](evidence/structured-validation.json)、[离线验证](evidence/offline-check.json)保留机器结果。

## 回归与基础功能

F26数值引用287→1，原288条证据保留；F27默认精确标签不会把“不戴眼镜”命中为“戴眼镜”；F28初始及旧查询迟到均不覆盖最新结果和导出。F29–F32最终分配、合格/入选、来源/记录单位、总文档逐人解释均通过；**F33仍未通过**。

已验证图片对话、认证/退出、跨Origin及非法输入、留空Key保存、提示词下次生效并恢复、备份/非法拒绝/有效载入、执行中清空/载入、非空压缩、连续消息与实际执行中取消、消息ID幂等、1440/768/375布局、普通重启无重放。

受控真实有头视觉及VNC通过；新Cookie/localStorage连续3次正常desktop重启保留。SVG/中文/Not now/Escape邀请、真正阻塞转协助、危险提交拒绝、实际模型自主关闭邀请8项通过。[自动化摘要](evidence/automation-summary.json)明确各范围。

## 未通过项

|编号|级别|影响|证据|
|---|---|---|---|
|R6-02 / A05|高|存量debug超过60秒，随后健康检查超过12秒；普通app重启恢复，全局崩溃根因未确认|[运行观察](evidence/runtime-observation.json)|
|F33 / R33|中|重核验后统计1/1，卡片及源报告说明仍0/1；实际选择和导出正确|[卡片](screenshots/edge-reverify-source-card.png)、[记录](evidence/supplemental-ui.json)|
|R6-03 / C05|中|存在10个Campaign，3秒/30秒仍“暂无方案”，90秒采样出现10卡片；加载空态误导|[时序](evidence/campaign-loading.json)|
|R6-01 / T03|中，验证门槛|315断言通过，但两次coverage均退出1，未达到既有逐文件100%|[日志](evidence/coverage-node.log)|
|R6-04 / D01|低|空名单场景模型与自动摘要分别汇报同一终态结果，10ms内出现两条|[消息](evidence/delivery-message-audit.json)、[截图](screenshots/public-empty-source-chat.png)|

覆盖率实际为语句99.47%、分支98.34%、函数98.94%、行99.68%。本轮未降低门槛。复现步骤见[缺陷记录](findings.md)。

按已测页面分类规则，观察评分91/100，权重见[baseline](baseline.json)。它不是题目完成率、用例通过率或无障碍认证。已完成业务、补充UI及报告检查未记录未捕获页面脚本异常；预期401/403/400单列为边界验证。

## 完整性与资料留存

进程崩溃时部分驱动/容器执行中断，最终重新完成了全新隔离部署5项完整验收。已登记真实工作按任务ID继续核对；跑步独立重试明确保留。工具曾遇到链接名、旧字段名及下载等待不匹配，均针对已完成任务只读补齐。大离线HTML原30秒客户端超时，延长等待后真实点击成功，并离线打开；工具问题未计为产品缺陷。

原58任务、341结果、78历史版本、9方案、343消息、3设置、25工作批次、67交付的ID/内容哈希全部保持。新增真实测试记录保留供查看。测试项目关闭保留卷，主应用继续运行。[存量及版本证据](evidence/version-and-preservation.json)

- [方案](test-plan.md)、[用例与结果](test-cases.md)、[机器用例集](test-cases.json)
- [43张过程截图](screenshots.md)、[缺陷记录](findings.md)
- [证据目录](evidence/README.md)、[资料检查](evidence/artifact-check.json)、[文件哈希](manifest.json)

本轮可自动执行的已列用例均已执行。真实第三方登录、验证码及20人全特征供给未记为通过，没有遗留需用户手工完成才能补齐本轮已列用例的步骤。
