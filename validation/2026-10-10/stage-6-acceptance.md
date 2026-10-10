# 最终交付验收

2026-10-10，本机 Docker Desktop。实际应用 http://localhost:3000，随机管理员密码保存在命名卷中，未加入报告。

## 代码门槛

- TypeScript typecheck：通过。
- UT：17 文件、93 用例通过。
- `src/**/*.{ts,tsx}` 全部 45 文件包含在覆盖统计中：44 个可执行文件逐文件 lines/branches/statements/functions 均 100%；`src/client/env.d.ts` 只有声明，无执行指标。
- 总计行 659/659、分支 913/913、语句 1467/1467、函数 363/363。
- 无业务覆盖 ignore 注释、无遗漏源码文件。源目录与 coverage-summary 文件集合逐项比对，证明不是只统计测试导入文件。
- 明细：stage-6-source-coverage-audit.md/json；原始 coverage-final/summary；完整可交互页面位于根目录 coverage/index.html；最终命令输出 stage-6-unit-coverage.txt。

## 集成和浏览器验收

| 流程 | 最终结果 | 证据 |
| --- | --- | --- |
| 登录/错误密码/未授权/连续消息/刷新/退出/app 重启 | 通过；每条消息恰好一条 | foundation E2E；stage-6-regression.txt / stage-6-layout-final.txt |
| 桌面/移动端布局与输入框可见 | 通过；任务区独立滚动；移动端无横向溢出且输入框在视口内 | stage-1-desktop/mobile.png；stage-6-layout-final.txt |
| 真模型工具调用、执行中三条消息、图片辨色 | 通过；实际 payload 与完整工具批次保留 | agent E2E；stage-2-live-model.json；stage-6-regression.txt |
| 主工作流热更新、压缩、备份、reset/load 不重放 | 通过 | agent E2E、调试与 checkpoint 记录 |
| 真 WaveSurge→独立 LLM→结果/标签/筛选/报告/CSV→app 重启 | 通过；真实 1/2 部分交付，不重复搜索 | research-completion E2E；stage-3-result-e2e.json；stage-6-recheck.txt |
| Campaign 目标追问、自然语言修订、确认当前版本 | 通过；确认前无搜索、之后各 POST 一次、重复启动幂等 | campaign E2E；stage-5-live-campaign-start.json |
| 另一个 AI 笔记产品目标 | 通过；独立追问与两类型草案，不启动搜索 | campaign-second-goal E2E；stage-5-second-campaign-goal.json |
| 真 Campaign 缺额与修订画像 | 通过；原始 0/2 保留；修订后真实 1/2 | campaign-completion / campaign-recovery / campaign-real-completion E2E；stage-5-live-campaign-completion.json |
| 跨组重叠候选的完整处理与总报告 | 通过；明确受控候选，真实模型/浏览器核验三份结果，唯一 2/2，引用正确组证据 | campaign-dedup E2E；stage-5-dedup-e2e.json / stage-5-dedup-recheck.txt |
| 只读 noVNC、接管互斥/租约/撤销 | 通过；真实 iframe/WebSocket；失效授权不能再发送桌面输入 | desktop-view E2E 与实际 WS/API UT |
| 实际 noVNC 手动验证→同一候选续接 | 通过；先确认控制 iframe，再真实点击；fresh screenshot→完成 | desktop-assistance E2E；stage-6-desktop-final.txt；stage-4-assistance-e2e.json |
| 人工无法解决→unknown，不循环求助 | 通过 | desktop-skip E2E；stage-4-human-skip.json |
| 真实 Instagram 登录/注册遮挡→人工尝试→诚实续接 | 通过；仍受阻则 unknown，没有声称登录成功 | real-instagram-assistance E2E；stage-5-real-instagram-assistance.json |
| profile 正常重启保留人工 Cookie/页面 | 通过 | desktop-persistence E2E；stage-4-profile-restart.json；stage-6-desktop-final.txt |
| 独立 Compose 名称、全新卷、随机密码、真实模型网络、内部桌面、重启 | 通过；桌面无宿主发布端口 | clean-deploy E2E；stage-6-clean-deploy.json / stage-6-clean-final.txt |

首轮最终回归 8 条流程中 6 条通过、2 条复验：重叠任务因真实 Instagram 原工作等待人工而超时，处理该协助后同一任务完成并通过复验；结果页 select 的 label 定位不匹配实际 DOM，改为准确 combobox 定位后通过复验。没有丢弃旧任务、新建替代搜索或把超时当作完成。原始失败和修正日志保留。

另修复了真实“城市, 国家”整串比较误判，UT 覆盖 Canada/United States 与明确城市国家；对同一实际 API/LLM 来源重新计算并保留前后数据。修复了首次候选误读上一页、共享桌面首次人工请求后的同 tick 让出、取消晚到人工结果不复活、截图 session 冷启动恢复、Viewer 同 URL 重新连接必须重建 iframe、Xvfb/Chromium 锁文件恢复。

## 可用性与实际边界

部署、聊天、直接筛选、Campaign、多组分配、逐人浏览器、人工协助、结果及调试可用。真实搜索可缺额，平台可要求登录；程序显示实际 partial/needs_input/unknown。当前真实修订 Campaign 1/2，受控重叠场景 2/2，不能混为同一真实发现结果。真实技术组返回 0，远端报告其上游 TikHub endpoint HTTP 400；没有编造替代名单。

候选预算是本地核验上限；API count 是期望返回数量，实测不能限制远端实际尝试的账号数。首版没有收费名单交付、邮箱解锁或外联，没有多租户桌面调度，也没有将聊天补图绑定历史候选后重新核验的专门入口。已有范围改动通过新草案/任务执行；原版本保留。

人工成功机制用明确受控网站验证，真实 Instagram 只验证公开访问、遮挡后的接管尝试及诚实续接；没有使用用户社交账号凭据。全部 TS 运行路径 100% 覆盖不等于第三方访问或 LLM 判断永远正确。

## 交付文件

README.md、.env.example、compose.yaml、Dockerfile、deploy/、完整 src/、tests/、实施/测试计划、交付报告（含简图和完整执行图）与 validation 证据。模型/WaveSurge 密钥只留 .env/后端配置。所有 test-results*、data、.env、coverage 和验证报告均不进入 Docker 构建上下文；运行镜像只复制 src 和 dist 等运行文件。

此前误启动的两项免费夹具研究已停止本地，远端可能继续，记录不作为成功验收。专门全新部署测试项目已删除自己的临时卷，主应用业务卷/profile 保留。最终服务健康与源码清单见 stage-6-compose-services.jsonl、stage-6-source-manifest.json。

最终交付核对：运行 app 镜像的 46 个源文件、desktop 的 4 个执行文件与工作区哈希一致（stage-6-container-source-match.json）；当前两个服务 healthy。最终 UI 检查确认桌面文档高度 900、输入框底部 872，任务区独立滚动、没有活动人工协助，真实 Campaign 仍为 1/2（stage-6-final-ui.json、stage-6-final-studio/campaigns.png）。该独立检查脚本首次使用相对 API URL 导致 Playwright request Invalid URL，改用绝对 URL 后复验通过，未修改业务代码。

最终 HTML 报告经 Chromium 渲染验证：简图图片正常、完整执行图存在且可切换 100% 缩放，390px 宽度无横向溢出、无页面脚本错误、无外部脚本依赖（stage-6-report-quality.json、stage-6-report-top/flow.png）。完整图已准确标明 API count 为期望返回数、Campaign 入选关系按保存的组结果计算。
