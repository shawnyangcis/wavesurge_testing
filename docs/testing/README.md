# 测试资料

本项目把测试计划、可重复用例和实际执行证据分别保留。最新补救与真实验证为 2026-10-13；原题 20 人交付仍未通过。

- [最新公网验收](public-acceptance-2026-10-13/report.md)：0/20根因、严格调整口径1/1、文字2/2、真实并发、最终发布与流程图。
- [最新测试方案](public-acceptance-2026-10-13/test-plan.md)：实际交付入口、真实 API、自然语言续聊、报告与 VNC。
- [历史报告](final-2026-10-11/report.md)：业务流程、题目功能点、专项回归与边界；开头含原题验收结论更正。
- [本轮方案](final-2026-10-11/test-plan.md)：范围、环境、数据来源和判断标准。
- [用例集](final-2026-10-11/test-cases.md)：步骤、预期和实际结论；同目录 JSON 可用于后续复测。
- [截图索引](final-2026-10-11/screenshots.md)：聊天、结果、Campaign、过滤及文档的实际浏览器画面。
- `final-2026-10-11/evidence/`：结构化断言摘要、实际报告样例与 CSV。
- [总体测试方案](../test-plan.md)、[R4 修复报告](../../reports/retest-r4-fixes-2026-10-10.md)：设计级策略及历史回归依据。

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
