# Creator Studio

TypeScript 全栈创作者筛选助手：自然语言筛选、Campaign 类型规划、WaveSurge 原始数据查询、逐人有头浏览器核验、人工 noVNC 协助，以及有依据的结果与报告。

## 本机部署

需要 Docker Desktop。将 `.env.example` 复制为 `.env`，填写模型地址、Key、Model ID 和 WaveSurge Token。

```sh
docker compose up -d --build
```

打开 <http://localhost:3000>。首次随机管理员密码通过下列命令读取（不要将输出加入报告或仓库）：

```sh
docker compose exec -T app cat /app/data/admin-bootstrap.txt
```

模型代理若运行在本机，`.env` 可填写 `http://127.0.0.1:8317`，容器自动使用 `host.docker.internal`，补齐 `/v1/chat/completions`。Token/模型 Key 仅由后端持有。

只暴露本机 3000 端口。桌面容器不发布 VNC/内部 API 端口；随机内部凭据由一次性初始化服务生成。应用数据库、浏览器 profile、桌面凭据各自使用持久卷。

```sh
docker compose ps
docker compose restart app desktop
docker compose logs --tail=40 app desktop
```

`docker compose down` 保留数据；不要使用 `down -v`，除非明确希望删除所有历史、结果和登录状态。

## 使用

直接描述数量、平台、地区、粉丝范围和条件。助手会补充询问影响结果的缺失信息；已明确的研究会启动后台任务，Instagram 使用 GET 关键词搜索、账号详情、帖子分页与单帖详情；YouTube/TikTok/X 只读取现有 Creator 名单，不自动发起付费搜索。研究过程中继续发送消息，进度查询不会重新搜索或取消原任务。

也可以只描述 Campaign 的产品、目标受众和效果目标。助手与你交互形成不同 Creator 类型、理由、范围和配额，保存可修订草案；在「Campaign 方案」确认当前版本后开始。跨类型同一平台账号只占一个配额，总报告说明真实缺口，直接展示每位入选者的逐条件理由和实际画像。子报告、结果查询和 CSV 采用同一 Campaign 最终分配；独立研究的组内预选作为审计信息保留。

「查看结果」提供三态判断、标签查询、来源、截图、HTML 报告和 CSV。只有全部必选条件有依据地通过才算合格；候选不足或证据不足会显示部分完成/待核实，不保证任意搜索配额都能满足。

遇到登录或人工验证，在「浏览器桌面」认领协助，操作同一个有头浏览器。完成后停留在可核验的公开页面，再交还 Agent。密码、验证码不要发送到聊天。控制授权短期有效，续接先重新观察。

聊天中的用户消息、助手回复和自动报告均显示原消息时间，按浏览器本地时区使用 `YYYY-MM-DD HH:mm:ss` 格式。

「设置」可以修改模型及系统/主会话/逐人核验/压缩提示词，下一次调用生效。上下文备份、清空、载入和压缩不删除后台任务，不重放历史工具。默认提示词在启动时按原默认值精确匹配升级，保留用户定制内容。

## 开发和验证

Node 24、pnpm 11.25。

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec vitest run --coverage
pnpm exec playwright install chromium
pnpm e2e
```

Vitest 包含所有 `src/**/*.ts` 与 `.tsx`，逐文件 lines/branches 100%；statements/functions 同样要求 100%。入口、桌面服务与错误分支也在范围内，CSS/HTML/第三方依赖及测试夹具不参与运行覆盖率。

`pnpm e2e` 每次创建新的 Compose 项目和数据卷，验证新版 Instagram 全 GET 数据获取与真实图片核验、自然语言研究、Campaign 交互、持续消息、增量核验、标签写回、报告交付、筛选导出及三次浏览器状态重启恢复。使用 `.env` 中的真实模型；WaveSurge 响应和候选网页是明确标注的受控夹具。退出时仅移除本次临时容器与网络，保留卷；不修改主部署。需要 Docker Desktop，默认测试端口 3550/3551，可用 `QA_APP_PORT` / `QA_PERSISTENCE_PORT` 更改。

历史与外部回归使用 `pnpm e2e:historical`。历史结果用例通过 `RESEARCH_TASK_ID`、`CAMPAIGN_TASK_ID`、`REAL_CAMPAIGN_ID`、`RECOVERY_CAMPAIGN_ID`、`ASSISTANCE_TASK_ID` / `ASSISTANCE_CREATOR_ID` 指定对象，未提供时明确跳过。`research-start.spec.ts`、`campaign.spec.ts` 仅在 `LIVE_WAVESURGE=1` 时新建真实 WaveSurge 原始数据研究，不用于循环健康检查。受控登录验证不能等同于 Instagram、YouTube、TikTok 或 X 的真实账号登录成功。

研究完成或部分完成后，报告链接和真实人数自动进入对话。画像标注独立于筛选条件，只有有证据的实际标签值参与标签检索；可通过自然语言要求对已有候选补标或重新核验，不需要重新搜索。HTML 与 CSV 均使用当前已成功查询的筛选。HTML 保留研究整体统计、来源文字及可离线查看的截图；CSV 保留原 14 列并追加来源任务、分组、入选口径和 Campaign 分配信息，共 25 列。标签界面默认匹配完整标签值；可主动切换文字包含模式，页面会说明它可能命中否定标签。迟到请求不会覆盖新查询或导出范围。

同一次对话请求可以登记多个补标工作或多类型 Campaign：登记完并全部结束后仅交付一次综合报告，包含失败、取消和缺额；源研究结果仍实时更新。摘要明确区分合格候选与实际入选；多组报告逐条保留原研究和分组，分别统计记录数、去重平台账号人数及组内名额。纯补标保留原事实、筛选判断和入选集合，只有明确要求“重新核验”才更新这些结论。重启不会重新推送已交付的报告。

可以说“两个账号都分析，只选一人”，Agent 将分析范围与入选配额分开；指定 Instagram 账号使用精确身份读取。也可以明确说“只用现有文字资料，不打开浏览器”，文字研究在另一项任务等待人工桌面协助时仍可继续。其他平台读取现有名单的有界集合，先排除明确不符的基础条件，再由模型按本次需求选择核验对象；没有可靠来源覆盖时如实交付缺额。

人工操作桌面时仍可以下发多项已经明确的研究：助手会一次登记，文字任务先执行，需要网页的任务等交还桌面后继续，全部结束只发一份综合报告。明确要求“打开本人主页”或“重新核验”的工作会单独记录本轮主页访问；文字资料和旧截图不能替代新页面观察，打不开时如实保留未确认。只是允许使用浏览器的普通研究仍按实际证据需要选择动作。

清空或载入上下文时，已登记的后台工作继续执行并在当前对话交付；报告说明中断前实际登记的范围，不把尚未登记的口头计划说成已执行。Instagram 泛搜索先排除已知超出粉丝范围者，再获取帖子并占用逐人分析名额；基础资料读取上限单独记录。精确指定的账号名单仍全部分析。

设计与测试：[实施计划](docs/implementation-plan.md)、[测试方案](docs/test-plan.md)。实际阶段证据保存在 `validation/2026-10-10/`。

当前修复与验收：[QA 修复报告](reports/qa-fixes-2026-10-10.md)、[HTML 阅读版与完整执行图](reports/qa-fixes-2026-10-10.html)。初次交付记录保留在 [历史实现报告](reports/creator-studio-delivery-2026-10-10.md) 和 [阶段验收](validation/2026-10-10/stage-6-acceptance.md)。

R3 的根因、分阶段修复、真实 API 自测和验证边界见 [R3 修复报告](reports/retest-r3-fixes-2026-10-10.md)。

R4 的统计/归属/分配口径、逐人匹配说明、筛选并发及真实 API 回归见 [R4 修复报告](reports/retest-r4-fixes-2026-10-10.md) 与 [HTML 阅读版及执行图](reports/retest-r4-fixes-2026-10-10.html)。


WaveSurge 接口以 `docs/api.md`、`docs/guide.md`、`docs/SKILL.md`（2026-10-10 更新）为准。根目录三份副本已同步。Instagram `instagram.queries` 支持 1–5 个短关键词，`version` 可选 v1/v2/v3，默认 v3，不自动切换；每词最多 3 页，每人最多 2 页帖子（每页 12 条）和 2 条单帖详情。原始搜索未提供的粉丝、地区、联系方式保持未知，粉丝由账号详情补齐；图片 URL 必须经有头浏览器观察才能支持视觉条件。近期互动率按平均(赞+评论)/粉丝数计算，任一计数缺失则未知，报告及 CSV 保存样本数。旧异步任务保留 GET 状态恢复，新任务不再 POST `/creator-search/requests`。所有平台内付费搜索、策略或外联均不在当前工具授权范围内。
