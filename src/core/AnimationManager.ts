export type FrameCallback = (delta: number, elapsed: number) => void;

export class AnimationManager {
  private rafId = 0;
  private callback: FrameCallback | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private frames = 0;
  private sampleStart = 0;
  private fps = 60;
  private onSample: ((fps: number) => void) | null = null;
  private running = false;

  constructor() {
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.lastTime = 0;
    }
  };

  start(callback: FrameCallback, onSample?: (fps: number) => void): void {
    if (this.running) return;
    this.running = true;
    this.callback = callback;
    this.onSample = onSample ?? null;
    this.lastTime = 0;
    this.sampleStart = 0;
    this.frames = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (time: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    if (document.hidden) {
      this.lastTime = time;
      return;
    }

    if (!this.lastTime) {
      this.lastTime = time;
      this.sampleStart = time;
      return;
    }

    const rawDelta = (time - this.lastTime) / 1000;
    const delta = Math.min(0.05, Math.max(0.0001, rawDelta));
    this.lastTime = time;
    this.elapsed += delta;
    this.frames += 1;

    this.callback?.(delta, this.elapsed);

    if (this.sampleStart === 0) this.sampleStart = time;
    const sampleElapsed = time - this.sampleStart;
    if (sampleElapsed > 700) {
      this.fps = Math.round((this.frames * 1000) / sampleElapsed);
      this.onSample?.(this.fps);
      this.frames = 0;
      this.sampleStart = time;
    }
  };

  get currentFps(): number {
    return this.fps;
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}
