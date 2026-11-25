import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=20,20','--window-size=1480,960']});
const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready);await p.waitForFunction(()=>window.__CHRISTMAS_WISH__.film?.isEntryOpen);await p.screenshot({path:'docs/F5/evidence/wp2-00-entry.png'});
await p.locator('.intro-start-button').click();await p.waitForFunction(()=>window.__CHRISTMAS_WISH__.intro.isActive,{timeout:30000});await p.evaluate(()=>window.__CHRISTMAS_WISH__.film.pause());
for(const [name,t] of [['01-awakening',0.8],['02-spiral',1.8],['03-heart',4.15],['04-title',5.4],['05-tree',7.9]]){await p.evaluate(({t})=>window.__CHRISTMAS_WISH__.introSeek(t),{t});await p.waitForTimeout(700);await p.screenshot({path:`docs/F5/evidence/wp2-${name}.png`});console.log(name,await p.evaluate(()=>({phase:window.__CHRISTMAS_WISH__.intro.currentPhase,t:window.__CHRISTMAS_WISH__.intro.currentElapsed,film:window.__CHRISTMAS_WISH__.film.currentState})));}
console.log('errors',errors);await b.close();
