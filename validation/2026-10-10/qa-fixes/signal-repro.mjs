import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
if(process.env.SIGNAL_REPRO_CHILD){
 const context=await chromium.launchPersistentContext(process.env.SIGNAL_REPRO_PROFILE,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',handleSIGTERM:process.env.SIGNAL_REPRO_SAFE!=='true'});
 await context.addCookies([{name:'persistent_test',value:'value',url:'https://example.com',expires:Date.now()/1000+86400}]);
 process.once('SIGTERM',()=>{void context.close()}); process.send('ready');
}else{
 for(const safe of [false,true]){
  const profile=mkdtempSync(join(tmpdir(),'studio-signal-'));let log='';
  const child=spawn(process.execPath,[import.meta.filename],{env:{...process.env,DEBUG:'pw:browser',SIGNAL_REPRO_CHILD:'1',SIGNAL_REPRO_PROFILE:profile,SIGNAL_REPRO_SAFE:String(safe)},stdio:['ignore','ignore','pipe','ipc']});
  child.stderr.on('data',data=>log+=data);await new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject)});child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));
  const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  console.log(JSON.stringify({safe,forcefullyClosed:log.includes('<forcefully close>'),cookieKept:(await context.cookies()).some(cookie=>cookie.name==='persistent_test')}));await context.close();rmSync(profile,{recursive:true});
 }
}
