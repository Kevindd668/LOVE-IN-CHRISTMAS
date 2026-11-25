import * as THREE from 'three';
import { clamp, damp, mulberry32 } from '../core/utils';

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aSway;
  attribute float aOpacity;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uRangeY;

  varying float vAlpha;

  void main() {
    float fall = mod(position.y - uTime * aSpeed * uSpeed, uRangeY);
    float drift = sin(uTime * 0.36 + aPhase) * aSway + sin(uTime * 0.11 + aPhase * 2.0) * 0.22;
    vec3 animated = vec3(
      position.x + drift,
      fall - 1.4,
      position.z + cos(uTime * 0.27 + aPhase) * aSway * 0.48
    );
    vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (86.0 / max(1.0, -mvPosition.z)), 0.6, 24.0);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = uOpacity * aOpacity * (0.72 + 0.28 * sin(uTime * 0.8 + aPhase));
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float soft = 1.0 - smoothstep(0.12, 1.0, d);
    float core = 1.0 - smoothstep(0.0, 0.36, d);
    float alpha = (soft * 0.5 + core * 0.42) * vAlpha;
    vec3 color = mix(vec3(0.76, 0.88, 0.96), vec3(1.0, 0.99, 0.96), core);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class SnowParticles {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly maxCount = 3200;
  private targetOpacity = 1;
  private currentOpacity = 1;
  private visibleTarget = true;
  private speed = 1;
  private count = 1800;

  constructor(count: number, speed: number) {
    this.count = clamp(Math.round(count), 200, this.maxCount);
    this.speed = speed;
    const rng = mulberry32(122501);
    const positions = new Float32Array(this.maxCount * 3);
    const sizes = new Float32Array(this.maxCount);
    const speeds = new Float32Array(this.maxCount);
    const phases = new Float32Array(this.maxCount);
    const sways = new Float32Array(this.maxCount);
    const opacities = new Float32Array(this.maxCount);

    for (let i = 0; i < this.maxCount; i += 1) {
      positions[i * 3] = (rng() - 0.5) * 58;
      positions[i * 3 + 1] = rng() * 33 + 1.4;
      positions[i * 3 + 2] = (rng() - 0.5) * 50;
      const near = rng();
      sizes[i] = 0.7 + Math.pow(rng(), 2.1) * 2.0 + (near > 0.94 ? 1.2 : 0);
      speeds[i] = 0.55 + rng() * 1.2;
      phases[i] = rng() * Math.PI * 2;
      sways[i] = 0.18 + rng() * 0.65;
      opacities[i] = 0.56 + rng() * 0.36;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSway', new THREE.BufferAttribute(sways, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setDrawRange(0, this.count);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 15, 0), 45);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.speed },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uOpacity: { value: 1 },
        uRangeY: { value: 33 }
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      toneMapped: true
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.points.name = 'snow-particles';
  }

  setCount(count: number): void {
    this.count = clamp(Math.round(count), 200, this.maxCount);
    this.points.geometry.setDrawRange(0, this.count);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.points.material.uniforms.uSpeed.value = speed;
  }

  setEnabled(enabled: boolean): void {
    this.visibleTarget = enabled;
    this.targetOpacity = enabled ? 1 : 0;
  }

  setOpacity(opacity: number): void {
    this.targetOpacity = clamp(opacity, 0, 1);
    this.visibleTarget = this.targetOpacity > 0.01;
  }

  update(dt: number, time: number): void {
    this.currentOpacity = damp(this.currentOpacity, this.targetOpacity, 4.5, dt);
    const material = this.points.material;
    material.uniforms.uTime.value = time;
    material.uniforms.uSpeed.value = this.speed;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    material.uniforms.uOpacity.value = this.currentOpacity;
    this.points.visible = this.currentOpacity > 0.006 || this.visibleTarget;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
