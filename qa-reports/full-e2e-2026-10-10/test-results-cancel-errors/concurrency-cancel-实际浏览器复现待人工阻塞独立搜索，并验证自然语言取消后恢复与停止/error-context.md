# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: concurrency-cancel.spec.ts >> 实际浏览器复现待人工阻塞独立搜索，并验证自然语言取消后恢复与停止
- Location: .gstack/qa-reports/full-e2e-2026-10-10/cases/concurrency-cancel.spec.ts:4:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/cancelled/)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/cancelled/) with timeout 5000ms
  - waiting for getByText(/cancelled/)

```

```yaml
- heading "Review独立文字队列 block-1791596318201" [level=1]
- paragraph: 目标 1 人；本地已合格 0 人；已核验 0 人。
- paragraph: 已停止本地核验；WaveSurge 没有已验证的远端取消接口，远端搜索可能继续
- text: 来源：WaveSurge + 本地核验。远端搜索完成不代表本地条件通过。报告更新时间：2026-10-10T01:40:03.244Z
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { execFileSync } from 'node:child_process';
  3  | import { writeFileSync } from 'node:fs';
  4  | test('实际浏览器复现待人工阻塞独立搜索，并验证自然语言取消后恢复与停止', async ({page}) => {
  5  |   test.setTimeout(300000);
  6  |   const root='.gstack/qa-reports/full-e2e-2026-10-10';
  7  |   const docker=(...args:string[])=>execFileSync('docker',['compose',...args],{encoding:'utf8'});
  8  |   const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt').trim();
  9  |   await page.goto('/'); await page.getByLabel('管理员密码').fill(password); await page.getByRole('button',{name:/进入工作室/}).click(); await expect(page.getByLabel('研究对话')).toBeVisible();
  10 |   const get=async(path:string)=>(await page.request.get(path)).json();
  11 |   const state=async()=>get('/api/state');
  12 |   const send=async(text:string)=>{await page.getByRole('textbox',{name:'发送消息'}).fill(text);await page.getByRole('button',{name:'发送消息'}).click();await expect.poll(async()=>(await state()).active,{timeout:120000}).toBe(false);};
  13 |   await expect.poll(async()=>(await state()).active,{timeout:120000}).toBe(false);
  14 |   docker('cp','tests/fixtures/seed-browser-task.ts','app:/app/data/fixtures/seed-browser-task.ts');
  15 |   const nonce=`block-${Date.now()}`;
  16 |   const aId=docker('exec','-T','app','node','data/fixtures/seed-browser-task.ts',nonce,'http://127.0.0.1:8085/skip');
  17 |   const a=async()=>(await state()).tasks.find((t:any)=>t.id===aId);
  18 |   await expect.poll(async()=>(await a())?.status,{timeout:180000,intervals:[2000]}).toBe('needs_input');
  19 |   const bTitle=`Review独立文字队列 ${nonce}`;
  20 |   const beforeIds=(await state()).tasks.map((t:any)=>t.id);
  21 |   await send(`现在请另外启动一项独立免费研究，标题“${bTitle}”。找1位 Instagram 的科技内容创作者，创作者所在地 United States，粉丝1万至10万，最多1个候选；分享科技内容是必选文字条件，没有视觉条件，不要求邮箱。立即开始这项研究，不要改变或取消任何已有任务，也不做外联。`);
  22 |   await expect.poll(async()=>(await state()).tasks.filter((t:any)=>!beforeIds.includes(t.id)).length).toBe(1);
  23 |   const bId=(await state()).tasks.find((t:any)=>!beforeIds.includes(t.id)).id;
  24 |   const b=async()=>(await state()).tasks.find((t:any)=>t.id===bId);
  25 |   await page.waitForTimeout(16000);
  26 |   const blocked={a:await a(),b:await b(),desktop:await get('/api/desktop'),waveCalls:(await get('/api/debug')).waveCalls.filter((c:any)=>c.request?.requestId===bId)};
  27 |   expect(blocked.b.status).toBe('queued');expect(blocked.b.remoteId).toBeUndefined();expect(blocked.waveCalls).toHaveLength(0);
  28 |   await page.screenshot({path:root+'/screenshots/independent-search-blocked.png',fullPage:true});
  29 |   await send(`请取消任务“${(await a()).title}”（编号 ${aId}），我不处理这次人工协助。保持独立任务“${bTitle}”继续执行，不要重新提交或另建任何研究。`);
  30 |   await expect.poll(async()=>(await a()).status).toBe('cancelled');
  31 |   await expect.poll(async()=>(await b()).remoteId,{timeout:60000}).toBeTruthy();
  32 |   expect((await get('/api/desktop')).request).toBeUndefined();
  33 |   const recovered={a:await a(),b:await b(),waveCalls:(await get('/api/debug')).waveCalls.filter((c:any)=>c.request?.requestId===bId)};
  34 |   expect(recovered.waveCalls.filter((c:any)=>c.method==='POST')).toHaveLength(1);
  35 |   await send(`请停止“${bTitle}”（编号 ${bId}）的本地研究，不要另建研究。`);
  36 |   await expect.poll(async()=>(await b()).status).toBe('cancelled');
  37 |   await page.locator('.task').filter({has:page.getByRole('heading',{name:bTitle,exact:true})}).getByRole('button',{name:'查看结果'}).click();
  38 |   await expect(page.getByRole('dialog',{name:'研究结果'})).toBeVisible();await expect(page.getByText('暂时没有已保存的核验结果。')).toBeVisible();
> 39 |   const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'查看报告',exact:true}).click();const popup=await popupPromise;await expect(popup.getByText(/cancelled/)).toBeVisible();await popup.screenshot({path:root+'/screenshots/cancelled-report.png',fullPage:true});await popup.close();
     |                                                                                                                                                                                         ^ Error: expect(locator).toBeVisible() failed
  40 |   const cancelled={a:await a(),b:await b(),desktop:await get('/api/desktop')};
  41 |   writeFileSync(root+'/concurrency-cancel.json',JSON.stringify({source:'A is an explicit controlled blocked-browser candidate; B is started and cancelled through natural-language UI with actual model and real free WaveSurge API; passed defect reproduction does NOT mean independent scheduling works',blocked,recovered,cancelled},null,2));
  42 | });
  43 | 
```