import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { QualityLevel, QualityPreset } from '../config';
import { LightEffect } from '../effects/LightEffect';
import { makeCanvasTexture, makeRadialTexture, mulberry32 } from './utils';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uBottomColor;
  uniform vec3 uHorizonColor;
  varying vec3 vWorldPos;

  void main() {
    vec3 direction = normalize(vWorldPos);
    float height = clamp(direction.y * 1.4 + 0.25, 0.0, 1.0);
    vec3 color = mix(uBottomColor, uTopColor, smoothstep(0.0, 0.82, height));
    float horizon = pow(1.0 - clamp(abs(direction.y), 0.0, 1.0), 8.0);
    color = mix(color, uHorizonColor, horizon * 0.38);
    float veil = smoothstep(0.4, 0.9, height) * 0.035;
    color += vec3(0.12, 0.16, 0.2) * veil;
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface SceneManagerOptions {
  backgroundColor: string;
  qualityPreset: QualityPreset;
  quality?: QualityLevel;
}

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly lights: LightEffect;
  readonly environmentTexture: THREE.Texture;
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly contactShadows: THREE.Group;
  private readonly treeBase: THREE.Group;
  private readonly groundDetails: THREE.Group;
  private iceCrystals: THREE.InstancedMesh | null = null;
  private groundSparkles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  private groundQuality: QualityLevel = 'ultra';
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly backgroundColor = new THREE.Color('#080E20');

  constructor(renderer: THREE.WebGLRenderer, options: SceneManagerOptions) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(options.backgroundColor, 0.0105);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileCubemapShader();
    const room = new RoomEnvironment(renderer);
    this.environmentTexture = this.pmrem.fromScene(room, 0.035).texture;
    this.scene.environment = this.environmentTexture;
    room.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      }
    });

    this.scene.background = this.backgroundColor.clone();
    this.sky = this.createSky();
    this.scene.add(this.sky);

    this.lights = new LightEffect(this.scene);
    this.lights.setQuality(options.qualityPreset);

    this.ground = this.createGround();
    this.scene.add(this.ground);

    this.contactShadows = this.createContactShadows();
    this.scene.add(this.contactShadows);

    this.treeBase = this.createTreeBase();
    this.scene.add(this.treeBase);

    this.groundDetails = this.createGroundDetails();
    this.scene.add(this.groundDetails);
    this.setQuality(options.qualityPreset, options.quality ?? 'ultra');

    this.setBackground(options.backgroundColor);
    this.scene.add(this.createDistantHaze());
    this.scene.add(this.createDistantRidges());
    this.scene.add(this.createDistantPines());
  }

  private createSky(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
    const geometry = new THREE.SphereGeometry(120, 48, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color('#020910') },
        uBottomColor: { value: new THREE.Color('#0b202b') },
        uHorizonColor: { value: new THREE.Color('#163843') }
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -20;
    mesh.frustumCulled = false;
    return mesh;
  }

  private createGround(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> {
    const geometry = new THREE.PlaneGeometry(150, 150, 110, 110);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const nearWhite = new THREE.Color('#A8BBC8');
    const nearBlue = new THREE.Color('#263B4C');
    const farNight = new THREE.Color('#15232E');
    const rng = Math.random;

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const radius = Math.sqrt(x * x + z * z);
      const falloff = THREE.MathUtils.smoothstep(radius, 2.5, 19);
      const ripple =
        Math.sin(x * 0.45 + Math.cos(z * 0.17)) * 0.032 +
        Math.cos(z * 0.33 + Math.sin(x * 0.21)) * 0.026;
      const edgeMound = Math.sin(x * 0.09) * Math.cos(z * 0.075) * 0.9;
      positions.setY(
        i,
        0.008 + ripple * falloff + edgeMound * THREE.MathUtils.smoothstep(radius, 18, 54)
      );

      const shade = 0.18 + rng() * 0.26;
      const color = nearBlue.clone().lerp(nearWhite, shade);
      color.lerp(farNight, THREE.MathUtils.smoothstep(radius, 18, 68) * 0.92);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const snowTexture = this.createSnowTexture();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: snowTexture,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.015,
      envMapIntensity: 0.12
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.position.y = -0.012;
    return mesh;
  }

  private createSnowTexture(): THREE.CanvasTexture {
    const texture = makeCanvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = 'rgba(110, 135, 148, 1)';
      ctx.fillRect(0, 0, 512, 512);
      const rng = (() => {
        let seed = 87731;
        return (): number => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };
      })();
      for (let i = 0; i < 9000; i += 1) {
        const x = rng() * 512;
        const y = rng() * 512;
        const alpha = 0.03 + rng() * 0.13;
        const light = rng() > 0.52;
        ctx.fillStyle = light
          ? `rgba(249, 252, 249, ${alpha})`
          : `rgba(61, 86, 93, ${alpha * 0.62})`;
        const size = rng() > 0.94 ? 2.2 : 0.8;
        ctx.beginPath();
        ctx.ellipse(x, y, size * (0.7 + rng()), size * 0.45, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 110; i += 1) {
        const x = rng() * 512;
        const y = rng() * 512;
        const length = 15 + rng() * 76;
        const gradient = ctx.createLinearGradient(x, y, x + length, y + 3);
        gradient.addColorStop(0, 'rgba(232, 242, 242, 0)');
        gradient.addColorStop(0.5, `rgba(238, 248, 248, ${0.03 + rng() * 0.06})`);
        gradient.addColorStop(1, 'rgba(232, 242, 242, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x + length / 2, y, length / 2, 1 + rng() * 2, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(26, 26);
    return texture;
  }

  private createDistantRidges(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'distant-snow-ridges';
    const layers = [
      {
        radius: 57,
        baseHeight: 6.5,
        variation: 3.6,
        topColor: '#1b343d',
        bottomColor: '#07141b',
        seed: 1.8
      },
      {
        radius: 78,
        baseHeight: 11.5,
        variation: 5.4,
        topColor: '#142932',
        bottomColor: '#061017',
        seed: 4.6
      }
    ];

    for (const layer of layers) {
      const segments = 160;
      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];
      const top = new THREE.Color(layer.topColor);
      const bottom = new THREE.Color(layer.bottomColor);

      for (let i = 0; i < segments; i += 1) {
        const angle = (i / segments) * Math.PI * 2;
        const height =
          layer.baseHeight +
          Math.sin(angle * 2.1 + layer.seed) * layer.variation +
          Math.sin(angle * 5.7 + layer.seed * 2.3) * layer.variation * 0.38 +
          Math.sin(angle * 11.4 + layer.seed * 3.1) * layer.variation * 0.13;
        const radius = layer.radius + Math.sin(angle * 3.7 + layer.seed) * 1.6;
        positions.push(Math.cos(angle) * radius, -1.4, Math.sin(angle) * radius);
        colors.push(bottom.r, bottom.g, bottom.b);
        positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        colors.push(top.r, top.g, top.b);
      }

      for (let i = 0; i < segments; i += 1) {
        const next = (i + 1) % segments;
        const a = i * 2;
        const b = i * 2 + 1;
        const c = next * 2;
        const d = next * 2 + 1;
        indices.push(a, c, b, b, c, d);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        fog: true,
        toneMapped: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = -7;
      group.add(mesh);
    }
    return group;
  }

  private createDistantPines(): THREE.InstancedMesh {
    const count = 92;
    const tiers = [
      { radius: 0.46, height: 0.58, y: 0.29 },
      { radius: 0.35, height: 0.54, y: 0.62 },
      { radius: 0.23, height: 0.5, y: 0.93 }
    ];
    const geometries: THREE.BufferGeometry[] = [];
    for (const tier of tiers) {
      const cone = new THREE.ConeGeometry(tier.radius, tier.height, 6, 1);
      cone.translate(0, tier.y, 0);
      geometries.push(cone);
    }
    const merged = new THREE.BufferGeometry();
    const mergedPositions: number[] = [];
    const mergedIndices: number[] = [];
    let offset = 0;
    for (const geometry of geometries) {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 1) {
        mergedPositions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
      }
      const index = geometry.getIndex();
      if (index) {
        for (let i = 0; i < index.count; i += 1) {
          mergedIndices.push(index.getX(i) + offset);
        }
      }
      offset += positions.count;
      geometry.dispose();
    }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
    merged.setIndex(mergedIndices);
    merged.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: 0x142c34,
      fog: true,
      toneMapped: true
    });
    const mesh = new THREE.InstancedMesh(merged, material, count);
    mesh.name = 'distant-pines';
    mesh.renderOrder = -6;
    const rng = (() => {
      let seed = 44123;
      return (): number => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = 41 + rng() * 22;
      const height = 1.15 + rng() * 2.8;
      const width = height * (0.64 + rng() * 0.32);
      position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      quaternion.setFromAxisAngle(up, rng() * Math.PI);
      scale.set(width, height, width);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  private createContactShadows(): THREE.Group {
    const group = new THREE.Group();
    group.renderOrder = -1;
    const treeShadowTexture = makeCanvasTexture(512, 512, (ctx) => {
      const gradient = ctx.createRadialGradient(256, 256, 8, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(2,12,15,0.55)');
      gradient.addColorStop(0.35, 'rgba(2,12,15,0.34)');
      gradient.addColorStop(0.76, 'rgba(2,12,15,0.1)');
      gradient.addColorStop(1, 'rgba(2,12,15,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    });
    const treeShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 8.2),
      new THREE.MeshBasicMaterial({
        map: treeShadowTexture,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        toneMapped: false
      })
    );
    treeShadow.rotation.x = -Math.PI / 2;
    treeShadow.position.y = 0.024;
    group.add(treeShadow);

    const giftShadowTexture = makeRadialTexture('rgba(2,10,14,0.5)', 'rgba(2,10,14,0)', 128);
    for (let i = 0; i < 6; i += 1) {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.45),
        new THREE.MeshBasicMaterial({
          map: giftShadowTexture,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          toneMapped: false
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.03;
      shadow.visible = false;
      group.add(shadow);
    }
    return group;
  }

  /**
   * A low snow/stone presentation plinth plus a deliberately simulated warm
   * reflection. The reflection is a CanvasTexture on a plane, not a planar
   * mirror or SSR pass; docs/F3/MATERIAL_LIGHTING.md calls this out explicitly.
   */
  private createTreeBase(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tree-presentation-base';

    const stone = new THREE.MeshStandardMaterial({
      color: '#374241',
      roughness: 0.82,
      metalness: 0.16,
      envMapIntensity: 0.7
    });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.16, 64, 1), stone);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    group.add(plinth);

    const snowCap = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.3, 0.055, 64, 1),
      new THREE.MeshStandardMaterial({
        color: '#dfe9e5',
        roughness: 0.9,
        metalness: 0.01,
        envMapIntensity: 0.42
      })
    );
    snowCap.position.y = 0.18;
    snowCap.receiveShadow = true;
    group.add(snowCap);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.34, 0.026, 7, 72),
      new THREE.MeshStandardMaterial({
        color: '#d5ad69',
        roughness: 0.27,
        metalness: 0.7,
        emissive: '#2e1c0b',
        emissiveIntensity: 0.28,
        envMapIntensity: 1.25
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.175;
    group.add(rim);

    // A wide, near-flush presentation ring keeps the five gifts and the tree
    // shadow readable while still giving the hero tree a deliberate stage.
    const stage = new THREE.Mesh(
      new THREE.RingGeometry(2.62, 3.48, 80),
      new THREE.MeshStandardMaterial({
        color: '#aebbb5',
        roughness: 0.86,
        metalness: 0.1,
        envMapIntensity: 0.32,
        side: THREE.DoubleSide
      })
    );
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = 0.012;
    stage.receiveShadow = true;
    group.add(stage);

    const stageRim = new THREE.Mesh(
      new THREE.TorusGeometry(3.455, 0.018, 6, 80),
      new THREE.MeshStandardMaterial({
        color: '#e3bc75',
        roughness: 0.28,
        metalness: 0.78,
        emissive: '#3b260d',
        emissiveIntensity: 0.3,
        envMapIntensity: 1.2
      })
    );
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.y = 0.02;
    group.add(stageRim);

    const glowTexture = makeCanvasTexture(512, 512, (ctx) => {
      const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(255, 210, 139, 0.32)');
      gradient.addColorStop(0.28, 'rgba(255, 172, 99, 0.15)');
      gradient.addColorStop(0.68, 'rgba(255, 148, 104, 0.035)');
      gradient.addColorStop(1, 'rgba(255, 148, 104, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#ffd58a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(256, 256, 176, 0, Math.PI * 2);
      ctx.stroke();
    });
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 7.2),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.014;
    glow.renderOrder = -1;
    group.add(glow);

    const reflectionTexture = makeCanvasTexture(256, 512, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, 'rgba(255, 197, 139, 0.25)');
      gradient.addColorStop(0.3, 'rgba(255, 154, 112, 0.11)');
      gradient.addColorStop(0.72, 'rgba(255, 126, 130, 0.025)');
      gradient.addColorStop(1, 'rgba(255, 126, 130, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 34; i += 1) {
        const x = Math.random() * 256;
        const alpha = 0.02 + Math.random() * 0.055;
        ctx.fillStyle = `rgba(255, 210, 150, ${alpha})`;
        ctx.fillRect(x, 0, 1 + Math.random() * 2, 512);
      }
    });
    const reflection = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 5.6),
      new THREE.MeshBasicMaterial({
        map: reflectionTexture,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    reflection.name = 'simulated-ground-reflection';
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.set(0, 0.022, 3.15);
    reflection.renderOrder = 0;
    group.add(reflection);

    return group;
  }

  private createGroundDetails(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'winter-ground-details';
    const rng = mulberry32(31804);

    // Irregular, nearly flush snow patches. They interrupt the large dark
    // ground plane without reading as white discs or hiding the gifts.
    const patchGeometry = new THREE.CircleGeometry(1, 28);
    const patchPositions = patchGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 1; i < patchPositions.count; i += 1) {
      const x = patchPositions.getX(i);
      const y = patchPositions.getY(i);
      const angle = Math.atan2(y, x);
      const radius = Math.sqrt(x * x + y * y);
      const jitter = 0.78 + Math.sin(angle * 3.1 + 0.8) * 0.09 + Math.sin(angle * 7.7) * 0.06;
      patchPositions.setXY(i, Math.cos(angle) * radius * jitter, Math.sin(angle) * radius * jitter);
    }
    patchPositions.needsUpdate = true;
    patchGeometry.computeVertexNormals();
    const patchMaterial = new THREE.MeshBasicMaterial({
      color: '#A8BBC8',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 9; i += 1) {
      const angle = -1.3 + i * 0.6 + rng() * 0.2;
      const radius = 3.8 + rng() * 2.8;
      const patch = new THREE.Mesh(patchGeometry, patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = rng() * Math.PI;
      patch.position.set(Math.cos(angle) * radius, 0.007, Math.sin(angle) * radius);
      patch.scale.set(0.45 + rng() * 0.9, 0.3 + rng() * 0.55, 1);
      patch.renderOrder = 1;
      group.add(patch);
    }

    const crystalGeometry = new THREE.ConeGeometry(0.028, 0.22, 4);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: '#BED8E2',
      roughness: 0.2,
      metalness: 0.06,
      transparent: true,
      opacity: 0.64,
      emissive: new THREE.Color('#123D4A'),
      emissiveIntensity: 0.12
    });
    const crystals = new THREE.InstancedMesh(crystalGeometry, crystalMaterial, 48);
    crystals.name = 'ice-crystals';
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 48; i += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = 5.2 + rng() * 4.2;
      dummy.position.set(
        Math.cos(angle) * radius,
        0.02 + rng() * 0.05,
        Math.sin(angle) * radius
      );
      dummy.rotation.set((rng() - 0.5) * 0.35, rng() * Math.PI, (rng() - 0.5) * 0.35);
      const scale = 0.65 + rng() * 1.05;
      dummy.scale.set(scale, scale * (0.8 + rng() * 0.6), scale);
      dummy.updateMatrix();
      crystals.setMatrixAt(i, dummy.matrix);
    }
    crystals.instanceMatrix.needsUpdate = true;
    crystals.frustumCulled = false;
    group.add(crystals);
    this.iceCrystals = crystals;

    const sparkleCount = 180;
    const positions = new Float32Array(sparkleCount * 3);
    const colors = new Float32Array(sparkleCount * 3);
    const cool = new THREE.Color('#A8BBC8');
    const warm = new THREE.Color('#FFD58A');
    for (let i = 0; i < sparkleCount; i += 1) {
      const angle = rng() * Math.PI * 2;
      const radius = 3.8 + rng() * 7.2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.025 + rng() * 0.05;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const tint = cool.clone().lerp(warm, rng() * 0.28);
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    const sparkleGeometry = new THREE.BufferGeometry();
    sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    sparkleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    sparkleGeometry.setDrawRange(0, sparkleCount);
    const sparkles = new THREE.Points(
      sparkleGeometry,
      new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    sparkles.name = 'ground-sparkles';
    sparkles.frustumCulled = false;
    group.add(sparkles);
    this.groundSparkles = sparkles;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.55, 4.12, 128),
      new THREE.MeshBasicMaterial({
        color: '#FFD58A',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide
      })
    );
    ring.name = 'champagne-stage-ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.019;
    ring.renderOrder = 1;
    group.add(ring);

    return group;
  }

  private createDistantHaze(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(80, 22);
    const texture = makeCanvasTexture(1024, 256, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, 'rgba(29,75,80,0)');
      gradient.addColorStop(0.6, 'rgba(33,82,86,0.1)');
      gradient.addColorStop(1, 'rgba(157,194,195,0.22)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 256);
    });
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 2.8, -34);
    mesh.renderOrder = -5;
    return mesh;
  }

  setBackground(hex: string): void {
    const color = new THREE.Color(hex);
    this.backgroundColor.copy(color);
    this.scene.background = color.clone();

    const top = color.clone().multiplyScalar(0.42).offsetHSL(0.02, -0.03, -0.02);
    const bottom = color.clone().offsetHSL(-0.015, 0.05, 0.045);
    const horizon = color.clone().offsetHSL(-0.025, 0.02, 0.13);
    this.sky.material.uniforms.uTopColor.value.copy(top);
    this.sky.material.uniforms.uBottomColor.value.copy(bottom);
    this.sky.material.uniforms.uHorizonColor.value.copy(horizon);

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(color).offsetHSL(0, 0.015, 0.035);
    }
  }

  setAmbient(multiplier: number): void {
    this.lights.setAmbient(multiplier);
  }

  setQuality(preset: QualityPreset, quality: QualityLevel = this.groundQuality): void {
    this.groundQuality = quality;
    this.lights.setQuality(preset);
    if (this.iceCrystals) {
      this.iceCrystals.count = quality === 'ultra' ? 48 : quality === 'balanced' ? 24 : 0;
      this.iceCrystals.visible = this.iceCrystals.count > 0;
    }
    if (this.groundSparkles) {
      const sparkleCount = quality === 'ultra' ? 180 : quality === 'balanced' ? 90 : 0;
      this.groundSparkles.geometry.setDrawRange(0, sparkleCount);
      this.groundSparkles.visible = sparkleCount > 0;
    }
  }

  setTreeShadowScale(scale: number): void {
    const shadow = this.contactShadows.children[0];
    if (shadow) shadow.scale.set(scale, scale, 1);
  }

  getContactShadow(index: number): THREE.Object3D | undefined {
    return this.contactShadows.children[index];
  }

  showGiftShadow(index: number): void {
    const shadow = this.contactShadows.children[index + 1];
    if (shadow) shadow.visible = true;
  }

  setTreeShadowVisible(visible: boolean): void {
    const shadow = this.contactShadows.children[0];
    if (shadow) shadow.visible = visible;
  }

  dispose(): void {
    this.environmentTexture.dispose();
    this.pmrem.dispose();
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.treeBase.traverse((child) => {
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
    this.groundDetails.traverse((child) => {
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

