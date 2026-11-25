import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
import type { SceneManager } from '../core/SceneManager';
import type { SettingsManager } from '../ui/SettingsManager';
import type { ChristmasTree } from '../objects/ChristmasTree';
import type { GiftBoxes } from '../objects/GiftBoxes';
import type { RomanticText } from '../objects/RomanticText';
import type { PhotoManager } from '../photos/PhotoManager';
import type { HeartParticleSystem, HeartParticleMode } from '../particles/HeartParticleSystem';
import type { MusicEngine } from '../audio/MusicEngine';
import type { LoveNumbersController, LoveNumbersMode } from '../romance/LoveNumbersController';
import type { MusicTrack } from '../config';

interface SnapshotOptions {
  camera: CameraManager;
  sceneManager: SceneManager;
  settings: SettingsManager;
  tree: ChristmasTree;
  numbers: RomanticText;
  photos: PhotoManager;
  gifts: GiftBoxes;
  heart: HeartParticleSystem;
  music: MusicEngine;
  heartPickProxy: THREE.Object3D | null;
  particleLoveText: THREE.Object3D;
  numbersController: LoveNumbersController;
  groups: THREE.Object3D[];
}

interface State {
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  fov: number;
  controlsEnabled: boolean;
  cinematic: boolean;
  groups: Array<{ object: THREE.Object3D; visible: boolean }>;
  treeBodyVisible: boolean;
  treeBodyScale: number;
  treeStarVisible: boolean;
  photosMemoryId: string | null;
  photosVisible: boolean;
  numbersVisible: boolean;
  heartVisible: boolean;
  heartMode: HeartParticleMode;
  heartPaused: boolean;
  numbersMode: LoveNumbersMode;
  heartPickVisible: boolean;
  particleLoveVisible: boolean;
  gifts: boolean[];
  musicEnabled: boolean;
  musicTrack: MusicTrack;
  musicVolume: number;
  bodyClass: string;
}

/**
 * Captures only public, restorable state. It never recreates the app or any
 * scene object; the exit path keeps the same tree, heart, photos and gifts.
 */
export class FilmStateSnapshot {
  private readonly options: SnapshotOptions;
  private state: State | null = null;

  constructor(options: SnapshotOptions) {
    this.options = options;
  }

  get hasSnapshot(): boolean {
    return this.state !== null;
  }

  capture(): void {
    const {
      camera,
      sceneManager,
      tree,
      photos,
      numbers,
      heart,
      gifts,
      music,
      heartPickProxy,
      particleLoveText,
      groups
    } = this.options;
    const objectList = [tree.group, numbers.group, photos.group, gifts.group, heart.group, ...groups];
    if (heartPickProxy) objectList.push(heartPickProxy);
    this.state = {
      cameraPosition: camera.camera.position.clone(),
      cameraTarget: camera.controls.target.clone(),
      fov: camera.camera.fov,
      controlsEnabled: camera.controls.enabled,
      cinematic: camera.isCinematic,
      groups: objectList.map((object) => ({ object, visible: object.visible })),
      treeBodyVisible: tree.body.visible,
      treeBodyScale: tree.body.scale.x,
      treeStarVisible: tree.star.root.visible,
      photosMemoryId: photos.memoryModeId,
      photosVisible: photos.group.visible,
      numbersVisible: numbers.group.visible,
      heartVisible: heart.group.visible,
      heartMode: heart.currentMode,
      heartPaused: this.options.settings.get('giantHeartPaused'),
      numbersMode: this.options.numbersController.currentMode,
      heartPickVisible: heartPickProxy?.visible ?? true,
      particleLoveVisible: particleLoveText.visible,
      gifts: gifts.giftStates.map((gift) => gift.opened),
      musicEnabled: music.isEnabled,
      musicTrack: music.currentTrack,
      musicVolume: this.options.settings.get('musicVolume'),
      bodyClass: document.body.className
    };
    sceneManager.setCinematicSceneVisible(true);
  }

  restore(): void {
    const state = this.state;
    if (!state) return;
    const {
      camera,
      sceneManager,
      settings,
      tree,
      photos,
      numbers,
      heart,
      gifts,
      music,
      heartPickProxy,
      particleLoveText
    } = this.options;
    camera.camera.position.copy(state.cameraPosition);
    camera.controls.target.copy(state.cameraTarget);
    camera.camera.fov = state.fov;
    camera.camera.updateProjectionMatrix();
    camera.controls.enabled = state.controlsEnabled;
    if (state.cinematic) camera.beginCinematic();
    else camera.endCinematic();
    camera.controls.update();
    sceneManager.setCinematicSceneVisible(true);

    for (const entry of state.groups) entry.object.visible = entry.visible;
    tree.group.visible = true;
    tree.setBodyVisible(state.treeBodyVisible);
    tree.setBodyReveal(state.treeBodyScale);
    tree.setLightsReveal(1);
    tree.setLightsEnabled(settings.get('lightsOn'));
    tree.setStarVisible(state.treeStarVisible);
    tree.setHelixEnabled(settings.get('helixOn'));
    tree.setHelixSpeed(settings.get('helixSpeed'));
    tree.setHelixPhase(settings.get('helixPhase'));
    tree.setOrnamentsEnabled(settings.get('ornamentsOn'));
    tree.setOverallBrightness(settings.get('treeBrightness'));

    photos.setMemoryMode(state.photosMemoryId);
    photos.setSelected(null);
    photos.setReveal(1);
    photos.group.visible = state.photosVisible;
    numbers.group.visible = state.numbersVisible;
    numbers.setAllReveal(1);
    heart.group.visible = state.heartVisible;
    heart.setVisible(state.heartVisible);
    heart.setMode(state.heartMode);
    heart.setPaused(state.heartPaused);
    this.options.numbersController.setMode(state.numbersMode);
    if (heartPickProxy) heartPickProxy.visible = state.heartPickVisible;
    particleLoveText.visible = state.particleLoveVisible;

    gifts.closeAll();
    state.gifts.forEach((opened, index) => {
      if (opened) gifts.open(index);
    });
    if (state.musicEnabled) void music.enable(state.musicTrack, state.musicVolume);
    else music.disable();
    document.body.className = state.bodyClass
      .split(/\s+/)
      .filter(
        (name) =>
          name.length > 0 &&
          name !== 'is-film-playing' &&
          name !== 'is-intro-entry' &&
          name !== 'is-intro-playing' &&
          name !== 'is-cinematic-intro'
      )
      .join(' ');
  }
}
