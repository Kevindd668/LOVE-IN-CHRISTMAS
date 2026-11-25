import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createLabUI } from '../../shared/ui.js';
import { LabLoop, clamp, smoothstep, mulberry32 } from '../../shared/loop.js';

const DEFAULTS = {
  radius1: 4.2,
  radius2: 5.2,
  radius3: 6.2,
  speed1: 0.18,
  speed2: -0.12,
  speed3: 0.09,
  cardScale: 1,
  showCaption: true,
  showDate: true,
  autoOrbit: true,
  bloom: true
};
const state = { ...DEFAULTS };
const MAX_PHOTOS = 24;
const records = [];
let focusedId = null;
let paused = false;
let bloomEnabled = true;
let orbitTimes = [0, 0, 0];
let cameraTween = null;
let savedCamera = null;
let savedTarget = null;

const ui = createLabUI({
  number: '04',
  kicker: 'F2 VISUAL LAB · PHOTO MEMORY / LOCAL ONLY',
  title: '我们的照片记忆',
  description: '让照片拥有自己的轨道、光线和呼吸。所有照片只在本地处理，不上传、不离开这台电脑。',
  sections: [
    {
      index: '01',
      title: '三层照片轨道',
      controls: [
        { key: 'radius1', label: '第一层半径', type: 'range', min: 3.4, max: 5.3, step: 0.05, value: DEFAULTS.radius1, format: (v) => Number(v).toFixed(2) },
        { key: 'radius2', label: '第二层半径', type: 'range', min: 4.2, max: 6.4, step: 0.05, value: DEFAULTS.radius2, format: (v) => Number(v).toFixed(2) },
        { key: 'radius3', label: '第三层半径', type: 'range', min: 5.2, max: 7.6, step: 0.05, value: DEFAULTS.radius3, format: (v) => Number(v).toFixed(2) },
        { key: 'speed1', label: '第一层旋转速度', type: 'range', min: -0.5, max: 0.5, step: 0.01, value: DEFAULTS.speed1, format: (v) => Number(v).toFixed(2) },
        { key: 'speed2', label: '第二层旋转速度', type: 'range', min: -0.5, max: 0.5, step: 0.01, value: DEFAULTS.speed2, format: (v) => Number(v).toFixed(2) },
        { key: 'speed3', label: '第三层旋转速度', type: 'range', min: -0.5, max: 0.5, step: 0.01, value: DEFAULTS.speed3, format: (v) => Number(v).toFixed(2) }
      ]
    },
    {
      index: '02',
      title: '卡片与空间',
      controls: [
        { key: 'cardScale', label: '卡片尺寸', type: 'range', min: 0.7, max: 1.4, step: 0.01, value: DEFAULTS.cardScale, format: (v) => Number(v).toFixed(2) },
        { key: 'showCaption', label: '显示照片文字', type: 'toggle', value: DEFAULTS.showCaption },
        { key: 'showDate', label: '显示照片日期', type: 'toggle', value: DEFAULTS.showDate },
        { key: 'autoOrbit', label: '相机缓慢环绕', type: 'toggle', value: DEFAULTS.autoOrbit },
        { key: 'bloom', label: 'UnrealBloom 发光', type: 'toggle', value: DEFAULTS.bloom }
      ]
    }
  ],
  actions: [
    { key: 'focus', label: '放大第一张', primary: true },
    { key: 'exit', label: '返回轨道' },
    { key: 'pause', label: '暂停 / 继续' },
    { key: 'reset', label: '重置实验' }
  ],
  onChange: (key, value) => {
    state[key] = value;
    if (key === 'bloom') bloomEnabled = Boolean(value);
    if (key === 'autoOrbit') controls.autoRotate = Boolean(value);
    if (key === 'showCaption' || key === 'showDate') records.forEach((r) => r.card?.setVisibility(state.showCaption, state.showDate));
    if (key === 'cardScale') records.forEach((r) => { r.scale = Number(value); });
    if (key?.startsWith('radius')) {
      orbitRings.forEach((ring, i) => {
        const r = state[`radius${i + 1}`];
        ring.scale.set(r, 1, r);
      });
    }
    ui.setStatus(`${records.length} / ${MAX_PHOTOS} photos · local only`, 'warm');
  },
  onAction: (action) => {
    if (action === 'focus') {
      if (records[0]) focusPhoto(records[0].id);
    } else if (action === 'exit') {
      closeFocus();
    } else if (action === 'pause') {
      paused = loop.toggle();
      ui.setStatus(paused ? 'PAUSED' : `${records.length} / ${MAX_PHOTOS} photos · local only`, paused ? '' : 'warm');
    } else if (action === 'reset') {
      resetAll();
    }
  }
});

// Canvas, renderer and scene.
const canvas = document.querySelector('#lab-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.84;
renderer.info.autoReset = false;
renderer.setClearColor('#05070e', 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#05070e');
scene.fog = new THREE.FogExp2('#05070e', 0.012);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.1, 16);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 7;
controls.maxDistance = 30;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.22;
controls.update();

const ambient = new THREE.AmbientLight('#536079', 0.9);
scene.add(ambient);
const key = new THREE.DirectionalLight('#ffe7d2', 1.25);
key.position.set(5, 9, 7);
scene.add(key);
const heartLight = new THREE.PointLight('#ff75a9', 6, 15, 2);
heartLight.position.set(0, 2.2, 0);
scene.add(heartLight);

let composer = null, bloomPass = null, renderPass = null, outputPass = null;
function buildComposer() {
  if (composer) { renderPass?.dispose?.(); bloomPass?.dispose?.(); outputPass?.dispose?.(); composer.dispose(); }
  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.36, 0.84);
  outputPass = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloomPass); composer.addPass(outputPass);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
}

const rng = mulberry32(54711);
const photoGroup = new THREE.Group();
scene.add(photoGroup);
const orbitRings = [];
const disposables = [];

function makeGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,.9)');
  gr.addColorStop(.16, 'rgba(255,190,210,.5)');
  gr.addColorStop(.52, 'rgba(255,117,169,.13)');
  gr.addColorStop(1, 'rgba(255,117,169,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// A central luminous heart, plus three orbit lines.
const centralGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow(), color: '#ff9abd', transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
centralGlow.scale.set(4.2, 3.4, 1);
centralGlow.position.set(0, 2.3, -1.2);
centralGlow.renderOrder = -2;
scene.add(centralGlow);

const heartGeo = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.46);
  shape.bezierCurveTo(.05, -.24, .35, .08, .35, .3);
  shape.bezierCurveTo(.35, .58, .04, .64, 0, .34);
  shape.bezierCurveTo(-.04, .64, -.35, .58, -.35, .3);
  shape.bezierCurveTo(-.35, .08, -.05, -.24, 0, -.46);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: true, bevelSize: .035, bevelThickness: .03, bevelSegments: 3, curveSegments: 14 });
  geo.center(); geo.scale(.55, .55, .55);
  return geo;
})();
const heartMesh = new THREE.Mesh(heartGeo, new THREE.MeshPhysicalMaterial({
  color: '#ff8eb2', emissive: '#ff5b91', emissiveIntensity: .6, metalness: .25, roughness: .16,
  transparent: true, opacity: .86, transmission: .2, thickness: .9, clearcoat: 1, clearcoatRoughness: .08
}));
heartMesh.position.set(0, 2.5, 0.1);
scene.add(heartMesh);

for (let i = 0; i < 3; i++) {
  const geo = new THREE.TorusGeometry(1, 0.007, 4, 160);
  const mat = new THREE.MeshBasicMaterial({ color: ['#ffd58a', '#ff75a9', '#b68aff'][i], transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.1 + i * .16;
  ring.scale.set(state[`radius${i + 1}`], 1, state[`radius${i + 1}`]);
  scene.add(ring);
  orbitRings.push(ring);
}

// Stars.
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(1200 * 3);
for (let i = 0; i < 1200; i++) {
  const r = 18 + rng() * 30, a = rng() * Math.PI * 2, p = Math.acos(2 * rng() - 1);
  starPos[i * 3] = s0(p, a) * r; starPos[i * 3 + 1] = Math.cos(p) * r * .65; starPos[i * 3 + 2] = s1(p, a) * r;
}
function s0(p, a) { return Math.sin(p) * Math.cos(a); }
function s1(p, a) { return Math.sin(p) * Math.sin(a); }
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: '#bfc9ff', size: .045, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
scene.add(new THREE.Points(starGeo, starMat));

// --------------------------------------------------------------------------
// Photo cards
// --------------------------------------------------------------------------
function makeCaptionTexture(caption, date, showCaption, showDate) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 180;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 180);
  if (showCaption) {
    g.fillStyle = '#1e2026';
    g.font = 'italic 33px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(caption || '我们的新回忆', 256, 60, 440);
  }
  if (showDate) {
    g.fillStyle = '#876f57';
    g.font = '17px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillText(date || '', 256, 98, 440);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function placeholderData(index) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 760;
  const g = c.getContext('2d');
  const palettes = [
    ['#101e2c', '#2d5a6c', '#efb2a3'], ['#291523', '#8f4b5d', '#ffd58a'], ['#111a20', '#a58c69', '#f5dfc3'],
    ['#241b32', '#735985', '#f2d9e2'], ['#162220', '#3b7c75', '#ffe2aa'], ['#25181a', '#a15c52', '#ffd2a0']
  ][index % 6];
  const grad = g.createLinearGradient(0, 0, 0, 760);
  grad.addColorStop(0, palettes[0]); grad.addColorStop(.58, palettes[1]); grad.addColorStop(1, '#06080c');
  g.fillStyle = grad; g.fillRect(0, 0, 640, 760);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${.08 + rng() * .35})`;
    g.beginPath(); g.arc(rng() * 640, rng() * 560, rng() * 1.5 + .3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = .2; g.fillStyle = palettes[2];
  g.beginPath(); g.ellipse(330, 430, 250, 120, .2, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,213,138,.55)'; g.lineWidth = 1;
  g.strokeRect(54, 54, 532, 652);
  g.fillStyle = 'rgba(255,245,238,.82)'; g.font = '22px Georgia, serif'; g.textAlign = 'center';
  g.fillText('OUR LITTLE MEMORY', 320, 606);
  g.fillStyle = 'rgba(255,213,138,.6)'; g.font = '13px "Segoe UI", sans-serif';
  g.fillText(`NO. ${String(index + 1).padStart(2, '0')} · LOCAL PLACEHOLDER`, 320, 638);
  return c.toDataURL('image/jpeg', .9);
}

function makeMatteTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 340;
  const g = c.getContext('2d');
  g.fillStyle = '#e8d9c8'; g.fillRect(0, 0, 256, 340);
  g.strokeStyle = '#FFF5EE'; g.lineWidth = 16; g.strokeRect(8, 8, 240, 324);
  g.strokeStyle = 'rgba(255,213,138,.6)'; g.lineWidth = 2; g.strokeRect(18, 18, 220, 304);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

const loader = new THREE.TextureLoader();
function loadTexture(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      resolve(tex);
    }, undefined, reject);
  });
}

class PhotoCard {
  constructor(record) {
    this.record = record;
    this.group = new THREE.Group();
    this.group.userData.photoId = record.id;
    this.group.scale.setScalar(record.scale || state.cardScale);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.7, .04),
      new THREE.MeshStandardMaterial({ color: '#FFD58A', roughness: .46, metalness: .3 })
    );
    board.userData.photoId = record.id;
    this.group.add(board);
    const matte = new THREE.Mesh(
      new THREE.PlaneGeometry(1.19, 1.59),
      new THREE.MeshBasicMaterial({ map: makeMatteTexture(), color: '#ffffff' })
    );
    matte.position.z = .023;
    this.group.add(matte);
    this.image = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 1.02),
      new THREE.MeshBasicMaterial({ map: record.texture, transparent: true, opacity: 1 })
    );
    this.image.position.set(0, .18, .027);
    this.image.userData.photoId = record.id;
    this.pickMeshes = [this.image];
    this.group.add(this.image);
    this.caption = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, .39),
      new THREE.MeshBasicMaterial({ map: makeCaptionTexture(record.caption, record.date, state.showCaption, state.showDate), transparent: true, depthWrite: false, opacity: 1 })
    );
    this.caption.position.set(0, -.64, .028);
    this.group.add(this.caption);
    this.materials = [board.material, matte.material, this.image.material, this.caption.material];
    this.materials.forEach((m) => { m.transparent = true; m.opacity = 1; });
    photoGroup.add(this.group);
  }

  setTexture(texture) {
    this.image.material.map?.dispose();
    this.image.material.map = texture;
    this.image.material.needsUpdate = true;
  }
  setMeta(caption, date) {
    this.caption.material.map?.dispose();
    this.caption.material.map = makeCaptionTexture(caption, date, state.showCaption, state.showDate);
    this.caption.material.needsUpdate = true;
    this.caption.visible = state.showCaption || state.showDate;
  }
  setVisibility(captionOn, dateOn) {
    this.caption.visible = captionOn || dateOn;
    if (this.caption.visible) {
      this.caption.material.map?.dispose();
      this.caption.material.map = makeCaptionTexture(this.record.caption, this.record.date, captionOn, dateOn);
      this.caption.material.needsUpdate = true;
    }
  }
  setDimmed(dimmed) {
    this.materials.forEach((m) => { m.opacity = dimmed ? .12 : 1; });
    this.group.scale.setScalar((this.record.scale || state.cardScale) * (dimmed ? .86 : 1));
  }
  setFocus(focused) {
    this.group.scale.setScalar((this.record.scale || state.cardScale) * (focused ? 2.05 : 1));
    this.materials.forEach((m) => { m.opacity = focused ? 1 : (focusedId ? .12 : 1); });
  }
  dispose() {
    this.group.traverse((child) => { child.geometry?.dispose?.(); });
    this.materials.forEach((m) => { m.map?.dispose?.(); m.dispose(); });
    photoGroup.remove(this.group);
  }
}

function id() { return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

async function addRecord({ url, fileName, caption, date, texture = null, isDefault = false, objectUrl = null, file = null }) {
  const tex = texture || await loadTexture(url);
  const record = {
    id: id(),
    texture: tex,
    displayUrl: url,
    fileName,
    caption,
    date,
    isDefault,
    objectUrl,
    file,
    track: 0,
    slot: 0,
    height: 2,
    card: null,
    scale: state.cardScale
  };
  record.track = records.length % 3;
  record.card = new PhotoCard(record);
  records.push(record);
  layoutTracks();
  return record;
}

function layoutTracks() {
  for (let t = 0; t < 3; t++) {
    const list = records.filter((r) => r.track === t);
    const n = list.length;
    list.forEach((r, i) => {
      r.slot = i;
      r.baseAngle = (i / Math.max(1, n)) * Math.PI * 2 + t * 0.7;
      const heightPattern = [
        [1.6, 2.3, 3.0, 2.0, 2.7, 1.4, 2.5, 3.2],
        [2.6, 1.8, 2.2, 3.1, 1.5, 2.8, 2.0, 2.4],
        [2.0, 3.0, 2.4, 1.7, 2.9, 2.2, 1.5, 2.7]
      ];
      r.height = heightPattern[t][i % heightPattern[t].length];
      r.angle = r.baseAngle;
    });
  }
}

function assignTracks() {
  records.forEach((r, i) => { r.track = i % 3; r.scale = state.cardScale; });
  layoutTracks();
}

function renderPhotoList() {
  const list = document.querySelector('#photo-list');
  const count = document.querySelector('#photo-count');
  if (count) count.textContent = `${records.length} / ${MAX_PHOTOS}`;
  if (!list) return;
  list.replaceChildren();
  records.forEach((record, index) => {
    const row = document.createElement('div');
    row.className = 'photo-row';
    row.dataset.id = record.id;
    const thumb = document.createElement('img');
    thumb.src = record.displayUrl; thumb.alt = record.caption;
    const main = document.createElement('div');
    main.className = 'photo-row-main';
    const cap = document.createElement('input');
    cap.type = 'text'; cap.maxLength = 32; cap.value = record.caption; cap.placeholder = '照片文字';
    cap.addEventListener('input', () => { record.caption = cap.value; record.card?.setMeta(record.caption, record.date); });
    const date = document.createElement('input');
    date.type = 'date'; date.value = record.date;
    date.addEventListener('change', () => { record.date = date.value; record.card?.setMeta(record.caption, record.date); });
    const actions = document.createElement('div');
    actions.className = 'photo-row-actions';
    const mk = (label, title, fn) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title; b.addEventListener('click', fn); return b;
    };
    const up = mk('↑', '向前', () => { if (index === 0) return; [records[index - 1], records[index]] = [records[index], records[index - 1]]; assignTracks(); renderPhotoList(); });
    up.disabled = index === 0;
    const down = mk('↓', '向后', () => { if (index === records.length - 1) return; [records[index + 1], records[index]] = [records[index], records[index + 1]]; assignTracks(); renderPhotoList(); });
    down.disabled = index === records.length - 1;
    const replace = mk('↺', '替换', () => {
      const picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'image/jpeg,image/png,image/webp';
      picker.addEventListener('change', () => { if (picker.files?.[0]) replacePhoto(record.id, picker.files[0]); });
      row.append(picker); picker.click();
    });
    const del = mk('×', '删除', () => removePhoto(record.id));
    actions.append(up, down, replace, del);
    main.append(cap, date, actions);
    row.append(thumb, main);
    list.append(row);
  });
  if (records.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'photo-empty';
    empty.textContent = '还没有照片。上传一张属于你们的照片吧。';
    list.append(empty);
  }
}

// Add a photo manager section to the shared panel.
const photoSection = document.createElement('section');
photoSection.className = 'lab-section';
photoSection.innerHTML = `<div class="lab-section-title"><span>03</span><b>照片记忆 / 本地</b></div>
  <div class="photo-upload-zone" id="photo-upload-zone">点击上传照片 · JPG / PNG / WEBP · 最多 24 张</div>
  <input id="photo-upload-input" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
  <div class="photo-count"><span>OUR MEMORIES</span><b id="photo-count">0 / 24</b></div>
  <div class="photo-list" id="photo-list"></div>
  <div class="photo-db">
    <button id="photo-db-save" type="button">保存到 IndexedDB（实验）</button>
    <button id="photo-db-load" type="button">读取 IndexedDB</button>
  </div>`;
ui.appendCustom(photoSection);
const uploadInput = photoSection.querySelector('#photo-upload-input');
photoSection.querySelector('#photo-upload-zone').addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', () => { if (uploadInput.files?.length) addFiles([...uploadInput.files]); uploadInput.value = ''; });
photoSection.querySelector('#photo-db-save').addEventListener('click', () => saveDb().catch((e) => ui.setStatus(`IDB ERROR: ${e.message}`, 'pink')));
photoSection.querySelector('#photo-db-load').addEventListener('click', () => loadDb().catch((e) => ui.setStatus(`IDB ERROR: ${e.message}`, 'pink')));

async function addFiles(files) {
  const accepted = files.filter((f) => f.type.startsWith('image/'));
  if (!accepted.length) { ui.setStatus('请选择图片文件', 'pink'); return; }
  const remaining = MAX_PHOTOS - records.length;
  if (remaining <= 0) { ui.setStatus('最多 24 张照片', 'pink'); return; }
  const batch = accepted.slice(0, remaining);
  for (const file of batch) {
    const url = URL.createObjectURL(file);
    try {
      await addRecord({
        url, fileName: file.name, caption: file.name.replace(/\.[^.]+$/, '') || '我们的新回忆',
        date: new Date().toISOString().slice(0, 10), objectUrl: url, file
      });
    } catch {
      URL.revokeObjectURL(url);
      ui.setStatus(`${file.name} 读取失败`, 'pink');
    }
  }
  assignTracks();
  renderPhotoList();
  ui.setStatus(`已加入 ${batch.length} 张照片 · 只在本地`, 'ok');
}

async function replacePhoto(recordId, file) {
  const record = records.find((r) => r.id === recordId);
  if (!record || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  try {
    const tex = await loadTexture(url);
    record.texture.dispose();
    if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    record.texture = tex;
    record.displayUrl = url;
    record.objectUrl = url;
    record.fileName = file.name;
    record.file = file;
    record.card.setTexture(tex);
    renderPhotoList();
    ui.setStatus(`已替换一张照片 · ${file.name}`, 'ok');
  } catch {
    URL.revokeObjectURL(url);
    ui.setStatus('照片替换失败', 'pink');
  }
}

function removePhoto(recordId) {
  if (focusedId === recordId) closeFocus(true);
  const index = records.findIndex((r) => r.id === recordId);
  if (index < 0) return;
  const [record] = records.splice(index, 1);
  record.card.dispose();
  record.texture.dispose();
  if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
  assignTracks();
  renderPhotoList();
  ui.setStatus('照片已从记忆中收起', 'warm');
}

// Focus / camera transition.
function focusPhoto(recordId) {
  const record = records.find((r) => r.id === recordId);
  if (!record) return;
  if (focusedId) closeFocus(true);
  focusedId = recordId;
  savedCamera = camera.position.clone();
  savedTarget = controls.target.clone();
  controls.enabled = false;
  const pos = new THREE.Vector3();
  record.card.group.getWorldPosition(pos);
  const dir = new THREE.Vector3().subVectors(camera.position, pos).normalize();
  const toPos = pos.clone().addScaledVector(dir, 4.6).add(new THREE.Vector3(0, .18, 0));
  const toTarget = pos.clone();
  cameraTween = { fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget, elapsed: 0, duration: 1.35 };
  records.forEach((r) => r.card.setDimmed(r.id !== recordId));
  record.card.setFocus(true);
  orbitRings.forEach((ring) => { ring.visible = false; });
  const detail = document.querySelector('#photo-detail');
  detail.querySelector('[data-detail-caption]').textContent = record.caption || '我们的回忆';
  detail.querySelector('[data-detail-date]').textContent = record.date || '';
  detail.classList.add('is-open');
  detail.setAttribute('aria-hidden', 'false');
  ui.setStatus('FOCUS · click return to orbit', 'warm');
}
function closeFocus(instant = false) {
  if (!focusedId) return;
  const record = records.find((r) => r.id === focusedId);
  if (record) record.card.setFocus(false);
  focusedId = null;
  document.querySelector('#photo-detail')?.classList.remove('is-open');
  document.querySelector('#photo-detail')?.setAttribute('aria-hidden', 'true');
  if (instant) {
    if (savedCamera) camera.position.copy(savedCamera);
    if (savedTarget) controls.target.copy(savedTarget);
    controls.enabled = true; controls.update(); cameraTween = null;
  } else if (savedCamera && savedTarget) {
    cameraTween = { fromPos: camera.position.clone(), toPos: savedCamera.clone(), fromTarget: controls.target.clone(), toTarget: savedTarget.clone(), elapsed: 0, duration: 1.15 };
    savedCamera = null; savedTarget = null;
  }
  records.forEach((r) => r.card?.setDimmed(false));
  orbitRings.forEach((ring) => { ring.visible = true; });
  ui.setStatus(`${records.length} / ${MAX_PHOTOS} photos · local only`, 'warm');
}
document.querySelector('#photo-detail-close').addEventListener('click', () => closeFocus());

// IndexedDB (lab-only validation; not copied into the formal project).
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('f2-photo-memory', 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
  });
}
async function saveDb() {
  const uploaded = records.filter((r) => r.file);
  if (!uploaded.length) { ui.setStatus('没有可保存的上传照片（示例照片不写入）', 'pink'); return; }
  const db = await openDb();
  const tx = db.transaction('photos', 'readwrite');
  const store = tx.objectStore('photos');
  uploaded.forEach((r) => store.put({ id: r.id, name: r.fileName, caption: r.caption, date: r.date, blob: r.file }));
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
  ui.setStatus(`已把 ${uploaded.length} 张上传照片写入 IndexedDB`, 'ok');
}
async function loadDb() {
  const db = await openDb();
  const tx = db.transaction('photos', 'readonly');
  const items = await new Promise((res, rej) => { const req = tx.objectStore('photos').getAll(); req.onsuccess = () => res(req.result || []); req.onerror = () => rej(req.error); });
  db.close();
  const remaining = MAX_PHOTOS - records.length;
  if (remaining <= 0) { ui.setStatus('照片已满 24 张', 'pink'); return; }
  let added = 0;
  for (const item of items.slice(0, remaining)) {
    const file = item.blob instanceof File ? item.blob : new File([item.blob], item.name, { type: item.blob.type || 'image/jpeg' });
    const url = URL.createObjectURL(file);
    try {
      const r = await addRecord({ url, fileName: item.name, caption: item.caption, date: item.date, objectUrl: url, file });
      r.isDefault = false; added++;
    } catch { URL.revokeObjectURL(url); }
  }
  assignTracks();
  renderPhotoList();
  ui.setStatus(added ? `从 IndexedDB 读回 ${added} 张照片` : 'IndexedDB 没有可读照片', added ? 'ok' : 'pink');
}

// Initial placeholders.
async function createDefaults() {
  for (let i = 0; i < 12; i++) {
    const idx = i;
    await addRecord({
      url: placeholderData(i),
      fileName: `memory-${String(i + 1).padStart(2, '0')}.jpg`,
      caption: ['第一次见面', '一起看的雪', '最喜欢的一张', '想重复的瞬间', '冬天很温柔', '一起去过的地方', '未来的 1314', '圣诞快乐', '你的侧脸', '路灯下的我们', '留白的以后', '这一年的我们'][i],
      date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 26) + 1).padStart(2, '0')}`,
      isDefault: true
    });
  }
  assignTracks();
  renderPhotoList();
  ui.setStatus('12 / 24 photos · 示例照片只在本次实验', 'warm');
}

// Orbit update.
const tempQ = new THREE.Quaternion();
function updateOrbits(dt) {
  if (!focusedId && !paused) {
    orbitTimes[0] += dt * state.speed1;
    orbitTimes[1] += dt * state.speed2;
    orbitTimes[2] += dt * state.speed3;
  }
  const radii = [state.radius1, state.radius2, state.radius3];
  for (const record of records) {
    const t = record.track;
    const angle = record.baseAngle + orbitTimes[t];
    const radius = radii[t];
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    record.card.group.position.set(x, record.height, z);
    record.card.group.quaternion.copy(tempQ.copy(camera.quaternion));
    record.card.group.scale.setScalar((record.scale || state.cardScale) * (focusedId === record.id ? 2.05 : 1));
  }
  for (let i = 0; i < 3; i++) {
    orbitRings[i].scale.set(radii[i], 1, radii[i]);
  }
}

function updateTween(dt) {
  if (!cameraTween) return;
  cameraTween.elapsed += dt;
  const t = smoothstep(clamp(cameraTween.elapsed / cameraTween.duration, 0, 1));
  camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, t);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, t);
  controls.update();
  if (t >= 1) {
    const closing = !focusedId;
    cameraTween = null;
    if (closing) { controls.enabled = true; savedCamera = null; savedTarget = null; }
  }
}

function animate(dt, elapsed) {
  updateTween(dt);
  updateOrbits(dt);
  heartMesh.rotation.y = Math.sin(elapsed * .45) * .18;
  heartMesh.position.y = 2.5 + Math.sin(elapsed * .9) * .04;
  centralGlow.material.opacity = .28 + Math.sin(elapsed * .7) * .04;
  controls.autoRotate = state.autoOrbit && !focusedId;
  controls.update();
  renderer.info.reset();
  if (bloomEnabled && composer) composer.render(); else renderer.render(scene, camera);
}

const loop = new LabLoop({
  onFrame: animate,
  onFps: (fps) => {
    ui.setStats(fps, renderer.info.render.calls, records.length * 4 + 1200);
    if (!paused && !focusedId) ui.setStatus(`${records.length} / ${MAX_PHOTOS} photos · local only`, 'warm');
  }
});

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); composer.setSize(window.innerWidth, window.innerHeight); }
}
window.addEventListener('resize', resize);

// Click / hover raycast.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = 0, downX = 0, downY = 0;
canvas.addEventListener('pointerdown', (e) => { downAt = performance.now(); downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointerup', (e) => {
  if (performance.now() - downAt > 450 || Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const picks = records.flatMap((r) => r.card.pickMeshes);
  const hit = raycaster.intersectObjects(picks, false)[0];
  if (hit?.object?.userData?.photoId) focusPhoto(hit.object.userData.photoId);
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && focusedId) closeFocus(); });

function resetAll() {
  closeFocus(true);
  records.splice(0).forEach((r) => { r.card.dispose(); r.texture.dispose(); if (r.objectUrl) URL.revokeObjectURL(r.objectUrl); });
  Object.assign(state, DEFAULTS);
  orbitTimes = [0, 0, 0];
  bloomEnabled = DEFAULTS.bloom;
  for (const key of Object.keys(DEFAULTS)) ui.setValue(key, state[key]);
  controls.autoRotate = true;
  buildComposer();
  createDefaults();
  camera.position.set(0, 2.1, 16); controls.target.set(0, 2.1, 0); controls.enabled = true;
  ui.setStatus('RESET · 12 local memories', 'warm');
}

// Start.
buildComposer();
resize();
loop.start();
createDefaults();
document.querySelector('#photo-detail-close').addEventListener('click', () => closeFocus());
ui.setStatus('LOADING LOCAL MEMORIES…', 'warm');

window.__LAB__ = {
  number: '04',
  ui, state, scene, camera, renderer, controls, records,
  getStats: () => ({ fps: loop.fps, calls: renderer.info.render.calls, photos: records.length, focused: focusedId }),
  addFiles: (files) => addFiles(files),
  focus: (id) => focusPhoto(id),
  close: () => closeFocus(),
  remove: (id) => removePhoto(id),
  reset: resetAll,
  pause: () => { paused = loop.toggle(); return paused; },
  saveDb, loadDb,
  dispose: () => {
    loop.dispose(); controls.dispose();
    records.forEach((r) => { r.card.dispose(); r.texture.dispose(); if (r.objectUrl) URL.revokeObjectURL(r.objectUrl); });
    starGeo.dispose(); starMat.dispose();
    heartGeo.dispose(); heartMesh.material.dispose();
    centralGlow.material.map?.dispose(); centralGlow.material.dispose();
    orbitRings.forEach((r) => { r.geometry.dispose(); r.material.dispose(); });
    composer?.dispose(); renderer.dispose();
  }
};
window.addEventListener('beforeunload', () => window.__LAB__?.dispose());
