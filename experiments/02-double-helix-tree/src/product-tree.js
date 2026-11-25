// src/objects/ChristmasTree.ts
import * as THREE5 from "three";

// src/objects/TreeBranches.ts
import * as THREE2 from "three";

// src/core/utils.ts
import * as THREE from "three";
var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
var mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a += 1831565813;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
var makeCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
var makeCanvasTexture = (width, height, draw) => {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

// src/objects/TreeBranches.ts
var SPRIG_VARIANTS = 3;
var SPRIG_TRIANGLES = 44;
var createTreePalette = (hex) => {
  const main = new THREE2.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  main.getHSL(hsl);
  const shadow = new THREE2.Color().setHSL(
    hsl.h,
    clamp(hsl.s * 0.92, 0, 1),
    Math.max(0.05, hsl.l * 0.44)
  );
  const highlight = new THREE2.Color().setHSL(
    (hsl.h + 0.012) % 1,
    clamp(hsl.s * 1.02, 0, 1),
    clamp(hsl.l * 0.56 + 0.17, 0, 0.52)
  );
  const frost = main.clone().lerp(new THREE2.Color("#bccfbe"), 0.44);
  frost.offsetHSL(0, -0.04, 0.025);
  const core = new THREE2.Color().setHSL(
    hsl.h,
    clamp(hsl.s * 0.7, 0, 1),
    Math.max(0.012, hsl.l * 0.13)
  );
  const arm = core.clone().lerp(new THREE2.Color("#493525"), 0.5);
  return { main, shadow, highlight, frost, core, arm };
};
var getPaletteColor = (palette, choice) => {
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
var makeBarkTexture = () => {
  const width = 192;
  const height = 384;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#2b1b13");
  gradient.addColorStop(0.3, "#5b3926");
  gradient.addColorStop(0.55, "#3c2619");
  gradient.addColorStop(0.8, "#694730");
  gradient.addColorStop(1, "#2a1a12");
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
  const texture = new THREE2.CanvasTexture(canvas);
  texture.wrapS = THREE2.RepeatWrapping;
  texture.wrapT = THREE2.RepeatWrapping;
  texture.repeat.set(2.4, 1.3);
  texture.colorSpace = THREE2.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
var createSprigGeometry = (seed) => {
  const rng = mulberry32(seed);
  const positions = [];
  const colors = [];
  const normals = [];
  const indices = [];
  const pushVertex = (x, y, z, shade, normalX, normalY, normalZ) => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    colors.push(shade, shade * 0.985, shade * 0.95);
    normals.push(normalX, normalY, normalZ);
    return index;
  };
  for (let i = 0; i < SPRIG_TRIANGLES; i += 1) {
    const along = 0.04 + rng() * 0.9;
    const angle = rng() * Math.PI * 2;
    const length = (0.12 + rng() * 0.22) * (1.1 - along * 0.28);
    const baseX = Math.cos(angle) * 0.01;
    const baseY = Math.sin(angle) * 6e-3;
    const baseZ = along;
    const tipX = baseX + Math.cos(angle) * length;
    const tipY = baseY + Math.sin(angle) * length * 0.62;
    const tipZ = baseZ + 0.035 + length * 0.55;
    const width = 0.011 + rng() * 8e-3;
    const sideX = -Math.sin(angle) * width;
    const sideY = Math.cos(angle) * width;
    const shadeBase = 0.34 + rng() * 0.16;
    const shadeTip = 0.7 + rng() * 0.22;
    const a = pushVertex(baseX + sideX, baseY + sideY, baseZ, shadeBase, 0, 0, 1);
    const b = pushVertex(baseX - sideX, baseY - sideY, baseZ, shadeBase, 0, 0, 1);
    const c = pushVertex(tipX, tipY, tipZ, shadeTip, 0, 0, 1);
    indices.push(a, b, c);
    if (rng() > 0.58) {
      const a2 = pushVertex(baseX, baseY, baseZ - 0.01, shadeBase * 0.8, 0, 1, 0);
      const b2 = pushVertex(tipX, tipY - 5e-3, tipZ, shadeTip, 0, 1, 0);
      const c2 = pushVertex(baseX, baseY + 0.012, baseZ + 0.07, shadeBase * 0.95, 0, 1, 0);
      indices.push(a2, b2, c2);
    }
  }
  const twigShade = 0.38;
  const twigWidth = 0.011;
  const t1 = pushVertex(-twigWidth, -twigWidth, 0, twigShade, 0, 1, 0);
  const t2 = pushVertex(twigWidth, -twigWidth, 0.02, twigShade, 0, 1, 0);
  const t3 = pushVertex(0, 0.012, 1.02, 0.5, 0, 1, 0);
  indices.push(t1, t2, t3);
  const geometry = new THREE2.BufferGeometry();
  geometry.setAttribute("position", new THREE2.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE2.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("normal", new THREE2.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
};
var createTierGeometry = (radius, apexY, rimY, seed) => {
  const rng = mulberry32(seed);
  const segments = 64;
  const topRings = [0.025, 0.14, 0.3, 0.48, 0.66, 0.82, 0.93, 1];
  const underRings = [1.025, 0.91, 0.72];
  const drop = apexY - rimY;
  const phase = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;
  const positions = [];
  const colors = [];
  const indices = [];
  const rowStride = segments;
  const addRing = (radiusFactor, heightFactor, isUnder, underAmount) => {
    for (let j = 0; j < segments; j += 1) {
      const angle = j / segments * Math.PI * 2;
      const wave = 1 + Math.sin(angle * 6 + phase) * 0.032 * Math.pow(radiusFactor, 2) + Math.sin(angle * 13 + phase2) * 0.015;
      const rimWave = Math.sin(angle * 7 + phase * 1.7) * 0.06 * Math.pow(radiusFactor, 3);
      const radial = radius * radiusFactor * wave;
      const height = apexY - drop * heightFactor + rimWave;
      const foldedHeight = isUnder ? rimY - underAmount - Math.sin(angle * 5 + phase) * 0.018 : height;
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
  const centerIndex = positions.length / 3;
  positions.push(0, apexY, 0);
  colors.push(0.36, 0.36, 0.36);
  for (let j = 0; j < segments; j += 1) {
    const next = (j + 1) % segments;
    indices.push(centerIndex, next, j);
  }
  const geometry = new THREE2.BufferGeometry();
  geometry.setAttribute("position", new THREE2.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE2.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
};
var TreeBranches = class {
  group = new THREE2.Group();
  palette;
  sprigBatches = [];
  coreMeshes = [];
  branchArmMaterial = null;
  proxy = null;
  currentConfig = null;
  barkTexture = makeBarkTexture();
  snowMaterial = new THREE2.MeshStandardMaterial({
    color: 15331825,
    roughness: 0.88,
    metalness: 0,
    envMapIntensity: 0.24
  });
  proxyMaterial = new THREE2.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    opacity: 0,
    side: THREE2.DoubleSide
  });
  constructor(config) {
    this.group.name = "procedural-christmas-tree";
    this.palette = createTreePalette(config.foliageColor);
    this.build(config);
  }
  build(config) {
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
  buildOrnaments(height, crown, foliageBottom) {
    const count = 34;
    const geometry = new THREE2.SphereGeometry(1, 12, 9);
    const material = new THREE2.MeshStandardMaterial({
      color: 16777215,
      roughness: 0.38,
      metalness: 0.32,
      envMapIntensity: 0.75
    });
    const ornaments = new THREE2.InstancedMesh(geometry, material, count);
    const rng = mulberry32(82109);
    const matrix = new THREE2.Matrix4();
    const quaternion = new THREE2.Quaternion();
    const position = new THREE2.Vector3();
    const scale = new THREE2.Vector3();
    const palette = [
      new THREE2.Color("#c79a4e"),
      new THREE2.Color("#d8c29c"),
      new THREE2.Color("#682431"),
      new THREE2.Color("#a96569")
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
    ornaments.name = "tree-ornaments";
    this.group.add(ornaments);
  }
  clear() {
    for (const child of [...this.group.children]) {
      child.traverse((object) => {
        const mesh = object;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
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
  buildTrunk(trunkHeight, trunkRadius, crown) {
    const barkMaterial = new THREE2.MeshStandardMaterial({
      map: this.barkTexture,
      color: 10188120,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.08
    });
    const trunk = new THREE2.Mesh(
      new THREE2.CylinderGeometry(trunkRadius * 0.62, trunkRadius, trunkHeight, 12, 5),
      barkMaterial
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const angle = i / 6 * Math.PI * 2 + 0.3;
      const length = clamp(crown * 0.18, 0.28, 0.66);
      const root = new THREE2.Mesh(
        new THREE2.ConeGeometry(trunkRadius * 0.3, length, 7),
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
      const material = root.material;
      material.roughness = 0.96;
      this.group.add(root);
    }
  }
  buildTierCores(height, crown, layers, foliageBottom) {
    const topRimTarget = height - 1.22;
    for (let i = 0; i < layers; i += 1) {
      const t = layers === 1 ? 0 : i / (layers - 1);
      const rimY = foliageBottom + (topRimTarget - foliageBottom) * t;
      const radius = crown * (0.11 + 0.89 * Math.pow(1 - t, 0.9));
      const drop = 1.35 - t * 0.38;
      const apexY = rimY + drop;
      const geometry = createTierGeometry(radius * 0.8, apexY - 0.06, rimY + 0.03, 800 + i * 97);
      const material = new THREE2.MeshStandardMaterial({
        color: this.palette.core,
        vertexColors: true,
        roughness: 0.94,
        metalness: 0.01,
        side: THREE2.DoubleSide,
        envMapIntensity: 0.1
      });
      const mesh = new THREE2.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.coreMeshes.push(mesh);
    }
  }
  buildSprigs(height, crown, layers, density, foliageBottom) {
    const rng = mulberry32(20261225);
    const topRimTarget = height - 1.22;
    const batches = Array.from({ length: SPRIG_VARIANTS }, () => []);
    const geometries = Array.from(
      { length: SPRIG_VARIANTS },
      (_, index) => createSprigGeometry(4433 + index * 917)
    );
    const quaternion = new THREE2.Quaternion();
    const roll = new THREE2.Quaternion();
    const zAxis = new THREE2.Vector3(0, 0, 1);
    const direction = new THREE2.Vector3();
    const radial = new THREE2.Vector3();
    const tangent = new THREE2.Vector3();
    const position = new THREE2.Vector3();
    const scale = new THREE2.Vector3();
    const matrix = new THREE2.Matrix4();
    const armMatrices = [];
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
      const armAngles = [];
      const armLengths = [];
      for (let armIndex = 0; armIndex < armCount; armIndex += 1) {
        const angle = layerPhase + armIndex / armCount * Math.PI * 2 + (rng() - 0.5) * 0.12;
        const armLength = radius * (0.92 + rng() * 0.14);
        const startY = rimY + 0.14 * armLength;
        const outwardX = Math.cos(angle);
        const outwardZ = Math.sin(angle);
        radial.set(outwardX, 0, outwardZ);
        quaternion.setFromUnitVectors(zAxis, radial);
        const armScale = new THREE2.Vector3(1.35, 1, armLength);
        matrix.compose(
          new THREE2.Vector3(0, startY, 0),
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
        const angle = useSurfaceSpray ? layerPhase + rng() * Math.PI * 2 : armAngles[armIndex] + (rng() - 0.5) * 0.19;
        const armLength = armLengths[armIndex];
        const startY = rimY + 0.14 * armLength;
        const radialFraction = useSurfaceSpray ? 0.16 + Math.pow(rng(), 0.66) * 0.78 : 0.28 + Math.pow(rng(), 0.55) * 0.74;
        const surfaceRadius = useSurfaceSpray ? radius * radialFraction : armLength * radialFraction;
        const surfaceY = useSurfaceSpray ? apexY - drop * Math.pow(radialFraction, 1.5) + (rng() - 0.5) * 0.08 : startY - 0.14 * armLength * radialFraction * radialFraction + (rng() - 0.5) * 0.065;
        const outwardX = Math.cos(angle);
        const outwardZ = Math.sin(angle);
        radial.set(outwardX, 0, outwardZ);
        tangent.set(-outwardZ, 0, outwardX);
        position.set(
          outwardX * surfaceRadius,
          surfaceY,
          outwardZ * surfaceRadius
        );
        const droop = (useSurfaceSpray ? 0.14 + radialFraction * 0.15 : 0.28 * radialFraction + 0.06) + (rng() - 0.5) * 0.14;
        direction.copy(radial).addScaledVector(tangent, (rng() - 0.5) * 0.44).setY(-droop).normalize();
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
      const fringeCount = Math.max(14, Math.round(radius * 11));
      for (let index = 0; index < fringeCount; index += 1) {
        const variant = Math.floor(rng() * SPRIG_VARIANTS);
        const armIndex = index % armCount;
        const angle = armAngles[armIndex] + (rng() - 0.5) * 0.25;
        const armLength = armLengths[armIndex];
        const radialFraction = 0.9 + rng() * 0.1;
        const surfaceRadius = armLength * radialFraction;
        const startY = rimY + 0.14 * armLength;
        const surfaceY = startY - 0.14 * armLength * radialFraction * radialFraction - 0.02 - rng() * 0.055;
        const outwardX = Math.cos(angle);
        const outwardZ = Math.sin(angle);
        radial.set(outwardX, 0, outwardZ);
        tangent.set(-outwardZ, 0, outwardX);
        position.set(outwardX * surfaceRadius, surfaceY, outwardZ * surfaceRadius);
        direction.copy(radial).addScaledVector(tangent, (rng() - 0.5) * 0.36).setY(-(0.2 + rng() * 0.3)).normalize();
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
    const armCurve = new THREE2.CatmullRomCurve3([
      new THREE2.Vector3(0, 0, 0),
      new THREE2.Vector3(0, -0.042, 0.5),
      new THREE2.Vector3(0, -0.14, 1)
    ]);
    const armGeometry = new THREE2.TubeGeometry(armCurve, 6, 0.0115, 4, false);
    this.branchArmMaterial = new THREE2.MeshStandardMaterial({
      color: this.palette.arm,
      roughness: 0.92,
      metalness: 0.01,
      envMapIntensity: 0.08
    });
    if (armMatrices.length > 0) {
      const armMesh = new THREE2.InstancedMesh(
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
      const material = new THREE2.MeshStandardMaterial({
        color: 16777215,
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.01,
        side: THREE2.DoubleSide,
        envMapIntensity: 0.1
      });
      const mesh = new THREE2.InstancedMesh(geometries[variant], material, instances.length);
      mesh.instanceMatrix.setUsage(THREE2.StaticDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      const batch = {
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
  writeInstanceColor(batch, index, instance) {
    const base = getPaletteColor(this.palette, instance.colorChoice);
    const color = base.clone().multiplyScalar(instance.shade);
    batch.mesh.setColorAt(index, color);
  }
  buildSnowMounds(crown) {
    const rng = mulberry32(711);
    for (let i = 0; i < 7; i += 1) {
      const angle = i / 7 * Math.PI * 2 + rng() * 0.5;
      const radius = crown * (0.18 + rng() * 0.28);
      const mound = new THREE2.Mesh(new THREE2.SphereGeometry(1, 14, 9), this.snowMaterial);
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
  buildProxy(height, crown) {
    const proxy = new THREE2.Mesh(
      new THREE2.CylinderGeometry(0.18, crown * 1.02, height * 0.9, 18, 1, true),
      this.proxyMaterial
    );
    proxy.position.y = height * 0.45;
    proxy.name = "tree-hit-proxy";
    proxy.userData.pickType = "tree";
    proxy.userData.interactive = true;
    this.group.add(proxy);
    this.proxy = proxy;
  }
  updatePalette(hex) {
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
  getInteractiveMeshes() {
    return this.proxy ? [this.proxy] : [];
  }
  getSegmentTopY() {
    return this.currentConfig?.height ?? 8;
  }
  dispose() {
    this.clear();
    this.barkTexture.dispose();
    this.snowMaterial.dispose();
    this.proxyMaterial.dispose();
  }
};

// src/objects/TreeLights.ts
import * as THREE3 from "three";

// src/config.ts
var LIGHT_PALETTES = {
  warm: ["#FFD9A4", "#FFF2D7", "#FFBE7C", "#F5E4C6"],
  gold: ["#F5C86E", "#FFF0B9", "#D89A45", "#FFE39B"],
  ice: ["#9DE6FF", "#D5F8FF", "#72BDE4", "#EAFBFF"],
  rainbow: ["#FF7B93", "#FFDA7A", "#8AEAB7", "#8FC8FF", "#F7B6FF"],
  pink: ["#FF87AC", "#FFD0DA", "#FF5F91", "#FFF0F3"]
};

// src/objects/TreeLights.ts
var VERTEX = (
  /* glsl */
  `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aHeight;
  attribute float aSeed;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uBrightness;
  uniform float uReveal;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vFlicker;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float time = uTime * (0.5 + uSpeed * 0.75);
    float slow = sin(time * 1.15 + aPhase + aSeed * 0.3);
    float fast = sin(time * 3.4 + aPhase * 2.1 + aSeed);
    float flicker = clamp(0.48 + slow * 0.3 + fast * 0.2 + sin(time * 0.27 + aSeed * 6.0) * 0.1, 0.0, 1.0);
    float alive = step(aHeight, uReveal);
    float finalSize = aSize * (0.62 + flicker * 0.55) * alive;

    gl_PointSize = clamp(finalSize * uPixelRatio * (390.0 / max(1.0, -mvPosition.z)), 0.0, 35.0);
    gl_Position = projectionMatrix * mvPosition;

    vColor = aColor * (0.72 + flicker * 0.7 + uBrightness * 0.22);
    vAlpha = alive * (0.32 + flicker * 0.68);
    vFlicker = flicker;
  }
`
);
var FRAGMENT = (
  /* glsl */
  `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vFlicker;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;

    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float inner = 1.0 - smoothstep(0.08, 0.46, d);
    float halo = 1.0 - smoothstep(0.2, 1.0, d);
    float cross = max(0.0, 1.0 - abs(p.x) * 12.0) * max(0.0, 1.0 - abs(p.y) * 2.2)
                + max(0.0, 1.0 - abs(p.y) * 12.0) * max(0.0, 1.0 - abs(p.x) * 2.2);

    vec3 color = vColor * (halo * 0.34 + inner * 0.92 + cross * 0.22);
    color += vec3(1.0, 0.9, 0.7) * core * (0.58 + vFlicker * 0.35);
    float alpha = (halo * 0.23 + inner * 0.46 + core * 0.42 + cross * 0.08) * vAlpha;
    alpha = clamp(alpha, 0.0, 0.96);

    gl_FragColor = vec4(color, alpha);
  }
`
);
var TreeLights = class {
  group = new THREE3.Group();
  material;
  geometry = null;
  points = null;
  bulbs = [];
  height = 8;
  crown = 2.5;
  foliageBottom = 1;
  count = 220;
  mode = "warm";
  primary = "#FFD9A4";
  constructor(height, crownRadius, count, mode, primary) {
    this.mode = mode;
    this.primary = primary;
    this.material = new THREE3.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1 },
        uBrightness: { value: 1.25 },
        uReveal: { value: 1 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE3.AdditiveBlending,
      vertexColors: false,
      toneMapped: true
    });
    this.configure(height, crownRadius, count, mode, primary);
  }
  configure(height, crownRadius, count, mode, primary) {
    this.height = height;
    this.crown = crownRadius;
    this.foliageBottom = clamp(height * 0.122, 0.7, 1.2);
    this.count = clamp(Math.round(count), 40, 400);
    if (mode) this.mode = mode;
    if (primary) this.primary = primary;
    this.rebuild();
  }
  rebuild() {
    if (this.points) {
      this.group.remove(this.points);
      this.geometry?.dispose();
      this.points = null;
      this.geometry = null;
    }
    const rng = mulberry32(5201314);
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const phases = new Float32Array(this.count);
    const heights = new Float32Array(this.count);
    const seeds = new Float32Array(this.count);
    this.bulbs = [];
    const top = this.height - 0.48;
    for (let i = 0; i < this.count; i += 1) {
      const t = i / Math.max(1, this.count - 1);
      const eased = Math.pow(t, 0.94);
      const y = this.foliageBottom + (top - this.foliageBottom) * eased;
      const heightRatio = clamp((y - this.foliageBottom) / Math.max(0.1, this.height - this.foliageBottom), 0, 1);
      const envelope = this.crown * Math.pow(1 - heightRatio, 0.76) * 0.97;
      const angle = t * Math.PI * 2 * 8 + 0.7 + Math.sin(t * Math.PI * 5) * 0.08;
      const radius = Math.max(0.12, envelope + 0.03 + (rng() - 0.5) * 0.08);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const jitterY = (rng() - 0.5) * 0.055;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + jitterY;
      positions[i * 3 + 2] = z;
      const colorChoice = rng();
      const palette = this.currentPalette();
      const color = palette[Math.floor(colorChoice * palette.length) % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = 0.32 + rng() * 0.3;
      phases[i] = rng() * Math.PI * 2;
      heights[i] = t;
      seeds[i] = rng() * 10;
      this.bulbs.push({
        colorChoice,
        phase: phases[i],
        height: t
      });
    }
    const geometry = new THREE3.BufferGeometry();
    geometry.setAttribute("position", new THREE3.BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new THREE3.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE3.BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE3.BufferAttribute(phases, 1));
    geometry.setAttribute("aHeight", new THREE3.BufferAttribute(heights, 1));
    geometry.setAttribute("aSeed", new THREE3.BufferAttribute(seeds, 1));
    geometry.computeBoundingSphere();
    const points = new THREE3.Points(geometry, this.material);
    points.frustumCulled = false;
    points.renderOrder = 3;
    this.points = points;
    this.geometry = geometry;
    this.group.add(points);
    this.setReveal(1);
  }
  currentPalette() {
    const colors = [...LIGHT_PALETTES[this.mode] ?? LIGHT_PALETTES.warm];
    colors[0] = this.primary;
    return colors.map((hex) => new THREE3.Color(hex));
  }
  updateColors(mode, primary) {
    if (this.mode === mode && this.primary === primary) return;
    this.mode = mode;
    this.primary = primary;
    if (!this.geometry) return;
    const palette = this.currentPalette();
    const colorAttribute = this.geometry.getAttribute("aColor");
    const array = colorAttribute.array;
    for (let i = 0; i < this.bulbs.length; i += 1) {
      const bulb = this.bulbs[i];
      const color = palette[Math.floor(bulb.colorChoice * palette.length) % palette.length];
      array[i * 3] = color.r;
      array[i * 3 + 1] = color.g;
      array[i * 3 + 2] = color.b;
    }
    colorAttribute.needsUpdate = true;
  }
  setBrightness(value) {
    this.material.uniforms.uBrightness.value = value;
  }
  setFlashSpeed(value) {
    this.material.uniforms.uSpeed.value = value;
  }
  setReveal(progress) {
    this.material.uniforms.uReveal.value = clamp(progress, 0, 1);
  }
  setEnabled(enabled) {
    this.group.visible = enabled;
  }
  update(time) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  }
  get activeHeight() {
    return this.height;
  }
  get currentMode() {
    return this.mode;
  }
  dispose() {
    this.geometry?.dispose();
    this.material.dispose();
  }
};

// src/objects/TreeStar.ts
import * as THREE4 from "three";
var SPARKLE_VERTEX = (
  /* glsl */
  `
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
`
);
var SPARKLE_FRAGMENT = (
  /* glsl */
  `
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
`
);
var TreeStar = class {
  root = new THREE4.Group();
  starMesh;
  sparkles;
  halo;
  coreGlow;
  light;
  flashAmount = 0;
  time = 0;
  constructor(height) {
    this.root.name = "tree-top-star";
    this.root.position.set(0, height + 0.2, 0);
    const geometry = this.createStarGeometry();
    const material = new THREE4.MeshStandardMaterial({
      color: new THREE4.Color("#FFD36A"),
      metalness: 0.92,
      roughness: 0.22,
      emissive: new THREE4.Color("#B87828"),
      emissiveIntensity: 0.65,
      envMapIntensity: 1.45
    });
    this.starMesh = new THREE4.Mesh(geometry, material);
    this.starMesh.userData.pickType = "star";
    this.starMesh.userData.interactive = true;
    this.starMesh.castShadow = false;
    this.starMesh.name = "tree-star-mesh";
    this.root.add(this.starMesh);
    const centerJewel = new THREE4.Mesh(
      new THREE4.SphereGeometry(0.045, 12, 12),
      new THREE4.MeshStandardMaterial({
        color: 16773583,
        metalness: 0.5,
        roughness: 0.15,
        emissive: 16764546,
        emissiveIntensity: 0.8
      })
    );
    centerJewel.position.z = 0.07;
    this.root.add(centerJewel);
    const haloTexture = this.createSoftGlowTexture(
      "rgba(255, 224, 163, 0.52)",
      "rgba(255, 176, 67, 0)"
    );
    this.halo = new THREE4.Sprite(
      new THREE4.SpriteMaterial({
        map: haloTexture,
        color: 16765841,
        transparent: true,
        opacity: 0.55,
        blending: THREE4.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      })
    );
    this.halo.scale.set(2.15, 2.15, 1);
    this.halo.position.z = -0.05;
    this.root.add(this.halo);
    const coreTexture = this.createSoftGlowTexture(
      "rgba(255,255,245,0.9)",
      "rgba(255,192,97, 0)",
      0.18
    );
    this.coreGlow = new THREE4.Sprite(
      new THREE4.SpriteMaterial({
        map: coreTexture,
        color: 16771260,
        transparent: true,
        opacity: 0.66,
        blending: THREE4.AdditiveBlending,
        depthWrite: false
      })
    );
    this.coreGlow.scale.set(0.66, 0.66, 1);
    this.root.add(this.coreGlow);
    this.sparkles = this.createSparkles();
    this.root.add(this.sparkles);
    this.light = new THREE4.PointLight(16764034, 2.8, 8, 2);
    this.light.position.set(0, 0.1, 0.2);
    this.root.add(this.light);
  }
  createSoftGlowTexture(inner, outer, falloff = 0.12) {
    return makeCanvasTexture(512, 512, (ctx) => {
      const center = 256;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, inner);
      gradient.addColorStop(falloff, inner.replace(/[\d.]+\)$/, "0.34)"));
      gradient.addColorStop(Math.min(0.92, falloff + 0.2), inner.replace(/[\d.]+\)$/, "0.09)"));
      gradient.addColorStop(0.72, "rgba(255, 203, 120, 0.025)");
      gradient.addColorStop(1, outer);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    });
  }
  createStarGeometry() {
    const shape = new THREE4.Shape();
    const outer = 0.42;
    const inner = 0.17;
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const geometry = new THREE4.ExtrudeGeometry(shape, {
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
  createSparkles() {
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
    const geometry = new THREE4.BufferGeometry();
    geometry.setAttribute("position", new THREE4.BufferAttribute(positions, 3));
    geometry.setAttribute("aPhase", new THREE4.BufferAttribute(phases, 1));
    geometry.setAttribute("aSize", new THREE4.BufferAttribute(sizes, 1));
    const material = new THREE4.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: SPARKLE_VERTEX,
      fragmentShader: SPARKLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE4.AdditiveBlending,
      toneMapped: true
    });
    const points = new THREE4.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }
  setHeight(height) {
    this.root.position.y = height + 0.2;
  }
  flash() {
    this.flashAmount = 1;
  }
  update(dt, time) {
    this.time = time;
    this.flashAmount = Math.max(0, this.flashAmount - dt * 0.7);
    const idleFlash = Math.pow(Math.max(0, Math.sin(time * 0.62 - 0.9)), 26);
    const pulse = 0.5 + Math.sin(time * 1.25) * 0.08 + idleFlash * 0.55 + this.flashAmount * 1.2;
    this.starMesh.rotation.z = time * (Math.PI * 2 / 8);
    this.starMesh.rotation.y = Math.sin(time * 0.37) * 0.14;
    this.starMesh.rotation.x = Math.sin(time * 0.27) * 0.04;
    this.starMesh.material.emissiveIntensity = 0.55 + pulse * 0.62 + this.flashAmount * 1.2;
    this.halo.material.opacity = 0.34 + pulse * 0.18 + this.flashAmount * 0.24;
    const haloScale = 1.95 + pulse * 0.36 + this.flashAmount * 1;
    this.halo.scale.set(haloScale, haloScale, 1);
    this.coreGlow.material.opacity = 0.42 + pulse * 0.22;
    const coreScale = 0.58 + pulse * 0.16 + this.flashAmount * 0.35;
    this.coreGlow.scale.set(coreScale, coreScale, 1);
    this.light.intensity = 2.1 + pulse * 2.8 + this.flashAmount * 6;
    const material = this.sparkles.material;
    material.uniforms.uTime.value = time;
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    this.sparkles.rotation.y = -time * 0.12;
    this.sparkles.rotation.z = Math.sin(time * 0.22) * 0.06;
  }
  getPickMeshes() {
    return [this.starMesh];
  }
  dispose() {
    this.root.traverse((child) => {
      const mesh = child;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if ("map" in material && material.map instanceof THREE4.Texture) {
            material.map.dispose();
          }
          material.dispose();
        });
      }
    });
  }
};

// src/objects/ChristmasTree.ts
var ChristmasTree = class {
  group = new THREE5.Group();
  body = new THREE5.Group();
  branches;
  lights;
  star;
  rotation = 0;
  rotate = true;
  rotateSpeed = 0.3;
  height = 8;
  crown = 2.5;
  density = 180;
  layers = 7;
  foliageColor = "#0B5D3B";
  constructor(settings) {
    this.group.name = "christmas-tree";
    this.body.name = "christmas-tree-body";
    this.group.add(this.body);
    this.height = settings.treeHeight;
    this.crown = settings.crownRadius;
    this.density = settings.density;
    this.layers = settings.layers;
    this.foliageColor = settings.foliageColor;
    this.rotate = settings.treeRotate;
    this.rotateSpeed = settings.treeRotateSpeed;
    this.branches = new TreeBranches(this.treeConfig());
    this.lights = new TreeLights(
      this.height,
      this.crown,
      settings.lightCount,
      settings.lightMode,
      settings.lightColor
    );
    this.star = new TreeStar(this.height);
    this.body.add(this.branches.group);
    this.body.add(this.lights.group);
    this.group.add(this.star.root);
    this.lights.setBrightness(settings.lightBrightness);
    this.lights.setFlashSpeed(settings.lightFlashSpeed);
    this.lights.setEnabled(settings.lightsOn);
  }
  treeConfig() {
    return {
      height: this.height,
      crownRadius: this.crown,
      density: this.density,
      layers: this.layers,
      foliageColor: this.foliageColor
    };
  }
  update(dt, time) {
    if (this.rotate) {
      this.rotation += dt * this.rotateSpeed * 0.24;
      this.body.rotation.y = this.rotation;
    }
    this.lights.update(time);
    this.star.update(dt, time);
  }
  rebuildTree(settings) {
    const shapeChanged = this.height !== settings.treeHeight || this.crown !== settings.crownRadius || this.density !== settings.density || this.layers !== settings.layers;
    const paletteChanged = this.foliageColor !== settings.foliageColor;
    this.height = settings.treeHeight;
    this.crown = settings.crownRadius;
    this.density = settings.density;
    this.layers = settings.layers;
    this.foliageColor = settings.foliageColor;
    this.rotate = settings.treeRotate;
    this.rotateSpeed = settings.treeRotateSpeed;
    if (shapeChanged) {
      this.branches.build(this.treeConfig());
      this.lights.configure(this.height, this.crown, settings.lightCount, settings.lightMode, settings.lightColor);
      this.star.setHeight(this.height);
    } else if (paletteChanged) {
      this.branches.updatePalette(this.foliageColor);
    }
  }
  rebuildLights(settings) {
    this.lights.configure(
      this.height,
      this.crown,
      settings.lightCount,
      settings.lightMode,
      settings.lightColor
    );
  }
  setLightMode(mode, primary) {
    this.lights.updateColors(mode, primary);
  }
  setLightColor(primary) {
    this.lights.updateColors(this.lights.currentMode, primary);
  }
  setLightBrightness(brightness) {
    this.lights.setBrightness(brightness);
  }
  setLightSpeed(speed) {
    this.lights.setFlashSpeed(speed);
  }
  setLightsEnabled(enabled) {
    this.lights.setEnabled(enabled);
  }
  setLightsReveal(progress) {
    this.lights.setReveal(progress);
  }
  setRotationSpeed(speed) {
    this.rotateSpeed = speed;
  }
  setRotationEnabled(enabled) {
    this.rotate = enabled;
  }
  resetPresentation() {
    this.body.visible = true;
    this.body.scale.setScalar(1);
    this.star.root.visible = true;
    this.lights.setReveal(1);
    this.lights.setEnabled(true);
  }
  setBodyVisible(visible) {
    this.body.visible = visible;
  }
  setBodyReveal(progress) {
    const eased = THREE5.MathUtils.clamp(progress, 0, 1);
    const scale = 0.02 + eased * 0.98;
    this.body.scale.set(scale, Math.max(0.03, Math.pow(eased, 0.82)), scale);
    this.body.visible = eased > 1e-3;
  }
  setStarVisible(visible) {
    this.star.root.visible = visible;
  }
  getPickMeshes() {
    return [...this.branches.getInteractiveMeshes(), ...this.star.getPickMeshes()];
  }
  getTopY() {
    return this.height + 0.2;
  }
  get treeHeight() {
    return this.height;
  }
  get treeCrown() {
    return this.crown;
  }
  flashStar() {
    this.star.flash();
  }
  dispose() {
    this.branches.dispose();
    this.lights.dispose();
    this.star.dispose();
  }
};
export {
  ChristmasTree
};
