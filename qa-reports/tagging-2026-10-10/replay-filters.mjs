import{chromium,expect}from'@playwright/test';
import{execFileSync}from'node:child_process';
import{readFileSync,writeFileSync}from'node:fs';
const root='.gstack/qa-reports/tagging-2026-10-10';const base='http://127.0.0.1:3300';
const password=execFileSync('docker',['compose','-p','creator-studio-review-e2e','-f','compose.yaml','-f','.gstack/qa-reports/full-e2e-2026-10-10/compose.override.yaml','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const id=readFileSync(root+'/replay-task-id.txt','utf8').trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const output={observedAt:new Date().toISOString(),source:'Actual UI on controlled genuine-candidate replay; no new discovery',taskId:id,filters:[]};
try{
 await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const state=await(await page.request.get(base+'/api/state')).json();const task=state.tasks.find(t=>t.id===id);
 await page.locator('aside .task').filter({has:page.getByRole('heading',{name:task.title,exact:true})}).getByRole('button',{name:'查看结果',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'研究结果'});await expect(dialog.locator('.finding')).toHaveCount(2);
 for(const tag of ['Notion','geek','教师']){
  await dialog.getByRole('textbox',{name:'按标签查找'}).fill(tag);
  const [response]=await Promise.all([page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname==='/api/results'&&new URL(r.url()).searchParams.get('tag')===tag),dialog.getByRole('button',{name:'查询 / 刷新',exact:true}).click()]);
  const rows=await response.json();await expect(dialog.locator('.finding')).toHaveCount(rows.length);
  output.filters.push({tag,httpStatus:response.status(),uiCount:await dialog.locator('.finding').count(),results:rows.map(r=>({handle:r.creator.handle,tags:r.tags,reasons:r.judgments.filter(j=>!j.criterionId.startsWith('__')).map(j=>j.reason)}))});
  await dialog.screenshot({path:root+'/screenshots/replay-filter-'+tag+'.png'});
 }
 const [download]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('link',{name:'下载 CSV',exact:true}).click()]);await download.saveAs(root+'/replay-export.csv');
 writeFileSync(root+'/replay-filters.json',JSON.stringify(output,null,2));
 console.log(JSON.stringify(output.filters.map(f=>({tag:f.tag,count:f.uiCount,handles:f.results.map(r=>r.handle)})),null,2));
}finally{await browser.close();}
