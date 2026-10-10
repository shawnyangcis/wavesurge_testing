# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-fixes.spec.ts >> 全新可复现部署：自然筛选→增量核验→偏好→真实画像→自动交付→筛选导出→补标
- Location: tests/e2e/qa-fixes.spec.ts:6:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('link', { name: '下载 CSV' })
Expected: "/api/reports/research-7d10de0711ba69e9f35395cd?format=csv&tag=geek"
Error: strict mode violation: getByRole('link', { name: '下载 CSV' }) resolved to 2 elements:
    1) <a target="_blank" rel="noreferrer" href="/api/reports/research-7d10de0711ba69e9f35395cd?format=csv">下载 CSV</a> aka getByRole('region', { name: '研究对话' }).getByRole('link', { name: '下载 CSV' })
    2) <a download="" class="download" title="导出当前已查询的筛选结果" href="/api/reports/research-7d10de0711ba69e9f35395cd?format=csv">下载 CSV</a> aka getByRole('link', { name: '下载 CSV', description: '导出当前已查询的筛选结果' })

Call log:
  - Expect "toHaveAttribute" getByRole('link', { name: '下载 CSV' }) with timeout 5000ms
  - waiting for getByRole('link', { name: '下载 CSV' })

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
          - paragraph [ref=e19]: 请现在按这个已明确范围开始研究「完整回归 1791605219170」：找1位美国的YouTube科技内容创作者，粉丝1万到10万，最多核验2位候选。偏好geek科技风，但不要把偏好当必选。另请分别标注每位的内容方向和呈现风格，保存实际标签值与证据。仅查看公开内容，不外联。这次是受控测试数据接口的验收。
        - article [ref=e20]:
          - text: 研究助手
          - generic [ref=e21]:
            - paragraph [ref=e22]: 已按明确范围提交「完整回归 1791605219170」研究：
            - list [ref=e23]:
              - listitem [ref=e24]: "**目标：**1 位美国 YouTube 科技内容创作者"
              - listitem [ref=e25]: "**粉丝范围：**1 万–10 万"
              - listitem [ref=e26]: "**核验上限：**2 位候选"
              - listitem [ref=e27]: "**偏好：**geek 科技风，不作为必选条件"
              - listitem [ref=e28]: "**画像标注：**分别保存每位候选的实际「内容方向」「呈现风格」标签及对应证据；证据不足时标为待核实，不算正向命中"
              - listitem [ref=e29]: "**访问范围：**仅查看公开内容，不外联"
            - paragraph [ref=e30]: 任务已进入后台队列，目前尚无核验结果；完成后会交付结果与证据报告。
        - article [ref=e31]:
          - text: 你
          - paragraph [ref=e33]: 这个研究进展如何？请继续原工作，不要重新搜索。
        - article [ref=e34]:
          - text: 研究助手
          - paragraph [ref=e36]: 本轮处理未完成：模型请求失败（503）。已有任务和记录已保存。
        - article [ref=e37]:
          - text: 研究助手
          - generic [ref=e38]:
            - paragraph [ref=e39]: 研究「完整回归 1791605219170」已完成。已选合格 1/1 人，核验 2 人。
            - paragraph [ref=e40]: 已选合格 1/1，已核验 2；证据不足者保持待核实。
            - paragraph [ref=e41]:
              - link "查看完整报告" [ref=e42] [cursor=pointer]:
                - /url: /api/reports/research-7d10de0711ba69e9f35395cd
              - text: ·
              - link "下载 CSV" [ref=e43] [cursor=pointer]:
                - /url: /api/reports/research-7d10de0711ba69e9f35395cd?format=csv
      - generic [ref=e44]:
        - generic [ref=e45]: 发送消息
        - textbox "发送消息" [ref=e46]:
          - /placeholder: 描述你的想法，或继续补充要求…
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49] [cursor=pointer]: 添加图片
            - text: 任务执行期间，你也可以继续发消息。
          - button "发送消息" [disabled] [ref=e50]: 发送 ↗
    - complementary [ref=e51]:
      - text: RESEARCH DESK
      - heading "研究进展" [level=2] [ref=e52]
      - article [ref=e53]:
        - text: 已完成
        - heading "完整回归 1791605219170" [level=3] [ref=e54]
        - paragraph [ref=e55]: 已核验 2 · 已合格 1 / 1
        - text: 已选合格 1/1，已核验 2；证据不足者保持待核实。
        - button "查看结果" [ref=e56] [cursor=pointer]
      - generic [ref=e57]:
        - text: 有依据的选择
        - paragraph [ref=e58]: 每位创作者的判断都会保留来源；信息不足时，会明确告诉你。
  - dialog "研究结果" [ref=e60]:
    - generic [ref=e61]:
      - generic [ref=e62]:
        - text: RESEARCH / FINDINGS
        - heading "研究结果" [level=2] [ref=e63]
      - button "关闭" [ref=e64] [cursor=pointer]
    - paragraph [ref=e65]: 符合 1 · 待核实 0 · 不符合 0
    - generic [ref=e66]:
      - link "查看报告" [ref=e67] [cursor=pointer]:
        - /url: /api/reports/research-7d10de0711ba69e9f35395cd
      - link "下载 CSV" [ref=e68] [cursor=pointer]:
        - /url: /api/reports/research-7d10de0711ba69e9f35395cd?format=csv&tag=geek
    - generic [ref=e69]:
      - generic [ref=e70]:
        - text: 按标签查找
        - textbox "按标签查找" [ref=e71]:
          - /placeholder: 例如：科技内容
          - text: geek
      - generic [ref=e72]:
        - text: 平台
        - combobox "平台" [ref=e73]:
          - option "全部平台" [selected]
          - option "instagram"
          - option "tiktok"
          - option "youtube"
          - option "twitter"
      - generic [ref=e74]:
        - text: 判断
        - combobox "判断" [ref=e75]:
          - option "全部判断" [selected]
          - option "符合要求"
          - option "不符合"
          - option "待核实"
      - button "查询 / 刷新" [active] [ref=e76] [cursor=pointer]
    - article [ref=e77]:
      - generic [ref=e78]: 符合要求
      - heading "受控夹具 bob" [level=3] [ref=e79]
      - paragraph [ref=e80]: youtube · @ · 67.6K subscribers 粉丝 · 地区待确认
      - generic [ref=e81]:
        - generic [ref=e82]: 创作科技相关内容
        - generic [ref=e83]: 偏好 geek 科技风
        - generic [ref=e84]: 科技教育
        - generic [ref=e85]: 耳机评测
        - generic [ref=e86]: 处理器与降噪技术讲解
        - generic [ref=e87]: geek 科技爱好者风格
        - generic [ref=e88]: 详细教程
        - generic [ref=e89]: 设备演示
      - group [ref=e90]:
        - generic "逐条件判断与证据" [ref=e91] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { execFileSync } from 'node:child_process';
  3  | import { writeFileSync } from 'node:fs';
  4  | const root='validation/2026-10-10/qa-fixes';
  5  | const docker=(...args:string[])=>execFileSync('docker',['compose','-p','creator-studio-qa-fixes','-f','compose.yaml','-f',root+'/compose.override.yaml',...args],{encoding:'utf8'});
  6  | test('全新可复现部署：自然筛选→增量核验→偏好→真实画像→自动交付→筛选导出→补标',async({page})=>{
  7  |  test.setTimeout(420000);const nonce=Date.now();const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt');
  8  |  await page.goto('http://127.0.0.1:3500');await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await expect(page.getByLabel('研究对话')).toBeVisible();
  9  |  const state=async()=>await(await page.request.get('/api/state')).json();const initial=await state();
  10 |  const send=async(text:string)=>{await page.getByRole('textbox',{name:'发送消息'}).fill(text);await page.getByRole('button',{name:'发送消息',exact:true}).click()};
  11 |  const title=`完整回归 ${nonce}`;
  12 |  await send(`请现在按这个已明确范围开始研究「${title}」：找1位美国的YouTube科技内容创作者，粉丝1万到10万，最多核验2位候选。偏好geek科技风，但不要把偏好当必选。另请分别标注每位的内容方向和呈现风格，保存实际标签值与证据。仅查看公开内容，不外联。这次是受控测试数据接口的验收。`);
  13 |  await expect.poll(async()=>(await state()).tasks.find((t:any)=>t.title.includes(title)),{timeout:120000}).toBeTruthy();const task=(await state()).tasks.find((t:any)=>t.title.includes(title));
  14 |  const debug=async()=>await(await page.request.get('/api/debug')).json();
  15 |  await expect.poll(async()=>(await state()).tasks.find((t:any)=>t.id===task.id)?.remoteStatus,{timeout:120000,intervals:[1000]}).toBe('running');
  16 |  await expect.poll(async()=>(await state()).tasks.find((t:any)=>t.id===task.id)?.evaluated,{timeout:120000,intervals:[1000]}).toBeGreaterThan(0);
  17 |  await send('这个研究进展如何？请继续原工作，不要重新搜索。');
  18 |  await expect.poll(async()=>(await state()).tasks.find((t:any)=>t.id===task.id)?.status,{timeout:240000,intervals:[1000]}).toBe('completed');
  19 |  const results=await(await page.request.get(`/api/results?taskId=${task.id}`)).json();expect(results).toHaveLength(2);expect(results.filter((r:any)=>r.selected)).toHaveLength(1);const selected=results.find((r:any)=>r.selected);expect(selected.creator.profileUrl).toContain('/bob');expect(selected.creator.followers).toBeNull();expect(selected.creator.facts.followers.rawValue).toContain('subscribers');expect(selected.judgments.find((j:any)=>j.criterionId==='__region').verdict).toBe('match');expect(results.every((r:any)=>r.creator.evidence.some((e:any)=>e.assetId))).toBe(true);expect(results.every((r:any)=>r.annotations?.some((a:any)=>a.status==='supported'&&a.values.length))).toBe(true);
  20 |  const final=await state();const delivery=final.messages.filter((m:any)=>m.role==='assistant'&&m.text.includes(`/api/reports/${task.id}`)&&m.id.startsWith('report-'));expect(delivery).toHaveLength(1);expect(final.messages.filter((m:any)=>m.role==='user'&&m.state==='pending')).toHaveLength(0);
  21 |  await expect(page.getByRole('link',{name:'查看完整报告',exact:true})).toBeVisible();const html=await(await page.request.get(`/api/reports/${task.id}`)).text();expect(html).toContain('data:image/png;base64,');expect(html).toContain('完整证据映射');
> 22 |  const taskCard=page.locator('aside .task').filter({hasText:title});await taskCard.getByRole('button',{name:'查看结果'}).click();await page.getByLabel('按标签查找').fill('geek');await page.getByRole('button',{name:'查询 / 刷新'}).click();await expect(page.getByRole('link',{name:'下载 CSV'})).toHaveAttribute('href',`/api/reports/${task.id}?format=csv&tag=geek`);
     |                                                                                                                                                                                                                                                                                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  23 |  const exported=await(await page.request.get(`/api/reports/${task.id}?format=csv&tag=geek`)).text();const filtered=await(await page.request.get(`/api/results?taskId=${task.id}&tag=geek`)).json();expect(filtered.every((r:any)=>r.creator.profileUrl.includes('/bob'))).toBe(true);expect(exported).not.toContain('/creator/alice');await page.screenshot({path:root+'/filtered-results.png',fullPage:true});await page.getByRole('button',{name:'关闭',exact:true}).click();
  24 |  await send('请给刚才这两位已有候选再补一项“合作类型”画像标签，使用已有证据即可，不需要重新搜索或重开页面；没有证据的标签保持待核实，并保存到结果里。');
  25 |  await expect.poll(async()=>(await state()).tasks.find((t:any)=>t.id.startsWith('enrich-'))?.status,{timeout:120000,intervals:[1000]}).toBe('completed');
  26 |  const updated=await(await page.request.get(`/api/results?taskId=${task.id}`)).json();expect(updated.every((r:any)=>r.revision>=2)).toBe(true);expect(updated).toHaveLength(2);const logs=await debug();expect(logs.waveCalls.filter((c:any)=>c.method==='POST')).toHaveLength(1);
  27 |  await page.getByRole('button',{name:'浏览器桌面',exact:true}).click();await expect(page.frameLocator('iframe[title="持久浏览器桌面"]').locator('#noVNC_container canvas')).toBeVisible({timeout:30000});await page.screenshot({path:root+'/headed-desktop.png',fullPage:true});await page.getByRole('button',{name:'关闭',exact:true}).click();
  28 |  await page.screenshot({path:root+'/automatic-report-chat.png',fullPage:true});writeFileSync(root+'/natural-e2e.json',JSON.stringify({source:'isolated Docker project, new named volumes, explicit controlled Wave/candidate fixture; actual configured model + production headed Chromium/noVNC + real UI/worker/export; NOT real social discovery',initial:{messages:initial.messages.length,tasks:initial.tasks.length},task:(await state()).tasks.find((t:any)=>t.id===task.id),results:updated,delivery,waveCalls:logs.waveCalls},null,2));await page.getByRole('button',{name:'退出',exact:true}).click();
  29 | });
  30 | 
```