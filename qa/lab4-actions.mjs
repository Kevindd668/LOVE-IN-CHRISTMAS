import { chromium } from 'playwright-core';
import path from 'node:path';
const root=process.cwd();
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}); const errors=[];
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8787/04-photo-memory/',{waitUntil:'networkidle',timeout:60000}); await page.bringToFront(); await page.waitForFunction(()=>window.__LAB__?.records?.length===12,null,{timeout:30000}); await page.waitForTimeout(1800);
const files=[]; for(let i=1;i<=8;i++) files.push(path.resolve(root,'qa/placeholders',`${i}.jpg`));
await page.locator('#photo-upload-input').setInputFiles(files); await page.waitForFunction(()=>window.__LAB__.records.length===20,null,{timeout:30000}); await page.waitForTimeout(800);
const afterUpload=await page.evaluate(()=>({n:__LAB__.records.length, rows:document.querySelectorAll('.photo-row').length, file:__LAB__.records[12]?.fileName}));
// replace the first uploaded photo (index 12)
const replaceButton=page.locator('.photo-row').nth(12).getByTitle('替换');
const [chooser]=await Promise.all([page.waitForEvent('filechooser',{timeout:5000}), replaceButton.click()]);
await chooser.setFiles(path.resolve(root,'qa/placeholders/3.jpg')); await page.waitForTimeout(900);
const afterReplace=await page.evaluate(()=>({n:__LAB__.records.length, file:__LAB__.records[12]?.fileName}));
// delete the 14th row
await page.locator('.photo-row').nth(13).getByTitle('删除').click(); await page.waitForTimeout(500);
const afterDelete=await page.evaluate(()=>({n:__LAB__.records.length, rows:document.querySelectorAll('.photo-row').length, first:__LAB__.records[0]?.fileName}));
// move first row backward
await page.locator('.photo-row').nth(0).getByTitle('向后').click(); await page.waitForTimeout(300);
const afterSort=await page.evaluate(()=>__LAB__.records.slice(0,2).map(r=>r.fileName));
// project first card and click it
const point=await page.evaluate(()=>{const lab=__LAB__; const rec=lab.records[0]; const p=rec.card.group.position.clone(); p.y+=0.15; p.project(lab.camera); return {x:Math.round((p.x*.5+.5)*innerWidth),y:Math.round((-p.y*.5+.5)*innerHeight)};});
await page.mouse.click(point.x,point.y); await page.waitForTimeout(600);
const focus=await page.evaluate(()=>({focused:__LAB__.getStats().focused,detail:document.querySelector('#photo-detail').classList.contains('is-open')}));
await page.locator('#photo-detail-close').click(); await page.waitForTimeout(500);
// top up to 24 photos
await page.locator('#photo-upload-input').setInputFiles(files); await page.waitForFunction(()=>__LAB__.records.length===24,null,{timeout:30000}); await page.waitForTimeout(500);
const after24=await page.evaluate(()=>({n:__LAB__.records.length, rows:document.querySelectorAll('.photo-row').length, stats:__LAB__.getStats()}));
await page.screenshot({path:'qa/f1/lab4-interaction-test.png'});
console.log(JSON.stringify({afterUpload,afterReplace,afterDelete,afterSort,point,focus,after24,errors},null,2));
await browser.close();
