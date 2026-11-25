import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { QualityPreset } from '../config';
import { LightEffect } from '../effects/LightEffect';
import { makeCanvasTexture, makeRadialTexture } from './utils';

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
}

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly lights: LightEffect;
  readonly environmentTexture: THREE.Texture;
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly contactShadows: THREE.Group;
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly backgroundColor = new THREE.Color('#061522');

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
    const nearWhite = new THREE.Color('#d6e2e3');
    const nearBlue = new THREE.Color('#a9bec2');
    const farNight = new THREE.Color('#1a2b32');
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

      const shade = 0.4 + rng() * 0.36;
      const color = nearBlue.clone().lerp(nearWhite, shade);
      color.lerp(farNight, THREE.MathUtils.smoothstep(radius, 18, 68) * 0.92);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const snowTexture = this.createSnowTexture();
    const material = new THREE.MeshStandardMaterial({
      color: 0xaec2c5,
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
      ctx.fillStyle = 'rgba(191, 208, 211, 1)';
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
      new THREE.PlaneGeometry(8.2, 7.2),
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

  setQuality(preset: QualityPreset): void {
    this.lights.setQuality(preset);
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
  }
}
