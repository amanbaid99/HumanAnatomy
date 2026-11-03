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
    check('pause ends animation',await page.evaluate(()=>{const b=document.querySelector('#motion-play'),p=document.querySelector('#motion-pane');if(p.dataset.playing!=='true')b.click();b.click();return p.dataset.playing==='false';}));
    await page.evaluate(()=>{const s=document.querySelector('#motion-progress');s.value='95';s.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#motion-play').click();});
    await page.waitForFunction(()=>document.querySelector('#motion-pane').dataset.playing==='false'&&document.querySelector('#motion-progress').value==='100');
    check('playback finishes once and offers replay',(await page.textContent('#motion-play'))==='Replay movement');
    check('replay starts from the beginning',await page.evaluate(()=>{const b=document.querySelector('#motion-play');b.click();const ok=document.querySelector('#motion-progress').value==='0';b.click();return ok;}));
    await page.emulateMedia({reducedMotion:'reduce'});
   }
  }
  if(mobile){
   await page.click('#panel-toggle');check('phone: movement shortcut is available in the compact card',await page.isVisible('#peek-motion'));
   await page.click('#peek-motion');check('phone: movement shortcut opens full details',await page.locator('#panel').evaluate(e=>e.classList.contains('open'))&&await page.isVisible('#motion-play'));
   await page.waitForFunction(()=>document.querySelector('.motion-heading').getBoundingClientRect().top>=document.querySelector('#panel-toggle').getBoundingClientRect().bottom);
   check('phone: sticky handle leaves the movement heading visible',await page.locator('.motion-heading').isVisible());
  }
  await choose('biceps-long');
  await page.locator('#motion-progress').evaluate(e=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));});
  check('slider shows the intermediate pose', (await page.textContent('#motion-position')).includes('50%') && await page.locator('#motion-pane').getAttribute('data-playing')==='false');
  await page.click('#motion-end');
  await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.motion-limb')).transform).a-Math.cos(110*Math.PI/180))<.005);
  check('finish control reaches the end pose',(await page.inputValue('#motion-progress'))==='100');
  await page.click('#motion-start');check('start control restores the start pose',(await page.inputValue('#motion-progress'))==='0');
  await page.locator('#motion-progress').focus();await page.keyboard.press('ArrowRight');check('movement slider supports the keyboard',(await page.inputValue('#motion-progress'))==='1');
  await page.locator('#motion-progress').scrollIntoViewIfNeeded();
  const track=await page.locator('#motion-progress').boundingBox();
  if(mobile)await page.touchscreen.tap(track.x+track.width*.75,track.y+track.height/2);else await page.mouse.click(track.x+track.width*.75,track.y+track.height/2);
  check('pointer and touch can scrub the movement',Number(await page.inputValue('#motion-progress'))>60);
  check('joint, direction and moving part are labelled',(await page.textContent('.motion-joint-name'))==='Elbow'&&await page.locator('.motion-direction').getAttribute('marker-end')==='url(#motion-arrow)'&&(await page.textContent('#motion-fixed-label'))==='Upper arm stays still');
  check('start and finish comparison and everyday example are present',(await page.locator('#motion-snapshots svg').count())===2&&(await page.textContent('#motion-example')).includes('cup')&&(await page.textContent('#motion-role')).includes('bend the elbow'));
  if(process.env.MOVEMENT_SCREENSHOTS){await page.locator('#motion-pane').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:`work/movement-${mobile?'phone':'desktop'}.png`,timeout:90000});}
  await page.click('#motion-play');
  check('reduced motion uses a static end pose',(await page.textContent('#motion-play'))==='Show start position'&&await page.locator('.motion-limb').evaluate(e=>getComputedStyle(e).animationName)==='none');
  if(mobile){await page.click('#panel-toggle');check('closing phone details stops movement',await page.locator('#motion-pane').getAttribute('data-playing')==='false');}
  else{await page.click('#quiz-start');check('starting a quiz stops movement',await page.locator('#motion-pane').getAttribute('data-playing')==='false');await page.click('#quiz-exit');}
  await choose('coracobrachialis');check('unsupported muscles never keep a stale movement diagram',await page.isHidden('#motion-pane'));
  await page.close();
 }
 check('tissue shading and movement produce no browser errors',errors.length===0);console.log(`\n${passed} movement and tissue checks passed`);
}finally{await browser.close();}
