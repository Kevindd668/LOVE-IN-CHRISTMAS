import type { PhotoListItem } from '../photos/PhotoManager';
import { formatTime } from '../core/utils';

interface WishContent {
  kicker: string;
  title: string;
  body: string;
  signature: string;
  acceptLabel?: string;
  onClose?: () => void;
}

interface CinemaHandlers {
  onTogglePause: () => void;
  onExit: () => void;
  onReplay: () => void;
  onCloseEnding: () => void;
  onRomanceExit: () => void;
}

export class UIManager {
  private readonly loader: HTMLElement;
  private readonly toastElement: HTMLElement;
  private readonly wishOverlay: HTMLElement;
  private readonly wishKicker: HTMLElement;
  private readonly wishTitle: HTMLElement;
  private readonly wishBody: HTMLElement;
  private readonly wishSignature: HTMLElement;
  private readonly wishAccept: HTMLButtonElement;
  private readonly wishClose: HTMLButtonElement;
  private readonly lightbox: HTMLElement;
  private readonly lightboxImage: HTMLImageElement;
  private readonly lightboxCaption: HTMLElement;
  private readonly lightboxClose: HTMLButtonElement;
  private readonly cinema: HTMLElement;
  private readonly cinemaAct: HTMLElement;
  private readonly cinemaLine: HTMLElement;
  private readonly cinemaChapter: HTMLElement;
  private readonly cinemaFill: HTMLElement;
  private readonly cinemaTime: HTMLElement;
  private readonly cinemaPause: HTMLButtonElement;
  private readonly cinemaExit: HTMLButtonElement;
  private readonly cinemaReplay: HTMLButtonElement;
  private readonly cinemaClose: HTMLButtonElement;
  private readonly cinemaEndingMessage: HTMLElement;
  private readonly cinemaEndingSignature: HTMLElement;
  private readonly soundButton: HTMLButtonElement;
  private readonly soundLabel: HTMLElement;
  private toastTimer = 0;
  private chapterTimer = 0;
  private wishCloseHandler: (() => void) | null = null;
  private lastProgressSecond = -1;
  private handlers: CinemaHandlers | null = null;
  private readonly hint: HTMLElement;
  private hintTimer = 0;
  private interactionCount = 0;

  constructor() {
    this.loader = document.querySelector<HTMLElement>('#loader')!;
    this.toastElement = document.querySelector<HTMLElement>('#toast')!;
    this.wishOverlay = document.querySelector<HTMLElement>('#wish-overlay')!;
    this.wishKicker = document.querySelector<HTMLElement>('#wish-kicker')!;
    this.wishTitle = document.querySelector<HTMLElement>('#wish-title')!;
    this.wishBody = document.querySelector<HTMLElement>('#wish-body')!;
    this.wishSignature = document.querySelector<HTMLElement>('#wish-signature')!;
    this.wishAccept = document.querySelector<HTMLButtonElement>('#wish-accept')!;
    this.wishClose = document.querySelector<HTMLButtonElement>('#wish-close')!;
    this.lightbox = document.querySelector<HTMLElement>('#photo-lightbox')!;
    this.lightboxImage = document.querySelector<HTMLImageElement>('#lightbox-image')!;
    this.lightboxCaption = document.querySelector<HTMLElement>('#lightbox-caption')!;
    this.lightboxClose = document.querySelector<HTMLButtonElement>('#lightbox-close')!;
    this.cinema = document.querySelector<HTMLElement>('#cinema')!;
    this.cinemaAct = document.querySelector<HTMLElement>('#cinema-act')!;
    this.cinemaLine = document.querySelector<HTMLElement>('#cinema-line')!;
    this.cinemaChapter = document.querySelector<HTMLElement>('.cinema-chapter')!;
    this.cinemaFill = document.querySelector<HTMLElement>('#cinema-fill')!;
    this.cinemaTime = document.querySelector<HTMLElement>('#cinema-time')!;
    this.cinemaPause = document.querySelector<HTMLButtonElement>('#cinema-pause')!;
    this.cinemaExit = document.querySelector<HTMLButtonElement>('#cinema-exit')!;
    this.cinemaReplay = document.querySelector<HTMLButtonElement>('#cinema-replay')!;
    this.cinemaClose = document.querySelector<HTMLButtonElement>('#cinema-close')!;
    this.cinemaEndingMessage = document.querySelector<HTMLElement>('#cinema-ending-message')!;
    this.cinemaEndingSignature = document.querySelector<HTMLElement>('#cinema-ending-signature')!;
    this.soundButton = document.querySelector<HTMLButtonElement>('#btn-sound')!;
    this.soundLabel = this.soundButton.querySelector<HTMLElement>('.sound-label')!;
    this.hint = document.querySelector<HTMLElement>('#scene-hint')!;

    this.bind();
  }

  private bind(): void {
    this.wishAccept.addEventListener('click', () => this.closeWish());
    this.wishClose.addEventListener('click', () => this.closeWish());
    this.wishOverlay.addEventListener('click', (event) => {
      if (event.target === this.wishOverlay) this.closeWish();
    });
    this.lightboxClose.addEventListener('click', () => this.closeLightbox());
    this.lightbox.addEventListener('click', (event) => {
      if (event.target === this.lightbox) this.closeLightbox();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (this.wishOverlay.classList.contains('is-open')) {
        this.closeWish();
      } else if (this.lightbox.classList.contains('is-open')) {
        this.closeLightbox();
      }
    });

    document.querySelector<HTMLButtonElement>('#hint-dismiss')?.addEventListener('click', () => this.hideHint());
  }

  bindCinemaHandlers(handlers: CinemaHandlers): void {
    this.handlers = handlers;
    this.cinemaPause.addEventListener('click', () => handlers.onTogglePause());
    this.cinemaExit.addEventListener('click', () => handlers.onExit());
    this.cinemaReplay.addEventListener('click', () => handlers.onReplay());
    this.cinemaClose.addEventListener('click', () => handlers.onCloseEnding());
    document.querySelector<HTMLButtonElement>('#btn-romance-exit')?.addEventListener('click', () => {
      handlers.onRomanceExit();
    });
  }

  hideLoader(): void {
    this.loader.classList.add('is-done');
    window.setTimeout(() => {
      this.loader.setAttribute('aria-hidden', 'true');
    }, 1100);
  }

  toast(message: string, duration = 2800): void {
    window.clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove('is-visible');
    }, duration);
  }

  setMusicState(enabled: boolean): void {
    this.soundButton.setAttribute('aria-pressed', String(enabled));
    this.soundLabel.textContent = enabled ? '音乐播放中' : '开启音乐';
    this.soundButton.setAttribute('aria-label', enabled ? '关闭背景音乐' : '开启背景音乐');
  }

  showWish(content: WishContent): void {
    window.clearTimeout(this.chapterTimer);
    this.wishCloseHandler = content.onClose ?? null;
    this.wishKicker.textContent = content.kicker;
    this.wishTitle.textContent = content.title;
    this.wishBody.textContent = content.body;
    this.wishSignature.textContent = content.signature;
    this.wishAccept.textContent = content.acceptLabel ?? '收下这份心意';
    this.wishOverlay.classList.add('is-open');
    this.wishOverlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => this.wishAccept.focus({ preventScroll: true }), 50);
  }

  closeWish(): void {
    if (!this.wishOverlay.classList.contains('is-open')) return;
    this.wishOverlay.classList.remove('is-open');
    this.wishOverlay.setAttribute('aria-hidden', 'true');
    const handler = this.wishCloseHandler;
    this.wishCloseHandler = null;
    handler?.();
  }

  showLightbox(photo: PhotoListItem): void {
    this.lightboxImage.src = photo.displayUrl;
    this.lightboxImage.alt = photo.caption || photo.fileName;
    this.lightboxCaption.textContent = photo.caption || '我们的故事';
    this.lightbox.classList.add('is-open');
    this.lightbox.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => this.lightboxClose.focus({ preventScroll: true }), 40);
  }

  closeLightbox(): void {
    this.lightbox.classList.remove('is-open');
    this.lightbox.setAttribute('aria-hidden', 'true');
    this.lightboxImage.removeAttribute('src');
  }

  cinemaStart(): void {
    this.cinema.classList.add('is-active');
    this.cinema.classList.remove('is-ending', 'is-paused');
    this.cinema.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-cinema');
    this.cinemaPause.innerHTML = '<span class="pause-glyph"></span><span>暂停</span>';
    this.cinemaPause.style.visibility = '';
    this.cinemaPause.setAttribute('aria-label', '暂停演示');
    this.cinemaTime.textContent = '00:00 / 00:45';
    this.cinemaFill.style.width = '0%';
    this.lastProgressSecond = -1;
    this.hideHint();
  }

  cinemaStop(): void {
    this.cinema.classList.remove('is-active', 'is-ending', 'is-paused');
    this.cinema.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-cinema');
    this.cinemaFill.style.width = '0%';
  }

  setChapter(act: string, line: string, immediate = false): void {
    window.clearTimeout(this.chapterTimer);
    const update = (): void => {
      this.cinemaAct.textContent = act;
      this.cinemaLine.textContent = line;
      this.cinemaChapter.classList.add('is-visible');
    };
    this.cinemaChapter.classList.remove('is-visible');
    if (immediate) {
      update();
    } else {
      this.chapterTimer = window.setTimeout(update, 220);
    }
  }

  setCinemaProgress(elapsed: number, duration: number): void {
    const ratio = Math.min(1, Math.max(0, elapsed / duration));
    this.cinemaFill.style.width = `${(ratio * 100).toFixed(2)}%`;
    const currentSecond = Math.floor(elapsed);
    if (currentSecond !== this.lastProgressSecond) {
      this.lastProgressSecond = currentSecond;
      this.cinemaTime.textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;
    }
  }

  setCinemaPaused(paused: boolean): void {
    this.cinema.classList.toggle('is-paused', paused);
    this.cinemaPause.querySelector('span:last-child')!.textContent = paused ? '继续' : '暂停';
    this.cinemaPause.setAttribute('aria-label', paused ? '继续演示' : '暂停演示');
    this.cinemaChapter.classList.toggle('is-visible', !paused);
  }

  showCinemaEnding(message: string, signature: string): void {
    this.cinema.classList.add('is-ending');
    this.cinemaChapter.classList.remove('is-visible');
    this.cinemaEndingMessage.textContent = message;
    this.cinemaEndingSignature.textContent = signature;
    this.cinemaPause.style.visibility = 'hidden';
    window.setTimeout(() => this.cinemaReplay.focus({ preventScroll: true }), 300);
  }

  hideCinemaEnding(): void {
    this.cinema.classList.remove('is-ending');
    this.cinemaPause.style.visibility = '';
    this.cinemaPause.querySelector('span:last-child')!.textContent = '暂停';
  }

  setRomanceMode(active: boolean): void {
    document.body.classList.toggle('is-romance', active);
    document.body.classList.toggle('is-cinema', active);
  }

  hideHint(): void {
    this.hint.classList.add('is-hidden');
    window.clearTimeout(this.hintTimer);
  }

  scheduleHintHide(delay = 14000): void {
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => this.hideHint(), delay);
  }

  registerInteraction(): void {
    this.interactionCount += 1;
    if (this.interactionCount === 1) this.hideHint();
  }

  get hasOpenOverlay(): boolean {
    return (
      this.wishOverlay.classList.contains('is-open') ||
      this.lightbox.classList.contains('is-open') ||
      this.cinema.classList.contains('is-active') ||
      document.body.classList.contains('is-romance')
    );
  }

  get musicElement(): HTMLButtonElement {
    return this.soundButton;
  }
}
