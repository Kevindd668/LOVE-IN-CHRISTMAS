import * as THREE from 'three';
import { PHOTO_TRACKS } from '../config';
import { damp, lerp } from '../core/utils';
import type { PhotoCard } from './PhotoCard';

interface OrbitItem {
  card: PhotoCard;
  track: number;
  side: -1 | 1;
  slot: number;
  sideTotal: number;
  height: number;
  heightTarget: number;
  phase: number;
  currentPosition: THREE.Vector3;
  initialised: boolean;
}

export interface PhotoOrbitSettings {
  photoSpeed: number;
  photoRadius: number;
  photosPaused: boolean;
}

const TRACK_CAPS = [4, 6, 8];
const TRACK_WEIGHTS = [4, 6, 8];

/**
 * Distributes cards over the three rings.
 * Up to 4: one inner ring. 5–18: proportional 4:6:8. 19–24: outer capacity
 * expands to 10 so the three-layer structure is preserved (6/8/10).
 */
export function allocatePhotoTracks(count: number): [number, number, number] {
  // The showcase displays six cards: one left and one right on each ring.
  if (count === 6) return [2, 2, 2];
  if (count <= 4) return [Math.max(0, count), 0, 0];
  if (count >= 19) return [6, 8, Math.max(0, count - 14)];
  const totalWeight = TRACK_WEIGHTS.reduce((sum, value) => sum + value, 0);
  const raw = TRACK_WEIGHTS.map((weight) => (count * weight) / totalWeight);
  const result = raw.map((value) => Math.floor(value));
  let remainder = count - result.reduce((sum, value) => sum + value, 0);
  const fractions = raw
    .map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  let cursor = 0;
  while (remainder > 0) {
    result[fractions[cursor % 3].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  for (let i = 0; i < 3; i += 1) result[i] = Math.min(TRACK_CAPS[i], result[i]);
  return [result[0], result[1], result[2]];
}

export class PhotoOrbit {
  private readonly items = new Map<string, OrbitItem>();
  private readonly tempQuaternion = new THREE.Quaternion();
  private readonly rollQuaternion = new THREE.Quaternion();
  private readonly zAxis = new THREE.Vector3(0, 0, 1);
  private readonly targetPosition = new THREE.Vector3();
  private readonly trackPhases = [0, 0, 0];

  sync(cards: PhotoCard[]): void {
    const nextIds = new Set(cards.map((card) => card.id));
    for (const id of [...this.items.keys()]) {
      if (!nextIds.has(id)) this.items.delete(id);
    }

    const allocation = allocatePhotoTracks(cards.length);
    let cursor = 0;
    for (let track = 0; track < 3; track += 1) {
      const trackCards = cards.slice(cursor, cursor + allocation[track]);
      cursor += allocation[track];
      const trackConfig = PHOTO_TRACKS[track];
      const leftTotal = Math.ceil(trackCards.length / 2);
      const rightTotal = Math.floor(trackCards.length / 2);
      let left = 0;
      let right = 0;

      trackCards.forEach((card, index) => {
        // Alternate left/right. Keeping a clear central corridor prevents
        // photos from covering the tree or intercepting its pick target.
        const side: -1 | 1 = index % 2 === 0 ? -1 : 1;
        const sideIndex = side === -1 ? left++ : right++;
        const sideTotal = side === -1 ? leftTotal : rightTotal;
        const fraction = sideTotal <= 1 ? 0.5 : (sideIndex + 0.5) / sideTotal;
        const heightTarget = lerp(trackConfig.minHeight, trackConfig.maxHeight, fraction);

        let item = this.items.get(card.id);
        if (!item) {
          item = {
            card,
            track,
            side,
            slot: sideIndex,
            sideTotal,
            height: heightTarget,
            heightTarget,
            phase: Math.random() * Math.PI * 2,
            currentPosition: new THREE.Vector3(),
            initialised: false
          };
          this.items.set(card.id, item);
        } else {
          item.card = card;
          item.track = track;
          item.side = side;
          item.slot = sideIndex;
          item.sideTotal = sideTotal;
          item.heightTarget = heightTarget;
        }
      });
    }
  }

  update(
    dt: number,
    time: number,
    camera: THREE.Camera,
    settings: PhotoOrbitSettings
  ): void {
    const cameraAngle = Math.atan2(camera.position.z, camera.position.x);

    for (let track = 0; track < 3; track += 1) {
      if (!settings.photosPaused) {
        this.trackPhases[track] +=
          dt * settings.photoSpeed * Math.abs(PHOTO_TRACKS[track].speed) * 0.42;
      }
    }

    for (const item of this.items.values()) {
      const track = PHOTO_TRACKS[item.track];
      const trackSway = Math.sin(this.trackPhases[item.track]) * 0.12;
      const baseOffset =
        0.58 + ((item.slot + 0.5) / Math.max(1, item.sideTotal)) * 1.28;
      const angle = cameraAngle + item.side * (baseOffset + trackSway);
      const radius = track.radius * settings.photoRadius;
      const bob = Math.sin(time * 0.58 + item.phase) * 0.055;
      this.targetPosition.set(
        Math.cos(angle) * radius,
        item.heightTarget + bob,
        Math.sin(angle) * radius
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
      const roll = Math.sin(time * 0.22 + item.phase) * 0.016;
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
