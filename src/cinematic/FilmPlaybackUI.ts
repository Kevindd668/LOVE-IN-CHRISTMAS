import { FILM_DURATION, getFilmChapter } from './FilmTimeline';

interface FilmPlaybackCallbacks {
  onPauseToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSkipIntro: () => void;
  onSkipFilm: () => void;
  onReplay: () => void;
  onExit: () => void;
}

export class FilmPlaybackUI {
  private readonly callbacks: FilmPlaybackCallbacks;
  private readonly root: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly subtitleTitle: HTMLElement;
  private readonly subtitleLine: HTMLElement;
  private readonly chapter: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly previousButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly skipIntroButton: HTMLButtonElement;
  private readonly skipFilmButton: HTMLButtonElement;
  private readonly replayButton: HTMLButtonElement;
  private readonly exitButton: HTMLButtonElement;
  private currentChapter = -1;
  private completed = false;

  constructor(callbacks: FilmPlaybackCallbacks) {
    this.callbacks = callbacks;
    this.root = document.createElement('section');
    this.root.id = 'film-playback';
    this.root.className = 'film-playback';
    this.root.innerHTML = `
      <div class="film-subtitle" aria-live="polite">
        <p class="film-subtitle-kicker"></p>
        <p class="film-subtitle-line"></p>
      </div>
      <div class="film-controls" role="group" aria-label="电影播放控制">
        <div class="film-progress-row">
          <span class="film-chapter-label">LOVE IN CHRISTMAS</span>
          <div class="film-progress" aria-hidden="true"><i></i></div>
          <span class="film-time">00:00</span>
        </div>
        <div class="film-buttons">
          <button type="button" data-film="pause">暂停</button>
          <button type="button" data-film="prev">上一幕</button>
          <button type="button" data-film="next">下一幕</button>
          <button type="button" data-film="skip-intro">跳过开场</button>
          <button type="button" data-film="skip">跳过电影</button>
          <button type="button" data-film="replay" hidden>完整重播</button>
          <button type="button" data-film="exit">退出</button>
        </div>
      </div>
    `;
    document.body.append(this.root);
    this.subtitle = this.root.querySelector('.film-subtitle')!;
    this.subtitleTitle = this.root.querySelector('.film-subtitle-kicker')!;
    this.subtitleLine = this.root.querySelector('.film-subtitle-line')!;
    this.chapter = this.root.querySelector('.film-chapter-label')!;
    this.progress = this.root.querySelector('.film-progress')!;
    this.progressFill = this.root.querySelector('.film-progress i')!;
    this.pauseButton = this.root.querySelector('[data-film="pause"]')!;
    this.previousButton = this.root.querySelector('[data-film="prev"]')!;
    this.nextButton = this.root.querySelector('[data-film="next"]')!;
    this.skipIntroButton = this.root.querySelector('[data-film="skip-intro"]')!;
    this.skipFilmButton = this.root.querySelector('[data-film="skip"]')!;
    this.replayButton = this.root.querySelector('[data-film="replay"]')!;
    this.exitButton = this.root.querySelector('[data-film="exit"]')!;
    this.pauseButton.addEventListener('click', () => this.callbacks.onPauseToggle());
    this.previousButton.addEventListener('click', () => this.callbacks.onPrevious());
    this.nextButton.addEventListener('click', () => this.callbacks.onNext());
    this.skipIntroButton.addEventListener('click', () => this.callbacks.onSkipIntro());
    this.skipFilmButton.addEventListener('click', () => this.callbacks.onSkipFilm());
    this.replayButton.addEventListener('click', () => this.callbacks.onReplay());
    this.exitButton.addEventListener('click', () => this.callbacks.onExit());
    this.hide();
  }

  show(): void {
    this.completed = false;
    this.root.classList.add('is-open');
    this.root.classList.remove('is-completed');
    this.pauseButton.hidden = false;
    this.previousButton.hidden = false;
    this.nextButton.hidden = false;
    this.skipFilmButton.hidden = false;
    this.replayButton.hidden = true;
    this.setChapter(getFilmChapter(0));
    this.showSubtitle('A CHRISTMAS FILM', '一场只属于我们的圣诞故事。');
  }

  hide(): void {
    this.root.classList.remove('is-open');
    this.subtitle.classList.remove('is-open');
  }

  showCompleted(): void {
    this.completed = true;
    this.root.classList.add('is-open', 'is-completed');
    this.pauseButton.hidden = true;
    this.previousButton.hidden = true;
    this.nextButton.hidden = true;
    this.skipIntroButton.hidden = true;
    this.skipFilmButton.hidden = true;
    this.replayButton.hidden = false;
    this.showSubtitle('MERRY CHRISTMAS', '这场只属于我们的电影，永远为你重播。');
    this.setTime(FILM_DURATION);
  }

  setPaused(paused: boolean): void {
    this.pauseButton.textContent = paused ? '继续' : '暂停';
    this.pauseButton.setAttribute('aria-pressed', String(paused));
    this.root.classList.toggle('is-paused', paused);
  }

  setChapter(chapter: { title: string; subtitle: string; start: number }): void {
    this.chapter.textContent = chapter.title;
    if (this.currentChapter !== chapter.start) {
      this.currentChapter = chapter.start;
      this.subtitleTitle.textContent = chapter.title;
      this.subtitleLine.textContent = chapter.subtitle;
    }
  }

  setTime(seconds: number): void {
    const clamped = Math.max(0, Math.min(FILM_DURATION, seconds));
    const ratio = clamped / FILM_DURATION;
    this.progressFill.style.width = `${(ratio * 100).toFixed(2)}%`;
    this.progress.setAttribute('aria-valuenow', clamped.toFixed(2));
    const total = Math.round(clamped);
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const secs = String(total % 60).padStart(2, '0');
    const time = this.root.querySelector('.film-time');
    if (time) time.textContent = `${minutes}:${secs}`;
    this.skipIntroButton.hidden = this.completed || clamped >= 8;
  }

  showSubtitle(kicker: string, line: string): void {
    this.subtitleTitle.textContent = kicker;
    this.subtitleLine.textContent = line;
    this.subtitle.classList.add('is-open');
  }

  hideSubtitle(): void {
    this.subtitle.classList.remove('is-open');
  }

  showPhotoSubtitle(
    title: string,
    date: string,
    description: string,
    fallback: boolean
  ): void {
    const prefix = fallback ? '示例记忆 · ' : '';
    this.showSubtitle(
      `${prefix}${title || '我们的时光'}`,
      [date, description].filter(Boolean).join(' · ') ||
        (fallback ? '上传你们的照片后，这里会变成真实回忆。' : '这一帧，留给我们。')
    );
  }

  showFinal(title: string, message: string, signature: string): void {
    this.showSubtitle(title || 'MERRY CHRISTMAS', `${message}\n${signature}`.trim());
  }

  dispose(): void {
    this.root.remove();
  }
}
