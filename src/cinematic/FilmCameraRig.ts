import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
import { smoothstep } from '../core/utils';

export type FilmShotKind =
  | 'dolly-in'
  | 'dolly-out'
  | 'orbit'
  | 'crane-up'
  | 'fly-through'
  | 'focus-pull';

export interface FilmShot {
  kind: FilmShotKind;
  start: number;
  end: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromFov: number;
  toFov: number;
}

const makeShot = (
  kind: FilmShotKind,
  start: number,
  end: number,
  from: [number, number, number],
  to: [number, number, number],
  fromTarget: [number, number, number],
  toTarget: [number, number, number],
  fromFov = 43,
  toFov = 43
): FilmShot => ({
  kind,
  start,
  end,
  from: new THREE.Vector3(...from),
  to: new THREE.Vector3(...to),
  fromTarget: new THREE.Vector3(...fromTarget),
  toTarget: new THREE.Vector3(...toTarget),
  fromFov,
  toFov
});

/**
 * Builds the six camera languages for the 60 second story. The intro keeps
 * its own established 0-8s frames; this rig starts at the handoff pose.
 */
export const buildFilmShots = (
  heartTarget: THREE.Vector3,
  photoPositions: THREE.Vector3[]
): FilmShot[] => {
  const treeTarget: [number, number, number] = [0, 4.7, 0];
  const treeCrown: [number, number, number] = [0, 8.6, 0];
  const heart: [number, number, number] = [heartTarget.x, heartTarget.y, heartTarget.z];
  const heartFrom: [number, number, number] = [
    heartTarget.x + 7,
    heartTarget.y + 2,
    heartTarget.z + 14
  ];
  const heartOrbit: [number, number, number] = [
    heartTarget.x + 9,
    heartTarget.y + 3,
    heartTarget.z + 11
  ];
  const heartOut: [number, number, number] = [
    heartTarget.x + 6,
    heartTarget.y + 2,
    heartTarget.z + 17
  ];
  const photos =
    photoPositions.length > 0
      ? photoPositions
      : [
          new THREE.Vector3(5.8, 4.8, 1.2),
          new THREE.Vector3(-5.4, 4.2, 1.6),
          new THREE.Vector3(7.2, 3.8, -1.2)
        ];
  const photoCamera = (index: number): [number, number, number] => {
    const point = photos[Math.min(index, photos.length - 1)];
    return [point.x, point.y + 1.0, point.z + 5.2];
  };
  const photoTarget = (index: number): [number, number, number] => {
    const point = photos[Math.min(index, photos.length - 1)];
    return [point.x, point.y, point.z];
  };

  return [
    makeShot(
      'dolly-in',
      8,
      11,
      [2.4, 2.2, 15.8],
      [7, 6, 22],
      [0, 3.4, 0],
      treeTarget
    ),
    makeShot(
      'orbit',
      11,
      14,
      [7, 6, 22],
      [11, 7, 20],
      treeTarget,
      treeTarget
    ),
    makeShot(
      'crane-up',
      14,
      16,
      [11, 7, 20],
      [8, 12, 19],
      treeTarget,
      [0, 5.7, 0]
    ),
    makeShot(
      'focus-pull',
      16,
      18,
      [8, 12, 19],
      [6, 7, 16],
      treeCrown,
      treeTarget
    ),
    makeShot(
      'dolly-in',
      18,
      22,
      [6, 7, 16],
      heartFrom,
      treeTarget,
      heart,
      43,
      40
    ),
    makeShot(
      'orbit',
      22,
      25,
      heartFrom,
      heartOrbit,
      heart,
      heart,
      40,
      40
    ),
    makeShot(
      'dolly-out',
      25,
      27,
      heartOrbit,
      heartOut,
      heart,
      heart,
      40,
      43
    ),
    makeShot(
      'focus-pull',
      27,
      30,
      heartOut,
      [6, 6, 16],
      heart,
      treeTarget
    ),
    makeShot(
      'focus-pull',
      30,
      34,
      [5.8, 6.2, 14],
      photoCamera(0),
      treeTarget,
      photoTarget(0),
      43,
      40
    ),
    makeShot(
      'orbit',
      34,
      38,
      photoCamera(0),
      photoCamera(1),
      photoTarget(0),
      photoTarget(1),
      40,
      40
    ),
    makeShot(
      'focus-pull',
      38,
      42,
      photoCamera(1),
      photoCamera(2),
      photoTarget(1),
      photoTarget(2),
      40,
      43
    ),
    makeShot(
      'crane-up',
      42,
      47,
      [5.8, 6.2, 14],
      [5, 11, 16],
      treeTarget,
      [0, 5.6, 0]
    ),
    makeShot(
      'fly-through',
      47,
      50,
      [10, 8, 18],
      [-6, 5, 10],
      [0, 5.2, 0],
      [0, 4.5, 0],
      43,
      40
    ),
    makeShot(
      'dolly-out',
      50,
      52,
      [-6, 5, 10],
      [7, 5.5, 15],
      [0, 4.5, 0],
      treeTarget,
      40,
      43
    ),
    makeShot(
      'orbit',
      52,
      57,
      [7, 5.5, 15],
      [10, 7, 18],
      treeTarget,
      [0, 4.8, 0]
    ),
    makeShot(
      'dolly-out',
      57,
      62,
      [10, 7, 18],
      [12, 9, 25],
      [0, 4.8, 0],
      [0, 4.5, 0]
    ),
    makeShot(
      'focus-pull',
      62,
      65,
      [12, 9, 25],
      [8, 6, 16],
      [0, 4.5, 0],
      [0, 5, 0]
    ),
    makeShot(
      'dolly-in',
      65,
      68,
      [8, 6, 16],
      [5.5, 5.2, 12],
      [0, 5, 0],
      [0, 4.8, 0]
    )
  ];
};

export class FilmCameraRig {
  private readonly camera: CameraManager;
  private shots: FilmShot[] = [];
  private readonly position = new THREE.Vector3();
  private readonly target = new THREE.Vector3();

  constructor(camera: CameraManager) {
    this.camera = camera;
  }

  begin(): void {
    this.camera.beginCinematic();
  }

  setShots(shots: FilmShot[]): void {
    this.shots = shots;
  }

  update(time: number): void {
    if (this.shots.length === 0) return;
    let shot = this.shots[0];
    for (let i = 0; i < this.shots.length; i += 1) {
      if (time >= this.shots[i].start) shot = this.shots[i];
    }
    const span = Math.max(0.001, shot.end - shot.start);
    const raw = Math.min(1, Math.max(0, (time - shot.start) / span));
    const easing =
      shot.kind === 'focus-pull'
        ? raw * raw * (3 - 2 * raw)
        : smoothstep(0, 1, raw);
    this.position.lerpVectors(shot.from, shot.to, easing);
    this.target.lerpVectors(shot.fromTarget, shot.toTarget, easing);
    const fov = THREE.MathUtils.lerp(shot.fromFov, shot.toFov, easing);
    if (Math.abs(this.camera.camera.fov - fov) > 0.001) {
      this.camera.camera.fov = fov;
      this.camera.camera.updateProjectionMatrix();
    }
    this.camera.setCinematicPose(this.position, this.target);
  }

  get currentShot(): FilmShot | null {
    return this.shots.length > 0 ? this.shots[this.shots.length - 1] : null;
  }

  dispose(): void {
    this.shots = [];
  }
}
