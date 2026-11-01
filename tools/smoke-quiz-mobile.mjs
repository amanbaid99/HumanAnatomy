import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const packed=readFileSync(new URL('../assets/anatomy/atlas.bin.gz',import.meta.url));
const original=readFileSync(new URL('../assets/anatomy/atlas.bin',import.meta.url));
assert.deepEqual(gunzipSync(packed),original,'compressed model must reproduce every source byte');
assert.ok(packed.length<original.length*.5,'compressed download should be less than half the original');
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let passed=0;
const errors=[];
function check(name,ok){assert.ok(ok,name);passed++;console.log(`  PASS  ${name}`);}
async function loaded(page){await page.waitForFunction(()=>!document.querySelector('#loading')||document.querySelector('#loading').classList.contains('gone'));await page.waitForTimeout(100);}
async function boxes(page){return page.evaluate(()=>{
 const r=s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 return {scene:r('#scene'),actions:r('.stage-actions'),peek:r('#peek'),guide:r('#study-guide'),quiz:r('#quiz-card'),dock:r('#view-dock')};
});}
async function seedQuiz(page){await page.evaluate(()=>{window.__quizTestRandom=Math.random;Math.random=()=>.42;});await page.click('#quiz-start');await page.evaluate(()=>{Math.random=window.__quizTestRandom;delete window.__quizTestRandom;});}
try{
 for(const mobile of [true,false]){
  const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,colorScheme:'dark',reducedMotion:'reduce'});p.setDefaultTimeout(90000);
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const requests=[];p.on('request',r=>{if(/atlas\.bin(?:\.gz)?$/.test(r.url()))requests.push(r.url());});
  if(!mobile)await p.addInitScript(()=>Object.defineProperty(window,'DecompressionStream',{value:undefined,configurable:true}));
  await p.goto(process.env.URL||'http://localhost:8123',{waitUntil:'domcontentloaded',timeout:90000});
  await p.waitForSelector('#load-progress',{state:'attached'}).catch(()=>{});
  await loaded(p);
  const mode=mobile?'phone':'desktop';
  check(`${mode}: anatomy loads`,Number(await p.textContent('#muscle-total'))>100);
  check(`${mode}: ${mobile?'compressed download':'older-browser fallback'} works`,requests.some(url=>mobile?url.endsWith('.gz'):url.endsWith('.bin')));
  if(mobile){
   let b=await boxes(p);
   check('phone: header is outside the model',b.scene.y>=b.actions.bottom+8);
   check('phone: view controls are below the model',b.scene.bottom<=b.dock.y-6);
   await p.click('#panel-toggle');await p.fill('#search','latissimus');await p.locator('#results .result').first().click();await p.click('#panel-toggle');
   await p.waitForTimeout(250);b=await boxes(p);
   check('phone: selected model never sits behind its card',b.scene.bottom<=b.peek.y-8&&b.scene.height>250);
   check('phone: compact card stays in the lower half',b.peek.y>422&&b.peek.height<=190);
  }
  await seedQuiz(p);
  check(`${mode}: quiz starts at question one`,(await p.textContent('#quiz-progress'))==='Question 1 of 5');
  check(`${mode}: question has four unique answers`,new Set(await p.locator('#quiz-choices button').allTextContents()).size===4);
  check(`${mode}: muscle name and normal details are withheld`,await p.isHidden('#peek')&&await p.isHidden('#detail')&&!(await p.textContent('#selection-status')).includes('External oblique'));
  let b=await boxes(p);
  check(`${mode}: quiz leaves the model visible`,b.scene.height>180&&(mobile?b.scene.bottom<=b.quiz.y-8:b.scene.right<=b.quiz.x));
  const expected=['External oblique','Sternocleidomastoid','Soleus','Deltoid, lateral head','Gluteus medius'];
  let score=0;
  for(let i=0;i<5;i++){
   const correct=i!==0&&i!==4;
   if(correct){await p.locator('#quiz-choices button').filter({hasText:expected[i]}).click();score++;}
   else await p.locator('#quiz-choices button').first().click();
   check(`${mode}: round ${i+1} reveals the actual answer`,(await p.textContent('#quiz-answer')).endsWith(expected[i]));
   check(`${mode}: round ${i+1} scores once`,(await p.textContent('#quiz-score'))===`${score} correct from ${i+1} answered`&&(await p.locator('#quiz-choices button:disabled').count())===4);
   check(`${mode}: round ${i+1} explains action and nerve`,(await p.textContent('#quiz-action')).length>20&&(await p.textContent('#quiz-nerve')).length>20);
   await p.click('#quiz-next');
  }
  check(`${mode}: quiz finishes with the correct score`,(await p.textContent('#quiz-question'))==='3 out of 5'&&(await p.textContent('#quiz-progress'))==='Quiz complete');
  await p.click('#quiz-restart');
  check(`${mode}: restart resets progress and score`,(await p.textContent('#quiz-progress'))==='Question 1 of 5'&&(await p.textContent('#quiz-score'))==='0 correct so far');
  await p.keyboard.press('Escape');
  check(`${mode}: Escape restores exploration`,await p.isHidden('#quiz-card')&&!(await p.locator('body').evaluate(e=>e.classList.contains('quiz-mode'))));
  await p.click('#quiz-start');
  if(mobile){await p.click('#panel-toggle');check('phone: explore control exits quiz and opens details',await p.isHidden('#quiz-card')&&await p.locator('#panel').evaluate(e=>e.classList.contains('open')));await p.click('#panel-toggle');}
  else await p.click('#quiz-exit');
  check(`${mode}: page has no horizontal scrolling`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.close();
 }
 for(const dims of [{width:360,height:640},{width:844,height:390}]){
  const p=await browser.newPage({viewport:dims,deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});p.setDefaultTimeout(90000);
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.URL||'http://localhost:8123',{timeout:90000});await loaded(p);
  await p.click('#study-picker summary');await p.click('[data-study="knee"]');await p.waitForTimeout(100);
  let b=await boxes(p);
  check(`${dims.width}px: guide and card leave a usable viewport`,b.scene.height>=100&&b.scene.bottom<=b.peek.y-8&&(dims.width>dims.height?b.scene.x>=b.guide.right+8:b.scene.y>=b.guide.bottom+8));
  await p.click('#return-body');await p.click('#quiz-start');await p.waitForTimeout(100);b=await boxes(p);
  check(`${dims.width}px: quiz never covers the model`,b.scene.height>=120&&(dims.width>dims.height?b.scene.x>=b.quiz.right+8:b.scene.bottom<=b.quiz.y-8));
  await p.locator('#quiz-choices button').last().scrollIntoViewIfNeeded();
  check(`${dims.width}px: all answer choices remain reachable`,await p.locator('#quiz-choices button').last().isVisible());
  check(`${dims.width}px: no horizontal page overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.close();
 }
 // A failed download must give a usable retry, rather than an endless spinner.
 const p=await browser.newPage();p.setDefaultTimeout(90000);
 await p.route('**/atlas.bin.gz',r=>r.abort());
 await p.goto(process.env.URL||'http://localhost:8123',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('#load-retry',{state:'visible'});
 check('failed download offers retry',await p.isVisible('#load-retry')&&(await p.textContent('#loading p')).includes('try again'));
 await p.unroute('**/atlas.bin.gz');await p.click('#load-retry');await loaded(p);
 check('retry loads the model',Number(await p.textContent('#muscle-total'))>100);await p.close();
 check('successful views have no browser errors',errors.length===0);
 console.log(`\n${passed} quiz, loading and mobile-layout checks passed`);
}finally{await browser.close();}
