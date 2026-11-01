// Preserve URL muscle/heatmap entry points when moving between new modes.
import{chromium}from'playwright';
import assert from'node:assert/strict';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let passed=0;const errors=[];
const check=(name,ok)=>{assert.ok(ok,name);passed++;console.log(`  PASS  ${name}`);};
const base=process.env.URL||'http://localhost:8123';
async function open(query){const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,colorScheme:'light',reducedMotion:'reduce'});p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(base+query,{timeout:90000});await p.waitForFunction(()=>!document.querySelector('#loading')||document.querySelector('#loading').classList.contains('gone'));return p;}
async function goldPixels(page){const png=await page.locator('#scene canvas').screenshot({timeout:90000});return page.evaluate(async b64=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>130&&d[i+1]>100&&d[i]>d[i+1]*1.03&&d[i+2]<d[i+1]*.65)n++;return n;},png.toString('base64'));}
try{
 let p=await open('?muscles=latissimus-dorsi,biceps-long&view=back&theme=dark&embed=1');
 check('linked theme overrides the system theme',await p.locator('html').getAttribute('data-theme')==='dark');
 check('embedded title is hidden',await p.isHidden('#masthead'));
 check('named muscle opens its card',(await p.textContent('#peek-name')).startsWith('Latissimus dorsi'));
 check('both named muscles are retained',(await p.textContent('#selection-status')).includes('2 highlighted muscles'));
 let r=await p.evaluate(()=>({scene:document.querySelector('#scene').getBoundingClientRect().toJSON(),actions:document.querySelector('.stage-actions').getBoundingClientRect().toJSON(),peek:document.querySelector('#peek').getBoundingClientRect().toJSON()}));
 check('embedded viewport uses the compact header',r.scene.y<100&&r.scene.y>=r.actions.bottom+8&&r.scene.bottom<=r.peek.y-8);
 await p.click('#study-picker summary');await p.click('[data-study="knee"]');
 r=await p.evaluate(()=>({scene:document.querySelector('#scene').getBoundingClientRect().toJSON(),guide:document.querySelector('#study-guide').getBoundingClientRect().toJSON(),actions:document.querySelector('.stage-actions').getBoundingClientRect().toJSON()}));
 check('embedded guide has no overlap',r.guide.y>=r.actions.bottom+8&&r.scene.y>=r.guide.bottom+8&&r.scene.height>100);
 await p.click('#return-body');check('finishing a guide restores linked highlights',(await p.textContent('#selection-status')).includes('2 highlighted muscles'));
 await p.click('#quiz-start');check('quiz mode withholds linked answers',await p.isHidden('#peek')&&(await p.textContent('#selection-status'))==='Quiz muscle highlighted. Rotate to inspect it.');
 await p.click('#quiz-exit');check('exiting quiz restores linked context',(await p.textContent('#selection-status')).includes('2 highlighted muscles')&&await p.isHidden('#quiz-card'));
 check('embedded page never scrolls sideways',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.close();
 p=await open('?heat=soleus:0.2,pectoralis-major:1,not-a-muscle:2&view=back&theme=light');
 check('heatmap ignores unknown muscles',(await p.textContent('#selection-status')).includes('2 highlighted muscles'));
 check('heatmap without a named main muscle has no detail card',await p.isHidden('#peek'));
 const before=await goldPixels(p);check('low-heat muscle has amber surface pixels',before>10);
 await p.click('#quiz-start');await p.click('#quiz-exit');await p.click('[data-view="back"]');
 const after=await goldPixels(p);check('heatmap colours survive quiz entry and exit',after>10&&after>before*.3);
 check('heatmap theme survives mode changes',await p.locator('html').getAttribute('data-theme')==='light');await p.close();
 p=await open('?muscles=invalid&heat=soleus:NaN,invalid:.8&theme=other&embed=bad');
 check('invalid link values leave a working atlas',Number(await p.textContent('#stat-visible'))===Number(await p.textContent('#muscle-total'))&&await p.isVisible('#masthead')&&await p.isHidden('#peek'));
 await p.close();check('linked modes have no browser errors',errors.length===0);console.log(`\n${passed} link-integration checks passed`);
}finally{await browser.close();}
