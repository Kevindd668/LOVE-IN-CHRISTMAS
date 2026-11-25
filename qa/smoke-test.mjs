import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: false,
  args: ['--window-position=20,20', '--window-size=1480,960', '--disable-features=RendererCodeIntegrity']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => pageErrors.push(err.stack || err.message));
const results = {};
const state = () => page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__;
  return {
    ready: a.ready,
    settings: a.getSettings(),
    fps: a.getFps(),
    drawCalls: a.getDrawCalls(),
    panelOpen: document.querySelector('#control-panel').classList.contains('is-open'),
    photoCount: a.app.photos.count,
    photoDomCount: document.querySelectorAll('.photo-item').length,
    photoCountLabel: document.querySelector('#photo-count')?.textContent,
    wishOpen: document.querySelector('#wish-overlay').classList.contains('is-open'),
    cinemaActive: document.querySelector('#cinema').classList.contains('is-active'),
    cinemaEnding: document.querySelector('#cinema').classList.contains('is-ending'),
    bodyClass: document.body.className,
    toast: document.querySelector('#toast')?.textContent
  };
});

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, null, { timeout: 30000 });
await page.waitForTimeout(4200);
results.initial = await state();
await page.screenshot({ path: 'qa/screenshots/qa-initial.png' });

// --- Control panel / settings ---
if (!(await state()).panelOpen) await page.locator('#btn-panel').click();
await page.locator('[data-setting="treeHeight"]').evaluate((el) => {
  el.value = '9.2';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(420);
const afterShape = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__;
  return { setting: a.getSettings().treeHeight, treeHeight: a.app.tree.treeHeight, output: document.querySelector('output[data-for="treeHeight"]').textContent };
});
assert.equal(afterShape.setting, 9.2);
assert.equal(afterShape.treeHeight, 9.2);
results.treeHeight = afterShape;

await page.locator('.control-section').nth(1).locator('summary').click();
await page.waitForTimeout(200);
await page.locator('[data-setting="lightMode"]').selectOption('ice');
await page.waitForTimeout(250);
const lightState = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__;
  return { mode: a.getSettings().lightMode, color: a.getSettings().lightColor, treeMode: a.app.tree.lights.currentMode };
});
assert.equal(lightState.mode, 'ice');
assert.equal(lightState.color, '#9DE6FF');
results.lightMode = lightState;

await page.locator('[data-setting="lightCount"]').evaluate((el) => {
  el.value = '360';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(360);
const lightCount = await page.evaluate(() => window.__CHRISTMAS_WISH__.app.tree.lights.count);
assert.equal(lightCount, 360);
results.lightCount = lightCount;

await page.locator('.control-section').nth(2).locator('summary').click();
await page.waitForTimeout(200);
await page.locator('[data-setting="heartCount"]').evaluate((el) => {
  el.value = '720';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(250);
const hearts = await page.evaluate(() => ({ setting: window.__CHRISTMAS_WISH__.getSettings().heartCount, drawRange: window.__CHRISTMAS_WISH__.app.hearts.points.geometry.drawRange.count }));
assert.equal(hearts.setting, 720);
assert.equal(hearts.drawRange, 720);
results.hearts = hearts;

await page.locator('.control-section').nth(4).locator('summary').click();
await page.waitForTimeout(200);
await page.locator('[data-setting="snowOn"]').uncheck();
await page.waitForTimeout(180);
assert.equal((await state()).settings.snowOn, false);
await page.locator('[data-setting="snowOn"]').check();
await page.waitForTimeout(180);

// expand photos section
await page.locator('.control-section').nth(3).locator('summary').click();
await page.waitForTimeout(250);
const initialPhotoCount = await page.evaluate(() => window.__CHRISTMAS_WISH__.app.photos.count);
await page.setInputFiles('#photo-input', [
  'qa/placeholders/1.jpg',
  'qa/placeholders/2.jpg'
]);
await page.waitForFunction(
  (expected) => window.__CHRISTMAS_WISH__?.app.photos.count === expected,
  initialPhotoCount + 2,
  { timeout: 12000 }
);
await page.waitForTimeout(500);
results.photoUpload = await page.evaluate(() => ({
  count: window.__CHRISTMAS_WISH__.app.photos.count,
  label: document.querySelector('#photo-count')?.textContent,
  rows: document.querySelectorAll('.photo-item').length
}));
assert.equal(results.photoUpload.count, initialPhotoCount + 2);
assert.equal(results.photoUpload.rows, initialPhotoCount + 2);
await page.screenshot({ path: 'qa/screenshots/qa-panel-photos.png' });

const lastPhotoInput = page.locator('.photo-item .photo-meta input').last();
await lastPhotoInput.fill('Our tenth winter memory');
await page.waitForTimeout(250);
results.caption = await page.evaluate(() => window.__CHRISTMAS_WISH__.app.photos.views.at(-1).caption);

// replace the first photo through the UI file chooser
const chooserPromise = page.waitForEvent('filechooser');
await page.locator('.photo-item').first().locator('.photo-actions button').nth(2).click();
const chooser = await chooserPromise;
await chooser.setFiles('qa/placeholders/3.jpg');
await page.waitForFunction(() => window.__CHRISTMAS_WISH__.app.photos.views[0].fileName === '3.jpg', null, { timeout: 12000 });
results.replace = await page.evaluate(() => window.__CHRISTMAS_WISH__.app.photos.views[0].fileName);

// reorder and delete
await page.locator('.photo-item').first().locator('.photo-actions button').nth(1).click();
await page.waitForTimeout(250);
await page.locator('.photo-item').last().locator('.photo-actions button').nth(3).click();
await page.waitForTimeout(250);
results.photoAfterDelete = await page.evaluate(() => ({ count: window.__CHRISTMAS_WISH__.app.photos.count, rows: document.querySelectorAll('.photo-item').length }));
assert.equal(results.photoAfterDelete.count, initialPhotoCount + 1);
assert.equal(results.photoAfterDelete.rows, initialPhotoCount + 1);

// quality presets
for (const quality of ['balanced', 'performance', 'ultra']) {
  await page.locator(`[data-quality="${quality}"]`).click();
  await page.waitForTimeout(350);
  results[`quality_${quality}`] = await page.evaluate(() => {
    const a = window.__CHRISTMAS_WISH__;
    return { quality: a.getSettings().quality, snow: a.getSettings().snowCount, lights: a.getSettings().lightCount, hearts: a.getSettings().heartCount, fps: a.getFps() };
  });
  assert.equal(results[`quality_${quality}`].quality, quality);
}

// reset settings
await page.locator('#btn-reset-settings').click();
await page.waitForTimeout(500);
results.reset = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__;
  return { settings: a.getSettings(), activeQuality: document.querySelector('.quality-switch .is-active')?.dataset.quality, photoCount: a.app.photos.count };
});
assert.equal(results.reset.settings.treeHeight, 9.5);
assert.equal(results.reset.settings.lightMode, 'warm');
assert.equal(results.reset.activeQuality, 'ultra');
await page.locator('#btn-panel-close').click();
await page.waitForTimeout(400);

// --- Gift interaction ---
await page.evaluate(() => window.__CHRISTMAS_WISH__.openGift(0));
await page.waitForTimeout(900);
results.gift = {
  ...(await state()),
  storyOpen: await page.locator('#story-overlay').evaluate((el) => el.classList.contains('is-open'))
};
assert.equal(results.gift.storyOpen, true);
await page.screenshot({ path: 'qa/screenshots/qa-gift.png' });
await page.locator('.story-close').click();
await page.waitForTimeout(350);
results.giftClosed = await page.evaluate(() => ({
  storyOpen: document.querySelector('#story-overlay')?.classList.contains('is-open'),
  state: window.__CHRISTMAS_WISH__.getRomanceState()
}));
assert.equal(results.giftClosed.storyOpen, false);

// --- Star blessing ---
await page.evaluate(() => window.__CHRISTMAS_WISH__.app.startStarBlessing());
await page.waitForTimeout(2100);
results.star = await state();
assert.equal(results.star.wishOpen, true);
assert.match(results.star.bodyClass, /is-cinema/);
await page.screenshot({ path: 'qa/screenshots/qa-star.png' });
await page.locator('#wish-accept').click();
await page.waitForTimeout(500);
results.starClosed = await state();
assert.equal(results.starClosed.wishOpen, false);

// --- 45 second demo (seek to milestones for screenshots) ---
await page.evaluate(() => window.__CHRISTMAS_WISH__.app.startDemo());
await page.waitForTimeout(700);
results.demoStarted = await state();
assert.equal(results.demoStarted.cinemaActive, true);
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  a.demo.elapsed = 29;
  a.demo.paused = true;
  a.demo.update(0.001);
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/screenshots/qa-demo-29.png' });
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  a.demo.paused = false;
  a.demo.elapsed = 35;
  a.demo.paused = true;
  a.demo.update(0.001);
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa/screenshots/qa-demo-35.png' });
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  a.demo.paused = false;
  a.demo.elapsed = 42;
  a.demo.paused = true;
  a.demo.update(0.001);
});
await page.waitForTimeout(700);
results.demoEnding = await state();
assert.equal(results.demoEnding.cinemaEnding, true);
await page.screenshot({ path: 'qa/screenshots/qa-demo-ending.png' });
await page.locator('#cinema-close').click();
await page.waitForTimeout(900);
results.demoStopped = await state();
assert.equal(results.demoStopped.cinemaActive, false);
assert.doesNotMatch(results.demoStopped.bodyClass, /is-cinema/);

// --- Music toggle ---
await page.locator('#btn-sound').click();
await page.waitForTimeout(700);
results.music = await page.evaluate(() => ({ on: window.__CHRISTMAS_WISH__.getSettings().musicOn, pressed: document.querySelector('#btn-sound').getAttribute('aria-pressed'), label: document.querySelector('#btn-sound .sound-label').textContent }));
if (results.music.on) {
  await page.locator('#btn-sound').click();
  await page.waitForTimeout(300);
}

results.final = await state();
results.consoleErrors = consoleErrors;
results.pageErrors = pageErrors;
writeFileSync('qa/smoke-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();

