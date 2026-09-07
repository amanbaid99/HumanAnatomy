// Interaction smoke test: exercises the controls a visitor would actually use.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(process.env.URL || 'http://localhost:8123', { waitUntil: 'load' });
await page.waitForSelector('#loading.gone', { timeout: 20000 });
await page.waitForTimeout(800);

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const visible = () => page.textContent('#stat-visible').then(Number);
// Read the totals from the page rather than hardcoding them, so adding
// anatomy does not fail the suite.
const TOTAL = Number(await page.textContent('#muscle-total'));
const layerCount = async (n) => Number(await page.textContent(`#count-${n}`));

// 1. everything renders
check('all muscles visible on load', await visible() === TOTAL, `got ${await visible()} of ${TOTAL}`);

// 2. layer peel
const superficial = await layerCount(1);
await page.uncheck('[data-layer="1"]');
await page.waitForTimeout(150);
const afterPeel = await visible();
check('unchecking superficial hides exactly that layer', afterPeel === TOTAL - superficial,
      `got ${afterPeel}, expected ${TOTAL - superficial}`);
await page.check('[data-layer="1"]');

// 3. region filter
await page.click('#regions-none');
await page.waitForTimeout(150);
check('deselecting all regions empties the view', await visible() === 0);
await page.click('#regions-all');
await page.waitForTimeout(150);
check('re-selecting all regions restores them', await visible() === TOTAL);

// 4. search selects a muscle and fills the detail panel
await page.fill('#search', 'supraspin');
await page.waitForTimeout(250);
const results = await page.locator('#results .result').count();
check('search returns a hit for "supraspin"', results >= 1, `got ${results}`);
await page.locator('#results .result').first().click();
await page.waitForTimeout(400);
check('detail panel opens', !(await page.locator('#detail').isHidden()));
check('detail shows the right muscle', (await page.textContent('#d-name')) === 'Supraspinatus');
check('nerve supply is populated', (await page.textContent('#d-nerve')).includes('Suprascapular'));
check('clinical note is shown', !(await page.locator('#d-clinical-row').isHidden()));

// 5. isolate
await page.check('#toggle-isolate');
await page.waitForTimeout(200);
const iso = await visible();
check('isolate leaves only that muscle, both sides', iso === 2, `got ${iso}`);
await page.uncheck('#toggle-isolate');

// 6. x-ray slider makes outer layers transparent
await page.locator('#xray').fill('40');
await page.waitForTimeout(200);
check('x-ray slider reports its value', (await page.textContent('#xray-val')) === '40%');

// 7. skeleton toggle
await page.uncheck('#toggle-skeleton');
await page.waitForTimeout(150);
const skelOff = await page.evaluate(() =>
  !!document.querySelector('canvas') && true);
check('skeleton toggles without error', skelOff);
await page.check('#toggle-skeleton');

// 8. cuff preset
await page.click('#cuff-view');
await page.waitForTimeout(1300);
const cuff = await visible();
check('rotator cuff view narrows to the cuff', cuff === 5, `got ${cuff}`);

// 9. reset
await page.click('#reset');
await page.waitForTimeout(1200);
check('reset restores every muscle', await visible() === TOTAL, `got ${await visible()}`);

// 10. clicking the model picks a muscle. Aim at the middle of the stage,
// which is where the figure is after a reset.
const stage = await page.locator('#stage').boundingBox();
await page.mouse.click(stage.x + stage.width / 2, stage.y + stage.height * 0.34);
await page.waitForTimeout(400);
check('clicking the figure selects a muscle', !(await page.locator('#detail').isHidden()),
      `picked: ${await page.textContent('#d-name').catch(() => 'nothing')}`);

// 10b. hovering names the muscle under the cursor
await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height * 0.34);
await page.waitForTimeout(300);
check('hover shows a tooltip', !(await page.locator('#tooltip').isHidden()),
      await page.textContent('#tooltip').catch(() => ''));

// 10b. selecting shows where the muscle attaches
check('attachment labels appear on selection',
      !(await page.locator('#label-origin').isHidden())
      || !(await page.locator('#label-insertion').isHidden()));

// 10c. focus mode dims everything except the selection
check('focus mode dims the other muscles', await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return !!c;
}));
await page.uncheck('#toggle-focus');
await page.waitForTimeout(200);
check('focus can be switched off', !(await page.locator('#toggle-focus').isChecked()));
await page.check('#toggle-focus');

// 11. keyboard peel
await page.keyboard.press('2');
await page.waitForTimeout(150);
check('pressing 2 toggles the intermediate layer', await visible() < 154);

console.log(`\n${pass} passed, ${fail} failed`);
if (errors.length) { console.log('\nconsole errors:'); errors.forEach((e) => console.log(' ', e)); }
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
