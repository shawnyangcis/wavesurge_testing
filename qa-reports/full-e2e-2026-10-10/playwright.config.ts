import { defineConfig } from '@playwright/test';
const root = '/Users/shawn/coding/projects/wavesurge/wavesurge_testing/.gstack/qa-reports/full-e2e-2026-10-10';
const suffix = process.env.E2E_RUN ? `-${process.env.E2E_RUN}` : '';
export default defineConfig({testDir: './cases', fullyParallel:false,workers:1,timeout:30000,reporter:[['list'],['html',{outputFolder:`${root}/playwright-report${suffix}`,open:'never'}]],outputDir:`${root}/test-results${suffix}`,use:{baseURL:'http://127.0.0.1:3300',viewport:{width:1440,height:900},trace:'on',screenshot:'on',launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}}});
