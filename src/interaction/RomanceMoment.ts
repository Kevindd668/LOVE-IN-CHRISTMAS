import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
import type { Renderer } from '../core/Renderer';
import { clamp, easeInOutCubic, lerp, smoothstep } from '../core/utils';
import type { ChristmasTree } from '../objects/ChristmasTree';
import type { GiftBoxes } from '../objects/GiftBoxes';
import type { RomanticText } from '../objects/RomanticText';
import type { HeartParticles } from '../particles/HeartParticles';
import type { SnowParticles } from '../particles/SnowParticles';
import type { PhotoManager } from '../photos/PhotoManager';
import type { SettingsManager } from '../ui/SettingsManager';

export interface RomanceCallbacks {
  onEnter: () => void;
  onExit: () => void;
  onFinale: () => void;
  onProgress: (progress: number) => void;
}

interface RomanceDependencies {
  camera: CameraManager;
  renderer: Renderer;
  tree: ChristmasTree;
  numbers: RomanticText;
  photos: PhotoManager;
  hearts: HeartParticles;
  snow: SnowParticles;
  gifts: GiftBoxes;
  settings: SettingsManager;
  callbacks: RomanceCallbacks;
}

const DURATION = 16;

export class RomanceMoment {
  private readonly deps: RomanceDependencies;
  private active = false;
  private elapsed = 0;
  private finaleShown = false;
  private heartsStarted = false;
  private startPosition = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private endPosition = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private cameraPosition = new THREE.Vector3();
  private cameraTarget = new THREE.Vector3();

  constructor(dependencies: RomanceDependencies) {
    this.deps = dependencies;
  }

  get isActive(): boolean {
    return this.active;
  }

  get progress(): number {
    return clamp(this.elapsed / DURATION, 0, 1);
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.elapsed = 0;
    this.finaleShown = false;
    this.heartsStarted = false;

    const { camera, tree, numbers, photos, hearts, gifts, settings, callbacks, renderer } = this.deps;
    const current = settings.current;
    camera.beginCinematic();
    this.startPosition.copy(camera.camera.position);
    this.startTarget.copy(camera.controls.target);
    const height = current.treeHeight;
    this.endPosition.set(6.8, height * 0.58 + 0.4, 13.2);
    this.endTarget.set(0, height * 0.52, 0);

    tree.setBodyVisible(true);
    tree.setBodyReveal(1);
    tree.setStarVisible(true);
    tree.star.root.scale.setScalar(1);
    tree.lights.setEnabled(true);
    tree.setLightsReveal(0.26);

    numbers.setAllReveal(0);
    photos.setReveal(0);

    hearts.setEnabled(false);
    hearts.setOpacity(0);
    hearts.setMode('orbit');
    hearts.setLayout(height);

    gifts.group.visible = true;
    gifts.setCelebration(0.18);

    renderer.setExposure(1.08);
    this.deps.snow.setSpeed(current.snowSpeed * 0.52);
    callbacks.onEnter();
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed = Math.min(DURATION, this.elapsed + dt);
    const time = this.elapsed;
    const { tree, numbers, photos, hearts, gifts, camera, renderer, settings, snow, callbacks } =
      this.deps;
    const current = settings.current;

    renderer.setExposure(lerp(1.08, 0.84, smoothstep(0, 2.4, time)));

    const lightsProgress = clamp(0.2 + time / 3.2, 0, 1);
    tree.lights.setEnabled(true);
    tree.setLightsReveal(lightsProgress);
    tree.setStarVisible(true);
    tree.star.root.scale.setScalar(1);

    const moveProgress = easeInOutCubic(clamp(time / 8.8, 0, 1));
    this.cameraPosition.lerpVectors(this.startPosition, this.endPosition, moveProgress);
    this.cameraTarget.lerpVectors(this.startTarget, this.endTarget, moveProgress);
    this.cameraPosition.y += Math.sin(time * 0.33) * 0.09;
    camera.setCinematicPose(this.cameraPosition, this.cameraTarget);

    photos.setReveal(clamp((time - 1.3) / 3.4, 0, 1));

    numbers.setReveal('a', clamp((time - 2.2) / 2.2, 0, 1));
    numbers.setReveal('b', clamp((time - 5.2) / 2.4, 0, 1));

    if (time >= 3.4) {
      hearts.setOpacity(1);
      if (!this.heartsStarted) {
        this.heartsStarted = true;
        hearts.setEnabled(true);
        hearts.setMode('gather');
      }
    }

    gifts.setCelebration(0.18 + smoothstep(5, 10, time) * 0.5);
    snow.setSpeed(current.snowSpeed * lerp(0.52, 0.33, smoothstep(2, 9, time)));

    if (time >= 9.2 && !this.finaleShown) {
      this.finaleShown = true;
      callbacks.onFinale();
    }
    callbacks.onProgress(this.progress);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.deps.callbacks.onExit();
  }

  dispose(): void {
    this.active = false;
  }
}
