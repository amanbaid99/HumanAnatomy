import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
try {
 for (const mobile of (process.env.GUIDE_VIEW === 'phone' ? [true] : process.env.GUIDE_VIEW === 'desktop' ? [false] : [false,true])) {
  const page = await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce',colorScheme:'dark'});
  page.setDefaultTimeout(90000); const errors=[];
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.URL || 'http://localhost:8123');
  await page.waitForFunction(()=>!document.querySelector('#loading')||document.querySelector('#loading').classList.contains('gone'));
  for(const [id,names] of [['chest-dissection',['Pectoralis major','Pectoralis minor','Serratus anterior']],['hip-dissection',['Gluteus maximus','Gluteus medius','Gluteus minimus']]]) {
   await page.click('#study-picker summary'); await page.click(`[data-study="${id}"]`);
   check((await page.textContent('#study-muscle'))===names[0],`${id} starts at the surface`);
   check(await page.isDisabled('#study-prev'),'previous disabled at start');
   check((await page.textContent('#study-next')).startsWith('Peel '),'next describes the peel');
   await page.click('#study-next');
   check((await page.textContent('#study-muscle'))===names[1],'deeper muscle selected');
   check((await page.textContent('#hidden-count'))==='1','one muscle removed');
   check((await page.textContent('#hidden-muscle-list')).includes(names[0]+' (right)'),'only right side peeled');
   await page.click('#study-prev'); check((await page.textContent('#hidden-count'))==='0','previous replaces the removed layer');
   await page.click('#study-next');await page.click('#study-next');
   check((await page.textContent('#hidden-count'))==='2','cumulative peel');
   check((await page.textContent('#study-muscle'))===names[2],'third structure selected');
   if(mobile) {const guide=await page.locator('#study-guide').boundingBox(),peek=await page.locator('#peek').boundingBox();check(guide.y+guide.height<peek.y,'mobile guide and details do not overlap');}
   if(process.env.GUIDE_SCREENSHOTS) await page.screenshot({path:`work/${mobile?'phone':'desktop'}-${id}.png`,timeout:90000});
   await page.click('#study-next'); check(await page.isHidden('#study-guide'),'finish closes guide');check((await page.textContent('#hidden-count'))==='0','finish restores all muscles');
  }
  if(mobile)await page.click('#panel-toggle');await page.check('#toggle-labels');if(mobile)await page.click('#panel-toggle');
  await page.waitForFunction(()=>document.querySelectorAll('#model-labels:not([hidden]) .model-name').length>0);
  const labels=page.locator('.model-name'); const count=await labels.count();check(count>0&&count<=(mobile?3:6),'label count limited');
  const boxes=await labels.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)check(boxes[i].right<=boxes[j].left||boxes[j].right<=boxes[i].left||boxes[i].bottom<=boxes[j].top||boxes[j].bottom<=boxes[i].top,'labels do not overlap');
  check(boxes.every(r=>r.left>=0&&r.right<=(mobile?390:1440)&&r.top>=0&&r.bottom<=(mobile?844:900)),'labels stay in viewport');
  await page.waitForFunction(() => { const c = document.querySelector('#scene canvas'); return Math.abs(c.width / c.clientWidth - c.height / c.clientHeight) < .02; });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  check(await page.evaluate(() => { const c = document.querySelector('#scene canvas'); return Math.abs(c.width / c.clientWidth - c.height / c.clientHeight) < .02; }), 'canvas backing size matches viewport aspect');
  const png = await page.screenshot({ path: process.env.GUIDE_SCREENSHOTS ? `work/${mobile?'phone':'desktop'}-muscle-labels.png` : undefined, timeout:90000 });
  check(await page.evaluate(async base64 => {
    const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
    const context=canvas.getContext('2d'); context.drawImage(image,0,0);
    const r=document.querySelector('#scene').getBoundingClientRect();
    const pixels=context.getImageData(Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)).data;
    let tissue=0;for(let i=0;i<pixels.length;i+=4) if(pixels[i]>55&&pixels[i]>pixels[i+1]*1.2&&pixels[i]>pixels[i+2]*1.15)tissue++;
    return tissue>r.width*r.height*.005;
  }, png.toString('base64')), 'model remains visibly rendered after mobile controls resize');
  const labelName=await labels.first().textContent();await labels.first().click();check((await page.textContent('#d-name'))===labelName,'label selects its muscle');
  await page.click('#return-body'); await page.click('#quiz-start');await page.waitForFunction(()=>document.querySelector('#model-labels').hidden);check(await page.isHidden('#model-labels'),'quiz hides names');
  await page.click('#quiz-exit');await page.waitForFunction(()=>!document.querySelector('#model-labels').hidden);check(await labels.count()>0,'labels return after quiz');
  if(mobile)await page.click('#panel-toggle');await page.uncheck('#toggle-labels');await page.waitForFunction(()=>document.querySelector('#model-labels').hidden);check(await page.isHidden('#model-labels'),'labels can be disabled');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');check(errors.length===0,errors.join('\n'));
  console.log(`${mobile?'Phone':'Desktop'}: dissections, reverse steps, restoration, labels, selection and quiz suppression passed`);await page.close();
 }
 console.log(`${checks} checks passed`);
}finally{await browser.close();}
