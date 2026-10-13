# 文档索引

先看 [项目 README](../README.md) 获取启动和使用方式，再按下表查阅设计与验证资料。最新结论见 2026-10-13 族裔资料核对修复验证报告，按实际输入条件和交付结果逐项复核。

| 类别 | 文档 | 内容 |
|---|---|---|
| 当前设计 | [架构与 Agent 设计](architecture.md) | 模块职责、上下文、条件/画像、预算、配额、读视图和恢复 |
| 初始设计 | [实施方案](implementation-plan.md) | 设计取舍、分阶段实现与验证门槛 |
| 桌面设计 | [容器 Computer Use](container-computer-use.md) | 有头 Chromium、图形容器、观察与接管协议 |
| 接口参考 | [API](api.md)、[Guide](guide.md)、[Skill](SKILL.md) | WaveSurge 原始资料与接口；根目录副本同步保留 |
| 测试总方案 | [测试方案](test-plan.md) | 分层策略和历史回归要求 |
| 最新修复验证 | [族裔资料核对与候选交付](testing/ethnicity-review-2026-10-13/report.md) | 可靠文字记录、待人工确认项、真实公网自然语言场景及回归 |
| 公网多场景验证 | [公网多场景验收](testing/public-scenarios-2026-10-13/report.md) | 不指定账号和搜索词的自然语言研究、真实API、运行中续聊、逐人依据与实际下载 |
| 发布验证资料 | [发布资料入口](testing/public-acceptance-2026-10-13/report.md) | 按版本保存的源码、存量数据、接口与浏览器验证记录 |
| 最终测试 | [测试目录](testing/README.md) | 本轮方案、用例、报告、截图及结构化证据 |
| R4 修复 | [修复报告](../dev-reports/retest-r4-fixes-2026-10-10.md) | 统计、来源、分配、匹配说明、引用和并发的修复依据 |
| 历史阶段 | [历史实现报告](../dev-reports/creator-studio-delivery-2026-10-10.md) | 初次交付记录；后续版本以最终报告为准 |

源代码测试位于 `tests/`。阶段公开材料在 `validation/2026-10-10/`，原始本机 QA 工作材料在 `.gstack/qa-reports/`。私有数据库、密码、配置、追踪归档和临时运行输出不作为提交证据；最新整理证据位于 `docs/testing/ethnicity-review-2026-10-13/`，阶段证据按日期保存在 `docs/testing/`。
