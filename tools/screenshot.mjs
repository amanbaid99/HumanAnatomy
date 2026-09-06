// Renders the app headlessly and saves views to tools/shots/.
// Used during development to check the geometry actually looks right.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tools', 'shots');
fs.mkdirSync(out, { recursive: true });

const URL_BASE = process.env.URL || 'http://localhost:8123';
const only = process.argv[2];

const SHOTS = [
  { name: 'front',   view: 'front' },
  { name: 'back',    view: 'back' },
  { name: 'side',    view: 'left' },
  { name: 'cuff',    click: '#cuff-view' },
  { name: 'skeleton', setup: async (p) => {
      await p.click('[data-view="front"]');
      await p.check('#toggle-skeleton');
      await p.uncheck('[data-layer="1"]');
      await p.uncheck('[data-layer="2"]');
      await p.uncheck('[data-layer="3"]');
    } },
  { name: 'peeled', setup: async (p) => {
      await p.click('[data-view="back"]');
      await p.uncheck('[data-layer="1"]');
    } },
];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(URL_BASE, { waitUntil: 'load' });
await page.waitForSelector('#loading.gone', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);

const visible = await page.textContent('#stat-visible');
const total = await page.textContent('#muscle-total');
console.log(`muscles: ${visible} visible of ${total}`);

for (const shot of SHOTS) {
  if (only && shot.name !== only) continue;
  await page.click('#reset');
  await page.waitForTimeout(900);
  if (shot.view) await page.click(`[data-view="${shot.view}"]`);
  if (shot.click) await page.click(shot.click);
  if (shot.setup) await shot.setup(page);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(out, `${shot.name}.png`) });
  console.log('shot:', shot.name);
}

if (errors.length) {
  console.log('\n--- console errors ---');
  errors.slice(0, 20).forEach((e) => console.log(e));
} else {
  console.log('\nno console errors');
}

await browser.close();
