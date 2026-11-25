import * as THREE from 'three';
import type { LightMode, WishSettings } from '../config';
import { TreeBranches, type TreeConfig } from './TreeBranches';
import { TreeLights } from './TreeLights';
import { TreeStar } from './TreeStar';

export interface TreeVisualState {
  rotation: number;
  height: number;
}

export class ChristmasTree {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group();
  readonly branches: TreeBranches;
  readonly lights: TreeLights;
  readonly star: TreeStar;
  private rotation = 0;
  private rotate = true;
  private rotateSpeed = 0.3;
  private height = 8;
  private crown = 2.5;
  private density = 180;
  private layers = 7;
  private foliageColor = '#0B5D3B';

  constructor(settings: WishSettings) {
    this.group.name = 'christmas-tree';
    this.body.name = 'christmas-tree-body';
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

  private treeConfig(): TreeConfig {
    return {
      height: this.height,
      crownRadius: this.crown,
      density: this.density,
      layers: this.layers,
      foliageColor: this.foliageColor
    };
  }

  update(dt: number, time: number): void {
    if (this.rotate) {
      this.rotation += dt * this.rotateSpeed * 0.24;
      this.body.rotation.y = this.rotation;
    }
    this.lights.update(time);
    this.star.update(dt, time);
  }

  rebuildTree(settings: WishSettings): void {
    const shapeChanged =
      this.height !== settings.treeHeight ||
      this.crown !== settings.crownRadius ||
      this.density !== settings.density ||
      this.layers !== settings.layers;
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

  rebuildLights(settings: WishSettings): void {
    this.lights.configure(
      this.height,
      this.crown,
      settings.lightCount,
      settings.lightMode,
      settings.lightColor
    );
  }

  setLightMode(mode: LightMode, primary: string): void {
    this.lights.updateColors(mode, primary);
  }

  setLightColor(primary: string): void {
    this.lights.updateColors(this.lights.currentMode, primary);
  }

  setLightBrightness(brightness: number): void {
    this.lights.setBrightness(brightness);
  }

  setLightSpeed(speed: number): void {
    this.lights.setFlashSpeed(speed);
  }

  setLightsEnabled(enabled: boolean): void {
    this.lights.setEnabled(enabled);
  }

  setLightsReveal(progress: number): void {
    this.lights.setReveal(progress);
  }

  setRotationSpeed(speed: number): void {
    this.rotateSpeed = speed;
  }

  setRotationEnabled(enabled: boolean): void {
    this.rotate = enabled;
  }

  resetPresentation(): void {
    this.body.visible = true;
    this.body.scale.setScalar(1);
    this.star.root.visible = true;
    this.lights.setReveal(1);
    this.lights.setEnabled(true);
  }

  setBodyVisible(visible: boolean): void {
    this.body.visible = visible;
  }

  setBodyReveal(progress: number): void {
    const eased = THREE.MathUtils.clamp(progress, 0, 1);
    const scale = 0.02 + eased * 0.98;
    this.body.scale.set(scale, Math.max(0.03, Math.pow(eased, 0.82)), scale);
    this.body.visible = eased > 0.001;
  }

  setStarVisible(visible: boolean): void {
    this.star.root.visible = visible;
  }

  getPickMeshes(): THREE.Object3D[] {
    return [...this.branches.getInteractiveMeshes(), ...this.star.getPickMeshes()];
  }

  getTopY(): number {
    return this.height + 0.2;
  }

  get treeHeight(): number {
    return this.height;
  }

  get treeCrown(): number {
    return this.crown;
  }

  flashStar(): void {
    this.star.flash();
  }

  dispose(): void {
    this.branches.dispose();
    this.lights.dispose();
    this.star.dispose();
  }
}
