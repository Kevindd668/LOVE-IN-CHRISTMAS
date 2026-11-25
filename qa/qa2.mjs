import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: false, args: ['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.stack || err.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.bringToFront();
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, null, { timeout: 30000 });
await page.waitForTimeout(4500);
const result = {};
await page.evaluate(() => { const p = document.querySelector('#control-panel'); if (p.classList.contains('is-open')) document.querySelector('#btn-panel').click(); });
await page.waitForTimeout(400);

const treePoint = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  const v = a.tree.group.position.clone();
  v.x = 0.3; v.y = 4.25; v.z = 1.2;
  v.project(a.cameraManager.camera);
  return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight) };
});
await page.mouse.click(treePoint.x, treePoint.y);
await page.waitForTimeout(260);
result.treeClick = { point: treePoint, symbols: await page.evaluate(() => window.__CHRISTMAS_WISH__.app.magic.symbols.length) };
assert.ok(result.treeClick.symbols > 0);

// music toggle
await page.locator('#btn-sound').click();
await page.waitForTimeout(800);
result.musicOn = await page.evaluate(() => {
  const app = window.__CHRISTMAS_WISH__.app;
  const engine = app.music;
  return { setting: window.__CHRISTMAS_WISH__.getSettings().musicOn, pressed: document.querySelector('#btn-sound').getAttribute('aria-pressed'), context: engine.context?.state, enabled: engine.isEnabled };
});
assert.equal(result.musicOn.pressed, 'true');
await page.locator('#btn-sound').click();
await page.waitForTimeout(350);
result.musicOff = await page.evaluate(() => ({ setting: window.__CHRISTMAS_WISH__.getSettings().musicOn, pressed: document.querySelector('#btn-sound').getAttribute('aria-pressed') }));
assert.equal(result.musicOff.pressed, 'false');

// demo pause + replay
await page.locator('#btn-demo').click();
await page.waitForTimeout(1000);
await page.locator('#cinema-pause').click();
await page.waitForTimeout(300);
result.paused = await page.evaluate(() => ({ isPaused: window.__CHRISTMAS_WISH__.app.demo.isPaused, uiPaused: document.querySelector('#cinema').classList.contains('is-paused'), label: document.querySelector('#cinema-pause').innerText }));
assert.equal(result.paused.uiPaused, true);
await page.locator('#cinema-pause').click();
await page.waitForTimeout(250);
result.resumed = await page.evaluate(() => ({ isPaused: window.__CHRISTMAS_WISH__.app.demo.isPaused, uiPaused: document.querySelector('#cinema').classList.contains('is-paused') }));
assert.equal(result.resumed.uiPaused, false);
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  a.demo.paused = true;
  a.demo.elapsed = 42;
  a.demo.update(0.001);
});
await page.waitForTimeout(500);
assert.equal(await page.locator('#cinema').evaluate((el) => el.classList.contains('is-ending')), true);
await page.locator('#cinema-replay').click();
await page.waitForTimeout(800);
result.replay = await page.evaluate(() => ({ ending: document.querySelector('#cinema').classList.contains('is-ending'), active: document.querySelector('#cinema').classList.contains('is-active'), elapsed: window.__CHRISTMAS_WISH__.app.demo.elapsed, paused: window.__CHRISTMAS_WISH__.app.demo.isPaused }));
assert.equal(result.replay.ending, false);
assert.equal(result.replay.active, true);
assert.ok(result.replay.elapsed < 3);
await page.locator('#cinema-exit').click();
await page.waitForTimeout(800);
result.demoStopped = await page.evaluate(() => ({ active: document.querySelector('#cinema').classList.contains('is-active'), body: document.body.className }));
assert.equal(result.demoStopped.active, false);

// gift lid visual check
await page.evaluate(() => window.__CHRISTMAS_WISH__.openGift(0));
await page.waitForTimeout(800);
await page.locator('#wish-accept').click();
await page.waitForTimeout(300);
result.giftLid = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  const gift = a.gifts.gifts[0];
  return { openTarget: gift.openTarget, openAmount: +gift.openAmount.toFixed(2), lidY: +gift.lidGroup.position.y.toFixed(2), light: +gift.light.intensity.toFixed(2) };
});
assert.ok(result.giftLid.openTarget > 0.5);

result.errors = errors;
console.log(JSON.stringify(result, null, 2));
await browser.close();
