import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960','--disable-features=RendererCodeIntegrity']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.bringToFront(); await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready); await page.waitForTimeout(3500);
await page.evaluate(()=>{document.querySelector('#ui').style.display=''; const p=document.querySelector('#control-panel'); if(!p.classList.contains('is-open'))document.querySelector('#btn-panel').click(); const s=document.querySelector('.panel-scroll'); s.scrollTop=470; const sec=document.querySelectorAll('.control-section')[1]; if(sec)sec.setAttribute('open','');});
await page.waitForTimeout(600); await page.screenshot({path:'docs/F3/screenshots/12-controls-lights-helix.png'});
console.log(JSON.stringify(await page.evaluate(()=>({settings:window.__CHRISTMAS_WISH__.getSettings(),fps:window.__CHRISTMAS_WISH__.getFps()})))); await browser.close();
