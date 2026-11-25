import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:8787/01-heart-particles/',{waitUntil:'networkidle'}); await page.waitForTimeout(1800);
await page.evaluate(()=>{ __LAB__.actions.heart(); __LAB__.actions.resetView(); });
await page.waitForTimeout(2500);
await page.evaluate(()=>__LAB__.ui.setOpen(true)); await page.waitForTimeout(400);
await page.screenshot({path:'experiments/01-heart-particles/screenshots/controls.png'});
console.log(JSON.stringify(await page.evaluate(()=>__LAB__.getStats()))); await browser.close();
