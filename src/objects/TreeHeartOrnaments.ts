import * as THREE from 'three';
import { clamp, mulberry32 } from '../core/utils';

export interface TreeHeartConfig {
  height: number;
  crownRadius: number;
}

interface HeartInstance {
  group: number;
  index: number;
  base: THREE.Vector3;
  phase: number;
  yaw: number;
  scale: number;
  bob: number;
}

const HEART_VARIANTS = [
  {
    name: 'rose-gold',
    material: () =>
      new THREE.MeshStandardMaterial({
        color: '#C98086',
        metalness: 0.74,
        roughness: 0.24,
        envMapIntensity: 1.15
      })
  },
  {
    name: 'pink-crystal',
    material: () =>
      new THREE.MeshPhysicalMaterial({
        color: '#FF9CC2',
        emissive: '#7A203E',
        emissiveIntensity: 0.22,
        metalness: 0.06,
        roughness: 0.12,
        transparent: true,
        opacity: 0.94,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.2
      })
  },
  {
    name: 'champagne-glass',
    material: () =>
      new THREE.MeshPhysicalMaterial({
        color: '#E9CBA0',
        metalness: 0.1,
        roughness: 0.14,
        transparent: true,
        opacity: 0.9,
        clearcoat: 0.9,
        envMapIntensity: 1.15
      })
  },
  {
    name: 'pearl-white',
    material: () =>
      new THREE.MeshStandardMaterial({
        color: '#FFF1E8',
        metalness: 0.24,
        roughness: 0.18,
        envMapIntensity: 1.2
      })
  }
] as const;

const createHeartGeometry = (): THREE.ExtrudeGeometry => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.05, -0.24, 0.5, 0.02, 0.5, 0.3);
  shape.bezierCurveTo(0.5, 0.62, 0.05, 0.68, 0, 0.34);
  shape.bezierCurveTo(-0.05, 0.68, -0.5, 0.62, -0.5, 0.3);
  shape.bezierCurveTo(-0.5, 0.02, -0.05, -0.24, 0, -0.5);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 16,
    steps: 1
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

/**
 * 48 real 3D heart ornaments, batched into four InstancedMesh groups so that
 * four distinct jewel materials do not cost 48 draw calls.
 */
export class TreeHeartOrnaments {
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[] = [];
  private materials: THREE.Material[] = [];
  private geometry: THREE.ExtrudeGeometry | null = null;
  private instances: HeartInstance[] = [];
  private enabled = true;
  private readonly matrix = new THREE.Matrix4();
  private readonly quaternion = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly baseQuaternion = new THREE.Quaternion();

  constructor(config: TreeHeartConfig) {
    this.group.name = 'tree-heart-ornaments';
    this.build(config);
  }

  build(config: TreeHeartConfig): void {
    this.clear();
    this.geometry = createHeartGeometry();
    const height = Math.max(4, config.height);
    const crown = Math.max(1.5, config.crownRadius);
    const bottom = clamp(height * 0.11, 0.8, 1.35);
    const top = height - 0.72;
    const rng = mulberry32(480520);
    const counts = [12, 12, 12, 12];

    for (let variant = 0; variant < HEART_VARIANTS.length; variant += 1) {
      const material = HEART_VARIANTS[variant].material();
      this.materials.push(material);
      const mesh = new THREE.InstancedMesh(this.geometry, material, counts[variant]);
      mesh.name = `heart-ornaments-${HEART_VARIANTS[variant].name}`;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }

    for (let i = 0; i < 48; i += 1) {
      const groupIndex = i % 4;
      const localIndex = Math.floor(i / 4);
      const t = 0.08 + rng() * 0.82;
      const y = bottom + (top - bottom) * t;
      const envelope = crown * Math.pow(1 - t, 0.84);
      const angle = rng() * Math.PI * 2 + t * 1.4;
      const radius = Math.max(0.14, envelope * (1.01 + rng() * 0.08) + 0.06);
      const base = new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      const phase = rng() * Math.PI * 2;
      // The base geometry is ~1 unit wide; ornaments need to read as jewels,
      // not as white flowers sitting on the branches.
      const scale = 0.38 + rng() * 0.14;
      const instance: HeartInstance = {
        group: groupIndex,
        index: localIndex,
        base,
        phase,
        yaw: angle + Math.PI * 0.5,
        scale,
        bob: 0.016 + rng() * 0.03
      };
      this.instances.push(instance);
      this.writeInstance(instance, 0);
    }
    this.meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    this.group.visible = this.enabled;
  }

  private writeInstance(instance: HeartInstance, time: number): void {
    const mesh = this.meshes[instance.group];
    if (!mesh) return;
    this.position.copy(instance.base);
    this.position.y += Math.sin(time * 0.85 + instance.phase) * instance.bob;
    this.euler.set(
      Math.sin(time * 0.37 + instance.phase) * 0.12,
      instance.yaw + Math.sin(time * 0.28 + instance.phase) * 0.18,
      Math.sin(time * 0.31 + instance.phase) * 0.08
    );
    this.quaternion.setFromEuler(this.euler).multiply(this.baseQuaternion);
    this.scale.setScalar(instance.scale);
    this.matrix.compose(this.position, this.quaternion, this.scale);
    mesh.setMatrixAt(instance.index, this.matrix);
  }

  update(dt: number, time: number): void {
    if (!this.enabled) return;
    for (const instance of this.instances) {
      this.writeInstance(instance, time);
    }
    this.meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.group.visible = enabled;
  }

  setBrightness(brightness: number): void {
    for (const material of this.materials) {
      if ('emissiveIntensity' in material) {
        (material as THREE.MeshStandardMaterial).emissiveIntensity *= 1;
      }
      material.opacity = clamp(brightness, 0.7, 1.2);
    }
  }

  private clear(): void {
    for (const mesh of this.meshes) {
      this.group.remove(mesh);
      mesh.dispose();
    }
    this.meshes = [];
    this.materials.forEach((material) => material.dispose());
    this.materials = [];
    this.geometry?.dispose();
    this.geometry = null;
    this.instances = [];
  }

  dispose(): void {
    this.clear();
  }
}
