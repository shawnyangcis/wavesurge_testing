# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-persistence.spec.ts >> 新写 Cookie/localStorage：真实 noVNC 操作后，连续三次正常容器重启保留
- Location: tests/e2e/qa-persistence.spec.ts:4:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "persistent_persistence_1791605498069=test_value"
Received string:    "Controlled persistence fixture — no real login
保存受控测试状态
{
  \"persistentCookie\": null,
  \"sessionCookie\": null,
  \"localStorage\": null
}"
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
      - generic [ref=e17]:
        - heading "你的下一次合作， 从这里开始。" [level=1] [ref=e18]: 你的下一次合作，从这里开始。
        - paragraph [ref=e19]: 描述你想找的创作者，或告诉我这次 Campaign 的目标。
        - generic [ref=e20]: 例如：找 20 位分享科技生活的 Instagram 创作者，粉丝在 1 万到 10 万之间。
      - generic [ref=e21]:
        - generic [ref=e22]: 发送消息
        - textbox "发送消息" [ref=e23]:
          - /placeholder: 描述你的想法，或继续补充要求…
        - generic [ref=e24]:
          - generic [ref=e25]:
            - generic [ref=e26] [cursor=pointer]: 添加图片
            - text: 任务执行期间，你也可以继续发消息。
          - button "发送消息" [disabled] [ref=e27]: 发送 ↗
    - complementary [ref=e28]:
      - text: RESEARCH DESK
      - heading "研究进展" [level=2] [ref=e29]
      - article [ref=e30]:
        - text: 需要协助
        - heading "持久化测试" [level=3] [ref=e31]
        - paragraph [ref=e32]: 已核验 0 · 已合格 0 / 0
        - text: 仅保存受控测试值
        - button "打开桌面协助" [ref=e33] [cursor=pointer]
        - button "查看结果" [ref=e34] [cursor=pointer]
      - generic [ref=e35]:
        - text: 有依据的选择
        - paragraph [ref=e36]: 每位创作者的判断都会保留来源；信息不足时，会明确告诉你。
```

# Test source

```ts
  1  | import {expect,test}from'@playwright/test';import{execFileSync}from'node:child_process';import{writeFileSync}from'node:fs';
  2  | const root='validation/2026-10-10/qa-fixes';const docker=(...args:string[])=>execFileSync('docker',['compose','-p','creator-studio-qa-persistence','-f','compose.yaml','-f',root+'/persistence-compose.yaml',...args],{encoding:'utf8'});
  3  | const rpc=(body:object)=>JSON.parse(docker('exec','-T','desktop','node','-e',`fetch('http://127.0.0.1:8810/command',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+require('fs').readFileSync('/run/studio-secrets/desktop-token','utf8')},body:process.argv[1]}).then(async r=>{const x=await r.json();delete x.screenshotBase64;if(!r.ok)throw Error(x.error);process.stdout.write(JSON.stringify(x))})`,JSON.stringify(body)));
  4  | test('新写 Cookie/localStorage：真实 noVNC 操作后，连续三次正常容器重启保留',async({page})=>{test.setTimeout(240000);const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt');await page.goto('http://127.0.0.1:3501');await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();const records=[];
  5  |  for(let round=0;round<3;round++){
  6  |  const key=`persistence_${Date.now()}`;const url=`http://127.0.0.1:8086/?case=${key}`;rpc({action:'navigate',url});const id=`manual-${key}`;
  7  |  docker('exec','-T','app','node','-e',`const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/app/data/studio.sqlite');const id=process.argv[1];const q=d.prepare('INSERT OR REPLACE INTO documents VALUES(?,?,?)');q.run('assistance',id,JSON.stringify({id,taskId:id,creatorId:'controlled-fixture',reason:'持久化回归的受控人工操作，不涉及真实登录',status:'pending',createdAt:Date.now(),leaseUntil:0}));q.run('task',id,JSON.stringify({id,title:'持久化测试',status:'needs_input',requested:0,evaluated:0,matched:0,updatedAt:Date.now(),detail:'仅保存受控测试值'}));`,id);
  8  |  await page.getByRole('button',{name:'浏览器桌面',exact:true}).click();await expect(page.getByRole('button',{name:'接管并协助'})).toBeVisible();await page.getByRole('button',{name:'接管并协助'}).click();const frame=page.frameLocator('iframe[title="持久浏览器桌面"]');const canvas=frame.locator('#noVNC_container canvas');await expect(frame.locator('#noVNC_status')).toContainText(/Connected|connected|已连接/,{timeout:30000});await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).width)).toBe(1440);await page.screenshot({path:`${root}/screenshots/persistence-${round+1}-before.png`,fullPage:true});const rect=(await canvas.boundingBox())!;await canvas.click({position:{x:rect.width*450/1440,y:rect.height*450/900}});
> 9  |  await page.getByLabel('协助结果').fill('已点击夹具按钮保存受控测试 Cookie 与 localStorage。');await page.getByRole('button',{name:'完成协助，交还 Agent'}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();const before=rpc({action:'observe'});expect(before.text).toContain(`persistent_${key}=test_value`);expect(before.text).toContain('"localStorage": "test_value"');docker('restart','desktop');await expect.poll(()=>docker('exec','-T','desktop','node','-e',"fetch('http://127.0.0.1:8810/health').then(r=>process.stdout.write(String(r.ok))).catch(()=>process.stdout.write('false'))"),{timeout:45000}).toBe('true');docker('exec','-d','desktop','node','/tmp/qa-persistence-server.mjs');const after=rpc({action:'navigate',url});expect(after.text).toContain(`persistent_${key}=test_value`);expect(after.text).toContain('"localStorage": "test_value"');records.push({round:round+1,key,before,after,persistentCookieKept:true,localStorageKept:true});
     |                                                                                                                                                                                                                                                                  ^ Error: expect(received).toContain(expected) // indexOf
  10 |  }
  11 |  writeFileSync(root+'/persistence-three-restarts.json',JSON.stringify({source:'new writes through actual headed Chromium + actual noVNC control lease + normal Docker restart; controlled test cookies only, no real platform credentials',records},null,2));await page.getByRole('button',{name:'退出',exact:true}).click();});
  12 | 
```