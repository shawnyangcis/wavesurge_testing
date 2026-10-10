# 阶段 4 当前状态

已实现独立 headed Chromium / Xvfb / noVNC 桌面容器、持久 profile、内部随机 token、受保护截图资产、逐人隔离模型工具循环与持久工作关联。人工接管先冻结/排空 Agent 动作，300 秒 Viewer grant / 15 分钟控制租约，每条 WebSocket 输入检查授权，释放后关闭旧控制连接并重新观察同一候选。

真实网页：新容器访问 Instagram imthegeekjr 主页成功，返回公开简介、79.6K 粉丝和 37 个链接，保存实际截图与 metadata。不能据此推断 Instagram 任意帖子或其它平台都可访问。

真实生产浏览器 + 实际配置模型 + 控制性候选夹具：模型调用 browser.observe → navigate → request_human_assistance；通过 noVNC 人工验证 → release → 新观察/截图 → submit_judgments → 保存 match，原 task/creator 不变。fixture 明确不是线上 Instagram，不将该人工验证等同于真实社交平台登录成功。首次 E2E 点击时机/坐标错误已保存失败，再对同一持久工作复测通过；最终测试 16.4s。

85 个单测、44 个执行源码文件全部行/分支 100%，同时 statements/functions 100%（651 行、874 分支）。新 Campaign 已包含在覆盖范围，但其真实生产 E2E 待后续验证。

尚未验收：桌面重启发现 X11 残留显示锁导致健康检查失败，已修改入口清理本容器显示 :99 的残留文件并补充退出清理；正在重跑 profile Cookie 保留。完成前不宣称阶段 4 全部通过。
