import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createLabUI } from '../../shared/ui.js';
import { LabLoop, clamp, lerp, smoothstep, mulberry32 } from '../../shared/loop.js';

const DEFAULTS = {
  stars: 12000,
  farStars: 6000,
  meteors: 5,
  nebulaLayers: 3,
  auroraLayers: 4,
  waterfall: 5000,
  bloom: true,
  autoOrbit: true,
  background: '#11152F',
  auroraColor: '#167C89',
  nebulaColor: '#B68AFF',
  waterfallColor: '#FFD58A'
};
const state = { ...DEFAULTS, view: 'panorama' };

const ui = createLabUI({
  number: '03',
  kicker: 'F2 VISUAL LAB · SPACE / NEBULA / AURORA',
  title: '星河为你亮起',
  description: '在星云、极光与金色光瀑之间漂浮。不是为了讲完一个故事，只是想让你看见宇宙也有温柔的一面。',
  sections: [
    {
      index: '01',
      title: '星河密度',
      controls: [
        { key: 'stars', label: '星空粒子', type: 'range', min: 3000, max: 24000, step: 1000, value: DEFAULTS.stars },
        { key: 'farStars', label: '远景星点', type: 'range', min: 1000, max: 12000, step: 500, value: DEFAULTS.farStars },
        { key: 'meteors', label: '流星数量', type: 'range', min: 1, max: 12, step: 1, value: DEFAULTS.meteors },
        { key: 'nebulaLayers', label: '星云层数', type: 'range', min: 1, max: 4, step: 1, value: DEFAULTS.nebulaLayers },
        { key: 'auroraLayers', label: '极光层数', type: 'range', min: 1, max: 5, step: 1, value: DEFAULTS.auroraLayers },
        { key: 'waterfall', label: '金色光瀑粒子', type: 'range', min: 1000, max: 9000, step: 500, value: DEFAULTS.waterfall }
      ]
    },
    {
      index: '02',
      title: '色彩',
      controls: [
        { key: 'nebulaColor', label: '粉色星云', type: 'color', value: DEFAULTS.nebulaColor },
        { key: 'auroraColor', label: '蓝绿极光', type: 'color', value: DEFAULTS.auroraColor },
        { key: 'waterfallColor', label: '金色光瀑', type: 'color', value: DEFAULTS.waterfallColor },
        { key: 'bloom', label: 'UnrealBloom 发光', type: 'toggle', value: DEFAULTS.bloom },
        { key: 'autoOrbit', label: '自动缓慢环绕', type: 'toggle', value: DEFAULTS.autoOrbit }
      ]
    }
  ],
  actions: [
    { key: 'panorama', label: '星空全景', primary: true },
    { key: 'nebula', label: '星云近景' },
    { key: 'aurora', label: '极光近景' },
    { key: 'fall', label: '粒子光瀑' },
    { key: 'meteor', label: '等待流星' },
    { key: 'pause', label: '暂停 / 继续' },
    { key: 'reset', label: '重置实验' }
  ],
  onChange: (key, value) => {
    state[key] = value;
    if (key === 'bloom') bloomEnabled = Boolean(value);
    if (key === 'autoOrbit') controls.autoRotate = Boolean(value);
    if (['stars', 'farStars', 'nebulaLayers', 'auroraLayers', 'waterfall', 'meteors'].includes(key)) scheduleRebuild();
    if (['nebulaColor', 'auroraColor', 'waterfallColor'].includes(key)) updateColors();
    ui.setStatus(`${viewLabel(state.view)} · ${state.stars.toLocaleString()} stars`, 'warm');
  },
  onAction: (action) => {
    if (action === 'pause') { paused = loop.toggle(); ui.setStatus(paused ? 'PAUSED' : viewLabel(state.view), paused ? '' : 'warm'); return; }
    if (action === 'reset') { resetAll(); return; }
    if (action === 'reset-view') { setView('panorama'); return; }
    if (views[action]) setView(action);
  }
});

let paused = false;
let bloomEnabled = DEFAULTS.bloom;
let pausedBy = false;
const canvas = document.querySelector('#lab-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.76;
renderer.info.autoReset = false;
renderer.setClearColor(state.background, 1);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#070713');
scene.fog = new THREE.FogExp2('#070713', 0.006);
const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 4.2, 25);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 3.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.045;
controls.enablePan = false;
controls.minDistance = 7;
controls.maxDistance = 60;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.16;
controls.update();

let composer = null;
let bloomPass = null;
let renderPass = null;
let outputPass = null;
function buildComposer() {
  if (composer) { renderPass?.dispose?.(); bloomPass?.dispose?.(); outputPass?.dispose?.(); composer.dispose(); }
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.62, 0.48, 0.78);
  outputPass = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloomPass); composer.addPass(outputPass);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  composer.setSize(window.innerWidth, window.innerHeight);
}

const rng = mulberry32(71237);
const root = new THREE.Group();
scene.add(root);
const disposables = [];
const trackDispose = (obj) => { disposables.push(obj); return obj; };

// --------------------------------------------------------------------------
// Utils
// --------------------------------------------------------------------------
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const glowTexture = makeGlowTexture();

// --------------------------------------------------------------------------
// Stars: near / far, two different point shaders
// --------------------------------------------------------------------------
let nearStars = null;
let farStars = null;
function starMaterial(colorA, colorB, speed, size) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uSize: { value: size }
    },
    vertexShader: /* glsl */ `
      attribute float aPhase; attribute float aSize; attribute float aHue;
      uniform float uTime; uniform float uPixelRatio; uniform float uSize;
      varying vec3 vColor; varying float vAlpha; varying float vHue;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float twinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * ${speed.toFixed(2)} + aPhase));
        gl_PointSize = clamp(aSize * uSize * uPixelRatio * (94.0 / max(1.0,-mv.z)) * (0.55 + twinkle), 0.3, 2.0);
        gl_Position = projectionMatrix * mv;
        vColor = mix(vec3(0.35,0.48,0.95), vec3(1.0,0.65,0.42), aHue);
        vAlpha = 0.16 + twinkle * 0.31;
        vHue = aHue;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha; varying float vHue;
      void main(){
        vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
        float core=1.0-smoothstep(0.,.18,d);
        float halo=1.0-smoothstep(.08,.5,d);
        gl_FragColor=vec4(vColor*(0.62+core*0.9), (halo*.16+core*.60)*vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}
function buildStars(count, radiusMin, radiusMax, colorA, colorB, speed, sizeScale) {
  const n = Math.max(1, Math.round(count));
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  const sizes = new Float32Array(n);
  const hue = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = radiusMin + Math.pow(rng(), 0.55) * (radiusMax - radiusMin);
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pos[i * 3 + 1] = Math.cos(phi) * r * 0.72;
    pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    phase[i] = rng() * Math.PI * 2;
    sizes[i] = 0.7 + rng() * 1.9;
    hue[i] = rng();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aHue', new THREE.BufferAttribute(hue, 1));
  const mat = starMaterial(colorA, colorB, speed, sizeScale);
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -4;
  return points;
}
function buildNearFar() {
  if (nearStars) { root.remove(nearStars); disposeObj(nearStars); }
  if (farStars) { root.remove(farStars); disposeObj(farStars); }
  nearStars = buildStars(state.stars, 12, 42, '#87b7ff', '#ffd8b0', 1.4, 0.72);
  farStars = buildStars(state.farStars, 45, 95, '#b68aff', '#b7e4ff', 0.6, 0.46);
  root.add(farStars, nearStars);
}
function disposeObj(obj) {
  obj.traverse?.((child) => {
    child.geometry?.dispose?.();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    }
  });
  obj.geometry?.dispose?.();
  obj.material?.dispose?.();
}

// --------------------------------------------------------------------------
// Nebula shells (3 layers by default)
// --------------------------------------------------------------------------
let nebulaGroup = new THREE.Group();
root.add(nebulaGroup);
const nebulaVert = /* glsl */ `
  varying vec3 vDir;
  void main(){
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const nebulaFrag = /* glsl */ `
  uniform float uTime; uniform float uSeed; uniform vec3 uColor; uniform vec3 uColorB; uniform float uOpacity;
  varying vec3 vDir;
  float hash(vec3 p){ p=fract(p*.3183099+vec3(.1,.2,.3)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise(vec3 p){
    vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;} return v; }
  void main(){
    vec3 d=normalize(vDir);
    float n=fbm(d*3.2 + vec3(uSeed*2.0, uTime*.015, uTime*.01));
    float band=pow(max(0.,n-.36),1.5)*2.8;
    float curtain=smoothstep(.3,.8, fbm(vec3(d.x*5.0+uSeed, d.y*3.4-uTime*.02, d.z*4.0)));
    float alpha=(band*.025 + curtain*.010)*uOpacity;
    vec3 color=mix(uColorB,uColor,smoothstep(.2,.9,n));
    gl_FragColor=vec4(color*(0.42+curtain*.35), alpha);
  }
`;
const nebulaPlaneVert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const nebulaPlaneFrag = /* glsl */ `
  uniform float uTime; uniform float uSeed; uniform vec3 uColor; uniform vec3 uColorB; uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.7,7.3);a*=.5;} return v; }
  void main(){
    vec2 uv=vUv;
    vec2 q=uv*2.0-1.0;
    float n=fbm(uv*vec2(3.2,2.2)+vec2(uSeed,uTime*.008));
    float vein=fbm(vec2(uv.x*5.0+uSeed*.7, uv.y*2.4-uTime*.012));
    float cloud=smoothstep(.34,.78,n) * smoothstep(.22,.65,vein);
    float edge=smoothstep(0.,.18,uv.x)*smoothstep(1.,.82,uv.x)*smoothstep(0.,.2,uv.y)*smoothstep(1.,.8,uv.y);
    float alpha=(cloud*.14 + vein*.044)*uOpacity*edge;
    vec3 color=mix(uColorB,uColor,smoothstep(.22,.86,n));
    gl_FragColor=vec4(color*(.68+cloud*.65),alpha);
  }
`;
function buildNebula() {
  disposeGroup(nebulaGroup);
  nebulaGroup = new THREE.Group();
  root.add(nebulaGroup);
  const colors = ['#B68AFF', '#4A50B8', '#FF75A9', '#167C89'];
  const count = state.nebulaLayers;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(100, 55, 1, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uSeed: { value: 2.1 + i * 4.7 }, uColor: { value: new THREE.Color(colors[i % colors.length]) },
        uColorB: { value: new THREE.Color('#0a0920') }, uOpacity: { value: 0.7 - i * 0.1 }
      },
      vertexShader: nebulaPlaneVert, fragmentShader: nebulaPlaneFrag,
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.position.set(-2 + i * 1.8, 9 + i * 1.2, -32 - i * 8);
    plane.rotation.z = i * 0.05;
    plane.renderOrder = -10 + i;
    nebulaGroup.add(plane);
  }
}
function disposeGroup(group) {
  group.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (obj.material) { obj.material.dispose?.(); }
  });
  root.remove(group);
}

// --------------------------------------------------------------------------
// Aurora curtains
// --------------------------------------------------------------------------
let auroraGroup = new THREE.Group();
root.add(auroraGroup);
const auroraVert = /* glsl */ `
  uniform float uTime; uniform float uSeed;
  varying vec2 vUv;
  void main(){
    vUv=uv;
    vec3 p=position;
    p.y += sin(p.x*.32 + uTime*.18 + uSeed)*1.1;
    p.x += sin(p.y*.41 + uTime*.12)*.28;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }
`;
const auroraFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uColor; uniform float uSeed; uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  void main(){
    vec2 uv=vUv;
    float wave=noise(vec2(uv.x*9.0+uTime*.11+uSeed, uv.y*3.5-uTime*.05));
    float band=smoothstep(.22,.55,uv.y)*smoothstep(.95,.66,uv.y);
    float curtain=pow(max(0.,wave-.28),1.5)*1.8;
    float sideFade=smoothstep(0.,.22,uv.x)*smoothstep(1.,.78,uv.x);
    float topFade=smoothstep(0.,.18,uv.y)*smoothstep(1.,.82,uv.y);
    float alpha=(band*.024+curtain*.065)*uOpacity*sideFade*topFade;
    vec3 c=mix(uColor,vec3(.35,.98,.82),curtain*.32);
    gl_FragColor=vec4(c*(0.74+curtain*.55),alpha);
  }
`;
function buildAurora() {
  disposeGroup(auroraGroup);
  auroraGroup = new THREE.Group();
  root.add(auroraGroup);
  const count = state.auroraLayers;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(44 + i * 5, 13 + i * 1.5, 80, 18);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: i * 4.3 }, uColor: { value: new THREE.Color(state.auroraColor) }, uOpacity: { value: 0.7 - i * 0.06 } },
      vertexShader: auroraVert, fragmentShader: auroraFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.position.set(0, 8 + i * 2.6, -22 - i * 6);
    plane.rotation.x = -0.04 + i * 0.025;
    plane.renderOrder = -3;
    auroraGroup.add(plane);
  }
}
function updateColors() {
  for (const m of nebulaGroup.children) {
    if (m.material?.uniforms?.uColor) {
      const idx = nebulaGroup.children.indexOf(m);
      const colors = ['#B68AFF', '#4A50B8', '#FF75A9', '#167C89'];
      m.material.uniforms.uColor.value.set(idx === 0 ? state.nebulaColor : colors[(idx + 1) % colors.length]);
    }
  }
  for (const m of auroraGroup.children) if (m.material?.uniforms?.uColor) m.material.uniforms.uColor.value.set(state.auroraColor);
  if (waterfall) waterfall.material.uniforms.uColor.value.set(state.waterfallColor);
}

// --------------------------------------------------------------------------
// Golden waterfall (5k points)
// --------------------------------------------------------------------------
let waterfall = null;
const waterfallVert = /* glsl */ `
  attribute float aPhase; attribute float aSpeed; attribute float aSize; attribute float aRadius;
  uniform float uTime; uniform float uPixelRatio;
  varying float vY;
  void main(){
    float cycle = uTime * 0.065 * aSpeed;
    float y = 1.0 + mod(position.y * 3.0 + cycle + aPhase * 0.05, 1.0) * 20.0;
    float a = aPhase * 6.283 + y * .36 + uTime * .05;
    vec3 p = vec3(cos(a) * aRadius, 21.0 - y, sin(a) * aRadius - 2.0);
    p.x += sin(y * .65 + aPhase) * .7;
    p.z += cos(y * .42 + aPhase) * .35;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (260.0 / max(1.0,-mv.z)), .6, 5.0);
    gl_Position = projectionMatrix * mv;
    vY = 1.0 - y / 21.0;
  }
`;
const waterfallFrag = /* glsl */ `
  uniform vec3 uColor; varying float vY;
  void main(){
    vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
    float core=1.0-smoothstep(0.,.18,d);
    vec3 c=mix(vec3(1.0,.83,.47),uColor,0.55);
    gl_FragColor=vec4(c*(1.0+core*1.4), (core*.78 + (1.-smoothstep(.1,.5,d))*.2) * (0.5+vY*.5));
  }
`;
function buildWaterfall() {
  if (waterfall) { root.remove(waterfall); disposeObj(waterfall); }
  const n = Math.round(state.waterfall);
  const pos = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const speeds = new Float32Array(n);
  const sizes = new Float32Array(n);
  const radii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = 0; pos[i * 3 + 1] = rng(); pos[i * 3 + 2] = 0;
    phases[i] = rng();
    speeds[i] = 0.35 + rng() * 1.2;
    sizes[i] = .6 + rng() * 1.8;
    radii[i] = 1.4 + rng() * 5.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.75) }, uColor: { value: new THREE.Color(state.waterfallColor) } },
    vertexShader: waterfallVert, fragmentShader: waterfallFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  waterfall = new THREE.Points(geo, mat);
  waterfall.frustumCulled = false;
  waterfall.renderOrder = 2;
  root.add(waterfall);
}

// --------------------------------------------------------------------------
// Glowing orbits + hearts
// --------------------------------------------------------------------------
let orbitGroup = new THREE.Group();
root.add(orbitGroup);
function buildOrbits() {
  disposeGroup(orbitGroup);
  orbitGroup = new THREE.Group();
  root.add(orbitGroup);
  const radii = [4.2, 6.2, 8.4];
  const colors = ['#FFD58A', '#FF75A9', '#B68AFF'];
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.EllipseCurve(0, 0, radii[i], radii[i] * 0.36, 0, Math.PI * 2, false, i * 1.4);
    const pts = curve.getPoints(180);
    const pos = new Float32Array(pts.length * 3);
    for (let j = 0; j < pts.length; j++) {
      pos[j * 3] = pts[j].x;
      pos[j * 3 + 1] = 2.0 + i * 0.3 + Math.sin(pts[j].x * 1.2 + i) * .08;
      pos[j * 3 + 2] = pts[j].y;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: colors[i], transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    const line = new THREE.LineLoop(geo, mat);
    line.rotation.y = i * 0.5;
    orbitGroup.add(line);
    const dotGeo = new THREE.BufferGeometry();
    const dotPos = new Float32Array(180 * 3);
    for (let j = 0; j < 180; j++) {
      dotPos[j * 3] = pos[j * 3];
      dotPos[j * 3 + 1] = pos[j * 3 + 1];
      dotPos[j * 3 + 2] = pos[j * 3 + 2];
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: colors[i], size: 0.055, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending }));
    dots.rotation.y = i * 0.5;
    orbitGroup.add(dots);
  }
  // A few heart particles around the orbit center.
  const n = 320;
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pos[i * 3] = hx * 0.12;
    pos[i * 3 + 1] = 3.1 + hy * 0.12;
    pos[i * 3 + 2] = Math.sin(t * 3) * 0.2;
    phase[i] = rng() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: '#FF9FC4', size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  orbitGroup.add(new THREE.Points(geo, mat));
}

// --------------------------------------------------------------------------
// Meteors
// --------------------------------------------------------------------------
const meteorGroup = new THREE.Group();
root.add(meteorGroup);
let meteors = [];
function buildMeteors() {
  for (const m of meteors) { meteorGroup.remove(m.line); disposeObj(m.line); }
  meteors = [];
  const count = Math.round(state.meteors);
  for (let i = 0; i < count; i++) {
    const positions = new Float32Array(2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: i % 2 ? '#FFD58A' : '#B68AFF', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    meteorGroup.add(line);
    const meteor = { line, geo, positions, life: 0, speed: 3 + rng() * 5, x: 0, y: 0, z: 0 };
    resetMeteor(meteor);
    meteors.push(meteor);
  }
}
function resetMeteor(m) {
  m.life = 0;
  m.x = -18 + rng() * 32;
  m.y = 12 + rng() * 10;
  m.z = -20 + rng() * 22;
  m.speed = 3.5 + rng() * 6;
  m.positions[0] = m.x; m.positions[1] = m.y; m.positions[2] = m.z;
}
function updateMeteors(dt) {
  for (const m of meteors) {
    m.life += dt;
    if (m.life > 3.8) resetMeteor(m);
    const headX = m.x - m.life * m.speed;
    const headY = m.y - m.life * m.speed * 0.55;
    const headZ = m.z;
    m.positions[0] = headX; m.positions[1] = headY; m.positions[2] = headZ;
    m.positions[3] = headX + m.speed * 0.36; m.positions[4] = headY + m.speed * 0.2; m.positions[5] = headZ;
    m.geo.attributes.position.needsUpdate = true;
  }
}


// --------------------------------------------------------------------------
// Camera views / rebuilds
// --------------------------------------------------------------------------
const views = {
  panorama: [[0, 4.2, 25], [0, 3.2, 0]],
  nebula: [[-8, 8, 13], [-3, 5, -8]],
  aurora: [[0, 6, 15], [0, 8, -15]],
  fall: [[0, 4.5, 10], [0, 3, 0]],
  meteor: [[8, 6, 17], [-2, 6, -12]]
};
let tween = null;
function setView(name) {
  const v = views[name] || views.panorama;
  state.view = name;
  tween = {
    fromPos: camera.position.clone(), toPos: new THREE.Vector3(...v[0]),
    fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...v[1]),
    elapsed: 0, duration: 1.6
  };
  ui.setStatus(viewLabel(name), 'warm');
}
function viewLabel(name) {
  return ({ panorama: 'PANORAMA · 12,000 STARS', nebula: 'NEBULA CLOSE-UP', aurora: 'AURORA CLOSE-UP', fall: 'GOLDEN FALL', meteor: 'WAIT FOR A METEOR' })[name] || 'DEEP SPACE';
}
function updateTween(dt) {
  if (!tween) return;
  tween.elapsed += dt;
  const t = smoothstep(clamp(tween.elapsed / tween.duration, 0, 1));
  camera.position.lerpVectors(tween.fromPos, tween.toPos, t);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, t);
  controls.update();
  if (t >= 1) tween = null;
}
function scheduleRebuild() {
  window.clearTimeout(scheduleRebuild.timer);
  scheduleRebuild.timer = window.setTimeout(() => {
    buildNearFar();
    buildNebula();
    buildAurora();
    buildWaterfall();
    buildMeteors();
    buildOrbits();
    updateColors();
    ui.setStats(loop.fps, renderer.info.render.calls, state.stars + state.farStars + state.waterfall);
  }, 80);
}
function resetAll() {
  Object.assign(state, DEFAULTS);
  state.view = 'panorama';
  bloomEnabled = DEFAULTS.bloom;
  for (const key of Object.keys(DEFAULTS)) ui.setValue(key, state[key]);
  buildNearFar(); buildNebula(); buildAurora(); buildWaterfall(); buildMeteors(); buildOrbits(); updateColors();
  buildComposer();
  setView('panorama');
  controls.autoRotate = DEFAULTS.autoOrbit;
  ui.setStatus('RESET · deep space', 'warm');
}

function animate(dt, elapsed) {
  updateTween(dt);
  controls.autoRotate = state.autoOrbit;
  controls.update();
  for (const m of [nearStars, farStars]) if (m) m.material.uniforms.uTime.value = elapsed;
  for (const m of nebulaGroup.children) if (m.material.uniforms) m.material.uniforms.uTime.value = elapsed;
  for (const m of auroraGroup.children) if (m.material.uniforms) m.material.uniforms.uTime.value = elapsed;
  if (waterfall) waterfall.material.uniforms.uTime.value = elapsed;
  updateMeteors(dt);
  orbitGroup.rotation.y += dt * 0.02;
  orbitGroup.rotation.x = Math.sin(elapsed * .08) * .06;
  renderer.info.reset();
  if (bloomEnabled && composer) composer.render(); else renderer.render(scene, camera);
}

const loop = new LabLoop({
  onFrame: animate,
  onFps: (fps) => {
    ui.setStats(fps, renderer.info.render.calls, state.stars + state.farStars + state.waterfall);
    if (!paused) ui.setStatus(viewLabel(state.view), 'warm');
  }
});

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); composer.setSize(window.innerWidth, window.innerHeight); }
  for (const m of [nearStars, farStars]) if (m) m.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.75);
  if (waterfall) waterfall.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.75);
}

buildComposer();
buildNearFar();
buildNebula();
buildAurora();
buildWaterfall();
buildMeteors();
buildOrbits();
updateColors();
resize();
setView('panorama');
loop.start();
ui.setStatus('DEEP SPACE · 12,000 STARS', 'warm');
window.addEventListener('resize', resize);

window.__LAB__ = {
  number: '03',
  ui, state, scene, camera, renderer, controls,
  setView,
  setBloom: (v) => { bloomEnabled = Boolean(v); ui.setValue('bloom', v); },
  getStats: () => ({ fps: loop.fps, calls: renderer.info.render.calls, stars: state.stars, farStars: state.farStars, waterfall: state.waterfall, view: state.view }),
  pause: () => { paused = loop.toggle(); return paused; },
  reset: resetAll,
  dispose: () => {
    loop.dispose(); controls.dispose();
    disposeObj(root);
    composer?.dispose(); renderer.dispose();
  }
};
window.addEventListener('beforeunload', () => window.__LAB__?.dispose());
