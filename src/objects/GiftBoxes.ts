import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, damp, makeRadialTexture, makeCanvasTexture } from '../core/utils';

interface GiftSpec {
  width: number;
  height: number;
  depth: number;
  color: string;
  ribbon: string;
  position: [number, number, number];
  rotation: number;
  label: string;
}

const GIFT_SPECS: GiftSpec[] = [
  {
    width: 0.9,
    height: 0.7,
    depth: 0.8,
    color: '#74253A',
    ribbon: '#E4BF7C',
    position: [2.0, 0.018, 1.85],
    rotation: 0.1,
    label: '酒红礼盒'
  },
  {
    width: 0.7,
    height: 0.6,
    depth: 0.6,
    color: '#B88D52',
    ribbon: '#F6E8CE',
    position: [0.6, 0.018, 2.88],
    rotation: -0.12,
    label: '香槟礼盒'
  },
  {
    width: 0.62,
    height: 0.52,
    depth: 0.56,
    color: '#123D31',
    ribbon: '#D7B474',
    position: [-1.75, 0.018, 2.22],
    rotation: 0.22,
    label: '墨绿礼盒'
  },
  {
    width: 0.8,
    height: 0.6,
    depth: 0.7,
    color: '#D8D2C4',
    ribbon: '#C7A368',
    position: [-0.62, 0.018, 3.05],
    rotation: -0.19,
    label: '珍珠礼盒'
  },
  {
    width: 0.54,
    height: 0.5,
    depth: 0.54,
    color: '#A96070',
    ribbon: '#F3DCC6',
    position: [2.85, 0.018, 0.72],
    rotation: 0.32,
    label: '玫瑰礼盒'
  }
];

export interface GiftState {
  index: number;
  label: string;
  opened: boolean;
  center: THREE.Vector3;
}

interface GiftRuntime {
  index: number;
  spec: GiftSpec;
  group: THREE.Group;
  lidGroup: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  ribbonMaterials: THREE.MeshStandardMaterial[];
  beamMaterial: THREE.MeshBasicMaterial;
  beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  insideGlow: THREE.Sprite;
  light: THREE.PointLight;
  openAmount: number;
  openTarget: number;
  hovered: boolean;
  scaleCurrent: number;
  scaleTarget: number;
  pickMeshes: THREE.Object3D[];
  phase: number;
  center: THREE.Vector3;
}

const createLoopShape = (): THREE.Shape => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.005);
  shape.bezierCurveTo(-0.08, 0.16, -0.29, 0.15, -0.25, 0.02);
  shape.bezierCurveTo(-0.22, -0.09, -0.08, -0.09, 0, -0.015);
  shape.closePath();
  return shape;
};

const createBeamTexture = (): THREE.CanvasTexture =>
  makeCanvasTexture(96, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 256, 0, 0);
    gradient.addColorStop(0, 'rgba(255, 218, 153, 0.62)');
    gradient.addColorStop(0.35, 'rgba(255, 198, 117, 0.25)');
    gradient.addColorStop(0.8, 'rgba(255, 183, 94, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 183, 94, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 96, 256);
    for (let x = 0; x < 96; x += 12) {
      const side = ctx.createLinearGradient(x, 0, x + 12, 0);
      side.addColorStop(0, 'rgba(255,255,255,0)');
      side.addColorStop(0.5, 'rgba(255,255,255,0.045)');
      side.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = side;
      ctx.fillRect(x, 0, 12, 256);
    }
  });

const createGiftTagTexture = (): THREE.CanvasTexture =>
  makeCanvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#f1e6d3';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = 'rgba(155, 113, 57, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(9, 9, 238, 110);
    ctx.fillStyle = '#705031';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 38px Georgia, serif';
    ctx.fillText('For you', 128, 57);
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = 'rgba(112,80,49,0.62)';
    ctx.fillText('WITH LOVE', 128, 91);
  });

export class GiftBoxes {
  readonly group = new THREE.Group();
  private readonly gifts: GiftRuntime[] = [];
  private readonly beamTexture = createBeamTexture();
  private readonly tagTexture = createGiftTagTexture();
  private readonly glowTexture = makeRadialTexture(
    'rgba(255, 228, 171, 0.9)',
    'rgba(255, 172, 68, 0)',
    128
  );
  private celebration = 0;
  private time = 0;

  constructor() {
    this.group.name = 'gift-boxes';
    GIFT_SPECS.forEach((spec, index) => this.buildGift(spec, index));
  }

  /**
   * Spreads the five gifts outward with the enlarged tree, without changing
   * their box dimensions or the existing open/hover animations.
   */
  setPresentationScale(scale: number): void {
    const safeScale = Math.max(0.8, scale);
    for (const gift of this.gifts) {
      const [x, y, z] = gift.spec.position;
      gift.group.position.x = x * safeScale;
      gift.group.position.z = z * safeScale;
      gift.center.set(x * safeScale, y, z * safeScale);
    }
  }

  private buildGift(spec: GiftSpec, index: number): void {
    const group = new THREE.Group();
    group.name = `gift-${index + 1}`;
    group.position.set(...spec.position);
    group.rotation.y = spec.rotation;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.color),
      roughness: 0.48,
      metalness: 0.08,
      envMapIntensity: 0.58
    });
    const ribbonMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.ribbon),
      roughness: 0.34,
      metalness: 0.38,
      emissive: new THREE.Color('#3b250a'),
      emissiveIntensity: 0.12,
      envMapIntensity: 0.95
    });
    const darkRibbon = ribbonMaterial.clone();
    darkRibbon.color.multiplyScalar(0.83);

    const bodyGeometry = new RoundedBoxGeometry(spec.width, spec.height, spec.depth, 2, 0.035);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = spec.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const verticalRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, spec.height + 0.012, spec.depth + 0.015),
      ribbonMaterial
    );
    verticalRibbon.position.y = spec.height / 2;
    verticalRibbon.castShadow = true;
    group.add(verticalRibbon);

    const horizontalRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width + 0.015, spec.height + 0.012, 0.045),
      ribbonMaterial
    );
    horizontalRibbon.position.y = spec.height / 2;
    horizontalRibbon.castShadow = true;
    group.add(horizontalRibbon);

    const lidGroup = new THREE.Group();
    lidGroup.position.y = spec.height;
    group.add(lidGroup);

    const lidGeometry = new RoundedBoxGeometry(spec.width + 0.06, 0.105, spec.depth + 0.06, 2, 0.035);
    const lid = new THREE.Mesh(lidGeometry, bodyMaterial);
    lid.position.y = 0.055;
    lid.castShadow = true;
    lid.receiveShadow = true;
    lidGroup.add(lid);

    const lidRibbonVertical = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.112, spec.depth + 0.075),
      ribbonMaterial
    );
    lidRibbonVertical.position.y = 0.055;
    lidGroup.add(lidRibbonVertical);

    const lidRibbonHorizontal = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width + 0.075, 0.112, 0.045),
      ribbonMaterial
    );
    lidRibbonHorizontal.position.y = 0.055;
    lidGroup.add(lidRibbonHorizontal);

    const bowScale = clamp(Math.max(spec.width, spec.depth) * 1.02, 0.52, 0.9);
    const bowGroup = this.createBow(bowScale, ribbonMaterial, darkRibbon);
    bowGroup.position.y = 0.16;
    lidGroup.add(bowGroup);

    // A hand-written tag, tied to the first three gifts.
    if (index < 3) {
      const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.16),
        new THREE.MeshBasicMaterial({
          map: this.tagTexture,
          transparent: true,
          side: THREE.DoubleSide,
          toneMapped: false
        })
      );
      tag.position.set(spec.width * 0.28, spec.height + 0.05, spec.depth * 0.5 + 0.04);
      tag.rotation.set(-0.06, 0, -0.13);
      group.add(tag);
      const string = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.18, 4),
        new THREE.MeshBasicMaterial({ color: 0xd4b47d, toneMapped: false })
      );
      string.position.set(spec.width * 0.22, spec.height + 0.14, spec.depth * 0.5 + 0.035);
      string.rotation.z = 0.62;
      group.add(string);
    }

    const insideGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: 0xffd392,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    insideGlow.position.y = spec.height * 0.85;
    insideGlow.scale.set(0.75, 0.55, 1);
    group.add(insideGlow);

    const beamMaterial = new THREE.MeshBasicMaterial({
      map: this.beamTexture,
      color: 0xffcc85,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, spec.width * 0.36, 1.25, 24, 1, true),
      beamMaterial
    );
    beam.position.y = spec.height + 0.52;
    beam.renderOrder = 2;
    group.add(beam);

    const light = new THREE.PointLight(0xffbd6f, 0, 3.6, 2);
    light.position.y = spec.height * 0.8;
    group.add(light);

    this.group.add(group);

    const pickMeshes: THREE.Object3D[] = [];
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && !(mesh.material as THREE.Material).transparent) {
        mesh.userData.pickType = 'gift';
        mesh.userData.giftIndex = index;
        pickMeshes.push(mesh);
      }
    });

    this.gifts.push({
      index,
      spec,
      group,
      lidGroup,
      bodyMaterial,
      ribbonMaterials: [ribbonMaterial, darkRibbon],
      beamMaterial,
      beam,
      insideGlow,
      light,
      openAmount: 0,
      openTarget: 0,
      hovered: false,
      scaleCurrent: 1,
      scaleTarget: 1,
      pickMeshes,
      phase: Math.random() * Math.PI * 2,
      center: new THREE.Vector3(...spec.position)
    });
  }

  private createBow(
    scale: number,
    material: THREE.MeshStandardMaterial,
    darkMaterial: THREE.MeshStandardMaterial
  ): THREE.Group {
    const group = new THREE.Group();
    group.scale.setScalar(scale);
    const loopShape = createLoopShape();
    const loopGeometry = new THREE.ExtrudeGeometry(loopShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.008,
      bevelThickness: 0.007,
      curveSegments: 10
    });
    loopGeometry.center();

    const left = new THREE.Mesh(loopGeometry, material);
    left.position.x = -0.12;
    left.rotation.z = 0.12;
    group.add(left);

    const right = new THREE.Mesh(loopGeometry.clone(), material);
    right.scale.x = -1;
    right.position.x = 0.12;
    right.rotation.z = -0.12;
    group.add(right);

    const tailGeometry = new THREE.BoxGeometry(0.055, 0.23, 0.018);
    const tailLeft = new THREE.Mesh(tailGeometry, darkMaterial);
    tailLeft.position.set(-0.055, -0.15, -0.02);
    tailLeft.rotation.z = 0.38;
    group.add(tailLeft);

    const tailRight = new THREE.Mesh(tailGeometry, darkMaterial);
    tailRight.position.set(0.07, -0.15, -0.015);
    tailRight.rotation.z = -0.5;
    group.add(tailRight);

    const knot = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10),
      material
    );
    knot.scale.set(1, 0.8, 0.7);
    group.add(knot);

    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
      }
    });
    return group;
  }

  update(dt: number, time: number, _camera: THREE.Camera): void {
    this.time = time;

    for (const gift of this.gifts) {
      gift.openAmount = damp(gift.openAmount, gift.openTarget, 4.2, dt);
      gift.group.scale.setScalar(damp(gift.scaleCurrent, gift.scaleTarget, 8, dt));
      gift.scaleCurrent = gift.group.scale.x;

      const hoverOffset = gift.hovered && gift.openTarget < 0.5 ? 0.035 : 0;

      gift.lidGroup.position.y =
        gift.spec.height +
        gift.openAmount * (0.34 + Math.sin(time * 1.4 + gift.phase) * 0.025 * gift.openAmount);
      gift.lidGroup.rotation.z = -gift.openAmount * 0.28;
      gift.lidGroup.rotation.x = gift.openAmount * 0.1;
      gift.group.position.y = gift.spec.position[1] + hoverOffset;

      gift.bodyMaterial.emissive.setHex(0x1a0e05);
      gift.bodyMaterial.emissiveIntensity =
        gift.openAmount * 0.18 + this.celebration * 0.16;
      gift.ribbonMaterials[0].emissive.setHex(0x3b250a);
      gift.ribbonMaterials[0].emissiveIntensity =
        0.12 + gift.openAmount * 0.22 + this.celebration * 0.22;

      gift.beamMaterial.opacity =
        gift.openAmount * (0.46 + Math.sin(time * 1.3 + gift.phase) * 0.05);
      gift.beam.rotation.y = time * 0.18;
      gift.insideGlow.material.opacity =
        gift.openAmount * 0.68 + Math.sin(time * 2.1 + gift.phase) * 0.035;
      gift.light.intensity = gift.openAmount * 5.5;
    }
  }

  setHover(index: number | null): void {
    for (const gift of this.gifts) {
      gift.hovered = gift.index === index;
      gift.scaleTarget = gift.hovered ? 1.035 : 1;
    }
  }

  open(index: number): GiftState | null {
    const gift = this.gifts[index];
    if (!gift) return null;
    gift.openTarget = 1;
    gift.scaleTarget = 1;
    return {
      index,
      label: gift.spec.label,
      opened: true,
      center: gift.center.clone()
    };
  }

  closeAll(): void {
    for (const gift of this.gifts) {
      gift.openTarget = 0;
    }
  }

  setCelebration(amount: number): void {
    this.celebration = clamp(amount, 0, 1);
  }

  updateContactShadows(shadows: THREE.Object3D[]): void {
    for (const gift of this.gifts) {
      const shadow = shadows[gift.index];
      if (shadow) {
        shadow.position.x = gift.group.position.x;
        shadow.position.z = gift.group.position.z;
        shadow.visible = true;
      }
    }
  }

  getGiftPosition(index: number): THREE.Vector3 {
    const gift = this.gifts[index];
    return gift ? gift.center.clone().setY(gift.spec.height * 0.7) : new THREE.Vector3();
  }

  getGiftLabel(index: number): string {
    return this.gifts[index]?.spec.label ?? '一份礼物';
  }

  get giftStates(): GiftState[] {
    return this.gifts.map((gift) => ({
      index: gift.index,
      label: gift.spec.label,
      opened: gift.openTarget > 0.5,
      center: gift.center.clone()
    }));
  }

  getPickMeshes(): THREE.Object3D[] {
    return this.gifts.flatMap((gift) => gift.pickMeshes);
  }

  dispose(): void {
    this.beamTexture.dispose();
    this.tagTexture.dispose();
    this.glowTexture.dispose();
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
}
