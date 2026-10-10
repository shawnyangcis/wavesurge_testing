# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: campaign-refresh.spec.ts >> Campaign弹窗在后台完成后保留旧的分组数量
- Location: .gstack/qa-reports/full-e2e-2026-10-10/cases/campaign-refresh.spec.ts:5:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Campaign 方案' }).locator('.campaign-detail').getByRole('heading', { name: '受控刷新类型1 1791598453510 · 0/1', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('dialog', { name: 'Campaign 方案' }).locator('.campaign-detail').getByRole('heading', { name: '受控刷新类型1 1791598453510 · 0/1', exact: true }) with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Campaign 方案' }).locator('.campaign-detail').getByRole('heading', { name: '受控刷新类型1 1791598453510 · 0/1', exact: true })

```

```yaml
- banner:
  - link "Creator Studio创作者研究":
    - /url: /
  - button "Campaign 方案"
  - button "浏览器桌面"
  - button "设置与记录"
  - button "退出"
- main:
  - region "研究对话":
    - text: WORKSPACE / 01 准备就绪
    - article:
      - text: 你
      - paragraph: 这是一轮聊天集成验证 1791595781730。请先调用 get_tasks 工具，再说明当前真实任务状态；不要启动筛选任务。
    - article:
      - text: 你
      - paragraph: 补充 1791595781730：仍只验证对话，请保留原来的请求。
    - article:
      - text: 你
      - paragraph: 最新补充 1791595781730：请说明你已收到这些补充，不要编造任务进度。
    - article:
      - text: 研究助手
      - paragraph: 已收到这两条补充（验证标识：1791595781730），并保留原来的请求：仅验证对话，不启动筛选任务。
      - paragraph:
        - text: 刚才调用
        - code: get_tasks
        - text: 返回空列表，未发现任务；没有可报告的任务进度，也未启动任何筛选任务。
    - article:
      - text: 你
      - paragraph: 图片验证 1791595781730：请只描述图中左右两半的颜色，不要执行筛选任务。
      - img "参考图片 1"
    - article:
      - text: 研究助手
      - paragraph: 图中左半边是绿色，右半边是蓝色。
    - article:
      - text: 你
      - paragraph: 这是一轮聊天集成验证 1791595781730。请先调用 get_tasks 工具，再说明当前真实任务状态；不要启动筛选任务。
    - article:
      - text: 你
      - paragraph: 补充 1791595781730：仍只验证对话，请保留原来的请求。
    - article:
      - text: 你
      - paragraph: 最新补充 1791595781730：请说明你已收到这些补充，不要编造任务进度。
    - article:
      - text: 研究助手
      - paragraph: 已收到这两条补充（验证标识：1791595781730），并保留原来的请求：仅验证对话，不启动筛选任务。
      - paragraph:
        - text: 刚才调用
        - code: get_tasks
        - text: 返回空列表，未发现任务；没有可报告的任务进度，也未启动任何筛选任务。
    - article:
      - text: 你
      - paragraph: 图片验证 1791595781730：请只描述图中左右两半的颜色，不要执行筛选任务。
      - img "参考图片 1"
    - article:
      - text: 研究助手
      - paragraph: 图中左半边是绿色，右半边是蓝色。
    - article:
      - text: 你
      - paragraph: 这是另一个独立 Campaign：我们有一个 AI 笔记应用，希望大学生在课堂整理和考试复习时试用。不沿用降噪耳机的范围，先与我交互澄清必要筛选范围，暂时不要启动任何研究。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 明白，这是一个
        - strong: 独立的 AI 笔记应用 Campaign
        - text: ，不沿用降噪耳机的筛选范围；现在只澄清需求，
        - strong: 不启动任何研究
        - text: 。
      - paragraph: 请先确认以下 4 项，尚未决定的可以写“希望你建议”：
      - list:
        - listitem:
          - strong: 产品与试用方式
          - text: ：应用的核心功能是什么（如课堂录音转写、笔记整理、生成复习题）？支持哪些语言和设备？学生如何试用，是否有免费额度？
        - listitem:
          - strong: 目标学生与地区
          - text: ：主要面向哪些国家或地区、使用什么语言的大学生？是否限定专业或本科／研究生？Creator 所在地是否也有限制？
        - listitem:
          - strong: 推广平台与效果目标
          - text: ：希望在哪些平台推广？主要衡量注册试用、首次完成课堂笔记、复习功能使用，还是付费转化？
        - listitem:
          - strong: Creator 筛选规模与限制
          - text: ：希望最终筛选多少人、粉丝量范围是多少？是否要求在校大学生身份，以及有哪些必选条件、排除项或偏好？
      - paragraph:
        - text: 确认后，我会提出
        - strong: 2–4 类 Creator 的分组方案与人数配额
        - text: ，供你审核；未经你同意，不会启动搜索。
    - article:
      - text: 你
      - paragraph: 补充确认：英文内容，Creator 所在国家 United States/United Kingdom，YouTube 或 TikTok，粉丝1万至10万，共需2位。请你建议2个互补类型，各需1位，各最多核验2个返回候选；依据公开的文字内容，不推断真实学生身份。请生成与 AI 笔记课堂/复习用途相符的理由和条件，保存标题“AI笔记 Campaign 目标验证 1791595810421”的草案，现在不要启动。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已保存草案，
        - strong: 未启动任何研究
        - text: ，也未沿用降噪耳机的范围。
      - paragraph:
        - strong: 标题：
        - text: AI笔记 Campaign 目标验证 1791595810421
        - strong: 编号：
        - code: campaign-8f13b35c19a3900255279d81
        - strong: 版本：
        - text: "1"
      - heading "共同筛选范围" [level=3]
      - list:
        - listitem:
          - strong: 内容语言：
          - text: 英文
        - listitem:
          - strong: Creator 所在国家：
          - text: United States / United Kingdom，以公开文字资料为依据
        - listitem:
          - strong: 平台：
          - text: YouTube 或 TikTok
        - listitem:
          - strong: 粉丝量：
          - text: 1万–10万
        - listitem:
          - strong: 目标：
          - text: 共2位，每类1位；每类最多核验2个返回候选，总候选预算4个
        - listitem:
          - strong: 证据原则：
          - text: 依据公开文字内容，不从外貌或学习主题推断真实学生身份；缺少必选条件证据时标为待核实，不计入合格人数。同一平台账号不能重复占两个类型名额。
      - heading "两个互补类型" [level=3]
      - paragraph:
        - text: "| 类型 | 与 AI 笔记用途相符的理由 | 类型必选条件 | 偏好 | |---|---|---|---| |"
        - strong: 课堂笔记与学习工具教程型
        - text: "| 展示课堂记录、笔记结构化与学习工具工作流程，帮助大学生理解应用在课堂整理阶段的价值。 | 公开文字内容包含面向大学学习场景的课堂笔记记录、课堂信息整理或课程笔记结构化教程。 | 有学习工具教程或笔记工作流程讲解。 | |"
        - strong: 考试复习与学习策略型
        - text: "| 把课堂笔记连接到复习提纲、知识回顾和自测，补充备考阶段的试用场景。 | 公开文字内容包含大学课程或考试复习策略，并涉及利用课程笔记制作复习提纲、知识回顾或自测材料。 | 有可操作的复习步骤、主动回忆或自测方法讲解。 |"
      - paragraph:
        - text: 两类分别覆盖“
        - strong: 课堂整理 → 考试复习
        - text: ”，不要求 Creator 本人是在校大学生。草案保留待审核，当前不会启动搜索。
    - article:
      - text: 你
      - paragraph: 界面验证 1791595857237 第一条：只回复收到，不启动任务。
    - article:
      - text: 你
      - paragraph: 界面验证 1791595857237 第二条：只补充对话，不取消任务。
    - article:
      - text: 你
      - paragraph: 界面验证 1791595857237 第三条：只回复已收到三条消息。
    - article:
      - text: 研究助手
      - paragraph: 已收到三条消息。
    - article:
      - text: 你
      - paragraph: 现在请另外启动一项独立免费研究，标题“Review独立文字队列 block-1791596318201”。找1位 Instagram 的科技内容创作者，创作者所在地 United States，粉丝1万至10万，最多1个候选；分享科技内容是必选文字条件，没有视觉条件，不要求邮箱。立即开始这项研究，不要改变或取消任何已有任务，也不做外联。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已创建独立免费研究
        - strong: “Review独立文字队列 block-1791596318201”
        - text: ，当前已进入队列，等待提交搜索。
      - list:
        - listitem: Instagram 科技内容创作者，所在地 United States
        - listitem:
          - text: 粉丝
          - strong: 1万–10万
        - listitem:
          - text: 目标
          - strong: 1位
          - text: ，最多核验
          - strong: 1个候选
        - listitem: 必选条件：公开文字内容证明其分享科技内容
        - listitem: 无视觉条件，不要求邮箱，不做外联
      - paragraph: 未改变或取消任何已有任务。
    - article:
      - text: 你
      - paragraph: 请取消任务“浏览器人工协助验收 block-1791596318201”（编号 research-6f0c55a71fef68d5fc3704f1），我不处理这次人工协助。保持独立任务“Review独立文字队列 block-1791596318201”继续执行，不要重新提交或另建任何研究。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已取消指定任务
        - code: research-6f0c55a71fef68d5fc3704f1
        - text: ，停止本地核验，不再等待你处理这次人工协助。远端搜索的取消无法保证。
      - paragraph:
        - text: 独立任务
        - strong: “Review独立文字队列 block-1791596318201”
        - text: 仍在执行：搜索已提交，正在等待候选返回。
      - paragraph: 没有重新提交或另建研究，也未取消其他任务。
    - article:
      - text: 你
      - paragraph: 请停止“Review独立文字队列 block-1791596318201”（编号 research-fd5a68a36f43604907a7d9fb）的本地研究，不要另建研究。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已停止
        - strong: “Review独立文字队列 block-1791596318201”
        - text: （
        - code: research-fd5a68a36f43604907a7d9fb
        - text: ）的本地研究，未另建研究。
      - paragraph: 远端搜索可能仍继续，无法保证同步取消。
    - article:
      - text: 你
      - paragraph: 现在请另外启动一项独立免费研究，标题“Review独立文字队列 block-1791596516838”。找1位 Instagram 的科技内容创作者，创作者所在地 United States，粉丝1万至10万，最多1个候选；分享科技内容是必选文字条件，没有视觉条件，不要求邮箱。立即开始这项研究，不要改变或取消任何已有任务，也不做外联。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已创建独立免费研究
        - strong: “Review独立文字队列 block-1791596516838”
        - text: ，当前已进入队列，等待提交搜索。
      - list:
        - listitem:
          - strong: 任务编号：
          - code: research-eec15e9fea76882b8f4a22de
        - listitem:
          - strong: 范围：
          - text: Instagram，Creator 所在地 United States，粉丝1万–10万
        - listitem:
          - strong: 目标：
          - text: 1位，最多核验1个候选
        - listitem:
          - strong: 必选条件：
          - text: 公开文字内容证明其分享科技内容
        - listitem: 无视觉条件，不要求邮箱，不做外联
      - paragraph: 未改变或取消任何已有任务。
    - article:
      - text: 你
      - paragraph: 请取消任务“浏览器人工协助验收 block-1791596516838”（编号 research-5ecc501dbf9d49fa1bd21ed2），我不处理这次人工协助。保持独立任务“Review独立文字队列 block-1791596516838”继续执行，不要重新提交或另建任何研究。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已取消
        - strong: “浏览器人工协助验收 block-1791596516838”
        - text: （
        - code: research-5ecc501dbf9d49fa1bd21ed2
        - text: ）的本地核验，不再等待你处理此次人工协助。远端搜索无法保证同步取消。
      - paragraph:
        - text: 独立任务
        - strong: “Review独立文字队列 block-1791596516838”
        - text: 保持执行，最新状态为：搜索已提交，等待候选返回。
      - paragraph: 未重新提交或另建研究，也未取消其他任务。
    - article:
      - text: 你
      - paragraph: 请停止“Review独立文字队列 block-1791596516838”（编号 research-eec15e9fea76882b8f4a22de）的本地研究，不要另建研究。
    - article:
      - text: 研究助手
      - paragraph:
        - text: 已停止
        - strong: “Review独立文字队列 block-1791596516838”
        - text: （
        - code: research-eec15e9fea76882b8f4a22de
        - text: ）的本地研究，未另建研究。
      - paragraph: 远端搜索可能仍继续，无法保证同步取消。
    - text: 发送消息
    - textbox "发送消息":
      - /placeholder: 描述你的想法，或继续补充要求…
    - text: 添加图片 任务执行期间，你也可以继续发消息。
    - button "发送消息" [disabled]: 发送 ↗
  - complementary:
    - text: RESEARCH DESK
    - heading "研究进展" [level=2]
    - article:
      - text: 已完成
      - heading "浏览器人工协助验收 browser-1791595925169" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "浏览器人工协助验收 browser-1791596090106" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "测试类型 A" [level=3]
      - paragraph: 已核验 2 · 已合格 2 / 1
      - text: 已合格 2/1，已核验 2；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "测试类型 B" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 部分完成
      - heading "浏览器人工协助验收 skip-1791596254229" [level=3]
      - paragraph: 已核验 1 · 已合格 0 / 1
      - text: 已合格 0/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已取消
      - heading "浏览器人工协助验收 block-1791596318201" [level=3]
      - paragraph: 已核验 0 · 已合格 0 / 1
      - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
      - button "查看结果"
    - article:
      - text: 已取消
      - heading "Review独立文字队列 block-1791596318201" [level=3]
      - paragraph: 已核验 0 · 已合格 0 / 1
      - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
      - button "查看结果"
    - article:
      - text: 已取消
      - heading "浏览器人工协助验收 block-1791596516838" [level=3]
      - paragraph: 已核验 0 · 已合格 0 / 1
      - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
      - button "查看结果"
    - article:
      - text: 已取消
      - heading "Review独立文字队列 block-1791596516838" [level=3]
      - paragraph: 已核验 0 · 已合格 0 / 1
      - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "同主页身份夹具" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "同主页身份夹具" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 部分完成
      - heading "Review真实Instagram候选重放 1791596615480" [level=3]
      - paragraph: 已核验 1 · 已合格 0 / 1
      - text: 已合格 0/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "受控刷新类型1 1791598453510" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - article:
      - text: 已完成
      - heading "受控刷新类型2 1791598453510" [level=3]
      - paragraph: 已核验 1 · 已合格 1 / 1
      - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
      - button "查看结果"
    - text: 有依据的选择
    - paragraph: 每位创作者的判断都会保留来源；信息不足时，会明确告诉你。
- dialog "Campaign 方案":
  - text: CAMPAIGN / STRATEGY
  - heading "Campaign 方案" [level=2]
  - button "关闭"
  - paragraph: 在对话中描述产品、受众和目标，助手会与你共同确定创作者类型、范围和配额。
  - article:
    - text: 待确认方案
    - heading "AI笔记 Campaign 目标验证 1791595810421 · v1" [level=3]
    - paragraph: 让大学生在课堂整理和考试复习时试用 AI 笔记应用；本草案仅规划创作者筛选，不启动研究。
    - paragraph: 去重入选 0/2
    - button "查看方案与配额"
  - article:
    - text: 配额已满足
    - heading "Campaign 去重集成夹具 dedup-1791596203649 · v1" [level=3]
    - paragraph: 控制性测试：两个类型各需一个账号；同一账号不能同时占两个配额
    - paragraph: 去重入选 2/2
    - button "查看方案与配额"
  - article:
    - text: 配额已满足
    - heading "Review同主页重复计数 1791596603205 · v1" [level=3]
    - paragraph: "Controlled test: two groups require two distinct accounts; both raw records identify one canonical profile."
    - paragraph: 去重入选 2/2
    - button "查看方案与配额"
  - article:
    - text: 配额已满足
    - heading "受控Campaign刷新核验 1791598453510 · v1" [level=3]
    - paragraph: Controlled fixture for checking asynchronous UI refresh, no actual creator filtering or search
    - paragraph: 去重入选 2/2
    - button "查看方案与配额"
  - heading "受控Campaign刷新核验 1791598453510 · v1" [level=3]
  - paragraph: 受众：UI test
  - paragraph: 同一平台账号只占一个类型配额；没有可靠跨平台身份时不猜测合并。
  - article:
    - heading "受控刷新类型1 1791598453510 · 1/1" [level=3]
    - paragraph: 受控基础条件夹具，没有真实账号或定性核验
    - paragraph: instagram · 地区不限 · 10000–100000 粉丝
    - paragraph: 候选上限 1 · 合格账号池 1
    - list
    - link "查看此类核验报告":
      - /url: /api/reports/research-e7833f397a7dab75727400ba
  - article:
    - heading "受控刷新类型2 1791598453510 · 1/1" [level=3]
    - paragraph: 受控基础条件夹具，没有真实账号或定性核验
    - paragraph: instagram · 地区不限 · 10000–100000 粉丝
    - paragraph: 候选上限 1 · 合格账号池 1
    - list
    - link "查看此类核验报告":
      - /url: /api/reports/research-023a5e7c88149c5f778d9f57
  - paragraph:
    - link "查看去重汇总报告":
      - /url: /api/campaigns/campaign-3e183daf0af8c427c0dc950d/report
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { execFileSync } from 'node:child_process';
  3  | import { writeFileSync } from 'node:fs';
  4  | test.use({ trace: 'off' });
  5  | test('Campaign弹窗在后台完成后保留旧的分组数量', async ({ page }) => {
  6  |   test.setTimeout(140000);
  7  |   const root = '.gstack/qa-reports/full-e2e-2026-10-10';
  8  |   const docker = (...args: string[]) => execFileSync('docker', ['compose', '-p', 'creator-studio-review-e2e', '-f', 'compose.yaml', '-f', root + '/compose.override.yaml', ...args], { encoding: 'utf8' });
  9  |   const password = docker('exec', '-T', 'app', 'cat', '/app/data/admin-bootstrap.txt').trim();
  10 |   await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button', { name: /进入工作室/ }).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  11 |   docker('cp', root + '/seed-stale-plan.ts', 'app:/app/data/fixtures/seed-stale-plan.ts');
  12 |   const seed = JSON.parse(docker('exec', '-T', 'app', 'node', 'data/fixtures/seed-stale-plan.ts', String(Date.now())));
  13 |   const get = async () => (await page.request.get('/api/campaigns/' + seed.id)).json();
  14 |   const before = await get(); expect(before.matched).toBe(0);
  15 |   await page.getByRole('button', { name: 'Campaign 方案', exact: true }).click(); const dialog = page.getByRole('dialog', { name: 'Campaign 方案' });
  16 |   const card = dialog.locator('article.task').filter({ has: page.getByRole('heading', { name: seed.title + ' · v1', exact: true }) });
  17 |   await card.getByRole('button', { name: '查看方案与配额' }).click();
  18 |   const detail = dialog.locator('.campaign-detail'); await expect(detail.getByRole('heading', { name: before.groups[0].spec.title + ' · 0/1', exact: true })).toBeVisible();
  19 |   await dialog.screenshot({ path: root + '/screenshots/campaign-refresh-before.png' });
  20 |   await expect.poll(async () => (await get()).status, { timeout: 100000 }).toBe('completed');
  21 |   await expect(card).toContainText('去重入选 2/2', { timeout: 10000 });
  22 |   const after = await get(); const staleDetail = await detail.innerText();
> 23 |   await expect(detail.getByRole('heading', { name: before.groups[0].spec.title + ' · 0/1', exact: true })).toBeVisible();
     |                                                                                                            ^ Error: expect(locator).toBeVisible() failed
  24 |   await dialog.screenshot({ path: root + '/screenshots/campaign-refresh-stale.png' });
  25 |   await card.getByRole('button', { name: '查看方案与配额' }).click();
  26 |   await expect(detail.getByRole('heading', { name: before.groups[0].spec.title + ' · 1/1', exact: true })).toBeVisible();
  27 |   const reopenedDetail = await detail.innerText(); await dialog.screenshot({ path: root + '/screenshots/campaign-refresh-reopened.png' });
  28 |   writeFileSync(root + '/campaign-refresh.json', JSON.stringify({ seed, before, after, staleDetail, reopenedDetail, result: 'confirmed stale selected-detail snapshot while campaign card reflects completed 2/2', limitation: 'controlled basic-condition candidates, not actual social profiles or LLM semantic filtering' }, null, 2));
  29 | });
  30 | 
```