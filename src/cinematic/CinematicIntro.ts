import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
import type { Renderer } from '../core/Renderer';
import type { SceneManager } from '../core/SceneManager';
import type { SettingsManager } from '../ui/SettingsManager';
import type { ChristmasTree } from '../objects/ChristmasTree';
import type { GalaxyEnvironment } from '../effects/GalaxyEnvironment';
import type { HeartParticleSystem } from '../particles/HeartParticleSystem';
import type { MagicParticles } from '../particles/MagicParticles';
import type { PhotoManager } from '../photos/PhotoManager';
import type { GiftBoxes } from '../objects/GiftBoxes';
import type { HeartParticles } from '../particles/HeartParticles';
import type { SnowParticles } from '../particles/SnowParticles';
import type { StarParticles } from '../particles/StarParticles';
import type { AuroraEffect } from '../effects/AuroraEffect';
import type { RomanticText } from '../objects/RomanticText';
import type { MusicEngine } from '../audio/MusicEngine';
import { clamp, smoothstep } from '../core/utils';
import { CinematicParticleField } from './CinematicParticleField';
import { CinematicIntroUI } from './CinematicIntroUI';

export type IntroPhase = 'idle' | 'entry' | 'awakening' | 'galaxy' | 'heart' | 'title' | 'tree' | 'done';

interface CinematicIntroOptions {
  scene: THREE.Scene;
  camera: CameraManager;
  renderer: Renderer;
  sceneManager: SceneManager;
  settings: SettingsManager;
  tree: ChristmasTree;
  galaxy: GalaxyEnvironment;
  heart: HeartParticleSystem;
  magic: MagicParticles;
  numbers: RomanticText;
  photos: PhotoManager;
  gifts: GiftBoxes;
  hearts: HeartParticles;
  snow: SnowParticles;
  stars: StarParticles;
  aurora: AuroraEffect;
  particleLoveText: { group: THREE.Group };
  heartPickProxy: THREE.Object3D | null;
  music: MusicEngine;
  onBeforeStart?: () => void;
}

interface Snapshot {
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  fov: number;
  groups: Array<{ object: THREE.Object3D; visible: boolean }>;
}

interface Frame {
  t: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
}

const DURATION = 8;
const CAMERA_FRAMES: Frame[] = [
  { t: 0, x: 0, y: 1.45, z: 28, tx: 0, ty: 1.0, tz: 0 },
  { t: 1.4, x: 0, y: 1.4, z: 26, tx: 0, ty: 1.0, tz: 0 },
  { t: 2.15, x: 0, y: 1.2, z: 14.5, tx: 0, ty: 0.95, tz: 0 },
  { t: 3.0, x: 0, y: 1.05, z: 4.2, tx: 0, ty: 0.9, tz: 0 },
  { t: 4.45, x: 0, y: 1.1, z: 11.2, tx: 0, ty: 0.9, tz: 0 },
  { t: 6.2, x: 2.4, y: 2.2, z: 15.8, tx: 0, ty: 3.4, tz: 0 }
];

export class CinematicIntro {
  readonly field: CinematicParticleField;
  readonly ui: CinematicIntroUI;
  private readonly options: CinematicIntroOptions;
  private readonly snapshot: Snapshot = {
    cameraPosition: new THREE.Vector3(),
    cameraTarget: new THREE.Vector3(),
    fov: 39,
    groups: []
  };
  private readonly homePosition = new THREE.Vector3();
  private readonly homeTarget = new THREE.Vector3();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private active = false;
  private paused = false;
  private entryOpen = false;
  private finished = false;
  private prepared = false;
  private elapsed = 0;
  private phase: IntroPhase = 'idle';
  private lastRipple = false;
  private titleShown = false;
  private titleHidden = false;
  private hideControlsTimer = 0;

  constructor(options: CinematicIntroOptions) {
    this.options = options;
    this.field = new CinematicParticleField(options.heart);
    options.scene.add(this.field.group);
    this.ui = new CinematicIntroUI({
      onStart: () => void this.begin(),
      onBrowse: () => this.browse(),
      onPauseToggle: () => this.togglePause(),
      onSkip: () => this.skip(),
      onReplay: () => this.replay(),
      onExit: () => this.exit()
    });
  }

  get isActive(): boolean {
    return this.active;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isEntryOpen(): boolean {
    return this.entryOpen;
  }

  get isBlocking(): boolean {
    return this.entryOpen || this.active;
  }

  get currentPhase(): IntroPhase {
    return this.phase;
  }

  get currentElapsed(): number {
    return this.elapsed;
  }

  showEntry(): void {
    if (this.active) return;
    this.entryOpen = true;
    this.phase = 'entry';
    this.options.camera.resetView(true);
    this.ui.showEntry();
    document.body.classList.add('is-intro-entry');
  }

  private browse(): void {
    this.entryOpen = false;
    this.ui.hideEntry();
    this.ui.hideControls();
    this.phase = 'idle';
    document.body.classList.remove('is-intro-entry', 'is-intro-playing');
  }

  private async begin(): Promise<void> {
    if (this.active) return;
    this.ui.setLoading('正在预热这场圣诞电影…');
    if (!this.prepared) {
      await this.prepare();
    }
    this.ui.setLoading('');
    this.start();
  }

  async prepare(): Promise<void> {
    try {
      await this.options.music.unlock();
    } catch {
      // Audio is optional; the intro continues muted.
    }
    try {
      this.field.setVisible(true);
      await this.options.renderer.warmup(this.options.scene, this.options.camera.camera);
    } catch {
      // Warmup failure must not block the intro.
    } finally {
      this.field.setVisible(false);
      this.prepared = true;
    }
  }

  private start(): void {
    const { camera, sceneManager, tree, galaxy, numbers, photos, gifts, hearts, snow, stars, aurora, magic, heart, particleLoveText, heartPickProxy } = this.options;
    this.entryOpen = false;
    this.active = true;
    this.paused = false;
    this.finished = false;
    this.elapsed = 0;
    this.lastRipple = false;
    this.titleShown = false;
    this.titleHidden = false;
    this.phase = 'awakening';
    this.ui.hideEntry();
    this.ui.hideControls();
    this.ui.showControls(false);
    document.body.classList.remove('is-intro-entry');
    document.body.classList.add('is-intro-playing', 'is-cinematic-intro');
    this.options.onBeforeStart?.();

    this.captureSnapshot();
    this.homePosition.copy(camera.getHomePosition());
    this.homeTarget.copy(camera.getHomeTarget());

    camera.beginCinematic();
    camera.camera.fov = 43;
    camera.camera.updateProjectionMatrix();
    tree.group.visible = false;
    numbers.group.visible = false;
    photos.group.visible = false;
    gifts.group.visible = false;
    hearts.group.visible = false;
    snow.points.visible = false;
    stars.group.visible = false;
    aurora.group.visible = false;
    magic.group.visible = false;
    heart.group.visible = false;
    particleLoveText.group.visible = false;
    if (heartPickProxy) heartPickProxy.visible = false;
    sceneManager.setCinematicSceneVisible(false);
    galaxy.setWaterfallEnabled(false);
    galaxy.setOrbitsEnabled(false);
    galaxy.setMeteorsEnabled(false);
    this.field.reset();
    this.field.update(0, 0, 0, 1);
    this.updateCamera(0);
  }

  private captureSnapshot(): void {
    const { camera, tree, numbers, photos, gifts, hearts, snow, stars, aurora, magic, heart, particleLoveText, heartPickProxy } = this.options;
    this.snapshot.cameraPosition.copy(camera.camera.position);
    this.snapshot.cameraTarget.copy(camera.controls.target);
    this.snapshot.fov = camera.camera.fov;
    this.snapshot.groups = [];
    const objects: THREE.Object3D[] = [
      tree.group,
      numbers.group,
      photos.group,
      gifts.group,
      hearts.group,
      snow.points,
      stars.group,
      aurora.group,
      magic.group,
      heart.group,
      particleLoveText.group
    ];
    if (heartPickProxy) objects.push(heartPickProxy);
    for (const object of objects) {
      this.snapshot.groups.push({ object, visible: object.visible });
    }
  }

  private updateCamera(t: number): void {
    let from = CAMERA_FRAMES[0];
    let to = CAMERA_FRAMES[CAMERA_FRAMES.length - 1];
    for (let i = 0; i < CAMERA_FRAMES.length - 1; i += 1) {
      if (t >= CAMERA_FRAMES[i].t && t <= CAMERA_FRAMES[i + 1].t) {
        from = CAMERA_FRAMES[i];
        to = CAMERA_FRAMES[i + 1];
        break;
      }
    }
    if (t >= 6.2) {
      const end = smoother((t - 6.2) / 1.8);
      this.cameraPosition.set(
        THREE.MathUtils.lerp(2.4, this.homePosition.x, end),
        THREE.MathUtils.lerp(2.2, this.homePosition.y, end),
        THREE.MathUtils.lerp(15.8, this.homePosition.z, end)
      );
      this.cameraTarget.set(
        THREE.MathUtils.lerp(0, this.homeTarget.x, end),
        THREE.MathUtils.lerp(3.4, this.homeTarget.y, end),
        THREE.MathUtils.lerp(0, this.homeTarget.z, end)
      );
    } else {
      const span = Math.max(0.0001, to.t - from.t);
      const p = smoother(clamp((t - from.t) / span, 0, 1));
      this.cameraPosition.set(
        THREE.MathUtils.lerp(from.x, to.x, p),
        THREE.MathUtils.lerp(from.y, to.y, p),
        THREE.MathUtils.lerp(from.z, to.z, p)
      );
      this.cameraTarget.set(
        THREE.MathUtils.lerp(from.tx, to.tx, p),
        THREE.MathUtils.lerp(from.ty, to.ty, p),
        THREE.MathUtils.lerp(from.tz, to.tz, p)
      );
    }
    this.options.camera.setCinematicPose(this.cameraPosition, this.cameraTarget);
  }

  update(dt: number): void {
    if (!this.active) return;
    if (this.paused) return;
    this.elapsed = Math.min(DURATION, this.elapsed + dt);
    const t = this.elapsed;
    this.phase = t < 1.5 ? 'awakening' : t < 3 ? 'galaxy' : t < 4.5 ? 'heart' : t < 6.5 ? 'title' : 'tree';
    this.updateCamera(t);
    const heartMix = smoothstep(3.0, 4.35, t);
    const fieldOpacity =
      t < 1.35 ? 0 : t < 4.4 ? 1 : 1 - smoothstep(4.4, 5.7, t);
    const heartScale = 1 + (heartMix > 0.95 ? Math.sin((t - 4.0) * 5.4) * 0.035 : 0);
    this.field.update(t, fieldOpacity, heartMix, heartScale);
    this.ui.updateTitle(dt);

    if (!this.titleShown && t >= 4.35) {
      this.titleShown = true;
      this.ui.showTitle();
    }
    if (!this.titleHidden && t >= 6.2) {
      this.titleHidden = true;
      this.ui.hideTitle();
    }
    if (t >= 6.15) {
      const reveal = smoothstep(6.15, 7.8, t);
      const { tree, sceneManager, settings } = this.options;
      tree.group.visible = true;
      sceneManager.setCinematicSceneVisible(true);
      tree.setBodyVisible(true);
      tree.setBodyReveal(reveal);
      tree.setLightsReveal(reveal);
      tree.setLightsEnabled(settings.get('lightsOn'));
      tree.setStarVisible(reveal > 0.16 && settings.get('crownHeartOn'));
      tree.setHelixEnabled(reveal > 0.45 && settings.get('helixOn'));
      tree.setOrnamentsEnabled(reveal > 0.3 && settings.get('ornamentsOn'));
    }
    if (!this.lastRipple && t >= 4.0) {
      this.lastRipple = true;
      this.options.magic.group.visible = true;
      this.options.magic.ripple(new THREE.Vector3(0, 0.9, 0), '#FF9CBA', this.options.camera.camera);
    }
    if (t >= 7.0) {
      this.options.photos.group.visible = true;
      this.options.numbers.group.visible = true;
      this.options.gifts.group.visible = true;
      this.options.hearts.group.visible = true;
      this.options.snow.points.visible = true;
      this.options.magic.group.visible = true;
      this.options.heart.group.visible = this.options.settings.get('giantHeartOn');
      this.options.heart.setVisible(this.options.settings.get('giantHeartOn'));
      this.options.particleLoveText.group.visible = false;
      if (this.options.heartPickProxy) this.options.heartPickProxy.visible = true;
      this.options.galaxy.setWaterfallEnabled(this.options.settings.get('waterfallOn'));
      this.options.galaxy.setOrbitsEnabled(this.options.settings.get('orbitsOn'));
      this.options.galaxy.setMeteorsEnabled(this.options.settings.get('meteorsOn'));
    }
    if (t >= DURATION) this.finish();
  }

  private finish(): void {
    if (!this.active) return;
    this.active = false;
    this.finished = true;
    this.phase = 'done';
    this.field.setVisible(false);
    this.ui.hideTitle();
    this.options.sceneManager.setCinematicSceneVisible(true);
    this.restoreGroups();
    this.restoreTree();
    this.options.camera.camera.fov = this.snapshot.fov;
    this.options.camera.camera.updateProjectionMatrix();
    this.options.camera.endCinematic();
    this.options.camera.resetView(true);
    document.body.classList.remove('is-cinematic-intro', 'is-intro-playing');
    this.ui.showControls(true);
    window.clearTimeout(this.hideControlsTimer);
    this.hideControlsTimer = window.setTimeout(() => this.ui.hideControls(), 6000);
  }

  private restoreGroups(): void {
    for (const entry of this.snapshot.groups) entry.object.visible = entry.visible;
    this.options.particleLoveText.group.visible = false;
    if (this.options.heartPickProxy) this.options.heartPickProxy.visible = true;
    this.options.galaxy.setWaterfallEnabled(this.options.settings.get('waterfallOn'));
    this.options.galaxy.setOrbitsEnabled(this.options.settings.get('orbitsOn'));
    this.options.galaxy.setMeteorsEnabled(this.options.settings.get('meteorsOn'));
  }

  private restoreTree(): void {
    const { tree, settings } = this.options;
    tree.group.visible = true;
    tree.setBodyVisible(true);
    tree.setBodyReveal(1);
    tree.setLightsReveal(1);
    tree.setLightsEnabled(settings.get('lightsOn'));
    tree.setStarVisible(settings.get('crownHeartOn'));
    tree.setHelixEnabled(settings.get('helixOn'));
    tree.setHelixSpeed(settings.get('helixSpeed'));
    tree.setHelixPhase(settings.get('helixPhase'));
    tree.setOrnamentsEnabled(settings.get('ornamentsOn'));
    tree.setOverallBrightness(settings.get('treeBrightness'));
  }

  private restoreSnapshot(): void {
    const { camera } = this.options;
    camera.camera.position.copy(this.snapshot.cameraPosition);
    camera.controls.target.copy(this.snapshot.cameraTarget);
    camera.camera.fov = this.snapshot.fov;
    camera.camera.updateProjectionMatrix();
    camera.controls.update();
    camera.endCinematic();
    this.restoreGroups();
    this.restoreTree();
    this.options.sceneManager.setCinematicSceneVisible(true);
  }

  togglePause(): void {
    if (!this.active) return;
    this.paused = !this.paused;
    this.ui.setPaused(this.paused);
  }

  skip(): void {
    if (!this.active) return;
    this.elapsed = 7.95;
    this.update(0.02);
    this.finish();
  }

  replay(): void {
    if (this.active) return;
    this.start();
  }

  exit(): void {
    if (!this.active) {
      this.browse();
      return;
    }
    this.active = false;
    this.paused = false;
    this.phase = 'idle';
    this.field.setVisible(false);
    this.ui.hideAll();
    document.body.classList.remove('is-cinematic-intro', 'is-intro-playing', 'is-intro-entry');
    this.restoreSnapshot();
  }

  seek(seconds: number): void {
    this.elapsed = clamp(seconds, 0, DURATION);
    if (!this.active) return;
    const wasPaused = this.paused;
    this.paused = false;
    this.update(0.0001);
    this.paused = wasPaused;
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.ui.setPaused(true);
  }

  dispose(): void {
    window.clearTimeout(this.hideControlsTimer);
    this.field.dispose();
    this.ui.dispose();
  }
}

const smoother = (value: number): number => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
