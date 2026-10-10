# 阶段 4 验收通过

有头 Chromium / Xvfb / noVNC 在独立 Docker 容器运行；app 和 desktop 健康，仅本机 3000 端口公开。随机内部 token、独立持久 profile/资产卷、受鉴权只读与控制入口、逐条 WebSocket 授权检查已实现。

- 真实 Instagram imthegeekjr 主页采集成功，公开资料/粉丝/实际链接与截图保存于 stage-4-instagram-public.*。不扩大解释为所有社交平台无阻塞。
- 实际配置模型与生产浏览器在明确标注的受控人工验证夹具上完成 observe→navigate→request_human_assistance→noVNC 人工操作→release→新观察与截图→submit_judgments→原候选 match。人工验证夹具不是真实 Instagram 登录。初次点击时机/坐标失败后沿用同一已持久工作复测通过。证据 stage-4-assistance-e2e.json、stage-4-human-*、stage-4-verified-post.png。
- 受保护 noVNC 页面、只读不授予控制，生产 Playwright 测试通过。
- 同一 profile 正常 Docker restart 后人工验证 Cookie 保留，公开帖子仍可访问，5.4 秒 E2E 通过；证据 stage-4-profile-restart.json。修复了 Xvfb 残留显示锁、跨容器 Chromium Singleton 锁阻止启动的问题，仅清理此单实例桌面已停止前代的进程锁，保留 profile 业务数据。
- 86 个 UT，44 个可执行源码文件逐文件 lines/branches 100%，statements/functions 同样 100%（652 行、876 分支）；类型检查通过。计数含已加入的 Campaign 源码，其真实生产流程另在阶段 5 验收。

范围：单用户 Docker Desktop 固定桌面，无 Docker socket 和额外云 VM 编排。Agent 通过 DOM 工具输入，最新一次性 observationId 守护；人工通过 VNC 指针/键盘操作同一图形桌面。首版不提供 LLM 任意桌面坐标/系统命令工具。查看权限 300 秒、控制租约 15 分钟，正常交还/到期撤销旧控制连接；任务取消不被人工释放复活。
