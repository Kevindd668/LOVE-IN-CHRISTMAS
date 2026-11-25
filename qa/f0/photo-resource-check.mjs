import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
const root=process.cwd();
const url=pathToFileURL(path.resolve(root,'Christmas-Wish.html')).href;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage();
const errors=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'load',timeout:60000}); await page.bringToFront();
await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready===true,null,{timeout:30000}); await page.waitForTimeout(2800);
const read=()=>page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app;return{photoCount:a.photos.count,textures:a.renderer.renderer.info.memory.textures,geometries:a.renderer.renderer.info.memory.geometries,drawCalls:a.renderer.renderer.info.render.calls};});
await page.evaluate(()=>document.querySelector('#btn-panel')?.click()); await page.waitForTimeout(350);
const before=await read();
const files=[]; for(let i=0;i<16;i++) files.push(path.resolve(root,'qa/placeholders',`${(i%8)+1}.jpg`));
await page.locator('#photo-input').setInputFiles(files);
await page.waitForFunction(()=>window.__CHRISTMAS_WISH__.photos().length===24,null,{timeout:30000}); await page.waitForTimeout(1200);
const afterUpload=await read();
const removed=await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; const ids=a.photos.views.filter(p=>!p.isDefault).map(p=>p.id); let n=0; for(const id of ids){if(a.photos.removePhoto(id))n++;} return n;});
await page.waitForTimeout(1600);
const cdp=await context.newCDPSession(page); await cdp.send('HeapProfiler.collectGarbage').catch(()=>undefined);
const afterDelete=await read();
await context.close(); await browser.close();

console.log(JSON.stringify({before,afterUpload,afterDelete,removed,errors},null,2));
writeFileSync(path.resolve(root,'qa/f0/photo-resource-check.json'),JSON.stringify({before,afterUpload,afterDelete,removed,errors},null,2)+'\n','utf8');

