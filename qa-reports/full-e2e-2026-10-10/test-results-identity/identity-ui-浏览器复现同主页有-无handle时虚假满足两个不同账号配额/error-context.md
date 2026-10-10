# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: identity-ui.spec.ts >> 浏览器复现同主页有/无handle时虚假满足两个不同账号配额
- Location: .gstack/qa-reports/full-e2e-2026-10-10/cases/identity-ui.spec.ts:4:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "completed"
Received: "running"

Call Log:
- Test timeout of 30000ms exceeded
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "Creator Studio创作者研究" [ref=e5] [cursor=pointer]:
      - /url: /
    - generic [ref=e6]:
      - button "Campaign 方案" [ref=e7] [cursor=pointer]
      - button "浏览器桌面" [ref=e8] [cursor=pointer]
      - button "设置与记录" [ref=e9] [cursor=pointer]
      - button "退出" [ref=e10] [cursor=pointer]
  - main [ref=e11]:
    - region "研究对话" [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]: WORKSPACE / 01
        - generic [ref=e15]: 准备就绪
      - generic [ref=e16]:
        - article [ref=e17]:
          - text: 你
          - paragraph [ref=e19]: 这是一轮聊天集成验证 1791595781730。请先调用 get_tasks 工具，再说明当前真实任务状态；不要启动筛选任务。
        - article [ref=e20]:
          - text: 你
          - paragraph [ref=e22]: 补充 1791595781730：仍只验证对话，请保留原来的请求。
        - article [ref=e23]:
          - text: 你
          - paragraph [ref=e25]: 最新补充 1791595781730：请说明你已收到这些补充，不要编造任务进度。
        - article [ref=e26]:
          - text: 研究助手
          - generic [ref=e27]:
            - paragraph [ref=e28]: 已收到这两条补充（验证标识：1791595781730），并保留原来的请求：仅验证对话，不启动筛选任务。
            - paragraph [ref=e29]:
              - text: 刚才调用
              - code [ref=e30]: get_tasks
              - text: 返回空列表，未发现任务；没有可报告的任务进度，也未启动任何筛选任务。
        - article [ref=e31]:
          - text: 你
          - paragraph [ref=e33]: 图片验证 1791595781730：请只描述图中左右两半的颜色，不要执行筛选任务。
          - img "参考图片 1" [ref=e34]
        - article [ref=e35]:
          - text: 研究助手
          - paragraph [ref=e37]: 图中左半边是绿色，右半边是蓝色。
        - article [ref=e38]:
          - text: 你
          - paragraph [ref=e40]: 这是一轮聊天集成验证 1791595781730。请先调用 get_tasks 工具，再说明当前真实任务状态；不要启动筛选任务。
        - article [ref=e41]:
          - text: 你
          - paragraph [ref=e43]: 补充 1791595781730：仍只验证对话，请保留原来的请求。
        - article [ref=e44]:
          - text: 你
          - paragraph [ref=e46]: 最新补充 1791595781730：请说明你已收到这些补充，不要编造任务进度。
        - article [ref=e47]:
          - text: 研究助手
          - generic [ref=e48]:
            - paragraph [ref=e49]: 已收到这两条补充（验证标识：1791595781730），并保留原来的请求：仅验证对话，不启动筛选任务。
            - paragraph [ref=e50]:
              - text: 刚才调用
              - code [ref=e51]: get_tasks
              - text: 返回空列表，未发现任务；没有可报告的任务进度，也未启动任何筛选任务。
        - article [ref=e52]:
          - text: 你
          - paragraph [ref=e54]: 图片验证 1791595781730：请只描述图中左右两半的颜色，不要执行筛选任务。
          - img "参考图片 1" [ref=e55]
        - article [ref=e56]:
          - text: 研究助手
          - paragraph [ref=e58]: 图中左半边是绿色，右半边是蓝色。
        - article [ref=e59]:
          - text: 你
          - paragraph [ref=e61]: 这是另一个独立 Campaign：我们有一个 AI 笔记应用，希望大学生在课堂整理和考试复习时试用。不沿用降噪耳机的范围，先与我交互澄清必要筛选范围，暂时不要启动任何研究。
        - article [ref=e62]:
          - text: 研究助手
          - generic [ref=e63]:
            - paragraph [ref=e64]:
              - text: 明白，这是一个
              - strong [ref=e65]: 独立的 AI 笔记应用 Campaign
              - text: ，不沿用降噪耳机的筛选范围；现在只澄清需求，
              - strong [ref=e66]: 不启动任何研究
              - text: 。
            - paragraph [ref=e67]: 请先确认以下 4 项，尚未决定的可以写“希望你建议”：
            - list [ref=e68]:
              - listitem [ref=e69]:
                - strong [ref=e70]: 产品与试用方式
                - text: ：应用的核心功能是什么（如课堂录音转写、笔记整理、生成复习题）？支持哪些语言和设备？学生如何试用，是否有免费额度？
              - listitem [ref=e71]:
                - strong [ref=e72]: 目标学生与地区
                - text: ：主要面向哪些国家或地区、使用什么语言的大学生？是否限定专业或本科／研究生？Creator 所在地是否也有限制？
              - listitem [ref=e73]:
                - strong [ref=e74]: 推广平台与效果目标
                - text: ：希望在哪些平台推广？主要衡量注册试用、首次完成课堂笔记、复习功能使用，还是付费转化？
              - listitem [ref=e75]:
                - strong [ref=e76]: Creator 筛选规模与限制
                - text: ：希望最终筛选多少人、粉丝量范围是多少？是否要求在校大学生身份，以及有哪些必选条件、排除项或偏好？
            - paragraph [ref=e77]:
              - text: 确认后，我会提出
              - strong [ref=e78]: 2–4 类 Creator 的分组方案与人数配额
              - text: ，供你审核；未经你同意，不会启动搜索。
        - article [ref=e79]:
          - text: 你
          - paragraph [ref=e81]: 补充确认：英文内容，Creator 所在国家 United States/United Kingdom，YouTube 或 TikTok，粉丝1万至10万，共需2位。请你建议2个互补类型，各需1位，各最多核验2个返回候选；依据公开的文字内容，不推断真实学生身份。请生成与 AI 笔记课堂/复习用途相符的理由和条件，保存标题“AI笔记 Campaign 目标验证 1791595810421”的草案，现在不要启动。
        - article [ref=e82]:
          - text: 研究助手
          - generic [ref=e83]:
            - paragraph [ref=e84]:
              - text: 已保存草案，
              - strong [ref=e85]: 未启动任何研究
              - text: ，也未沿用降噪耳机的范围。
            - paragraph [ref=e86]:
              - strong [ref=e87]: 标题：
              - text: AI笔记 Campaign 目标验证 1791595810421
              - strong [ref=e88]: 编号：
              - code [ref=e89]: campaign-8f13b35c19a3900255279d81
              - strong [ref=e90]: 版本：
              - text: "1"
            - heading "共同筛选范围" [level=3] [ref=e91]
            - list [ref=e92]:
              - listitem [ref=e93]:
                - strong [ref=e94]: 内容语言：
                - text: 英文
              - listitem [ref=e95]:
                - strong [ref=e96]: Creator 所在国家：
                - text: United States / United Kingdom，以公开文字资料为依据
              - listitem [ref=e97]:
                - strong [ref=e98]: 平台：
                - text: YouTube 或 TikTok
              - listitem [ref=e99]:
                - strong [ref=e100]: 粉丝量：
                - text: 1万–10万
              - listitem [ref=e101]:
                - strong [ref=e102]: 目标：
                - text: 共2位，每类1位；每类最多核验2个返回候选，总候选预算4个
              - listitem [ref=e103]:
                - strong [ref=e104]: 证据原则：
                - text: 依据公开文字内容，不从外貌或学习主题推断真实学生身份；缺少必选条件证据时标为待核实，不计入合格人数。同一平台账号不能重复占两个类型名额。
            - heading "两个互补类型" [level=3] [ref=e105]
            - paragraph [ref=e106]:
              - text: "| 类型 | 与 AI 笔记用途相符的理由 | 类型必选条件 | 偏好 | |---|---|---|---| |"
              - strong [ref=e107]: 课堂笔记与学习工具教程型
              - text: "| 展示课堂记录、笔记结构化与学习工具工作流程，帮助大学生理解应用在课堂整理阶段的价值。 | 公开文字内容包含面向大学学习场景的课堂笔记记录、课堂信息整理或课程笔记结构化教程。 | 有学习工具教程或笔记工作流程讲解。 | |"
              - strong [ref=e108]: 考试复习与学习策略型
              - text: "| 把课堂笔记连接到复习提纲、知识回顾和自测，补充备考阶段的试用场景。 | 公开文字内容包含大学课程或考试复习策略，并涉及利用课程笔记制作复习提纲、知识回顾或自测材料。 | 有可操作的复习步骤、主动回忆或自测方法讲解。 |"
            - paragraph [ref=e109]:
              - text: 两类分别覆盖“
              - strong [ref=e110]: 课堂整理 → 考试复习
              - text: ”，不要求 Creator 本人是在校大学生。草案保留待审核，当前不会启动搜索。
        - article [ref=e111]:
          - text: 你
          - paragraph [ref=e113]: 界面验证 1791595857237 第一条：只回复收到，不启动任务。
        - article [ref=e114]:
          - text: 你
          - paragraph [ref=e116]: 界面验证 1791595857237 第二条：只补充对话，不取消任务。
        - article [ref=e117]:
          - text: 你
          - paragraph [ref=e119]: 界面验证 1791595857237 第三条：只回复已收到三条消息。
        - article [ref=e120]:
          - text: 研究助手
          - paragraph [ref=e122]: 已收到三条消息。
        - article [ref=e123]:
          - text: 你
          - paragraph [ref=e125]: 现在请另外启动一项独立免费研究，标题“Review独立文字队列 block-1791596318201”。找1位 Instagram 的科技内容创作者，创作者所在地 United States，粉丝1万至10万，最多1个候选；分享科技内容是必选文字条件，没有视觉条件，不要求邮箱。立即开始这项研究，不要改变或取消任何已有任务，也不做外联。
        - article [ref=e126]:
          - text: 研究助手
          - generic [ref=e127]:
            - paragraph [ref=e128]:
              - text: 已创建独立免费研究
              - strong [ref=e129]: “Review独立文字队列 block-1791596318201”
              - text: ，当前已进入队列，等待提交搜索。
            - list [ref=e130]:
              - listitem [ref=e131]: Instagram 科技内容创作者，所在地 United States
              - listitem [ref=e132]:
                - text: 粉丝
                - strong [ref=e133]: 1万–10万
              - listitem [ref=e134]:
                - text: 目标
                - strong [ref=e135]: 1位
                - text: ，最多核验
                - strong [ref=e136]: 1个候选
              - listitem [ref=e137]: 必选条件：公开文字内容证明其分享科技内容
              - listitem [ref=e138]: 无视觉条件，不要求邮箱，不做外联
            - paragraph [ref=e139]: 未改变或取消任何已有任务。
        - article [ref=e140]:
          - text: 你
          - paragraph [ref=e142]: 请取消任务“浏览器人工协助验收 block-1791596318201”（编号 research-6f0c55a71fef68d5fc3704f1），我不处理这次人工协助。保持独立任务“Review独立文字队列 block-1791596318201”继续执行，不要重新提交或另建任何研究。
        - article [ref=e143]:
          - text: 研究助手
          - generic [ref=e144]:
            - paragraph [ref=e145]:
              - text: 已取消指定任务
              - code [ref=e146]: research-6f0c55a71fef68d5fc3704f1
              - text: ，停止本地核验，不再等待你处理这次人工协助。远端搜索的取消无法保证。
            - paragraph [ref=e147]:
              - text: 独立任务
              - strong [ref=e148]: “Review独立文字队列 block-1791596318201”
              - text: 仍在执行：搜索已提交，正在等待候选返回。
            - paragraph [ref=e149]: 没有重新提交或另建研究，也未取消其他任务。
        - article [ref=e150]:
          - text: 你
          - paragraph [ref=e152]: 请停止“Review独立文字队列 block-1791596318201”（编号 research-fd5a68a36f43604907a7d9fb）的本地研究，不要另建研究。
        - article [ref=e153]:
          - text: 研究助手
          - generic [ref=e154]:
            - paragraph [ref=e155]:
              - text: 已停止
              - strong [ref=e156]: “Review独立文字队列 block-1791596318201”
              - text: （
              - code [ref=e157]: research-fd5a68a36f43604907a7d9fb
              - text: ）的本地研究，未另建研究。
            - paragraph [ref=e158]: 远端搜索可能仍继续，无法保证同步取消。
        - article [ref=e159]:
          - text: 你
          - paragraph [ref=e161]: 现在请另外启动一项独立免费研究，标题“Review独立文字队列 block-1791596516838”。找1位 Instagram 的科技内容创作者，创作者所在地 United States，粉丝1万至10万，最多1个候选；分享科技内容是必选文字条件，没有视觉条件，不要求邮箱。立即开始这项研究，不要改变或取消任何已有任务，也不做外联。
        - article [ref=e162]:
          - text: 研究助手
          - generic [ref=e163]:
            - paragraph [ref=e164]:
              - text: 已创建独立免费研究
              - strong [ref=e165]: “Review独立文字队列 block-1791596516838”
              - text: ，当前已进入队列，等待提交搜索。
            - list [ref=e166]:
              - listitem [ref=e167]:
                - strong [ref=e168]: 任务编号：
                - code [ref=e169]: research-eec15e9fea76882b8f4a22de
              - listitem [ref=e170]:
                - strong [ref=e171]: 范围：
                - text: Instagram，Creator 所在地 United States，粉丝1万–10万
              - listitem [ref=e172]:
                - strong [ref=e173]: 目标：
                - text: 1位，最多核验1个候选
              - listitem [ref=e174]:
                - strong [ref=e175]: 必选条件：
                - text: 公开文字内容证明其分享科技内容
              - listitem [ref=e176]: 无视觉条件，不要求邮箱，不做外联
            - paragraph [ref=e177]: 未改变或取消任何已有任务。
        - article [ref=e178]:
          - text: 你
          - paragraph [ref=e180]: 请取消任务“浏览器人工协助验收 block-1791596516838”（编号 research-5ecc501dbf9d49fa1bd21ed2），我不处理这次人工协助。保持独立任务“Review独立文字队列 block-1791596516838”继续执行，不要重新提交或另建任何研究。
        - article [ref=e181]:
          - text: 研究助手
          - generic [ref=e182]:
            - paragraph [ref=e183]:
              - text: 已取消
              - strong [ref=e184]: “浏览器人工协助验收 block-1791596516838”
              - text: （
              - code [ref=e185]: research-5ecc501dbf9d49fa1bd21ed2
              - text: ）的本地核验，不再等待你处理此次人工协助。远端搜索无法保证同步取消。
            - paragraph [ref=e186]:
              - text: 独立任务
              - strong [ref=e187]: “Review独立文字队列 block-1791596516838”
              - text: 保持执行，最新状态为：搜索已提交，等待候选返回。
            - paragraph [ref=e188]: 未重新提交或另建研究，也未取消其他任务。
        - article [ref=e189]:
          - text: 你
          - paragraph [ref=e191]: 请停止“Review独立文字队列 block-1791596516838”（编号 research-eec15e9fea76882b8f4a22de）的本地研究，不要另建研究。
        - article [ref=e192]:
          - text: 研究助手
          - generic [ref=e193]:
            - paragraph [ref=e194]:
              - text: 已停止
              - strong [ref=e195]: “Review独立文字队列 block-1791596516838”
              - text: （
              - code [ref=e196]: research-eec15e9fea76882b8f4a22de
              - text: ）的本地研究，未另建研究。
            - paragraph [ref=e197]: 远端搜索可能仍继续，无法保证同步取消。
      - generic [ref=e198]:
        - generic [ref=e199]: 发送消息
        - textbox "发送消息" [ref=e200]:
          - /placeholder: 描述你的想法，或继续补充要求…
        - generic [ref=e201]:
          - generic [ref=e202]:
            - generic [ref=e203] [cursor=pointer]: 添加图片
            - text: 任务执行期间，你也可以继续发消息。
          - button "发送消息" [disabled] [ref=e204]: 发送 ↗
    - complementary [ref=e205]:
      - text: RESEARCH DESK
      - heading "研究进展" [level=2] [ref=e206]
      - article [ref=e207]:
        - text: 已完成
        - heading "浏览器人工协助验收 browser-1791595925169" [level=3] [ref=e208]
        - paragraph [ref=e209]: 已核验 1 · 已合格 1 / 1
        - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
        - button "查看结果" [ref=e210] [cursor=pointer]
      - article [ref=e211]:
        - text: 已完成
        - heading "浏览器人工协助验收 browser-1791596090106" [level=3] [ref=e212]
        - paragraph [ref=e213]: 已核验 1 · 已合格 1 / 1
        - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
        - button "查看结果" [ref=e214] [cursor=pointer]
      - article [ref=e215]:
        - text: 已完成
        - heading "测试类型 A" [level=3] [ref=e216]
        - paragraph [ref=e217]: 已核验 2 · 已合格 2 / 1
        - text: 已合格 2/1，已核验 2；证据不足者保持待核实。
        - button "查看结果" [ref=e218] [cursor=pointer]
      - article [ref=e219]:
        - text: 已完成
        - heading "测试类型 B" [level=3] [ref=e220]
        - paragraph [ref=e221]: 已核验 1 · 已合格 1 / 1
        - text: 已合格 1/1，已核验 1；证据不足者保持待核实。
        - button "查看结果" [ref=e222] [cursor=pointer]
      - article [ref=e223]:
        - text: 部分完成
        - heading "浏览器人工协助验收 skip-1791596254229" [level=3] [ref=e224]
        - paragraph [ref=e225]: 已核验 1 · 已合格 0 / 1
        - text: 已合格 0/1，已核验 1；证据不足者保持待核实。
        - button "查看结果" [ref=e226] [cursor=pointer]
      - article [ref=e227]:
        - text: 已取消
        - heading "浏览器人工协助验收 block-1791596318201" [level=3] [ref=e228]
        - paragraph [ref=e229]: 已核验 0 · 已合格 0 / 1
        - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
        - button "查看结果" [ref=e230] [cursor=pointer]
      - article [ref=e231]:
        - text: 已取消
        - heading "Review独立文字队列 block-1791596318201" [level=3] [ref=e232]
        - paragraph [ref=e233]: 已核验 0 · 已合格 0 / 1
        - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
        - button "查看结果" [ref=e234] [cursor=pointer]
      - article [ref=e235]:
        - text: 已取消
        - heading "浏览器人工协助验收 block-1791596516838" [level=3] [ref=e236]
        - paragraph [ref=e237]: 已核验 0 · 已合格 0 / 1
        - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
        - button "查看结果" [ref=e238] [cursor=pointer]
      - article [ref=e239]:
        - text: 已取消
        - heading "Review独立文字队列 block-1791596516838" [level=3] [ref=e240]
        - paragraph [ref=e241]: 已核验 0 · 已合格 0 / 1
        - text: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
        - button "查看结果" [ref=e242] [cursor=pointer]
      - article [ref=e243]:
        - text: 研究中
        - heading "同主页身份夹具" [level=3] [ref=e244]
        - paragraph [ref=e245]: 已核验 0 · 已合格 0 / 1
        - text: 等待向 WaveSurge 提交免费搜索
        - button "查看结果" [ref=e246] [cursor=pointer]
      - article [ref=e247]:
        - text: 研究中
        - heading "同主页身份夹具" [level=3] [ref=e248]
        - paragraph [ref=e249]: 已核验 0 · 已合格 0 / 1
        - text: 等待向 WaveSurge 提交免费搜索
        - button "查看结果" [ref=e250] [cursor=pointer]
      - article [ref=e251]:
        - text: 研究中
        - heading "Review真实Instagram候选重放 1791596615480" [level=3] [ref=e252]
        - paragraph [ref=e253]: 已核验 0 · 已合格 0 / 1
        - text: 等待向 WaveSurge 提交免费搜索
        - button "查看结果" [ref=e254] [cursor=pointer]
      - generic [ref=e255]:
        - text: 有依据的选择
        - paragraph [ref=e256]: 每位创作者的判断都会保留来源；信息不足时，会明确告诉你。
```

# Test source

```ts
  1  | import { expect,test } from '@playwright/test';
  2  | import { execFileSync } from 'node:child_process';
  3  | import {writeFileSync} from 'node:fs';
  4  | test('浏览器复现同主页有/无handle时虚假满足两个不同账号配额',async({page})=>{
  5  |   const root='.gstack/qa-reports/full-e2e-2026-10-10';const docker=(...args:string[])=>execFileSync('docker',['compose',...args],{encoding:'utf8'});
  6  |   const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt').trim();await page.goto('/');await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await expect(page.getByLabel('研究对话')).toBeVisible();
  7  |   docker('cp',root+'/cases/seed-identity-bug.ts','app:/app/data/fixtures/seed-identity-bug.ts');const id=docker('exec','-T','app','node','data/fixtures/seed-identity-bug.ts',String(Date.now()));const get=async()=>(await(await page.request.get('/api/campaigns/'+id)).json());
> 8  |   await expect.poll(async()=>(await get()).status,{timeout:30000}).toBe('completed');const summary=await get();const actualProfiles=[...new Set(summary.results.map((r:any)=>r.creator.profileUrl))];expect(summary.matched).toBe(2);expect(summary.qualifyingUnique).toBe(2);expect(actualProfiles).toHaveLength(1);
     |                                                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  9  |   await page.getByRole('button',{name:'Campaign 方案',exact:true}).click();const card=page.getByRole('dialog',{name:'Campaign 方案'}).locator('.task').filter({has:page.getByRole('heading',{name:summary.title+' · v1',exact:true})});await expect(card).toContainText('去重入选 2/2');await card.getByRole('button',{name:'查看方案与配额'}).click();
  10 |   const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'查看去重汇总报告',exact:true}).click();const popup=await popupPromise;await expect(popup.locator('a[href="https://www.instagram.com/same_person/"]')).toHaveCount(2);await popup.screenshot({path:root+'/screenshots/identity-bug-report.png',fullPage:true});
  11 |   writeFileSync(root+'/identity-ui.json',JSON.stringify({source:'explicit controlled raw candidate fixture; actual production normalizer, scheduler, matching, UI and HTML report; no real discovery or social-page visit; assertions deliberately reproduce a defect',actualCanonicalProfileCount:actualProfiles.length,summary},null,2));
  12 | });
  13 | 
```