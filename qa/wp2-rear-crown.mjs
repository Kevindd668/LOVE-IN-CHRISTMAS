import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(4000);
await page.evaluate(()=>{const ui=document.querySelector('#ui'); if(ui)ui.style.display='none'; const a=window.__CHRISTMAS_WISH__.app; a.photos.group.visible=false; a.numbers.group.visible=false; a.giantHeart.setVisible(false); a.cameraManager.beginCinematic();});
// rear view
await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.galaxy.setWaterfallPathMask(4); a.cameraManager.camera.position.set(0,7,-15); a.cameraManager.controls.target.set(0,5.2,0); a.cameraManager.camera.lookAt(0,5.2,0);}); await page.waitForTimeout(700); await page.screenshot({path:'docs/F3/wp2/03-rear.png'});
// crown view
await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.galaxy.setWaterfallPathMask(8); a.cameraManager.camera.position.set(0,9.5,10); a.cameraManager.controls.target.set(0,10.8,0); a.cameraManager.camera.lookAt(0,10.8,0);}); await page.waitForTimeout(700); await page.screenshot({path:'docs/F3/wp2/04-crown.png'});
// back to all overview with overlays
await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.galaxy.setWaterfallPathMask(15); a.photos.group.visible=true; a.numbers.group.visible=true; a.giantHeart.setVisible(true); a.cameraManager.camera.position.set(0,6.25,20.5); a.cameraManager.controls.target.set(0,4.8,0); a.cameraManager.camera.lookAt(0,4.8,0);}); await page.waitForTimeout(600);
console.log(JSON.stringify({errors},null,2)); await browser.close();
