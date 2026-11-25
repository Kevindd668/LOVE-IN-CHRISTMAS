import * as THREE from 'three';
import { clamp, makeCanvasTexture, mulberry32 } from '../core/utils';

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (185.0 / max(1.0, -mvPosition.z)), 0.0, 24.0);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    vAlpha = aAlpha;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.24, d);
    float halo = 1.0 - smoothstep(0.12, 1.0, d);
    float flare = max(0.0, 1.0 - abs(p.x) * 7.0) * max(0.0, 1.0 - abs(p.y) * 1.8)
                + max(0.0, 1.0 - abs(p.y) * 7.0) * max(0.0, 1.0 - abs(p.x) * 1.8);
    vec3 color = vColor * (halo * 0.52 + core * 1.4 + flare * 0.28);
    gl_FragColor = vec4(color, (halo * 0.25 + core * 0.68 + flare * 0.08) * vAlpha);
  }
`;

interface BurstOptions {
  count?: number;
  colors?: string[];
  speed?: number;
  spread?: number;
  upward?: number;
  gravity?: number;
  life?: number;
  size?: number;
}

interface ParticleState {
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  baseSize: number;
}

interface FloatingSymbol {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  elapsed: number;
  duration: number;
  baseY: number;
  drift: number;
}

interface Ripple {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  elapsed: number;
  duration: number;
}

export class MagicParticles {
  readonly group = new THREE.Group();
  private readonly maxCount = 1000;
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly states: ParticleState[] = [];
  private cursor = 0;
  private activeCount = 0;
  private readonly symbols: FloatingSymbol[] = [];
  private readonly ripples: Ripple[] = [];
  private readonly symbolTextures = new Map<string, THREE.CanvasTexture>();
  private readonly rng = mulberry32(251225);
  private readonly tempCameraDirection = new THREE.Vector3();

  constructor() {
    this.group.name = 'magic-particles';
    this.positions = new Float32Array(this.maxCount * 3);
    this.colors = new Float32Array(this.maxCount * 3);
    this.sizes = new Float32Array(this.maxCount);
    this.alphas = new Float32Array(this.maxCount);
    for (let i = 0; i < this.maxCount; i += 1) {
      this.states.push({
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        gravity: 0,
        drag: 1,
        baseSize: 1
      });
      this.positions[i * 3 + 1] = -100;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    this.points.visible = false;
    this.group.add(this.points);
  }

  burst(origin: THREE.Vector3, options: BurstOptions = {}): void {
    const {
      count = 44,
      colors = ['#FFD580', '#FF7D9F', '#FFEDC4'],
      speed = 1.2,
      spread = 0.9,
      upward = 0.5,
      gravity = -0.9,
      life = 1.5,
      size = 1
    } = options;
    const palette = colors.map((hex) => new THREE.Color(hex));
    for (let i = 0; i < count; i += 1) {
      const index = this.cursor;
      this.cursor = (this.cursor + 1) % this.maxCount;
      const state = this.states[index];
      const theta = this.rng() * Math.PI * 2;
      const phi = Math.acos(2 * this.rng() - 1);
      const velocity = speed * (0.35 + this.rng() * 0.9);
      const horizontal = Math.sin(phi);
      const direction = new THREE.Vector3(
        Math.cos(theta) * horizontal,
        Math.abs(Math.cos(phi)) * 0.65 + upward,
        Math.sin(theta) * horizontal
      );
      direction.x += (this.rng() - 0.5) * 0.8;
      direction.z += (this.rng() - 0.5) * 0.8;
      direction.normalize().multiplyScalar(velocity);

      this.positions[index * 3] = origin.x + (this.rng() - 0.5) * 0.08;
      this.positions[index * 3 + 1] = origin.y + (this.rng() - 0.5) * 0.08;
      this.positions[index * 3 + 2] = origin.z + (this.rng() - 0.5) * 0.08;

      state.vx = direction.x * spread;
      state.vy = direction.y * spread;
      state.vz = direction.z * spread;
      state.life = life * (0.65 + this.rng() * 0.6);
      state.maxLife = state.life;
      state.gravity = gravity;
      state.drag = 0.86 + this.rng() * 0.08;
      state.baseSize = (0.5 + this.rng() * 1.15) * size;

      const color = palette[Math.floor(this.rng() * palette.length)];
      this.colors[index * 3] = color.r;
      this.colors[index * 3 + 1] = color.g;
      this.colors[index * 3 + 2] = color.b;
      this.sizes[index] = state.baseSize;
      this.alphas[index] = 1;
    }
    this.activeCount = Math.min(this.maxCount, this.activeCount + count);
    this.points.visible = true;
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
  }

  heartBurst(origin: THREE.Vector3, color = '#FF7D9F', count = 54): void {
    this.burst(origin, {
      count,
      colors: [color, '#FFD3DA', '#FFD36A'],
      speed: 1.45,
      spread: 1.05,
      upward: 0.2,
      gravity: -0.55,
      life: 1.8,
      size: 1.1
    });
  }

  spawnText(origin: THREE.Vector3, text: string, color = '#FFE0A8'): void {
    let texture = this.symbolTextures.get(text);
    if (!texture) {
      texture = makeCanvasTexture(512, 192, (ctx) => {
        ctx.clearRect(0, 0, 512, 192);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 600 98px "Cormorant Garamond", Georgia, serif';
        const gradient = ctx.createLinearGradient(0, 42, 0, 150);
        gradient.addColorStop(0, '#fff8e6');
        gradient.addColorStop(0.55, color);
        gradient.addColorStop(1, '#c7944e');
        ctx.shadowColor = 'rgba(255,202,119,0.8)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = gradient;
        ctx.fillText(text, 256, 98);
      });
      this.symbolTextures.set(text, texture);
    }
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.05, 0.39, 1);
    sprite.position.copy(origin);
    sprite.renderOrder = 9;
    this.group.add(sprite);
    this.symbols.push({
      sprite,
      material,
      elapsed: 0,
      duration: 2.4,
      baseY: origin.y,
      drift: 0.35 + this.rng() * 0.2
    });
  }

  ripple(origin: THREE.Vector3, color = '#FFD08A', camera?: THREE.Camera): void {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.47, 64), material);
    mesh.position.copy(origin);
    if (camera) {
      mesh.quaternion.copy(camera.quaternion);
      this.tempCameraDirection.set(0, 0, 1).applyQuaternion(camera.quaternion);
      mesh.position.addScaledVector(this.tempCameraDirection, 0.03);
    }
    mesh.renderOrder = 7;
    this.group.add(mesh);
    this.ripples.push({ mesh, elapsed: 0, duration: 1.05 });
  }

  clickBloom(origin: THREE.Vector3, camera: THREE.Camera): void {
    this.ripple(origin, '#FFD792', camera);
    this.ripple(origin, '#FF9EB8', camera);
    this.burst(origin, {
      count: 52,
      colors: ['#FFD580', '#FF9BB2', '#FFF0CD'],
      speed: 1.1,
      spread: 0.95,
      upward: 0.35,
      gravity: -0.7,
      life: 1.55,
      size: 1
    });
    this.spawnText(origin.clone().add(new THREE.Vector3(0, 0.3, 0)), '520');
  }

  private updateSymbols(dt: number): void {
    for (let i = this.symbols.length - 1; i >= 0; i -= 1) {
      const symbol = this.symbols[i];
      symbol.elapsed += dt;
      const progress = clamp(symbol.elapsed / symbol.duration, 0, 1);
      symbol.sprite.position.y = symbol.baseY + progress * symbol.drift;
      symbol.material.opacity = Math.sin(progress * Math.PI) * 0.92;
      const scale = 0.9 + progress * 0.22;
      symbol.sprite.scale.set(1.05 * scale, 0.39 * scale, 1);
      if (progress >= 1) {
        this.group.remove(symbol.sprite);
        symbol.material.dispose();
        this.symbols.splice(i, 1);
      }
    }
  }

  private updateRipples(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
      const ripple = this.ripples[i];
      ripple.elapsed += dt;
      const progress = clamp(ripple.elapsed / ripple.duration, 0, 1);
      ripple.mesh.scale.setScalar(0.4 + progress * 3.2);
      ripple.mesh.material.opacity = (1 - progress) * 0.55;
      if (progress >= 1) {
        this.group.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        ripple.mesh.material.dispose();
        this.ripples.splice(i, 1);
      }
    }
  }

  update(dt: number, _time: number): void {
    let alive = 0;
    let dirty = false;
    for (let i = 0; i < this.maxCount; i += 1) {
      const state = this.states[i];
      if (state.life <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      state.life -= dt;
      dirty = true;
      if (state.life <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      alive += 1;
      state.vy += state.gravity * dt;
      const drag = Math.pow(state.drag, dt * 60);
      state.vx *= drag;
      state.vy *= drag;
      state.vz *= drag;
      this.positions[i * 3] += state.vx * dt;
      this.positions[i * 3 + 1] += state.vy * dt;
      this.positions[i * 3 + 2] += state.vz * dt;
      const lifeRatio = state.life / state.maxLife;
      this.alphas[i] = Math.sin(clamp(lifeRatio, 0, 1) * Math.PI) * 0.92;
      this.sizes[i] = state.baseSize * (0.7 + lifeRatio * 0.55);
    }
    if (dirty) {
      this.activeCount = alive;
      (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.points.geometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
      (this.points.geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
      this.points.visible = alive > 0 || this.symbols.length > 0 || this.ripples.length > 0;
    } else {
      this.points.visible = this.symbols.length > 0 || this.ripples.length > 0;
    }
    this.points.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    this.updateSymbols(dt);
    this.updateRipples(dt);
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
    for (const symbol of this.symbols) {
      symbol.material.dispose();
    }
    for (const ripple of this.ripples) {
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
    }
    for (const texture of this.symbolTextures.values()) texture.dispose();
  }
}
