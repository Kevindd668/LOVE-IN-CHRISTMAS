import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { damp, makeCanvas } from '../core/utils';

export interface PhotoCardSource {
  id: string;
  texture: THREE.Texture;
  caption: string;
  fileName: string;
}

const CARD_WIDTH = 1.06;
const CARD_HEIGHT = 1.4;
const CARD_DEPTH = 0.06;
const PHOTO_WIDTH = 0.86;
const PHOTO_HEIGHT = 1.01;
const PHOTO_ASPECT = PHOTO_WIDTH / PHOTO_HEIGHT;

export class PhotoCard {
  readonly group = new THREE.Group();
  readonly id: string;
  caption: string;
  fileName: string;
  private readonly frameMaterial: THREE.MeshStandardMaterial;
  private readonly imageMaterial: THREE.MeshBasicMaterial;
  private readonly imageMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly captionMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private captionTexture: THREE.CanvasTexture;
  private sourceTexture: THREE.Texture;
  private hovered = false;
  private focused = false;
  private dimmed = false;
  private currentHover = 0;
  private currentFocus = 0;
  private currentDim = 0;
  private readonly pickMeshes: THREE.Object3D[] = [];
  private readonly goldRingMaterial: THREE.MeshStandardMaterial;
  private readonly captionRule: THREE.Mesh;

  constructor(source: PhotoCardSource) {
    this.id = source.id;
    this.caption = source.caption;
    this.fileName = source.fileName;
    this.sourceTexture = source.texture;
    this.group.name = `photo-card-${source.id}`;
    this.group.userData.pickType = 'photo';
    this.group.userData.photoId = source.id;

    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x9d6c2c,
      metalness: 0.42,
      roughness: 0.46,
      emissive: new THREE.Color('#4a2d0d'),
      emissiveIntensity: 0.3,
      envMapIntensity: 0.8
    });
    const matMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1e7d5,
      roughness: 0.68,
      metalness: 0.02,
      envMapIntensity: 0.35
    });
    const goldBorderMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0ba7b,
      metalness: 0.8,
      roughness: 0.24,
      emissive: new THREE.Color('#6b4a1b'),
      emissiveIntensity: 0.28,
      envMapIntensity: 1.3
    });
    this.goldRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0bf84,
      metalness: 0.82,
      roughness: 0.24,
      envMapIntensity: 1
    });
    const backing = new THREE.Mesh(
      new RoundedBoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH, 2, 0.055),
      this.frameMaterial
    );
    backing.castShadow = true;
    this.group.add(backing);

    const matte = new THREE.Mesh(
      new RoundedBoxGeometry(CARD_WIDTH - 0.11, CARD_HEIGHT - 0.08, 0.03, 2, 0.047),
      matMaterial
    );
    matte.position.z = 0.037;
    this.group.add(matte);

    const photoBorder = new THREE.Mesh(
      new RoundedBoxGeometry(PHOTO_WIDTH + 0.026, PHOTO_HEIGHT + 0.026, 0.012, 2, 0.035),
      goldBorderMaterial
    );
    photoBorder.position.set(0, 0.105, 0.05);
    this.group.add(photoBorder);

    this.imageMaterial = new THREE.MeshBasicMaterial({
      map: this.sourceTexture,
      color: 0xfff6e7,
      side: THREE.DoubleSide
    });
    this.imageMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PHOTO_WIDTH, PHOTO_HEIGHT),
      this.imageMaterial
    );
    this.imageMesh.position.set(0, 0.105, 0.057);
    this.imageMesh.renderOrder = 1;
    this.group.add(this.imageMesh);
    this.applyCover(this.sourceTexture);

    this.captionTexture = this.createCaptionTexture(this.caption);
    this.captionMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.84, 0.19),
      new THREE.MeshBasicMaterial({
        map: this.captionTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false
      })
    );
    this.captionMesh.position.set(0, -0.553, 0.054);
    this.group.add(this.captionMesh);

    this.captionRule = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.0035, 0.004),
      this.goldRingMaterial
    );
    this.captionRule.position.set(0, -0.438, 0.055);
    this.group.add(this.captionRule);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.006, 6, 20),
      this.goldRingMaterial
    );
    ring.position.set(0, CARD_HEIGHT / 2 + 0.017, 0.004);
    this.group.add(ring);

    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.userData.pickType = 'photo';
        mesh.userData.photoId = source.id;
        this.pickMeshes.push(mesh);
      }
    });
  }

  private applyCover(texture: THREE.Texture): void {
    const image = texture.image as { width?: number; height?: number } | undefined;
    const imageWidth = image?.width ?? 640;
    const imageHeight = image?.height ?? 800;
    const imageAspect = imageWidth / Math.max(1, imageHeight);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.center.set(0.5, 0.5);
    if (imageAspect > PHOTO_ASPECT) {
      const visibleFraction = PHOTO_ASPECT / imageAspect;
      texture.repeat.set(visibleFraction, 1);
      texture.offset.set((1 - visibleFraction) / 2, 0);
    } else if (imageAspect < PHOTO_ASPECT) {
      const visibleFraction = imageAspect / PHOTO_ASPECT;
      texture.repeat.set(1, visibleFraction);
      texture.offset.set(0, (1 - visibleFraction) / 2);
    } else {
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);
    }
    texture.needsUpdate = true;
  }

  private createCaptionTexture(caption: string): THREE.CanvasTexture {
    const width = 1024;
    const height = 228;
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '400 126px "Songti SC", "STSong", "Noto Serif SC", "SimSun", serif';
    ctx.fillStyle = '#4b3724';
    const original = caption.trim().length > 0 ? caption.trim() : '我们的故事';
    const text = original.length > 18 ? `${original.slice(0, 17)}…` : original;
    const measured = ctx.measureText(text);
    const maxWidth = width - 150;
    if (measured.width > maxWidth) {
      const scale = maxWidth / measured.width;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, 1);
      ctx.fillText(text, 0, 4);
      ctx.restore();
    } else {
      ctx.fillText(text, width / 2, height / 2 + 4);
    }
    ctx.fillStyle = 'rgba(146,103,48,0.54)';
    ctx.fillRect(66, height / 2 - 0.7, 24, 1.4);
    ctx.fillRect(width - 90, height / 2 - 0.7, 24, 1.4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  setCaption(caption: string): void {
    if (caption === this.caption) return;
    this.caption = caption;
    this.captionTexture.dispose();
    this.captionTexture = this.createCaptionTexture(caption);
    const material = this.captionMesh.material as THREE.MeshBasicMaterial;
    material.map = this.captionTexture;
    material.needsUpdate = true;
  }

  setTexture(texture: THREE.Texture, fileName: string): void {
    this.sourceTexture = texture;
    this.fileName = fileName;
    this.imageMaterial.map = texture;
    this.imageMaterial.needsUpdate = true;
    this.applyCover(texture);
  }

  setCaptionsVisible(visible: boolean): void {
    this.captionMesh.visible = visible;
    this.captionRule.visible = visible;
  }

  setHovered(hovered: boolean): void {
    this.hovered = hovered;
  }

  setFocus(focused: boolean, dimmed: boolean): void {
    this.focused = focused;
    this.dimmed = dimmed;
  }

  update(dt: number): void {
    this.currentHover = damp(this.currentHover, this.hovered ? 1 : 0, 7, dt);
    this.currentFocus = damp(this.currentFocus, this.focused ? 1 : 0, 7, dt);
    this.currentDim = damp(this.currentDim, this.dimmed ? 1 : 0, 6, dt);

    const brightness = 1 - this.currentDim * 0.58;
    this.imageMaterial.color.setScalar(brightness);
    const captionMaterial = this.captionMesh.material as THREE.MeshBasicMaterial;
    captionMaterial.opacity = 1 - this.currentDim * 0.62;
    this.frameMaterial.emissiveIntensity =
      0.18 + this.currentHover * 0.34 + this.currentFocus * 0.16;
    this.goldRingMaterial.emissiveIntensity =
      0.2 + this.currentHover * 0.6 + this.currentFocus * 0.24;
  }

  getScaleBoost(): number {
    return 1 + this.currentHover * 0.045;
  }

  getPickMeshes(): THREE.Object3D[] {
    return this.pickMeshes;
  }

  dispose(): void {
    const materials = new Set<THREE.Material>();
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const childMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        childMaterials.forEach((material) => materials.add(material));
      }
    });
    for (const material of materials) {
      if ('map' in material && material.map instanceof THREE.Texture) {
        if (material.map !== this.sourceTexture && material.map !== this.captionTexture) {
          material.map.dispose();
        }
      }
      material.dispose();
    }
    this.captionTexture.dispose();
  }
}
