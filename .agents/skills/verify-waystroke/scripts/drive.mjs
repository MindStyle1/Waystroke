#!/usr/bin/env node
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const [url='http://127.0.0.1:4173/',dirArg='output/playwright/verify-waystroke',feature='all']=process.argv.slice(2);
if(!['all','navigation','gallery','faq','language','contacts'].includes(feature))throw Error('Unknown feature: '+feature);
const target=new URL(url);if(!['http:','https:'].includes(target.protocol))throw Error('Expected HTTP(S) target');
const dir=resolve(dirArg);mkdirSync(dir,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=process.env.WAYSTROKE_PLAYWRIGHT_MODULE?await import(process.env.WAYSTROKE_PLAYWRIGHT_MODULE):require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.WAYSTROKE_CHROME?{executablePath:process.env.WAYSTROKE_CHROME}:{})});
const report={url,feature,browser:browser.version(),time:new Date().toISOString(),checks:[],observations:[],blocked:[],errors:[],requestsFailed:[]};
const check=(name,condition,detail)=>report.checks.push({name,status:condition?'PASS':'FAIL',detail});
const wanted=name=>feature==='all'||feature===name;
try{
for(const profile of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844},{name:'narrow',width:320,height:800}]){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.name!=='desktop',hasTouch:profile.name!=='desktop'});
 // Isolate only production write/analytics boundaries. Calendar GETs remain real.
 await context.route('https://track.waystroke.online/**',r=>{report.blocked.push({profile:profile.name,url:r.request().url(),method:r.request().method(),body:r.request().postData()});return r.fulfill({status:204,headers:{'access-control-allow-origin':'*'}});});
 await context.route('**/cdn-cgi/rum*',r=>{report.blocked.push({profile:profile.name,url:r.request().url(),method:r.request().method()});return r.fulfill({status:204});});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({profile:profile.name,type:'pageerror',message:String(e)}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({profile:profile.name,type:'console',message:m.text()});});
 page.on('requestfailed',r=>report.requestsFailed.push({profile:profile.name,url:r.url(),failure:r.failure()}));
 const responses=[];page.on('response',r=>responses.push({url:r.url(),status:r.status(),contentType:r.headers()['content-type']}));
 await page.addInitScript(()=>{window.__verifyMetrics={lcp:0,shifts:[],events:[]};new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__verifyMetrics.lcp=e.startTime)).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)window.__verifyMetrics.shifts.push({value:e.value,start:e.startTime});})).observe({type:'layout-shift',buffered:true});try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__verifyMetrics.events.push({name:e.name,duration:e.duration,interactionId:e.interactionId}))).observe({type:'event',buffered:true,durationThreshold:16});}catch{}});
 const response=await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));await page.waitForTimeout(3000);
 check(`${profile.name}: HTTP`,response.status()===200,response.status());
 check(`${profile.name}: hero visible`,await page.locator('#hero-title').isVisible());
 await page.screenshot({path:resolve(dir,`${profile.name}-hero.png`)});
 const meta=await page.evaluate(()=>({lang:document.documentElement.lang,title:document.title,description:document.querySelector('meta[name=description]')?.content,canonical:document.querySelector('link[rel=canonical]')?.href,og:[...document.querySelectorAll('meta[property^="og:"]')].map(e=>({property:e.getAttribute('property'),content:e.content})),headings:[...document.querySelectorAll('main>section')].map(e=>({id:e.id,class:e.className,text:e.querySelector('h2,h1')?.textContent.trim()}))}));
 report.observations.push({profile:profile.name,metadata:meta});
 if(wanted('navigation')){
  if(profile.name!=='desktop'){
   const toggle=page.getByRole('button',{name:'Меню',exact:true});await toggle.focus();await page.keyboard.press('Enter');await page.waitForTimeout(400);check(`${profile.name}: keyboard menu open`,await toggle.getAttribute('aria-expanded')==='true');
   await page.keyboard.press('Tab');check(`${profile.name}: Tab enters menu`,await page.locator('#mobile-menu a').first().evaluate(e=>e===document.activeElement));
   await page.keyboard.press('Escape');await page.waitForTimeout(300);check(`${profile.name}: Escape closes menu and restores focus`,await toggle.getAttribute('aria-expanded')==='false'&&await toggle.evaluate(e=>e===document.activeElement));
  }
  for(const id of ['design','services','contact']){
   const nav=profile.name==='desktop'?page.locator(`.nav a[href="#${id}"]`):page.locator(`#mobile-menu .mobile-menu__nav a[href="#${id}"]`);
   if(profile.name!=='desktop')await page.getByRole('button',{name:'Меню',exact:true}).click();
   await nav.click();await page.waitForTimeout(2600);
   const position=await page.locator(`#${id} h2`).first().evaluate(e=>({top:e.getBoundingClientRect().top,header:document.querySelector('.site-header').getBoundingClientRect().bottom}));
   check(`${profile.name}: navigation ${id}`,position.top>=position.header-4&&position.top<profile.height,position);
   check(`${profile.name}: clean navigation URL`,!new URL(page.url()).hash);
  }
 }
 if(wanted('gallery')){
  for(const key of ['sdvig','miora','moto','kroshka','exhibit','saldo']){
   const card=page.locator(`button[data-concept="${key}"]`);await card.scrollIntoViewIfNeeded();await card.click();
   const dialog=page.getByRole('dialog');await dialog.waitFor({state:'visible'});
   check(`${profile.name}: ${key} dialog heading`,!!(await dialog.locator('h2').textContent())?.trim());
   check(`${profile.name}: ${key} close focused`,await dialog.locator('button').first().evaluate(e=>e===document.activeElement));
   await page.keyboard.press('Tab');await page.keyboard.press('Tab');check(`${profile.name}: ${key} focus cycles back to modal`,await dialog.evaluate(e=>e.contains(document.activeElement))); 
   if(key==='sdvig')await page.screenshot({path:resolve(dir,`${profile.name}-dialog.png`)});
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   check(`${profile.name}: ${key} restores opener`,await card.evaluate(e=>e===document.activeElement));
  }
 }
 if(wanted('faq')){
  const details=page.locator('.faq details');check(`${profile.name}: FAQ count`,await details.count()===6);
  for(let i=0;i<await details.count();i++){
   const d=details.nth(i),s=d.locator('summary');await s.scrollIntoViewIfNeeded();await s.focus();await page.keyboard.press('Enter');await page.waitForTimeout(600);check(`${profile.name}: FAQ ${i+1} opens`,await d.evaluate(e=>e.open));await page.keyboard.press('Enter');await page.waitForTimeout(600);check(`${profile.name}: FAQ ${i+1} closes`,!await d.evaluate(e=>e.open));
  }
 }
 if(wanted('language')){
  await page.getByRole('button',{name:'EN',exact:true}).click();await page.waitForTimeout(200);
  check(`${profile.name}: EN language and URL`,await page.locator('html').getAttribute('lang')==='en'&&new URL(page.url()).searchParams.get('lang')==='en');
  check(`${profile.name}: EN metadata aligned`,await page.evaluate(()=>['meta[property="og:title"]','meta[name="twitter:title"]'].every(s=>document.querySelector(s)?.content===document.title)&&document.querySelector('meta[property="og:locale"]')?.content==='en_US'&&['meta[property="og:description"]','meta[name="twitter:description"]'].every(s=>document.querySelector(s)?.content===document.querySelector('meta[name="description"]')?.content)));
  report.observations.push({profile:profile.name,english:{title:await page.title(),h1:await page.locator('h1').textContent(),og:await page.locator('meta[property="og:title"]').getAttribute('content')}});
  await page.reload();await page.waitForFunction(()=>document.documentElement.lang==='en');check(`${profile.name}: EN survives reload`,await page.getByRole('button',{name:'EN',exact:true}).getAttribute('aria-pressed')==='true');
  await page.getByRole('button',{name:'RU',exact:true}).click();check(`${profile.name}: RU restores`,await page.locator('html').getAttribute('lang')==='ru'&&!new URL(page.url()).searchParams.has('lang'));
 }
 if(wanted('contacts')){
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
  for(const [host,path] of [['t.me','/waystroke'],['cal.com','/mind-style-00/waystroke-call']]){
   const links=page.locator(`a[href="https://${host}${path}"]`);check(`${profile.name}: ${host} links`,await links.count()>=2);
   const link=links.first();const popupPromise=context.waitForEvent('page',{timeout:10000}).catch(()=>null);await link.click();const popup=await popupPromise;
   // Popup often opens before wait registration; inspect context pages as fallback.
   const opened=popup||context.pages().find(p=>p!==page);
   if(opened){await opened.waitForLoadState('domcontentloaded',{timeout:15000}).catch(()=>{});check(`${profile.name}: ${host} opens real destination`,opened.url().startsWith(`https://${host}${path}`),opened.url());await opened.screenshot({path:resolve(dir,`${profile.name}-${host}.png`)}).catch(()=>{});await opened.close();}else check(`${profile.name}: ${host} popup`,false);
  }
  await page.waitForTimeout(8500);report.observations.push({profile:profile.name,calendar:{frames:page.frames().map(f=>f.url()),fallback:await page.locator('.cal').textContent(),responses:responses.filter(r=>r.url.includes('cal.com'))}});
 }
 for(const selector of ['.hero','#design','#services','.team','.faq','#contact']){
  await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(500);
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&getComputedStyle(e).position!=='fixed';}).slice(0,8).map(e=>e.className)}));
  check(`${profile.name}: reflow ${selector}`,overflow.scroll<=overflow.width+1,overflow);
 }
 await page.screenshot({path:resolve(dir,`${profile.name}-page.png`),fullPage:true});
 writeFileSync(resolve(dir,`${profile.name}-aria.yml`),await page.locator('body').ariaSnapshot());
 report.observations.push({profile:profile.name,metrics:await page.evaluate(()=>window.__verifyMetrics),network:responses,images:await page.locator('img').evaluateAll(es=>es.map(e=>({src:e.currentSrc,loaded:e.complete&&e.naturalWidth>0,width:e.width,naturalWidth:e.naturalWidth,alt:e.alt}))),focus:await page.locator('a').first().evaluate(e=>{e.focus();const s=getComputedStyle(e);return {outline:s.outline,boxShadow:s.boxShadow,top:e.getBoundingClientRect().top};})});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));await page.waitForTimeout(1000);
 check(`${profile.name}: reduced-motion hero`,await page.locator('#hero-title').isVisible());
 if(wanted('navigation')){
  for(const id of ['design','services','contact']){
   if(profile.name!=='desktop')await page.getByRole('button',{name:'Меню',exact:true}).click();
   const nav=profile.name==='desktop'?page.locator(`.nav a[href="#${id}"]`):page.locator(`#mobile-menu .mobile-menu__nav a[href="#${id}"]`);
   await nav.waitFor({state:'visible'});await nav.focus();check(`${profile.name}: reduced-motion link focused ${id}`,await nav.evaluate(e=>e===document.activeElement));await page.keyboard.press('Enter');await page.waitForTimeout(300);
   const position=await page.locator(`#${id} h2`).first().evaluate(e=>({top:e.getBoundingClientRect().top,header:document.querySelector('.site-header').getBoundingClientRect().bottom}));
   check(`${profile.name}: reduced-motion keyboard navigation ${id}`,position.top>=position.header-4&&position.top<profile.height,position);
  }
 }
 report.observations.push({profile:profile.name,reducedMotion:await page.evaluate(()=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,animations:document.getAnimations().map(a=>({state:a.playState,target:a.effect?.target?.className}))}))});
 check(`${profile.name}: first-party assets`,responses.filter(r=>new URL(r.url).origin===target.origin).every(r=>r.status<400&&(!/\.js$/.test(new URL(r.url).pathname)||/javascript/.test(r.contentType||''))&&(!/\.css$/.test(new URL(r.url).pathname)||/text\/css/.test(r.contentType||''))));
 check(`${profile.name}: no uncaught application errors`,!report.errors.some(e=>e.profile===profile.name&&e.type==='pageerror'));
 await context.close();
}
}catch(e){report.fatal=String(e);process.exitCode=1;}finally{await browser.close();report.summary={passed:report.checks.filter(c=>c.status==='PASS').length,total:report.checks.length};writeFileSync(resolve(dir,'journeys.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,failures:report.checks.filter(c=>c.status==='FAIL'),fatal:report.fatal,evidence:dir}));if(report.checks.some(c=>c.status==='FAIL'))process.exitCode=1;}
