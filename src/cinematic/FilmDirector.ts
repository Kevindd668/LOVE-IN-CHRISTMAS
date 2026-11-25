import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
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
import type { LoveNumbersController } from '../romance/LoveNumbersController';
import type { ParticleLoveText } from '../romance/ParticleLoveText';
import type { MusicEngine } from '../audio/MusicEngine';
import type { CinematicIntro } from './CinematicIntro';
import { FilmCameraRig } from './FilmCameraRig';
import { FilmStory } from './FilmStory';
import { FilmStateSnapshot } from './FilmStateSnapshot';
import { FilmAudioSync } from './FilmAudioSync';
import { FilmPlaybackUI } from './FilmPlaybackUI';
import {
  FILM_DURATION,
  getChapterIndex,
  getChapterStart,
  getFilmChapter,
  type FilmChapter
} from './FilmTimeline';

export type FilmState =
  | 'idle'
  | 'entry'
  | 'preflight'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'exiting';

interface FilmDirectorOptions {
  intro: CinematicIntro;
  camera: CameraManager;
  sceneManager: SceneManager;
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
  music: MusicEngine;
  heartPickProxy: THREE.Object3D | null;
}

/**
 * Single 68 second film clock. The intro keeps its established segment; this
 * director owns handoff, story, camera, audio, UI and full-state restoration.
 */
export class FilmDirector {
  private readonly options: FilmDirectorOptions;
  private readonly cameraRig: FilmCameraRig;
  private readonly story: FilmStory;
  private readonly snapshot: FilmStateSnapshot;
  private readonly audio: FilmAudioSync;
  private readonly ui: FilmPlaybackUI;
  private state: FilmState = 'idle';
  private elapsed = 0;
  private paused = false;
  private active = false;
  private lastPhotoIndex = -1;
  private lastFinalShown = false;
  private lastCue = '';
  private pausedByVisibility = false;
  private readonly visibilityHandler = (): void => {
    if (document.hidden) {
      if (this.active && !this.isPaused) {
        this.pausedByVisibility = true;
        this.pause();
      }
      return;
    }
    if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      if (this.active) this.resume();
    }
  };

  constructor(options: FilmDirectorOptions) {
    this.options = options;
    this.cameraRig = new FilmCameraRig(options.camera);
    this.story = new FilmStory({
      sceneManager: options.sceneManager,
      camera: options.camera,
      cameraRig: this.cameraRig,
      settings: options.settings,
      tree: options.tree,
      galaxy: options.galaxy,
      heart: options.heart,
      magic: options.magic,
      numbers: options.numbers,
      numbersController: options.numbersController,
      particleLoveText: options.particleLoveText,
      photos: options.photos,
      gifts: options.gifts,
      hearts: options.hearts,
      snow: options.snow,
      stars: options.stars,
      aurora: options.aurora,
      heartPickProxy: options.heartPickProxy
    });
    this.snapshot = new FilmStateSnapshot({
      camera: options.camera,
      sceneManager: options.sceneManager,
      settings: options.settings,
      tree: options.tree,
      numbers: options.numbers,
      photos: options.photos,
      gifts: options.gifts,
      heart: options.heart,
      music: options.music,
      heartPickProxy: options.heartPickProxy,
      particleLoveText: options.particleLoveText.group,
      numbersController: options.numbersController,
      groups: [
        options.hearts.group,
        options.snow.points,
        options.stars.group,
        options.aurora.group,
        options.magic.group
      ]
    });
    this.audio = new FilmAudioSync(options.music, options.settings);
    this.ui = new FilmPlaybackUI({
      onPauseToggle: () => this.togglePause(),
      onPrevious: () => this.previousChapter(),
      onNext: () => this.nextChapter(),
      onSkipIntro: () => this.skipIntro(),
      onSkipFilm: () => this.skipFilm(),
      onReplay: () => this.replay(),
      onExit: () => this.exit()
    });
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  get isActive(): boolean {
    return this.active;
  }

  get isPaused(): boolean {
    return this.options.intro.isActive ? this.options.intro.isPaused : this.paused;
  }

  get isEntryOpen(): boolean {
    return this.options.intro.isEntryOpen;
  }

  get isBlocking(): boolean {
    return this.active || this.options.intro.isEntryOpen;
  }

  get currentTime(): number {
    return this.options.intro.isActive
      ? this.options.intro.currentElapsed
      : this.elapsed;
  }

  get currentState(): FilmState {
    return this.state;
  }

  get currentChapter(): FilmChapter {
    return getFilmChapter(this.currentTime);
  }

  get duration(): number {
    return FILM_DURATION;
  }

  get playbackUI(): FilmPlaybackUI {
    return this.ui;
  }

  captureState(): void {
    this.snapshot.capture();
  }

  showEntry(): void {
    if (this.active) return;
    this.ui.hide();
    this.state = 'entry';
    this.options.intro.showEntry();
  }

  onIntroStart(): void {
    this.active = true;
    this.paused = false;
    this.elapsed = 0;
    this.lastPhotoIndex = -1;
    this.lastFinalShown = false;
    this.lastCue = '';
    this.state = 'playing';
    document.body.classList.add('is-film-playing');
    this.options.intro.ui.hideControls();
    this.audio.begin();
    this.ui.show();
    this.ui.setPaused(false);
    this.ui.setChapter(getFilmChapter(0));
    this.ui.setTime(0);
  }

  onIntroComplete(): void {
    if (!this.active) return;
    this.elapsed = 8;
    this.story.startStory();
    this.ui.setTime(8);
    this.ui.setChapter(getFilmChapter(8));
    this.audio.seek(8);
    // Keep an explicit pause across the 8s handoff. The intro owns its own
    // pause flag, but the story clock must not start until resume is called.
    if (this.options.intro.isPaused) this.paused = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    if (this.options.intro.isActive) {
      this.options.intro.update(dt);
      this.elapsed = this.options.intro.currentElapsed;
      this.ui.setTime(this.elapsed);
      this.ui.setChapter(getFilmChapter(this.elapsed));
      return;
    }
    if (this.paused) return;
    this.elapsed = Math.min(FILM_DURATION, this.elapsed + Math.max(0, dt));
    const time = this.elapsed;
    this.story.update(time, dt);
    this.ui.setTime(time);
    this.ui.setChapter(getFilmChapter(time));
    this.updateSubtitle(time);
    this.updateCues(time);
    if (time >= FILM_DURATION) this.complete();
  }

  pause(): void {
    if (!this.active) return;
    if (this.options.intro.isActive) {
      if (this.options.intro.isPaused && this.paused) return;
      if (!this.options.intro.isPaused) this.options.intro.pause();
    }
    if (this.paused && !this.options.intro.isActive) return;
    this.paused = true;
    this.state = 'paused';
    this.audio.pause();
    this.ui.setPaused(true);
  }

  resume(): void {
    if (!this.active) return;
    if (this.options.intro.isActive && this.options.intro.isPaused) {
      this.options.intro.togglePause();
    }
    this.paused = false;
    this.state = 'playing';
    this.audio.resume();
    this.ui.setPaused(false);
  }

  togglePause(): void {
    if (this.isPaused) this.resume();
    else this.pause();
  }

  skipIntro(): void {
    if (!this.active) return;
    if (this.options.intro.isActive) {
      this.options.intro.skip();
      return;
    }
    this.elapsed = 8;
    this.story.startStory();
    this.cameraRig.update(8);
    this.ui.setTime(8);
    this.audio.seek(8);
  }

  skipFilm(): void {
    if (!this.active) return;
    this.elapsed = FILM_DURATION;
    this.complete();
  }

  nextChapter(): void {
    if (!this.active) return;
    const index = getChapterIndex(this.currentTime);
    this.seek(getChapterStart(index + 1));
  }

  previousChapter(): void {
    if (!this.active) return;
    const index = getChapterIndex(this.currentTime);
    const currentStart = getChapterStart(index);
    this.seek(
      this.currentTime - currentStart > 1.5
        ? currentStart
        : getChapterStart(index - 1)
    );
  }

  seek(seconds: number): void {
    if (!this.active) return;
    const target = Math.max(0, Math.min(FILM_DURATION, seconds));
    if (target < 8) {
      if (this.options.intro.isActive) {
        this.options.intro.seek(target);
      } else {
        this.story.cleanup();
        this.options.intro.replay();
        this.options.intro.seek(target);
      }
      this.elapsed = target;
      this.ui.setTime(target);
      this.ui.setChapter(getFilmChapter(target));
      this.audio.seek(target);
      return;
    }
    if (this.options.intro.isActive) {
      this.options.intro.skip();
    }
    this.elapsed = target;
    this.story.startStory();
    this.story.update(target, 0.0001);
    this.cameraRig.update(target);
    this.ui.setTime(target);
    this.ui.setChapter(getFilmChapter(target));
    this.updateSubtitle(target);
    this.audio.seek(target);
    if (target >= FILM_DURATION) this.complete();
  }

  replay(): void {
    if (this.active) return;
    this.ui.show();
    this.options.intro.replay();
  }

  exit(): void {
    if (!this.active) {
      if (this.state === 'completed') {
        this.ui.hide();
        this.state = 'idle';
      }
      return;
    }
    this.finishAndRestore();
    this.ui.hide();
    this.state = 'idle';
  }

  complete(): void {
    if (!this.active) return;
    this.finishAndRestore();
    this.state = 'completed';
    this.ui.showCompleted();
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.ui.dispose();
  }

  private updateSubtitle(time: number): void {
    const photo = this.story.getPhotoAt(time);
    if (photo) {
      if (photo.index !== this.lastPhotoIndex) {
        this.lastPhotoIndex = photo.index;
        this.ui.showPhotoSubtitle(
          photo.item.metadata.title || photo.item.caption,
          photo.item.metadata.date,
          photo.item.metadata.description,
          photo.fallback
        );
      }
      return;
    }
    this.lastPhotoIndex = -1;
    if (time >= 62) {
      if (!this.lastFinalShown) {
        this.lastFinalShown = true;
        const settings = this.options.settings;
        this.ui.showFinal(
          settings.get('blessingTitle'),
          settings.get('blessingMessage'),
          settings.get('signature')
        );
      }
      return;
    }
    this.lastFinalShown = false;
    const chapter = getFilmChapter(time);
    this.ui.showSubtitle(chapter.title, chapter.subtitle);
  }

  private updateCues(time: number): void {
    const cues: Array<{ at: number; name: 'gift' | 'star' | 'tap' | 'photo' }> = [
      { at: 18, name: 'star' },
      { at: 24.5, name: 'tap' },
      { at: 30, name: 'photo' },
      { at: 42, name: 'gift' },
      { at: 52, name: 'star' },
      { at: 62, name: 'tap' }
    ];
    for (const cue of cues) {
      const key = `${cue.at}:${cue.name}`;
      if (time >= cue.at && time < cue.at + 0.4 && this.lastCue !== key) {
        this.lastCue = key;
        this.audio.cue(cue.name);
      }
    }
  }

  private finishAndRestore(): void {
    this.active = false;
    this.paused = false;
    this.story.cleanup();
    this.audio.end();
    this.options.intro.restoreScene();
    this.snapshot.restore();
    this.ui.setPaused(false);
    document.body.classList.remove('is-film-playing');
    this.options.camera.camera.updateProjectionMatrix();
  }
}
