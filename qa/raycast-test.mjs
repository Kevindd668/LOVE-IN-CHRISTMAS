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
await page.waitForTimeout(4200);
await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  if (document.querySelector('#control-panel').classList.contains('is-open')) document.querySelector('#btn-panel').click();
});
await page.waitForTimeout(900);
const result = {};

// Photo card click
const photoPoint = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  const card = a.photos.cards.get('default-2');
  const v = card.group.position.clone();
  v.y += 0.1;
  v.project(a.cameraManager.camera);
  return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight) };
});
await page.mouse.click(photoPoint.x, photoPoint.y);
await page.waitForTimeout(500);
result.photo = { point: photoPoint, open: await page.locator('#photo-lightbox').evaluate((el) => el.classList.contains('is-open')), caption: await page.locator('#lightbox-caption').textContent() };
assert.equal(result.photo.open, true);
await page.locator('#lightbox-close').click();
await page.waitForTimeout(250);

// Gift click
const giftPoint = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  const v = a.gifts.getGiftPosition(0);
  v.project(a.cameraManager.camera);
  return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight) };
});
await page.mouse.click(giftPoint.x, giftPoint.y);
await page.waitForTimeout(950);
result.gift = { point: giftPoint, wishOpen: await page.locator('#wish-overlay').evaluate((el) => el.classList.contains('is-open')), openTargets: await page.evaluate(() => window.__CHRISTMAS_WISH__.app.gifts.gifts.map((g) => g.openTarget)) };
assert.equal(result.gift.wishOpen, true);
await page.locator('#wish-accept').click();
await page.waitForTimeout(350);

// Star click
const starPoint = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  const v = a.tree.star.root.position.clone();
  v.project(a.cameraManager.camera);
  return { x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight) };
});
await page.mouse.click(starPoint.x, starPoint.y);
await page.waitForTimeout(2150);
result.star = { point: starPoint, wishOpen: await page.locator('#wish-overlay').evaluate((el) => el.classList.contains('is-open')), bodyClass: await page.evaluate(() => document.body.className) };
assert.equal(result.star.wishOpen, true);
await page.locator('#wish-accept').click();
await page.waitForTimeout(450);

// Tree raycast. The F3 camera has a new home framing, so probe the visible
// mid-tree screen column through the same MouseInteraction raycaster used by
// real pointer events rather than relying on an F0 world->screen guess.
await page.waitForTimeout(1200);
const treeProbe = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  return [320, 400, 450, 500, 560].map((y) => ({ y, type: a.mouse.pickAt(720, y, false)?.type ?? 'none' }));
});
result.tree = { probe: treeProbe };
assert.ok(treeProbe.some((entry) => entry.type === 'tree'));

// Empty sky / heart gather
await page.mouse.click(1320, 230);
await page.waitForTimeout(350);
result.sky = { gatherTimer: await page.evaluate(() => window.__CHRISTMAS_WISH__.app.hearts.tempGather), toast: await page.locator('#toast').textContent() };
assert.ok(result.sky.gatherTimer > 0);

result.errors = errors;
console.log(JSON.stringify(result, null, 2));
await browser.close();
