import * as THREE from 'three';
import { clamp, damp, mulberry32 } from '../core/utils';

const STAR_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.45 + 0.55 * sin(uTime * (0.32 + fract(aPhase) * 0.55) + aPhase);
    gl_PointSize = clamp(aSize * uPixelRatio * (0.7 + twinkle * 1.7) * (68.0 / max(1.0, -mvPosition.z)), 0.6, 9.0);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    vAlpha = uOpacity * (0.32 + twinkle * 0.68);
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float glow = 1.0 - smoothstep(0.12, 1.0, d);
    vec3 color = vColor * (glow * 0.45 + core * 1.2);
    gl_FragColor = vec4(color, (glow * 0.28 + core * 0.7) * vAlpha);
  }
`;

interface Meteor {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  active: boolean;
  elapsed: number;
  duration: number;
  cooldown: number;
  start: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
}

export class StarParticles {
  readonly group = new THREE.Group();
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly meteors: Meteor[] = [];
  private readonly maxCount = 2200;
  private count = 1200;
  private targetOpacity = 1;
  private currentOpacity = 1;
  private enabled = true;

  constructor(count: number) {
    this.count = clamp(count, 300, this.maxCount);
    this.group.name = 'night-sky';
    const rng = mulberry32(20251225);
    const positions = new Float32Array(this.maxCount * 3);
    const sizes = new Float32Array(this.maxCount);
    const phases = new Float32Array(this.maxCount);
    const colors = new Float32Array(this.maxCount * 3);
    const blue = new THREE.Color('#bfe1ff');
    const white = new THREE.Color('#fff7ea');
    const gold = new THREE.Color('#f3d59b');

    for (let i = 0; i < this.maxCount; i += 1) {
      const azimuth = rng() * Math.PI * 2;
      const elevation = Math.pow(rng(), 0.62) * 1.18 + 0.02;
      const radius = 55 + rng() * 34;
      const horizontal = Math.cos(elevation) * radius;
      positions[i * 3] = Math.cos(azimuth) * horizontal;
      positions[i * 3 + 1] = Math.sin(elevation) * radius + 1.5;
      positions[i * 3 + 2] = Math.sin(azimuth) * horizontal;
      sizes[i] = 0.45 + Math.pow(rng(), 2.3) * 2.0;
      phases[i] = rng() * Math.PI * 2;
      const choice = rng();
      const color = choice > 0.88 ? gold : choice > 0.6 ? blue : white;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, this.count);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uOpacity: { value: 1 }
      },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -10;
    this.group.add(this.points);

    for (let i = 0; i < 2; i += 1) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const material = new THREE.LineBasicMaterial({
        color: 0xd8ecff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      line.visible = false;
      this.group.add(line);
      this.meteors.push({
        line,
        active: false,
        elapsed: 0,
        duration: 0.9,
        cooldown: 7 + i * 9,
        start: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        length: 4
      });
    }
  }

  setCount(count: number): void {
    this.count = clamp(count, 300, this.maxCount);
    this.points.geometry.setDrawRange(0, this.count);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.targetOpacity = enabled ? 1 : 0;
  }

  setOpacity(opacity: number): void {
    this.targetOpacity = clamp(opacity, 0, 1);
  }

  private spawnMeteor(meteor: Meteor): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 45 + Math.random() * 15;
    meteor.start.set(
      Math.cos(angle) * radius,
      16 + Math.random() * 18,
      Math.sin(angle) * radius
    );
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    meteor.direction
      .copy(tangent)
      .multiplyScalar((Math.random() > 0.5 ? 1 : -1) * (0.75 + Math.random() * 0.5))
      .add(new THREE.Vector3(0, -0.8 - Math.random() * 0.5, 0))
      .normalize();
    meteor.length = 4 + Math.random() * 5;
    meteor.elapsed = 0;
    meteor.duration = 0.7 + Math.random() * 0.55;
    meteor.active = true;
    meteor.line.visible = true;
    meteor.line.material.opacity = 0;
  }

  private updateMeteors(dt: number): void {
    for (const meteor of this.meteors) {
      if (!this.enabled) {
        meteor.line.visible = false;
        continue;
      }
      if (!meteor.active) {
        meteor.cooldown -= dt;
        if (meteor.cooldown <= 0) {
          this.spawnMeteor(meteor);
          meteor.cooldown = 10 + Math.random() * 16;
        }
        continue;
      }
      meteor.elapsed += dt;
      const progress = clamp(meteor.elapsed / meteor.duration, 0, 1);
      const head = meteor.start
        .clone()
        .addScaledVector(meteor.direction, progress * 17);
      const tail = head.clone().addScaledVector(meteor.direction, -meteor.length);
      const position = meteor.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.setXYZ(0, tail.x, tail.y, tail.z);
      position.setXYZ(1, head.x, head.y, head.z);
      position.needsUpdate = true;
      meteor.line.material.opacity =
        Math.sin(progress * Math.PI) * 0.7 * this.currentOpacity;
      meteor.line.visible = true;
      if (progress >= 1) {
        meteor.active = false;
        meteor.line.visible = false;
      }
    }
  }

  update(dt: number, time: number): void {
    this.currentOpacity = damp(this.currentOpacity, this.targetOpacity, 3.2, dt);
    const material = this.points.material;
    material.uniforms.uTime.value = time;
    material.uniforms.uOpacity.value = this.currentOpacity;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    this.points.visible = this.currentOpacity > 0.007;
    this.group.rotation.y = Math.sin(time * 0.006) * 0.025;
    this.updateMeteors(dt);
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
    for (const meteor of this.meteors) {
      meteor.line.geometry.dispose();
      meteor.line.material.dispose();
    }
  }
}
