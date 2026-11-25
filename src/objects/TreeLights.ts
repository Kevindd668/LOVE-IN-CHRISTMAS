import * as THREE from 'three';
import { LIGHT_PALETTES, type LightMode } from '../config';
import { clamp, mulberry32 } from '../core/utils';

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aHeight;
  attribute float aSeed;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uBrightness;
  uniform float uReveal;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vFlicker;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float time = uTime * (0.5 + uSpeed * 0.75);
    float slow = sin(time * 1.15 + aPhase + aSeed * 0.3);
    float fast = sin(time * 3.4 + aPhase * 2.1 + aSeed);
    float flicker = clamp(0.48 + slow * 0.3 + fast * 0.2 + sin(time * 0.27 + aSeed * 6.0) * 0.1, 0.0, 1.0);
    float alive = step(aHeight, uReveal);
    float groupWave = 0.5 + 0.5 * sin(time * 0.52 - aHeight * 7.2);
    float finalSize = aSize * (0.62 + flicker * 0.55) * alive;

    gl_PointSize = clamp(finalSize * uPixelRatio * (390.0 / max(1.0, -mvPosition.z)), 0.0, 30.0);
    gl_Position = projectionMatrix * mvPosition;

    vColor = aColor * (0.64 + flicker * 0.64 + uBrightness * 0.2) * (0.84 + groupWave * 0.24);
    vAlpha = alive * (0.3 + flicker * 0.56) * (0.82 + groupWave * 0.24);
    vFlicker = flicker;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFlicker;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;

    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float inner = 1.0 - smoothstep(0.08, 0.46, d);
    float halo = 1.0 - smoothstep(0.2, 1.0, d);
    float cross = max(0.0, 1.0 - abs(p.x) * 12.0) * max(0.0, 1.0 - abs(p.y) * 2.2)
                + max(0.0, 1.0 - abs(p.y) * 12.0) * max(0.0, 1.0 - abs(p.x) * 2.2);

    vec3 color = vColor * (halo * 0.34 + inner * 0.92 + cross * 0.22);
    color += vColor * core * 0.42;
    color += vec3(1.0, 0.92, 0.8) * core * (0.12 + vFlicker * 0.08);
    float alpha = (halo * 0.23 + inner * 0.46 + core * 0.42 + cross * 0.08) * vAlpha;
    alpha = clamp(alpha, 0.0, 0.96);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface Bulb {
  colorIndex: number;
  phase: number;
  height: number;
}

export class TreeLights {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry | null = null;
  private points: THREE.Points | null = null;
  private bulbs: Bulb[] = [];
  private height = 8;
  private crown = 2.5;
  private foliageBottom = 1;
  private count = 220;
  private mode: LightMode = 'warm';
  private primary = '#FFD9A4';

  constructor(height: number, crownRadius: number, count: number, mode: LightMode, primary: string) {
    this.mode = mode;
    this.primary = primary;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1 },
        uBrightness: { value: 1.25 },
        uReveal: { value: 1 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      // The bulbs sit slightly proud of the needle envelope; disabling depth
      // testing keeps their color readable through the very dense F3 foliage
      // instead of letting the branch shell swallow half of the 360 lights.
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      toneMapped: true
    });
    this.configure(height, crownRadius, count, mode, primary);
  }

  configure(
    height: number,
    crownRadius: number,
    count: number,
    mode?: LightMode,
    primary?: string
  ): void {
    this.height = height;
    this.crown = crownRadius;
    this.foliageBottom = clamp(height * 0.122, 0.7, 1.2);
    this.count = clamp(Math.round(count), 40, 400);
    if (mode) this.mode = mode;
    if (primary) this.primary = primary;
    this.rebuild();
  }

  private rebuild(): void {
    if (this.points) {
      this.group.remove(this.points);
      this.geometry?.dispose();
      this.points = null;
      this.geometry = null;
    }

    const rng = mulberry32(5201314);
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const phases = new Float32Array(this.count);
    const heights = new Float32Array(this.count);
    const seeds = new Float32Array(this.count);
    this.bulbs = [];

    const top = this.height - 0.48;
    // Exact 45 / 25 / 15 / 15 distribution in the default warm mode. Shuffle
    // deterministically so colors mix around the spiral instead of forming
    // height bands, while the counts remain exact for acceptance.
    let weightedColors: number[] | null = null;
    if (this.mode === 'warm') {
      const gold = Math.round(this.count * 0.45);
      const pink = Math.round(this.count * 0.25);
      const ice = Math.round(this.count * 0.15);
      weightedColors = [
        ...Array.from({ length: gold }, () => 0),
        ...Array.from({ length: pink }, () => 1),
        ...Array.from({ length: ice }, () => 2),
        ...Array.from({ length: this.count - gold - pink - ice }, () => 3)
      ];
      for (let i = weightedColors.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [weightedColors[i], weightedColors[j]] = [weightedColors[j], weightedColors[i]];
      }
    }
    for (let i = 0; i < this.count; i += 1) {
      const t = i / Math.max(1, this.count - 1);
      const eased = Math.pow(t, 0.94);
      const y = this.foliageBottom + (top - this.foliageBottom) * eased;
      const heightRatio = clamp((y - this.foliageBottom) / Math.max(0.1, this.height - this.foliageBottom), 0, 1);
      const envelope = this.crown * Math.pow(1 - heightRatio, 0.76) * 0.97;
      const angle = t * Math.PI * 2 * 8 + 0.7 + Math.sin(t * Math.PI * 5) * 0.08;
      // Slightly proud of the needle envelope so the 360 bulbs remain visible
      // instead of disappearing inside the dense F3 foliage.
      const radius = Math.max(0.14, envelope * 1.035 + 0.055 + (rng() - 0.5) * 0.08);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const jitterY = (rng() - 0.5) * 0.055;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + jitterY;
      positions[i * 3 + 2] = z;

      const colorIndex = weightedColors?.[i] ?? this.pickColorIndex(rng);
      const palette = this.currentPalette();
      const color = palette[colorIndex % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.46 + rng() * 0.38;
      phases[i] = rng() * Math.PI * 2;
      heights[i] = t;
      seeds[i] = rng() * 10;
      this.bulbs.push({
        colorIndex,
        phase: phases[i],
        height: t
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.computeBoundingSphere();

    const points = new THREE.Points(geometry, this.material);
    points.frustumCulled = false;
    points.renderOrder = 8;
    this.points = points;
    this.geometry = geometry;
    this.group.add(points);
    this.setReveal(1);
  }

  private currentPalette(): THREE.Color[] {
    if (this.mode === 'warm') {
      // F3's hero distribution: 45% warm gold, 25% rose, 15% ice, 15% pearl.
      return [this.primary, '#FF75A9', '#9DE6FF', '#FFF5EE'].map(
        (hex) => new THREE.Color(hex)
      );
    }
    const colors = [...(LIGHT_PALETTES[this.mode] ?? LIGHT_PALETTES.warm)];
    colors[0] = this.primary;
    return colors.map((hex) => new THREE.Color(hex));
  }

  private pickColorIndex(rng: () => number): number {
    if (this.mode !== 'warm') {
      return Math.floor(rng() * 4);
    }
    const roll = rng();
    if (roll < 0.45) return 0;
    if (roll < 0.7) return 1;
    if (roll < 0.85) return 2;
    return 3;
  }

  updateColors(mode: LightMode, primary: string): void {
    if (this.mode === mode && this.primary === primary) return;
    this.mode = mode;
    this.primary = primary;
    if (!this.geometry) return;
    const palette = this.currentPalette();
    const colorAttribute = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const array = colorAttribute.array as Float32Array;
    for (let i = 0; i < this.bulbs.length; i += 1) {
      const bulb = this.bulbs[i];
      const color = palette[bulb.colorIndex % palette.length];
      array[i * 3] = color.r;
      array[i * 3 + 1] = color.g;
      array[i * 3 + 2] = color.b;
    }
    colorAttribute.needsUpdate = true;
  }

  setBrightness(value: number): void {
    this.material.uniforms.uBrightness.value = value;
  }

  setFlashSpeed(value: number): void {
    this.material.uniforms.uSpeed.value = value;
  }

  setReveal(progress: number): void {
    this.material.uniforms.uReveal.value = clamp(progress, 0, 1);
  }

  setEnabled(enabled: boolean): void {
    this.group.visible = enabled;
  }

  update(time: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  }

  get activeHeight(): number {
    return this.height;
  }

  get currentMode(): LightMode {
    return this.mode;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material.dispose();
  }
}
