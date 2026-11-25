/**
 * F0 performance / stability baseline for the CURRENT shipped build.
 *
 * The official runnable artifact is `../Christmas-Wish.html` (same bytes as
 * `./Christmas-Wish.html`). It is loaded over file:// so no dev-server
 * instrumentation is involved. This script is QA-only; it does not touch
 * production source code.
 *
 * Run: node qa/f0-baseline.mjs
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HTML = pathToFileURL(path.resolve(ROOT, 'Christmas-Wish.html')).href;
const OUT = path.resolve(ROOT, 'qa', 'f0');
mkdirSync(OUT, { recursive: true });
const SHOTS = path.join(OUT, 'screenshots');
mkdirSync(SHOTS, { recursive: true });

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SAMPLE_SECONDS = 15;
const WARMUP_MS = 2400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: false,
  args: [
    '--window-position=20,20',
    '--window-size=2570,1450',
    '--disable-features=RendererCodeIntegrity'
  ]
});

const report = {
  generatedAt: new Date().toISOString(),
  artifact: {
    file: HTML,
    sha256:
      process.platform === 'win32'
        ? (await import('node:child_process')).execFileSync(
            'powershell.exe',
            [
              '-NoProfile',
              '-Command',
              `(Get-FileHash -Algorithm SHA256 '${path.resolve(ROOT, 'Christmas-Wish.html')}').Hash`
            ],
            { encoding: 'utf8' }
          ).trim()
        : 'see BASELINE.md'
  },
  environment: { browserVersion: browser.version() },
  runs: [],
  sustained: null,
  consoleErrors: []
};

/**
 * Load the production file in a fresh context. A fresh context means no
 * persisted settings from earlier runs can contaminate the baseline.
 */
async function openPage({ width, height, dpr = 1, query = '', uploadPhotos = 0 }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.addInitScript(() => {
    window.__F0_CONTEXT_LOST__ = 0;
    window.addEventListener(
      'webglcontextlost',
      () => {
        window.__F0_CONTEXT_LOST__ += 1;
      },
      true
    );
  });

  const startedAt = Date.now();
  await page.goto(HTML + query, { waitUntil: 'load', timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready === true, null, {
    timeout: 30000
  });
  const readyMs = Date.now() - startedAt;
  await sleep(WARMUP_MS);

  // The desktop panel opens automatically. Measure the main scene without it.
  await page.evaluate(() => {
    const panel = document.querySelector('#control-panel');
    if (panel?.classList.contains('is-open')) {
      document.querySelector('#btn-panel-close')?.click();
    }
  });
  await sleep(400);

  let photoCount = 0;
  if (uploadPhotos > 0) {
    const files = [];
    for (let i = 0; i < uploadPhotos; i += 1) {
      files.push(path.resolve(ROOT, 'qa', 'placeholders', `${(i % 8) + 1}.jpg`));
    }
    await page.evaluate(() => document.querySelector('#btn-panel')?.click());
    await page.waitForTimeout(350);
    await page.locator('#photo-input').setInputFiles(files);
    await page.waitForFunction(
      (expected) => window.__CHRISTMAS_WISH__.photos().length === expected,
      8 + uploadPhotos,
      { timeout: 30000 }
    );
    photoCount = await page.evaluate(() => window.__CHRISTMAS_WISH__.photos().length);
    await page.evaluate(() => {
      const panel = document.querySelector('#control-panel');
      if (panel?.classList.contains('is-open')) {
        document.querySelector('#btn-panel-close')?.click();
      }
    });
    await page.waitForTimeout(2200);
  }

  return { context, page, errors, readyMs, photoCount };
}

async function collect(page) {
  return page.evaluate(() => {
    const app = window.__CHRISTMAS_WISH__.app;
    const canvas = document.querySelector('#scene-canvas');
    const gl = canvas.getContext('webgl2');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    const mem = performance.memory;
    return {
      mode: document.body.dataset.renderMode,
      quality: app.settings.current.quality,
      photoCount: app.photos.count,
      fps: app.lastFps,
      directRendering: app.renderer.directRendering,
      pipeline: Boolean(app.renderer.pipeline),
      drawCalls: app.renderer.renderer.info.render.calls,
      triangles: app.renderer.renderer.info.render.triangles,
      points: app.renderer.renderer.info.render.points,
      lines: app.renderer.renderer.info.render.lines,
      geometries: app.renderer.renderer.info.memory.geometries,
      textures: app.renderer.renderer.info.memory.textures,
      programs: app.renderer.renderer.info.programs?.length ?? 0,
      pixelRatio: app.renderer.currentPixelRatio,
      canvas: [canvas.width, canvas.height],
      viewport: [innerWidth, innerHeight],
      dpr: devicePixelRatio,
      heapBytes: mem ? mem.usedJSHeapSize : null,
      heapTotalBytes: mem ? mem.totalJSHeapSize : null,
      contextLost: window.__F0_CONTEXT_LOST__ ?? 0,
      gpu: gl
        ? {
            vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
          }
        : null
    };
  });
}

/**
 * Sample real rAF intervals while the app itself is rendering. Values are in
 * milliseconds; the WebGL scene remains interactive and un-paused.
 */
async function measureFrames(page, seconds) {
  return page.evaluate(async (durationSeconds) => {
    const app = window.__CHRISTMAS_WISH__.app;
    const intervals = [];
    let start = 0;
    let last = 0;
    await new Promise((resolve) => {
      const tick = (now) => {
        if (!start) {
          start = now;
          last = now;
        } else {
          intervals.push(now - last);
          last = now;
        }
        if (now - start < durationSeconds * 1000) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    const sorted = [...intervals].sort((a, b) => a - b);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    const sum = intervals.reduce((acc, value) => acc + value, 0);
    const mean = sum / Math.max(1, intervals.length);
    return {
      measuredSeconds: (last - start) / 1000,
      frames: intervals.length,
      fpsMean: 1000 / Math.max(0.0001, mean),
      fpsMedian: 1000 / Math.max(0.0001, percentile(0.5)),
      appFps: app.lastFps,
      frameMsMean: mean,
      frameMsP50: percentile(0.5),
      frameMsP95: percentile(0.95),
      frameMsP99: percentile(0.99),
      frameMsMax: sorted[sorted.length - 1] ?? null,
      over33ms: intervals.filter((value) => value > 33.4).length,
      over50ms: intervals.filter((value) => value > 50).length,
      over100ms: intervals.filter((value) => value > 100).length
    };
  }, seconds);
}

async function run(name, options, afterReady) {
  console.log(`\n[F0] ${name}: loading ...`);
  const { context, page, errors, readyMs, photoCount } = await openPage(options);
  try {
    if (afterReady) await afterReady(page);
    await sleep(1200);
    const before = await collect(page);
    const frameMetrics = await measureFrames(page, options.sampleSeconds ?? SAMPLE_SECONDS);
    const after = await collect(page);
    if (options.screenshot) {
      await page.screenshot({ path: path.join(SHOTS, options.screenshot), fullPage: false });
    }
    const result = {
      name,
      readyMs,
      photoCount,
      options,
      before,
      frames: frameMetrics,
      after,
      consoleErrors: errors
    };
    report.runs.push(result);
    report.consoleErrors.push(...errors.map((error) => `[${name}] ${error}`));
    console.log(
      `[F0] ${name}: appFps=${frameMetrics.appFps} mean=${frameMetrics.fpsMean.toFixed(
        1
      )} p95=${frameMetrics.frameMsP95.toFixed(2)}ms drawCalls=${after.drawCalls} mode=${after.mode}`
    );
    return result;
  } finally {
    await context.close();
  }
}

async function sustainedRun() {
  console.log('\n[F0] sustained: loading 1440x900 ...');
  const { context, page, errors, readyMs } = await openPage({ width: 1440, height: 900 });
  const cdp = await context.newCDPSession(page);
  const samples = [];
  try {
    await sleep(1500);
    for (let i = 0; i <= 8; i += 1) {
      if (i > 0) await sleep(30000);
      await cdp.send('HeapProfiler.collectGarbage').catch(() => undefined);
      const metrics = await collect(page);
      const perf = await cdp.send('Performance.getMetrics').catch(() => null);
      samples.push({
        elapsedSeconds: i * 30,
        fps: metrics.fps,
        heapBytes: metrics.heapBytes,
        heapTotalBytes: metrics.heapTotalBytes,
        geometries: metrics.geometries,
        textures: metrics.textures,
        programs: metrics.programs,
        drawCalls: metrics.drawCalls,
        contextLost: metrics.contextLost,
        domNodes:
          perf?.metrics?.find((entry) => entry.name === 'Nodes')?.value ??
          perf?.metrics?.find((entry) => entry.name === 'JSEventListeners')?.value ??
          null
      });
      console.log(
        `[F0] sustained ${i * 30}s: fps=${metrics.fps} heap=${(
          (metrics.heapBytes ?? 0) / 1048576
        ).toFixed(1)}MB textures=${metrics.textures} geometries=${metrics.geometries}`
      );
    }
    report.sustained = {
      readyMs,
      durationSeconds: samples.at(-1)?.elapsedSeconds ?? 0,
      samples,
      firstHeapBytes: samples[0]?.heapBytes ?? null,
      lastHeapBytes: samples.at(-1)?.heapBytes ?? null,
      heapDeltaBytes:
        samples[0]?.heapBytes != null && samples.at(-1)?.heapBytes != null
          ? samples.at(-1).heapBytes - samples[0].heapBytes
          : null,
      contextLost: samples.at(-1)?.contextLost ?? 0,
      consoleErrors: errors
    };
    report.consoleErrors.push(...errors.map((error) => `[sustained] ${error}`));
  } finally {
    await context.close();
  }
}

try {
  await run(
    'compatible-ultra-1440x900',
    { width: 1440, height: 900, dpr: 1, screenshot: 'compatible-1440.png' },
    null
  );
  await run(
    'full-ultra-1440x900',
    { width: 1440, height: 900, dpr: 1, query: '?full=1', screenshot: 'full-1440.png' },
    null
  );
  await run('compatible-ultra-1920x1080', { width: 1920, height: 1080, dpr: 1 }, null);
  await run(
    'compatible-ultra-4k-equivalent',
    { width: 1920, height: 1080, dpr: 2 },
    null
  );
  await run(
    'compatible-balanced-1440x900',
    { width: 1440, height: 900, dpr: 1 },
    async (page) => {
      await page.evaluate(() => window.__CHRISTMAS_WISH__.setQuality('balanced'));
    }
  );
  await run(
    'compatible-performance-1440x900',
    { width: 1440, height: 900, dpr: 1 },
    async (page) => {
      await page.evaluate(() => window.__CHRISTMAS_WISH__.setQuality('performance'));
    }
  );
  await run(
    'compatible-ultra-24-photos-1920x1080',
    {
      width: 1920,
      height: 1080,
      dpr: 1,
      uploadPhotos: 16,
      screenshot: 'compatible-24-photos.png'
    },
    null
  );
  await run(
    'full-ultra-24-photos-1920x1080',
    {
      width: 1920,
      height: 1080,
      dpr: 1,
      query: '?full=1',
      uploadPhotos: 16,
      screenshot: 'full-24-photos.png'
    },
    null
  );
  await run(
    'compatible-ultra-demo-1440x900',
    { width: 1440, height: 900, dpr: 1, sampleSeconds: 45 },
    async (page) => {
      await page.locator('#btn-demo').click();
      await sleep(500);
    }
  );
  await sustainedRun();
} finally {
  await browser.close();
}

// Capture the actual device profile from the final run's WebGL context before
// the browser is closed by ensuring at least one run recorded it.
for (const result of report.runs) {
  if (result.after.gpu) {
    report.environment = {
      ...report.environment,
      gpu: result.after.gpu,
      viewport: result.after.viewport,
      dpr: result.after.dpr
    };
    break;
  }
}

writeFileSync(
  path.resolve(OUT, 'performance-baseline.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8'
);
console.log(`\n[F0] wrote ${path.resolve(OUT, 'performance-baseline.json')}`);
console.log(`[F0] console errors: ${report.consoleErrors.length}`);
