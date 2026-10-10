# R4 已确认问题（执行中）

## F26 / P2：粉丝数判断引用了与数值无关的全部 Wave 来源

真实指定账号任务 `research-294320f8d1c060255d3310e8`，Tyler/Val 的粉丝事实分别只有一条本人 profile 引用，但 `__followers.evidenceIds` 分别有75/49条，包括普通帖子、照片资源、仅写“视频封面资源；不能当作照片帖”的素材。这些内容不能证明粉丝数。数值和资格判断正确，问题是引用不精确。

复现：通过Chat请求这两位→等待两位均完成→打开Chat综合报告→查看粉丝范围的依据列；继续点帖子/视频封面来源。两个账号均出现同类错误。375px移动报告中该行高度分别8827.5px和5863.5px，来源时间反复换行，严重拉长关键判断阅读。

根因：`src/server/verdict.ts:23–24` 把全部非 headed-chromium 的证据无条件拼到粉丝数判断。已有精确 `facts.followers.evidenceIds` 未用于限制其它来源。建议只保留能证明对应粉丝字段的本人 profile/API 数值来源和经验证的数值观察；将完整素材留在完整证据区。

证据：`follower-reference-audit.json`、`exact-two-results.json`、`exact-two-batch-report.html`、`exact-layout.json`，截图 `screenshots/exact-layout-375.png`。这是本轮新发现，是否为新增回归以 `prior-follower-references.txt` 的旧部署源码核对为准。

其余场景仍在执行，不提前下整体结论。
