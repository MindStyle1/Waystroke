#!/usr/bin/env node
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const [url='http://127.0.0.1:4173/',dirArg='output/playwright/verify-waystroke-calendar',selection='all']=process.argv.slice(2);
if(!['all','real'].includes(selection))throw Error('Expected all or real calendar selection');
const dir=resolve(dirArg);mkdirSync(dir,{recursive:true});
const {chromium}=process.env.WAYSTROKE_PLAYWRIGHT_MODULE?await import(process.env.WAYSTROKE_PLAYWRIGHT_MODULE):createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,...(process.env.WAYSTROKE_CHROME?{executablePath:process.env.WAYSTROKE_CHROME}:{})});
const report={url,browser:browser.version(),checks:[],observations:[],blocked:[]};
const check=(name,ok,detail)=>report.checks.push({name,status:ok?'PASS':'FAIL',detail});
try {
 for(const width of [1440,390]) for(const scenario of (selection==='real'?['real']:['real','abort','load-without-readiness','late-readiness'])){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('https://track.waystroke.online/**',r=>{report.blocked.push(r.request().url());return r.fulfill({status:204});});
  await context.route('**/cdn-cgi/rum*',r=>r.fulfill({status:204}));
  if(scenario!=='real') await context.route('https://cal.com/**',r=>scenario==='abort'?r.abort('failed'):r.fulfill({status:200,contentType:'text/html',body:scenario==='late-readiness'?`<!doctype html><body style="opacity:0"><p>Waystroke · 20m · isolated Cal boundary fixture</p><script>addEventListener('message',e=>{if(e.source===parent&&e.data?.originator==='CAL'&&e.data?.method==='parentKnowsIframeReady'){document.body.style.opacity='1';parent.postMessage({originator:'CAL',type:'linkReady'},'*');}});setTimeout(()=>parent.postMessage({originator:'CAL',type:'__iframeReady'},'*'),9500);</script></body>`:'<!doctype html><title>Unready booking boundary</title><p>No availability acknowledgement.</p>'}));
  const page=await context.newPage();
  await page.addInitScript(()=>{window.__calendarMessages=[];addEventListener('message',e=>window.__calendarMessages.push({origin:e.origin,type:e.data?.type,originator:e.data?.originator,slug:e.data?.data?.eventSlug,sourceMatches:e.source===document.querySelector('iframe')?.contentWindow}));});
  page.on('response',r=>{if(r.url().includes('cal.com')&&r.request().isNavigationRequest())report.observations.push({scenario,width,response:r.url(),status:r.status()});});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));
  await page.locator('#contact').scrollIntoViewIfNeeded();
  const panel=page.locator('details.cal');await page.waitForFunction(()=>document.querySelector('details.cal').open);
  await panel.scrollIntoViewIfNeeded();
  const label=`${width}: ${scenario}`;
  if(scenario==='real'){
   await page.waitForFunction(()=>document.querySelector('details.cal').classList.contains('is-loaded'),{},{timeout:30000}).catch(()=>{});
   report.observations.push({scenario,width,messages:await page.evaluate(()=>window.__calendarMessages)});
   if(await page.locator('.cal__error').isVisible()){await page.screenshot({path:resolve(dir,`${width}-real-fallback.png`)});check(`${label}: real ready or honest fallback`,await page.locator('.cal__status a').isVisible(), 'Real boundary timed out; readiness success remains unverified.');await context.close();continue;}
   const frame=page.frames().find(f=>f.url().startsWith('https://cal.com/'));
   if(frame) await frame.waitForFunction(()=>document.body.innerText.includes('Waystroke')&&document.body.innerText.includes('20m')&&document.body.innerText.includes('Available times')&&Number(getComputedStyle(document.body).opacity)===1&&getComputedStyle(document.body).visibility==='visible',{},{timeout:15000});
   if(frame) await frame.getByText('Waystroke',{exact:true}).first().evaluate(async e=>{const ready=()=>{let opacity=1;for(let n=e;n;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);return opacity>.99;};for(let i=0;i<100&&!ready();i++)await new Promise(r=>setTimeout(r,50));if(!ready())throw Error('Cal event header did not finish rendering');});
   const text=frame?await frame.locator('body').innerText():'';
   check(`${label}: real schedule visible`,text.includes('Waystroke')&&text.includes('20m'),text.slice(0,600));
   check(`${label}: no error`,!await page.locator('.cal__error').isVisible());
   await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-booking-frame]')).opacity)===1);
   await page.screenshot({path:resolve(dir,`${width}-real-ready.png`)});
  }else{
   await page.locator('.cal__error').waitFor({state:'visible',timeout:12000});
   check(`${label}: loading ends`,!await page.locator('.cal__loading').count());
   check(`${label}: unready iframe inaccessible`,await page.locator('[data-booking-frame]').getAttribute('aria-hidden')==='true'&&await page.locator('[data-booking-frame]').evaluate(e=>e.inert));
   check(`${label}: usable fallback`,await page.locator('.cal__status a').isVisible()&&await page.locator('.cal__status a').getAttribute('href')==='https://cal.com/mind-style-00/waystroke-call');
   if(scenario==='late-readiness'){await page.waitForFunction(()=>document.querySelector('details.cal').classList.contains('is-loaded'),{},{timeout:8000});check(`${label}: late readiness recovers`,!await page.locator('.cal__error').count()&&await page.locator('[data-booking-frame]').getAttribute('aria-hidden')===null&&!(await page.locator('[data-booking-frame]').evaluate(e=>e.inert)));}
  }
  await panel.locator('summary').click();check(`${label}: can close`,!await panel.evaluate(e=>e.open));
  await panel.locator('summary').click();check(`${label}: can reopen`,await panel.evaluate(e=>e.open));
  if(scenario==='real'||scenario==='late-readiness')await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-booking-frame]')).opacity)===1);
  await page.screenshot({path:resolve(dir,`${width}-${scenario}.png`)});
  report.observations.push({width,scenario,text:await panel.textContent(),aria:await panel.ariaSnapshot()});
  await context.close();
 }
}catch(e){report.fatal=String(e);process.exitCode=1;}finally{
 await browser.close();report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,total:report.checks.length};writeFileSync(resolve(dir,'calendar.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,failures:report.checks.filter(c=>c.status==='FAIL'),fatal:report.fatal}));if(report.checks.some(c=>c.status==='FAIL'))process.exitCode=1;
}
