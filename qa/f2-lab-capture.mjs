/**
 * F2 evidence generator. Run while `node experiments/serve.mjs` is serving.
 * Captures real browser screenshots into each experiment and records metrics
 * in qa/f2/performance.json. This script only touches experiments and QA.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE = 'http://127.0.0.1:8787/';
const OUT = path.join(ROOT, 'qa', 'f2');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: false,
  args: ['--window-position=20,20', '--window-size=1480,960', '--disable-features=RendererCodeIntegrity']
});
const result = { generatedAt: new Date().toISOString(), browser: browser.version(), labs: [], errors: [] };

async function openLab(folder) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + folder + '/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => Boolean(window.__LAB__), null, { timeout: 30000 });
  await page.waitForTimeout(2600);
  return { context, page, errors };
}

async function snap(page, folder, name) {
  await page.evaluate(() => window.__LAB__?.ui?.setOpen(false));
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(ROOT, 'experiments', folder, 'screenshots', name) });
}
async function panelShot(page, folder, name) {
  await page.evaluate(() => window.__LAB__?.ui?.setOpen(true));
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(ROOT, 'experiments', folder, 'screenshots', name) });
}

async function metrics(page) {
  return page.evaluate(async () => {
    const lab = window.__LAB__;
    const intervals = [];
    let last = 0, start = 0;
    await new Promise((resolve) => {
      const tick = (now) => {
        if (!start) { start = now; last = now; } else { intervals.push(now - last); last = now; }
        if (now - start < 3000) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    const sorted = [...intervals].sort((a, b) => a - b);
    const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    const avg = intervals.reduce((a, b) => a + b, 0) / Math.max(1, intervals.length);
    const info = lab?.renderer?.info;
    return {
      fps: Math.round(1000 / Math.max(.01, avg)),
      fpsP50: Math.round(1000 / Math.max(.01, p(.5))),
      frameMsP95: Number(p(.95).toFixed(2)),
      drawCalls: info?.render?.calls ?? null,
      triangles: info?.render?.triangles ?? null,
      points: info?.render?.points ?? null,
      textures: info?.memory?.textures ?? null,
      geometries: info?.memory?.geometries ?? null,
      heapBytes: performance.memory?.usedJSHeapSize ?? null,
      canvas: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(),
      lab: typeof lab?.getStats === 'function' ? lab.getStats() : null
    };
  });
}

async function capture01() {
  const { context, page, errors } = await openLab('01-heart-particles');
  await snap(page, '01-heart-particles', 'overall-heart.png');
  await page.evaluate(() => window.__LAB__.actions.star());
  await page.waitForTimeout(2800);
  await snap(page, '01-heart-particles', 'star.png');
  await page.evaluate(() => window.__LAB__.actions.burst());
  await page.waitForTimeout(700);
  await snap(page, '01-heart-particles', 'burst.png');
  await page.evaluate(() => window.__LAB__.actions.free());
  await page.waitForTimeout(900);
  await snap(page, '01-heart-particles', 'free-float.png');
  await page.evaluate(() => window.__LAB__.actions.heart());
  await page.waitForTimeout(2600);
  await panelShot(page, '01-heart-particles', 'controls.png');
  const m = await metrics(page);
  result.labs.push({ id: '01-heart-particles', metrics: m, errors });
  result.errors.push(...errors.map((e) => `[01] ${e}`));
  await context.close();
}

async function capture02() {
  const { context, page, errors } = await openLab('02-double-helix-tree');
  const views = [
    ['front', 'front.png'], ['angle45', 'angle45.png'], ['side', 'side.png'],
    ['top', 'top.png'], ['helix', 'helix-close.png'], ['crown', 'crystal-heart-close.png'], ['lights', 'lights-close.png']
  ];
  for (const [view, file] of views) {
    await page.evaluate((v) => window.__LAB__.setView(v), view);
    await page.waitForTimeout(1800);
    await snap(page, '02-double-helix-tree', file);
  }
  await panelShot(page, '02-double-helix-tree', 'controls.png');
  const m = await metrics(page);
  result.labs.push({ id: '02-double-helix-tree', metrics: m, errors });
  result.errors.push(...errors.map((e) => `[02] ${e}`));
  await context.close();
}

async function capture03() {
  const { context, page, errors } = await openLab('03-galaxy-nebula');
  const views = [['panorama', 'panorama.png'], ['nebula', 'nebula-close.png'], ['aurora', 'aurora-close.png'], ['fall', 'golden-fall.png'], ['meteor', 'meteor.png']];
  for (const [view, file] of views) {
    await page.evaluate((v) => window.__LAB__.setView(v), view);
    await page.waitForTimeout(1900);
    await snap(page, '03-galaxy-nebula', file);
  }
  await panelShot(page, '03-galaxy-nebula', 'controls.png');
  const m = await metrics(page);
  result.labs.push({ id: '03-galaxy-nebula', metrics: m, errors });
  result.errors.push(...errors.map((e) => `[03] ${e}`));
  await context.close();
}

async function capture04() {
  const { context, page, errors } = await openLab('04-photo-memory');
  await page.waitForFunction(() => window.__LAB__.records.length === 12, null, { timeout: 30000 });
  await snap(page, '04-photo-memory', 'overall-12.png');
  await panelShot(page, '04-photo-memory', 'controls-and-library.png');
  await page.evaluate(() => { const scroller = document.querySelector('.lab-panel-scroll'); if (scroller) scroller.scrollTop = scroller.scrollHeight; });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(ROOT, 'experiments', '04-photo-memory', 'screenshots', 'photo-library.png') });
  const files8 = [];
  for (let i = 1; i <= 8; i++) files8.push(path.join(ROOT, 'qa', 'placeholders', `${i}.jpg`));
  await page.locator('#photo-upload-input').setInputFiles(files8);
  await page.waitForFunction(() => window.__LAB__.records.length === 20, null, { timeout: 30000 });
  await page.waitForTimeout(900);
  await snap(page, '04-photo-memory', 'uploaded-20.png');
  const focusId = await page.evaluate(() => window.__LAB__.records[0]?.id);
  await page.evaluate((id) => window.__LAB__.focus(id), focusId);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ROOT, 'experiments', '04-photo-memory', 'screenshots', 'focus-detail.png') });
  await page.locator('#photo-detail-close').click();
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.__LAB__.ui.setOpen(true));
  await page.waitForTimeout(300);
  await page.locator('#photo-upload-input').setInputFiles(files8.slice(0, 4));
  await page.waitForFunction(() => window.__LAB__.records.length === 24, null, { timeout: 30000 });
  await page.waitForTimeout(900);
  await snap(page, '04-photo-memory', 'stress-24.png');
  const m = await metrics(page);
  result.labs.push({ id: '04-photo-memory', metrics: m, errors });
  result.errors.push(...errors.map((e) => `[04] ${e}`));
  await context.close();
}

async function capture05() {
  const { context, page, errors } = await openLab('05-cinematic-effects');
  await snap(page, '05-cinematic-effects', 'heart.png');
  await page.evaluate(() => window.__LAB__.actions.textSequence());
  await page.waitForTimeout(2600);
  await snap(page, '05-cinematic-effects', 'text-520.png');
  await page.evaluate(() => window.__LAB__.setLabel('1314'));
  await page.waitForTimeout(2300);
  await snap(page, '05-cinematic-effects', 'text-1314.png');
  await page.evaluate(() => window.__LAB__.setLabel('LOVE'));
  await page.waitForTimeout(2300);
  await snap(page, '05-cinematic-effects', 'text-love.png');
  await page.evaluate(() => window.__LAB__.setLabel('Merry Christmas'));
  await page.waitForTimeout(2400);
  await snap(page, '05-cinematic-effects', 'text-merry-christmas.png');
  await page.evaluate(() => window.__LAB__.actions.journey());
  await page.waitForTimeout(2800);
  await snap(page, '05-cinematic-effects', 'journey-through-stars.png');
  await page.evaluate(() => window.__LAB__.actions.top());
  await page.waitForTimeout(2200);
  await snap(page, '05-cinematic-effects', 'top-down.png');
  await panelShot(page, '05-cinematic-effects', 'controls.png');
  const m = await metrics(page);
  result.labs.push({ id: '05-cinematic-effects', metrics: m, errors });
  result.errors.push(...errors.map((e) => `[05] ${e}`));
  await context.close();
}

try {
  await capture01();
  await capture02();
  await capture03();
  await capture04();
  await capture05();
} finally {
  await browser.close();
}
writeFileSync(path.join(OUT, 'performance.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
