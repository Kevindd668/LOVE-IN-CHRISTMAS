import * as THREE from 'three';
import { PHOTO_TRACKS } from '../config';
import { damp, lerp } from '../core/utils';
import type { PhotoCard } from './PhotoCard';

interface OrbitItem {
  card: PhotoCard;
  track: number;
  angle: number;
  height: number;
  heightTarget: number;
  phase: number;
  side: -1 | 1;
  relativeBase: number;
  motionTime: number;
  initialised: boolean;
  currentPosition: THREE.Vector3;
}

export interface PhotoOrbitSettings {
  photoSpeed: number;
  photoRadius: number;
  photosPaused: boolean;
}

export class PhotoOrbit {
  private readonly items = new Map<string, OrbitItem>();
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly rollQuaternion = new THREE.Quaternion();
  private readonly zAxis = new THREE.Vector3(0, 0, 1);
  private readonly targetPosition = new THREE.Vector3();

  sync(cards: PhotoCard[]): void {
    const totals = [0, 0, 0];
    let leftCount = 0;
    let rightCount = 0;
    cards.forEach((_, index) => {
      totals[index % 3] += 1;
      if (index % 2 === 0) leftCount += 1;
      else rightCount += 1;
    });
    const nextIds = new Set(cards.map((card) => card.id));

    for (const id of [...this.items.keys()]) {
      if (!nextIds.has(id)) this.items.delete(id);
    }

    const cursors = [0, 0, 0];
    const sideCursors = { left: 0, right: 0 };
    cards.forEach((card, index) => {
      const track = index % 3;
      const slot = cursors[track];
      cursors[track] += 1;
      const side: -1 | 1 = index % 2 === 0 ? -1 : 1;
      const sideIndex = side === -1 ? sideCursors.left++ : sideCursors.right++;
      const sideTotal = side === -1 ? leftCount : rightCount;
      const trackConfig = PHOTO_TRACKS[track];
      const heightPatterns = [
        [0.12, 0.55, 0.86, 0.32, 0.68, 0.96, 0.4, 0.74],
        [0.7, 0.26, 0.57, 0.9, 0.38, 0.8, 0.1, 0.48],
        [0.36, 0.76, 0.14, 0.6, 0.95, 0.44, 0.82, 0.24]
      ];
      const fraction =
        totals[track] <= 1
          ? 0.5
          : heightPatterns[track][slot % heightPatterns[track].length];
      const targetHeight = lerp(trackConfig.minHeight, trackConfig.maxHeight, fraction);
      const relativeBase =
        0.98 + (sideIndex / Math.max(1, sideTotal - 1)) * (sideTotal <= 2 ? 1.02 : 1.25);
      let item = this.items.get(card.id);
      if (!item) {
        item = {
          card,
          track,
          angle: 0,
          height: targetHeight,
          heightTarget: targetHeight,
          phase: Math.random() * Math.PI * 2,
          side,
          relativeBase,
          motionTime: Math.random() * 20,
          initialised: false,
          currentPosition: new THREE.Vector3()
        };
        this.items.set(card.id, item);
      } else {
        item.card = card;
        item.track = track;
        item.heightTarget = targetHeight;
        item.side = side;
        item.relativeBase = relativeBase;
      }
    });

  }

  update(
    dt: number,
    time: number,
    camera: THREE.Camera,
    settings: PhotoOrbitSettings
  ): void {
    const cameraAngle = Math.atan2(camera.position.z, camera.position.x);
    for (const item of this.items.values()) {
      const track = PHOTO_TRACKS[item.track];
      if (!settings.photosPaused) {
        item.motionTime +=
          dt * settings.photoSpeed * (0.45 + Math.abs(track.speed) * 4.2);
      }
      const sway =
        Math.sin(item.motionTime * (0.82 + Math.abs(track.speed)) + item.phase) * 0.18 +
        Math.sin(item.motionTime * 0.31 + item.phase * 1.9) * 0.06;
      item.angle = cameraAngle + item.side * (item.relativeBase + sway);

      const radius = track.radius * settings.photoRadius;
      const bob = Math.sin(time * 0.58 + item.phase) * 0.065;
      this.targetPosition.set(
        Math.cos(item.angle) * radius,
        item.heightTarget + bob,
        Math.sin(item.angle) * radius
      );

      if (!item.initialised) {
        item.currentPosition.copy(this.targetPosition);
        item.initialised = true;
      } else {
        const lambda = 3.1;
        item.currentPosition.x = damp(item.currentPosition.x, this.targetPosition.x, lambda, dt);
        item.currentPosition.y = damp(item.currentPosition.y, this.targetPosition.y, lambda, dt);
        item.currentPosition.z = damp(item.currentPosition.z, this.targetPosition.z, lambda, dt);
      }
      item.height = damp(item.height, item.heightTarget, 2.4, dt);
      item.card.group.position.copy(item.currentPosition);

      const targetQuaternion = this.tempQuaternion.copy(camera.quaternion);
      const roll = Math.sin(time * 0.22 + item.phase) * 0.018 + Math.sin(item.phase) * 0.012;
      this.rollQuaternion.setFromAxisAngle(this.zAxis, roll);
      targetQuaternion.multiply(this.rollQuaternion);
      const blend = item.initialised ? 1 - Math.exp(-7 * dt) : 1;
      item.card.group.quaternion.slerp(targetQuaternion, blend);
    }
  }

  getTrack(id: string): number {
    return this.items.get(id)?.track ?? 0;
  }
}
