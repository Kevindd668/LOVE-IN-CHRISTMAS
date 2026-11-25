import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp, damp, easeInOutCubic, easeOutCubic } from './utils';

interface CameraTween {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
  resumeControls: boolean;
  onComplete?: () => void;
}

export class CameraManager {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private tween: CameraTween | null = null;
  private introElapsed = 0;
  private introActive = false;
  private introFrom = new THREE.Vector3();
  private introTarget = new THREE.Vector3();
  private cinematic = false;
  private subjectHeight = 8;
  private readonly homePosition = new THREE.Vector3();
  private readonly homeTarget = new THREE.Vector3(0, 3.9, 0);

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const aspect = width / Math.max(1, height);
    this.camera = new THREE.PerspectiveCamera(aspect < 1 ? 45 : 39, aspect, 0.1, 220);
    this.camera.position.set(8.8, 6.2, 16.2);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(this.homeTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.052;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.72;
    this.controls.minDistance = aspect < 1 ? 14 : 8.5;
    this.controls.maxDistance = aspect < 1 ? 38 : 30;
    this.controls.minPolarAngle = 0.78;
    this.controls.maxPolarAngle = Math.PI * 0.505;
    this.controls.update();

    this.applyHomeFraming(aspect, true);
  }

  private applyHomeFraming(aspect: number, instant = false): void {
    let position: THREE.Vector3;
    let target: THREE.Vector3;
    let fov: number;

    // F3's 9.5m tree + crystal heart needs a slightly higher/farther home
    // framing than the original 8m tree. The extra distance is tiny, but it
    // prevents the topper from being cropped on 16:9 screens.
    const extraHeight = Math.max(0, this.subjectHeight - 8);
    if (aspect < 0.72) {
      position = new THREE.Vector3(10.4, 7.8 + extraHeight * 0.2, 26.4 + extraHeight * 0.9);
      target = new THREE.Vector3(0, 4.35 + extraHeight * 0.3, 0);
      fov = 45;
    } else if (aspect < 1.15) {
      position = new THREE.Vector3(10.2, 6.8 + extraHeight * 0.2, 19.2 + extraHeight * 0.85);
      target = new THREE.Vector3(0, 4.1 + extraHeight * 0.3, 0);
      fov = 43;
    } else {
      position = new THREE.Vector3(8.8, 6.2 + extraHeight * 0.2, 16.2 + extraHeight * 0.85);
      target = new THREE.Vector3(0, 3.9 + extraHeight * 0.3, 0);
      fov = 41;
    }

    this.homePosition.copy(position);
    this.homeTarget.copy(target);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    if (instant) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  playIntro(): void {
    this.introActive = true;
    this.introElapsed = 0;
    this.introFrom.copy(this.camera.position).multiplyScalar(1.32);
    this.introFrom.y += 2.4;
    this.introFrom.x -= 1.8;
    this.introTarget.copy(this.controls.target);
    this.camera.position.copy(this.introFrom);
    this.controls.enabled = false;
  }

  resetView(instant = false): void {
    const aspect = this.camera.aspect;
    this.applyHomeFraming(aspect, false);
    const destination = this.homePosition.clone();
    const target = this.homeTarget.clone();
    if (instant) {
      this.camera.position.copy(destination);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.cinematic = false;
    this.animateTo(destination, target, 1.5, true);
  }

  /** Slowly nudges the orbit focus when the user makes the tree taller. */
  setSubjectHeight(height: number): void {
    this.subjectHeight = height;
    // Recompute the home pose only; the user's current orbit is left intact.
    this.applyHomeFraming(this.camera.aspect, false);
  }

  setSize(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    const previous = this.camera.aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    if ((previous < 1) !== (aspect < 1)) {
      this.applyHomeFraming(aspect, false);
    }
  }

  update(dt: number): void {
    if (this.introActive) {
      this.introElapsed += dt;
      const t = clamp(this.introElapsed / 3.8, 0, 1);
      const eased = easeOutCubic(t);
      this.camera.position.lerpVectors(this.introFrom, this.homePosition, eased);
      this.controls.target.lerpVectors(this.introTarget, this.homeTarget, eased);
      this.camera.lookAt(this.controls.target);
      if (t >= 1) {
        this.introActive = false;
        this.controls.enabled = true;
        this.controls.target.copy(this.homeTarget);
      }
      return;
    }

    if (this.tween) {
      this.tween.elapsed += dt;
      const t = clamp(this.tween.elapsed / this.tween.duration, 0, 1);
      const eased = easeInOutCubic(t);
      this.camera.position.lerpVectors(this.tween.fromPosition, this.tween.toPosition, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased);
      this.camera.lookAt(this.controls.target);

      if (t >= 1) {
        const completed = this.tween;
        this.tween = null;
        if (completed.resumeControls) {
          this.cinematic = false;
          this.controls.enabled = true;
          this.controls.update();
        }
        completed.onComplete?.();
      }
      return;
    }

    if (!this.cinematic) {
      this.controls.update();
      const desiredTargetY = this.subjectHeight * 0.49;
      if (this.controls.enabled && Math.abs(this.controls.target.y - desiredTargetY) > 0.32) {
        this.controls.target.y = damp(this.controls.target.y, desiredTargetY, 2.2, dt);
      }
    }
  }

  beginCinematic(): void {
    this.introActive = false;
    this.tween = null;
    this.cinematic = true;
    this.controls.enabled = false;
  }

  setCinematicPose(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.camera.lookAt(target);
  }

  animateTo(
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration: number,
    resumeControls: boolean,
    onComplete?: () => void
  ): void {
    this.tween = {
      fromPosition: this.camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      elapsed: 0,
      duration,
      resumeControls,
      onComplete
    };
    this.controls.enabled = false;
  }

  flyTo(position: THREE.Vector3, target: THREE.Vector3, duration: number, onComplete?: () => void): void {
    this.animateTo(position, target, duration, true, onComplete);
  }

  endCinematic(): void {
    this.cinematic = false;
    this.controls.enabled = true;
    this.controls.update();
  }

  get isCinematic(): boolean {
    return this.cinematic;
  }

  getHomePosition(): THREE.Vector3 {
    return this.homePosition.clone();
  }

  getHomeTarget(): THREE.Vector3 {
    return this.homeTarget.clone();
  }
}
