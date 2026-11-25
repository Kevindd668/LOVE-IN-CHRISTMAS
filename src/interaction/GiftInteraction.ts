import * as THREE from 'three';
import type { GiftBoxes } from '../objects/GiftBoxes';
import type { MagicParticles } from '../particles/MagicParticles';

export interface GiftOpenResult {
  index: number;
  label: string;
  message: string;
  center: THREE.Vector3;
}

interface GiftInteractionOptions {
  gifts: GiftBoxes;
  magic: MagicParticles;
  camera: THREE.Camera;
  messages: () => string[];
  onOpen: (result: GiftOpenResult) => void;
}

export class GiftInteraction {
  private readonly options: GiftInteractionOptions;
  private lastOpenAt = 0;

  constructor(options: GiftInteractionOptions) {
    this.options = options;
  }

  handle(index: number): GiftOpenResult | null {
    const now = performance.now();
    if (now - this.lastOpenAt < 320) return null;
    this.lastOpenAt = now;

    const state = this.options.gifts.open(index);
    if (!state) return null;
    const messages = this.options.messages();
    const message = messages[index] ?? messages[messages.length - 1] ?? '圣诞快乐。';
    const center = this.options.gifts.getGiftPosition(index);
    this.options.magic.heartBurst(center.clone().add(new THREE.Vector3(0, 0.25, 0)), '#FF9DB4', 58);
    this.options.magic.burst(center.clone().add(new THREE.Vector3(0, 0.55, 0)), {
      count: 34,
      colors: ['#FFD99A', '#FFF3CE', '#FFC374'],
      speed: 0.85,
      spread: 0.7,
      upward: 0.65,
      gravity: -0.2,
      life: 1.9,
      size: 0.9
    });
    this.options.magic.ripple(center, '#FFD08A', this.options.camera);

    const result: GiftOpenResult = {
      index,
      label: state.label,
      message,
      center
    };
    this.options.onOpen(result);
    return result;
  }
}
