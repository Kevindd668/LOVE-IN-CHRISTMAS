import type { HeartParticleSystem } from '../particles/HeartParticleSystem';
import type { RomanceContentStore } from './RomanceContentStore';
import type { LoveNumbersController } from './LoveNumbersController';
import type { RomanceStateManager } from './RomanceStateManager';
import type { StoryOverlay } from '../ui/StoryOverlay';

interface HeartInteractionOptions {
  heart: HeartParticleSystem;
  numbers: LoveNumbersController;
  content: RomanceContentStore;
  state: RomanceStateManager;
  overlay: StoryOverlay;
}

const DOUBLE_CLICK_WINDOW = 360;

export class HeartInteraction {
  private readonly heart: HeartParticleSystem;
  private readonly numbers: LoveNumbersController;
  private readonly content: RomanceContentStore;
  private readonly state: RomanceStateManager;
  private readonly overlay: StoryOverlay;
  private lastClickAt = 0;
  private clickTimer = 0;
  private promiseOpen = false;

  constructor(options: HeartInteractionOptions) {
    this.heart = options.heart;
    this.numbers = options.numbers;
    this.content = options.content;
    this.state = options.state;
    this.overlay = options.overlay;
  }

  handleClick(elapsed: number): void {
    if (this.promiseOpen) return;
    const now = performance.now();
    if (now - this.lastClickAt < DOUBLE_CLICK_WINDOW) {
      this.lastClickAt = 0;
      window.clearTimeout(this.clickTimer);
      this.burst(elapsed);
      return;
    }
    this.lastClickAt = now;
    window.clearTimeout(this.clickTimer);
    this.clickTimer = window.setTimeout(() => this.gather(elapsed), DOUBLE_CLICK_WINDOW);
  }

  gather(elapsed: number): void {
    if (this.state.isBusy) return;
    this.state.begin('heart');
    this.heart.setPaused(false);
    this.heart.gather(elapsed);
    window.setTimeout(() => {
      if (this.state.current === 'heart') this.state.end();
    }, 3200);
  }

  burst(elapsed: number): void {
    if (this.state.isBusy) return;
    this.state.begin('heart');
    this.heart.setPaused(false);
    this.heart.burst(elapsed);
    this.numbers.pulse();
    window.setTimeout(() => {
      if (this.state.current === 'heart') this.state.end();
    }, 2600);
  }

  openPromise(): void {
    if (this.promiseOpen || this.state.isBusy) return;
    this.promiseOpen = true;
    this.state.begin('promise');
    this.heart.setPaused(false);
    this.heart.gather(performance.now() / 1000);
    this.numbers.setMode('love');
    const content = this.content.current;
    this.overlay.setCloseHandler(() => this.closePromise());
    this.overlay.show({
      kicker: 'A PROMISE FOR US',
      title: '520 ♡ 1314',
      body: content.promise,
      signature: `—— 给 ${content.nickname}`,
      actions: [
        {
          label: '收下这份约定',
          primary: true,
          onClick: () => this.closePromise()
        }
      ]
    });
  }

  closePromise(): void {
    if (!this.promiseOpen) return;
    this.promiseOpen = false;
    this.overlay.close();
    this.numbers.setMode('idle');
    this.heart.setMode('heart');
    this.state.end();
  }

  get isPromiseOpen(): boolean {
    return this.promiseOpen;
  }

  dispose(): void {
    window.clearTimeout(this.clickTimer);
  }
}
