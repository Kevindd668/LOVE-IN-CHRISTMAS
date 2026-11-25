import * as THREE from 'three';
import { clamp } from '../core/utils';

export interface TreeHelixConfig {
  height: number;
  crownRadius: number;
}

const TURNS = 9;
const BAND_WIDTH = 0.035;
const FLOW_PER_RIBBON = 216;

const FLOW_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(uSize * uPixelRatio * (180.0 / max(1.0, -mv.z)), 0.6, 9.0);
    gl_Position = projectionMatrix * mv;
    vFade = clamp(1.0 - (-mv.z) / 28.0, 0.16, 1.0);
  }
`;

const FLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vFade;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.24, d);
    float halo = 1.0 - smoothstep(0.12, 1.0, d);
    gl_FragColor = vec4(uColor * (0.8 + core * 1.4), (halo * 0.3 + core * 0.8) * vFade);
  }
`;

interface RibbonRuntime {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  positions: THREE.BufferAttribute;
  color: THREE.Color;
  baseColor: THREE.Color;
}

export class TreeHelix {
  readonly group = new THREE.Group();
  private ribbons: RibbonRuntime[] = [];
  private phase = 0;
  private speed = 0.32;
  private spin = 0;
  private brightness = 1;
  private time = 0;
  private enabled = true;
  private readonly tmp = new THREE.Vector3();
  private readonly colors = ['#FFD58A', '#FF75A9'];
  private geometry: THREE.TubeGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;

  constructor(config: TreeHelixConfig) {
    this.group.name = 'double-helix-ribbons';
    this.build(config);
  }

  build(config: TreeHelixConfig): void {
    this.clear();
    const height = Math.max(4, config.height);
    const crown = Math.max(1.5, config.crownRadius);
    const bottom = clamp(height * 0.11, 0.8, 1.35);
    const top = height - 0.55;
    const turns = TURNS;
    const self = this;

    const makeCurve = (offset: number): THREE.CatmullRomCurve3 => {
      const points: THREE.Vector3[] = [];
      const samples = 240;
      for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const angle = t * Math.PI * 2 * turns + offset;
        const envelope =
          crown * Math.pow(1 - t, 0.82) * 1.015 + 0.07 + Math.sin(t * 9.4 + offset) * 0.018;
        const y = bottom + (top - bottom) * t;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * envelope,
            y,
            Math.sin(angle) * envelope
          )
        );
      }
      return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.42);
    };

    const buildRibbon = (offset: number, color: string): RibbonRuntime => {
      const curve = makeCurve(offset);
      const geometry = new THREE.TubeGeometry(curve, 260, BAND_WIDTH, 5, false);
      // Basic material keeps the exact gold/rose identity under the scene's
      // cool moonlight and bloom; a StandardMaterial washed both bands white.
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.92,
        depthWrite: true,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `helix-ribbon-${color}`;
      mesh.renderOrder = 3;
      this.group.add(mesh);

      const positions = new Float32Array(FLOW_PER_RIBBON * 3);
      const geometryPoints = new THREE.BufferGeometry();
      const positionAttribute = new THREE.BufferAttribute(positions, 3);
      positionAttribute.setUsage(THREE.DynamicDrawUsage);
      geometryPoints.setAttribute('position', positionAttribute);
      geometryPoints.boundingSphere = new THREE.Sphere(new THREE.Vector3(), height);
      const flowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uSize: { value: 0.09 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
        },
        vertexShader: FLOW_VERTEX,
        fragmentShader: FLOW_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: true
      });
      const points = new THREE.Points(geometryPoints, flowMaterial);
      points.frustumCulled = false;
      points.renderOrder = 4;
      this.group.add(points);

      for (let i = 0; i < FLOW_PER_RIBBON; i += 1) {
        curve.getPointAt(i / FLOW_PER_RIBBON, self.tmp);
        positions[i * 3] = self.tmp.x;
        positions[i * 3 + 1] = self.tmp.y;
        positions[i * 3 + 2] = self.tmp.z;
      }
      positionAttribute.needsUpdate = true;

      return {
        curve,
        mesh,
        points,
        positions: positionAttribute,
        color: new THREE.Color(color),
        baseColor: new THREE.Color(color)
      };
    };

    this.ribbons.push(buildRibbon(0, this.colors[0]));
    this.ribbons.push(buildRibbon(Math.PI, this.colors[1]));
    this.geometry = this.ribbons[0]?.mesh.geometry ?? null;
    this.material = this.ribbons[0]?.mesh.material ?? null;
    this.group.rotation.y = this.phase;
    this.group.visible = this.enabled;
  }

  private clear(): void {
    for (const ribbon of this.ribbons) {
      this.group.remove(ribbon.mesh, ribbon.points);
      ribbon.mesh.geometry.dispose();
      ribbon.mesh.material.dispose();
      ribbon.points.geometry.dispose();
      ribbon.points.material.dispose();
    }
    this.ribbons = [];
  }

  update(dt: number, time: number): void {
    this.time = time;
    this.spin += dt * this.speed * 0.55;
    this.group.rotation.y = this.phase + this.spin;
    const pulse = 1.05 + Math.sin(time * 1.15) * 0.22;

    for (let r = 0; r < this.ribbons.length; r += 1) {
      const ribbon = this.ribbons[r];
      ribbon.mesh.material.opacity = 0.82 + pulse * 0.1;
      ribbon.mesh.material.color.copy(ribbon.baseColor).multiplyScalar(
        0.92 + pulse * 0.08 * this.brightness
      );
      const positions = ribbon.positions.array as Float32Array;
      const scroll = (time * this.speed * 0.047 + r * 0.133) % 1;
      for (let i = 0; i < FLOW_PER_RIBBON; i += 1) {
        const t = (i / FLOW_PER_RIBBON + scroll) % 1;
        ribbon.curve.getPointAt(t, this.tmp);
        positions[i * 3] = this.tmp.x;
        positions[i * 3 + 1] = this.tmp.y;
        positions[i * 3 + 2] = this.tmp.z;
      }
      ribbon.positions.needsUpdate = true;
      ribbon.points.material.uniforms.uPixelRatio.value = Math.min(
        window.devicePixelRatio || 1,
        2
      );
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.group.visible = enabled;
  }

  setSpeed(speed: number): void {
    this.speed = clamp(speed, 0, 1.4);
  }

  setPhase(phase: number): void {
    this.phase = clamp(phase, 0, Math.PI * 2);
    this.group.rotation.y = this.phase + this.spin;
  }

  setBrightness(brightness: number): void {
    this.brightness = clamp(brightness, 0.5, 1.5);
  }

  dispose(): void {
    this.clear();
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
