import * as THREE from 'three';
import type { HeartMode } from '../config';
import { clamp, damp, makeCanvasTexture, mulberry32 } from '../core/utils';

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uSize * uPixelRatio * (142.0 / max(1.0, -mvPosition.z)), 0.75, 21.0);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    vAlpha = aAlpha * uOpacity;
    vTwinkle = 0.65 + 0.35 * sin(position.x * 3.7 + position.y * 2.1 + position.z);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vTwinkle;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.18, d);
    float inner = 1.0 - smoothstep(0.04, 0.48, d);
    float halo = 1.0 - smoothstep(0.16, 1.0, d);
    float ray = max(0.0, 1.0 - abs(p.x) * 8.0) * max(0.0, 1.0 - abs(p.y) * 2.4)
              + max(0.0, 1.0 - abs(p.y) * 8.0) * max(0.0, 1.0 - abs(p.x) * 2.4);
    vec3 color = vColor * (halo * 0.38 + inner * 0.86 + ray * 0.18);
    color += vec3(1.0, 0.88, 0.7) * core * 0.75 * vTwinkle;
    float alpha = (halo * 0.22 + inner * 0.45 + core * 0.38 + ray * 0.06) * vAlpha;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.94));
  }
`;

interface MiniHeart {
  angle: number;
  radius: number;
  height: number;
  speed: number;
  scale: number;
  phase: number;
  depth: number;
}

interface HeartParticle {
  group: number;
  heartX: number;
  heartY: number;
  jitterX: number;
  jitterY: number;
  jitterZ: number;
  size: number;
  color: THREE.Color;
  alpha: number;
  driftOffset: number;
}

const miniHearts: MiniHeart[] = [
  { angle: 0.2, radius: 2.75, height: 2.1, speed: 0.13, scale: 0.27, phase: 0.4, depth: 0.2 },
  { angle: 0.9, radius: 2.35, height: 3.5, speed: 0.17, scale: 0.21, phase: 2.1, depth: 0.1 },
  { angle: 1.7, radius: 2.95, height: 4.7, speed: 0.1, scale: 0.31, phase: 4.2, depth: 0.3 },
  { angle: 2.4, radius: 2.45, height: 5.5, speed: 0.15, scale: 0.2, phase: 1.3, depth: 0.1 },
  { angle: 3.2, radius: 2.8, height: 2.8, speed: 0.12, scale: 0.26, phase: 5.6, depth: 0.22 },
  { angle: 4.05, radius: 2.25, height: 4.1, speed: 0.18, scale: 0.18, phase: 3.2, depth: 0.1 },
  { angle: 4.7, radius: 3.05, height: 6.1, speed: 0.09, scale: 0.25, phase: 0.9, depth: 0.24 },
  { angle: 5.35, radius: 2.6, height: 3.1, speed: 0.14, scale: 0.23, phase: 4.8, depth: 0.14 },
  { angle: 5.95, radius: 2.9, height: 5.8, speed: 0.11, scale: 0.29, phase: 2.7, depth: 0.3 }
];

const heartPoint = (t: number): THREE.Vector2 => {
  const x = (16 * Math.pow(Math.sin(t), 3)) / 18;
  const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18;
  return new THREE.Vector2(x, y + 0.22);
};

export class HeartParticles {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly group = new THREE.Group();
  private readonly gatherGlow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private glowOpacity = 0;
  private readonly maxCount = 1500;
  private count = 600;
  private mode: HeartMode = 'orbit';
  private configuredMode: HeartMode = 'orbit';
  private tempGather = 0;
  private colorHex = '#FF5F91';
  private speed = 0.7;
  private size = 1;
  private height = 8;
  private targetOpacity = 1;
  private currentOpacity = 1;
  private enabled = true;
  private positions: Float32Array;
  private desired: Float32Array;
  private alphas: Float32Array;
  private readonly particles: HeartParticle[] = [];
  private readonly tempRight = new THREE.Vector3();
  private readonly tempUp = new THREE.Vector3();
  private readonly tempForward = new THREE.Vector3();
  private elapsed = 0;
  private readonly colors: Float32Array;

  constructor(count: number, color: string, speed: number, size: number) {
    this.count = clamp(Math.round(count), 120, this.maxCount);
    this.colorHex = color;
    this.speed = speed;
    this.size = size;
    this.group.name = 'heart-particles';

    this.positions = new Float32Array(this.maxCount * 3);
    this.desired = new Float32Array(this.maxCount * 3);
    this.alphas = new Float32Array(this.maxCount);
    this.colors = new Float32Array(this.maxCount * 3);
    const sizes = new Float32Array(this.maxCount);
    const rng = mulberry32(5201314);
    const primary = new THREE.Color(color);
    const secondary = primary.clone().lerp(new THREE.Color('#FFD2DA'), 0.58);
    const gold = new THREE.Color('#FFD36A');

    for (let i = 0; i < this.maxCount; i += 1) {
      const groupIndex = i % miniHearts.length;
      const t = rng() * Math.PI * 2;
      const fill = 0.6 + Math.pow(rng(), 0.6) * 0.4;
      const point = heartPoint(t);
      const colorChoice = rng();
      const color = colorChoice > 0.9 ? gold : primary.clone().lerp(secondary, rng() * 0.8);
      this.particles.push({
        group: groupIndex,
        heartX: point.x * fill,
        heartY: point.y * fill,
        jitterX: (rng() - 0.5) * 0.055,
        jitterY: (rng() - 0.5) * 0.05,
        jitterZ: (rng() - 0.5) * 0.12,
        size: 0.55 + rng() * 0.95,
        color,
        alpha: 1,
        driftOffset: rng()
      });
      sizes[i] = 0.65 + rng() * 0.9;
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      this.alphas[i] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.setDrawRange(0, this.count);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 12);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: this.size },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uOpacity: { value: 1 }
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
    this.points.renderOrder = 6;
    this.group.add(this.points);

    const glowTexture = this.createGlowTexture();
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    this.gatherGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial);
    this.gatherGlow.visible = false;
    this.gatherGlow.renderOrder = 5;
    this.group.add(this.gatherGlow);

    this.initializeOrbitPositions();
  }

  private createGlowTexture(): THREE.CanvasTexture {
    return makeCanvasTexture(512, 512, (ctx) => {
      ctx.clearRect(0, 0, 512, 512);
      const drawHeart = (lineWidth: number, alpha: number, blur: number): void => {
        ctx.save();
        ctx.translate(256, 250);
        ctx.scale(1, -1);
        ctx.beginPath();
        for (let i = 0; i <= 180; i += 1) {
          const t = (i / 180) * Math.PI * 2;
          const x = (16 * Math.pow(Math.sin(t), 3)) / 18 * 195;
          const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18 * 195;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 214, 226, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255, 120, 158, 0.8)';
        ctx.shadowBlur = blur;
        ctx.stroke();
        ctx.restore();
      };
      drawHeart(20, 0.14, 62);
      drawHeart(7, 0.55, 28);
      drawHeart(2.4, 0.9, 10);
      const fill = ctx.createRadialGradient(256, 250, 20, 256, 250, 220);
      fill.addColorStop(0, 'rgba(255, 130, 160, 0.055)');
      fill.addColorStop(1, 'rgba(255, 88, 130, 0)');
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 512, 512);
    });
  }

  private initializeOrbitPositions(): void {
    const right = this.tempRight;
    const up = this.tempUp;
    const forward = this.tempForward;
    right.set(1, 0, 0);
    up.set(0, 1, 0);
    forward.set(0, 0, 1);
    for (let i = 0; i < this.maxCount; i += 1) {
      const particle = this.particles[i];
      const heart = miniHearts[particle.group];
      const centerX = Math.cos(heart.angle) * heart.radius;
      const centerZ = Math.sin(heart.angle) * heart.radius;
      const centerY = heart.height;
      this.positions[i * 3] =
        centerX + right.x * particle.heartX * heart.scale * 2.2 + up.x * particle.heartY * heart.scale * 2.2;
      this.positions[i * 3 + 1] =
        centerY + right.y * particle.heartX * heart.scale * 2.2 + up.y * particle.heartY * heart.scale * 2.2;
      this.positions[i * 3 + 2] =
        centerZ + right.z * particle.heartX * heart.scale * 2.2 + up.z * particle.heartY * heart.scale * 2.2;
    }
  }

  setCount(count: number): void {
    this.count = clamp(Math.round(count), 120, this.maxCount);
    this.points.geometry.setDrawRange(0, this.count);
  }

  setColor(hex: string): void {
    if (hex === this.colorHex) return;
    this.colorHex = hex;
    const primary = new THREE.Color(hex);
    const secondary = primary.clone().lerp(new THREE.Color('#FFE1E6'), 0.56);
    const gold = new THREE.Color('#FFD36A');
    this.gatherGlow.material.color.copy(primary).lerp(new THREE.Color('#FFE2E8'), 0.35);
    const colorAttribute = this.points.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const array = colorAttribute.array as Float32Array;
    const rng = mulberry32(9081);
    for (let i = 0; i < this.maxCount; i += 1) {
      const choice = rng();
      const color = choice > 0.9 ? gold : primary.clone().lerp(secondary, rng());
      array[i * 3] = color.r;
      array[i * 3 + 1] = color.g;
      array[i * 3 + 2] = color.b;
    }
    colorAttribute.needsUpdate = true;
  }

  setSize(size: number): void {
    this.size = size;
    this.points.material.uniforms.uSize.value = size;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  setMode(mode: HeartMode): void {
    this.mode = mode;
    this.configuredMode = mode;
    this.tempGather = 0;
  }

  setLayout(height: number): void {
    this.height = height;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.targetOpacity = enabled ? 1 : 0;
  }

  setOpacity(opacity: number): void {
    this.targetOpacity = clamp(opacity, 0, 1);
  }

  pulseGather(duration = 3.2): void {
    this.tempGather = duration;
    this.points.visible = true;
  }

  update(dt: number, time: number, camera: THREE.Camera): void {
    this.elapsed += dt;
    this.currentOpacity = damp(this.currentOpacity, this.targetOpacity, 3.2, dt);
    const material = this.points.material;
    material.uniforms.uOpacity.value = this.currentOpacity;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    material.uniforms.uSize.value = this.size;
    this.points.visible = this.currentOpacity > 0.005;

    if (this.tempGather > 0) {
      this.tempGather -= dt;
      if (this.tempGather <= 0) {
        this.mode = this.configuredMode;
      }
    }
    const activeMode: HeartMode = this.tempGather > 0 ? 'gather' : this.mode;

    camera.updateMatrixWorld();
    const right = this.tempRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const up = this.tempUp.setFromMatrixColumn(camera.matrixWorld, 1);
    const forward = this.tempForward.setFromMatrixColumn(camera.matrixWorld, 2);

    const gatherCenterY = this.height * 0.52;
    const gatherScale = Math.min(3.65, this.height * 0.43);
    const damping = 1 - Math.exp(-dt * (1.25 + this.speed * 1.1));
    const timeScaled = time * this.speed;
    material.uniforms.uSize.value = this.size * (activeMode === 'gather' ? 1.2 : 1);

    this.glowOpacity = damp(this.glowOpacity, activeMode === 'gather' ? 1 : 0, 3.4, dt);
    const glow = this.gatherGlow;
    glow.visible = this.glowOpacity > 0.01;
    if (glow.visible) {
      const scale = gatherScale * 2.05;
      glow.position.set(0, gatherCenterY, 0.04);
      glow.quaternion.copy(camera.quaternion);
      glow.scale.set(scale, scale, 1);
      glow.material.opacity =
        this.glowOpacity *
        this.currentOpacity *
        (0.34 + Math.sin(time * 1.2) * 0.035);
    }

    for (let i = 0; i < this.count; i += 1) {
      const particle = this.particles[i];
      const heart = miniHearts[particle.group];
      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;
      let alphaTarget = 1;

      if (activeMode === 'gather') {
        const rotation = Math.sin(time * 0.16) * 0.08;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const hx = particle.heartX * gatherScale;
        const hy = particle.heartY * gatherScale;
        const x = hx * cos - hy * sin;
        const y = hx * sin + hy * cos;
        const breathe = 1 + Math.sin(timeScaled * 0.8) * 0.035;
        targetX = right.x * x * breathe + up.x * y * breathe + forward.x * (particle.jitterZ * 0.5);
        targetY = gatherCenterY + right.y * x * breathe + up.y * y * breathe + forward.y * (particle.jitterZ * 0.5);
        targetZ = right.z * x * breathe + up.z * y * breathe + forward.z * (particle.jitterZ * 0.5);
      } else if (activeMode === 'drift') {
        const life = (time * 0.07 * (0.8 + this.speed) + particle.driftOffset) % 1;
        const centerAngle = heart.angle + timeScaled * heart.speed * 0.5;
        const radius = heart.radius + Math.sin(time * 0.4 + heart.phase) * 0.18;
        const scale = heart.scale * 2.1;
        const hx = particle.heartX * scale;
        const hy = particle.heartY * scale;
        const centerY = 0.9 + life * (this.height + 1.2);
        targetX = Math.cos(centerAngle) * radius + right.x * hx + up.x * hy + particle.jitterX;
        targetY = centerY + right.y * hx + up.y * hy + particle.jitterY;
        targetZ = Math.sin(centerAngle) * radius + right.z * hx + up.z * hy + particle.jitterZ;
        alphaTarget = Math.sin(life * Math.PI) * 0.92;
      } else {
        const centerAngle = heart.angle + timeScaled * heart.speed;
        const radius = heart.radius + Math.sin(time * 0.42 + heart.phase) * 0.15;
        const centerY = heart.height + Math.sin(time * 0.5 + heart.phase) * 0.16;
        const scale = heart.scale * 2.2;
        const hx = particle.heartX * scale;
        const hy = particle.heartY * scale;
        targetX = Math.cos(centerAngle) * radius + right.x * hx + up.x * hy;
        targetY = centerY + right.y * hx + up.y * hy;
        targetZ = Math.sin(centerAngle) * radius + right.z * hx + up.z * hy;
      }

      this.desired[i * 3] = targetX;
      this.desired[i * 3 + 1] = targetY;
      this.desired[i * 3 + 2] = targetZ;
      this.positions[i * 3] += (targetX - this.positions[i * 3]) * damping;
      this.positions[i * 3 + 1] += (targetY - this.positions[i * 3 + 1]) * damping;
      this.positions[i * 3 + 2] += (targetZ - this.positions[i * 3 + 2]) * damping;
      this.alphas[i] = damp(this.alphas[i], alphaTarget, 4.2, dt);
    }

    const positionAttribute = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    const alphaAttribute = this.points.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    alphaAttribute.needsUpdate = true;
  }

  get currentMode(): HeartMode {
    return this.mode;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.gatherGlow.geometry.dispose();
    this.gatherGlow.material.map?.dispose();
    this.gatherGlow.material.dispose();
  }
}
