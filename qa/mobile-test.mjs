import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: false, args: ['--window-position=20,20','--window-size=1500,1000','--disable-features=RendererCodeIntegrity'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.stack || err.message));
await page.goto('http://127.0.0.1:4173/?intro=0', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, null, { timeout: 30000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: 'qa/screenshots/mobile-initial.png' });
const layout = await page.evaluate(() => {
  const a = window.__CHRISTMAS_WISH__.app;
  return {
    viewport: [innerWidth, innerHeight],
    bodyScrollWidth: document.body.scrollWidth,
    panelOpen: document.querySelector('#control-panel').classList.contains('is-open'),
    heroRect: document.querySelector('.hero-copy').getBoundingClientRect().toJSON(),
    dockRect: document.querySelector('.action-dock').getBoundingClientRect().toJSON(),
    fps: a.lastFps
  };
});
await page.locator('#btn-panel').click();
await page.waitForTimeout(600);
await page.screenshot({ path: 'qa/screenshots/mobile-panel.png' });
const panel = await page.evaluate(() => ({
  open: document.querySelector('#control-panel').classList.contains('is-open'),
  bodyClass: document.body.className,
  panelRect: document.querySelector('#control-panel').getBoundingClientRect().toJSON(),
  drawerBackdrop: getComputedStyle(document.querySelector('#panel-backdrop')).pointerEvents
}));
await page.locator('#btn-panel-close').click();
await page.waitForTimeout(200);
await page.evaluate(() => window.__CHRISTMAS_WISH__.app.startStarBlessing());
await page.waitForTimeout(2000);
await page.screenshot({ path: 'qa/screenshots/mobile-star.png' });
const wish = await page.evaluate(() => ({ open: document.querySelector('#wish-overlay').classList.contains('is-open'), rect: document.querySelector('.wish-dialog').getBoundingClientRect().toJSON() }));
console.log(JSON.stringify({ layout, panel, wish, errors }, null, 2));
await browser.close();
