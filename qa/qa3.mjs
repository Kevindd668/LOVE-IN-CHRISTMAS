import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: false, args: ['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.stack || err.message));
await page.goto('http://127.0.0.1:4173/?intro=0', { waitUntil: 'networkidle' });
await page.bringToFront();
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, null, { timeout: 30000 });
await page.waitForTimeout(3200);
const result = {};

// custom Chinese label (canvas fallback)
await page.evaluate(() => {
  const el = document.querySelector('[data-setting="text520"]');
  el.value = '我爱你';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(700);
result.chineseLabel = await page.evaluate(() => {
  const label = window.__CHRISTMAS_WISH__.app.numbers.labels.a;
  return { value: label.value, materials: label.materials.map((m) => m.type), visible: label.root.visible, width: label.width };
});
assert.equal(result.chineseLabel.value, '我爱你');
assert.ok(result.chineseLabel.materials.includes('MeshBasicMaterial'));
await page.evaluate(() => {
  const el = document.querySelector('[data-setting="text520"]');
  el.value = 'LOVE';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(700);
result.asciiLabel = await page.evaluate(() => {
  const label = window.__CHRISTMAS_WISH__.app.numbers.labels.a;
  return { value: label.value, materials: label.materials.map((m) => m.type), width: label.width };
});
assert.equal(result.asciiLabel.value, 'LOVE');
assert.ok(result.asciiLabel.materials.includes('MeshStandardMaterial'));

// restore
await page.evaluate(() => {
  const el = document.querySelector('[data-setting="text520"]');
  el.value = '520';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(500);

// captions toggle, photo radius, background, snow count
await page.evaluate(() => {
  const setVal = (key, value, type = 'input') => {
    const el = document.querySelector(`[data-setting="${key}"]`);
    if (el.type === 'checkbox') { el.checked = value; el.dispatchEvent(new Event('change', { bubbles: true })); }
    else { el.value = value; el.dispatchEvent(new Event(type, { bubbles: true })); }
  };
  setVal('showCaptions', false);
  setVal('photoRadius', '1.15');
  setVal('backgroundColor', '#081b2a');
  setVal('snowCount', '1400');
  setVal('heartMode', 'gather', 'change');
});
await page.waitForTimeout(450);
result.controls = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  const firstCard = [...a.photos.cards.values()][0];
  return {
    captionsHidden: !firstCard.captionMesh.visible,
    photoRadius: window.__CHRISTMAS_WISH__.getSettings().photoRadius,
    background: window.__CHRISTMAS_WISH__.getSettings().backgroundColor,
    skyTop: a.sceneManager.sky.material.uniforms.uTopColor.value.getHexString(),
    snowDrawRange: a.snow.points.geometry.drawRange.count,
    heartMode: a.hearts.mode
  };
});
assert.equal(result.controls.captionsHidden, true);
assert.equal(result.controls.snowDrawRange, 1400);
assert.equal(result.controls.heartMode, 'gather');
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  if (document.querySelector('#control-panel').classList.contains('is-open')) document.querySelector('#btn-panel').click();
});

// romance mode and finale
await page.locator('#btn-romance').click();
await page.waitForTimeout(700);
result.romanceStarted = await page.evaluate(() => ({ active: window.__CHRISTMAS_WISH__.app.romance.isActive, body: document.body.className, lights: window.__CHRISTMAS_WISH__.app.settings.get('lightsOn') }));
assert.equal(result.romanceStarted.active, true);
assert.match(result.romanceStarted.body, /is-romance/);
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  a.romance.elapsed = 9.4;
  a.romance.update(0.001);
});
await page.waitForTimeout(700);
result.romanceFinale = await page.evaluate(() => ({ wishOpen: document.querySelector('#wish-overlay').classList.contains('is-open'), title: document.querySelector('#wish-title').textContent, kicker: document.querySelector('#wish-kicker').textContent }));
assert.equal(result.romanceFinale.wishOpen, true);
await page.screenshot({ path: 'qa/screenshots/qa-romance.png' });
await page.locator('#wish-accept').click();
await page.waitForTimeout(700);
result.romanceClosed = await page.evaluate(() => ({ active: window.__CHRISTMAS_WISH__.app.romance.isActive, body: document.body.className }));
assert.equal(result.romanceClosed.active, false);
assert.doesNotMatch(result.romanceClosed.body, /is-romance/);

result.errors = errors;
console.log(JSON.stringify(result, null, 2));
await browser.close();
