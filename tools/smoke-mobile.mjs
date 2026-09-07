// Phone interaction smoke test.
//
// Exists because of a silent failure: tapping a muscle selected it correctly
// but left the panel shut, so on a phone the core interaction produced no
// visible response at all. Desktop tests passed throughout.
import { chromium, devices } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(process.env.URL || 'http://localhost:8123', { waitUntil: 'load' });
await page.waitForSelector('#loading.gone', { timeout: 60000 });
await page.waitForTimeout(2000);

let pass = 0; let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};

const stage = await page.locator('#stage').boundingBox();
await page.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height * 0.40);
await page.waitForTimeout(1200);

check('tapping a muscle gives visible feedback', !(await page.locator('#peek').isHidden()));
const name = await page.textContent('#peek-name').catch(() => '');
check('the card names the muscle', name.length > 3, `got "${name}"`);
check('the card says what it does', (await page.textContent('#peek-fn')).length > 20);
check('the model stays visible above the card', await page.locator('#peek').evaluate(
  (e) => e.getBoundingClientRect().top > window.innerHeight * 0.5,
));
check('the full panel stays closed', !(await page.locator('#panel').evaluate(
  (e) => e.classList.contains('open'),
)));

// Framing must fit the muscle in portrait, where the horizontal field of view
// is much narrower than the vertical one.
check('the camera does not over-zoom in portrait', await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c.clientWidth > 0 && c.clientHeight > 0;
}));

await page.click('#peek-more');
await page.waitForTimeout(700);
check('"more" opens the full detail', await page.locator('#panel').evaluate(
  (e) => e.classList.contains('open'),
));
check('the card hides while the panel is open', await page.locator('#peek').isHidden());
check('nerve supply is populated', (await page.textContent('#d-nerve')).length > 3);

await page.click('#panel-toggle');
await page.waitForTimeout(600);
check('closing the panel restores the card', !(await page.locator('#peek').isHidden()));

await page.click('#peek-close');
await page.waitForTimeout(400);
check('the close button dismisses the card', await page.locator('#peek').isHidden());

// Swiping the card down is what people actually reach for on a phone.
await page.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height * 0.40);
await page.waitForTimeout(900);
const card = await page.locator('#peek').boundingBox();
const cx = card.x + card.width / 2;
const cy = card.y + 24;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (const dy of [10, 30, 55, 85, 115]) {
  await page.mouse.move(cx, cy + dy);
  await page.waitForTimeout(30);
}
await page.mouse.up();
await page.waitForTimeout(600);
check('swiping the card down dismisses it', await page.locator('#peek').isHidden());

// A short drag is not a dismissal; it should settle back.
await page.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height * 0.40);
await page.waitForTimeout(900);
const card2 = await page.locator('#peek').boundingBox();
await page.mouse.move(card2.x + card2.width / 2, card2.y + 24);
await page.mouse.down();
await page.mouse.move(card2.x + card2.width / 2, card2.y + 44, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(500);
check('a short drag settles back instead', !(await page.locator('#peek').isHidden()));
await page.click('#peek-close');

check('page never scrolls sideways', !(await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
)));

console.log(`\n${pass} passed, ${fail} failed`);
if (errors.length) { console.log('\nconsole errors:'); errors.forEach((e) => console.log(' ', e)); }
await browser.close();
process.exit(fail || errors.length ? 1 : 0);
