import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: false,
  args: ['--window-position=20,20', '--window-size=1480,960']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
mkdirSync('docs/F3/final-screenshots', { recursive: true });

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.bringToFront();
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, { timeout: 30000 });
await page.waitForTimeout(5000);
await page.evaluate(() => {
  document.querySelector('#btn-panel-close')?.click();
  window.__CHRISTMAS_WISH__.app.cameraManager.resetView(true);
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'docs/F3/final-screenshots/01-overall.png' });

const setCamera = async (position, target, widePolar = false) => {
  await page.evaluate(
    ({ position, target, widePolar }) => {
      const app = window.__CHRISTMAS_WISH__.app;
      const controls = app.cameraManager.controls;
      if (widePolar) controls.maxPolarAngle = Math.PI;
      app.cameraManager.camera.position.set(...position);
      controls.target.set(...target);
      controls.update();
      app.cameraManager.camera.lookAt(...target);
    },
    { position, target, widePolar }
  );
  await page.waitForTimeout(650);
};
const hideUi = () => page.evaluate(() => {
  const ui = document.querySelector('#ui');
  if (ui) ui.style.display = 'none';
});

await hideUi();

await setCamera([4.5, 5.2, 13.5], [0, 6.0, 0]);
await page.screenshot({ path: 'docs/F3/final-screenshots/09-tree.png' });

await setCamera([8.2, 8.8, 2.0], [4.2, 8.4, -9.8]);
await page.screenshot({ path: 'docs/F3/final-screenshots/08-heart.png' });

await setCamera([5.5, 1.8, 7.5], [0, 0.9, 0]);
await page.screenshot({ path: 'docs/F3/final-screenshots/07-ground.png' });

await setCamera([1.0, 3.0, 10.0], [0, 28.0, -20.0], true);
await page.screenshot({ path: 'docs/F3/final-screenshots/02-starfield.png' });

await setCamera([-1.5, 5.0, 8.0], [0, 15.0, -22.0], true);
await page.screenshot({ path: 'docs/F3/final-screenshots/03-nebula-aurora.png' });

await setCamera([-9.0, 4.6, 10.0], [-4.0, 5.0, -8.0]);
await page.screenshot({ path: 'docs/F3/final-screenshots/04-waterfall.png' });

await page.evaluate(() => {
  const app = window.__CHRISTMAS_WISH__.app;
  app.cameraManager.controls.maxPolarAngle = Math.PI * 0.505;
  app.cameraManager.resetView(true);
});
await page.waitForTimeout(700);
await page.screenshot({ path: 'docs/F3/final-screenshots/05-photo-6.png' });

await page.evaluate(async () => {
  const app = window.__CHRISTMAS_WISH__.app;
  const files = [];
  for (let i = app.photos.count; i < 24; i += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 320, 400);
    gradient.addColorStop(0, i % 2 ? '#3a586b' : '#6b3a51');
    gradient.addColorStop(1, '#e1c891');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 400);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    files.push(new File([blob], `final-${Date.now()}-${i}.png`, { type: 'image/png' }));
  }
  await app.photos.addFiles(files);
});
await page.waitForTimeout(2400);
await page.evaluate(() => window.__CHRISTMAS_WISH__.app.cameraManager.resetView(true));
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/F3/final-screenshots/06-photo-24.png' });

await page.evaluate(() => {
  const ui = document.querySelector('#ui');
  if (ui) ui.style.display = '';
  const panel = document.querySelector('#control-panel');
  if (panel && !panel.classList.contains('is-open')) document.querySelector('#btn-panel').click();
});
await page.waitForTimeout(700);
await page.screenshot({ path: 'docs/F3/final-screenshots/10-controls.png' });

console.log(JSON.stringify({ errors, count: await page.evaluate(() => window.__CHRISTMAS_WISH__.app.photos.count) }, null, 2));
await browser.close();
