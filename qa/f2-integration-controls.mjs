import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(3200);
const set=async(key,value)=>page.evaluate(({key,value})=>{const el=document.querySelector(`[data-setting="${key}"]`); if(!el)throw new Error('missing '+key); if(el.type==='checkbox')el.checked=Boolean(value); else el.value=String(value); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));},{key,value});
const state=async()=>page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; return {starsOn:a.settings.get('starsOn'),auroraOn:a.settings.get('auroraOn'),meteorsOn:a.settings.get('meteorsOn'),waterfallOn:a.settings.get('waterfallOn'),orbitsOn:a.settings.get('orbitsOn'),giantOn:a.settings.get('giantHeartOn'),paused:a.settings.get('giantHeartPaused'),count:a.giantHeart.particleCount,drawCount:a.giantHeart.points.geometry.drawRange.count,mode:a.giantHeart.currentMode,heartVisible:a.giantHeart.group.visible,nearVisible:a.galaxy.nearStars.visible,auroraVisible:a.galaxy.auroraGroup.visible,meteorVisible:a.galaxy.meteorGroup.visible,waterfallVisible:a.galaxy.waterfall.visible,orbitVisible:a.galaxy.orbitGroup.visible,quality:a.settings.get('quality'),galaxyQuality:a.galaxy.getStats().quality};});
const out={initial:await state()};
for(const [k,v] of [['starsOn',false],['auroraOn',false],['meteorsOn',false],['waterfallOn',false],['orbitsOn',false],['giantHeartOn',false],['giantHeartCount',5000]]){await set(k,v); await page.waitForTimeout(80); out[k]=await state();}
await set('giantHeartOn',true); await set('giantHeartCount',7000); await page.waitForTimeout(200);
await set('giantHeartPaused',true); await page.waitForTimeout(350);
const p0=await page.evaluate(()=>Array.from(window.__CHRISTMAS_WISH__.app.giantHeart.points.geometry.attributes.position.array.slice(0,300)));
await page.waitForTimeout(500);
const p1=await page.evaluate(()=>Array.from(window.__CHRISTMAS_WISH__.app.giantHeart.points.geometry.attributes.position.array.slice(0,300)));
out.pause={same:p0.every((v,i)=>Math.abs(v-p1[i])<1e-6), mode:(await state()).mode, count:(await state()).count, setting:(await state()).paused};
await page.evaluate(()=>document.querySelector('#btn-giant-heart-gather')?.click()); await page.waitForTimeout(150); out.gather=(await state()).mode;
await page.evaluate(()=>document.querySelector('#btn-giant-heart-burst')?.click()); await page.waitForTimeout(150); out.burst=(await state()).mode;
await page.evaluate(()=>window.__CHRISTMAS_WISH__.app.setQuality('performance')); await page.waitForTimeout(300); out.performance=await state();
await page.evaluate(()=>window.__CHRISTMAS_WISH__.app.setQuality('ultra')); await page.waitForTimeout(300); out.ultra=await state();
out.errors=errors; console.log(JSON.stringify(out,null,2)); await browser.close();

