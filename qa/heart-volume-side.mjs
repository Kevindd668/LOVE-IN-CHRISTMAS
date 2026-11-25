import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(3200);
await page.evaluate(()=>{document.querySelector('#btn-panel-close')?.click(); const a=window.__CHRISTMAS_WISH__.app; a.tree.group.visible=false; a.numbers.group.visible=false; a.photos.group.visible=false; a.gifts.group.visible=false; a.hearts.group.visible=false; a.snow.points.visible=false; a.galaxy.group.visible=false; a.stars.group.visible=false; a.aurora.group.visible=false; a.magic.group.visible=false; a.cameraManager.beginCinematic(); a.cameraManager.camera.position.set(18,7.6,-9.5); a.cameraManager.controls.target.set(3.8,7.6,-9.5); a.cameraManager.camera.lookAt(3.8,7.6,-9.5);});
await page.waitForTimeout(600); await page.screenshot({path:'docs/F3/heart-look/volume-side.png'});
await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.giantHeart.setPaused(true); a.giantHeart.points.rotation.y=0.9;}); await page.waitForTimeout(300); await page.screenshot({path:'docs/F3/heart-look/volume-three-quarter.png'});
await browser.close();
