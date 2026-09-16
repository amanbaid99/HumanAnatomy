// Renders the right shoulder from the four angles that show whether the cuff
// sits on the scapula or through it. Used to check F3-style geometry changes.
//
// The app does not expose its camera, so the orbit is driven by synthetic
// pointer drags at the controls' own 0.0062 rad/px sensitivity.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tools', 'shots');
fs.mkdirSync(out, { recursive: true });
const RAD_PER_PX = 0.0062;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(process.env.URL || 'http://localhost:8123', { waitUntil: 'load' });
await page.waitForSelector('#loading.gone', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);

const CX = 550; const CY = 430;
async function orbit(dTheta, dPhi) {
  // theta decreases with +dx, phi decreases with +dy.
  const dx = -dTheta / RAD_PER_PX;
  const dy = -dPhi / RAD_PER_PX;
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(CX + (dx * i) / steps, CY + (dy * i) / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);
}

// The cuff view starts at theta 2.42, phi 1.14: behind and a little above.
const VIEWS = [
  { name: 'shoulder-posterior', theta: Math.PI, phi: 1.45 },
  { name: 'shoulder-lateral', theta: Math.PI / 2, phi: 1.50 },
  { name: 'shoulder-anterior', theta: 0, phi: 1.45 },
  { name: 'shoulder-superior', theta: 2.6, phi: 0.45 },
];
let theta = 2.42; let phi = 1.14;
for (const v of VIEWS) {
  await page.click('#reset');
  await page.waitForTimeout(700);
  await page.click('#cuff-view');
  await page.waitForTimeout(1600);
  await page.uncheck('#toggle-focus');
  theta = 2.42; phi = 1.14;
  await orbit(v.theta - theta, v.phi - phi);
  await page.mouse.move(CX, CY);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `${v.name}.png`), clip: { x: 0, y: 0, width: 750, height: 900 } });
  console.log('shot:', v.name);
}

// Bone only, from behind, to check the fossae the cuff has to sit in.
await page.click('#reset');
await page.waitForTimeout(700);
await page.click('#cuff-view');
await page.waitForTimeout(1400);
await page.uncheck('[data-layer="3"]');
await page.waitForTimeout(900);
await orbit(Math.PI - 2.42, 1.45 - 1.14);
await page.mouse.move(CX, CY);
await page.mouse.wheel(0, -240);
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(out, 'shoulder-bone.png'), clip: { x: 0, y: 0, width: 750, height: 900 } });
console.log('shot: shoulder-bone');

console.log(errors.length ? `\nconsole errors:\n${errors.slice(0, 10).join('\n')}` : '\nno console errors');
await browser.close();
