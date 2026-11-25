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
    vec3 color = mix(vec3(1.0, 0.72, 0.84), vec3(1.0, 0.84, 0.54), vGlow) * (halo * 0.5 + core * 1.3);
    float alpha = (halo * 0.3 + core * 0.75) * vAlpha;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** The F3 hero topper: a faceted, translucent 3D crystal heart. */
export class TreeStar {
  readonly root = new THREE.Group();
  readonly starMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private readonly edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  private readonly innerHeart: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly sparkles: THREE.Points;
  private readonly halo: THREE.Sprite;
  private readonly coreGlow: THREE.Sprite;
  private readonly light: THREE.PointLight;
  private flashAmount = 0;
  private time = 0;
  private baseY = 0;

  constructor(height: number) {
    this.root.name = 'tree-top-crystal-heart';
    this.baseY = height + 0.55;
    this.root.position.set(0, this.baseY, 0);

    const geometry = this.createHeartGeometry();
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFB6D0'),
      emissive: new THREE.Color('#FF6E9F'),
      emissiveIntensity: 0.24,
      metalness: 0.08,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      transparent: true,
      opacity: 0.94,
      flatShading: true,
      envMapIntensity: 1.35
    });
    this.starMesh = new THREE.Mesh(geometry, material);
    this.starMesh.userData.pickType = 'star';
    this.starMesh.userData.interactive = true;
    this.starMesh.name = 'tree-crystal-heart-mesh';
    this.starMesh.castShadow = false;
    this.starMesh.receiveShadow = false;
    this.root.add(this.starMesh);

    this.edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 12),
      new THREE.LineBasicMaterial({
        color: '#FFE8B4',
        transparent: true,
        opacity: 0.32,
        depthWrite: false
      })
    );
    this.edges.scale.setScalar(1.012);
    this.root.add(this.edges);

    const innerGeometry = new THREE.ExtrudeGeometry(this.createHeartShape(), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 16
    });
    innerGeometry.center();
    innerGeometry.scale(0.52, 0.52, 0.52);
    this.innerHeart = new THREE.Mesh(
      innerGeometry,
      new THREE.MeshBasicMaterial({
        color: '#FF9FC3',
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.innerHeart.position.z = 0.01;
    this.root.add(this.innerHeart);

    const haloTexture = this.createSoftGlowTexture(
      'rgba(255, 196, 216, 0.52)',
      'rgba(255, 117, 169, 0)'
    );
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        color: 0xffb1ce,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      })
    );
    this.halo.scale.set(2.2, 2.05, 1);
    this.halo.position.z = -0.06;
    this.root.add(this.halo);

    const coreTexture = this.createSoftGlowTexture(
      'rgba(255,255,250,0.9)',
      'rgba(255,150,190,0)',
      0.18
    );
    this.coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreTexture,
        color: 0xffe5ef,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.coreGlow.scale.set(0.82, 0.74, 1);
    this.root.add(this.coreGlow);

    this.sparkles = this.createSparkles();
    this.root.add(this.sparkles);

    this.light = new THREE.PointLight(0xffb8cc, 2.8, 8, 2);
    this.light.position.set(0, 0.05, 0.2);
    this.root.add(this.light);
  }

  private createHeartShape(): THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.06, -0.24, 0.52, 0.0, 0.52, 0.29);
    shape.bezierCurveTo(0.52, 0.64, 0.05, 0.7, 0, 0.34);
    shape.bezierCurveTo(-0.05, 0.7, -0.52, 0.64, -0.52, 0.29);
    shape.bezierCurveTo(-0.52, 0.0, -0.06, -0.24, 0, -0.5);
    shape.closePath();
    return shape;
  }

  private createHeartGeometry(): THREE.BufferGeometry {
    // A low-poly crystal heart rather than a rounded extrusion: front/back
    // pyramid fans + a side band create visible gemstone facets and the exact
    // 0.95 × 0.85 × 0.22 target dimensions.
    const outline = this.createHeartShape().getPoints(64);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of outline) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    const sx = 0.95 / Math.max(0.001, maxX - minX);
    const sy = 0.85 / Math.max(0.001, maxY - minY);
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const ring = outline.map(
      (point) => new THREE.Vector3((point.x - cx) * sx, (point.y - cy) * sy, 0)
    );
    const n = ring.length;
    const positions: number[] = [0, 0, 0.11, 0, 0, -0.11];
    const indices: number[] = [];
    for (let i = 0; i < n; i += 1) {
      positions.push(ring[i].x, ring[i].y, 0.055);
    }
    for (let i = 0; i < n; i += 1) {
      positions.push(ring[i].x, ring[i].y, -0.055);
    }
    const frontStart = 2;
    const backStart = 2 + n;
    for (let i = 0; i < n; i += 1) {
      const next = (i + 1) % n;
      indices.push(0, frontStart + i, frontStart + next);
      indices.push(1, backStart + next, backStart + i);
      indices.push(frontStart + i, backStart + i, backStart + next);
      indices.push(frontStart + i, backStart + next, frontStart + next);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
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
      gradient.addColorStop(0.72, 'rgba(255, 170, 194, 0.025)');
      gradient.addColorStop(1, outer);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    });
  }

  private createSparkles(): THREE.Points {
    const count = 80;
    const rng = mulberry32(1314520);
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = 0.3 + Math.pow(rng(), 0.65) * 0.94;
      const y = (rng() - 0.5) * 1.25;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y * 0.8 + (rng() - 0.5) * 0.12;
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
    this.baseY = height + 0.55;
    this.root.position.y = this.baseY;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, time: number): void {
    this.time = time;
    this.flashAmount = Math.max(0, this.flashAmount - dt * 0.7);

    const idleFlash = Math.pow(Math.max(0, Math.sin(time * 0.62 - 0.9)), 26);
    const pulse = 0.5 + Math.sin(time * 1.25) * 0.08 + idleFlash * 0.55 + this.flashAmount * 1.2;

    this.root.position.y = this.baseY + Math.sin(time * 0.72) * 0.055;
    this.starMesh.rotation.y = time * 0.12;
    this.starMesh.rotation.x = Math.sin(time * 0.27) * 0.05;
    this.starMesh.rotation.z = Math.sin(time * 0.22) * 0.025;
    this.starMesh.material.emissiveIntensity = 0.2 + pulse * 0.24 + this.flashAmount * 0.8;
    this.innerHeart.rotation.y = -time * 0.12;
    this.innerHeart.scale.setScalar(0.92 + pulse * 0.08);

    this.halo.material.opacity = 0.34 + pulse * 0.18 + this.flashAmount * 0.24;
    const haloScale = 2.0 + pulse * 0.32 + this.flashAmount * 0.9;
    this.halo.scale.set(haloScale, haloScale * 0.94, 1);
    this.coreGlow.material.opacity = 0.4 + pulse * 0.2;
    const coreScale = 0.74 + pulse * 0.14 + this.flashAmount * 0.28;
    this.coreGlow.scale.set(coreScale, coreScale * 0.9, 1);
    this.light.intensity = 2.0 + pulse * 2.5 + this.flashAmount * 5;

    const material = this.sparkles.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = time;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    this.sparkles.rotation.y = -time * 0.1;
    this.sparkles.rotation.z = Math.sin(time * 0.22) * 0.04;
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
