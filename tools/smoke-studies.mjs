// Guided navigation, escape from scoped views, and real touch targeting.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let passed=0;
const errors=[];
const check=(name,ok)=>{assert.ok(ok,name);console.log(`  PASS  ${name}`);passed++;};
try {
  const viewports = process.env.STUDY_VIEWPORT === 'phone' ? [true] : process.env.STUDY_VIEWPORT === 'desktop' ? [false] : [false, true];
  for (const mobile of viewports) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
    page.setDefaultTimeout(60000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(process.env.URL||'http://localhost:8123',{timeout:60000});
    await page.waitForSelector('#study-options button',{state:'attached'});
    await page.waitForFunction(()=>!document.querySelector('#loading')||document.querySelector('#loading').classList.contains('gone'));
    const total=Number(await page.textContent('#muscle-total'));
    const mode=mobile?'phone':'desktop';
    const openStudy=async id=>{await page.click('#study-picker summary');await page.click(`[data-study="${id}"]`);};
    for (const [id,first,second,third] of (process.env.STUDY_SKIP_TOURS ? [] : [
      ['shoulder','Deltoid, lateral','Supraspinatus','Subscapularis'],
      ['knee','Rectus femoris','Vastus medialis','Gastrocnemius, medial head'],
      ['hip','Gluteus maximus','Gluteus medius','Iliacus'],
      ['spine','Erector spinae','Multifidus','Quadratus lumborum'],
    ])) {
      await openStudy(id);
      check(`${mode}: ${id} starts with the intended muscle`,(await page.textContent('#d-name')).startsWith(first));
      check(`${mode}: ${id} keeps muscles visible`,Number(await page.textContent('#stat-visible'))>0&&Number(await page.textContent('#stat-visible'))<total);
      check(`${mode}: ${id} starts at step one`,(await page.textContent('#study-progress')).endsWith('1 of 3')&&await page.isDisabled('#study-prev'));
      await page.click('#study-next');
      check(`${mode}: ${id} advances`,(await page.textContent('#d-name')).startsWith(second));
      if(id==='shoulder'||id==='hip') check(`${mode}: ${id} peels superficial tissue`,!(await page.isChecked('[data-layer="1"]')));
      await page.click('#study-prev');
      check(`${mode}: ${id} can go back`,(await page.textContent('#d-name')).startsWith(first));
      await page.click('#study-next');await page.click('#study-next');
      check(`${mode}: ${id} reaches the last stop`,(await page.textContent('#d-name')).startsWith(third));
      if(mobile){
        const guide=await page.locator('#study-guide').boundingBox(),peek=await page.locator('#peek').boundingBox();
        check(`phone: ${id} guide leaves the muscle card usable`,guide&&peek&&guide.y+guide.height<peek.y);
      }
      await page.click('#study-next');
      check(`${mode}: ${id} finishes at full body`,await page.isHidden('#study-guide')&&Number(await page.textContent('#stat-visible'))===total&&await page.isHidden('#return-body'));
    }
    await openStudy('shoulder');
    if(mobile)await page.click('#panel-toggle');
    await page.fill('#search','latissimus');await page.locator('#results .result').first().click();
    check(`${mode}: search escapes the study filter`,await page.isHidden('#study-guide')&&(await page.textContent('#d-name'))==='Latissimus dorsi'&&Number(await page.textContent('#stat-visible'))===total);
    await page.click('#detail-full-body');
    check(`${mode}: full-body shortcut clears search and selection`,(await page.inputValue('#search'))===''&&await page.isHidden('#detail')&&Number(await page.textContent('#stat-visible'))===total);
    check(`${mode}: study menu closes with Escape`,await (async()=>{await page.click('#study-picker summary');await page.keyboard.press('Escape');return !(await page.locator('#study-picker').evaluate(e=>e.open));})());
    check(`${mode}: no horizontal scrolling`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(mobile){
      await page.click('#reset');await page.waitForTimeout(1800);
      const png=await page.screenshot({timeout:60000});
      const points=await page.evaluate(async base64=>{
        const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
        const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
        const y=Math.round(innerHeight*.36),pixels=ctx.getImageData(0,y,c.width,1).data;
        const red=x=>pixels[x*4]>pixels[x*4+1]*1.22&&pixels[x*4]>pixels[x*4+2]*1.15;
        const xs=Array.from({length:c.width},(_,x)=>x).filter(red);if(!xs.length)return null;
        const left=xs[0],right=xs.at(-1);const gaps=[];for(let x=left+12;x<right-12;x++)if(!red(x))gaps.push(x);
        return {edge:{x:left-4,y},seam:{x:gaps.length?gaps[Math.floor(gaps.length/2)]:(left+right)/2,y}};
      },png.toString('base64'));
      check('phone: a visible muscle edge is available for touch test',!!points);
      await page.mouse.click(points.edge.x,points.edge.y);
      check('phone: the test point is outside the exact muscle hit',await page.isHidden('#peek'));
      await page.touchscreen.tap(points.edge.x,points.edge.y);
      check('phone: touch tolerance finds the nearby muscle',!(await page.isHidden('#peek'))||!(await page.isHidden('#pick-choices')));
      if(!(await page.isHidden('#pick-choices')))await page.locator('#pick-options button').first().click();
      check('phone: assisted selection names the muscle',(await page.textContent('#peek-name')).length>3);
      check('phone: full-body shortcut is reachable above the card',await page.locator('#return-body').isVisible());
      await page.click('#return-body');await page.waitForTimeout(1800);
      const cdp=await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points.seam.x,y:points.seam.y}]});
      await page.waitForTimeout(600);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      check('phone: a held touch offers nearby choices',!(await page.isHidden('#pick-choices')));
      check('phone: nearby choices are named and bounded',(await page.locator('#pick-options button').count())>=2&&(await page.locator('#pick-options button').count())<=4);
      await page.keyboard.press('Escape');
      check('phone: choices dismiss with Escape',await page.isHidden('#pick-choices'));
      await page.click('#reset');await page.waitForTimeout(1800);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:165,y:350},{id:2,x:220,y:350}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      check('phone: two-finger gestures never select a muscle',await page.isHidden('#peek')&&await page.isHidden('#pick-choices'));
    }
    await page.close();
  }
  check('no browser errors',errors.length===0);
  console.log(`\n${passed} study and selection checks passed`);
}finally{await browser.close();}
