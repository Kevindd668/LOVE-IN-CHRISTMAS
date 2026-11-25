import * as THREE from 'three';
import { CINEMA_CHAPTERS, CINEMA_DURATION, type WishSettings } from '../config';
import type { CameraManager } from '../core/CameraManager';
import type { Renderer } from '../core/Renderer';
import { clamp, easeInOutCubic, lerp, smoothstep } from '../core/utils';
import type { ChristmasTree } from '../objects/ChristmasTree';
import type { GiftBoxes } from '../objects/GiftBoxes';
import type { RomanticText } from '../objects/RomanticText';
import type { HeartParticles } from '../particles/HeartParticles';
import type { SnowParticles } from '../particles/SnowParticles';
import type { StarParticles } from '../particles/StarParticles';
import type { AuroraEffect } from '../effects/AuroraEffect';
import type { PhotoManager } from '../photos/PhotoManager';
import type { SettingsManager } from '../ui/SettingsManager';

interface CameraFrame {
  t: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const CAMERA_FRAMES: CameraFrame[] = [
  { t: 0, position: new THREE.Vector3(13.4, 9.4, 24), target: new THREE.Vector3(0, 4.6, 0) },
  { t: 5, position: new THREE.Vector3(11.2, 7.5, 20.4), target: new THREE.Vector3(0, 4.3, 0) },
  { t: 10, position: new THREE.Vector3(9.5, 6.3, 17.6), target: new THREE.Vector3(0, 4.15, 0) },
  { t: 15, position: new THREE.Vector3(7.7, 5.7, 15.4), target: new THREE.Vector3(0, 4.85, 0) },
  { t: 20, position: new THREE.Vector3(6.9, 5.25, 14.4), target: new THREE.Vector3(0, 4.5, 0) },
  { t: 25, position: new THREE.Vector3(9.8, 5.9, 17.3), target: new THREE.Vector3(0, 4.15, 0) },
  { t: 32, position: new THREE.Vector3(8.5, 5.5, 15.8), target: new THREE.Vector3(0, 4.15, 0) },
  { t: 38, position: new THREE.Vector3(7.2, 4.9, 13), target: new THREE.Vector3(0, 4.1, 0) },
  { t: 45, position: new THREE.Vector3(5.7, 4.4, 10.6), target: new THREE.Vector3(0, 4.15, 0) }
];

const ASSEMBLY_VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  uniform float uProgress;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 target = position;
    float ease = smoothstep(0.0, 1.0, uProgress);
    vec3 mixed = mix(aStart, target, ease);
    float swirl = (1.0 - ease) * 0.65;
    mixed.x += sin(uTime * 0.9 + aPhase) * swirl;
    mixed.z += cos(uTime * 0.7 + aPhase) * swirl;
    mixed.y += sin(uTime * 1.2 + aPhase * 1.7) * swirl * 0.6;

    vec4 mvPosition = modelViewMatrix * vec4(mixed, 1.0);
    gl_PointSize = clamp(aSize * uPixelRatio * (170.0 / max(1.0, -mvPosition.z)), 0.0, 16.0);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    vAlpha = uOpacity * (0.55 + ease * 0.45);
  }
`;

const ASSEMBLY_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = length(p);
    if (d > 1.0) discard;
    float core = 1.0 - smoothstep(0.0, 0.22, d);
    float halo = 1.0 - smoothstep(0.15, 1.0, d);
    vec3 color = vColor * (halo * 0.55 + core * 1.35);
    gl_FragColor = vec4(color, (halo * 0.24 + core * 0.7) * vAlpha);
  }
`;

export interface DemoCallbacks {
  onEnter: () => void;
  onExit: () => void;
  onChapter: (act: string, line: string) => void;
  onProgress: (elapsed: number, duration: number) => void;
  onPause: (paused: boolean) => void;
  onEnding: () => void;
}

interface DemoDependencies {
  scene: THREE.Scene;
  camera: CameraManager;
  renderer: Renderer;
  tree: ChristmasTree;
  numbers: RomanticText;
  photos: PhotoManager;
  hearts: HeartParticles;
  snow: SnowParticles;
  stars: StarParticles;
  aurora: AuroraEffect;
  gifts: GiftBoxes;
  settings: SettingsManager;
  callbacks: DemoCallbacks;
}

export class DemoController {
  private readonly deps: DemoDependencies;
  private elapsed = 0;
  private active = false;
  private paused = false;
  private finished = false;
  private endingVisible = false;
  private lastChapter = -1;
  private assembly: {
    points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    geometry: THREE.BufferGeometry;
  } | null = null;
  private currentExposure = 1.08;
  private readonly tempPosition = new THREE.Vector3();
  private readonly tempTarget = new THREE.Vector3();

  constructor(dependencies: DemoDependencies) {
    this.deps = dependencies;
  }

  get isActive(): boolean {
    return this.active;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.paused = false;
    this.finished = false;
    this.endingVisible = false;
    this.elapsed = 0;
    this.lastChapter = -1;

    const { camera, renderer, callbacks } = this.deps;
    camera.beginCinematic();
    this.prepareScene();
    renderer.setExposure(0.68);
    callbacks.onEnter();
    callbacks.onPause(false);
    this.advanceChapter(0);
    callbacks.onProgress(0, CINEMA_DURATION);
  }

  restart(): void {
    if (!this.active) {
      this.start();
      return;
    }
    this.paused = false;
    this.finished = false;
    this.endingVisible = false;
    this.elapsed = 0;
    this.lastChapter = -1;
    this.prepareScene();
    this.deps.camera.beginCinematic();
    this.deps.renderer.setExposure(0.68);
    this.deps.callbacks.onEnter();
    this.deps.callbacks.onPause(false);
    this.advanceChapter(0);
    this.deps.callbacks.onProgress(0, CINEMA_DURATION);
  }

  pause(): void {
    if (!this.active || this.paused || this.finished) return;
    this.paused = true;
    this.deps.callbacks.onPause(true);
  }

  resume(): void {
    if (!this.active || !this.paused) return;
    this.paused = false;
    this.deps.callbacks.onPause(false);
  }

  togglePause(): void {
    if (this.paused) this.resume();
    else this.pause();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.paused = false;
    this.finished = false;
    this.assembly?.points.removeFromParent();
    if (this.assembly) this.assembly.points.visible = false;
    this.deps.callbacks.onExit();
  }

  private prepareScene(): void {
    const { tree, numbers, photos, hearts, snow, stars, aurora, gifts, settings } = this.deps;
    const current = settings.current;

    tree.setBodyVisible(false);
    tree.setBodyReveal(0);
    tree.setStarVisible(false);
    tree.star.root.scale.setScalar(0.01);
    tree.setLightsEnabled(false);
    tree.setLightsReveal(0);

    numbers.setAllReveal(0);
    photos.setReveal(0);

    hearts.setEnabled(false);
    hearts.setOpacity(0);
    hearts.setMode(current.heartMode);
    hearts.setLayout(current.treeHeight);

    snow.setOpacity(0);
    stars.setOpacity(0);
    aurora.setOpacity(0);

    gifts.group.visible = false;
    gifts.setCelebration(0);
    gifts.closeAll();

    this.createAssembly();
    this.heartStartedThisRun = false;
  }

  private heartStartedThisRun = false;

  private createAssembly(): void {
    if (this.assembly) {
      this.assembly.points.removeFromParent();
      this.assembly.geometry.dispose();
      this.assembly.material.dispose();
      this.assembly = null;
    }
    const current = this.deps.settings.current;
    const height = current.treeHeight;
    const crown = current.crownRadius;
    const count = 1150;
    const positions = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const green = new THREE.Color('#67B789');
    const gold = new THREE.Color('#E8C88E');
    const ivory = new THREE.Color('#F0E8D4');
    const rng = (() => {
      let seed = 97125;
      return (): number => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();

    for (let i = 0; i < count; i += 1) {
      const h = Math.pow(rng(), 0.86);
      const angle = rng() * Math.PI * 2;
      const radial = crown * (1 - h) * (0.25 + rng() * 0.8);
      positions[i * 3] = Math.cos(angle) * radial;
      positions[i * 3 + 1] = height * 0.12 + h * height * 0.82;
      positions[i * 3 + 2] = Math.sin(angle) * radial;

      const startAngle = rng() * Math.PI * 2;
      const startRadius = 7 + rng() * 9;
      starts[i * 3] = Math.cos(startAngle) * startRadius;
      starts[i * 3 + 1] = 0.5 + rng() * (height + 4);
      starts[i * 3 + 2] = Math.sin(startAngle) * startRadius;

      const choice = rng();
      const color = choice > 0.36 ? green : choice > 0.14 ? gold : ivory;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = 0.8 + rng() * 2.2;
      phases[i] = rng() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, height / 2, 0), 30);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: ASSEMBLY_VERTEX,
      fragmentShader: ASSEMBLY_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 5;
    points.visible = false;
    this.deps.scene.add(points);
    this.assembly = { points, material, geometry };
  }

  private advanceChapter(index: number): void {
    if (index === this.lastChapter) return;
    const chapter = CINEMA_CHAPTERS[index];
    if (!chapter) return;
    this.lastChapter = index;
    this.deps.callbacks.onChapter(chapter.act, chapter.line);
  }

  private updateCamera(time: number): void {
    let from = CAMERA_FRAMES[0];
    let to = CAMERA_FRAMES[CAMERA_FRAMES.length - 1];
    for (let i = 0; i < CAMERA_FRAMES.length - 1; i += 1) {
      if (time >= CAMERA_FRAMES[i].t && time <= CAMERA_FRAMES[i + 1].t) {
        from = CAMERA_FRAMES[i];
        to = CAMERA_FRAMES[i + 1];
        break;
      }
    }
    const progress = clamp((time - from.t) / Math.max(0.001, to.t - from.t), 0, 1);
    const eased = easeInOutCubic(progress);
    this.tempPosition.lerpVectors(from.position, to.position, eased);
    this.tempTarget.lerpVectors(from.target, to.target, eased);
    const drift = Math.sin(time * 0.19) * 0.36;
    this.tempPosition.x += drift;
    this.tempPosition.y += Math.sin(time * 0.24) * 0.12;
    this.deps.camera.setCinematicPose(this.tempPosition, this.tempTarget);
  }

  update(dt: number): void {
    if (!this.active) return;
    if (!this.paused && !this.finished) {
      this.elapsed = Math.min(CINEMA_DURATION, this.elapsed + dt);
    }
    const time = this.elapsed;
    const {
      tree,
      numbers,
      photos,
      hearts,
      snow,
      stars,
      aurora,
      gifts,
      settings,
      renderer,
      callbacks
    } = this.deps;
    const current = settings.current;

    // Camera, exposure, sky, weather.
    this.updateCamera(time);
    const targetExposure = time < 4 ? lerp(0.68, 0.96, clamp(time / 4, 0, 1)) : lerp(0.96, 1.08, clamp((time - 4) / 7, 0, 1));
    this.currentExposure += (targetExposure - this.currentExposure) * Math.min(1, dt * 1.8);
    renderer.setExposure(this.currentExposure);
    stars.setOpacity(smoothstep(0, 3.8, time));
    snow.setOpacity(smoothstep(0.8, 4.8, time));
    aurora.setOpacity(smoothstep(0, 7, time) * 0.65);

    // First chapter: tree assembles from a constellation of particles.
    if (time >= 5) {
      const reveal = clamp((time - 5) / 4.3, 0, 1);
      tree.setBodyVisible(true);
      tree.setBodyReveal(easeInOutCubic(reveal));
    } else {
      tree.setBodyVisible(false);
    }

    if (this.assembly) {
      const assembleProgress = clamp((time - 4.8) / 4.8, 0, 1);
      const opacity =
        smoothstep(4.8, 5.6, time) * (1 - smoothstep(9.2, 10.4, time));
      this.assembly.points.visible = time >= 4.6 && time <= 10.5;
      this.assembly.material.uniforms.uProgress.value = easeInOutCubic(assembleProgress);
      this.assembly.material.uniforms.uOpacity.value = opacity;
      this.assembly.material.uniforms.uTime.value = time;
      this.assembly.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }

    // Lights climb up the tree.
    if (time >= 10) {
      tree.lights.group.visible = true;
      tree.lights.setEnabled(true);
      tree.setLightsReveal(clamp((time - 10) / 3.8, 0, 1));
    } else {
      tree.lights.group.visible = false;
    }

    if (time >= 13.4) {
      tree.setStarVisible(true);
      const starProgress = clamp((time - 13.4) / 1.1, 0, 1);
      const scale = 0.01 + easeInOutCubic(starProgress) * 0.99;
      tree.star.root.scale.setScalar(scale);
      if (starProgress > 0.92 && starProgress < 1.01) tree.flashStar();
    } else {
      tree.setStarVisible(false);
    }

    numbers.setReveal('a', clamp((time - 15) / 2.8, 0, 1));
    numbers.setReveal('b', clamp((time - 20) / 2.8, 0, 1));

    if (time >= 25) {
      photos.setReveal(clamp((time - 25) / 5.2, 0, 1));
    } else {
      photos.setReveal(0);
    }

    if (time >= 29) {
      gifts.group.visible = true;
      const giftGlow = clamp((time - 38) / 2.5, 0, 1);
      gifts.setCelebration(giftGlow);
    } else {
      gifts.group.visible = false;
    }

    if (time >= 32) {
      hearts.setOpacity(1);
      if (!this.heartStartedThisRun) {
        this.heartStartedThisRun = true;
        hearts.setEnabled(true);
        hearts.setMode('gather');
      }
    } else {
      hearts.setOpacity(0);
    }

    snow.setSpeed(current.snowSpeed * (time >= 38 ? 0.48 : 1));

    const chapterIndex = CINEMA_CHAPTERS.reduce(
      (activeIndex, chapter, index) => (time >= chapter.time ? index : activeIndex),
      0
    );
    this.advanceChapter(chapterIndex);

    if (time >= 40.5 && !this.endingVisible) {
      this.endingVisible = true;
      callbacks.onEnding();
    }
    if (this.endingVisible) {
      numbers.setAllReveal(0);
    }

    callbacks.onProgress(time, CINEMA_DURATION);
    if (time >= CINEMA_DURATION) {
      this.finished = true;
      tree.lights.setEnabled(true);
    }
  }

  dispose(): void {
    if (this.assembly) {
      this.assembly.points.removeFromParent();
      this.assembly.geometry.dispose();
      this.assembly.material.dispose();
      this.assembly = null;
    }
  }
}
