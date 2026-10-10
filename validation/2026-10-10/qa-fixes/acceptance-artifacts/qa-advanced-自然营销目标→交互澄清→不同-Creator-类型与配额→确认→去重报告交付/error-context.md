# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-advanced.spec.ts >> 自然营销目标→交互澄清→不同 Creator 类型与配额→确认→去重报告交付
- Location: tests/e2e/qa-advanced.spec.ts:3:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "completed"
Received: "partial"

Call Log:
- Timeout 240000ms exceeded while waiting on the predicate
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
          - paragraph [ref=e19]: 我想做「耳机 Campaign 1791607317557」推广降噪耳机的campaign，受众是大学生，目的是提升产品认知和推荐转化。我只知道营销目标，Creator 类型和筛选范围希望你和我一起确定。
        - article [ref=e20]:
          - text: 研究助手
          - generic [ref=e21]:
            - paragraph [ref=e22]: 可以，我们一起确定「耳机 Campaign 1791607317557」的方案，先不启动搜索。
            - paragraph [ref=e23]:
              - text: 针对
              - strong [ref=e24]: 大学生受众
              - text: 和
              - strong [ref=e25]: 提升认知＋推荐转化
              - text: 的目标，我建议讨论这三类 Creator：
            - table [ref=e26]:
              - rowgroup [ref=e27]:
                - row [ref=e28]:
                  - columnheader "建议类型" [ref=e29]
                  - columnheader "适合呈现的内容" [ref=e30]
                  - columnheader "对营销目标的作用" [ref=e31]
              - rowgroup [ref=e32]:
                - row [ref=e33]:
                  - cell "耳机／数码测评型" [ref=e34]
                  - cell "降噪效果、佩戴舒适度、音质及同价位比较" [ref=e35]
                  - cell "建立产品认知，提供购买理由" [ref=e36]
                - row [ref=e37]:
                  - cell "校园生活型" [ref=e38]
                  - cell "宿舍、图书馆、通勤等真实使用场景" [ref=e39]
                  - cell "让大学生感到“与我有关”，推动推荐转化" [ref=e40]
                - row [ref=e41]:
                  - cell "学习效率型" [ref=e42]
                  - cell "自习、备考、专注学习中的耳机体验" [ref=e43]
                  - cell "将降噪功能与学习需求关联，强化使用价值" [ref=e44]
            - paragraph [ref=e45]:
              - text: 以上是
              - strong [ref=e46]: 建议方向，还不是已确认的筛选条件
              - text: 。为避免范围过宽，先集中确认四点：
            - list [ref=e47]:
              - listitem [ref=e48]:
                - strong [ref=e49]: 产品定位
                - text: ：品牌／型号、售价，以及最想突出的一两个卖点是什么？有产品链接也可以。
              - listitem [ref=e50]:
                - strong [ref=e51]: 市场与平台
                - text: ：主要推广哪个国家或地区？偏向 Instagram、TikTok、YouTube，还是希望我根据市场建议？Creator 所在地是否也需限定在该市场？
              - listitem [ref=e52]:
                - strong [ref=e53]: 合作规模
                - text: ：预计找多少位 Creator？有合作预算或粉丝量偏好吗？不确定的话，我可以提出配额和粉丝范围供你选择。
              - listitem [ref=e54]:
                - strong [ref=e55]: 转化方式
                - text: ：准备引导到哪里购买，例如官网或电商店铺？是否有优惠码、专属链接等推荐转化机制？
            - paragraph [ref=e56]: 你可以只回答已经知道的部分；其余我会以明确标注的建议补齐，再整理成带类型配额和筛选范围的方案供你确认。
        - article [ref=e57]:
          - text: 你
          - paragraph [ref=e59]: 请结合这个目标提出两种有理由的不同 Creator 类型：科技耳机内容与大学生学习效率内容。平台限定YouTube，Creator本人美国，粉丝1万到10万；每种1位，总共2个不同账号，每种最多核验2位候选。候选跨组重叠时只能占一个配额。学习效率类型只要求公开内容面向学习效率，创作者本人是否在读大学生不作必选。请给每位保存实际内容方向/风格标签，证据不足保持待核实。先保存并展示方案供我确认，暂不开始搜索。
        - article [ref=e60]:
          - text: 你
          - paragraph [ref=e62]: 这是新的推广目标，但之前已经完成的研究结果也要保留。请报告当前Campaign的实际进展，不要重复提交。
        - article [ref=e63]:
          - text: 研究助手
          - generic [ref=e64]:
            - paragraph [ref=e65]:
              - text: 已查询当前记录，
              - strong [ref=e66]: 本轮没有重复提交、重启或取消任何任务，也没有删除或覆盖此前的研究结果
              - text: 。
            - heading "当前 Campaign 实际进展" [level=3] [ref=e67]
            - paragraph [ref=e68]:
              - strong [ref=e69]: 「耳机 Campaign 1791607317557」版本 1：运行中。
            - table [ref=e70]:
              - rowgroup [ref=e71]:
                - row [ref=e72]:
                  - columnheader "类型" [ref=e73]
                  - columnheader "目标配额" [ref=e74]
                  - columnheader "已核验候选" [ref=e75]
                  - columnheader "已合格" [ref=e76]
                  - columnheader "当前状态" [ref=e77]
              - rowgroup [ref=e78]:
                - row [ref=e79]:
                  - cell "科技耳机内容" [ref=e80]
                  - cell "1 位" [ref=e81]
                  - cell "0 位" [ref=e82]
                  - cell "0 位" [ref=e83]
                  - cell "搜索已提交，等待候选返回" [ref=e84]
                - row [ref=e85]:
                  - cell "大学生学习效率内容" [ref=e86]
                  - cell "1 位" [ref=e87]
                  - cell "0 位" [ref=e88]
                  - cell "0 位" [ref=e89]
                  - cell "搜索已提交，等待候选返回" [ref=e90]
            - list [ref=e91]:
              - listitem [ref=e92]:
                - strong [ref=e93]: 跨组去重后的合格账号：0 / 2 个
                - text: ，目前尚无入选账号。
              - listitem [ref=e94]: 已保存范围：YouTube、Creator 本人在美国、订阅数 1万–10万；每组最多核验 2 位候选。
              - listitem [ref=e95]:
                - text: 学习效率组只要求公开内容面向学习效率，
                - strong [ref=e96]: 不要求本人在读大学
                - text: 。
              - listitem [ref=e97]: 已保存“实际内容方向”和“实际内容风格”标注维度；目前尚无核验结果，不能报告具体标签，证据不足时将保持待核实。
            - paragraph [ref=e98]: "**需要纠正此前的说明：**我之前说“暂不开始搜索”，但最新数据库显示，这个 Campaign 的两项搜索实际上已提交。这与此前说明不一致，抱歉；以上以最新记录为准。"
            - paragraph [ref=e99]:
              - text: 本次查询确认的是当前 Campaign 的进展，
              - strong [ref=e100]: 尚未核查此前已完成研究的具体清单
              - text: ，不会将这些旧结果计入本次的 2 个账号配额。
            - paragraph [ref=e101]:
              - link "查看当前 Campaign 报告" [ref=e102] [cursor=pointer]:
                - /url: /api/campaigns/campaign-78f899642a468e5dd0d60780/report
        - article [ref=e103]:
          - text: 研究助手
          - generic [ref=e104]:
            - paragraph [ref=e105]: 研究「科技耳机内容 Creator」已完成。已选合格 1/1 人，核验 2 人。
            - paragraph [ref=e106]: 已选合格 1/1，已核验 2；证据不足者保持待核实。
            - paragraph [ref=e107]:
              - link "查看完整报告" [ref=e108] [cursor=pointer]:
                - /url: /api/reports/research-19759181342ed5eb3a15ab32
              - text: ·
              - link "下载 CSV" [ref=e109] [cursor=pointer]:
                - /url: /api/reports/research-19759181342ed5eb3a15ab32?format=csv
        - article [ref=e110]:
          - text: 研究助手
          - generic [ref=e111]:
            - paragraph [ref=e112]: 研究「学习效率内容 Creator」已结束，仍有缺额。已选合格 0/1 人，核验 2 人。
            - paragraph [ref=e113]: 已选合格 0/1，已核验 2；证据不足者保持待核实。
            - paragraph [ref=e114]:
              - link "查看完整报告" [ref=e115] [cursor=pointer]:
                - /url: /api/reports/research-903061f06d42e2fe4332bfa8
              - text: ·
              - link "下载 CSV" [ref=e116] [cursor=pointer]:
                - /url: /api/reports/research-903061f06d42e2fe4332bfa8?format=csv
        - article [ref=e117]:
          - text: 研究助手
          - generic [ref=e118]:
            - paragraph [ref=e119]: Campaign「耳机 Campaign 1791607317557」已结束，仍有缺额。去重入选 1/2 人。
            - list [ref=e120]:
              - listitem [ref=e121]: 科技耳机内容 Creator：1/1
              - listitem [ref=e122]: 学习效率内容 Creator：0/1
            - paragraph [ref=e123]:
              - link "查看 Campaign 总报告" [ref=e124] [cursor=pointer]:
                - /url: /api/campaigns/campaign-78f899642a468e5dd0d60780/report
      - generic [ref=e125]:
        - generic [ref=e126]: 发送消息
        - textbox "发送消息" [ref=e127]:
          - /placeholder: 描述你的想法，或继续补充要求…
        - generic [ref=e128]:
          - generic [ref=e129]:
            - generic [ref=e130] [cursor=pointer]: 添加图片
            - text: 任务执行期间，你也可以继续发消息。
          - button "发送消息" [disabled] [ref=e131]: 发送 ↗
    - complementary [ref=e132]:
      - text: RESEARCH DESK
      - heading "研究进展" [level=2] [ref=e133]
      - article [ref=e134]:
        - text: 已完成
        - heading "科技耳机内容 Creator" [level=3] [ref=e135]
        - paragraph [ref=e136]: 已核验 2 · 已入选 1 / 1
        - text: 已选合格 1/1，已核验 2；证据不足者保持待核实。
        - button "查看结果" [ref=e137] [cursor=pointer]
      - article [ref=e138]:
        - text: 部分完成
        - heading "学习效率内容 Creator" [level=3] [ref=e139]
        - paragraph [ref=e140]: 已核验 2 · 已入选 0 / 1
        - text: 已选合格 0/1，已核验 2；证据不足者保持待核实。
        - button "查看结果" [ref=e141] [cursor=pointer]
      - generic [ref=e142]:
        - text: 有依据的选择
        - paragraph [ref=e143]: 每位创作者的判断都会保留来源；信息不足时，会明确告诉你。
```

# Test source

```ts
  1 | import{expect,test}from'@playwright/test';import{execFileSync}from'node:child_process';import{writeFileSync}from'node:fs';
  2 | const root='validation/2026-10-10/qa-fixes';const docker=(...args:string[])=>execFileSync('docker',['compose','-p',process.env.QA_PROJECT??'creator-studio-qa-fixes','-f','compose.yaml','-f','tests/fixtures/qa-compose.yaml',...args],{encoding:'utf8'});
  3 | test('自然营销目标→交互澄清→不同 Creator 类型与配额→确认→去重报告交付',async({page})=>{test.setTimeout(420000);const nonce=Date.now();const title=`耳机 Campaign ${nonce}`;const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt');await page.goto('/');await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await expect(page.getByLabel('研究对话')).toBeVisible();const state=async()=>await(await page.request.get('/api/state')).json();const send=async(text:string)=>{await page.getByRole('textbox',{name:'发送消息'}).fill(text);await page.getByRole('button',{name:'发送消息',exact:true}).click()};const before=(await state()).messages.length;
  4 |  await send(`我想做「${title}」推广降噪耳机的campaign，受众是大学生，目的是提升产品认知和推荐转化。我只知道营销目标，Creator 类型和筛选范围希望你和我一起确定。`);await expect.poll(async()=>(await state()).messages.slice(before).filter((m:any)=>m.role==='assistant').length,{timeout:120000}).toBeGreaterThan(0);const first=(await state()).messages.slice(before).filter((m:any)=>m.role==='assistant').at(-1).text;expect(first).toMatch(/平台|地区|粉丝|确认|范围/);
  5 |  await send(`请结合这个目标提出两种有理由的不同 Creator 类型：科技耳机内容与大学生学习效率内容。平台限定YouTube，Creator本人美国，粉丝1万到10万；每种1位，总共2个不同账号，每种最多核验2位候选。候选跨组重叠时只能占一个配额。学习效率类型只要求公开内容面向学习效率，创作者本人是否在读大学生不作必选。请给每位保存实际内容方向/风格标签，证据不足保持待核实。先保存并展示方案供我确认，暂不开始搜索。`);
  6 |  const campaigns=async()=>await(await page.request.get('/api/campaigns')).json();await expect.poll(async()=>(await campaigns()).find((c:any)=>c.title.includes(String(nonce))),{timeout:120000}).toBeTruthy();const fact=(await campaigns()).find((c:any)=>c.title.includes(String(nonce)));const get=async()=>await(await page.request.get(`/api/campaigns/${fact.id}`)).json();const draft=await get();expect(draft.status).toBe('draft');expect(draft.groups).toHaveLength(2);expect(draft.groups.map((g:any)=>g.spec.count)).toEqual([1,1]);expect(draft.groups.every((g:any)=>g.rationale&&g.spec.candidateBudget===2&&g.spec.platforms.includes('youtube'))).toBe(true);
  7 |  await page.getByRole('button',{name:'Campaign 方案',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Campaign 方案'});await dialog.locator('.task').filter({hasText:draft.title}).getByRole('button',{name:'查看方案与配额'}).click();await dialog.getByRole('button',{name:'确认此方案并开始免费研究'}).click();await dialog.getByRole('button',{name:'关闭',exact:true}).click();await send('这是新的推广目标，但之前已经完成的研究结果也要保留。请报告当前Campaign的实际进展，不要重复提交。');
> 8 |  await expect.poll(async()=>(await get()).status,{timeout:240000,intervals:[1000]}).toBe('completed');const final=await get();expect(final.matched).toBe(2);expect(new Set(final.selections.map((s:any)=>s.creatorId)).size).toBe(2);expect(final.groups.map((g:any)=>g.matched)).toEqual([1,1]);expect(final.results.length).toBeGreaterThanOrEqual(3);for(const selection of final.selections)expect(final.results.find((r:any)=>r.id===selection.resultId).verdict).toBe('match');await expect.poll(async()=>(await state()).messages.filter((m:any)=>m.id.startsWith('report-')&&m.text.includes(final.reportUrl)).length,{timeout:15000}).toBe(1);const report=await(await page.request.get(final.reportUrl)).text();expect(report).toContain('去重入选 2/2');expect(report).toContain('data:image/png;base64,');const logs=await(await page.request.get('/api/debug')).json();expect(logs.waveCalls.filter((c:any)=>c.method==='POST'&&final.childTaskIds.includes(c.request?.requestId))).toHaveLength(2);await page.screenshot({path:root+'/campaign-delivery.png',fullPage:true});writeFileSync(root+'/advanced-natural-e2e.json',JSON.stringify({source:'natural goal interaction, actual configured model and production UI/worker/headed browser; Wave discovery and creator pages are explicit controlled fixtures',first,draft,final},null,2));await page.getByRole('button',{name:'退出',exact:true}).click();});
    |                                                                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  9 | 
```