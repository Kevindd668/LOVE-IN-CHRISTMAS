import './styles.css';
import * as THREE from 'three';
import {
  GIFT_MESSAGES_FALLBACK,
  MUSIC_LABELS,
  QUALITY_PRESETS,
  type MusicTrack,
  type QualityLevel,
  type WishSettings
} from './config';
import { AnimationManager } from './core/AnimationManager';
import { CameraManager } from './core/CameraManager';
import { Renderer } from './core/Renderer';
import { SceneManager } from './core/SceneManager';
import { MusicEngine } from './audio/MusicEngine';
import { ChristmasTree } from './objects/ChristmasTree';
import { GiftBoxes } from './objects/GiftBoxes';
import { RomanticText } from './objects/RomanticText';
import { AuroraEffect } from './effects/AuroraEffect';
import { GalaxyEnvironment } from './effects/GalaxyEnvironment';
import { HeartParticles } from './particles/HeartParticles';
import { HeartParticleSystem } from './particles/HeartParticleSystem';
import { MagicParticles } from './particles/MagicParticles';
import { SnowParticles } from './particles/SnowParticles';
import { StarParticles } from './particles/StarParticles';
import { PhotoManager } from './photos/PhotoManager';
import { ControlPanel } from './ui/ControlPanel';
import { PhotoUploader } from './ui/PhotoUploader';
import { SettingsManager } from './ui/SettingsManager';
import { UIManager } from './ui/UIManager';
import { MouseInteraction, type PickTarget } from './interaction/MouseInteraction';
import { GiftInteraction, type GiftOpenResult } from './interaction/GiftInteraction';
import { DemoController, type DemoCallbacks } from './interaction/DemoController';
import { RomanceMoment } from './interaction/RomanceMoment';

class ChristmasWishApp {
  private readonly settings = new SettingsManager();
  private ui!: UIManager;
  private renderer!: Renderer;
  private sceneManager!: SceneManager;
  private cameraManager!: CameraManager;
  private animation!: AnimationManager;
  private tree!: ChristmasTree;
  private numbers!: RomanticText;
  private gifts!: GiftBoxes;
  private photos!: PhotoManager;
  private hearts!: HeartParticles;
  private giantHeart!: HeartParticleSystem;
  private galaxy!: GalaxyEnvironment;
  private snow!: SnowParticles;
  private stars!: StarParticles;
  private aurora!: AuroraEffect;
  private magic!: MagicParticles;
  private music!: MusicEngine;
  private controlPanel!: ControlPanel;
  private photoUploader!: PhotoUploader;
  private mouse!: MouseInteraction;
  private giftInteraction!: GiftInteraction;
  private demo!: DemoController;
  private romance!: RomanceMoment;

  private width = Math.max(1, window.innerWidth);
  private height = Math.max(1, window.innerHeight);
  private lastFps = 60;
  private elapsed = 0;
  private lastStatsAt = 0;
  private treeRefreshTimer = 0;
  private textRefreshTimer = 0;
  private pendingShapeChange = false;
  private pendingLightCountChange = false;
  private shapeRebuildInFlight = false;
  private interactionLocked = false;
  private starSequenceActive = false;
  private starWishTimer = 0;
  private giftWishTimer = 0;
  private musicBusy = false;
  private heartHintShown = false;
  private pageReady = false;
  // Compatibility rendering is now the default: direct canvas rendering with
  // no bloom/compositor-heavy overlay stack. This is the stable path for the
  // Windows/Edge GPU configuration that produced black compositor tiles.
  // `?full=1` (or the legacy `?safe=0`) opts back into the full bloom pipeline.
  private readonly safeMode = (() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    return params.get('full') !== '1' && params.get('safe') !== '0';
  })();

  constructor() {
    // Preserve a carefully prepared scene across accidental reloads, but never
    // autoplay audio: browsers require an explicit user gesture for sound.
    this.settings.set('musicOn', false, { silent: true });
  }

  async init(): Promise<void> {
    this.ui = new UIManager();
    if (this.safeMode) {
      document.body.classList.add('safe-mode');
      document.body.dataset.renderMode = 'compatible';
    } else {
      document.body.dataset.renderMode = 'full';
    }
    const canvas = document.querySelector<HTMLCanvasElement>('#scene-canvas');
    if (!canvas) throw new Error('Scene canvas not found');

    try {
      this.width = Math.max(1, window.innerWidth);
      this.height = Math.max(1, window.innerHeight);
      this.renderer = new Renderer(canvas, this.settings.get('quality'));
      this.renderer.setSize(this.width, this.height);

      this.sceneManager = new SceneManager(this.renderer.renderer, {
        backgroundColor: this.settings.get('backgroundColor'),
        qualityPreset: QUALITY_PRESETS[this.settings.get('quality')]
      });
      this.cameraManager = new CameraManager(canvas, this.width, this.height);
      this.renderer.attachScene(this.sceneManager.scene, this.cameraManager.camera);
      if (this.safeMode) this.renderer.setDirectRendering(true);

      this.buildScene();
      this.music = new MusicEngine();
      this.music.setVolume(this.settings.get('musicVolume'));

      this.photoUploader = new PhotoUploader(this.photos, {
        notify: (message) => this.ui.toast(message)
      });

      this.controlPanel = new ControlPanel({
        settings: this.settings,
        onQuality: (quality) => this.setQuality(quality),
        onReset: () => this.resetSettings(),
        onRomance: () => this.startRomance(),
        onNotify: (message) => this.ui.toast(message)
      });

      this.applyInitialSettings();
      this.setupInteraction();
      this.setupShowControllers();
      this.bindUI();
      this.bindKeyboardCinemaShortcuts();
      this.bindResize();
      this.setupAudioUnlock();

      this.settings.subscribe((settings, changed) => {
        this.handleSettingsChanged(settings, new Set(changed));
      });

      this.animation = new AnimationManager();
      this.animation.start(
        (delta, elapsed) => this.tick(delta, elapsed),
        (fps) => {
          this.lastFps = fps;
        }
      );

      this.pageReady = true;
      this.ui.setMusicState(false);
      this.ui.scheduleHintHide(16000);
      window.setTimeout(() => {
        this.ui.hideLoader();
        this.cameraManager.playIntro();
      }, 650);

      this.exposeDebugApi();
      window.dispatchEvent(new CustomEvent('christmas-wish-ready'));
      console.info(
        '%cA Christmas Wish %c· every light is a little wish.',
        'color:#e4c286;font-family:Georgia,serif;font-size:16px;',
        'color:#9fb6bb;font-size:11px;'
      );
    } catch (error) {
      console.error('[A Christmas Wish]', error);
      this.showFatalError(error);
    }
  }

  private createDefaultGiftMessages(): string[] {
    const settings = this.settings.current;
    return [
      settings.giftMessage0,
      settings.giftMessage1,
      settings.giftMessage2,
      GIFT_MESSAGES_FALLBACK[3],
      GIFT_MESSAGES_FALLBACK[4]
    ];
  }

  private buildScene(): void {
    const settings = this.settings.current;
    const quality = QUALITY_PRESETS[settings.quality];
    this.tree = new ChristmasTree(settings);
    this.numbers = new RomanticText(
      settings.text520,
      settings.text1314,
      settings.treeHeight,
      settings.crownRadius
    );
    this.gifts = new GiftBoxes();
    this.photos = new PhotoManager();
    this.hearts = new HeartParticles(
      settings.heartCount,
      settings.heartColor,
      settings.heartSpeed,
      settings.heartSize
    );
    this.snow = new SnowParticles(settings.snowCount, settings.snowSpeed);
    this.stars = new StarParticles(quality.starCount);
    this.aurora = new AuroraEffect();
    this.magic = new MagicParticles();
    this.galaxy = new GalaxyEnvironment({
      count: 8000,
      farCount: 6000,
      waterfallCount: 5800,
      quality: settings.quality
    });
    this.giantHeart = new HeartParticleSystem({
      count: settings.giantHeartCount,
      size: 0.085,
      heartColor: settings.giantHeartColor,
      starColor: '#FFD58A',
      gatherTime: 2.5,
      burstTime: 1.8,
      beatPeriod: 2.5,
      autoCycle: false
    });
    // The giant heart sits behind the tree as a halo, so it never blocks the
    // core tree, gifts, photos or 520/1314 labels.
    this.giantHeart.setPosition(3.8, 7.6, -9.5);
    this.giantHeart.setScale(1.4);

    const scene = this.sceneManager.scene;
    scene.add(this.galaxy.group);
    scene.add(
      this.tree.group,
      this.numbers.group,
      this.gifts.group,
      this.photos.group,
      this.hearts.group,
      this.snow.points,
      this.stars.group,
      this.aurora.group,
      this.magic.group,
      this.giantHeart.group
    );

    const giftShadows: THREE.Object3D[] = [];
    for (let i = 0; i < 5; i += 1) {
      const shadow = this.sceneManager.getContactShadow(i + 1);
      if (shadow) giftShadows.push(shadow);
    }
    this.gifts.updateContactShadows(giftShadows);

    this.photos.setShowCaptions(settings.showCaptions);
    this.photos.setReveal(1);
    this.hearts.setLayout(settings.treeHeight);
    this.hearts.setEnabled(settings.heartsOn);
    this.hearts.setOpacity(settings.heartsOn ? 1 : 0);
    this.snow.setCount(settings.snowCount);
    this.snow.setEnabled(settings.snowOn);
    this.snow.setOpacity(settings.snowOn ? 1 : 0);
    this.stars.setEnabled(settings.starsOn);
    this.stars.setOpacity(settings.starsOn ? 1 : 0);
    this.aurora.setEnabled(settings.auroraOn);
    this.aurora.setOpacity(settings.auroraOn ? 0.65 : 0);
    this.galaxy.setStarsEnabled(settings.starsOn);
    this.galaxy.setAuroraEnabled(settings.auroraOn);
    this.galaxy.setMeteorsEnabled(settings.meteorsOn);
    this.galaxy.setWaterfallEnabled(settings.waterfallOn);
    this.galaxy.setOrbitsEnabled(settings.orbitsOn);
    this.galaxy.setQuality(settings.quality);
    this.giantHeart.setCount(settings.giantHeartCount);
    this.giantHeart.setColors(settings.giantHeartColor, '#FFD58A');
    this.giantHeart.setVisible(settings.giantHeartOn);
    this.giantHeart.setPaused(settings.giantHeartPaused);
  }

  private applyInitialSettings(): void {
    const settings = this.settings.current;
    this.sceneManager.setBackground(settings.backgroundColor);
    this.sceneManager.setAmbient(settings.ambientBrightness);
    this.cameraManager.setSubjectHeight(settings.treeHeight);
    this.tree.setLightMode(settings.lightMode, settings.lightColor);
    this.tree.setLightBrightness(settings.lightBrightness);
    this.tree.setLightSpeed(settings.lightFlashSpeed);
    this.tree.setLightsEnabled(settings.lightsOn);
    this.tree.setRotationEnabled(settings.treeRotate);
    this.tree.setRotationSpeed(settings.treeRotateSpeed);
    this.tree.setOverallBrightness(settings.treeBrightness);
    this.tree.setHelixEnabled(settings.helixOn);
    this.tree.setHelixSpeed(settings.helixSpeed);
    this.tree.setHelixPhase(settings.helixPhase);
    this.tree.setOrnamentsEnabled(settings.ornamentsOn);
    this.tree.setStarVisible(settings.crownHeartOn);
    this.updateLightSpill();
    this.snow.setSpeed(settings.snowSpeed);
    this.hearts.setCount(settings.heartCount);
    this.hearts.setColor(settings.heartColor);
    this.hearts.setSize(settings.heartSize);
    this.hearts.setSpeed(settings.heartSpeed);
    this.hearts.setMode(settings.heartMode);
    this.ui.setMusicState(false);
  }

  private setupInteraction(): void {
    this.mouse = new MouseInteraction({
      canvas: this.sceneManager.scene ? document.querySelector<HTMLCanvasElement>('#scene-canvas')! : this.renderer.canvas,
      camera: this.cameraManager.camera,
      scene: this.sceneManager.scene,
      getMeshes: () => [
        ...this.tree.getPickMeshes(),
        ...this.gifts.getPickMeshes(),
        ...this.photos.getPickMeshes()
      ],
      isEnabled: () =>
        !this.interactionLocked &&
        !this.demo?.isActive &&
        !this.romance?.isActive &&
        !document.body.classList.contains('is-cinema'),
      onPick: (target) => this.handlePick(target),
      onHover: (target) => this.handleHover(target)
    });

    this.giftInteraction = new GiftInteraction({
      gifts: this.gifts,
      magic: this.magic,
      camera: this.cameraManager.camera,
      messages: () => this.createDefaultGiftMessages(),
      onOpen: (result) => this.handleGiftOpened(result)
    });

    this.cameraManager.controls.addEventListener('start', () => {
      this.ui.hideHint();
      this.ui.registerInteraction();
    });
  }

  private setupShowControllers(): void {
    const demoCallbacks: DemoCallbacks = {
      onEnter: () => {
        this.controlPanel?.close();
        this.ui.cinemaStart();
        this.ui.hideHint();
        this.interactionLocked = true;
        this.mouse?.setEnabled(false);
      },
      onExit: () => this.restoreAfterCinema('demo'),
      onChapter: (act, line) => this.ui.setChapter(act, line),
      onProgress: (elapsed, duration) => this.ui.setCinemaProgress(elapsed, duration),
      onPause: (paused) => this.ui.setCinemaPaused(paused),
      onEnding: () => {
        this.ui.showCinemaEnding(
          this.settings.get('blessingMessage'),
          this.settings.get('signature')
        );
        this.music.playEffect('star');
        this.magic.burst(new THREE.Vector3(0, this.settings.get('treeHeight') * 0.55, 0.6), {
          count: 66,
          colors: ['#FFD99F', '#FFEAC2', '#FFB88F'],
          speed: 1.1,
          spread: 0.85,
          upward: 0.55,
          gravity: -0.18,
          life: 2.3,
          size: 1.05
        });
      }
    };

    this.demo = new DemoController({
      scene: this.sceneManager.scene,
      camera: this.cameraManager,
      renderer: this.renderer,
      tree: this.tree,
      numbers: this.numbers,
      photos: this.photos,
      hearts: this.hearts,
      snow: this.snow,
      stars: this.stars,
      aurora: this.aurora,
      gifts: this.gifts,
      settings: this.settings,
      callbacks: demoCallbacks
    });

    this.romance = new RomanceMoment({
      camera: this.cameraManager,
      renderer: this.renderer,
      tree: this.tree,
      numbers: this.numbers,
      photos: this.photos,
      hearts: this.hearts,
      snow: this.snow,
      gifts: this.gifts,
      settings: this.settings,
      callbacks: {
        onEnter: () => {
          this.controlPanel?.close();
          this.ui.setRomanceMode(true);
          this.ui.hideHint();
          this.interactionLocked = true;
          this.mouse?.setEnabled(false);
        },
        onExit: () => this.restoreAfterCinema('romance'),
        onFinale: () => {
          this.ui.showWish({
            kicker: 'ONLY FOR US · 只属于我们的圣诞节',
            title: this.settings.get('blessingTitle'),
            body: this.settings.get('blessingMessage'),
            signature: this.settings.get('signature'),
            acceptLabel: '抱住这个冬天',
            onClose: () => {
              if (this.romance.isActive) this.romance.stop();
            }
          });
          this.music.playEffect('star');
        },
        onProgress: () => undefined
      }
    });

    this.ui.bindCinemaHandlers({
      onTogglePause: () => {
        if (this.demo.isActive) this.demo.togglePause();
      },
      onExit: () => this.stopDemo(),
      onReplay: () => {
        if (this.demo.isActive) {
          this.demo.restart();
        } else {
          this.startDemo();
        }
      },
      onCloseEnding: () => this.stopDemo(),
      onRomanceExit: () => this.stopRomance()
    });
  }

  private bindUI(): void {
    document.querySelector<HTMLButtonElement>('#btn-demo')?.addEventListener('click', () => {
      void this.startDemo();
    });
    document.querySelector<HTMLButtonElement>('#btn-romance')?.addEventListener('click', () => {
      void this.startRomance();
    });
    document.querySelector<HTMLButtonElement>('#btn-reset-view')?.addEventListener('click', () => {
      this.cameraManager.resetView();
      this.ui.toast('镜头已经回到最初看圣诞树的位置');
      this.ui.registerInteraction();
    });
    document.querySelector<HTMLButtonElement>('#btn-giant-heart-gather')?.addEventListener('click', () => {
      this.giantHeart.gather(this.elapsed);
      this.ui.toast('一万颗粒子正在向爱心聚合');
      this.ui.registerInteraction();
    });
    document.querySelector<HTMLButtonElement>('#btn-giant-heart-burst')?.addEventListener('click', () => {
      this.giantHeart.burst(this.elapsed);
      this.ui.toast('让这束光先替我们心动一次');
      this.ui.registerInteraction();
    });

    this.ui.musicElement.addEventListener('click', () => {
      const next = !this.settings.get('musicOn');
      this.settings.set('musicOn', next);
      if (next) {
        this.ui.toast('正在为你打开冬夜的声音…', 1600);
      }
    });

    document.querySelector<HTMLButtonElement>('#btn-fullscreen')?.addEventListener('click', () => {
      void this.toggleFullscreen();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.demo.isActive && !this.demo.isPaused) {
        // The in-page controls remain the primary exit; Escape is a quiet fallback.
        if (!document.querySelector('.cinema.is-ending')) this.stopDemo();
      }
    });
  }

  private setupAudioUnlock(): void {
    const unlock = (): void => {
      if (!this.music.isUnlocked) {
        void this.music.unlock();
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  private bindResize(): void {
    const resize = (): void => {
      this.width = Math.max(1, window.innerWidth);
      this.height = Math.max(1, window.innerHeight);
      this.renderer.setSize(this.width, this.height);
      this.cameraManager.setSize(this.width, this.height);
    };
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Re-allocate the WebGL swap chain after the compositor resumes from a
        // suspended/occluded window; this also clears stale browser tiles.
        window.setTimeout(resize, 30);
      }
    });
  }

  private async startDemo(): Promise<void> {
    if (this.demo.isActive || this.romance.isActive || this.starSequenceActive) {
      this.ui.toast('先让眼前的这一刻慢慢结束吧');
      return;
    }
    if (this.ui.hasOpenOverlay) {
      this.ui.closeWish();
      this.ui.closeLightbox();
    }
    this.enableShowMusic();
    this.controlPanel.close();
    this.clearGiftTimer();
    this.demo.start();
  }

  private stopDemo(): void {
    if (!this.demo.isActive) return;
    this.demo.exit();
  }

  private async startRomance(): Promise<void> {
    if (this.romance.isActive || this.demo.isActive || this.starSequenceActive) {
      this.ui.toast('浪漫时刻正在发生，先留住眼前这一刻吧');
      return;
    }
    if (this.ui.hasOpenOverlay) {
      this.ui.closeWish();
      this.ui.closeLightbox();
    }
    this.enableShowMusic();
    this.controlPanel.close();
    this.clearGiftTimer();
    this.romance.start();
  }

  private stopRomance(): void {
    if (!this.romance.isActive) return;
    this.romance.stop();
  }

  private enableShowMusic(): void {
    if (this.settings.get('musicOn')) return;
    this.settings.set('musicOn', true);
  }

  private restoreAfterCinema(kind: 'demo' | 'romance'): void {
    const settings = this.settings.current;
    if (kind === 'demo') {
      this.ui.cinemaStop();
    } else {
      this.ui.setRomanceMode(false);
    }
    document.body.classList.remove('is-cinema');
    this.clearGiftTimer();
    this.cameraManager.endCinematic();
    this.cameraManager.setSubjectHeight(settings.treeHeight);
    this.cameraManager.resetView();

    this.renderer.setExposure(1.08);
    this.tree.resetPresentation();
    this.tree.setLightsEnabled(settings.lightsOn);
    this.tree.setLightsReveal(1);
    this.tree.star.root.scale.setScalar(1);
    this.tree.setStarVisible(settings.crownHeartOn);
    this.tree.setHelixEnabled(settings.helixOn);
    this.tree.setHelixSpeed(settings.helixSpeed);
    this.tree.setHelixPhase(settings.helixPhase);
    this.tree.setOrnamentsEnabled(settings.ornamentsOn);
    this.tree.setOverallBrightness(settings.treeBrightness);
    this.numbers.setAllReveal(1);
    this.photos.setReveal(1);
    this.hearts.setEnabled(settings.heartsOn);
    this.hearts.setOpacity(settings.heartsOn ? 1 : 0);
    this.hearts.setMode(settings.heartMode);
    this.hearts.setLayout(settings.treeHeight);
    this.snow.setEnabled(settings.snowOn);
    this.snow.setOpacity(settings.snowOn ? 1 : 0);
    this.snow.setSpeed(settings.snowSpeed);
    this.stars.setEnabled(settings.starsOn);
    this.stars.setOpacity(settings.starsOn ? 1 : 0);
    this.aurora.setEnabled(settings.auroraOn);
    this.gifts.group.visible = true;
    this.gifts.setCelebration(0);
    this.interactionLocked = false;
    this.mouse.setEnabled(true);
  }

  private handlePick(target: PickTarget): void {
    if (this.interactionLocked) return;
    this.ui.registerInteraction();
    this.ui.hideHint();
    switch (target.type) {
      case 'star':
        this.startStarBlessing();
        break;
      case 'gift':
        this.giftInteraction.handle(target.index);
        break;
      case 'photo': {
        const photo = this.photos.getPhotoById(target.id);
        if (photo) {
          this.photos.setSelected(target.id);
          this.ui.showLightbox(photo);
          this.music.playEffect('photo');
        }
        break;
      }
      case 'tree':
        this.magic.clickBloom(target.point, this.cameraManager.camera);
        this.music.playEffect('tap');
        break;
      case 'empty':
        this.photos.setSelected(null);
        this.hearts.pulseGather(3.6);
        this.music.playEffect('tap');
        if (!this.heartHintShown) {
          this.heartHintShown = true;
          this.ui.toast('你让所有心跳聚合成了一个大大的爱心', 2600);
        }
        break;
      default:
        break;
    }
  }

  private handleHover(target: PickTarget | null): void {
    const giftIndex = target?.type === 'gift' ? target.index : null;
    const photoId = target?.type === 'photo' ? target.id : null;
    this.gifts.setHover(giftIndex);
    this.photos.setHovered(photoId);
  }

  private handleGiftOpened(result: GiftOpenResult): void {
    this.music.playEffect('gift');
    window.clearTimeout(this.giftWishTimer);
    this.giftWishTimer = window.setTimeout(() => {
      const settings = this.settings.current;
      this.ui.showWish({
        kicker: `A GIFT FOR YOU · ${result.label}`,
        title: settings.blessingTitle,
        body: result.message,
        signature: settings.signature,
        acceptLabel: '收下这份礼物'
      });
    }, 520);
  }

  private startStarBlessing(): void {
    if (this.starSequenceActive || this.demo.isActive || this.romance.isActive) return;
    this.starSequenceActive = true;
    this.interactionLocked = true;
    this.mouse.setEnabled(false);
    this.controlPanel.close();
    this.ui.hideHint();
    this.clearGiftTimer();

    const settings = this.settings.current;
    const starY = this.tree.getTopY();
    this.settings.set('lightsOn', true);
    this.tree.setLightsEnabled(true);
    this.tree.setLightsReveal(1);
    this.tree.flashStar();
    this.snow.setSpeed(settings.snowSpeed * 0.32);
    this.hearts.pulseGather(5.4);
    this.gifts.setCelebration(0.65);
    this.numbers.setAllReveal(1);
    this.music.playEffect('star');
    this.magic.burst(new THREE.Vector3(0, starY + 0.05, 0), {
      count: 76,
      colors: ['#FFD37C', '#FFF0C7', '#FFB86F'],
      speed: 1.65,
      spread: 1.3,
      upward: 0.35,
      gravity: -0.08,
      life: 2.4,
      size: 1.08
    });

    this.cameraManager.beginCinematic();
    this.cameraManager.animateTo(
      new THREE.Vector3(4.4, starY + 0.9, 8.4),
      new THREE.Vector3(0, starY - 0.15, 0),
      2.3,
      false
    );
    document.body.classList.add('is-cinema');

    window.clearTimeout(this.starWishTimer);
    this.starWishTimer = window.setTimeout(() => {
      this.ui.showWish({
        kicker: 'A WISH UPON THE STAR',
        title: settings.blessingTitle,
        body: settings.blessingMessage,
        signature: settings.signature,
        acceptLabel: '让这颗星替我收好',
        onClose: () => this.endStarBlessing()
      });
    }, 1750);
  }

  private endStarBlessing(): void {
    if (!this.starSequenceActive) return;
    window.clearTimeout(this.starWishTimer);
    this.starSequenceActive = false;
    this.gifts.setCelebration(0);
    this.snow.setSpeed(this.settings.get('snowSpeed'));
    this.hearts.setMode(this.settings.get('heartMode'));
    document.body.classList.remove('is-cinema');
    this.cameraManager.endCinematic();
    this.cameraManager.resetView();
    this.interactionLocked = false;
    this.mouse.setEnabled(true);
  }

  private clearGiftTimer(): void {
    window.clearTimeout(this.giftWishTimer);
    this.giftWishTimer = 0;
  }

  private handleSettingsChanged(settings: WishSettings, changed: Set<keyof WishSettings>): void {
    const structural =
      changed.has('treeHeight') ||
      changed.has('crownRadius') ||
      changed.has('density') ||
      changed.has('layers');

    if (structural) {
      this.pendingShapeChange = true;
      this.scheduleTreeRefresh();
    }
    if (changed.has('lightCount')) {
      this.pendingLightCountChange = true;
      this.scheduleTreeRefresh();
    }
    if (changed.has('foliageColor') && !structural) {
      this.tree.branches.updatePalette(settings.foliageColor);
    }
    if (changed.has('treeRotate')) this.tree.setRotationEnabled(settings.treeRotate);
    if (changed.has('treeRotateSpeed')) this.tree.setRotationSpeed(settings.treeRotateSpeed);
    if (changed.has('treeBrightness')) this.tree.setOverallBrightness(settings.treeBrightness);
    if (changed.has('helixOn')) this.tree.setHelixEnabled(settings.helixOn);
    if (changed.has('helixSpeed')) this.tree.setHelixSpeed(settings.helixSpeed);
    if (changed.has('helixPhase')) this.tree.setHelixPhase(settings.helixPhase);
    if (changed.has('ornamentsOn')) this.tree.setOrnamentsEnabled(settings.ornamentsOn);
    if (changed.has('crownHeartOn')) this.tree.setStarVisible(settings.crownHeartOn);

    if (changed.has('lightMode') || changed.has('lightColor')) {
      this.tree.setLightMode(settings.lightMode, settings.lightColor);
    }
    if (changed.has('lightBrightness')) this.tree.setLightBrightness(settings.lightBrightness);
    if (changed.has('lightFlashSpeed')) this.tree.setLightSpeed(settings.lightFlashSpeed);
    if (changed.has('lightsOn')) {
      this.tree.setLightsEnabled(settings.lightsOn);
      if (settings.lightsOn) this.tree.setLightsReveal(1);
    }
    if (
      changed.has('lightsOn') ||
      changed.has('lightColor') ||
      changed.has('lightBrightness') ||
      changed.has('lightMode')
    ) {
      this.updateLightSpill();
    }

    if (changed.has('heartCount')) this.hearts.setCount(settings.heartCount);
    if (changed.has('heartColor')) this.hearts.setColor(settings.heartColor);
    if (changed.has('heartSize')) this.hearts.setSize(settings.heartSize);
    if (changed.has('heartSpeed')) this.hearts.setSpeed(settings.heartSpeed);
    if (changed.has('heartMode')) this.hearts.setMode(settings.heartMode);
    if (changed.has('heartsOn')) {
      this.hearts.setEnabled(settings.heartsOn);
      this.hearts.setOpacity(settings.heartsOn ? 1 : 0);
    }

    if (changed.has('snowOn')) {
      this.snow.setEnabled(settings.snowOn);
      this.snow.setOpacity(settings.snowOn ? 1 : 0);
    }
    if (changed.has('snowCount')) this.snow.setCount(settings.snowCount);
    if (changed.has('snowSpeed')) this.snow.setSpeed(settings.snowSpeed);
    if (changed.has('starsOn')) {
      this.stars.setEnabled(settings.starsOn);
      this.stars.setOpacity(settings.starsOn ? 1 : 0);
      this.galaxy.setStarsEnabled(settings.starsOn);
    }
    if (changed.has('auroraOn')) {
      this.aurora.setEnabled(settings.auroraOn);
      this.galaxy.setAuroraEnabled(settings.auroraOn);
    }
    if (changed.has('meteorsOn')) this.galaxy.setMeteorsEnabled(settings.meteorsOn);
    if (changed.has('waterfallOn')) this.galaxy.setWaterfallEnabled(settings.waterfallOn);
    if (changed.has('orbitsOn')) this.galaxy.setOrbitsEnabled(settings.orbitsOn);
    if (changed.has('giantHeartOn')) this.giantHeart.setVisible(settings.giantHeartOn);
    if (changed.has('giantHeartPaused')) this.giantHeart.setPaused(settings.giantHeartPaused);
    if (changed.has('giantHeartCount')) this.giantHeart.setCount(settings.giantHeartCount);
    if (changed.has('giantHeartColor')) {
      this.giantHeart.setColors(settings.giantHeartColor, '#FFD58A');
    }
    if (changed.has('backgroundColor')) this.sceneManager.setBackground(settings.backgroundColor);
    if (changed.has('ambientBrightness')) this.sceneManager.setAmbient(settings.ambientBrightness);

    if (changed.has('showCaptions')) this.photos.setShowCaptions(settings.showCaptions);

    if (changed.has('text520') || changed.has('text1314')) {
      this.scheduleNumberRefresh();
    }

    if (changed.has('quality')) {
      this.renderer.setQuality(settings.quality);
      this.sceneManager.setQuality(QUALITY_PRESETS[settings.quality]);
      this.stars.setCount(QUALITY_PRESETS[settings.quality].starCount);
      this.galaxy.setQuality(settings.quality);
      const giantCount =
        settings.quality === 'performance'
          ? Math.min(6000, settings.giantHeartCount)
          : settings.quality === 'balanced'
            ? Math.min(8000, settings.giantHeartCount)
            : settings.giantHeartCount;
      this.giantHeart.setCount(giantCount);
    }

    if (changed.has('musicTrack')) {
      this.music.setTrack(settings.musicTrack);
    }
    if (changed.has('musicVolume')) {
      this.music.setVolume(settings.musicVolume);
    }
    if (changed.has('musicOn')) {
      void this.syncMusicState(settings.musicOn);
    }
  }

  private scheduleTreeRefresh(): void {
    if (this.treeRefreshTimer) return;
    this.treeRefreshTimer = window.setTimeout(() => {
      this.treeRefreshTimer = 0;
      if (!this.pageReady) return;
      this.refreshTree();
    }, 110);
  }

  private refreshTree(): void {
    if (this.shapeRebuildInFlight) return;
    this.shapeRebuildInFlight = true;
    const settings = this.settings.current;
    const structural = this.pendingShapeChange;
    const lightOnly = this.pendingLightCountChange && !structural;
    this.pendingShapeChange = false;
    this.pendingLightCountChange = false;

    try {
      if (structural) {
        this.tree.rebuildTree(settings);
        this.numbers.setLayout(settings.treeHeight, settings.crownRadius);
        this.hearts.setLayout(settings.treeHeight);
        this.cameraManager.setSubjectHeight(settings.treeHeight);
      } else if (lightOnly) {
        this.tree.rebuildLights(settings);
      }
      this.updateLightSpill();
    } finally {
      this.shapeRebuildInFlight = false;
    }
  }

  private scheduleNumberRefresh(): void {
    window.clearTimeout(this.textRefreshTimer);
    this.textRefreshTimer = window.setTimeout(() => {
      const settings = this.settings.current;
      this.numbers.setText(settings.text520, settings.text1314);
    }, 160);
  }

  private updateLightSpill(): void {
    const settings = this.settings.current;
    this.sceneManager.lights.setLightSpill(
      settings.lightsOn,
      new THREE.Color(settings.lightColor),
      settings.lightBrightness
    );
  }

  private async syncMusicState(enabled: boolean): Promise<void> {
    if (this.musicBusy) return;
    this.musicBusy = true;
    try {
      if (enabled) {
        const active = await this.music.enable(
          this.settings.get('musicTrack'),
          this.settings.get('musicVolume')
        );
        if (!active) {
          this.settings.set('musicOn', false, { silent: true });
          this.ui.setMusicState(false);
          this.controlPanel?.refresh();
          this.ui.toast('浏览器没有允许播放声音，再点一次试试');
          return;
        }
        this.ui.setMusicState(true);
        this.controlPanel?.refresh();
      } else {
        this.music.disable();
        this.ui.setMusicState(false);
        this.controlPanel?.refresh();
      }
    } finally {
      this.musicBusy = false;
      const desired = this.settings.get('musicOn');
      if (desired !== enabled) {
        void this.syncMusicState(desired);
      }
    }
  }

  private setQuality(quality: QualityLevel): void {
    const preset = QUALITY_PRESETS[quality];
    this.settings.patch({
      quality,
      snowCount: preset.snowCount,
      lightCount: preset.lightCount,
      heartCount: preset.heartCount
    });
    this.galaxy?.setQuality(quality);
    this.controlPanel.refresh();
    this.ui.toast(`已切换至 ${preset.label} 画质 · 让每一帧都恰到好处`);
  }

  private resetSettings(): void {
    this.settings.reset();
    this.controlPanel.refresh();
    this.cameraManager.resetView();
    this.stars.setCount(QUALITY_PRESETS[this.settings.get('quality')].starCount);
  }

  private tick(delta: number, elapsed: number): void {
    if (!this.pageReady) return;
    this.elapsed = elapsed;
    this.cameraManager.update(delta);

    if (this.demo.isActive) {
      this.demo.update(delta);
    } else if (this.romance.isActive) {
      this.romance.update(delta);
    }

    this.tree.update(delta, elapsed);
    this.numbers.update(delta, elapsed, this.cameraManager.camera);
    this.photos.update(delta, elapsed, this.cameraManager.camera, {
      photoSpeed: this.settings.get('photoSpeed'),
      photoRadius: this.settings.get('photoRadius'),
      photosPaused: this.settings.get('photosPaused'),
      cardScale: this.settings.get('cardScale'),
      showCaptions: this.settings.get('showCaptions')
    });
    this.hearts.update(delta, elapsed, this.cameraManager.camera);
    this.snow.update(delta, elapsed);
    this.stars.update(delta, elapsed);
    this.aurora.update(delta, elapsed);
    // WP1: GalaxyEnvironment owns the normal-scene sky. The legacy layers are
    // retained only for the 45s demo and romance sequence so their original
    // opacity choreography still works without stacking a second starfield.
    const legacySkyVisible = this.demo.isActive || this.romance.isActive;
    this.stars.group.visible = legacySkyVisible;
    this.aurora.group.visible = legacySkyVisible;
    this.galaxy.update(delta, elapsed);
    this.giantHeart.update(delta, elapsed);
    this.gifts.update(delta, elapsed, this.cameraManager.camera);
    this.magic.update(delta, elapsed);

    this.renderer.render();

    const now = performance.now();
    if (now - this.lastStatsAt > 700) {
      this.lastStatsAt = now;
      this.controlPanel?.setStats(
        this.lastFps,
        this.renderer.renderer.info.render.calls
      );
    }
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      this.ui.toast('当前浏览器不允许全屏，可以直接用浏览器窗口欣赏');
    }
  }

  private showFatalError(error: unknown): void {
    const loader = document.querySelector<HTMLElement>('#loader');
    if (!loader) return;
    loader.classList.remove('is-done');
    const sub = loader.querySelector<HTMLElement>('.loader-sub');
    const small = loader.querySelector<HTMLElement>('.loader-small');
    const bar = loader.querySelector<HTMLElement>('.loader-bar');
    if (sub) sub.textContent = '这棵圣诞树暂时没有被点亮';
    if (small) {
      small.textContent =
        '请使用最新版 Chrome 或 Edge 打开，并确认浏览器已开启 WebGL 硬件加速。';
    }
    if (bar) bar.style.display = 'none';
    console.error('[A Christmas Wish] fatal:', error);
  }

  private exposeDebugApi(): void {
    (
      window as unknown as {
        __CHRISTMAS_WISH__?: Record<string, unknown>;
      }
    ).__CHRISTMAS_WISH__ = {
      ready: true,
      app: this,
      scene: this.sceneManager.scene,
      camera: this.cameraManager.camera,
      renderer: this.renderer.renderer,
      startDemo: () => this.startDemo(),
      stopDemo: () => this.stopDemo(),
      startRomance: () => this.startRomance(),
      stopRomance: () => this.stopRomance(),
      openGift: (index: number) => this.giftInteraction.handle(index),
      getFps: () => this.lastFps,
      getDrawCalls: () => this.renderer.renderer.info.render.calls,
      getSettings: () => this.settings.current,
      setQuality: (quality: QualityLevel) => this.setQuality(quality),
      toggleStarBlessing: () => this.startStarBlessing(),
      giantHeart: this.giantHeart,
      galaxy: this.galaxy,
      gatherGiantHeart: () => this.giantHeart.gather(this.elapsed),
      burstGiantHeart: () => this.giantHeart.burst(this.elapsed),
      photos: () => this.photos.views
    };
    document.body.dataset.ready = 'true';
  }

  private bindKeyboardCinemaShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      if (event.code !== 'Space' || !this.demo.isActive) return;
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
      if (this.demo.isFinished) return;
      event.preventDefault();
      this.demo.togglePause();
    });
  }

  dispose(): void {
    this.animation?.stop();
    this.mouse?.dispose();
    this.controlPanel?.dispose();
    this.demo?.dispose();
    this.romance?.dispose();
    this.tree?.dispose();
    this.numbers?.dispose();
    this.gifts?.dispose();
    this.photos?.dispose();
    this.hearts?.dispose();
    this.giantHeart?.dispose();
    this.galaxy?.dispose();
    this.snow?.dispose();
    this.stars?.dispose();
    this.aurora?.dispose();
    this.magic?.dispose();
    this.music?.dispose();
    this.sceneManager?.dispose();
    this.renderer?.dispose();
  }
}

const app = new ChristmasWishApp();
void app.init();

window.addEventListener('beforeunload', () => {
  app.dispose();
});
