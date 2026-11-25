import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:false,args:['--window-position=0,0','--window-size=2600,1500','--disable-features=RendererCodeIntegrity']});
const cases=[
  {name:'safe-1440x900',width:1440,height:900,dpr:1,query:''},
  {name:'safe-1920x1080',width:1920,height:1080,dpr:1,query:''},
  {name:'safe-4k-equivalent',width:1920,height:1080,dpr:2,query:''},
  {name:'full-bloom-1440x900',width:1440,height:900,dpr:1,query:'?full=1'},
  {name:'full-bloom-1920x1080',width:1920,height:1080,dpr:1,query:'?full=1'}
];
const report={generatedAt:new Date().toISOString(),browser:browser.version(),cases:[],errors:[]};
for(const c of cases){
  const context=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:c.dpr});
  const page=await context.newPage(); const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());}); page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
    window.__F3_CONTEXT_LOST__ = 0;
    window.addEventListener('webglcontextlost', () => { window.__F3_CONTEXT_LOST__ += 1; }, true);
  });
  await page.goto('http://127.0.0.1:4173/'+c.query,{waitUntil:'networkidle',timeout:60000}); await page.bringToFront();
  await page.waitForFunction(()=>window.__CHRISTMAS_WISH__?.ready,{timeout:30000}); await page.waitForTimeout(3600);
  await page.evaluate(()=>{const p=document.querySelector('#control-panel');if(p?.classList.contains('is-open'))document.querySelector('#btn-panel').click();});
  await page.waitForTimeout(500);
  const metrics=await page.evaluate(async()=>{
    const app=window.__CHRISTMAS_WISH__.app; const intervals=[]; let start=0,last=0;
    await new Promise(resolve=>{const tick=(now)=>{if(!start){start=now;last=now;}else{intervals.push(now-last);last=now;} if(now-start<4000)requestAnimationFrame(tick); else resolve();};requestAnimationFrame(tick);});
    const sorted=[...intervals].sort((a,b)=>a-b); const p=(q)=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))]; const sum=intervals.reduce((a,b)=>a+b,0); const mean=sum/Math.max(1,intervals.length);
    const info=app.renderer.renderer.info; const canvas=document.querySelector('#scene-canvas'); const gl=canvas.getContext('webgl2'); const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    return {frames:intervals.length,measuredSeconds:(last-start)/1000,fpsMean:1000/Math.max(.0001,mean),fpsMedian:1000/Math.max(.0001,p(.5)),appFps:app.lastFps,frameMsMean:mean,frameMsP50:p(.5),frameMsP95:p(.95),frameMsP99:p(.99),frameMsMax:sorted[sorted.length-1],over33:intervals.filter(v=>v>33.4).length,over50:intervals.filter(v=>v>50).length,over100:intervals.filter(v=>v>100).length,drawCalls:info.render.calls,triangles:info.render.triangles,points:info.render.points,textures:info.memory.textures,geometries:info.memory.geometries,programs:info.programs?.length??0,pixelRatio:app.renderer.currentPixelRatio,canvas:[canvas.width,canvas.height],viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,heapBytes:performance.memory?.usedJSHeapSize??null,contextLost:window.__F3_CONTEXT_LOST__??0,directRendering:app.renderer.directRendering,pipeline:Boolean(app.renderer.pipeline),mode:document.body.dataset.renderMode,quality:window.__CHRISTMAS_WISH__.getSettings().quality,gpu:gl?{vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,version:gl.getParameter(gl.VERSION)}:null};
  });
  report.cases.push({name:c.name,options:c,metrics,errors}); report.errors.push(...errors.map(e=>`[${c.name}] ${e}`));
  console.log(c.name, 'fps',metrics.fpsMean.toFixed(1),'p95',metrics.frameMsP95.toFixed(2),'calls',metrics.drawCalls,'mode',metrics.mode);
  await context.close();
}
writeFileSync('qa/f3/performance.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log(JSON.stringify({generatedAt:report.generatedAt,browser:report.browser,cases:report.cases.map(c=>({name:c.name,...c.metrics,errors:c.errors})),errors:report.errors},null,2));
await browser.close();
