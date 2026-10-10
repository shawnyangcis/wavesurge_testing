import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const root='.gstack/qa-reports/retest-2026-10-10-r4',base='http://127.0.0.1:3592',taskId='research-290c9d1e55ab57958eebf69f';
const password=execFileSync('docker',['compose','-p','creator-studio-retest-r4-live','-f','compose.yaml','-f',root+'/live-compose.yaml','exec','-T','app','cat','/app/data/admin-bootstrap.txt'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true}),page=await context.newPage();
const out={at:new Date().toISOString(),taskId,checks:[],pageErrors:[]};page.on('pageerror',e=>out.pageErrors.push(String(e)));
try{
 await page.goto(base);await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await page.getByLabel('研究对话').waitFor();
 const state=await(await page.request.get(base+'/api/state')).json(),rows=await(await page.request.get(base+'/api/results?taskId='+taskId)).json();
 await page.locator('aside .task').nth(state.tasks.findIndex(t=>t.id===taskId)).getByRole('button',{name:'查看结果'}).click();const dialog=page.getByRole('dialog',{name:'研究结果'});await expect(dialog.locator('.finding')).toHaveCount(rows.length,{timeout:60000});
 const tag=rows.find(r=>r.verdict==='unknown'&&r.tags.length)?.tags[0]??rows.find(r=>r.tags.length).tags[0];
 const variants=[{platform:'instagram',verdict:'',tag:''},{platform:'twitter',verdict:'',tag:''},{platform:'',verdict:'unknown',tag:''},{platform:'',verdict:'no_match',tag:''},{platform:'',verdict:'match',tag:''},{platform:'instagram',verdict:'unknown',tag},{platform:'',verdict:'',tag:''}];
 for(let i=0;i<variants.length;i++){
  const filter=variants[i];await dialog.getByLabel('平台').selectOption(filter.platform);await dialog.getByLabel('判断').selectOption(filter.verdict);await dialog.getByLabel('按标签查找').fill(filter.tag);
  const response=page.waitForResponse(r=>r.url().includes('/api/results?')&&r.status()===200);await dialog.getByRole('button',{name:'查询 / 刷新'}).click();await response;
  const expected=rows.filter(r=>(!filter.platform||r.creator.platform===filter.platform)&&(!filter.verdict||r.verdict===filter.verdict)&&(!filter.tag||r.tags.some(t=>t.includes(filter.tag))));await expect(dialog.locator('.finding')).toHaveCount(expected.length,{timeout:60000});
  const downloadLink=dialog.getByRole('link',{name:'下载 CSV'});await expect.poll(async()=>{const u=new URL(await downloadLink.getAttribute('href'),base);return ['platform','verdict','tag'].every(k=>(u.searchParams.get(k)??'')===filter[k]);}).toBe(true);
  const pending=page.waitForEvent('download');await downloadLink.click();const dl=await pending,path=root+'/select-filter-'+i+'.csv';await dl.saveAs(path);
  const actual=JSON.parse(execFileSync('python3',['-c',"import csv,json,sys;csv.field_size_limit(64*1024*1024);a=list(csv.DictReader(open(sys.argv[1],encoding='utf-8-sig',newline='')));print(json.dumps([{'handle':x['账号'],'verdict':x['本地判断'],'platform':x['平台']} for x in a]))",path],{encoding:'utf8'}));expect(actual).toEqual(expected.map(r=>({handle:r.creator.handle,verdict:r.verdict,platform:r.creator.platform})));
  out.checks.push({filter,rows:actual.length,handles:actual.map(x=>x.handle),csv:path,passed:true});await page.screenshot({path:root+'/screenshots/select-filter-'+i+'.png',fullPage:true});
 }
 expect(out.pageErrors).toEqual([]);out.finishedAt=new Date().toISOString();out.passed=true;
}catch(e){out.error=String(e);throw e}finally{writeFileSync(root+'/result-select-filter-ui.json',JSON.stringify(out,null,2));console.log(JSON.stringify({passed:out.passed,checks:out.checks.map(c=>({filter:c.filter,rows:c.rows})),error:out.error}));await browser.close()}
