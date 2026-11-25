import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontJson from '../assets/fonts/droid_serif_regular.typeface.json';
import {
  clamp,
  damp,
  easeOutCubic,
  isAsciiText,
  makeCanvas,
  makeRadialTexture,
  mulberry32
} from '../core/utils';

type LabelKey = 'a' | 'b';

interface LabelStyle {
  color: number;
  emissive: number;
  glow: string;
  particlePrimary: string;
  particleSecondary: string;
  size: number;
  depth: number;
  sparkleCount: number;
  yRatio: number;
  zRatio: number;
}

const STYLES: Record<LabelKey, LabelStyle> = {
  a: {
    color: 0xf2c468,
    emissive: 0x83561b,
    glow: 'rgba(255, 212, 130, 0.42)',
    particlePrimary: '#FFD580',
    particleSecondary: '#FFF0C9',
    size: 0.78,
    depth: 0.16,
    sparkleCount: 200,
    yRatio: 0.665,
    zRatio: 0.84
  },
  b: {
    color: 0xe6ad9f,
    emissive: 0x6f3b33,
    glow: 'rgba(255, 188, 173, 0.36)',
    particlePrimary: '#E7A39C',
    particleSecondary: '#FFE0C8',
    size: 0.66,
    depth: 0.14,
    sparkleCount: 150,
    yRatio: 0.36,
    zRatio: 1.02
  }
};

const SPARKLE_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float flicker = 0.35 + 0.65 * sin(uTime * 1.25 + aPhase);
    float orbit = sin(uTime * 0.22 + aPhase * 0.7) * 0.12;
    vec3 animated = position;
    animated.x += orbit * (0.4 + abs(position.z));
    animated.y += sin(uTime * 0.48 + aPhase) * 0.045;
    vec4 mv = modelViewMatrix * vec4(animated, 1.0);
    gl_PointSize = clamp(aSize * (0.6 + flicker * 1.4) * uPixelRatio * (200.0 / max(1.0, -mv.z)), 0.0, 17.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = uOpacity * (0.18 + flicker * 0.82);
  }
`;

const SPARKLE_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.2, d);
    float halo = 1.0 - smoothstep(0.15, 1.0, d);
    vec3 color = vColor * (halo * 0.5 + core * 1.35);
    float alpha = (halo * 0.28 + core * 0.85) * vAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface LabelRuntime {
  key: LabelKey;
  style: LabelStyle;
  root: THREE.Group;
  content: THREE.Group;
  sparkles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
  glow: THREE.Sprite;
  materials: THREE.Material[];
  value: string;
  width: number;
  reveal: number;
  baseY: number;
  baseZ: number;
  phase: number;
}

export class RomanticText {
  readonly group = new THREE.Group();
  private readonly font: Font;
  private readonly labels: Record<LabelKey, LabelRuntime>;
  private height = 8;
  private crown = 2.5;

  constructor(text520: string, text1314: string, height: number, crown: number) {
    this.group.name = 'romantic-number-labels';
    this.font = new Font(fontJson as unknown as ConstructorParameters<typeof Font>[0]);
    this.labels = {
      a: this.createLabel('a', text520),
      b: this.createLabel('b', text1314)
    };
    this.group.add(this.labels.a.root, this.labels.b.root);
    this.setLayout(height, crown);
  }

  private createLabel(key: LabelKey, value: string): LabelRuntime {
    const style = STYLES[key];
    const root = new THREE.Group();
    root.name = `romantic-label-${key}`;
    const content = new THREE.Group();
    root.add(content);

    const glowTexture = makeRadialTexture(style.glow, 'rgba(255,255,255,0)', 256);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(style.color),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.position.z = -0.14;
    root.add(glow);

    const label: LabelRuntime = {
      key,
      style,
      root,
      content,
      sparkles: null,
      glow,
      materials: [],
      value,
      width: 1,
      reveal: 1,
      baseY: this.height * style.yRatio,
      baseZ: this.crown * style.zRatio,
      phase: key === 'a' ? 0.4 : 2.1
    };
    this.rebuildLabelContent(label);
    return label;
  }

  private disposeLabelMaterials(label: LabelRuntime): void {
    label.content.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if ('map' in material && material.map instanceof THREE.Texture) {
            material.map.dispose();
          }
          material.dispose();
        }
      }
    });
    label.materials = [];
  }

  private rebuildLabelContent(label: LabelRuntime): void {
    this.disposeLabelMaterials(label);
    for (const child of [...label.content.children]) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      label.content.remove(child);
    }
    if (label.sparkles) {
      label.root.remove(label.sparkles);
      label.sparkles.geometry.dispose();
      label.sparkles.material.dispose();
      label.sparkles = null;
    }

    let textObject: THREE.Object3D;
    try {
      textObject = this.createExtrudedText(label.value, label.style, label.key);
    } catch {
      textObject = this.createCanvasText(label.value, label.style, label.key);
    }
    label.content.add(textObject);
    label.content.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        label.materials.push(...materials);
      }
    });
    const bbox = new THREE.Box3().setFromObject(textObject);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    label.width = Math.max(0.5, size.x);

    const glowScaleX = Math.max(1.8, label.width * 1.55);
    const glowScaleY = Math.max(1.2, label.width * 0.82);
    label.glow.scale.set(glowScaleX, glowScaleY, 1);

    const sparkles = this.createSparkles(label.style, label.width, label.key);
    label.sparkles = sparkles;
    label.root.add(sparkles);
    sparkles.material.uniforms.uOpacity.value = label.reveal;
    this.applyReveal(label, label.reveal);
  }

  private createExtrudedText(value: string, style: LabelStyle, key: LabelKey): THREE.Object3D {
    const glyphs = (this.font as unknown as { data?: { glyphs?: Record<string, unknown> } }).data?.glyphs;
    const supported =
      isAsciiText(value) &&
      Array.from(value).every((character) => character === ' ' || glyphs?.[character] !== undefined);
    if (!supported) {
      return this.createCanvasText(value, style, key);
    }

    const geometry = new TextGeometry(value, {
      font: this.font,
      size: style.size,
      height: style.depth,
      curveSegments: 9,
      bevelEnabled: true,
      bevelThickness: 0.017,
      bevelSize: 0.012,
      bevelOffset: 0,
      bevelSegments: 3
    });
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox?.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.color),
      metalness: 0.88,
      roughness: 0.26,
      emissive: new THREE.Color(style.emissive),
      emissiveIntensity: 0.42,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.renderOrder = 2;
    return mesh;
  }

  private createCanvasText(value: string, style: LabelStyle, key: LabelKey): THREE.Object3D {
    const canvasFont =
      '"Songti SC", "STSong", "Noto Serif SC", "SimSun", Georgia, serif';
    const measureCanvas = makeCanvas(8, 8);
    const measureCtx = measureCanvas.getContext('2d')!;
    measureCtx.font = `500 150px ${canvasFont}`;
    const textWidth = Math.max(220, Math.ceil(measureCtx.measureText(value).width));
    const width = Math.min(1300, textWidth + 170);
    const height = 300;
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 150px ${canvasFont}`;
    const gradient = ctx.createLinearGradient(0, 30, 0, height - 30);
    gradient.addColorStop(0, key === 'a' ? '#fff2cd' : '#ffe7df');
    gradient.addColorStop(0.56, key === 'a' ? '#e8bd70' : '#dba08f');
    gradient.addColorStop(1, key === 'a' ? '#a8793d' : '#9d6559');
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = gradient;
    ctx.fillText(value, width / 2, height / 2 + 3);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide
    });
    const planeHeight = style.size * 0.84;
    const planeWidth = planeHeight * (width / height);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeWidth, planeHeight), material);
    mesh.renderOrder = 2;
    return mesh;
  }

  private createSparkles(
    style: LabelStyle,
    width: number,
    key: LabelKey
  ): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
    const count = style.sparkleCount;
    const rng = mulberry32(style.sparkleCount * 991 + (key === 'a' ? 5 : 14));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    const primary = new THREE.Color(style.particlePrimary);
    const secondary = new THREE.Color(style.particleSecondary);
    const gold = new THREE.Color('#FFD36A');

    for (let i = 0; i < count; i += 1) {
      const spread = width * (0.48 + rng() * 0.36) + 0.15;
      const angle = rng() * Math.PI * 2;
      const radial = Math.pow(rng(), 0.6);
      positions[i * 3] = Math.cos(angle) * spread * radial;
      positions[i * 3 + 1] = (rng() - 0.5) * 0.82;
      positions[i * 3 + 2] = (rng() - 0.3) * 0.65;
      const pick = rng();
      const color = pick > 0.85 ? gold : primary.clone().lerp(secondary, rng() * 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      phases[i] = rng() * Math.PI * 2;
      sizes[i] = 0.45 + rng() * 1.15;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uOpacity: { value: 1 }
      },
      vertexShader: SPARKLE_VERTEX,
      fragmentShader: SPARKLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true
    });
    const points = new THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 3;
    return points;
  }

  setText(a: string, b: string): void {
    for (const key of ['a', 'b'] as LabelKey[]) {
      const label = this.labels[key];
      const next = key === 'a' ? a : b;
      if (label.value !== next) {
        label.value = next.trim().length > 0 ? next.slice(0, 6) : key === 'a' ? '520' : '1314';
        this.rebuildLabelContent(label);
      }
    }
  }

  setLayout(height: number, crown: number): void {
    this.height = height;
    this.crown = crown;
    for (const key of ['a', 'b'] as LabelKey[]) {
      const label = this.labels[key];
      label.baseY = height * label.style.yRatio;
      label.baseZ = crown * label.style.zRatio;
      label.root.position.set(0, label.baseY, label.baseZ);
    }
  }

  update(dt: number, time: number, camera: THREE.Camera): void {
    for (const key of ['a', 'b'] as LabelKey[]) {
      const label = this.labels[key];
      const bob = Math.sin(time * 0.55 + label.phase) * 0.052;
      label.root.position.y = label.baseY + bob;
      label.root.position.z = label.baseZ;

      const targetYaw = Math.atan2(
        camera.position.x - label.root.position.x,
        camera.position.z - label.root.position.z
      );
      label.root.rotation.y = damp(label.root.rotation.y, targetYaw, 3.4, dt);

      const pulse = 0.5 + Math.sin(time * 1.1 + label.phase) * 0.12;
      label.glow.material.opacity = (0.32 + pulse * 0.25) * label.reveal;
      const glowPulse = 1 + Math.sin(time * 0.9 + label.phase) * 0.04;
      label.glow.scale.set(
        Math.max(1.8, label.width * 1.55),
        Math.max(1.2, label.width * 0.82) * glowPulse,
        1
      );
      for (const material of label.materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissiveIntensity = 0.28 + pulse * 0.32;
        }
      }
      if (label.sparkles) {
        label.sparkles.material.uniforms.uTime.value = time;
        label.sparkles.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
      }
    }
  }

  setReveal(key: LabelKey, progress: number): void {
    const label = this.labels[key];
    label.reveal = clamp(progress, 0, 1);
    this.applyReveal(label, label.reveal);
  }

  private applyReveal(label: LabelRuntime, progress: number): void {
    const eased = easeOutCubic(clamp(progress, 0, 1));
    label.root.visible = progress > 0.002;
    label.content.scale.setScalar(0.78 + eased * 0.22);
    for (const material of label.materials) {
      material.transparent = true;
      material.opacity = eased;
      material.depthWrite = eased > 0.98;
    }
    label.glow.material.opacity = 0.3 * eased;
    if (label.sparkles) {
      label.sparkles.material.uniforms.uOpacity.value = eased;
    }
  }

  setAllReveal(progress: number): void {
    this.setReveal('a', progress);
    this.setReveal('b', progress);
  }

  getInteractiveMeshes(): THREE.Object3D[] {
    return [];
  }

  dispose(): void {
    for (const key of ['a', 'b'] as LabelKey[]) {
      const label = this.labels[key];
      label.content.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      this.disposeLabelMaterials(label);
      if (label.sparkles) {
        label.sparkles.geometry.dispose();
        label.sparkles.material.dispose();
      }
      if (label.glow.material.map) label.glow.material.map.dispose();
      label.glow.material.dispose();
    }
  }
}
