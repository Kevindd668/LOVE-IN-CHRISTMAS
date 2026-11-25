import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

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

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.bringToFront();
await page.waitForFunction(() => window.__CHRISTMAS_WISH__?.ready, { timeout: 30000 });
await page.waitForTimeout(5000);
await page.evaluate(() => {
  document.querySelector('#ui').style.display = 'none';
  const app = window.__CHRISTMAS_WISH__.app;
  app.cameraManager.resetView(true);
  app.cameraManager.controls.autoRotate = true;
  app.cameraManager.controls.autoRotateSpeed = 0.55;
});
await page.evaluate(() => {
  const canvas = document.querySelector('#scene-canvas');
  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_500_000 });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  window.__finalVideoRec = { recorder, chunks };
  recorder.start();
});
await page.waitForTimeout(10000);
const base64 = await page.evaluate(async () => {
  const { recorder, chunks } = window.__finalVideoRec;
  await new Promise((resolve) => {
    recorder.onstop = resolve;
    recorder.stop();
  });
  const blob = new Blob(chunks, { type: 'video/webm' });
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
});
const output = Buffer.from(base64, 'base64');
writeFileSync('docs/F3/final-video.webm', output);
console.log(JSON.stringify({ bytes: output.length, errors }, null, 2));
await browser.close();
