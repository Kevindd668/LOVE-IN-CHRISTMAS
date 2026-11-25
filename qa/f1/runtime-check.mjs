import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const out=path.resolve('qa/f1'); mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity','--use-fake-ui-for-media-stream']});
const results=[];
async function check(name,url,wait=4500,screenshot=null){
  const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,permissions:[]});
  const page=await ctx.newPage(); const consoleErrors=[]; const pageErrors=[]; const failed=[];
  page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('requestfailed',r=>failed.push(r.url()+' :: '+r.failure()?.errorText));
  let status='ok';
  try {
    await page.goto(url,{waitUntil:'networkidle',timeout:30000});
    await page.bringToFront(); await page.waitForTimeout(wait);
    const info=await page.evaluate(async ()=>{
      const canvas=document.querySelector('canvas');
      const start=performance.now(); let frames=0;
      await new Promise(res=>{const f=(t)=>{frames++; if(t-start<3000) requestAnimationFrame(f); else res();}; requestAnimationFrame(f);});
      return {title:document.title,canvas:canvas?{width:canvas.width,height:canvas.height}:null,fps:Math.round(frames/3),bodyText:(document.body.innerText||'').slice(0,300)};
    });
    results.push({name,status,url,info,consoleErrors,pageErrors,failed});
    if(screenshot) await page.screenshot({path:path.join(out,screenshot)});
  } catch(e) { status='error'; results.push({name,status,url,error:String(e),consoleErrors,pageErrors,failed}); }
  await ctx.close();
}
await check('Heart-Star','http://127.0.0.1:8801/index.html',5000,'heart-star-runtime.png');
await check('Interactive-Xmas-Tree','http://127.0.0.1:8802/index.html',6500,'interactive-xmas-tree-runtime.png');
console.log(JSON.stringify(results,null,2));
writeFileSync(path.join(out,'runtime-spot-check.json'),JSON.stringify(results,null,2)+'\n','utf8');
await browser.close();
