import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {MUSCLES} from '../src/anatomy/muscles.js';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let passed=0;const errors=[];
const check=(name,ok)=>{assert.ok(ok,name);passed++;console.log(`  PASS  ${name}`);};
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference'});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.URL||'http://localhost:8123',{timeout:90000});await page.waitForFunction(()=>!document.querySelector('#loading')||document.querySelector('#loading').classList.contains('gone'));
  const choose=async id=>{if(mobile&&!await page.locator('#panel').evaluate(e=>e.classList.contains('open')))await page.click('#panel-toggle');await page.fill('#search',MUSCLES.find(m=>m.id===id).name);await page.locator('#results .result').first().click();};
  const cases=mobile?[['latissimus-dorsi','Shoulder adduction']]:[
   ['deltoid-lateral','Shoulder abduction'],['latissimus-dorsi','Shoulder adduction'],['biceps-long','Elbow flexion'],['rectus-femoris','Knee extension'],['soleus','Plantarflexion'],['iliacus','Hip flexion'],
  ];
  for(const [id,title]of cases){
   await choose(id);
   check(`${mobile?'phone':'desktop'}: ${title} has the intended guide`,await page.isVisible('#motion-pane')&&(await page.textContent('#motion-caption'))===title);
   check(`${title}: diagram is explicitly schematic`,(await page.textContent('.motion-heading span'))==='Schematic'&&(await page.locator('#motion-drawing svg').getAttribute('aria-label')).startsWith('Simplified'));
   if(!mobile&&id==='deltoid-lateral'){
    await page.click('#motion-play');const before=await page.locator('.motion-limb').evaluate(e=>getComputedStyle(e).transform);await page.waitForFunction(previous=>getComputedStyle(document.querySelector('.motion-limb')).transform!==previous,before,{timeout:30000});const after=await page.locator('.motion-limb').evaluate(e=>getComputedStyle(e).transform);
    check('playing movement actually animates the diagram',before!==after&&await page.locator('#motion-pane').getAttribute('data-playing')==='true');
    await page.click('#motion-play');check('stop ends animation',await page.locator('#motion-pane').getAttribute('data-playing')==='false');await page.emulateMedia({reducedMotion:'reduce'});
   }
  }
  if(mobile){
   await page.click('#panel-toggle');check('phone: movement shortcut is available in the compact card',await page.isVisible('#peek-motion'));
   await page.click('#peek-motion');check('phone: movement shortcut opens full details',await page.locator('#panel').evaluate(e=>e.classList.contains('open'))&&await page.isVisible('#motion-play'));
  }
  await page.click('#motion-play');
  check('reduced motion uses a static end pose',(await page.textContent('#motion-play'))==='Show start position'&&await page.locator('.motion-limb').evaluate(e=>getComputedStyle(e).animationName)==='none');
  if(mobile){await page.click('#panel-toggle');check('closing phone details stops movement',await page.locator('#motion-pane').getAttribute('data-playing')==='false');}
  else{await page.click('#quiz-start');check('starting a quiz stops movement',await page.locator('#motion-pane').getAttribute('data-playing')==='false');await page.click('#quiz-exit');}
  await choose('coracobrachialis');check('unsupported muscles never keep a stale movement diagram',await page.isHidden('#motion-pane'));
  await page.close();
 }
 check('tissue shading and movement produce no browser errors',errors.length===0);console.log(`\n${passed} movement and tissue checks passed`);
}finally{await browser.close();}
