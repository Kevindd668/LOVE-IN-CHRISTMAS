import * as THREE from 'three';
import type { QualityPreset } from '../config';

export class LightEffect {
  readonly hemi: THREE.HemisphereLight;
  readonly ambient: THREE.AmbientLight;
  readonly moon: THREE.DirectionalLight;
  readonly warmKey: THREE.DirectionalLight;
  readonly treeWarmth: THREE.PointLight;
  readonly coolFill: THREE.PointLight;
  readonly groundGlow: THREE.PointLight;
  private baseAmbient = 1;

  constructor(scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0x8faec8, 0x263437, 0.74);
    this.hemi.position.set(0, 20, 0);

    this.ambient = new THREE.AmbientLight(0x213a4d, 0.2);

    this.moon = new THREE.DirectionalLight(0xc4d9ff, 1.48);
    this.moon.position.set(-8.5, 15, 7.5);
    this.moon.target.position.set(0, 3.2, 0);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.camera.near = 2;
    this.moon.shadow.camera.far = 40;
    this.moon.shadow.camera.left = -10;
    this.moon.shadow.camera.right = 10;
    this.moon.shadow.camera.top = 12;
    this.moon.shadow.camera.bottom = -4;
    this.moon.shadow.bias = -0.0008;
    this.moon.shadow.normalBias = 0.035;
    this.moon.shadow.radius = 5;

    this.warmKey = new THREE.DirectionalLight(0xffd5a6, 0.42);
    this.warmKey.position.set(8, 9, 10);

    this.treeWarmth = new THREE.PointLight(0xffc987, 22, 13, 2);
    this.treeWarmth.position.set(2.1, 3.4, 2.5);

    this.coolFill = new THREE.PointLight(0x9dd8ef, 6.5, 16, 2);
    this.coolFill.position.set(-3.8, 4.2, 3.6);

    this.groundGlow = new THREE.PointLight(0xffc37d, 7, 7.5, 2);
    this.groundGlow.position.set(0.8, 1.1, 2.5);

    scene.add(
      this.hemi,
      this.ambient,
      this.moon,
      this.moon.target,
      this.warmKey,
      this.warmKey.target,
      this.treeWarmth,
      this.coolFill,
      this.groundGlow
    );
  }

  setAmbient(multiplier: number): void {
    this.baseAmbient = multiplier;
    this.hemi.intensity = 0.74 * multiplier;
    this.ambient.intensity = 0.2 * multiplier;
    this.moon.intensity = 1.48 * Math.max(0.55, multiplier);
    this.warmKey.intensity = 0.42 * multiplier;
    this.treeWarmth.intensity = 22 * multiplier;
    this.coolFill.intensity = 6.5 * multiplier;
    this.groundGlow.intensity = 7 * multiplier;
  }

  setQuality(preset: QualityPreset): void {
    this.moon.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    if (this.moon.shadow.map) {
      this.moon.shadow.map.dispose();
      this.moon.shadow.map = null;
    }
  }

  setLightSpill(on: boolean, color: THREE.Color, brightness: number): void {
    this.treeWarmth.visible = on;
    this.coolFill.visible = on;
    this.groundGlow.visible = on;
    this.treeWarmth.color.copy(color);
    this.groundGlow.color.copy(color);
    this.treeWarmth.intensity = 18 * brightness;
    this.coolFill.intensity = 4 + brightness * 4;
    this.groundGlow.intensity = 4 + brightness * 3.5;
  }

  /** Used by the cinematic sequences. */
  setExposureMood(dim: number): void {
    this.moon.intensity = 1.48 * Math.max(0.2, 1 - dim * 0.8);
    this.hemi.intensity = 0.74 * Math.max(0.2, 1 - dim * 0.7) * this.baseAmbient;
    this.ambient.intensity = 0.2 * Math.max(0.25, 1 - dim * 0.65) * this.baseAmbient;
  }

  dispose(): void {
    this.moon.shadow.map?.dispose();
  }
}
