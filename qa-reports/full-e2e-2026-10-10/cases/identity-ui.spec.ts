import { expect,test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import {writeFileSync} from 'node:fs';
test('浏览器复现同主页有/无handle时虚假满足两个不同账号配额',async({page})=>{
  test.setTimeout(120000);
  const root='.gstack/qa-reports/full-e2e-2026-10-10';const docker=(...args:string[])=>execFileSync('docker',['compose',...args],{encoding:'utf8'});
  const password=docker('exec','-T','app','cat','/app/data/admin-bootstrap.txt').trim();await page.goto('/');await page.getByLabel('管理员密码').fill(password);await page.getByRole('button',{name:/进入工作室/}).click();await expect(page.getByLabel('研究对话')).toBeVisible();
  docker('cp',root+'/cases/seed-identity-bug.ts','app:/app/data/fixtures/seed-identity-bug.ts');const id=process.env.IDENTITY_CAMPAIGN_ID ?? docker('exec','-T','app','node','data/fixtures/seed-identity-bug.ts',String(Date.now()));const get=async()=>(await(await page.request.get('/api/campaigns/'+id)).json());
  await expect.poll(async()=>(await get()).status,{timeout:90000}).toBe('completed');const summary=await get();const actualProfiles=[...new Set(summary.results.map((r:any)=>r.creator.profileUrl))];expect(summary.matched).toBe(2);expect(summary.qualifyingUnique).toBe(2);expect(actualProfiles).toHaveLength(1);
  await page.getByRole('button',{name:'Campaign 方案',exact:true}).click();const card=page.getByRole('dialog',{name:'Campaign 方案'}).locator('.task').filter({has:page.getByRole('heading',{name:summary.title+' · v1',exact:true})});await expect(card).toContainText('去重入选 2/2');await card.getByRole('button',{name:'查看方案与配额'}).click();
  const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'查看去重汇总报告',exact:true}).click();const popup=await popupPromise;await expect(popup.locator('a[href="https://www.instagram.com/same_person/"]')).toHaveCount(2);await popup.screenshot({path:root+'/screenshots/identity-bug-report.png',fullPage:true});
  writeFileSync(root+'/identity-ui.json',JSON.stringify({source:'explicit controlled raw candidate fixture; actual production normalizer, scheduler, matching, UI and HTML report; no real discovery or social-page visit; assertions deliberately reproduce a defect',actualCanonicalProfileCount:actualProfiles.length,summary},null,2));
});
