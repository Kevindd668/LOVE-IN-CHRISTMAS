import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: false,
  args: ['--window-position=0,0', '--window-size=2600,1500']
});

const cases = [
  { name: 'f3-1440-default', width: 1440, height: 900, full: false },
  { name: 'f3-1920-default', width: 1920, height: 1080, full: false },
  { name: 'f3-3840-default', width: 3840, height: 2160, full: false },
  { name: 'f3-1440-full-bloom', width: 1440, height: 900, full: true },
  { name: 'f3-3840-full-bloom', width: 3840, height: 2160, full: true },
  { name: 'f3-1440-performance', width: 1440, height: 900, full: false, quality: 'performance' },
  { name: 'f3-1440-24-photos', width: 1440, height: 900, full: false, photos: 24 }
];
const report = { cases: [], errors: [] };
mkdirSync('qa/f3-final', { recursive: true });

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const query = testCase.full ? '?full=1' : '';
  await page.goto(`http://127.0.0.1:4173/${query}`, { waitUntil: 'networkidle' });
  await page.bringToFront();
  await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, { timeout: 30000 });
  await page.waitForTimeout(6500);
  await page.evaluate(() => document.querySelector('#btn-panel-close')?.click());

  if (testCase.quality) {
    await page.evaluate((quality) => window.__CHRISTMAS_WISH__.setQuality(quality), testCase.quality);
    await page.waitForTimeout(1200);
  }
  if (testCase.photos) {
    await page.evaluate(async (target) => {
      const app = window.__CHRISTMAS_WISH__.app;
      const files = [];
      for (let i = app.photos.count; i < target; i += 1) {
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
        files.push(new File([blob], `perf-${Date.now()}-${i}.png`, { type: 'image/png' }));
      }
      await app.photos.addFiles(files);
    }, testCase.photos);
    await page.waitForTimeout(2400);
  }

  const measurement = await page.evaluate(async () => {
    const app = window.__CHRISTMAS_WISH__.app;
    const intervals = [];
    let start = 0;
    let last = 0;
    await new Promise((resolve) => {
      const frame = (now) => {
        if (!start) {
          start = now;
          last = now;
        } else {
          intervals.push(now - last);
          last = now;
        }
        if (now - start < 5000) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    const sorted = [...intervals].sort((a, b) => a - b);
    const percentile = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const info = app.renderer.renderer.info;
    return {
      fps: Number((1000 / mean).toFixed(1)),
      p50: Number(percentile(0.5).toFixed(1)),
      p95: Number(percentile(0.95).toFixed(1)),
      max: Number(sorted[sorted.length - 1].toFixed(1)),
      calls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      programs: info.programs?.length ?? null,
      heapMB: performance.memory
        ? Number((performance.memory.usedJSHeapSize / 1048576).toFixed(1))
        : null,
      photoCount: app.photos.count,
      quality: window.__CHRISTMAS_WISH__.getSettings().quality,
      canvas: [document.querySelector('#scene-canvas').width, document.querySelector('#scene-canvas').height],
      waterfallGroups: app.galaxy.waterfallGroups.length,
      treeScale: app.tree.group.scale.x,
      contextLost: 0
    };
  });

  report.cases.push({ name: testCase.name, ...measurement, errors });
  report.errors.push(...errors);
  console.log(testCase.name, measurement);
  await context.close();
}

writeFileSync('qa/f3-final/performance.json', JSON.stringify(report, null, 2));
await browser.close();
