import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready); await page.waitForTimeout(2800);
const set=async(key,value,type='input')=>{await page.evaluate(({key,value,type})=>{const el=document.querySelector(`[data-setting="${key}"]`); if(!el) throw new Error('missing '+key); if(el.type==='checkbox'){el.checked=Boolean(value); el.dispatchEvent(new Event('change',{bubbles:true}));} else {el.value=String(value); el.dispatchEvent(new Event(type,{bubbles:true}));}},{key,value,type}); await page.waitForTimeout(420);};
const read=()=>page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; const b=a.tree.branches; return {settings:window.__CHRISTMAS_WISH__.getSettings(), tree:{height:a.tree.treeHeight,crown:a.tree.treeCrown,rotate:a.tree.rotate,rotateSpeed:a.tree.rotateSpeed,helixVisible:a.tree.helix.group.visible,helixSpeed:a.tree.helix.speed,helixPhase:a.tree.helix.phase,ornamentsVisible:a.tree.ornaments.group.visible,starVisible:a.tree.star.root.visible,brightness:b.brightness}, lights:{visible:a.tree.lights.group.visible,count:a.tree.lights.count,brightness:a.tree.lights.material.uniforms.uBrightness.value,speed:a.tree.lights.material.uniforms.uSpeed.value,bulbs:a.tree.lights.bulbs.map(x=>x.colorIndex)}, gifts:a.gifts.giftStates.length,photos:a.photos.count,palette:b.palette.main.getHexString(),demoKeys:Object.keys(a.demo),demoDuration:a.demo.duration??a.demo.totalDuration??null,quality:window.__CHRISTMAS_WISH__.getSettings().quality};});
const out={initial:await read()};
await page.evaluate(()=>{if(!document.querySelector('#control-panel').classList.contains('is-open'))document.querySelector('#btn-panel').click();}); await page.waitForTimeout(250);
await set('treeRotate',false); await set('treeRotateSpeed',0.55); out.rotation=await read();
await set('treeHeight',9.8); await page.waitForTimeout(450); await set('crownRadius',3.1); await page.waitForTimeout(450); out.shape=await read();
await set('foliageColor','#123456'); out.foliage=await read();
await set('helixOn',false); await set('helixSpeed',0.7); await set('helixPhase',1.1); out.helix=await read();
await set('lightsOn',false); await set('lightBrightness',2); await set('lightFlashSpeed',2); out.lights=await read();
await set('ornamentsOn',false); await set('crownHeartOn',false); await set('treeBrightness',1.2); out.decorations=await read();
// restore settings and check quality presets
await page.locator('#btn-reset-settings').click(); await page.waitForTimeout(700); out.reset=await read();
for (const q of ['balanced','performance','ultra']) { await page.locator(`[data-quality="${q}"]`).click(); await page.waitForTimeout(350); out['quality_'+q]=await read(); }
// persistence of a new value
await set('treeHeight',9.7); await page.waitForTimeout(600); await page.reload({waitUntil:'networkidle'}); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready); await page.waitForTimeout(2200); out.persisted=await read();
// rebuild memory stability
const heights=[9.1,9.2,9.3,9.4]; out.memory=[]; for (const h of heights){await set('treeHeight',h); await page.waitForTimeout(350); out.memory.push(await page.evaluate(()=>{const r=window.__CHRISTMAS_WISH__.app.renderer.renderer.info.memory; return {geometries:r.geometries,textures:r.textures};}));}
out.errors=errors;
writeFileSync('qa/f3/control-results.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({summary:{initial:out.initial,rotation:out.rotation,shape:out.shape,helix:out.helix,lights:out.lights,decorations:out.decorations,reset:out.reset,persisted:out.persisted,memory:out.memory,errors:out.errors}},null,2));
await browser.close();
