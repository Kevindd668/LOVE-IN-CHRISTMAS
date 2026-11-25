import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(4000);
const hideUi=async()=>page.evaluate(()=>{const ui=document.querySelector('#ui'); if(ui)ui.style.display='none';});
const hideWorld=async()=>page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.tree.group.visible=false; a.numbers.group.visible=false; a.photos.group.visible=false; a.gifts.group.visible=false; a.hearts.group.visible=false; a.snow.points.visible=false; a.giantHeart.setVisible(false); a.magic.group.visible=false; a.galaxy.setWaterfallEnabled(false); a.galaxy.setOrbitsEnabled(false); a.cameraManager.beginCinematic(); a.cameraManager.camera.position.set(0,7,18); a.cameraManager.controls.target.set(0,17,-40); a.cameraManager.camera.lookAt(0,17,-40);});
const layers=async(v)=>page.evaluate(v=>{const a=window.__CHRISTMAS_WISH__.app; a.galaxy.nearStars.visible=v.stars; a.galaxy.farStars.visible=v.stars; a.galaxy.nebulaGroup.visible=v.nebula; a.galaxy.auroraGroup.visible=v.aurora; a.galaxy.galaxyBand.visible=v.band; a.galaxy.setMeteorsEnabled(v.meteors);},v);
const shot=async(n)=>{await page.waitForTimeout(550); await page.screenshot({path:`docs/F3/wp1/${n}.png`});};
await hideUi(); await hideWorld();
await layers({stars:true,nebula:false,aurora:false,band:true,meteors:false}); await shot('01-stars');
await layers({stars:false,nebula:true,aurora:false,band:false,meteors:false}); await shot('02-nebula');
await layers({stars:false,nebula:false,aurora:true,band:false,meteors:false}); await shot('03-aurora');
await layers({stars:true,nebula:true,aurora:true,band:true,meteors:true}); await page.waitForTimeout(1100); await page.screenshot({path:'docs/F3/wp1/04-meteor-sky.png'});
// complete scene, UI visible? use clean UI hidden and home camera
await page.reload({waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(4200); await hideUi(); await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.cameraManager.beginCinematic(); a.cameraManager.camera.position.set(0,6.25,20.5); a.cameraManager.controls.target.set(0,4.8,0); a.cameraManager.camera.lookAt(0,4.8,0);}); await page.waitForTimeout(600); await page.screenshot({path:'docs/F3/wp1/05-complete.png'});
console.log(JSON.stringify({errors},null,2)); await browser.close();
