# 阶段 5 验收：Campaign 目标到分组交付

目标交互与修订：真实模型从大学生降噪耳机目标追问范围，生成两类型，各 1 位；自然语言修订同一草案 v2，确认前没有子任务，确认后各 POST 一次，重复启动当前版本幂等。另一个 AI 笔记产品目标再次经过独立追问和不同用途条件规划，生成两类型草案，未发起任何外部搜索。

真实 WaveSurge 首轮两组 0/2：personaText 曾混入最终人数/预算和另一组去重名单，远端 shortfallReason 指出与 count=2 冲突；原报告保留。修正工具 schema 与上下文后，独立画像再搜索：technology and headphone reviewers / study and productivity creators。第二轮学习组取得 2 位，科技组 0 位。科技组远端报告筛选 423 个账号并遇到 TikHub Reels HTTP 400，说明 API count 是期望返回数，不能保证远端只尝试相同数量。本地 candidateBudget 确保本地核验上限。

真实逐人核验：scorpiorisingmedia 的实际帖子有 routines/planning/productivity 与 CEO Day 工作流依据；khushleenvirk 注册弹窗受阻，通过实际 noVNC 尝试关闭并交还，模型仍报告遮挡，保持 unknown。程序曾把“Philadelphia (Philly), United States”整串与国家比较而误判；用 UT 修正为读取明确国家部分，对同一原始来源和原 LLM 判断重新计算，保留完整修正前后记录。最终真实总报告 1/2，待核实账号不占配额。

跨组重叠：明确标注的受控候选 shared 属于 A/B、only-a 属于 A；真实配置模型和有头浏览器逐人核验 3 份分组结果，结果都含实际截图。增广配额分配把 shared 分给 B、only-a 分给 A，总报告唯一 2/2，引用正确分组 resultId，子任务没有任何 WaveSurge POST。首轮等待期间被真实 Instagram 人工请求占用桌面，因此 E2E 超时；处理原协助后，同一任务继续完成，复验通过，未另建搜索冒充原任务。

证据：stage-5-live-campaign-start.json、stage-5-real-shortfall-e2e.json、stage-5-independent-search-start.json、stage-5-live-campaign-completion.json、stage-5-country-recheck.json、stage-5-real-instagram-assistance.json、stage-5-dedup-e2e.json、stage-5-second-campaign-goal.json。

另保留夹具缺陷修正 stage-5-fixture-correction.md；误启动的两项免费研究已停止本地执行，不能声称已取消远端搜索，未计入成功验收。
