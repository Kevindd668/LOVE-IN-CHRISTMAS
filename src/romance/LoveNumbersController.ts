import { damp, clamp } from '../core/utils';
import type { RomanticText } from '../objects/RomanticText';
import type { ParticleLoveText } from './ParticleLoveText';

export type LoveNumbersMode = 'idle' | 'alternate' | 'love' | 'finale';

/**
 * Drives the existing 3D 520 / 1314 labels. No second type system is created;
 * this controller only changes reveal timing and a restrained pulse.
 */
export class LoveNumbersController {
  private readonly numbers: RomanticText;
  private mode: LoveNumbersMode = 'idle';
  private elapsed = 0;
  private pulseTime = 0;
  private currentScale = 1;
  private readonly baseScale: number;
  private readonly particle: ParticleLoveText | null;
  private lastSwap = 0;

  constructor(numbers: RomanticText, particle: ParticleLoveText | null = null) {
    this.numbers = numbers;
    this.particle = particle;
    this.baseScale = numbers.group.scale.x;
  }

  setMode(mode: LoveNumbersMode): void {
    this.mode = mode;
    this.elapsed = 0;
    this.lastSwap = 0;
    if (mode === 'idle') {
      this.particle?.setVisible(false);
      this.numbers.setAllReveal(1);
      return;
    }
    if (this.particle) {
      this.numbers.setAllReveal(0);
      this.particle.setVisible(true);
      this.particle.setLabel(mode === 'alternate' ? '520' : '520 ♡ 1314');
    }
  }

  pulse(): void {
    this.pulseTime = 0.65;
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.pulseTime = Math.max(0, this.pulseTime - dt);
    this.particle?.update(this.elapsed);
    let scale = 1;
    if (this.mode === 'alternate') {
      if (this.particle && this.elapsed - this.lastSwap > 3.2) {
        this.lastSwap = this.elapsed;
        this.particle.setLabel(this.particle.currentLabel === '520' ? '1314' : '520');
      }
      if (!this.particle) {
        const phase = Math.sin(this.elapsed * 0.9);
        this.numbers.setReveal('a', phase > -0.2 ? 1 : 0.32);
        this.numbers.setReveal('b', phase < 0.2 ? 1 : 0.32);
      }
      scale = 1 + Math.sin(this.elapsed * 1.1) * 0.012;
    } else if (this.mode === 'love' || this.mode === 'finale') {
      if (!this.particle) this.numbers.setAllReveal(1);
      scale = 1 + Math.sin(this.elapsed * 1.2) * 0.018;
    }
    if (this.pulseTime > 0) {
      scale += Math.sin((1 - this.pulseTime / 0.65) * Math.PI) * 0.045;
    }
    this.currentScale = damp(this.currentScale, scale, 5, dt);
    // The labels were already scaled by the WP5 composition. Apply only the
    // relative pulse, preserving the 1.24 presentation scale.
    this.numbers.group.scale.setScalar(this.baseScale * clamp(this.currentScale, 0.94, 1.08));
  }

  get currentMode(): LoveNumbersMode {
    return this.mode;
  }
}
