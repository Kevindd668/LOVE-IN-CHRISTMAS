import * as THREE from 'three';
import type { LightMode, WishSettings } from '../config';
import { TreeBranches, type TreeConfig } from './TreeBranches';
import { TreeLights } from './TreeLights';
import { TreeStar } from './TreeStar';
import { TreeHelix } from './TreeHelix';
import { TreeHeartOrnaments } from './TreeHeartOrnaments';

export interface TreeVisualState {
  rotation: number;
  height: number;
}

export class ChristmasTree {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group();
  readonly branches: TreeBranches;
  readonly lights: TreeLights;
  readonly helix: TreeHelix;
  readonly ornaments: TreeHeartOrnaments;
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

    this.branches = new TreeBranches(this.treeConfig(settings));
    this.lights = new TreeLights(
      this.height,
      this.crown,
      settings.lightCount,
      settings.lightMode,
      settings.lightColor
    );
    this.helix = new TreeHelix({ height: this.height, crownRadius: this.crown });
    this.ornaments = new TreeHeartOrnaments({ height: this.height, crownRadius: this.crown });
    this.star = new TreeStar(this.height);

    this.body.add(this.branches.group);
    this.body.add(this.lights.group);
    this.body.add(this.helix.group);
    this.body.add(this.ornaments.group);
    this.group.add(this.star.root);

    this.lights.setBrightness(settings.lightBrightness);
    this.lights.setFlashSpeed(settings.lightFlashSpeed);
    this.lights.setEnabled(settings.lightsOn);
    this.helix.setSpeed(settings.helixSpeed);
    this.helix.setPhase(settings.helixPhase);
    this.helix.setEnabled(settings.helixOn);
    this.ornaments.setEnabled(settings.ornamentsOn);
    this.star.root.visible = settings.crownHeartOn;
  }

  private treeConfig(settings: WishSettings): TreeConfig {
    return {
      height: this.height,
      crownRadius: this.crown,
      density: this.density,
      layers: this.layers,
      foliageColor: this.foliageColor,
      shadowColor: '#073D2A',
      highlightColor: '#27A66A',
      trunkHeight: 1,
      trunkRadius: 0.22,
      brightness: settings.treeBrightness
    };
  }

  update(dt: number, time: number): void {
    if (this.rotate) {
      this.rotation += dt * this.rotateSpeed * 0.24;
      this.body.rotation.y = this.rotation;
    }
    this.lights.update(time);
    this.helix.update(dt, time);
    this.ornaments.update(dt, time);
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
      this.branches.build(this.treeConfig(settings));
      this.lights.configure(this.height, this.crown, settings.lightCount, settings.lightMode, settings.lightColor);
      this.helix.build({ height: this.height, crownRadius: this.crown });
      this.ornaments.build({ height: this.height, crownRadius: this.crown });
      this.star.setHeight(this.height);
    } else if (paletteChanged) {
      this.branches.updatePalette(this.foliageColor);
    }
    this.helix.setSpeed(settings.helixSpeed);
    this.helix.setPhase(settings.helixPhase);
    this.helix.setEnabled(settings.helixOn);
    this.ornaments.setEnabled(settings.ornamentsOn);
    this.star.root.visible = settings.crownHeartOn;
    this.branches.setBrightness(settings.treeBrightness);
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

  setHelixEnabled(enabled: boolean): void {
    this.helix.setEnabled(enabled);
  }

  setHelixSpeed(speed: number): void {
    this.helix.setSpeed(speed);
  }

  setHelixPhase(phase: number): void {
    this.helix.setPhase(phase);
  }

  setOrnamentsEnabled(enabled: boolean): void {
    this.ornaments.setEnabled(enabled);
  }

  setOverallBrightness(brightness: number): void {
    this.branches.setBrightness(brightness);
  }

  resetPresentation(): void {
    this.body.visible = true;
    this.body.scale.setScalar(1);
    this.star.root.visible = true;
    this.helix.setEnabled(true);
    this.ornaments.setEnabled(true);
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
    return [
      ...this.branches.getInteractiveMeshes(),
      ...(this.star.root.visible ? this.star.getPickMeshes() : [])
    ];
  }

  getTopY(): number {
    return this.height + 0.55;
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
    this.helix.dispose();
    this.ornaments.dispose();
    this.star.dispose();
  }
}
