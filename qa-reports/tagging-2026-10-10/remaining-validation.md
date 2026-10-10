# 未完成与人工验收清单

日期：2026-10-10，Asia/Shanghai。本清单区分尚未完成的自动验证和必须真人参与的核验，不把远端排队算通过。

## 仍未完成，可以继续自动验证

| 场景 | 本地任务／方案 | 远端编号 | 最新记录 |
| --- | --- | --- | --- |
| TikTok男性、眼镜、粉丝范围及逐人内容／风格标签 | `research-ea8649d3fc1258c3d1017445`，部署3400 | `bf3be041-bdd9-4319-9b07-1ed40b8d7d6e` | 11:30，queued，0核验。请求候选20、目标2。 |
| AI笔记Campaign：大学学习／校园生活类 | `research-b936fbc06246aea943518299`，部署3400 | `a6df0b48-b6bd-4509-83e1-a137264b3ca6` | 11:30，queued，0核验。候选2、目标1。 |
| AI笔记Campaign：AI／效率工具实测类 | `research-e3aad23438e47a041a9d8b86`，部署3400 | `c95a9b44-17ba-4507-a684-565810537fca` | 11:30，queued，0核验。候选2、目标1。 |
| 原题20人，geek、眼镜、公开自述白人、普通KOC | `research-a183b9437d676713c0f2812f`，主部署3000 | `bd260f50-b76f-440c-9e47-a022a6697ac6` | 仍running，已有部分候选，但主应用0核验；本轮只重放其中1位，不代表20人完成。 |

Campaign编号：`campaign-f391361d37047756cfe3cd4f`，v1，两类各1人、各最多2个候选。自然聊天全文及真实请求见 [campaign-confirm.json](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/campaign-confirm.json)。

本轮真实调用：提交 `POST https://wavesurge.ai/api/v1/creator-search/requests`，轮询 `GET https://wavesurge.ai/api/v1/creator-search/requests/{远端编号}`。queued/running来自远端响应，HTTP200不等于任务完成。

远端结束后仍需验证：每个已核验候选的具体标签值、待确认维度及来源；与画像无关的必选条件没有被漏掉；Campaign同账号只占一个名额；未知／不合格不被计入配额；报告与CSV同保存记录一致；chat实际出现完成通知和文档入口。当前F14/F15及已有F01/F02/F10/F11/F13会影响这些环节，应先修复再回归。

这些不是必须交给用户手动跑的项目。已保存复验脚本，可继续实际浏览器验证，但本次不能给它们“全部通过”的结论。

## 真正需要你亲自参与的部分

1. **你自己的社媒登录、OTP或验证码。** 如果真实站点要求这些，需要你在“浏览器桌面／桌面协助”的同一浏览器完成，再交还Agent。不要把社媒密码发到聊天。本轮Instagram遮挡只是可关闭的注册引导，我已关闭并完成续接；没有完成任何真人账号登录。真实登录后的恢复／Cookie持久性仍需复核，尤其是此前已复现F12。
2. **主观标签的口径和准确率抽检。** 为geek风、KOC、内容类型等先约定可观察定义，人工独立标一批账号，再与AI结果比较。族裔仅使用本人公开自述，无证据为待确认，不能看照片补猜。本轮没有这样一个独立标注集，所以执行过模型调用并不证明判断准确率。

已结束任务可从“研究进展 → 查看结果 → 逐条件判断与证据 → 查看报告”复核。已有标签缺陷不能通过手工点击页面补齐，需要开发修复；人工验收不应替代这一步。

## 测试环境与继续验证

主部署3000保持运行。3400保留本轮自然对话和三个待完成搜索，应用会继续按原逻辑轮询；没有另外创建定时自动化。3300的两项受控重放已结束，数据卷保留，测试后停止。

独立3400环境的管理员密码可在项目目录读取（不要写入报告）：

```sh
docker compose -p creator-studio-review-clean-2 -f compose.yaml -f .gstack/qa-reports/full-e2e-2026-10-10/compose-clean.override.yaml exec -T app cat /app/data/admin-bootstrap.txt
```

继续查看3400的真实浏览器状态和结果，可运行：

```sh
PATH=/Users/shawn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node .gstack/qa-reports/tagging-2026-10-10/watch.mjs isolated
```

脚本等待最多15分钟，遇到人工协助或终态即记录；超时仍为未完成。不要把空报告、任务存在或HTTP200当作标签生成完成。

本轮汇总及缺陷证据见 [打标复验报告](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/tagging-review.md)。

最后核对：2026-10-10 11:30（上海时间），三项新TikTok搜索仍queued、0核验；原题仍running、远端返回1位但本地0核验。状态来源见[最终快照](/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/tagging-2026-10-10/final-status.json)。3300已停止且无未完成协助；主部署及3400保留运行。
