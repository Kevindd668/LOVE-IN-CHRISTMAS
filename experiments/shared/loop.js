/**
 * One rAF loop per lab. All labs use this class; it is not imported by the
 * formal product. Delta is clamped and visibility gaps are ignored.
 */
export class LabLoop {
  constructor({ onFrame, onFps } = {}) {
    this.onFrame = onFrame || (() => {});
    this.onFps = onFps || (() => {});
    this.running = false;
    this.paused = false;
    this.raf = 0;
    this.last = 0;
    this.elapsed = 0;
    this.frames = 0;
    this.sampleStart = 0;
    this.fps = 60;
    this.visible = true;
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  handleVisibility = () => {
    this.visible = !document.hidden;
    if (!this.visible) {
      this.pausedByVisibility = this.paused;
      this.paused = true;
    } else {
      this.paused = this.pausedByVisibility || false;
      this.last = 0;
    }
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = (time) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    if (!this.visible) return;
    if (!this.last) {
      this.last = time;
      this.sampleStart = this.sampleStart || time;
      return;
    }
    const raw = (time - this.last) / 1000;
    this.last = time;
    if (!this.paused) {
      const dt = Math.min(0.05, Math.max(0.0001, raw));
      this.elapsed += dt;
      this.onFrame(dt, this.elapsed);
      this.frames += 1;
    }
    this.sampleStart ||= time;
    const sample = time - this.sampleStart;
    if (sample > 700) {
      this.fps = Math.round((this.frames * 1000) / sample);
      this.frames = 0;
      this.sampleStart = time;
      this.onFps(this.fps);
    }
  };

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.last = 0;
  }

  toggle() {
    this.paused = !this.paused;
    if (!this.paused) this.last = 0;
    return this.paused;
  }

  reset() {
    this.elapsed = 0;
    this.last = 0;
    this.sampleStart = 0;
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** Small deterministic PRNG so screenshots and effects are stable. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
