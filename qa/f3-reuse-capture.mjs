import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(4200);
const shot=async(name)=>{await page.waitForTimeout(450); await page.screenshot({path:`docs/F3/reuse-screenshots/${name}`});};
const pose=async(pos,target)=>{await page.evaluate(({pos,target})=>{const a=window.__CHRISTMAS_WISH__.app; const cm=a.cameraManager; cm.beginCinematic(); cm.camera.position.set(...pos); cm.controls.target.set(...target); cm.camera.lookAt(...target); cm.camera.updateMatrixWorld();},{pos,target});};
const layers=async({ui=true,extras=true,helix=true,lights=true,ornaments=true,star=true,gifts=true,panel=false}={})=>{await page.evaluate(({ui,extras,helix,lights,ornaments,star,gifts,panel})=>{const a=window.__CHRISTMAS_WISH__.app; const u=document.querySelector('#ui'); if(u)u.style.display=ui?'':'none'; const p=document.querySelector('#control-panel'); if(p){if(panel)p.classList.add('is-open');else p.classList.remove('is-open');} [a.numbers.group,a.photos.group,a.hearts.group,a.snow.points,a.stars.group,a.aurora.group,a.magic.group].forEach(g=>g.visible=extras); a.tree.helix.group.visible=helix; a.tree.ornaments.group.visible=ornaments; a.tree.star.root.visible=star; a.tree.lights.group.visible=lights; a.gifts.group.visible=gifts; a.tree.helix.setEnabled(helix); a.tree.ornaments.setEnabled(ornaments); a.tree.star.root.visible=star;},{ui,extras,helix,lights,ornaments,star,gifts,panel});};
const metrics=await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; const t=a.tree; const hearts=t.ornaments.group.children.map(m=>({count:m.count,type:m.type})); const g=t.star.starMesh.geometry; g.computeBoundingBox(); return {fps:a.lastFps,calls:a.renderer.renderer.info.render.calls,triangles:a.renderer.renderer.info.render.triangles,hearts,starBox:[g.boundingBox.min.toArray(),g.boundingBox.max.toArray()],starPick:t.star.starMesh.userData.pickType,ornamentCount:t.ornaments.group.children.reduce((n,m)=>n+(m.count||0),0)};});
// overall front
await layers({ui:true,extras:true,panel:false}); await pose([0,6.25,20.5],[0,4.8,0]); await shot('after-01-front.png');
// heart ornaments close, UI hidden
await layers({ui:false,extras:false,helix:false,lights:false,ornaments:true,star:false,gifts:false,panel:false}); await pose([3.1,5.55,5.2],[0,5.2,0]); await shot('after-07-hearts-close.png');
// crystal close
await layers({ui:false,extras:false,helix:false,lights:false,ornaments:false,star:true,gifts:false,panel:false}); await pose([0.65,10.28,3.4],[0,9.98,0]); await shot('after-08-crystal-close.png');
// pure tree front
await layers({ui:false,extras:false,helix:true,lights:true,ornaments:true,star:true,gifts:false,panel:false}); await pose([0,6.2,21.2],[0,4.8,0]); await shot('after-10-pure-tree.png');
console.log(JSON.stringify({metrics,errors},null,2)); await browser.close();
