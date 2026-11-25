import type { CinematicIntro } from './CinematicIntro';
import {
  FILM_DURATION,
  getChapterIndex,
  getChapterStart,
  getFilmChapter,
  type FilmChapter
} from './FilmTimeline';

export type FilmState =
  | 'idle'
  | 'entry'
  | 'preflight'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'exiting';

interface FilmDirectorOptions {
  intro: CinematicIntro;
}

/**
 * One clock for the whole 68 second film. The intro keeps its existing
 * 8 second segment logic; this director owns the transition into the story
 * and the shared pause/skip/seek/exit state machine.
 */
export class FilmDirector {
  private readonly intro: CinematicIntro;
  private state: FilmState = 'idle';
  private elapsed = 0;
  private paused = false;
  private active = false;

  constructor(options: FilmDirectorOptions) {
    this.intro = options.intro;
  }

  get isActive(): boolean {
    return this.active;
  }

  get isPaused(): boolean {
    return this.intro.isActive ? this.intro.isPaused : this.paused;
  }

  get isEntryOpen(): boolean {
    return this.intro.isEntryOpen;
  }

  get isBlocking(): boolean {
    return this.active || this.intro.isEntryOpen;
  }

  get currentTime(): number {
    return this.intro.isActive ? this.intro.currentElapsed : this.elapsed;
  }

  get currentState(): FilmState {
    return this.state;
  }

  get currentChapter(): FilmChapter {
    return getFilmChapter(this.currentTime);
  }

  get duration(): number {
    return FILM_DURATION;
  }

  showEntry(): void {
    if (this.active) return;
    this.state = 'entry';
    this.intro.showEntry();
  }

  onIntroStart(): void {
    this.active = true;
    this.paused = false;
    this.elapsed = 0;
    this.state = 'playing';
  }

  onIntroComplete(): void {
    if (!this.active) return;
    this.elapsed = FILM_CHAPTERS_INTRO_END;
    this.paused = false;
    // S1 deliberately holds the formal scene after the intro. The 60 second
    // story chapters are added in S4; keeping a valid clock here lets the
    // timeline/state machine be verified without adding story visuals early.
    this.state = 'playing';
  }

  update(dt: number): void {
    if (!this.active) return;
    if (this.intro.isActive) {
      this.intro.update(dt);
      this.elapsed = this.intro.currentElapsed;
      return;
    }
    if (this.paused) return;
    this.elapsed = Math.min(FILM_DURATION, this.elapsed + dt);
    if (this.elapsed >= FILM_DURATION) this.complete();
  }

  pause(): void {
    if (!this.active) return;
    if (this.intro.isActive) {
      this.intro.pause();
      return;
    }
    if (this.paused) return;
    this.paused = true;
    this.state = 'paused';
  }

  resume(): void {
    if (!this.active) return;
    if (this.intro.isActive) {
      if (this.intro.isPaused) this.intro.togglePause();
      return;
    }
    if (!this.paused) return;
    this.paused = false;
    this.state = 'playing';
  }

  togglePause(): void {
    if (this.isPaused) this.resume();
    else this.pause();
  }

  skipIntro(): void {
    if (!this.active) return;
    if (this.intro.isActive) {
      this.intro.skip();
      return;
    }
    this.elapsed = FILM_CHAPTERS_INTRO_END;
  }

  skipFilm(): void {
    if (!this.active) return;
    if (this.intro.isActive) {
      this.intro.skip();
      return;
    }
    this.elapsed = FILM_DURATION;
    this.complete();
  }

  nextChapter(): void {
    if (!this.active) return;
    const index = getChapterIndex(this.currentTime);
    this.seek(getChapterStart(index + 1));
  }

  previousChapter(): void {
    if (!this.active) return;
    const index = getChapterIndex(this.currentTime);
    const currentStart = getChapterStart(index);
    this.seek(
      this.currentTime - currentStart > 1.5
        ? currentStart
        : getChapterStart(index - 1)
    );
  }

  seek(seconds: number): void {
    if (!this.active) return;
    const target = Math.max(0, Math.min(FILM_DURATION, seconds));
    if (target < FILM_CHAPTERS_INTRO_END) {
      if (this.intro.isActive) {
        this.intro.seek(target);
      } else {
        this.intro.replay();
        this.intro.seek(target);
      }
      this.elapsed = target;
      return;
    }
    if (this.intro.isActive) {
      this.intro.skip();
    }
    this.elapsed = target;
    if (target >= FILM_DURATION) this.complete();
  }

  replay(): void {
    if (this.active) return;
    this.intro.replay();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.paused = false;
    this.state = 'idle';
    if (this.intro.isActive) {
      this.intro.exit();
    } else {
      this.intro.restoreScene();
    }
  }

  complete(): void {
    if (!this.active) return;
    this.active = false;
    this.paused = false;
    this.state = 'completed';
    this.intro.restoreScene();
  }

  dispose(): void {
    // The intro owns its UI/field resources; the director only owns timing.
  }
}

const FILM_CHAPTERS_INTRO_END = 8;
