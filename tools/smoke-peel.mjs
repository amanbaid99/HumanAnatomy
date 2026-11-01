import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let assertions = 0;
try {
  for (const mobile of (process.env.PEEL_VIEW === 'phone' ? [true] : [false, true])) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1100, height: 850 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    page.setDefaultTimeout(90000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(process.env.URL || 'http://localhost:8123');
    await page.waitForFunction(() => !document.querySelector('#loading') || document.querySelector('#loading').classList.contains('gone'));
    async function find(name) {
      if (mobile && !await page.locator('#panel').evaluate(e => e.classList.contains('open'))) await page.click('#panel-toggle');
      await page.fill('#search', name);
      await page.locator('#results .result').first().click();
      assert.equal(await page.textContent('#d-name'), name); assertions++;
      if (mobile) await page.click('#panel-toggle');
    }
    async function hide() { await page.click(mobile ? '#peek-hide' : '#hide-muscle'); }
    async function count(value) { assert.equal(await page.textContent('#hidden-count'), String(value)); assertions++; }
    await find('Pectoralis major');
    await hide(); await count(1);
    assert.equal(await page.locator('#detail').isVisible(), false); assertions++;
    await page.locator('#restore-muscles').waitFor({ state: 'visible' }); assertions++;
    const restoreBox = await page.locator('#restore-muscles').boundingBox();
    const frontBox = await page.locator('[data-view="front"]').boundingBox();
    assert.ok(restoreBox.x + restoreBox.width <= frontBox.x, 'restore button overlaps camera controls'); assertions++;
    assert.equal(await page.locator('#hidden-muscle-list button').textContent(), 'Restore Pectoralis major (right)'); assertions++;
    if (process.env.PEEL_SCREENSHOTS) await page.screenshot({ path: `work/peel-${mobile ? 'phone' : 'desktop'}.png`, timeout: 90000 });
    await find('External oblique'); await hide(); await count(2);
    if (mobile) await page.click('#panel-toggle');
    await page.locator('#hidden-muscle-list button').filter({ hasText: 'Pectoralis major' }).click();
    await count(1);
    assert.ok(!(await page.locator('#hidden-muscle-list').textContent()).includes('Pectoralis')); assertions++;
    if (mobile) await page.click('#panel-toggle');
    await find('External oblique'); await count(0); // Search restores the selected hidden side.
    await hide(); await count(1);
    await page.click('#restore-muscles'); await count(0);
    assert.equal(await page.locator('#restore-muscles').isVisible(), false); assertions++;
    await find('Pectoralis major'); await hide();
    await page.click('#reset'); await count(0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assertions++;
    assert.deepEqual(errors, []); assertions++;
    await page.close();
    console.log(`${mobile ? 'Phone' : 'Desktop'}: hide, cumulative peeling, individual restore, search restore, restore all and full-body reset passed`);
  }
  console.log(`${assertions} checks passed`);
} finally { await browser.close(); }
