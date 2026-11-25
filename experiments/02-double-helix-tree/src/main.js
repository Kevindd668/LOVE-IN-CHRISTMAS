import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createLabUI } from '../../shared/ui.js';
import { LabLoop, clamp, lerp, smoothstep, mulberry32 } from '../../shared/loop.js';
// F2 lab-only adaptation of the existing, already-tested Christmas-Wish tree
// source. It is copied into this experiment so the lab remains standalone.
// Source: src/objects/ChristmasTree.ts at product baseline; not imported from
// the formal application at runtime.
import { ChristmasTree } from './product-tree.js';

const DEFAULTS = {
  height: 9.5,
  radius: 3.0,
  layers: 9,
  leafBase: '#0B5D3B',
  leafHighlight: '#27A66A',
  leafShadow: '#073D2A',
  bulbs: 360,
  hearts: 48,
  flow: 1800,
  bloom: true,
  bloomStrength: 1.15,
  rotate: true,
  rotateSpeed: 0.12
};
const state = { ...DEFAULTS, view: '45' };

const ui = createLabUI({
  number: '02',
  kicker: 'F2 VISUAL LAB · ORIGINAL TREE SHADER STUDY / THREE.JS',
  title: '双螺旋圣诞树',
  description: '九层枝叶、两条反向光带、360 颗呼吸灯泡，以及在水晶爱心下等待你的冬夜。',
  sections: [
    {
      index: '01',
      title: '树体',
      controls: [
        { key: 'height', label: '树体高度', type: 'range', min: 7, max: 12, step: 0.1, value: DEFAULTS.height, format: (v) => Number(v).toFixed(1) },
        { key: 'radius', label: '最大半径', type: 'range', min: 2, max: 4, step: 0.05, value: DEFAULTS.radius, format: (v) => Number(v).toFixed(2) },
        { key: 'layers', label: '树枝层数', type: 'range', min: 7, max: 12, step: 1, value: DEFAULTS.layers },
        { key: 'leafBase', label: '树叶颜色', type: 'color', value: DEFAULTS.leafBase },
        { key: 'leafHighlight', label: '树叶高光', type: 'color', value: DEFAULTS.leafHighlight },
        { key: 'leafShadow', label: '树叶阴影', type: 'color', value: DEFAULTS.leafShadow },
        { key: 'rotate', label: '树体缓慢旋转', type: 'toggle', value: DEFAULTS.rotate },
        { key: 'rotateSpeed', label: '旋转速度', type: 'range', min: 0, max: 0.5, step: 0.01, value: DEFAULTS.rotateSpeed, format: (v) => Number(v).toFixed(2) }
      ]
    },
    {
      index: '02',
      title: '灯光 / 装饰',
      controls: [
        { key: 'bulbs', label: '动态灯泡', type: 'range', min: 120, max: 520, step: 20, value: DEFAULTS.bulbs },
        { key: 'hearts', label: '爱心装饰球', type: 'range', min: 12, max: 64, step: 4, value: DEFAULTS.hearts },
        { key: 'flow', label: '流动粒子', type: 'range', min: 600, max: 2600, step: 100, value: DEFAULTS.flow },
        { key: 'bloom', label: 'UnrealBloom 发光', type: 'toggle', value: DEFAULTS.bloom },
        { key: 'bloomStrength', label: 'Bloom 强度', type: 'range', min: 0, max: 2.4, step: 0.05, value: DEFAULTS.bloomStrength, format: (v) => Number(v).toFixed(2) }
      ]
    }
  ],
  actions: [
    { key: 'front', label: '正面视角', primary: true },
    { key: 'angle45', label: '45° 视角' },
    { key: 'side', label: '侧面视角' },
    { key: 'top', label: '顶部视角' },
    { key: 'helix', label: '双螺旋近景' },
    { key: 'crown', label: '树顶爱心近景' },
    { key: 'lights', label: '灯光近景' },
    { key: 'pause', label: '暂停 / 继续' },
    { key: 'reset', label: '重置实验' }
  ],
  onChange: (key, value) => {
    state[key] = value;
    if (key === 'bloom') {
      bloomEnabled = Boolean(value);
    }
    if (key === 'bloomStrength') {
      if (bloomPass) bloomPass.strength = Number(value);
    }
    if (['height', 'radius', 'layers', 'leafBase', 'leafHighlight', 'leafShadow', 'bulbs', 'hearts', 'flow'].includes(key)) {
      scheduleBuild();
    }
    ui.setStatus(`${viewLabel(state.view)} · ${state.layers} layers`, 'warm');
  },
  onAction: (action) => {
    if (action === 'reset') {
      Object.assign(state, DEFAULTS);
      state.view = '45';
      for (const key of Object.keys(DEFAULTS)) ui.setValue(key, state[key]);
      bloomEnabled = DEFAULTS.bloom;
      buildComposer();
      build();
      setView('angle45', true);
      ui.setStatus('RESET · original 9-layer tree', 'warm');
      return;
    }
    if (action === 'pause') {
      paused = loop.toggle();
      ui.setStatus(paused ? 'PAUSED' : `${viewLabel(state.view)} · ${state.layers} layers`, paused ? '' : 'warm');
      return;
    }
    if (action === 'reset-view') {
      setView('angle45', true);
      return;
    }
    const map = { front: 'front', angle45: 'angle45', side: 'side', top: 'top', helix: 'helix', crown: 'crown', lights: 'lights' };
    if (map[action]) setView(map[action], true);
  }
});

let paused = false;
let bloomEnabled = state.bloom;
const canvas = document.querySelector('#lab-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;
renderer.setClearColor('#040a0e', 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#040a0e');
scene.fog = new THREE.FogExp2('#040a0e', 0.016);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 6.5, 16);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 4.7, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.update();

const hemi = new THREE.HemisphereLight('#b4e2dc', '#07120d', 1.9);
scene.add(hemi);
const ambient = new THREE.AmbientLight('#315842', 0.75);
scene.add(ambient);
const key = new THREE.DirectionalLight('#ffe8c2', 2.35);
key.position.set(6, 13, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -12;
key.shadow.camera.right = 12;
key.shadow.camera.top = 16;
key.shadow.camera.bottom = -2;
scene.add(key);
const rim = new THREE.PointLight('#ff75a9', 12, 18, 2);
rim.position.set(-4, 6, -4);
scene.add(rim);
const warm = new THREE.PointLight('#ffd58a', 14, 16, 2);
warm.position.set(3, 2, 5);
scene.add(warm);

let composer = null;
let bloomPass = null;
let renderPass = null;
let outputPass = null;
function buildComposer() {
  if (composer) {
    renderPass?.dispose?.(); bloomPass?.dispose?.(); outputPass?.dispose?.(); composer.dispose();
  }
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), state.bloomStrength, 0.48, 0.62);
  outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------------------------------------------------
// Tree
// --------------------------------------------------------------------------
let treeGroup = new THREE.Group();
treeGroup.name = 'procedure-tree';
scene.add(treeGroup);
let lightsPoints = null;
let flowPoints = null;
let heartInstances = null;
let goldInstances = null;
let helixA = null;
let helixB = null;
let topHeart = null;
let productTree = null;
let treeParts = [];
const dummy = new THREE.Object3D();
const instColor = new THREE.Color();
const rng = mulberry32(98341);

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) m.dispose();
    }
  });
}

function tierRadius(t, h, radius) {
  return Math.max(0.22, radius * Math.pow(1 - t, 0.87) * (1 + 0.04 * Math.sin(t * 20)));
}

function buildTierCone(t, index, count) {
  const h = state.height;
  const baseY = 0.35 + (h * 0.74) * t;
  const layerH = h * (0.3 - 0.1 * t);
  const radius = tierRadius(t, h, state.radius);
  const geo = new THREE.ConeGeometry(radius, layerH, 54, 4, true);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cBase = new THREE.Color(state.leafBase);
  const cHi = new THREE.Color(state.leafHighlight);
  const cShadow = new THREE.Color(state.leafShadow);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const radial = Math.sqrt(x * x + z * z);
    const rim = radial / Math.max(0.01, radius);
    const yy = (y + layerH / 2) / layerH;
    const noise = (Math.sin(angle * 9 + index * 2.1) * 0.5 + 0.5) * 0.04;
    if (yy < 0.96) {
      pos.setX(i, x * (0.94 + noise + Math.sin(index + i) * 0.012));
      pos.setZ(i, z * (0.94 + noise * 0.8 + Math.cos(index * 1.7 + i) * 0.01));
    }
    tmp.copy(cShadow).lerp(cBase, 0.46 + yy * 0.18);
    tmp.lerp(cHi, Math.pow(rim, 3.2) * (0.08 + 0.14 * (1 - yy)) + 0.006);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.015,
    side: THREE.DoubleSide,
    flatShading: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.x = 0.88; mesh.scale.z = 0.88;
  mesh.position.y = baseY + layerH / 2;
  mesh.rotation.y = index * 0.45;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  treeGroup.add(mesh);
  treeParts.push(mesh);
}

function buildTrunk() {
  const h = state.height;
  const geo = new THREE.CylinderGeometry(0.16, 0.36, h * 0.82, 12);
  const mat = new THREE.MeshStandardMaterial({ color: '#3b2117', roughness: 0.97, metalness: 0 });
  const trunk = new THREE.Mesh(geo, mat);
  trunk.position.y = h * 0.4;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);
  treeParts.push(trunk);
}

function buildBranches() {
  const h = state.height;
  const count = 9 * 28;
  const geo = new THREE.ConeGeometry(0.065, 0.62, 4);
  geo.translate(0, 0.31, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(state.leafShadow).multiplyScalar(0.66),
    roughness: 0.94,
    metalness: 0,
    flatShading: true
  });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.castShadow = false;
  const tint = new THREE.Color();
  const base = new THREE.Color(state.leafBase);
  const hi = new THREE.Color(state.leafHighlight);
  let i = 0;
  for (let tier = 0; tier < 9; tier++) {
    const t = tier / 8;
    const y = 0.65 + h * 0.73 * t;
    const radius = tierRadius(t, h, state.radius);
    for (let j = 0; j < 28; j++) {
      const angle = (j / 28) * Math.PI * 2 + rng() * 0.16;
      dummy.position.set(Math.cos(angle) * radius * 0.78, y + (rng() - 0.5) * 0.12, Math.sin(angle) * radius * 0.78);
      dummy.rotation.set(0, -angle, Math.PI * (0.34 + rng() * 0.08));
      dummy.scale.setScalar(0.7 + rng() * 0.55);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      tint.copy(base).lerp(hi, rng() * 0.55).multiplyScalar(0.66 + rng() * 0.35);
      inst.setColorAt(i, tint);
      i++;
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  treeGroup.add(inst);
  treeParts.push(inst);
}

function buildLights() {
  const n = Math.max(40, Math.round(state.bulbs));
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const phases = new Float32Array(n);
  const palette = [new THREE.Color('#FFD58A'), new THREE.Color('#FF75A9'), new THREE.Color('#FFF5EE'), new THREE.Color('#B68AFF')];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = 0.7 + t * (state.height * 0.78);
    const envelope = Math.max(0.25, state.radius * Math.pow(1 - t, 0.9));
    const angle = t * Math.PI * 2 * 7.4 + Math.sin(t * 33) * 0.3;
    positions[i * 3] = Math.cos(angle) * envelope * (0.85 + (i % 7) * 0.015);
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * envelope * (0.85 + (i % 5) * 0.02);
    const c = palette[i % palette.length];
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    sizes[i] = 0.65 + (i % 6) * 0.17;
    phases[i] = rng() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uPixelRatio;
      varying vec3 vColor; varying float vGlow;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float twinkle = 0.58 + 0.42 * sin(uTime * 2.3 + aPhase);
        gl_PointSize = clamp(aSize * uPixelRatio * (180.0 / max(1.0, -mv.z)) * (0.8 + twinkle * 0.35), 1.0, 11.0);
        gl_Position = projectionMatrix * mv;
        vColor = aColor; vGlow = twinkle;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vGlow;
      void main(){
        vec2 p = gl_PointCoord - 0.5; float d = length(p); if(d > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.2, d);
        float halo = 1.0 - smoothstep(0.05, 0.5, d);
        gl_FragColor = vec4(vColor * (0.7 + core * 1.4), (halo * 0.5 + core * 0.7) * vGlow);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  lightsPoints = new THREE.Points(geo, mat);
  lightsPoints.frustumCulled = false;
  lightsPoints.renderOrder = 3;
  treeGroup.add(lightsPoints);
  treeParts.push(lightsPoints);
}

function heartShapeGeometry(scale = 1, depth = 0.14) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.45);
  shape.bezierCurveTo(0.05, -0.24, 0.34, 0.05, 0.34, 0.28);
  shape.bezierCurveTo(0.34, 0.55, 0.04, 0.62, 0, 0.33);
  shape.bezierCurveTo(-0.04, 0.62, -0.34, 0.55, -0.34, 0.28);
  shape.bezierCurveTo(-0.34, 0.05, -0.05, -0.24, 0, -0.45);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 12
  });
  geo.center();
  geo.scale(scale, scale, scale);
  return geo;
}

function makeNeedleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 512);
  const stem = ctx.createLinearGradient(128, 500, 128, 32);
  stem.addColorStop(0, 'rgba(3,32,22,0.2)');
  stem.addColorStop(0.2, 'rgba(8,64,40,0.95)');
  stem.addColorStop(0.8, 'rgba(17,91,57,0.9)');
  stem.addColorStop(1, 'rgba(23,112,70,0.2)');
  ctx.strokeStyle = stem;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 506);
  ctx.quadraticCurveTo(118, 250, 131, 35);
  ctx.stroke();
  const tones = ['#0a4732', '#0d5b3c', '#137c50', '#1c8f61', '#245b43'];
  for (let i = 0; i < 680; i++) {
    const p = i / 680;
    const y = 460 - p * 420;
    const side = i % 2 === 0 ? -1 : 1;
    const startX = 128 + (Math.random() - 0.5) * 10;
    const length = (26 + Math.random() * 58) * (1 - p * 0.45);
    const tilt = (Math.random() - 0.35) * 0.9;
    ctx.strokeStyle = tones[i % tones.length];
    ctx.globalAlpha = 0.55 + Math.random() * 0.4;
    ctx.lineWidth = Math.random() < 0.16 ? 1.8 : 0.85;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + side * length, y - length * (0.35 + tilt));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function crossPlaneGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const add = (rotY) => {
    const base = positions.length / 3;
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const pts = [
      [-0.5, 0, 0], [0.5, 0, 0], [0.5, 1, 0], [-0.5, 1, 0]
    ];
    for (const [x, y, z] of pts) {
      positions.push(c * x - s * z, y, s * x + c * z);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  add(0); add(Math.PI / 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildBranchCards() {
  const perTier = 44;
  const count = state.layers * perTier;
  const geo = crossPlaneGeometry();
  const mat = new THREE.MeshStandardMaterial({
    map: makeNeedleTexture(),
    alphaTest: 0.16,
    transparent: true,
    opacity: 0.98,
    side: THREE.DoubleSide,
    roughness: 0.94,
    metalness: 0.0
  });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.castShadow = false;
  const base = new THREE.Color(state.leafBase);
  const hi = new THREE.Color(state.leafHighlight);
  const shadow = new THREE.Color(state.leafShadow);
  const tint = new THREE.Color();
  let n = 0;
  for (let tier = 0; tier < state.layers; tier++) {
    const t = tier / Math.max(1, state.layers - 1);
    const radius = tierRadius(t, state.height, state.radius) * 0.88;
    const bandY = 0.42 + (state.height * 0.78) * (tier / state.layers);
    for (let j = 0; j < perTier; j++) {
      const angle = (j / perTier) * Math.PI * 2 + (rng() - 0.5) * 0.25 + tier * 0.31;
      dummy.position.set(Math.cos(angle) * radius * (0.55 + rng() * 0.3), bandY + (rng() - 0.5) * 0.2, Math.sin(angle) * radius * (0.55 + rng() * 0.3));
      dummy.rotation.order = 'YXZ';
      dummy.rotation.set(0, -angle + Math.PI / 2, (rng() - 0.5) * 0.16);
      dummy.scale.set(0.62 + rng() * 0.48, 0.9 + rng() * 0.45, 0.62 + rng() * 0.35);
      dummy.updateMatrix();
      inst.setMatrixAt(n, dummy.matrix);
      tint.copy(shadow).lerp(base, 0.55 + rng() * 0.35);
      if (j % 9 === 0) tint.lerp(hi, 0.34);
      tint.multiplyScalar(0.72 + rng() * 0.28);
      inst.setColorAt(n, tint);
      n++;
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  treeGroup.add(inst);
  treeParts.push(inst);
}

function buildHearts() {
  const n = Math.max(1, Math.round(state.hearts));
  const geo = heartShapeGeometry(0.18, 0.08);
  const mat = new THREE.MeshStandardMaterial({
    color: '#FF75A9',
    metalness: 0.62,
    roughness: 0.24,
    emissive: '#FF2F6B',
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide
  });
  heartInstances = new THREE.InstancedMesh(geo, mat, n);
  heartInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6) / (n + 1);
    const y = 1.0 + t * (state.height * 0.69);
    const radius = tierRadius(t, state.height, state.radius) * (0.88 + (i % 3) * 0.06);
    const angle = i * 2.39996 + rng() * 0.4;
    dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    dummy.rotation.set(0, -angle + Math.PI / 2, 0);
    dummy.scale.setScalar(0.82 + rng() * 0.75);
    dummy.updateMatrix();
    heartInstances.setMatrixAt(i, dummy.matrix);
    c.set(i % 4 === 0 ? '#FFD58A' : '#FF75A9');
    heartInstances.setColorAt(i, c);
  }
  heartInstances.instanceMatrix.needsUpdate = true;
  if (heartInstances.instanceColor) heartInstances.instanceColor.needsUpdate = true;
  heartInstances.renderOrder = 2;
  treeGroup.add(heartInstances);
  treeParts.push(heartInstances);

  goldInstances = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.11, 12, 8),
    new THREE.MeshStandardMaterial({ color: '#FFD58A', metalness: 0.92, roughness: 0.14, emissive: '#A87028', emissiveIntensity: 0.2 }),
    28
  );
  for (let i = 0; i < 28; i++) {
    const t = (i + 0.35) / 28.35;
    const y = 1.1 + t * (state.height * 0.63);
    const radius = tierRadius(t, state.height, state.radius) * (0.9 + (i % 4) * 0.035);
    const angle = i * 2.1 + 0.5;
    dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.78 + (i % 3) * 0.15);
    dummy.updateMatrix();
    goldInstances.setMatrixAt(i, dummy.matrix);
  }
  goldInstances.instanceMatrix.needsUpdate = true;
  treeGroup.add(goldInstances);
  treeParts.push(goldInstances);
}

function buildHelix() {
  const pointsA = [], pointsB = [];
  const turns = 6.2;
  const segments = 260;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = 0.9 + t * (state.height * 0.82);
    const r = Math.max(0.15, state.radius * Math.pow(1 - t, 0.9)) + 0.09;
    pointsA.push(new THREE.Vector3(Math.cos(t * Math.PI * 2 * turns) * r, y, Math.sin(t * Math.PI * 2 * turns) * r));
    pointsB.push(new THREE.Vector3(Math.cos(-t * Math.PI * 2 * turns + Math.PI) * r, y, Math.sin(-t * Math.PI * 2 * turns + Math.PI) * r));
  }
  const makeRibbon = (pts, color) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 380, 0.035, 5, false);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 4;
    treeGroup.add(mesh);
    treeParts.push(mesh);
    return mesh;
  };
  helixA = makeRibbon(pointsA, '#FFD58A');
  helixB = makeRibbon(pointsB, '#FF75A9');
}

function buildFlow() {
  const n = Math.round(state.flow);
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  const speeds = new Float32Array(n);
  const sizes = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    phases[i] = rng() * Math.PI * 2;
    speeds[i] = 0.1 + rng() * 0.28;
    sizes[i] = 0.4 + rng() * 0.9;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, state.height * 0.5, 0), state.height * 1.2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }, uColor: { value: new THREE.Color('#FFD58A') }, uPink: { value: new THREE.Color('#FF75A9') } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPixelRatio;
      attribute float aPhase; attribute float aSpeed; attribute float aSize;
      varying float vMix;
      void main(){
        float t = fract(position.y + uTime * aSpeed * 0.14 + aPhase * 0.03);
        float height = ${state.height.toFixed(2)};
        float y = 0.4 + t * (height * 1.02);
        float envelope = max(0.2, ${state.radius.toFixed(2)} * pow(1.0 - t, 0.85));
        float a = aPhase * 7.0 + t * 15.0 + uTime * 0.12;
        vec3 p = vec3(cos(a) * envelope, y, sin(a) * envelope);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(aSize * uPixelRatio * (120.0/max(1.0,-mv.z)), 0.6, 5.0);
        gl_Position = projectionMatrix * mv;
        vMix = t;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uPink; varying float vMix;
      void main(){
        vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
        float a=(1.0-smoothstep(.05,.5,d))*.38;
        vec3 c=mix(uColor,uPink,smoothstep(.3,.9,vMix));
        gl_FragColor=vec4(c*.8,a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  flowPoints = new THREE.Points(geo, mat);
  flowPoints.frustumCulled = false;
  flowPoints.renderOrder = 1;
  treeGroup.add(flowPoints);
  treeParts.push(flowPoints);
}

function buildCrown() {
  const heart = new THREE.Group();
  const geo = heartShapeGeometry(0.72, 0.3);
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#FFC6D8',
    metalness: 0.1,
    roughness: 0.12,
    transmission: 0.35,
    thickness: 0.8,
    transparent: true,
    opacity: 0.9,
    emissive: '#FF75A9',
    emissiveIntensity: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    side: THREE.DoubleSide
  });
  const heartMesh = new THREE.Mesh(geo, mat);
  heart.add(heartMesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 28),
    new THREE.LineBasicMaterial({ color: '#FFE9B0', transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending })
  );
  edges.scale.setScalar(1.018);
  heart.add(edges);
  const inner = new THREE.Mesh(
    heartShapeGeometry(0.43, 0.12),
    new THREE.MeshBasicMaterial({ color: '#FF9FC4', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
  );
  inner.position.z = 0.02;
  heart.add(inner);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: '#FFD58A',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.4
  }));
  glow.scale.set(2.0, 2.0, 1);
  heart.add(glow);
  heart.position.set(0, state.height + 0.72, 0);
  heart.scale.setScalar(1);
  heart.rotation.y = 0.2;
  treeGroup.add(heart);
  treeParts.push(heart);
  topHeart = heart;
}

function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,.9)');
  gradient.addColorStop(0.3, 'rgba(255,213,138,.34)');
  gradient.addColorStop(1, 'rgba(255,117,169,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildGifts() {
  const colors = ['#74253A', '#B88D52', '#123D31'];
  const pos = [[2.35, 0.35, 2.2], [0.8, 0.25, 3.15], [-1.9, 0.28, 2.45]];
  const ribbons = ['#E4BF7C', '#F6E8CE', '#D7B474'];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const w = 0.8 - i * 0.08, h = 0.62 - i * 0.04, d = 0.68 - i * 0.05;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.42, metalness: 0.15 }));
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.12, d * 1.06), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.34, metalness: 0.2 }));
    lid.position.y = h + 0.08; g.add(lid);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.09, h + 0.15, d * 1.04), new THREE.MeshStandardMaterial({ color: ribbons[i], roughness: 0.3, metalness: 0.55 }));
    ribbon.position.y = h / 2; g.add(ribbon);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, h + 0.15, 0.07), new THREE.MeshStandardMaterial({ color: ribbons[i], roughness: 0.3, metalness: 0.55 }));
    cross.position.y = h / 2; g.add(cross);
    g.position.set(...pos[i]);
    g.rotation.y = [-0.2, 0.16, 0.34][i];
    treeGroup.add(g);
    treeParts.push(g);
  }
}

function buildGround() {
  const geo = new THREE.CircleGeometry(14, 72);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; uniform float uTime;
      void main(){
        vec2 p=vUv-.5; float d=length(p)*2.0;
        float rings=.5+.5*sin(d*33.0-uTime*.35);
        float glow=pow(max(0.,1.0-d),2.4);
        vec3 c=mix(vec3(.006,.018,.016),vec3(.08,.055,.036),glow*.8);
        c+=vec3(.11,.075,.038)*rings*glow*.06;
        gl_FragColor=vec4(c,1.0);
      }
    `,
    depthWrite: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.02;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(6.2, 64),
    new THREE.MeshBasicMaterial({ map: makeSoftShadow(), transparent: true, opacity: 0.8, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);
  return { mesh, shadow };
}

function makeSoftShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,.82)');
  grad.addColorStop(0.45, 'rgba(0,0,0,.36)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

let ground = null;
function build() {
  if (paused) loop.resume();
  disposeObject(treeGroup);
  scene.remove(treeGroup);
  treeGroup = new THREE.Group();
  treeGroup.name = 'procedure-tree';
  scene.add(treeGroup);
  treeParts = [];
  lightsPoints = null; flowPoints = null; heartInstances = null; goldInstances = null;
  helixA = null; helixB = null; topHeart = null;
  if (productTree) {
    productTree.dispose();
    productTree = null;
  }
  if (!ground) ground = buildGround();

  // The existing Christmas-Wish tree is the mature 9-tier branch/needle base;
  // the lab then layers the double helix, 48 hearts, flow field and crystal
  // crown on top. It is a local copy, not a runtime import from the product.
  productTree = new ChristmasTree({
    treeHeight: state.height,
    crownRadius: state.radius,
    density: 210,
    layers: state.layers,
    foliageColor: state.leafBase,
    treeRotate: false,
    treeRotateSpeed: 0,
    lightsOn: true,
    lightColor: '#FFD6A0',
    lightCount: state.bulbs,
    lightBrightness: 2.0,
    lightFlashSpeed: 1,
    lightMode: 'warm'
  });
  productTree.star.root.visible = false;
  // Keep the mature branch structure, but use the lab's round bulb shader
  // instead of the product's square-looking point sprites at close range.
  productTree.lights.group.visible = false;
  treeGroup.add(productTree.group);
  buildLights();

  buildHearts();
  buildHelix();
  buildFlow();
  buildCrown();
  buildGifts();
  camera.far = 80;
  camera.updateProjectionMatrix();
  window.__LAB__ && (window.__LAB__.tree = treeParts);
}

let buildTimer = 0;
function scheduleBuild() {
  window.clearTimeout(buildTimer);
  buildTimer = window.setTimeout(() => build(), 80);
}

const views = {
  front: [[0, 5.3, 21], [0, 4.8, 0]],
  angle45: [[10.5, 6.3, 16.5], [0, 4.8, 0]],
  side: [[20, 5.4, 0.1], [0, 4.8, 0]],
  top: [[0.1, 18, 0.2], [0, 4.5, 0]],
  helix: [[4.6, 4.2, 7.0], [0, 4.5, 0]],
  crown: [[0.1, 11.6, 6.4], [0, 9.8, 0]],
  lights: [[4.7, 5.7, 6.6], [0, 5.2, 0]]
};
let tween = null;
function setView(name, animate = true) {
  const v = views[name] || views.angle45;
  state.view = name;
  const toPos = new THREE.Vector3(...v[0]);
  const toTarget = new THREE.Vector3(...v[1]);
  if (!animate) {
    camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); return;
  }
  tween = {
    fromPos: camera.position.clone(),
    toPos,
    fromTarget: controls.target.clone(),
    toTarget,
    elapsed: 0,
    duration: name === 'top' ? 1.8 : 1.4
  };
}
function viewLabel(name) {
  return ({ front: 'FRONT VIEW', angle45: '45° VIEW', side: 'SIDE VIEW', top: 'TOP VIEW', helix: 'DOUBLE HELIX', crown: 'CRYSTAL HEART', lights: 'LIGHT CLOSE-UP' })[name] || 'FREE ORBIT';
}
function updateTween(dt) {
  if (!tween) return;
  tween.elapsed += dt;
  const t = smoothstep(clamp(tween.elapsed / tween.duration, 0, 1));
  camera.position.lerpVectors(tween.fromPos, tween.toPos, t);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, t);
  controls.update();
  if (t >= 1) { tween = null; controls.enabled = true; }
}
function resetAll() {
  setView('angle45', true);
  state.view = 'angle45';
  ui.setStatus('ORBIT · use your mouse to explore', 'warm');
}

// Background particles: subtle snow in the volume, one draw call.
function snowBackdrop() {
  const n = 600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 4 + rng() * 12;
    const a = rng() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = rng() * 15;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: '#dff5ee', size: 0.035, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  scene.add(p);
  return p;
}
const snow = snowBackdrop();

function buildLightsAndFlowTime(time) {
  if (lightsPoints) lightsPoints.material.uniforms.uTime.value = time;
  if (flowPoints) flowPoints.material.uniforms.uTime.value = time;
  if (ground?.mesh) ground.mesh.material.uniforms.uTime.value = time;
  if (topHeart) {
    topHeart.rotation.y += 0.0018;
    topHeart.position.y = state.height + 0.72 + Math.sin(time * 0.9) * 0.02;
  }
  if (state.rotate) treeGroup.rotation.y += 0.0012 * Number(state.rotateSpeed) * 6.5;
}

function renderFrame(dt, elapsed) {
  updateTween(dt);
  if (productTree) productTree.update(dt, elapsed);
  buildLightsAndFlowTime(elapsed);
  controls.update();
  renderer.info.reset();
  if (bloomEnabled && composer) composer.render();
  else renderer.render(scene, camera);
}

const loop = new LabLoop({
  onFrame: renderFrame,
  onFps: (fps) => {
    ui.setStats(fps, renderer.info.render.calls, state.bulbs + (flowPoints?.geometry.attributes.position.count || 0) + (heartInstances?.count || 0));
    if (!paused) ui.setStatus(`${viewLabel(state.view)} · ${state.layers} layers`, 'warm');
  }
});

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); composer.setSize(window.innerWidth, window.innerHeight); }
  if (lightsPoints) lightsPoints.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  if (flowPoints) flowPoints.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
}
window.addEventListener('resize', resize);

buildComposer();
build();
resize();
setView('angle45', false);
loop.start();
ui.setStatus('ORBIT · drag to explore the tree', 'warm');

window.__LAB__ = {
  number: '02',
  ui,
  state,
  scene,
  camera,
  renderer,
  controls,
  setView: (name) => setView(name, true),
  setBloom: (enabled) => { bloomEnabled = Boolean(enabled); state.bloom = Boolean(enabled); ui.setValue('bloom', enabled); },
  getStats: () => ({ fps: loop.fps, calls: renderer.info.render.calls, mode: state.view, layers: state.layers, bulbs: state.bulbs, hearts: state.hearts }),
  pause: () => { paused = loop.toggle(); return paused; },
  reset: () => { resetAll(); },
  dispose: () => {
    loop.dispose();
    controls.dispose();
    productTree?.dispose();
    disposeObject(treeGroup);
    disposeObject(snow);
    scene.remove(treeGroup);
    if (ground) { disposeObject(ground.mesh); ground.mesh.geometry.dispose(); ground.mesh.material.dispose(); ground.shadow.geometry.dispose(); ground.shadow.material.map?.dispose(); ground.shadow.material.dispose(); }
    composer?.dispose();
    renderer.dispose();
  }
};
window.addEventListener('beforeunload', () => window.__LAB__?.dispose());
