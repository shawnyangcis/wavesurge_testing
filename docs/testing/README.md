# 测试资料

本项目把测试计划、可重复用例和实际执行证据分别保留。最新验证为 2026-10-15 浏览器登录弹窗自主处理，覆盖实际 Instagram、配置的模型、有头容器，以及指定公网地址的完整任务、续聊状态、报告和VNC。

- [浏览器弹窗自主处理与公网端到端验证](browser-popups-2026-10-15/report.md)：可关闭邀请自动处理、真实阻塞转人工，公网真实Wave资料→主页核验→结果交付、续聊和VNC，以及容器发布记录。

- [族裔资料核对修复验证](ethnicity-review-2026-10-13/report.md)：明确文字资料来源、新规则与真实公网开放搜索、候选交付及回归。
- [本轮测试方案](ethnicity-review-2026-10-13/test-plan.md)：固定输入、判定规则和验证范围。
- [公网多场景验收](public-scenarios-2026-10-13/report.md)：Agent自行生成关键词、不同主题条件、实际入选与逐人依据、持续对话和下载。
- [最新测试方案](public-scenarios-2026-10-13/test-plan.md)：场景范围、执行前固定的输入和公网端到端断言。
- [发布验证资料](public-acceptance-2026-10-13/report.md)：按版本保存的源码、存量数据、接口和浏览器记录。
- [阶段资料](final-2026-10-11/report.md)：对应日期的测试方案、用例和机器记录。
- [本轮方案](final-2026-10-11/test-plan.md)：范围、环境、数据来源和判断标准。
- [用例集](final-2026-10-11/test-cases.md)：步骤、预期和实际结论；同目录 JSON 可用于后续复测。
- [截图索引](final-2026-10-11/screenshots.md)：聊天、结果、Campaign、过滤及文档的实际浏览器画面。
- `final-2026-10-11/evidence/`：结构化断言摘要、实际报告样例与 CSV。
- [总体测试方案](../test-plan.md)、[R4 修复报告](../../dev-reports/retest-r4-fixes-2026-10-10.md)：设计级策略及历史回归依据。

## 自动化验证

```sh
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm e2e
```

完整 `e2e` 使用真实配置模型、明确受控的 Wave 返回和候选网页；包含人工桌面及浏览器持久恢复用例。真实 Wave 数据研究另行记录，不以受控数据证明真实候选供给。

## 重跑本轮非人工浏览器场景

需要 Docker、已填写的 `.env` 与 Playwright Chromium。使用独立项目、独立端口和全新数据卷：

```sh
export QA_PROJECT=creator-studio-final-check
export QA_APP_PORT=3650
export STUDIO_URL=http://127.0.0.1:3650
export QA_VALIDATION_ROOT=validation/final-check
export QA_REPORT_DIR=validation/final-check/browser-report
mkdir -p "$QA_VALIDATION_ROOT"
docker compose -p "$QA_PROJECT" -f compose.yaml -f tests/fixtures/qa-compose.yaml up -d --build
pnpm exec playwright test --config playwright.acceptance.config.ts qa-fixes.spec.ts qa-advanced.spec.ts qa-instagram.spec.ts
docker compose -p "$QA_PROJECT" -f compose.yaml -f tests/fixtures/qa-compose.yaml down
```

这三条完整场景覆盖 Campaign 交互与去重、研究/逐人画像/整批交付/筛选/补标，以及 Instagram GET/分页/单帖/视觉证据。关闭容器不会删除卷；再次复测请换新项目名，确保新数据。若宿主 Docker 地址池已用完，需要为测试项目选择不冲突的网络子网。

真实服务场景与七项反例的本轮实际步骤保存在用例集，不通过上述夹具回归替代。密码与密钥不得进入公开附件；原始 trace 或内嵌追踪归档发布前需另外检查。
