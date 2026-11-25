import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=0,0','--window-size=2600,1500','--disable-features=RendererCodeIntegrity']});
const cases=[
 {name:'full-1440x900',width:1440,height:900,dpr:1,partial:false,performance:false,query:''},
 {name:'full-bloom-1440x900',width:1440,height:900,dpr:1,partial:false,performance:false,query:'?full=1'},
 {name:'full-bloom-1920x1080',width:1920,height:1080,dpr:1,partial:false,performance:false,query:'?full=1'},
 {name:'full-bloom-3840x2160',width:3840,height:2160,dpr:1,partial:false,performance:false,query:'?full=1'},
 {name:'full-1920x1080',width:1920,height:1080,dpr:1,partial:false,performance:false,query:''},
 {name:'full-3840x2160',width:3840,height:2160,dpr:1,partial:false,performance:false,query:''},
 {name:'partial-1440x900',width:1440,height:900,dpr:1,partial:true,performance:false,query:''},
 {name:'performance-1440x900',width:1440,height:900,dpr:1,partial:false,performance:true,query:''}
];
const report={generatedAt:new Date().toISOString(),browser:browser.version(),cases:[],errors:[]};
for(const c of cases){
 const context=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:c.dpr});
 const page=await context.newPage(); const errors=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__F3_CONTEXT_LOST__=0; window.addEventListener('webglcontextlost',()=>{window.__F3_CONTEXT_LOST__+=1;},true);});
 await page.goto('http://127.0.0.1:4173/'+(c.query||''),{waitUntil:'networkidle',timeout:60000}); await page.bringToFront();
 await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(3300);
 await page.evaluate(()=>{document.querySelector('#btn-panel-close')?.click();});
 if(c.performance) await page.evaluate(()=>window.__CHRISTMAS_WISH__.app.setQuality('performance'));
 if(c.partial) await page.evaluate(()=>{const a=window.__CHRISTMAS_WISH__.app; a.galaxy.setVisible(false);});
 await page.waitForTimeout(900);
 const metrics=await page.evaluate(async()=>{
  const app=window.__CHRISTMAS_WISH__.app; const intervals=[]; let start=0,last=0;
  await new Promise(resolve=>{const tick=(now)=>{if(!start){start=now;last=now;}else{intervals.push(now-last);last=now;} if(now-start<3000)requestAnimationFrame(tick); else resolve();};requestAnimationFrame(tick);});
  const sorted=[...intervals].sort((a,b)=>a-b); const p=(q)=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]; const mean=intervals.reduce((a,b)=>a+b,0)/Math.max(1,intervals.length);
  const info=app.renderer.renderer.info; const canvas=document.querySelector('#scene-canvas'); const gl=canvas.getContext('webgl2'); const debug=gl?.getExtension('WEBGL_debug_renderer_info');
  return {frames:intervals.length,measuredSeconds:(last-start)/1000,fpsMean:1000/Math.max(.0001,mean),fpsMedian:1000/Math.max(.0001,p(.5)),appFps:app.lastFps,frameMsMean:mean,frameMsP50:p(.5),frameMsP95:p(.95),frameMsP99:p(.99),frameMsMax:sorted[sorted.length-1],over33:intervals.filter(v=>v>33.4).length,over50:intervals.filter(v=>v>50).length,over100:intervals.filter(v=>v>100).length,drawCalls:info.render.calls,triangles:info.render.triangles,points:info.render.points,textures:info.memory.textures,geometries:info.memory.geometries,programs:info.programs?.length??0,pixelRatio:app.renderer.currentPixelRatio,canvas:[canvas.width,canvas.height],viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,heapBytes:performance.memory?.usedJSHeapSize??null,heapTotalBytes:performance.memory?.totalJSHeapSize??null,contextLost:window.__F3_CONTEXT_LOST__??0,directRendering:app.renderer.directRendering,pipeline:Boolean(app.renderer.pipeline),mode:document.body.dataset.renderMode,quality:app.settings.get('quality'),particles:{giantHeart:app.giantHeart.particleCount,giantHeartMode:app.giantHeart.currentMode,galaxy:app.galaxy.getStats()},gpu:gl?{vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,version:gl.getParameter(gl.VERSION)}:null};
 });
 report.cases.push({name:c.name,options:c,metrics,errors}); report.errors.push(...errors.map(e=>`[${c.name}] ${e}`));
 console.log(c.name,'fps',metrics.fpsMean.toFixed(1),'p95',metrics.frameMsP95.toFixed(2),'calls',metrics.drawCalls,'points',metrics.points,'mode',metrics.mode);
 await context.close();
}
writeFileSync('qa/f2-integration/performance.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify({generatedAt:report.generatedAt,cases:report.cases.map(c=>({name:c.name,...c.metrics,errors:c.errors})),errors:report.errors},null,2));
await browser.close();

