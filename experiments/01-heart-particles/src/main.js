import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LabLoop, clamp, lerp, smoothstep, mulberry32 } from '../../shared/loop.js';
import { createLabUI } from '../../shared/ui.js';

const MAX_COUNT = 20000;
const INITIAL = {
  count: 10000,
  size: 0.025,
  heartColor: '#FF75A9',
  starColor: '#FFD58A',
  gatherTime: 2.5,
  burstTime: 1.8,
  beatPeriod: 2.5,
  bloom: true,
  bloomStrength: 1.8,
  autoCycle: true
};
const DEFAULTS = { ...INITIAL };
const state = {
  ...INITIAL,
  mode: 'heart',
  assembly: 0,
  shape: 0,
  burst: 0,
  modeStart: 0,
  regatherAt: 0,
  paused: false
};

const ui = createLabUI({
  number: '01',
  kicker: 'F2 VISUAL LAB · HEART-STAR / THREE.JS',
  title: '十万次心跳',
  description: 'A 3D heart made of light, memory and a little gravity. 聚合、爆散、再回到你身边。',
  sections: [
    {
      index: '01',
      title: '粒子场',
      controls: [
        { key: 'count', label: '爱心粒子数量', type: 'range', min: 1000, max: 20000, step: 500, value: INITIAL.count, format: (v) => `${v}` },
        { key: 'size', label: '粒子尺寸', type: 'range', min: 0.006, max: 0.08, step: 0.001, value: INITIAL.size, format: (v) => Number(v).toFixed(3) },
        { key: 'heartColor', label: '爱心主颜色', type: 'color', value: INITIAL.heartColor },
        { key: 'starColor', label: '星星颜色', type: 'color', value: INITIAL.starColor }
      ]
    },
    {
      index: '02',
      title: '运动与呼吸',
      controls: [
        { key: 'gatherTime', label: '聚合时间 / 秒', type: 'range', min: 0.8, max: 5, step: 0.1, value: INITIAL.gatherTime, format: (v) => Number(v).toFixed(1) },
        { key: 'burstTime', label: '爆散时间 / 秒', type: 'range', min: 0.6, max: 4, step: 0.1, value: INITIAL.burstTime, format: (v) => Number(v).toFixed(1) },
        { key: 'beatPeriod', label: '心跳周期 / 秒', type: 'range', min: 1, max: 5, step: 0.1, value: INITIAL.beatPeriod, format: (v) => Number(v).toFixed(1) },
        { key: 'autoCycle', label: '循环演示：聚合 → 爆散', type: 'toggle', value: INITIAL.autoCycle }
      ]
    },
    {
      index: '03',
      title: '光与渲染',
      controls: [
        { key: 'bloom', label: 'UnrealBloom 发光', type: 'toggle', value: INITIAL.bloom },
        { key: 'bloomStrength', label: 'Bloom 强度', type: 'range', min: 0, max: 3, step: 0.05, value: INITIAL.bloomStrength, format: (v) => Number(v).toFixed(2) }
      ]
    }
  ],
  actions: [
    { key: 'heart', label: '形成爱心 · HEART', primary: true },
    { key: 'star', label: '形成星星 · STAR' },
    { key: 'burst', label: '爆散 · BURST' },
    { key: 'regather', label: '重新聚合 · AGAIN' },
    { key: 'free', label: '自由漂浮 · FREE' },
    { key: 'pause', label: '暂停 / 继续' },
    { key: 'reset', label: '重置实验' }
  ],
  onChange: (key, value) => {
    state[key] = value;
    if (key === 'count') {
      geometry.setDrawRange(0, Math.round(value));
      updateParticleCount();
    }
    if (key === 'size') material.uniforms.uSize.value = value;
    if (key === 'heartColor' || key === 'starColor') buildColors();
    if (key === 'bloom') {
      bloomEnabled = Boolean(value);
    }
    if (key === 'bloomStrength') {
      state.bloomStrength = Number(value);
      if (bloomPass) bloomPass.strength = state.bloomStrength;
    }
    if (key === 'autoCycle') state.autoCycle = Boolean(value);
    if (key === 'gatherTime' || key === 'burstTime' || key === 'beatPeriod') {
      state[key] = Number(value);
    }
    ui.setStatus(statusText(), state.mode === 'burst' ? 'pink' : 'warm');
  },
  onAction: (action) => {
    if (action === 'heart') setMode('heart');
    if (action === 'star') setMode('star');
    if (action === 'burst') setMode('burst');
    if (action === 'regather') setMode('heart');
    if (action === 'free') {
      state.mode = 'free';
      state.assembly = 0;
      state.burst = 0;
      state.modeStart = loop.elapsed;
      ui.setStatus('FREE FLOAT · particles in the air', 'pink');
    }
    if (action === 'pause') {
      state.paused = loop.toggle();
      ui.setStatus(state.paused ? 'PAUSED' : statusText(), state.paused ? '' : 'warm');
    }
    if (action === 'reset') resetAll();
    if (action === 'reset-view') resetCamera();
  }
});

const canvas = document.querySelector('#lab-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.setClearColor('#04050a', 1);
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#04050a', 0.026);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.3, 0.1, 12.8);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 26;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.28;
controls.update();

let bloomEnabled = state.bloom;
let composer = null;
let bloomPass = null;
let renderPass = null;
let outputPass = null;

function buildComposer() {
  if (composer) {
    renderPass?.dispose?.();
    bloomPass?.dispose?.();
    outputPass?.dispose?.();
    composer.dispose();
  }
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    state.bloomStrength,
    0.55,
    0.52
  );
  outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
}

// A soft circular backdrop behind the point cloud, generated locally.
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,117,169,0.36)');
  gradient.addColorStop(0.28, 'rgba(255,213,138,0.14)');
  gradient.addColorStop(0.7, 'rgba(182,138,255,0.035)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const backdrop = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.9
  })
);
backdrop.scale.set(13, 10, 1);
backdrop.position.set(0, 0, -3.5);
backdrop.renderOrder = -10;
scene.add(backdrop);

const stars = (() => {
  const n = 1400;
  const rng = mulberry32(4219);
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 18 + rng() * 32;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const tint = rng();
    colors[i * 3] = 0.35 + tint * 0.55;
    colors[i * 3 + 1] = 0.3 + tint * 0.4;
    colors[i * 3 + 2] = 0.6 + tint * 0.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  scene.add(p);
  return p;
})();

const rng = mulberry32(81284);
const heartPositions = new Float32Array(MAX_COUNT * 3);
const starPositions = new Float32Array(MAX_COUNT * 3);
const scatterPositions = new Float32Array(MAX_COUNT * 3);
const burstDirections = new Float32Array(MAX_COUNT * 3);
const sizes = new Float32Array(MAX_COUNT);
const heartColors = new Float32Array(MAX_COUNT * 3);
const starColors = new Float32Array(MAX_COUNT * 3);
const colorTint = new Float32Array(MAX_COUNT);
const currentPositions = new Float32Array(MAX_COUNT * 3);
const currentColors = new Float32Array(MAX_COUNT * 3);

const HEART_WIDTH = 5.0;
const HEART_HEIGHT = 4.5;
const HEART_DEPTH = 1.8;

function buildHeartOutline(n = 512) {
  const raw = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    raw.push({ x, y });
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const sx = HEART_WIDTH / (maxX - minX);
  const sy = HEART_HEIGHT / (maxY - minY);
  return raw.map((p) => ({ x: (p.x - cx) * sx, y: (p.y - cy) * sy }));
}

const heartOutline = buildHeartOutline();
const starOutline = (() => {
  const pts = [];
  const outer = 2.4;
  const inner = 1.05;
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return pts;
})();

function boundsOf(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const heartBounds = boundsOf(heartOutline);
const starBounds = boundsOf(starOutline);

function randomInside(polygon, bounds) {
  for (let attempt = 0; attempt < 32; attempt++) {
    const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + rng() * (bounds.maxY - bounds.minY);
    if (pointInPolygon(x, y, polygon)) return { x, y };
  }
  return { x: 0, y: 0 };
}

function fillHeart(i) {
  const shell = i % 5 === 0;
  let x, y;
  if (shell) {
    const edge = heartOutline[Math.floor(rng() * heartOutline.length)];
    x = edge.x + (rng() - 0.5) * 0.035;
    y = edge.y + (rng() - 0.5) * 0.035;
  } else {
    const p = randomInside(heartOutline, heartBounds);
    x = p.x;
    y = p.y;
  }
  // Interior points form a real volume; contour points stay near the surface.
  const z = shell ? (rng() * 2 - 1) * 0.1 : (rng() * 2 - 1) * (HEART_DEPTH * 0.31);
  heartPositions[i * 3] = x;
  heartPositions[i * 3 + 1] = y;
  heartPositions[i * 3 + 2] = z;
}

function fillStar(i) {
  const shell = i % 6 === 0;
  let x, y;
  if (shell) {
    const edge = starOutline[Math.floor(rng() * starOutline.length)];
    x = edge.x + (rng() - 0.5) * 0.025;
    y = edge.y + (rng() - 0.5) * 0.025;
  } else {
    const p = randomInside(starOutline, starBounds);
    x = p.x;
    y = p.y;
  }
  const z = shell ? 0 : (rng() * 2 - 1) * 0.16;
  starPositions[i * 3] = x;
  starPositions[i * 3 + 1] = y;
  starPositions[i * 3 + 2] = z;
}

for (let i = 0; i < MAX_COUNT; i++) {
  const hp = fillHeart(i);
  fillStar(i);
  const radius = 5.5 + rng() * 7.5;
  const theta = rng() * Math.PI * 2;
  const phi = Math.acos(2 * rng() - 1);
  scatterPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
  scatterPositions[i * 3 + 1] = Math.cos(phi) * radius * 0.7;
  scatterPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  const bx = (rng() - 0.5) * 2;
  const by = (rng() - 0.5) * 2;
  const bz = (rng() - 0.5) * 2;
  const len = Math.hypot(bx, by, bz) || 1;
  burstDirections[i * 3] = bx / len;
  burstDirections[i * 3 + 1] = by / len;
  burstDirections[i * 3 + 2] = bz / len;
  sizes[i] = 0.62 + rng() * 0.78;
  colorTint[i] = rng();
  currentPositions[i * 3] = scatterPositions[i * 3];
  currentPositions[i * 3 + 1] = scatterPositions[i * 3 + 1];
  currentPositions[i * 3 + 2] = scatterPositions[i * 3 + 2];
}

const cHeart = new THREE.Color(INITIAL.heartColor);
const cStar = new THREE.Color(INITIAL.starColor);
const cGold = new THREE.Color('#FFD58A');
const cWhite = new THREE.Color('#FFFFFF');

function buildColors() {
  const hc = new THREE.Color(state.heartColor);
  const sc = new THREE.Color(state.starColor);
  const tmp = new THREE.Color();
  for (let i = 0; i < MAX_COUNT; i++) {
    const t = colorTint[i];
    tmp.copy(hc).lerp(cGold, Math.min(1, t * 1.1));
    if (t > 0.72) tmp.lerp(cWhite, (t - 0.72) * 2.4);
    heartColors[i * 3] = tmp.r;
    heartColors[i * 3 + 1] = tmp.g;
    heartColors[i * 3 + 2] = tmp.b;
    tmp.copy(sc).lerp(cWhite, t * 0.55);
    starColors[i * 3] = tmp.r;
    starColors[i * 3 + 1] = tmp.g;
    starColors[i * 3 + 2] = tmp.b;
  }
}
buildColors();

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aColor', new THREE.BufferAttribute(currentColors, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
geometry.setDrawRange(0, state.count);
geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 28);

const material = new THREE.ShaderMaterial({
  uniforms: {
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uSize: { value: state.size },
    uOpacity: { value: 1 }
  },
  vertexShader: /* glsl */ `
    attribute vec3 aColor;
    attribute float aSize;
    uniform float uPixelRatio;
    uniform float uSize;
    varying vec3 vColor;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(aSize * uSize * uPixelRatio * (1750.0 / max(1.0, -mv.z)), 0.9, 14.0);
      gl_Position = projectionMatrix * mv;
      vColor = aColor;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float dist = length(p);
      if (dist > 0.5) discard;
      float core = 1.0 - smoothstep(0.0, 0.22, dist);
      float halo = 1.0 - smoothstep(0.05, 0.5, dist);
      float alpha = (halo * 0.28 + core * 0.62) * uOpacity;
      vec3 color = vColor * (0.58 + core * 0.75);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  vertexColors: false,
  toneMapped: false
});

const points = new THREE.Points(geometry, material);
points.frustumCulled = false;
scene.add(points);

function setMode(mode) {
  const now = loop.elapsed;
  if (mode === 'heart' || mode === 'star') {
    if (mode === 'star' && state.mode === 'star') return;
    state.mode = mode;
    state.assembly = 0;
    state.burst = 0;
    state.modeStart = now;
    state.targetShape = mode === 'star' ? 1 : 0;
    ui.setStatus(`${mode === 'star' ? 'FORMING STAR' : 'GATHERING HEART'} · ${state.count.toLocaleString()} particles`, mode === 'star' ? 'warm' : 'pink');
  } else if (mode === 'burst') {
    if (state.assembly < 0.15) state.assembly = 1;
    state.mode = 'burst';
    state.burst = 0;
    state.modeStart = now;
    state.targetShape = 0;
    ui.setStatus('HEART BURST · letting go', 'pink');
  }
}
function resetAll() {
  Object.assign(state, DEFAULTS);
  state.mode = 'heart';
  state.assembly = 0;
  state.shape = 0;
  state.burst = 0;
  state.modeStart = loop.elapsed;
  state.targetShape = 0;
  state.paused = false;
  loop.reset();
  loop.resume();
  buildColors();
  material.uniforms.uSize.value = DEFAULTS.size;
  geometry.setDrawRange(0, DEFAULTS.count);
  for (const key of ['count', 'size', 'heartColor', 'starColor', 'gatherTime', 'burstTime', 'beatPeriod', 'bloom', 'bloomStrength', 'autoCycle']) {
    ui.setValue(key, state[key]);
  }
  bloomEnabled = DEFAULTS.bloom;
  buildComposer();
  resetCamera();
  ui.setStatus('RESET · initial heart', 'warm');
  updateParticleCount();
}
function resetCamera() {
  camera.position.set(0.3, 0.1, 12.8);
  controls.target.set(0, 0, 0);
  controls.update();
}

function statusText() {
  if (state.paused) return 'PAUSED';
  return `${state.mode.toUpperCase()} · ${state.count.toLocaleString()} particles`;
}
function updateParticleCount() {
  ui.setStats(loop.fps, renderer.info.render.calls, Math.round(state.count));
  ui.setStatus(statusText(), state.mode === 'burst' ? 'pink' : 'warm');
}

let lastShape = 0;
let lastBurst = 0;
const tempColor = new THREE.Color();
function renderFrame(dt, elapsed) {
  if (state.mode === 'heart' || state.mode === 'star') {
    state.assembly = Math.min(1, state.assembly + dt / Math.max(0.15, state.gatherTime));
    const target = state.targetShape ?? (state.mode === 'star' ? 1 : 0);
    state.shape = lerp(state.shape, target, 1 - Math.exp(-4.8 * dt));
    if (state.mode === 'heart' && state.autoCycle && state.assembly >= 0.999 && elapsed - state.modeStart > 4.6) {
      setMode('burst');
    }
  } else if (state.mode === 'burst') {
    state.burst = Math.min(1, state.burst + dt / Math.max(0.15, state.burstTime));
    state.shape = lerp(state.shape, 0, 1 - Math.exp(-3.6 * dt));
    if (state.burst >= 1) {
      state.mode = 'free';
      state.assembly = 0;
      state.burst = 1;
      state.modeStart = elapsed;
      state.regatherAt = elapsed + 0.55;
      ui.setStatus('SCATTERED · waiting to return', 'pink');
      if (state.autoCycle) {
        // Let the eye see the scatter for a beat before the next gather.
      }
    }
  } else {
    // free: drift and cool down the burst, optionally re-gather.
    state.burst = Math.max(0, state.burst - dt * 1.8);
    state.assembly = Math.max(0, state.assembly - dt * 0.9);
    if (state.autoCycle && state.regatherAt && elapsed > state.regatherAt) {
      setMode('heart');
    }
  }

  const active = Math.round(state.count);
  const shape = state.shape;
  const assembly = smoothstep(clamp(state.assembly, 0, 1));
  const burst = smoothstep(clamp(state.burst, 0, 1));
  const beat = state.beatPeriod > 0 ? elapsed * (Math.PI * 2) / state.beatPeriod : 0;
  const breath = state.mode === 'heart' && assembly > 0.94 ? 1 + 0.032 * Math.sin(beat) + 0.012 * Math.sin(beat * 2 + 0.7) : 1;
  const pos = geometry.attributes.position.array;
  const col = geometry.attributes.aColor.array;
  const drift = (1 - assembly) * 0.12;
  const c = tempColor;

  for (let i = 0; i < active; i++) {
    const i3 = i * 3;
    const hx = heartPositions[i3];
    const hy = heartPositions[i3 + 1];
    const hz = heartPositions[i3 + 2];
    const sx = starPositions[i3];
    const sy = starPositions[i3 + 1];
    const sz = starPositions[i3 + 2];
    const bx = lerp(hx, sx, shape);
    const by = lerp(hy, sy, shape);
    const bz = lerp(hz, sz, shape);
    const scatX = scatterPositions[i3] + Math.sin(elapsed * 0.35 + i * 0.13) * drift;
    const scatY = scatterPositions[i3 + 1] + Math.cos(elapsed * 0.28 + i * 0.17) * drift;
    const scatZ = scatterPositions[i3 + 2] + Math.sin(elapsed * 0.23 + i * 0.07) * drift * 0.6;
    const outward = (1 - assembly) * (1 + burst * 3.4);
    const targetX = scatX * (1 - assembly) + bx * assembly * breath + burstDirections[i3] * burst * 2.6;
    const targetY = scatY * (1 - assembly) + by * assembly * breath + burstDirections[i3 + 1] * burst * 2.6;
    const targetZ = scatZ * (1 - assembly) + bz * assembly * breath + burstDirections[i3 + 2] * burst * 2.6;
    pos[i3] += (targetX - pos[i3]) * (1 - Math.exp(-(6.5 + outward * 2.4) * dt));
    pos[i3 + 1] += (targetY - pos[i3 + 1]) * (1 - Math.exp(-(6.5 + outward * 2.4) * dt));
    pos[i3 + 2] += (targetZ - pos[i3 + 2]) * (1 - Math.exp(-(6.5 + outward * 2.4) * dt));

    const pulse = 0.8 + 0.2 * Math.sin(elapsed * 2.1 + i * 0.37);
    const brightness = pulse * (1 - burst * 0.26);
    c.setRGB(
      lerp(heartColors[i3], starColors[i3], shape) * brightness,
      lerp(heartColors[i3 + 1], starColors[i3 + 1], shape) * brightness,
      lerp(heartColors[i3 + 2], starColors[i3 + 2], shape) * brightness
    );
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.aColor.needsUpdate = true;
  if (active !== state._lastActive) {
    state._lastActive = active;
    geometry.setDrawRange(0, active);
  }
  if (state.mode === 'heart' && state.assembly > 0.98) ui.setActionActive('heart', true);
  else ui.setActionActive('heart', false);
  if (state.mode === 'star') ui.setActionActive('star', true);
  else ui.setActionActive('star', false);
  if (state.mode === 'burst') ui.setActionActive('burst', true);
  else ui.setActionActive('burst', false);

  controls.update();
  renderer.info.reset();
  if (bloomEnabled && composer) composer.render();
  else renderer.render(scene, camera);
}

const loop = new LabLoop({
  onFrame: renderFrame,
  onFps: (fps) => {
    ui.setStats(fps, renderer.info.render.calls, Math.round(state.count));
    if (!state.paused) ui.setStatus(statusText(), state.mode === 'burst' ? 'pink' : 'warm');
  }
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  if (composer) {
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    composer.setSize(w, h);
  }
  if (stars?.material) stars.material.size = Math.max(0.025, 0.045 * (h / 900));
}

buildComposer();
window.addEventListener('resize', resize);
resize();
loop.start();
state.modeStart = loop.elapsed;
setMode('heart');
updateParticleCount();

// Automation hook for the F2 real-browser capture/performance pass.
window.__LAB__ = {
  number: '01',
  ui,
  state,
  actions: {
    heart: () => setMode('heart'),
    star: () => setMode('star'),
    burst: () => setMode('burst'),
    reset: () => resetAll(),
    free: () => { state.mode = 'free'; state.assembly = 0; state.burst = 0; },
    pause: () => loop.toggle(),
    resetView: () => resetCamera()
  },
  scene,
  camera,
  renderer,
  controls,
  getStats: () => ({ fps: loop.fps, calls: renderer.info.render.calls, count: Math.round(state.count), mode: state.mode }),
  setBloom: (enabled) => {
    bloomEnabled = Boolean(enabled);
    state.bloom = Boolean(enabled);
    ui.setValue('bloom', Boolean(enabled));
  },
  dispose: () => {
    loop.dispose();
    controls.dispose();
    geometry.dispose();
    material.dispose();
    stars.geometry.dispose();
    stars.material.dispose();
    backdrop.material.map?.dispose();
    backdrop.material.dispose();
    composer?.dispose();
    renderer.dispose();
  }
};

window.addEventListener('beforeunload', () => window.__LAB__?.dispose());
