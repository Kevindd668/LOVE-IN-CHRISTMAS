import * as THREE from 'three';
import { makeCanvasTexture, mulberry32 } from '../core/utils';

const SPARKLE_VERTEX = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float flicker = 0.45 + 0.55 * sin(uTime * 1.6 + aPhase);
    gl_PointSize = clamp(aSize * (0.7 + flicker * 1.4) * uPixelRatio * (170.0 / max(1.0, -mvPosition.z)), 0.0, 18.0);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = 0.25 + flicker * 0.75;
    vGlow = flicker;
  }
`;

const SPARKLE_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying float vGlow;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float halo = 1.0 - smoothstep(0.18, 1.0, d);
    vec3 color = vec3(1.0, 0.81, 0.44) * (halo * 0.5 + core * 1.3);
    float alpha = (halo * 0.3 + core * 0.75) * vAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class TreeStar {
  readonly root = new THREE.Group();
  readonly starMesh: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>;
  private readonly sparkles: THREE.Points;
  private readonly halo: THREE.Sprite;
  private readonly coreGlow: THREE.Sprite;
  private readonly light: THREE.PointLight;
  private flashAmount = 0;
  private time = 0;

  constructor(height: number) {
    this.root.name = 'tree-top-star';
    this.root.position.set(0, height + 0.2, 0);

    const geometry = this.createStarGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFD36A'),
      metalness: 0.92,
      roughness: 0.22,
      emissive: new THREE.Color('#B87828'),
      emissiveIntensity: 0.65,
      envMapIntensity: 1.45
    });
    this.starMesh = new THREE.Mesh(geometry, material);
    this.starMesh.userData.pickType = 'star';
    this.starMesh.userData.interactive = true;
    this.starMesh.castShadow = false;
    this.starMesh.name = 'tree-star-mesh';
    this.root.add(this.starMesh);

    const centerJewel = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff1cf,
        metalness: 0.5,
        roughness: 0.15,
        emissive: 0xffce82,
        emissiveIntensity: 0.8
      })
    );
    centerJewel.position.z = 0.07;
    this.root.add(centerJewel);

    const haloTexture = this.createSoftGlowTexture(
      'rgba(255, 224, 163, 0.52)',
      'rgba(255, 176, 67, 0)'
    );
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        color: 0xffd391,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      })
    );
    this.halo.scale.set(2.15, 2.15, 1);
    this.halo.position.z = -0.05;
    this.root.add(this.halo);

    const coreTexture = this.createSoftGlowTexture(
      'rgba(255,255,245,0.9)',
      'rgba(255,192,97, 0)',
      0.18
    );
    this.coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreTexture,
        color: 0xffe8bc,
        transparent: true,
        opacity: 0.66,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.coreGlow.scale.set(0.66, 0.66, 1);
    this.root.add(this.coreGlow);

    this.sparkles = this.createSparkles();
    this.root.add(this.sparkles);

    this.light = new THREE.PointLight(0xffcc82, 2.8, 8, 2);
    this.light.position.set(0, 0.1, 0.2);
    this.root.add(this.light);
  }

  private createSoftGlowTexture(
    inner: string,
    outer: string,
    falloff = 0.12
  ): THREE.CanvasTexture {
    return makeCanvasTexture(512, 512, (ctx) => {
      const center = 256;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, inner);
      gradient.addColorStop(falloff, inner.replace(/[\d.]+\)$/, '0.34)'));
      gradient.addColorStop(Math.min(0.92, falloff + 0.2), inner.replace(/[\d.]+\)$/, '0.09)'));
      gradient.addColorStop(0.72, 'rgba(255, 203, 120, 0.025)');
      gradient.addColorStop(1, outer);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    });
  }

  private createStarGeometry(): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    const outer = 0.42;
    const inner = 0.17;
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.024,
      bevelSegments: 3,
      curveSegments: 12,
      steps: 1
    });
    geometry.center();
    return geometry;
  }

  private createSparkles(): THREE.Points {
    const count = 80;
    const rng = mulberry32(1314520);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = 0.32 + Math.pow(rng(), 0.65) * 1.1;
      const y = (rng() - 0.5) * 1.65;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y * 0.8 + (rng() - 0.5) * 0.15;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.38;
      phases[i] = rng() * Math.PI * 2;
      sizes[i] = 0.5 + rng() * 1.1;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: SPARKLE_VERTEX,
      fragmentShader: SPARKLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  setHeight(height: number): void {
    this.root.position.y = height + 0.2;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, time: number): void {
    this.time = time;
    this.flashAmount = Math.max(0, this.flashAmount - dt * 0.7);

    const idleFlash = Math.pow(Math.max(0, Math.sin(time * 0.62 - 0.9)), 26);
    const pulse = 0.5 + Math.sin(time * 1.25) * 0.08 + idleFlash * 0.55 + this.flashAmount * 1.2;

    this.starMesh.rotation.z = time * ((Math.PI * 2) / 8);
    this.starMesh.rotation.y = Math.sin(time * 0.37) * 0.14;
    this.starMesh.rotation.x = Math.sin(time * 0.27) * 0.04;
    this.starMesh.material.emissiveIntensity = 0.55 + pulse * 0.62 + this.flashAmount * 1.2;

    this.halo.material.opacity = 0.34 + pulse * 0.18 + this.flashAmount * 0.24;
    const haloScale = 1.95 + pulse * 0.36 + this.flashAmount * 1.0;
    this.halo.scale.set(haloScale, haloScale, 1);
    this.coreGlow.material.opacity = 0.42 + pulse * 0.22;
    const coreScale = 0.58 + pulse * 0.16 + this.flashAmount * 0.35;
    this.coreGlow.scale.set(coreScale, coreScale, 1);
    this.light.intensity = 2.1 + pulse * 2.8 + this.flashAmount * 6;

    const material = this.sparkles.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = time;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    this.sparkles.rotation.y = -time * 0.12;
    this.sparkles.rotation.z = Math.sin(time * 0.22) * 0.06;
  }

  getPickMeshes(): THREE.Object3D[] {
    return [this.starMesh];
  }

  dispose(): void {
    this.root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if ('map' in material && material.map instanceof THREE.Texture) {
            material.map.dispose();
          }
          material.dispose();
        });
      }
    });
  }
}
