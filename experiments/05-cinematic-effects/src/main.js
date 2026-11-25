import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createLabUI } from '../../shared/ui.js';
import { LabLoop, clamp, smoothstep, lerp, mulberry32 } from '../../shared/loop.js';

const DEFAULTS = { count: 8000, size: 0.03, bloom: true, autoOrbit: true };
const state = { ...DEFAULTS, mode: 'heart', label: '520' };
const MAX = 12000;
const rng = mulberry32(20261314);

const ui = createLabUI({
  number: '05',
  kicker: 'F2 VISUAL LAB · CINEMATIC CAMERA / PARTICLE TYPE',
  title: '把这句话写进星河',
  description: '镜头穿过星星，心形粒子聚合，520 与 1314 由光点拼成。不是 HTML 字，是一颗粒子一颗粒子亮起来。',
  sections: [
    {
      index: '01',
      title: '粒子与光',
      controls: [
        { key: 'count', label: '粒子数量', type: 'range', min: 2500, max: 12000, step: 500, value: DEFAULTS.count },
        { key: 'size', label: '粒子尺寸', type: 'range', min: 0.01, max: 0.075, step: 0.002, value: DEFAULTS.size, format: (v) => Number(v).toFixed(3) },
        { key: 'bloom', label: 'UnrealBloom 发光', type: 'toggle', value: DEFAULTS.bloom },
        { key: 'autoOrbit', label: '结束后允许自由旋转', type: 'toggle', value: DEFAULTS.autoOrbit }
      ]
    }
  ],
  actions: [
    { key: 'journey', label: '① 镜头穿越星河', primary: true },
    { key: 'heartSequence', label: '② 巨型爱心聚合' },
    { key: 'textSequence', label: '③ 520 / 1314 粒子字' },
    { key: 'love', label: 'LOVE' },
    { key: 'merry', label: 'Merry Christmas' },
    { key: 'top', label: '俯视镜头' },
    { key: 'freeze', label: '定格终章' },
    { key: 'pause', label: '暂停 / 继续' },
    { key: 'reset', label: '重置实验' }
  ],
  onChange: (key, value) => {
    state[key] = value;
    if (key === 'count') geometry.setDrawRange(0, Math.round(value));
    if (key === 'size') material.uniforms.uSize.value = Number(value);
    if (key === 'bloom') bloomEnabled = Boolean(value);
    if (key === 'autoOrbit') controls.enabled = Boolean(value) && !tween;
  },
  onAction: (action) => {
    if (action === 'journey') startJourney();
    else if (action === 'heartSequence') startHeartSequence();
    else if (action === 'textSequence') startTextSequence();
    else if (action === 'love') showLabel('LOVE');
    else if (action === 'merry') showLabel('Merry Christmas');
    else if (action === 'top') topView();
    else if (action === 'freeze') freezeFinal();
    else if (action === 'pause') { paused = loop.toggle(); ui.setStatus(paused ? 'PAUSED' : statusText(), paused ? '' : 'warm'); }
    else if (action === 'reset') resetAll();
  }
});

let paused = false;
let bloomEnabled = true;
let tween = null;
let sequenceTimer = 0;
let labelSwapTimer = 0;
const canvas = document.querySelector('#lab-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.info.autoReset = false;
renderer.setClearColor('#030409', 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#030409');
scene.fog = new THREE.FogExp2('#030409', 0.01);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, .1, 160);
camera.position.set(0, 1.35, 12.5);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.1, 0);
controls.enableDamping = true;
controls.dampingFactor = .06;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 36;
controls.autoRotate = false;
controls.autoRotateSpeed = .35;
controls.update();

let composer, bloomPass, renderPass, outputPass;
function buildComposer() {
  if (composer) { renderPass?.dispose?.(); bloomPass?.dispose?.(); outputPass?.dispose?.(); composer.dispose(); }
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .7, .46, .74);
  outputPass = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloomPass); composer.addPass(outputPass);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
}

// Star field.
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(2600 * 3);
for (let i = 0; i < 2600; i++) {
  const r = 16 + rng() * 45, a = rng() * Math.PI * 2, p = Math.acos(2 * rng() - 1);
  starPos[i * 3] = Math.sin(p) * Math.cos(a) * r;
  starPos[i * 3 + 1] = Math.cos(p) * r * .65;
  starPos[i * 3 + 2] = Math.sin(p) * Math.sin(a) * r;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: '#b7c8ff', size: .045, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
scene.add(new THREE.Points(starGeo, starMat));

// Heart target and text targets share one particle system.
const HEART_W = 5.2, HEART_H = 4.5, HEART_D = 1.5;
const heartOutline = (() => {
  const raw = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 512; i++) {
    const t = i / 512 * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push({ x, y }); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, sx = HEART_W / (maxX - minX), sy = HEART_H / (maxY - minY);
  return raw.map((p) => ({ x: (p.x - cx) * sx, y: (p.y - cy) * sy }));
})();
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const bounds = (() => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of heartOutline) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  return { minX, maxX, minY, maxY };
})();
const heartTargets = new Float32Array(MAX * 3);
for (let i = 0; i < MAX; i++) {
  let x = 0, y = 0;
  if (i % 5 === 0) { const e = heartOutline[Math.floor(rng() * heartOutline.length)]; x = e.x; y = e.y; }
  else {
    for (let k = 0; k < 24; k++) {
      const tx = bounds.minX + rng() * (bounds.maxX - bounds.minX);
      const ty = bounds.minY + rng() * (bounds.maxY - bounds.minY);
      if (inPoly(tx, ty, heartOutline)) { x = tx; y = ty; break; }
    }
  }
  const z = i % 5 === 0 ? 0 : (rng() * 2 - 1) * HEART_D * .5;
  heartTargets[i * 3] = x; heartTargets[i * 3 + 1] = y; heartTargets[i * 3 + 2] = z;
}

function sampleText(text, canvasW = 1600, canvasH = 620) {
  const c = document.createElement('canvas'); c.width = canvasW; c.height = canvasH;
  const g = c.getContext('2d');
  g.clearRect(0, 0, canvasW, canvasH);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const size = text.length > 8 ? 160 : text.length > 4 ? 290 : 390;
  g.font = `600 ${size}px Georgia, 'Times New Roman', serif`;
  g.fillText(text, canvasW / 2, canvasH / 2);
  const pixels = g.getImageData(0, 0, canvasW, canvasH).data;
  const points = [];
  for (let y = 0; y < canvasH; y += 3) for (let x = 0; x < canvasW; x += 3) {
    if (pixels[(y * canvasW + x) * 4 + 3] > 120) points.push([x, y]);
  }
  const targetW = text.length > 8 ? 12.5 : text.length > 4 ? 10.2 : 8.8;
  const targetH = text.length > 8 ? 4.8 : 3.6;
  return points.map(([x, y]) => [(x / canvasW - .5) * targetW, -(y / canvasH - .5) * targetH, (rng() - .5) * .17]);
}
const textTargets = {
  '520': new Float32Array(MAX * 3),
  '1314': new Float32Array(MAX * 3),
  'LOVE': new Float32Array(MAX * 3),
  'Merry Christmas': new Float32Array(MAX * 3)
};
for (const [label, target] of Object.entries(textTargets)) {
  const pts = sampleText(label);
  for (let i = 0; i < MAX; i++) {
    const p = pts[i % Math.max(1, pts.length)] || [0, 0, 0];
    target[i * 3] = p[0]; target[i * 3 + 1] = p[1]; target[i * 3 + 2] = p[2];
  }
}

const scatter = new Float32Array(MAX * 3);
const positions = new Float32Array(MAX * 3);
const colors = new Float32Array(MAX * 3);
const sizes = new Float32Array(MAX);
const colorTint = new Float32Array(MAX);
for (let i = 0; i < MAX; i++) {
  const r = 7 + rng() * 14, a = rng() * Math.PI * 2, p = Math.acos(2 * rng() - 1);
  scatter[i * 3] = Math.sin(p) * Math.cos(a) * r;
  scatter[i * 3 + 1] = Math.cos(p) * r * .65;
  scatter[i * 3 + 2] = Math.sin(p) * Math.sin(a) * r;
  positions[i * 3] = scatter[i * 3]; positions[i * 3 + 1] = scatter[i * 3 + 1]; positions[i * 3 + 2] = scatter[i * 3 + 2];
  sizes[i] = .55 + rng() * .9;
  colorTint[i] = rng();
}
const cGold = new THREE.Color('#FFD58A');
const cPink = new THREE.Color('#FF75A9');
const cWhite = new THREE.Color('#FFFFFF');
const cBlue = new THREE.Color('#B68AFF');
const tempColor = new THREE.Color();
function applyColors(kind) {
  for (let i = 0; i < MAX; i++) {
    const t = colorTint[i];
    if (kind === 'text') tempColor.copy(cGold).lerp(cWhite, t * .68);
    else tempColor.copy(cPink).lerp(cGold, t * .5).lerp(cWhite, t > .78 ? .45 : 0);
    colors[i * 3] = tempColor.r; colors[i * 3 + 1] = tempColor.g; colors[i * 3 + 2] = tempColor.b;
  }
}
applyColors('heart');

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
geometry.setDrawRange(0, state.count);
geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
const material = new THREE.ShaderMaterial({
  uniforms: { uPixelRatio: { value: Math.min(devicePixelRatio || 1, 2) }, uSize: { value: state.size }, uOpacity: { value: 1 } },
  vertexShader: /* glsl */ `
    attribute vec3 aColor; attribute float aSize;
    uniform float uPixelRatio; uniform float uSize;
    varying vec3 vColor;
    void main(){
      vec4 mv=modelViewMatrix*vec4(position,1.0);
      gl_PointSize=clamp(aSize*uSize*uPixelRatio*(1500.0/max(1.0,-mv.z)), .8, 13.0);
      gl_Position=projectionMatrix*mv; vColor=aColor;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    void main(){
      vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
      float core=1.-smoothstep(0.,.2,d); float halo=1.-smoothstep(.1,.5,d);
      gl_FragColor=vec4(vColor*(.65+core*.95),(halo*.24+core*.66));
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
const points = new THREE.Points(geometry, material);
points.frustumCulled = false;
scene.add(points);

const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,117,169,.22)'); grad.addColorStop(.4, 'rgba(255,213,138,.06)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })(),
  transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
}));
glow.scale.set(10, 8, 1);
glow.position.z = -2;
scene.add(glow);

let targetKind = 'heart';
let targetPositions = heartTargets;
let assembly = 1;
let targetAssembly = 1;
let burst = 0;
let lightLevel = 1;
let mode = 'heart';
let label = '';
let sequence = '';
let nextLabelTimer = 0;

function setTarget(kind, target, newLabel = '') {
  targetKind = kind;
  targetPositions = target;
  label = newLabel;
  mode = kind;
  assembly = 0;
  targetAssembly = 1;
  burst = 0;
  applyColors(kind === 'text' ? 'text' : 'heart');
  material.uniforms.uSize.value = kind === 'text' ? Math.min(state.size, .014) : state.size;
  geometry.attributes.aColor.needsUpdate = true;
}
function setLabel(next) {
  if (!textTargets[next]) return;
  state.label = next;
  setTarget('text', textTargets[next], next);
  ui.setStatus(`PARTICLE TYPE · ${next} · ${state.count.toLocaleString()} points`, 'warm');
}
function cameraTo(pos, target, duration = 2.2) {
  tween = { fromPos: camera.position.clone(), toPos: new THREE.Vector3(...pos), fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...target), elapsed: 0, duration };
  controls.enabled = false;
}
function updateCamera(dt) {
  if (!tween) { controls.update(); return; }
  tween.elapsed += dt;
  const t = smoothstep(clamp(tween.elapsed / tween.duration, 0, 1));
  camera.position.lerpVectors(tween.fromPos, tween.toPos, t);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, t);
  controls.update();
  if (t >= 1) { tween = null; controls.enabled = state.autoOrbit; controls.autoRotate = state.autoOrbit; }
}
function topView() {
  sequence = 'top';
  cameraTo([0, 18, 0.1], [0, 1.0, 0], 2.0);
  ui.setStatus('CAMERA · TOP-DOWN FINALE', 'warm');
  document.querySelector('#sequence-readout').textContent = 'CAMERA · TOP-DOWN FINALE';
}
function freezeFinal() {
  paused = true;
  loop.pause();
  controls.enabled = false;
  ui.setStatus('FINAL FRAME · FROZEN', 'warm');
  document.querySelector('#sequence-readout').textContent = 'FINAL FRAME · MERRY CHRISTMAS';
  ui.setActionActive('freeze', true);
}

function startJourney() {
  sequence = 'journey';
  paused = false; loop.resume();
  setTarget('free', scatter);
  assembly = 1;
  lightLevel = 1;
  cameraTo([0, 1.8, 25], [0, 1.1, 0], 3.4);
  setTimeout(() => { if (sequence === 'journey') cameraTo([0, 1.4, 8.5], [0, 1.1, 0], 3.6); }, 2400);
  ui.setStatus('CINEMA 01 · CAMERA THROUGH THE STARS', 'warm');
  ui.setActionActive('journey', true);
  ui.setActionActive('heartSequence', false); ui.setActionActive('textSequence', false);
  document.querySelector('#sequence-readout').textContent = 'CINEMA 01 · THE NIGHT BEGINS';
}
function startHeartSequence() {
  sequence = 'heart';
  paused = false; loop.resume();
  setTarget('heart', heartTargets);
  assembly = 0; targetAssembly = 1; lightLevel = 0.2;
  cameraTo([0, 1.4, 13.2], [0, 1.1, 0], 2.2);
  clearTimeout(nextLabelTimer);
  nextLabelTimer = setTimeout(() => {
    if (sequence !== 'heart') return;
    burst = 1;
    ui.setStatus('HEART BURST · then it comes back to you', 'pink');
    setTimeout(() => { if (sequence !== 'heart') return; setTarget('heart', heartTargets); }, 850);
  }, 3600);
  ui.setStatus('CINEMA 02 · A HEART OF 8,000 LIGHTS', 'warm');
  ui.setActionActive('heartSequence', true);
  ui.setActionActive('journey', false); ui.setActionActive('textSequence', false);
  document.querySelector('#sequence-readout').textContent = 'CINEMA 02 · ALL MY HEART, GATHERED';
}
function startTextSequence() {
  sequence = 'text';
  paused = false; loop.resume();
  setLabel('520');
  cameraTo([0, 1.15, 11.8], [0, 1.05, 0], 2.0);
  clearTimeout(labelSwapTimer);
  labelSwapTimer = setTimeout(() => { if (sequence === 'text') setLabel('1314'); }, 4200);
  ui.setStatus('CINEMA 03 · 520 → 1314 · PARTICLE TYPE', 'warm');
  ui.setActionActive('textSequence', true);
  ui.setActionActive('journey', false); ui.setActionActive('heartSequence', false);
  document.querySelector('#sequence-readout').textContent = 'CINEMA 03 · 520 → 1314';
}
function showLabel(next) {
  sequence = 'text';
  setLabel(next);
  cameraTo([0, 1.15, next.length > 4 ? 14 : 11.8], [0, 1.05, 0], 1.6);
  ui.setActionActive('textSequence', true);
  document.querySelector('#sequence-readout').textContent = `PARTICLE TYPE · ${next.toUpperCase()}`;
}
function statusText() {
  if (targetKind === 'text') return `PARTICLE TYPE · ${label || 'TEXT'}`;
  if (targetKind === 'heart') return 'A HEART OF LIGHT';
  return 'THE STARS ARE MOVING';
}

function animate(dt, elapsed) {
  updateCamera(dt);
  // Gather toward the selected target; the free mode uses a slow scatter drift.
  assembly = lerp(assembly, targetAssembly, 1 - Math.exp(-2.2 * dt));
  burst = Math.max(0, burst - dt * .75);
  const active = Math.round(state.count);
  const pos = geometry.attributes.position.array;
  const heartMode = targetKind !== 'text';
  for (let i = 0; i < active; i++) {
    const i3 = i * 3;
    let tx = burst ? heartTargets[i3] + (heartTargets[i3] * 0.55 + (colorTint[i] - .5) * 5) : targetPositions[i3];
    let ty = burst ? heartTargets[i3 + 1] + (colorTint[i] - .5) * 5 : targetPositions[i3 + 1];
    let tz = burst ? heartTargets[i3 + 2] + (colorTint[i] - .5) * 5 : targetPositions[i3 + 2];
    if (targetKind === 'free') { tx = scatter[i3]; ty = scatter[i3 + 1]; tz = scatter[i3 + 2]; }
    const breathe = heartMode && !burst ? 1 + Math.sin(elapsed * 2.5) * .018 : 1;
    tx *= breathe; ty *= breathe; tz *= breathe;
    const k = assembly;
    const sx = scatter[i3], sy = scatter[i3 + 1], sz = scatter[i3 + 2];
    pos[i3] += ((sx * (1 - k) + tx * k) - pos[i3]) * (1 - Math.exp(-4.2 * dt));
    pos[i3 + 1] += ((sy * (1 - k) + ty * k) - pos[i3 + 1]) * (1 - Math.exp(-4.2 * dt));
    pos[i3 + 2] += ((sz * (1 - k) + tz * k) - pos[i3 + 2]) * (1 - Math.exp(-4.2 * dt));
  }
  geometry.attributes.position.needsUpdate = true;
  material.uniforms.uOpacity.value = lightLevel;
  lightLevel = clamp(lightLevel + dt * .55, 0, 1);
  glow.material.opacity = .55 + .08 * Math.sin(elapsed * .7);
  glow.material.color.set(targetKind === 'text' ? '#FFD58A' : '#FF75A9');
  renderer.info.reset();
  if (bloomEnabled && composer) composer.render(); else renderer.render(scene, camera);
}
const loop = new LabLoop({
  onFrame: animate,
  onFps: (fps) => {
    ui.setStats(fps, renderer.info.render.calls, state.count);
    if (!paused) ui.setStatus(statusText(), targetKind === 'text' ? 'warm' : 'pink');
  }
});

function resetAll() {
  paused = false; loop.resume();
  sequence = '';
  setTarget('heart', heartTargets);
  state.count = DEFAULTS.count; state.size = DEFAULTS.size; state.bloom = DEFAULTS.bloom;
  bloomEnabled = true;
  geometry.setDrawRange(0, DEFAULTS.count);
  material.uniforms.uSize.value = DEFAULTS.size;
  ui.setValue('count', DEFAULTS.count); ui.setValue('size', DEFAULTS.size); ui.setValue('bloom', true);
  camera.position.set(0, 1.35, 12.5); controls.target.set(0, 1.1, 0); controls.enabled = true; controls.update();
  buildComposer();
  ui.setActionActive('journey', false); ui.setActionActive('heartSequence', false); ui.setActionActive('textSequence', false); ui.setActionActive('freeze', false);
  controls.enabled = true; controls.autoRotate = false;
  document.querySelector('#sequence-readout').textContent = 'A CHRISTMAS WISH · CINEMATIC LAB / 05';
  ui.setStatus('RESET · A HEART OF LIGHT', 'warm');
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  material.uniforms.uPixelRatio.value = Math.min(devicePixelRatio || 1, 2);
  if (composer) { composer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); composer.setSize(window.innerWidth, window.innerHeight); }
}
window.addEventListener('resize', resize);

buildComposer(); resize(); loop.start();
setTarget('heart', heartTargets); assembly = 1;
ui.setStatus('A HEART OF LIGHT · 8,000 PARTICLES', 'warm');

window.__LAB__ = {
  number: '05', ui, state, scene, camera, renderer, controls,
  actions: { journey: startJourney, heartSequence: startHeartSequence, textSequence: startTextSequence, love: () => showLabel('LOVE'), merry: () => showLabel('Merry Christmas'), top: topView, freeze: freezeFinal, reset: resetAll, pause: () => loop.toggle() },
  setLabel,
  getStats: () => ({ fps: loop.fps, calls: renderer.info.render.calls, count: state.count, mode: targetKind, label }),
  dispose: () => {
    loop.dispose(); controls.dispose();
    geometry.dispose(); material.dispose(); starGeo.dispose(); starMat.dispose();
    glow.material.map?.dispose(); glow.material.dispose();
    composer?.dispose(); renderer.dispose();
  }
};
window.addEventListener('beforeunload', () => window.__LAB__?.dispose());
