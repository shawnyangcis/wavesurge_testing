# 文档索引

先看 [项目 README](../README.md) 获取启动和使用方式，再按下表查阅设计与验证资料。提交前结论以 2026-10-11 的最终测试报告为准。

| 类别 | 文档 | 内容 |
|---|---|---|
| 当前设计 | [架构与 Agent 设计](architecture.md) | 模块职责、上下文、条件/画像、预算、配额、读视图和恢复 |
| 初始设计 | [实施方案](implementation-plan.md) | 设计取舍、分阶段实现与验证门槛 |
| 桌面设计 | [容器 Computer Use](container-computer-use.md) | 有头 Chromium、图形容器、观察与接管协议 |
| 接口参考 | [API](api.md)、[Guide](guide.md)、[Skill](SKILL.md) | WaveSurge 原始资料与接口；根目录副本同步保留 |
| 测试总方案 | [测试方案](test-plan.md) | 分层策略和历史回归要求 |
| 最终测试 | [测试目录](testing/README.md) | 本轮方案、用例、报告、截图及结构化证据 |
| R4 修复 | [修复报告](../reports/retest-r4-fixes-2026-10-10.md) | 统计、来源、分配、匹配说明、引用和并发的修复依据 |
| 历史阶段 | [历史实现报告](../reports/creator-studio-delivery-2026-10-10.md) | 初次交付记录；后续版本以最终报告为准 |

源代码测试位于 `tests/`。阶段公开材料在 `validation/2026-10-10/`，原始本机 QA 工作材料在 `.gstack/qa-reports/`。私有数据库、密码、配置、追踪归档和临时运行输出不作为提交证据；整理后的最终证据位于 `docs/testing/final-2026-10-11/`。
