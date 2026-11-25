import * as THREE from 'three';
import { clamp, mulberry32 } from '../core/utils';

export interface TreeConfig {
  height: number;
  crownRadius: number;
  density: number;
  layers: number;
  foliageColor: string;
}

interface SprigInstance {
  matrix: THREE.Matrix4;
  colorChoice: number;
  shade: number;
}

interface SprigBatch {
  mesh: THREE.InstancedMesh;
  instances: SprigInstance[];
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

interface TreePalette {
  main: THREE.Color;
  shadow: THREE.Color;
  highlight: THREE.Color;
  frost: THREE.Color;
  core: THREE.Color;
  arm: THREE.Color;
}

const SPRIG_VARIANTS = 3;
const SPRIG_TRIANGLES = 44;

const createTreePalette = (hex: string): TreePalette => {
  const main = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  main.getHSL(hsl);

  const shadow = new THREE.Color().setHSL(
    hsl.h,
    clamp(hsl.s * 0.92, 0, 1),
    Math.max(0.05, hsl.l * 0.44)
  );
  const highlight = new THREE.Color().setHSL(
    (hsl.h + 0.012) % 1,
    clamp(hsl.s * 1.02, 0, 1),
    clamp(hsl.l * 0.56 + 0.17, 0, 0.52)
  );
  const frost = main.clone().lerp(new THREE.Color('#bccfbe'), 0.44);
  frost.offsetHSL(0, -0.04, 0.025);
  const core = new THREE.Color().setHSL(
    hsl.h,
    clamp(hsl.s * 0.7, 0, 1),
    Math.max(0.012, hsl.l * 0.13)
  );
  const arm = core.clone().lerp(new THREE.Color('#493525'), 0.5);
  return { main, shadow, highlight, frost, core, arm };
};

const getPaletteColor = (palette: TreePalette, choice: number): THREE.Color => {
  switch (choice) {
    case 1:
      return palette.shadow;
    case 2:
      return palette.highlight;
    case 3:
      return palette.frost;
    default:
      return palette.main;
  }
};

const makeBarkTexture = (): THREE.CanvasTexture => {
  const width = 192;
  const height = 384;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#2b1b13');
  gradient.addColorStop(0.3, '#5b3926');
  gradient.addColorStop(0.55, '#3c2619');
  gradient.addColorStop(0.8, '#694730');
  gradient.addColorStop(1, '#2a1a12');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const rng = mulberry32(9091);
  for (let i = 0; i < 130; i += 1) {
    const x = rng() * width;
    const lineWidth = rng() * 3 + 0.4;
    ctx.strokeStyle = `rgba(${20 + rng() * 40}, ${12 + rng() * 24}, ${8 + rng() * 15}, ${0.15 + rng() * 0.36})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    let currentX = x;
    for (let y = 0; y < height; y += 18) {
      currentX += (rng() - 0.5) * 3.8;
      ctx.lineTo(currentX, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 100; i += 1) {
    ctx.fillStyle = `rgba(229, 198, 153, ${rng() * 0.06})`;
    ctx.fillRect(rng() * width, rng() * height, rng() * 3 + 0.5, rng() * 12 + 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const createSprigGeometry = (seed: number): THREE.BufferGeometry => {
  const rng = mulberry32(seed);
  const positions: number[] = [];
  const colors: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const pushVertex = (
    x: number,
    y: number,
    z: number,
    shade: number,
    normalX: number,
    normalY: number,
    normalZ: number
  ): number => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    colors.push(shade, shade * 0.985, shade * 0.95);
    normals.push(normalX, normalY, normalZ);
    return index;
  };

  // Needles form a loose, irregular spray around a central axis (+Z).
  for (let i = 0; i < SPRIG_TRIANGLES; i += 1) {
    const along = 0.04 + rng() * 0.9;
    const angle = rng() * Math.PI * 2;
    const length = (0.12 + rng() * 0.22) * (1.1 - along * 0.28);
    const baseX = Math.cos(angle) * 0.01;
    const baseY = Math.sin(angle) * 0.006;
    const baseZ = along;
    const tipX = baseX + Math.cos(angle) * length;
    const tipY = baseY + Math.sin(angle) * length * 0.62;
    const tipZ = baseZ + 0.035 + length * 0.55;
    const width = 0.011 + rng() * 0.008;
    const sideX = -Math.sin(angle) * width;
    const sideY = Math.cos(angle) * width;
    const shadeBase = 0.34 + rng() * 0.16;
    const shadeTip = 0.7 + rng() * 0.22;

    const a = pushVertex(baseX + sideX, baseY + sideY, baseZ, shadeBase, 0, 0, 1);
    const b = pushVertex(baseX - sideX, baseY - sideY, baseZ, shadeBase, 0, 0, 1);
    const c = pushVertex(tipX, tipY, tipZ, shadeTip, 0, 0, 1);
    indices.push(a, b, c);

    if (rng() > 0.58) {
      // A few needles catch light from a second angle, creating depth in the spray.
      const a2 = pushVertex(baseX, baseY, baseZ - 0.01, shadeBase * 0.8, 0, 1, 0);
      const b2 = pushVertex(tipX, tipY - 0.005, tipZ, shadeTip, 0, 1, 0);
      const c2 = pushVertex(baseX, baseY + 0.012, baseZ + 0.07, shadeBase * 0.95, 0, 1, 0);
      indices.push(a2, b2, c2);
    }
  }

  // Slender central twig.
  const twigShade = 0.38;
  const twigWidth = 0.011;
  const t1 = pushVertex(-twigWidth, -twigWidth, 0, twigShade, 0, 1, 0);
  const t2 = pushVertex(twigWidth, -twigWidth, 0.02, twigShade, 0, 1, 0);
  const t3 = pushVertex(0, 0.012, 1.02, 0.5, 0, 1, 0);
  indices.push(t1, t2, t3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
};

const createTierGeometry = (
  radius: number,
  apexY: number,
  rimY: number,
  seed: number
): THREE.BufferGeometry => {
  const rng = mulberry32(seed);
  const segments = 64;
  const topRings = [0.025, 0.14, 0.3, 0.48, 0.66, 0.82, 0.93, 1];
  const underRings = [1.025, 0.91, 0.72];
  const drop = apexY - rimY;
  const phase = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rowStride = segments;

  const addRing = (
    radiusFactor: number,
    heightFactor: number,
    isUnder: boolean,
    underAmount: number
  ): void => {
    for (let j = 0; j < segments; j += 1) {
      const angle = (j / segments) * Math.PI * 2;
      const wave =
        1 +
        Math.sin(angle * 6 + phase) * 0.032 * Math.pow(radiusFactor, 2) +
        Math.sin(angle * 13 + phase2) * 0.015;
      const rimWave =
        Math.sin(angle * 7 + phase * 1.7) * 0.06 * Math.pow(radiusFactor, 3);

      const radial = radius * radiusFactor * wave;
      const height = apexY - drop * heightFactor + rimWave;
      const foldedHeight = isUnder
        ? rimY - underAmount - Math.sin(angle * 5 + phase) * 0.018
        : height;

      positions.push(
        Math.cos(angle) * radial,
        foldedHeight,
        Math.sin(angle) * radial
      );

      const frontShade = 0.4 + 0.7 * Math.pow(radiusFactor, 0.65);
      const underShade = 0.24 + 0.18 * (1 - underAmount);
      const shade = isUnder ? underShade : clamp(frontShade, 0.2, 1.08);
      colors.push(shade, shade, shade);
    }
  };

  for (let i = 0; i < topRings.length; i += 1) {
    const f = topRings[i];
    const radiusFactor = Math.pow(f, 0.82);
    const heightFactor = Math.pow(f, 1.34);
    addRing(radiusFactor, heightFactor, false, 0);
  }

  for (let i = 0; i < underRings.length; i += 1) {
    addRing(underRings[i], 1, true, 0.13 + i * 0.095);
  }

  const totalRows = topRings.length + underRings.length;
  for (let row = 0; row < totalRows - 1; row += 1) {
    for (let j = 0; j < segments; j += 1) {
      const next = (j + 1) % segments;
      const a = row * rowStride + j;
      const b = row * rowStride + next;
      const c = (row + 1) * rowStride + j;
      const d = (row + 1) * rowStride + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Small dark cap so the very top of a tier is never transparent.
  const centerIndex = positions.length / 3;
  positions.push(0, apexY, 0);
  colors.push(0.36, 0.36, 0.36);
  for (let j = 0; j < segments; j += 1) {
    const next = (j + 1) % segments;
    indices.push(centerIndex, next, j);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
};

export class TreeBranches {
  readonly group = new THREE.Group();
  private palette: TreePalette;
  private sprigBatches: SprigBatch[] = [];
  private coreMeshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  private branchArmMaterial: THREE.MeshStandardMaterial | null = null;
  private proxy: THREE.Mesh | null = null;
  private currentConfig: TreeConfig | null = null;
  private readonly barkTexture = makeBarkTexture();
  private readonly snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9f1f1,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.24
  });
  private readonly proxyMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });

  constructor(config: TreeConfig) {
    this.group.name = 'procedural-christmas-tree';
    this.palette = createTreePalette(config.foliageColor);
    this.build(config);
  }

  build(config: TreeConfig): void {
    this.currentConfig = config;
    this.palette = createTreePalette(config.foliageColor);
    this.clear();
    this.group.rotation.set(0, 0, 0);

    const height = config.height;
    const crown = config.crownRadius;
    const layers = clamp(Math.round(config.layers), 4, 12);
    const density = clamp(Math.round(config.density), 50, 400);
    const trunkHeight = clamp(height * 0.135, 0.75, 1.35);
    const trunkRadius = clamp(0.14 + crown * 0.032, 0.18, 0.3);
    const foliageBottom = trunkHeight * 0.91;

    this.buildTrunk(trunkHeight, trunkRadius, crown);
    this.buildTierCores(height, crown, layers, foliageBottom);
    this.buildSprigs(height, crown, layers, density, foliageBottom);
    this.buildOrnaments(height, crown, foliageBottom);
    this.buildSnowMounds(crown);
    this.buildProxy(height, crown);
  }

  private buildOrnaments(height: number, crown: number, foliageBottom: number): void {
    const count = 34;
    const geometry = new THREE.SphereGeometry(1, 12, 9);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.32,
      envMapIntensity: 0.75
    });
    const ornaments = new THREE.InstancedMesh(geometry, material, count);
    const rng = mulberry32(82109);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const palette = [
      new THREE.Color('#c79a4e'),
      new THREE.Color('#d8c29c'),
      new THREE.Color('#682431'),
      new THREE.Color('#a96569')
    ];

    for (let i = 0; i < count; i += 1) {
      const f = 0.08 + rng() * 0.84;
      const y = foliageBottom + f * (height - foliageBottom - 0.4);
      const heightRatio = clamp((y - foliageBottom) / Math.max(0.1, height - foliageBottom), 0, 1);
      const envelope = crown * Math.pow(1 - heightRatio, 0.78);
      const angle = rng() * Math.PI * 2;
      const radius = envelope * (0.82 + rng() * 0.16);
      const size = 0.038 + rng() * 0.03;
      position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      quaternion.identity();
      scale.setScalar(size);
      matrix.compose(position, quaternion, scale);
      ornaments.setMatrixAt(i, matrix);
      ornaments.setColorAt(i, palette[Math.floor(rng() * palette.length)]);
      ornaments.castShadow = false;
    }
    ornaments.instanceMatrix.needsUpdate = true;
    if (ornaments.instanceColor) ornaments.instanceColor.needsUpdate = true;
    ornaments.frustumCulled = false;
    ornaments.name = 'tree-ornaments';
    this.group.add(ornaments);
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      child.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            // These two materials are shared by every rebuild of the tree.
            if (material === this.snowMaterial || material === this.proxyMaterial) continue;
            material.dispose();
          }
        }
      });
      this.group.remove(child);
    }
    this.sprigBatches = [];
    this.coreMeshes = [];
    this.branchArmMaterial = null;
    this.proxy = null;
  }

  private buildTrunk(trunkHeight: number, trunkRadius: number, crown: number): void {
    const barkMaterial = new THREE.MeshStandardMaterial({
      map: this.barkTexture,
      color: 0x9b7558,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.08
    });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.62, trunkRadius, trunkHeight, 12, 5),
      barkMaterial
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);

    // Root flares peeking out of the snow.
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      const length = clamp(crown * 0.18, 0.28, 0.66);
      const root = new THREE.Mesh(
        new THREE.ConeGeometry(trunkRadius * 0.3, length, 7),
        barkMaterial.clone()
      );
      root.position.set(
        Math.cos(angle) * trunkRadius * 0.42,
        0.1,
        Math.sin(angle) * trunkRadius * 0.42
      );
      root.rotation.z = Math.PI / 2.2;
      root.rotation.y = -angle;
      root.castShadow = true;
      root.receiveShadow = true;
      const material = root.material as THREE.MeshStandardMaterial;
      material.roughness = 0.96;
      this.group.add(root);
    }
  }

  private buildTierCores(
    height: number,
    crown: number,
    layers: number,
    foliageBottom: number
  ): void {
    const topRimTarget = height - 1.22;
    for (let i = 0; i < layers; i += 1) {
      const t = layers === 1 ? 0 : i / (layers - 1);
      const rimY = foliageBottom + (topRimTarget - foliageBottom) * t;
      const radius = crown * (0.11 + 0.89 * Math.pow(1 - t, 0.9));
      const drop = 1.35 - t * 0.38;
      const apexY = rimY + drop;

      const geometry = createTierGeometry(radius * 0.8, apexY - 0.06, rimY + 0.03, 800 + i * 97);
      const material = new THREE.MeshStandardMaterial({
        color: this.palette.core,
        vertexColors: true,
        roughness: 0.94,
        metalness: 0.01,
        side: THREE.DoubleSide,
        envMapIntensity: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.coreMeshes.push(mesh);
    }
  }

  private buildSprigs(
    height: number,
    crown: number,
    layers: number,
    density: number,
    foliageBottom: number
  ): void {
    const rng = mulberry32(20261225);
    const topRimTarget = height - 1.22;
    const batches: SprigInstance[][] = Array.from({ length: SPRIG_VARIANTS }, () => []);
    const geometries = Array.from({ length: SPRIG_VARIANTS }, (_, index) =>
      createSprigGeometry(4433 + index * 917)
    );
    const quaternion = new THREE.Quaternion();
    const roll = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const direction = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const armMatrices: THREE.Matrix4[] = [];

    for (let layer = 0; layer < layers; layer += 1) {
      const t = layers === 1 ? 0 : layer / (layers - 1);
      const rimY = foliageBottom + (topRimTarget - foliageBottom) * t;
      const radius = crown * (0.11 + 0.89 * Math.pow(1 - t, 0.9));
      const drop = 1.35 - t * 0.38;
      const apexY = rimY + drop;
      const layerPhase = rng() * Math.PI * 2;
      const baseScale = clamp(crown / 2.5, 0.7, 1.34);
      const branchLength = (1.02 - t * 0.22) * baseScale;
      const armCount = Math.max(12, Math.round(8 + radius * 7.2));
      const armAngles: number[] = [];
      const armLengths: number[] = [];

      for (let armIndex = 0; armIndex < armCount; armIndex += 1) {
        const angle =
          layerPhase + (armIndex / armCount) * Math.PI * 2 + (rng() - 0.5) * 0.12;
        const armLength = radius * (0.92 + rng() * 0.14);
        const startY = rimY + 0.14 * armLength;
        const outwardX = Math.cos(angle);
        const outwardZ = Math.sin(angle);
        radial.set(outwardX, 0, outwardZ);
        quaternion.setFromUnitVectors(zAxis, radial);
        const armScale = new THREE.Vector3(1.35, 1, armLength);
        matrix.compose(
          new THREE.Vector3(0, startY, 0),
          quaternion.clone(),
          armScale
        );
        armMatrices.push(matrix.clone());
        armAngles.push(angle);
        armLengths.push(armLength);
      }

      for (let index = 0; index < density; index += 1) {
        const variant = Math.floor(rng() * SPRIG_VARIANTS);
        const useSurfaceSpray = index % 3 === 0;
        const armIndex = index % armCount;
        const angle = useSurfaceSpray
          ? layerPhase + rng() * Math.PI * 2
          : armAngles[armIndex] + (rng() - 0.5) * 0.19;
        const armLength = armLengths[armIndex];
        const startY = rimY + 0.14 * armLength;
        const radialFraction = useSurfaceSpray
          ? 0.16 + Math.pow(rng(), 0.66) * 0.78
          : 0.28 + Math.pow(rng(), 0.55) * 0.74;
        const surfaceRadius = useSurfaceSpray
          ? radius * radialFraction
          : armLength * radialFraction;
        const surfaceY = useSurfaceSpray
          ? apexY -
            drop * Math.pow(radialFraction, 1.5) +
            (rng() - 0.5) * 0.08
          : startY -
            0.14 * armLength * radialFraction * radialFraction +
            (rng() - 0.5) * 0.065;
        const outwardX = Math.cos(angle);
        const outwardZ = Math.sin(angle);
        radial.set(outwardX, 0, outwardZ);
        tangent.set(-outwardZ, 0, outwardX);

        position.set(
          outwardX * surfaceRadius,
          surfaceY,
          outwardZ * surfaceRadius
        );

        const droop =
          (useSurfaceSpray ? 0.14 + radialFraction * 0.15 : 0.28 * radialFraction + 0.06) +
          (rng() - 0.5) * 0.14;
        direction
          .copy(radial)
          .addScaledVector(tangent, (rng() - 0.5) * 0.44)
          .setY(-droop)
          .normalize();

        quaternion.setFromUnitVectors(zAxis, direction);
        roll.setFromAxisAngle(zAxis, rng() * Math.PI * 2);
        quaternion.multiply(roll);

        const lengthScale = branchLength * (0.78 + rng() * 0.4);
        scale.set(
          (0.86 + rng() * 0.34) * baseScale,
          (0.68 + rng() * 0.5) * baseScale,
          lengthScale
        );
        matrix.compose(position, quaternion, scale);

        const rollColor = rng();
        const colorChoice = rollColor < 0.58 ? 0 : rollColor < 0.84 ? 1 : rollColor < 0.96 ? 2 : 3;
        const shade = 0.78 + rng() * 0.34;
        batches[variant].push({
          matrix: matrix.clone(),
          colorChoice,
          shade
        });
      }

      // A soft skirt of drooping tips at every tier edge. These hide the
      // structural cone underneath and give the tree its scalloped silhouette.
      const fringeCount = Math.max(14, Math.round(radius * 11));
      for (let index = 0; index < fringeCount; index += 1) {
        const variant = Math.floor(rng() * SPRIG_VARIANTS);
        const armIndex = index % armCount;
        const angle = armAngles[armIndex] + (rng() - 0.5) * 0.25;
        const armLength = armLengths[armIndex];
        const radialFraction = 0.9 + rng() * 0.1;
        const surfaceRadius = armLength * radialFraction;
        const startY = rimY + 0.14 * armLength;
        const surfaceY =
          startY -
          0.14 * armLength * radialFraction * radialFraction -
          0.02 -
          rng() * 0.055;
        const outwardX = Math.cos(angle);
        const outwardZ = Math.sin(angle);
        radial.set(outwardX, 0, outwardZ);
        tangent.set(-outwardZ, 0, outwardX);
        position.set(outwardX * surfaceRadius, surfaceY, outwardZ * surfaceRadius);
        direction
          .copy(radial)
          .addScaledVector(tangent, (rng() - 0.5) * 0.36)
          .setY(-(0.2 + rng() * 0.3))
          .normalize();
        quaternion.setFromUnitVectors(zAxis, direction);
        roll.setFromAxisAngle(zAxis, rng() * Math.PI * 2);
        quaternion.multiply(roll);
        const lengthScale = branchLength * (0.75 + rng() * 0.36);
        scale.set(
          (0.72 + rng() * 0.28) * baseScale,
          (0.58 + rng() * 0.38) * baseScale,
          lengthScale
        );
        matrix.compose(position, quaternion, scale);
        const colorChoice = rng() < 0.62 ? 0 : rng() < 0.68 ? 2 : 1;
        batches[variant].push({
          matrix: matrix.clone(),
          colorChoice,
          shade: 0.72 + rng() * 0.3
        });
      }
    }

    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.042, 0.5),
      new THREE.Vector3(0, -0.14, 1)
    ]);
    const armGeometry = new THREE.TubeGeometry(armCurve, 6, 0.0115, 4, false);
    this.branchArmMaterial = new THREE.MeshStandardMaterial({
      color: this.palette.arm,
      roughness: 0.92,
      metalness: 0.01,
      envMapIntensity: 0.08
    });
    if (armMatrices.length > 0) {
      const armMesh = new THREE.InstancedMesh(
        armGeometry,
        this.branchArmMaterial,
        armMatrices.length
      );
      for (let i = 0; i < armMatrices.length; i += 1) {
        armMesh.setMatrixAt(i, armMatrices[i]);
      }
      armMesh.instanceMatrix.needsUpdate = true;
      armMesh.castShadow = true;
      armMesh.receiveShadow = true;
      armMesh.frustumCulled = false;
      this.group.add(armMesh);
    } else {
      armGeometry.dispose();
    }

    for (let variant = 0; variant < SPRIG_VARIANTS; variant += 1) {
      const instances = batches[variant];
      if (instances.length === 0) {
        geometries[variant].dispose();
        continue;
      }
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.01,
        side: THREE.DoubleSide,
        envMapIntensity: 0.1
      });
      const mesh = new THREE.InstancedMesh(geometries[variant], material, instances.length);
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);

      const batch: SprigBatch = {
        mesh,
        instances,
        geometry: geometries[variant],
        material
      };
      this.sprigBatches.push(batch);

      for (let i = 0; i < instances.length; i += 1) {
        mesh.setMatrixAt(i, instances[i].matrix);
        this.writeInstanceColor(batch, i, instances[i]);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  private writeInstanceColor(batch: SprigBatch, index: number, instance: SprigInstance): void {
    const base = getPaletteColor(this.palette, instance.colorChoice);
    const color = base.clone().multiplyScalar(instance.shade);
    batch.mesh.setColorAt(index, color);
  }

  private buildSnowMounds(crown: number): void {
    const rng = mulberry32(711);
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2 + rng() * 0.5;
      const radius = crown * (0.18 + rng() * 0.28);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), this.snowMaterial);
      const scale = 0.22 + rng() * 0.42;
      mound.scale.set(scale * (0.8 + rng() * 0.8), scale * 0.24, scale);
      mound.position.set(
        Math.cos(angle) * radius,
        0.04,
        Math.sin(angle) * radius
      );
      mound.receiveShadow = true;
      mound.castShadow = true;
      this.group.add(mound);
    }
  }

  private buildProxy(height: number, crown: number): void {
    const proxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, crown * 1.02, height * 0.9, 18, 1, true),
      this.proxyMaterial
    );
    proxy.position.y = height * 0.45;
    proxy.name = 'tree-hit-proxy';
    proxy.userData.pickType = 'tree';
    proxy.userData.interactive = true;
    this.group.add(proxy);
    this.proxy = proxy;
  }

  updatePalette(hex: string): void {
    this.palette = createTreePalette(hex);
    if (this.currentConfig) {
      this.currentConfig = { ...this.currentConfig, foliageColor: hex };
    }
    for (const mesh of this.coreMeshes) {
      mesh.material.color.copy(this.palette.core);
    }
    if (this.branchArmMaterial) {
      this.branchArmMaterial.color.copy(this.palette.arm);
    }
    for (const batch of this.sprigBatches) {
      for (let i = 0; i < batch.instances.length; i += 1) {
        this.writeInstanceColor(batch, i, batch.instances[i]);
      }
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true;
    }
    this.snowMaterial.envMapIntensity = 0.24;
  }

  getInteractiveMeshes(): THREE.Object3D[] {
    return this.proxy ? [this.proxy] : [];
  }

  getSegmentTopY(): number {
    return this.currentConfig?.height ?? 8;
  }

  dispose(): void {
    this.clear();
    this.barkTexture.dispose();
    this.snowMaterial.dispose();
    this.proxyMaterial.dispose();
  }
}
