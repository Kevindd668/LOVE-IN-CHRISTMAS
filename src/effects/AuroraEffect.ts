import * as THREE from 'three';
import { clamp, damp } from '../core/utils';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uPhase;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    float time = uTime * 0.035;
    float n = noise(vec2(uv.x * 9.0 + uPhase, uv.y * 2.4 + time));
    float slow = sin(uv.x * 30.0 + time * 1.2 + sin(uv.x * 8.0 + uPhase) * 2.5);
    float curtain = smoothstep(0.08, 0.95, slow * 0.5 + 0.5 + n * 0.25);
    float vertical = smoothstep(0.0, 0.38, uv.y) * (1.0 - smoothstep(0.35, 0.92, uv.y));
    float ribbons = smoothstep(0.28, 0.84, noise(vec2(uv.x * 15.0 + uPhase * 1.7, uv.y * 4.0 + time * 0.6)));
    float halo = pow(1.0 - abs(uv.y - 0.45), 5.0);

    vec3 color = mix(uColorA, uColorB, uv.y * 0.8 + 0.15);
    color = mix(color, uColorC, curtain * 0.44);
    color += uColorC * ribbons * 0.035;
    float alpha = (curtain * 0.22 + ribbons * 0.13 + halo * 0.065) * vertical * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class AuroraEffect {
  readonly group = new THREE.Group();
  private readonly materials: THREE.ShaderMaterial[] = [];
  private targetOpacity = 1;
  private currentOpacity = 1;
  private enabled = true;

  constructor() {
    this.group.name = 'aurora';
    const layers = [
      {
        radius: 72,
        height: 32,
        y: 17,
        colorA: '#0C5472',
        colorB: '#167C89',
        colorC: '#58C8B2',
        phase: 0.7,
        rotation: -0.2
      },
      {
        radius: 80,
        height: 38,
        y: 20,
        colorA: '#102D52',
        colorB: '#1C6D7A',
        colorC: '#79D7BD',
        phase: 4.1,
        rotation: 1.4
      }
    ];

    for (const layer of layers) {
      const geometry = new THREE.CylinderGeometry(
        layer.radius,
        layer.radius + 4,
        layer.height,
        96,
        1,
        true,
        -Math.PI,
        Math.PI * 2
      );
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.9 },
          uColorA: { value: new THREE.Color(layer.colorA) },
          uColorB: { value: new THREE.Color(layer.colorB) },
          uColorC: { value: new THREE.Color(layer.colorC) },
          uPhase: { value: layer.phase }
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = layer.y;
      mesh.rotation.y = layer.rotation;
      mesh.renderOrder = -8;
      mesh.frustumCulled = false;
      this.materials.push(material);
      this.group.add(mesh);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.targetOpacity = enabled ? 0.9 : 0;
  }

  setOpacity(opacity: number): void {
    this.targetOpacity = clamp(opacity, 0, 1) * 0.9;
  }

  update(dt: number, time: number): void {
    this.currentOpacity = damp(this.currentOpacity, this.targetOpacity, 1.8, dt);
    for (const material of this.materials) {
      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = this.currentOpacity;
    }
    this.group.visible = this.currentOpacity > 0.004 || this.enabled;
  }

  dispose(): void {
    for (const child of this.group.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
