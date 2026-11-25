import * as THREE from 'three';
import { clamp, lerp, makeCanvasTexture, mulberry32, smoothstep } from '../core/utils';

export type HeartParticleMode = 'heart' | 'star' | 'burst' | 'free';

export interface HeartParticleOptions {
  count?: number;
  size?: number;
  heartColor?: string;
  starColor?: string;
  gatherTime?: number;
  burstTime?: number;
  beatPeriod?: number;
  autoCycle?: boolean;
}

const MAX_COUNT = 20000;
const HEART_WIDTH = 5.0;
const HEART_HEIGHT = 4.5;
// A real volume, not a thin billboard: the cross-section shrinks smoothly
// toward both faces while the heart keeps its full-width silhouette at z=0.
const HEART_DEPTH = 2.6;

function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function boundsOf(points: { x: number; y: number }[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * The giant 3D heart from F2 experiment 01, adapted to the formal project's
 * Scene/AnimationManager. No renderer, RAF loop, composer or controls are
 * created here; this module only owns its particle buffers and scene group.
 */
export class HeartParticleSystem {
  readonly group = new THREE.Group();
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

  private readonly maxCount = MAX_COUNT;
  private count: number;
  private size: number;
  private heartColor: string;
  private starColor: string;
  private gatherTime: number;
  private burstTime: number;
  private beatPeriod: number;
  private autoCycle: boolean;
  private paused = false;
  private mode: HeartParticleMode = 'heart';
  private assembly = 1;
  private shape = 0;
  private burstProgress = 0;
  private modeStart = 0;
  private regatherAt = 0;
  private rng = mulberry32(81284);

  private readonly heartPositions = new Float32Array(MAX_COUNT * 3);
  private readonly starPositions = new Float32Array(MAX_COUNT * 3);
  private readonly scatterPositions = new Float32Array(MAX_COUNT * 3);
  private readonly burstDirections = new Float32Array(MAX_COUNT * 3);
  private readonly sizes = new Float32Array(MAX_COUNT);
  private readonly heartColors = new Float32Array(MAX_COUNT * 3);
  private readonly starColors = new Float32Array(MAX_COUNT * 3);
  private readonly colorTint = new Float32Array(MAX_COUNT);
  private readonly angles = new Float32Array(MAX_COUNT);
  private readonly depths = new Float32Array(MAX_COUNT);
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly glow: THREE.Sprite;
  private readonly glowTexture: THREE.CanvasTexture;
  private readonly tempColor = new THREE.Color();

  constructor(options: HeartParticleOptions = {}) {
    this.count = clamp(Math.round(options.count ?? 10000), 1000, MAX_COUNT);
    this.size = clamp(options.size ?? 0.085, 0.005, 0.12);
    this.heartColor = options.heartColor ?? '#FF75A9';
    this.starColor = options.starColor ?? '#FFD58A';
    this.gatherTime = Math.max(0.2, options.gatherTime ?? 2.5);
    this.burstTime = Math.max(0.2, options.burstTime ?? 1.8);
    this.beatPeriod = Math.max(0.5, options.beatPeriod ?? 2.5);
    this.autoCycle = options.autoCycle ?? false;
    this.group.name = 'giant-heart-particle-system';

    this.buildTargets();
    this.buildColors();

    const positions = new Float32Array(this.heartPositions);
    const colors = new Float32Array(this.heartColors);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAngle', new THREE.BufferAttribute(this.angles, 1));
    this.geometry.setAttribute('aDepth', new THREE.BufferAttribute(this.depths, 1));
    this.geometry.setDrawRange(0, this.count);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 28);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uSize: { value: this.size },
        uOpacity: { value: 1 }
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAngle;
        attribute float aDepth;
        uniform float uPixelRatio;
        uniform float uSize;
        varying vec3 vColor;
        varying float vAngle;
        varying float vDepth;
        void main(){
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          float depthGain=1.0+max(0.0,aDepth)*0.16;
          gl_PointSize=clamp(aSize*uSize*uPixelRatio*(2100.0/max(1.0,-mv.z))*depthGain,1.0,24.0);
          gl_Position=projectionMatrix*mv;
          vColor=aColor;
          vAngle=aAngle;
          vDepth=aDepth;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vAngle;
        varying float vDepth;
        void main(){
          vec2 p=gl_PointCoord-0.5;
          float d=length(p);
          if(d>0.5) discard;
          float ca=cos(vAngle);
          float sa=sin(vAngle);
          vec2 q=mat2(ca,-sa,sa,ca)*p;
          float core=1.0-smoothstep(0.0,0.2,d);
          float halo=pow(max(0.0,1.0-d*1.9),2.0);
          float streak=max(0.0,1.0-abs(q.y)*16.0)*max(0.0,1.0-abs(q.x)*1.5);
          // Front particles are white-hot; rear layers cool to rose-pink. The
          // depth ramp makes the volume readable from an angle instead of
          // looking like a flat, evenly lit sticker.
          float front=smoothstep(-0.9,0.85,vDepth);
          vec3 color=mix(vColor,vec3(1.0,0.94,0.97),core*0.88);
          color=mix(vec3(0.62,0.2,0.32),color,0.58+front*0.42);
          float depthFade=0.62+front*0.38;
          float alpha=(core*0.9+halo*0.32+streak*0.12)*uOpacity*depthFade;
          gl_FragColor=vec4(color,clamp(alpha,0.0,0.98));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.group.add(this.points);

    this.glowTexture = makeCanvasTexture(256, 256, (ctx) => {
      const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.18, 'rgba(255,225,236,0.62)');
      gradient.addColorStop(0.48, 'rgba(255,111,159,0.24)');
      gradient.addColorStop(1, 'rgba(255,54,112,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    });
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: 0xff8fb6,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        toneMapped: false
      })
    );
    this.glow.scale.set(9.0, 8.0, 1);
    this.glow.position.z = -0.18;
    this.glow.renderOrder = 3;
    this.group.add(this.glow);

    this.group.visible = true;
  }

  private buildTargets(): void {
    const rng = this.rng;
    const heartOutline = this.buildHeartOutline();
    const starOutline = this.buildStarOutline();
    const heartBounds = boundsOf(heartOutline);
    const starBounds = boundsOf(starOutline);
    const heartPoint = (i: number): { x: number; y: number } => {
      const shell = i % 4 === 0;
      if (shell) {
        const edge = heartOutline[Math.floor(rng() * heartOutline.length)];
        return { x: edge.x + (rng() - 0.5) * 0.035, y: edge.y + (rng() - 0.5) * 0.035 };
      }
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const x = heartBounds.minX + rng() * (heartBounds.maxX - heartBounds.minX);
        const y = heartBounds.minY + rng() * (heartBounds.maxY - heartBounds.minY);
        if (pointInPolygon(x, y, heartOutline)) return { x, y };
      }
      return { x: 0, y: 0 };
    };
    const starPoint = (i: number): { x: number; y: number } => {
      const shell = i % 6 === 0;
      if (shell) {
        const edge = starOutline[Math.floor(rng() * starOutline.length)];
        return { x: edge.x + (rng() - 0.5) * 0.025, y: edge.y + (rng() - 0.5) * 0.025 };
      }
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const x = starBounds.minX + rng() * (starBounds.maxX - starBounds.minX);
        const y = starBounds.minY + rng() * (starBounds.maxY - starBounds.minY);
        if (pointInPolygon(x, y, starOutline)) return { x, y };
      }
      return { x: 0, y: 0 };
    };

    for (let i = 0; i < MAX_COUNT; i += 1) {
      const hp = heartPoint(i);
      const sp = starPoint(i);
      // Sample a depth layer and shrink the 2D heart cross-section toward the
      // front/back faces. This produces an actual solid volume with a plump
      // centre instead of a flat slab with particles only on its outline.
      const depthNorm = rng() * 2 - 1;
      const depthScale = Math.pow(
        Math.max(0, 1 - Math.pow(Math.abs(depthNorm), 2.4)),
        0.55
      );
      const shellScale = i % 4 === 0 ? 0.985 : 1;
      const hx = hp.x * depthScale * shellScale;
      const hy = hp.y * depthScale * shellScale;
      this.heartPositions[i * 3] = hx;
      this.heartPositions[i * 3 + 1] = hy;
      this.heartPositions[i * 3 + 2] = depthNorm * (HEART_DEPTH * 0.5);
      this.depths[i] = depthNorm;
      this.angles[i] = Math.atan2(hy, hx);
      this.starPositions[i * 3] = sp.x;
      this.starPositions[i * 3 + 1] = sp.y;
      this.starPositions[i * 3 + 2] = i % 6 === 0 ? 0 : (rng() * 2 - 1) * 0.16;

      const radius = 5.5 + rng() * 7.5;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      this.scatterPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      this.scatterPositions[i * 3 + 1] = Math.cos(phi) * radius * 0.7;
      this.scatterPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      const bx = (rng() - 0.5) * 2;
      const by = (rng() - 0.5) * 2;
      const bz = (rng() - 0.5) * 2;
      const len = Math.hypot(bx, by, bz) || 1;
      this.burstDirections[i * 3] = bx / len;
      this.burstDirections[i * 3 + 1] = by / len;
      this.burstDirections[i * 3 + 2] = bz / len;
      this.sizes[i] = 0.62 + rng() * 0.78;
      this.colorTint[i] = rng();
    }
  }

  private buildHeartOutline(): { x: number; y: number }[] {
    const raw: { x: number; y: number }[] = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 512; i += 1) {
      const t = (i / 512) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      raw.push({ x, y });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sx = HEART_WIDTH / (maxX - minX);
    const sy = HEART_HEIGHT / (maxY - minY);
    return raw.map((p) => ({ x: (p.x - cx) * sx, y: (p.y - cy) * sy }));
  }

  private buildStarOutline(): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const outer = 2.4;
    const inner = 1.05;
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? outer : inner;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return points;
  }

  private buildColors(): void {
    const heart = new THREE.Color(this.heartColor);
    const star = new THREE.Color(this.starColor);
    const pink = new THREE.Color('#FF9FC4');
    const white = new THREE.Color('#FFF7F4');
    const tmp = new THREE.Color();
    for (let i = 0; i < MAX_COUNT; i += 1) {
      const t = this.colorTint[i];
      // The reference image is a hot-pink/white sparkler heart, not a
      // multicolour galaxy. Keep every heart particle on that palette.
      tmp.copy(heart).lerp(pink, Math.min(1, t * 1.4));
      if (t > 0.4) tmp.lerp(white, Math.min(1, (t - 0.4) * 2.2));
      this.heartColors[i * 3] = tmp.r;
      this.heartColors[i * 3 + 1] = tmp.g;
      this.heartColors[i * 3 + 2] = tmp.b;
      tmp.copy(star).lerp(white, t * 0.55);
      this.starColors[i * 3] = tmp.r;
      this.starColors[i * 3 + 1] = tmp.g;
      this.starColors[i * 3 + 2] = tmp.b;
    }
  }

  setCount(count: number): void {
    this.count = clamp(Math.round(count), 1000, this.maxCount);
    this.geometry.setDrawRange(0, this.count);
  }

  setSize(size: number): void {
    this.size = clamp(size, 0.005, 0.12);
    this.material.uniforms.uSize.value = this.size;
  }

  setColors(heartColor: string, starColor: string): void {
    this.heartColor = heartColor;
    this.starColor = starColor;
    this.buildColors();
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  setMode(mode: HeartParticleMode, elapsed = 0): void {
    if (mode === 'heart' || mode === 'star') {
      this.mode = mode;
      this.assembly = 0;
      this.burstProgress = 0;
      this.shape = mode === 'star' ? 1 : 0;
      this.modeStart = elapsed;
      return;
    }
    if (mode === 'burst') {
      this.mode = 'burst';
      this.assembly = 1;
      this.burstProgress = 0;
      this.modeStart = elapsed;
      return;
    }
    this.mode = 'free';
    this.assembly = 0;
    this.burstProgress = 0;
    this.modeStart = elapsed;
  }

  gather(elapsed = 0): void {
    this.setMode('heart', elapsed);
  }

  burst(elapsed = 0): void {
    this.setMode('burst', elapsed);
  }

  get particleCount(): number {
    return this.count;
  }

  get currentMode(): HeartParticleMode {
    return this.mode;
  }

  update(dt: number, elapsed: number): void {
    if (!this.group.visible || this.paused) return;
    if (this.mode === 'heart' || this.mode === 'star') {
      this.assembly = Math.min(1, this.assembly + dt / this.gatherTime);
      this.shape = lerp(this.shape, this.mode === 'star' ? 1 : 0, 1 - Math.exp(-4.8 * dt));
      if (
        this.autoCycle &&
        this.mode === 'heart' &&
        this.assembly >= 0.999 &&
        elapsed - this.modeStart > 4.6
      ) {
        this.burst(elapsed);
      }
    } else if (this.mode === 'burst') {
      this.burstProgress = Math.min(1, this.burstProgress + dt / this.burstTime);
      this.assembly = Math.max(0, 1 - this.burstProgress * 1.15);
      this.shape = lerp(this.shape, 0, 1 - Math.exp(-3.6 * dt));
      if (this.burstProgress >= 1) {
        this.mode = 'free';
        this.assembly = 0;
        this.burstProgress = 1;
        this.modeStart = elapsed;
        this.regatherAt = elapsed + 0.55;
      }
    } else {
      this.burstProgress = Math.max(0, this.burstProgress - dt * 1.8);
      this.assembly = Math.max(0, this.assembly - dt * 0.9);
      if (this.autoCycle && this.regatherAt > 0 && elapsed > this.regatherAt) {
        this.gather(elapsed);
      }
    }

    const active = this.count;
    const shape = this.shape;
    const assembly = smoothstep(0, 1, this.assembly);
    const burst = smoothstep(0, 1, this.burstProgress);
    const beat = elapsed * (Math.PI * 2) / this.beatPeriod;
    const breath =
      this.mode === 'heart' && assembly > 0.94
        ? 1 + 0.032 * Math.sin(beat) + 0.012 * Math.sin(beat * 2 + 0.7)
        : 1;
    const drift = (1 - assembly) * 0.12;
    const pos = this.geometry.attributes.position.array as Float32Array;
    const col = this.geometry.attributes.aColor.array as Float32Array;
    const color = this.tempColor;

    for (let i = 0; i < active; i += 1) {
      const i3 = i * 3;
      const hx = this.heartPositions[i3];
      const hy = this.heartPositions[i3 + 1];
      const hz = this.heartPositions[i3 + 2];
      const sx = this.starPositions[i3];
      const sy = this.starPositions[i3 + 1];
      const sz = this.starPositions[i3 + 2];
      const bx = lerp(hx, sx, shape);
      const by = lerp(hy, sy, shape);
      const bz = lerp(hz, sz, shape);
      const scatX = this.scatterPositions[i3] + Math.sin(elapsed * 0.35 + i * 0.13) * drift;
      const scatY = this.scatterPositions[i3 + 1] + Math.cos(elapsed * 0.28 + i * 0.17) * drift;
      const scatZ = this.scatterPositions[i3 + 2] + Math.sin(elapsed * 0.23 + i * 0.07) * drift * 0.6;
      const outward = (1 - assembly) * (1 + burst * 3.4);
      const targetX = scatX * (1 - assembly) + bx * assembly * breath + this.burstDirections[i3] * burst * 2.6;
      const targetY =
        scatY * (1 - assembly) + by * assembly * breath + this.burstDirections[i3 + 1] * burst * 2.6;
      const targetZ =
        scatZ * (1 - assembly) + bz * assembly * breath + this.burstDirections[i3 + 2] * burst * 2.6;
      const rate = 1 - Math.exp(-(6.5 + outward * 2.4) * dt);
      pos[i3] += (targetX - pos[i3]) * rate;
      pos[i3 + 1] += (targetY - pos[i3 + 1]) * rate;
      pos[i3 + 2] += (targetZ - pos[i3 + 2]) * rate;

      const pulse = 0.8 + 0.2 * Math.sin(elapsed * 2.1 + i * 0.37);
      const brightness = pulse * (1 - burst * 0.26);
      color.setRGB(
        lerp(this.heartColors[i3], this.starColors[i3], shape) * brightness,
        lerp(this.heartColors[i3 + 1], this.starColors[i3 + 1], shape) * brightness,
        lerp(this.heartColors[i3 + 2], this.starColors[i3 + 2], shape) * brightness
      );
      col[i3] = color.r;
      col[i3 + 1] = color.g;
      col[i3 + 2] = color.b;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    // A small oscillating yaw exposes the real volume without turning the
    // heart into a spinning billboard.
    this.points.rotation.y = Math.sin(elapsed * 0.32) * 0.45;
    this.points.rotation.x = Math.sin(elapsed * 0.21 + 0.8) * 0.055;
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.glowTexture.dispose();
    (this.glow.material as THREE.SpriteMaterial).dispose();
    this.group.clear();
  }
}
