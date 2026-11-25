import * as THREE from 'three';
import type { HeartParticleSystem } from '../particles/HeartParticleSystem';
import { clamp, makeRadialTexture, smoothstep } from '../core/utils';

interface LayerConfig {
  count: number;
  arms: number;
  radiusMin: number;
  radiusMax: number;
  tightness: number;
  armSpread: number;
  thickness: number;
  speed: number;
  phase: number;
  colorA: string;
  colorB: string;
}

const LAYERS: LayerConfig[] = [
  {
    count: 7000,
    arms: 5,
    radiusMin: 5.5,
    radiusMax: 13,
    tightness: 2.15,
    armSpread: 0.32,
    thickness: 0.12,
    speed: 0.34,
    phase: 0.6,
    colorA: '#557BFF',
    colorB: '#8FB6FF'
  },
  {
    count: 7000,
    arms: 3,
    radiusMin: 2.6,
    radiusMax: 10.2,
    tightness: 1.75,
    armSpread: 0.4,
    thickness: 0.28,
    speed: -0.28,
    phase: 2.3,
    colorA: '#FFD58A',
    colorB: '#FFB35C'
  },
  {
    count: 6000,
    arms: 4,
    radiusMin: 0.4,
    radiusMax: 6.4,
    tightness: 2.65,
    armSpread: 0.52,
    thickness: 0.5,
    speed: 0.58,
    phase: 4.1,
    colorA: '#FF75A9',
    colorB: '#FFD5E5'
  }
];

const COUNT = LAYERS.reduce((sum, layer) => sum + layer.count, 0);

const POINT_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uPixelRatio;
  uniform float uSize;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uSize * uPixelRatio * (1300.0 / max(1.0, -mv.z)), 1.0, 22.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.16, d);
    float halo = pow(max(0.0, 1.0 - d * 2.0), 2.0);
    float streak = max(0.0, 1.0 - abs(p.y) * 26.0) * max(0.0, 1.0 - abs(p.x) * 2.2);
    vec3 color = vColor * (halo * 0.34 + core * 1.08);
    float alpha = (core * 0.78 + halo * 0.22 + streak * 0.1) * uOpacity;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
  }
`;

/**
 * One 20k particle field for the cinematic spiral and its heart morph.
 * It is not the formal giant heart and is disposed/hidden after the intro.
 */
export class CinematicParticleField {
  readonly group = new THREE.Group();
  readonly particleCount = COUNT;
  readonly layerCounts = LAYERS.map((layer) => layer.count);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly trailGeometry = new THREE.BufferGeometry();
  private readonly trails: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly glowTexture: THREE.Texture;
  private readonly glow: THREE.Sprite;
  private readonly heartTargets = new Float32Array(COUNT * 3);
  private readonly positions = new Float32Array(COUNT * 3);
  private readonly colors = new Float32Array(COUNT * 3);
  private readonly trailPositions = new Float32Array(COUNT * 2 * 3);
  private readonly trailColors = new Float32Array(COUNT * 2 * 3);
  private readonly galaxyColors = new Float32Array(COUNT * 3);
  private readonly heartColors = new Float32Array(COUNT * 3);
  private readonly radius = new Float32Array(COUNT);
  private readonly baseAngle = new Float32Array(COUNT);
  private readonly yBase = new Float32Array(COUNT);
  private readonly phase = new Float32Array(COUNT);
  private readonly size = new Float32Array(COUNT);
  private readonly layer = new Uint8Array(COUNT);
  private readonly speed = new Float32Array(COUNT);
  private readonly material: THREE.ShaderMaterial;
  private visible = false;

  constructor(heart: HeartParticleSystem) {
    this.group.name = 'cinematic-intro-particles';
    this.group.rotation.set(0.34, 0, 0.08);
    heart.copyHeartPositions(this.heartTargets, COUNT);
    this.buildGalaxy();
    this.buildColors();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geometry.setDrawRange(0, COUNT);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uSize: { value: 0.075 },
        uOpacity: { value: 0 }
      },
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    this.group.add(this.points);

    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trailGeometry.setDrawRange(0, COUNT * 2);
    this.trails = new THREE.LineSegments(
      this.trailGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    this.trails.frustumCulled = false;
    this.trails.renderOrder = 7;
    this.group.add(this.trails);

    this.glowTexture = makeRadialTexture('rgba(255,117,169,0.75)', 'rgba(255,117,169,0)', 256);
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: '#FF75A9',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    this.glow.scale.set(2.2, 2.2, 1);
    this.group.add(this.glow);
    this.group.visible = false;
    this.visible = false;
  }

  private buildGalaxy(): void {
    const rng = (() => {
      let seed = 14159;
      return (): number => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();
    let cursor = 0;
    for (let layerIndex = 0; layerIndex < LAYERS.length; layerIndex += 1) {
      const config = LAYERS[layerIndex];
      const colorA = new THREE.Color(config.colorA);
      const colorB = new THREE.Color(config.colorB);
      for (let n = 0; n < config.count; n += 1) {
        const i = cursor + n;
        const r = config.radiusMin + (config.radiusMax - config.radiusMin) * Math.pow(rng(), 0.72);
        const arm = i % config.arms;
        const angle =
          (arm / config.arms) * Math.PI * 2 +
          Math.log(Math.max(0.2, r) / Math.max(0.2, config.radiusMin)) * config.tightness +
          (rng() - 0.5) * config.armSpread;
        const y = (rng() + rng() + rng() - 1.5) * config.thickness + Math.sin(r * 0.8 + config.phase) * 0.1;
        this.radius[i] = r;
        this.baseAngle[i] = angle;
        this.yBase[i] = y;
        this.phase[i] = rng() * Math.PI * 2;
        this.size[i] = 0.55 + rng() * 0.9;
        this.layer[i] = layerIndex;
        this.speed[i] = config.speed * (0.8 + rng() * 0.36);
        const tint = rng();
        const color = colorA.clone().lerp(colorB, Math.pow(tint, 1.7));
        this.galaxyColors[i * 3] = color.r;
        this.galaxyColors[i * 3 + 1] = color.g;
        this.galaxyColors[i * 3 + 2] = color.b;
        const heartTint = rng();
        const heartColor = new THREE.Color('#FF75A9')
          .lerp(new THREE.Color('#FFD5E5'), heartTint * 0.82)
          .lerp(new THREE.Color('#FFF7F4'), heartTint > 0.78 ? 0.4 : 0);
        this.heartColors[i * 3] = heartColor.r;
        this.heartColors[i * 3 + 1] = heartColor.g;
        this.heartColors[i * 3 + 2] = heartColor.b;
        this.trailColors[i * 6] = color.r * 0.62;
        this.trailColors[i * 6 + 1] = color.g * 0.62;
        this.trailColors[i * 6 + 2] = color.b * 0.62;
        this.trailColors[i * 6 + 3] = color.r * 0.08;
        this.trailColors[i * 6 + 4] = color.g * 0.08;
        this.trailColors[i * 6 + 5] = color.b * 0.08;
      }
      cursor += config.count;
    }
  }

  private buildColors(): void {
    this.colors.set(this.galaxyColors);
  }

  reset(): void {
    this.group.visible = true;
    this.visible = true;
    this.material.uniforms.uOpacity.value = 0;
    this.glow.material.opacity = 0;
    this.trails.material.opacity = 0;
    this.trails.visible = false;
    this.writePositions(0, 0, 1);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.visible = visible;
  }

  private writePositions(time: number, heartMix: number, heartScale: number): void {
    const heart = smoothstep(0, 1, heartMix);
    for (let i = 0; i < COUNT; i += 1) {
      const layerConfig = LAYERS[this.layer[i]];
      const expansion = smoothstep(0, 1, clamp((time - 1.35) / 0.85, 0, 1));
      const r = this.radius[i] * (0.18 + 0.82 * expansion) * (1 + Math.sin(time * 0.42 + this.phase[i]) * 0.045);
      const theta =
        this.baseAngle[i] +
        time * this.speed[i] * (1.3 / (0.72 + this.radius[i] * 0.07));
      const gx = Math.cos(theta) * r;
      const gz = Math.sin(theta) * r;
      const gy = this.yBase[i] + Math.sin(time * 0.8 + this.phase[i]) * layerConfig.thickness * 0.45;
      const hx = this.heartTargets[i * 3] * heartScale;
      const hy = this.heartTargets[i * 3 + 1] * heartScale;
      const hz = this.heartTargets[i * 3 + 2] * heartScale;
      const x = gx * (1 - heart) + hx * heart;
      const y = gy * (1 - heart) + hy * heart;
      const z = gz * (1 - heart) + hz * heart;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.colors[i * 3] = this.galaxyColors[i * 3] * (1 - heart) + this.heartColors[i * 3] * heart;
      this.colors[i * 3 + 1] =
        this.galaxyColors[i * 3 + 1] * (1 - heart) + this.heartColors[i * 3 + 1] * heart;
      this.colors[i * 3 + 2] =
        this.galaxyColors[i * 3 + 2] * (1 - heart) + this.heartColors[i * 3 + 2] * heart;
      if (heart < 0.04) {
        const tx = -Math.sin(theta) * r;
        const tz = Math.cos(theta) * r;
        const length = 0.07 + 0.08 * this.size[i];
        this.trailPositions[i * 6] = x;
        this.trailPositions[i * 6 + 1] = y;
        this.trailPositions[i * 6 + 2] = z;
        this.trailPositions[i * 6 + 3] = x - tx * length;
        this.trailPositions[i * 6 + 4] = y - 0.01;
        this.trailPositions[i * 6 + 5] = z - tz * length;
      }
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    if (heart < 0.04) {
      (this.trailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      this.trails.visible = this.visible;
    } else {
      this.trails.visible = false;
    }
  }

  update(time: number, opacity: number, heartMix: number, heartScale: number): void {
    if (!this.visible) return;
    this.writePositions(time, heartMix, heartScale);
    this.material.uniforms.uOpacity.value = opacity;
    this.trails.material.opacity = opacity * 0.3;
    this.glow.material.opacity = clamp((1 - time / 1.5) * 0.75 + (heartMix > 0.2 ? 0.2 : 0), 0, 0.8);
    this.glow.scale.setScalar(1.4 + Math.sin(time * 2.0) * 0.18 + (1 - heartMix) * 0.5);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trails.material.dispose();
    this.glowTexture.dispose();
    this.glow.material.dispose();
  }
}
