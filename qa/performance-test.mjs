import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: false, args: ['--window-position=0,0','--window-size=1980,1180','--disable-features=RendererCodeIntegrity'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.stack || err.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.bringToFront();
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, null, { timeout: 30000 });
await page.waitForTimeout(3500);
const files = Array.from({ length: 16 }, (_, i) => `qa/placeholders/${(i % 8) + 1}.jpg`);
await page.evaluate(() => { const p = document.querySelector('#control-panel'); if (p.classList.contains('is-open')) document.querySelector('#btn-panel').click(); });
await page.setInputFiles('#photo-input', files);
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.app.photos.count === 24, null, { timeout: 30000 });
await page.waitForTimeout(2500);
const samples = [];
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(800);
  samples.push(await page.evaluate(() => ({ fps: window.__CHRISTMAS_WISH__.app.lastFps, calls: window.__CHRISTMAS_WISH__.app.renderer.renderer.info.render.calls })));
}
const gpu = await page.evaluate(() => {
  const gl = document.querySelector('#scene-canvas').getContext('webgl2');
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, canvas: [document.querySelector('#scene-canvas').width, document.querySelector('#scene-canvas').height], photos: window.__CHRISTMAS_WISH__.app.photos.count };
});
await page.screenshot({ path: 'qa/screenshots/perf-24-photos.png' });
const tiers = {};
for (const q of ['balanced', 'performance', 'ultra']) {
  await page.evaluate((quality) => window.__CHRISTMAS_WISH__.setQuality(quality), q);
  await page.waitForTimeout(1800);
  tiers[q] = await page.evaluate(() => ({ fps: window.__CHRISTMAS_WISH__.app.lastFps, calls: window.__CHRISTMAS_WISH__.app.renderer.renderer.info.render.calls, quality: window.__CHRISTMAS_WISH__.getSettings().quality }));
}
const out = { gpu, samples, tiers, errors };
writeFileSync('qa/performance-results.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
