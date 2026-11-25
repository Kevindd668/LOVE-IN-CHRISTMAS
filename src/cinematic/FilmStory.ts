import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
import type { SceneManager } from '../core/SceneManager';
import type { SettingsManager } from '../ui/SettingsManager';
import type { ChristmasTree } from '../objects/ChristmasTree';
import type { GalaxyEnvironment } from '../effects/GalaxyEnvironment';
import type { HeartParticleSystem } from '../particles/HeartParticleSystem';
import type { MagicParticles } from '../particles/MagicParticles';
import type { PhotoListItem, PhotoManager } from '../photos/PhotoManager';
import type { GiftBoxes } from '../objects/GiftBoxes';
import type { HeartParticles } from '../particles/HeartParticles';
import type { SnowParticles } from '../particles/SnowParticles';
import type { StarParticles } from '../particles/StarParticles';
import type { AuroraEffect } from '../effects/AuroraEffect';
import type { RomanticText } from '../objects/RomanticText';
import type { LoveNumbersController } from '../romance/LoveNumbersController';
import type { ParticleLoveText } from '../romance/ParticleLoveText';
import { buildFilmShots, type FilmCameraRig } from './FilmCameraRig';
import { clamp, smoothstep } from '../core/utils';

interface FilmStoryOptions {
  sceneManager: SceneManager;
  camera: CameraManager;
  cameraRig: FilmCameraRig;
  settings: SettingsManager;
  tree: ChristmasTree;
  galaxy: GalaxyEnvironment;
  heart: HeartParticleSystem;
  magic: MagicParticles;
  numbers: RomanticText;
  numbersController: LoveNumbersController;
  particleLoveText: ParticleLoveText;
  photos: PhotoManager;
  gifts: GiftBoxes;
  hearts: HeartParticles;
  snow: SnowParticles;
  stars: StarParticles;
  aurora: AuroraEffect;
  heartPickProxy: THREE.Object3D | null;
}

export interface FilmPhotoMemory {
  index: number;
  total: number;
  item: PhotoListItem;
  fallback: boolean;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * The 8-68s story. Every visual comes from an existing F2/F3/F4 object.
 * All values are sampled from absolute time so next/previous seek is safe.
 */
export class FilmStory {
  private readonly options: FilmStoryOptions;
  private started = false;
  private photoMemories: PhotoListItem[] = [];
  private photoFallback = false;
  private photoIndex = -1;
  private heartState: 'none' | 'gather' | 'burst' | 'regather' = 'none';
  private lastHeartRipple = false;
  private lastStarFlash = false;
  private lastTime = 8;

  constructor(options: FilmStoryOptions) {
    this.options = options;
  }

  get photos(): FilmPhotoMemory[] {
    return this.photoMemories.map((item, index) => ({
      index,
      total: this.photoMemories.length,
      item,
      fallback: item.isDefault
    }));
  }

  getPhotoAt(time: number): FilmPhotoMemory | null {
    if (time < 30 || time >= 42) return null;
    const index = Math.min(2, Math.max(0, Math.floor((time - 30) / 4)));
    const item = this.photoMemories[index];
    if (!item) return null;
    return {
      index,
      total: this.photoMemories.length,
      item,
      fallback: item.isDefault
    };
  }

  startStory(): void {
    if (this.started) return;
    this.started = true;
    const { sceneManager, cameraRig, settings, tree, photos, gifts } = this.options;
    sceneManager.setCinematicSceneVisible(true);
    this.options.camera.beginCinematic();
    tree.group.visible = true;
    tree.setBodyVisible(true);
    tree.setBodyReveal(1);
    tree.setLightsEnabled(true);
    tree.setLightsReveal(1);
    photos.group.visible = false;
    photos.setMemoryMode(null);
    photos.setReveal(1);
    gifts.group.visible = true;
    gifts.closeAll();
    this.options.numbers.group.visible = false;
    this.options.numbers.setAllReveal(0);
    this.options.numbersController.setMode('idle');
    this.options.particleLoveText.group.visible = false;
    this.options.heart.group.visible = false;
    this.options.heart.setVisible(false);
    this.options.heart.setPaused(false);
    if (this.options.heartPickProxy) this.options.heartPickProxy.visible = false;
    this.options.galaxy.setWaterfallEnabled(settings.get('waterfallOn'));
    this.options.galaxy.setOrbitsEnabled(settings.get('orbitsOn'));
    this.options.galaxy.setMeteorsEnabled(settings.get('meteorsOn'));

    const all = photos.views;
    const real = all.filter((item) => !item.isDefault);
    this.photoFallback = real.length < 3;
    const source =
      real.length >= 3
        ? real
        : [...real, ...all.filter((item) => item.isDefault)];
    this.photoMemories = source.slice(0, 3);
    const heartWorld = new THREE.Vector3();
    this.options.heart.group.getWorldPosition(heartWorld);
    const photoPositions = this.photoMemories
      .map((item) => photos.getPhotoPosition(item.id))
      .filter((item): item is THREE.Vector3 => Boolean(item));
    cameraRig.begin();
    cameraRig.setShots(buildFilmShots(heartWorld, photoPositions));
    cameraRig.update(8);
    this.photoIndex = -1;
    this.heartState = 'none';
    this.lastHeartRipple = false;
    this.lastStarFlash = false;
    this.lastTime = 8;
  }

  update(time: number, dt: number): void {
    if (!this.started) this.startStory();
    const { tree, numbers, numbersController, photos, hearts, snow, stars, aurora, galaxy, heart, gifts, magic, camera, settings } = this.options;
    const delta = Math.min(0.1, Math.max(0, dt));
    const seeked = Math.abs(time - this.lastTime) > 0.6;
    if (seeked) {
      this.photoIndex = -1;
      this.heartState = 'none';
      this.lastHeartRipple = false;
      this.lastStarFlash = false;
    }
    this.lastTime = time;

    // Tree: after the preserved intro, relight bottom-up.
    const lightReveal = this.lightRevealAt(time);
    tree.group.visible = true;
    tree.setBodyVisible(true);
    tree.setBodyReveal(1);
    tree.setLightsEnabled(true);
    tree.setLightsReveal(lightReveal);
    tree.setStarVisible(time >= 15.5 || time >= 52);
    tree.setHelixEnabled(time >= 16);
    tree.setOrnamentsEnabled(time >= 14);
    if (time >= 15.5 && !this.lastStarFlash) {
      this.lastStarFlash = true;
      tree.flashStar();
    }

    // Photos: three real memories, or explicitly labelled placeholders.
    const inPhotoChapter = time >= 30 && time < 42;
    const photoIndex = inPhotoChapter
      ? Math.min(2, Math.max(0, Math.floor((time - 30) / 4)))
      : -1;
    photos.group.visible = inPhotoChapter || time >= 52;
    if (photoIndex >= 0) {
      const item = this.photoMemories[photoIndex];
      if (item) photos.setMemoryMode(item.id);
    } else {
      photos.setMemoryMode(null);
    }
    if (photoIndex !== this.photoIndex) this.photoIndex = photoIndex;
    photos.setReveal(1);
    photos.update(delta, time, camera.camera, {
      photoSpeed: settings.get('photoSpeed'),
      photoRadius: settings.get('photoRadius'),
      photosPaused: settings.get('photosPaused') || Boolean(photos.memoryModeId),
      orbitScale: 1.16,
      cardScale: settings.get('cardScale'),
      showCaptions: false
    });

    // 520 / 1314: sample absolute reveal values.
    numbers.group.visible = time >= 42;
    const aReveal = time < 42 ? 0 : smoothstep(42, 44, time);
    const bReveal = time < 46 ? 0 : smoothstep(46, 50, time);
    numbers.setReveal('a', aReveal);
    numbers.setReveal('b', bReveal);
    numbersController.update(delta);
    numbers.update(delta, time, camera.camera);
    this.options.particleLoveText.group.visible = false;

    // Giant heart: gather, pulse, burst, regather.
    const heartVisible = time >= 18;
    heart.group.visible = heartVisible;
    heart.setVisible(heartVisible);
    if (heartVisible) {
      heart.setPaused(false);
      this.syncHeart(time);
      if (seeked) {
        // Seek must land on a visibly resolved heart state, not just start a
        // fresh gather at the target timestamp.
        heart.update(this.heartState === 'burst' ? 0.9 : 3.0, time);
      }
      heart.update(delta, time);
    }
    if (this.options.heartPickProxy) this.options.heartPickProxy.visible = false;

    hearts.group.visible = true;
    hearts.update(delta, time, camera.camera);
    snow.points.visible = true;
    snow.update(delta, time);
    stars.group.visible = false;
    aurora.group.visible = false;
    galaxy.update(delta, time);
    gifts.group.visible = true;
    gifts.update(delta, time, camera.camera);
    magic.update(delta, time);

    tree.update(delta, time);
    this.options.cameraRig.update(time);
  }

  cleanup(): void {
    const { photos, numbers, heart, tree, galaxy, settings } = this.options;
    photos.setMemoryMode(null);
    photos.setSelected(null);
    numbers.setAllReveal(1);
    heart.setMode('heart');
    tree.setLightsReveal(1);
    galaxy.setWaterfallEnabled(settings.get('waterfallOn'));
    galaxy.setOrbitsEnabled(settings.get('orbitsOn'));
    galaxy.setMeteorsEnabled(settings.get('meteorsOn'));
    this.started = false;
  }

  private syncHeart(time: number): void {
    const { heart, magic, camera } = this.options;
    if (time < 24.5) {
      if (this.heartState !== 'gather') {
        this.heartState = 'gather';
        heart.gather(time);
      }
      return;
    }
    if (time < 27.5) {
      if (this.heartState !== 'burst') {
        this.heartState = 'burst';
        heart.burst(time);
        if (!this.lastHeartRipple) {
          this.lastHeartRipple = true;
          magic.group.visible = true;
          magic.ripple(new THREE.Vector3(0, 0.9, 0), '#FF9CBA', camera.camera);
        }
      }
      return;
    }
    if (this.heartState !== 'regather') {
      this.heartState = 'regather';
      heart.gather(time);
    }
  }

  private lightRevealAt(time: number): number {
    if (time < 8.6) return 1 - smoothstep(8, 8.6, time) * 0.72;
    if (time < 10) return lerp(0.28, 0.42, smoothstep(8.6, 10, time));
    if (time < 11) return 0.42;
    if (time < 13) return lerp(0.42, 0.62, smoothstep(11, 13, time));
    if (time < 15) return lerp(0.62, 0.8, smoothstep(13, 15, time));
    if (time < 17) return lerp(0.8, 1, smoothstep(15, 17, time));
    return 1;
  }
}
