import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(4200);
const shot=async(name)=>{await page.waitForTimeout(450); await page.screenshot({path:`docs/F3/screenshots/${name}`});};
const pose=async(pos,target)=>{await page.evaluate(({pos,target})=>{const a=window.__CHRISTMAS_WISH__.app; const cm=a.cameraManager; cm.beginCinematic(); cm.camera.position.set(...pos); cm.controls.target.set(...target); cm.camera.lookAt(...target); cm.camera.updateMatrixWorld();},{pos,target});};
const setLayers=async({ui=true,extras=true,helix=true,lights=true,ornaments=true,star=true,gifts=true,panel=false}={})=>{await page.evaluate(({ui,extras,helix,lights,ornaments,star,gifts,panel})=>{const a=window.__CHRISTMAS_WISH__.app; const u=document.querySelector('#ui'); if(u)u.style.display=ui?'':'none'; const p=document.querySelector('#control-panel'); if(p){if(panel)p.classList.add('is-open');else p.classList.remove('is-open');} const extrasGroups=[a.numbers.group,a.photos.group,a.hearts.group,a.snow.points,a.stars.group,a.aurora.group,a.magic.group]; for(const g of extrasGroups) g.visible=extras; a.tree.helix.group.visible=helix; a.tree.ornaments.group.visible=ornaments; a.tree.star.root.visible=star; a.tree.lights.group.visible=lights; a.gifts.group.visible=gifts; a.tree.helix.setEnabled(helix); a.tree.ornaments.setEnabled(ornaments); a.tree.star.root.visible=star;},{ui,extras,helix,lights,ornaments,star,gifts,panel});};
// 01-03: real page framing with UI visible, extras visible
await setLayers({ui:true,extras:true,helix:true,lights:true,ornaments:true,star:true,gifts:true,panel:false});
await pose([0,6.25,20.5],[0,4.8,0]); await shot('01-front.png');
await pose([9.0,6.6,17.4],[0,4.75,0]); await shot('02-angle45.png');
await pose([17.6,5.9,3.4],[0,4.65,0]); await shot('03-side.png');
// close studies: UI hidden, extra story particles hidden
await setLayers({ui:false,extras:false,helix:true,lights:true,ornaments:true,star:true,gifts:false,panel:false});
await pose([0.7,10.35,4.6],[0,9.95,0]); await shot('04-crown-close.png');
await pose([3.9,5.4,7.0],[0,4.9,0]); await shot('05-helix-close.png');
await setLayers({ui:false,extras:false,helix:false,lights:true,ornaments:false,star:false,gifts:false,panel:false});
await pose([2.9,4.15,5.4],[0,3.9,0]); await shot('06-bulbs-close.png');
await setLayers({ui:false,extras:false,helix:false,lights:false,ornaments:true,star:false,gifts:false,panel:false});
await pose([3.1,5.55,5.2],[0,5.2,0]); await shot('07-heart-ornaments-close.png');
await setLayers({ui:false,extras:false,helix:false,lights:false,ornaments:false,star:true,gifts:false,panel:false});
await pose([0.65,10.28,3.4],[0,9.98,0]); await shot('08-crystal-heart-close.png');
await setLayers({ui:false,extras:false,helix:true,lights:true,ornaments:true,star:true,gifts:true,panel:false});
await pose([0.45,2.2,8.4],[0,0.7,1.4]); await shot('09-ground-base-close.png');
await setLayers({ui:false,extras:false,helix:true,lights:true,ornaments:true,star:true,gifts:false,panel:false});
await pose([0,6.2,21.2],[0,4.8,0]); await shot('10-pure-tree.png');
// control panel screenshot
await setLayers({ui:true,extras:true,helix:true,lights:true,ornaments:true,star:true,gifts:true,panel:true});
await page.evaluate(()=>{const s=document.querySelector('.panel-scroll'); s.scrollTop=0;});
await shot('11-controls.png');
console.log(JSON.stringify({errors,info:await page.evaluate(()=>({settings:window.__CHRISTMAS_WISH__.getSettings(),fps:window.__CHRISTMAS_WISH__.getFps(),calls:window.__CHRISTMAS_WISH__.getDrawCalls()}))},null,2));
await browser.close();
