interface IntroUICallbacks {
  onStart: () => void;
  onBrowse: () => void;
  onPauseToggle: () => void;
  onSkip: () => void;
  onReplay: () => void;
  onExit: () => void;
}

interface TitleParticle {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  delay: number;
  size: number;
  color: string;
  phase: number;
}

const TITLE = 'LOVE IN CHRISTMAS';
const SUBTITLE = 'A STORY WRITTEN JUST FOR YOU';
const CHINESE = '一场只属于我们的圣诞故事。';

export class CinematicIntroUI {
  private readonly callbacks: IntroUICallbacks;
  private readonly entry: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly browseButton: HTMLButtonElement;
  private readonly loading: HTMLElement;
  private readonly title: HTMLElement;
  private readonly titleCanvas: HTMLCanvasElement;
  private readonly controls: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly skipButton: HTMLButtonElement;
  private readonly replayButton: HTMLButtonElement;
  private readonly exitButton: HTMLButtonElement;
  private particles: TitleParticle[] = [];
  private titleActive = false;
  private titleTime = 0;
  private resizeHandler = (): void => this.resizeTitleCanvas();

  constructor(callbacks: IntroUICallbacks) {
    this.callbacks = callbacks;
    this.entry = document.createElement('section');
    this.entry.id = 'cinematic-intro-entry';
    this.entry.className = 'cinematic-intro-entry';
    this.entry.innerHTML = `
      <div class="intro-entry-glow"></div>
      <div class="intro-entry-card" role="dialog" aria-modal="true" aria-labelledby="intro-entry-title">
        <p class="intro-entry-kicker">LOVE IN CHRISTMAS · 2026</p>
        <h1 id="intro-entry-title">MERRY<br /><span>CHRISTMAS</span></h1>
        <p class="intro-entry-copy">有一份特别的礼物，想送给你。</p>
        <button class="intro-start-button" type="button">开启专属圣诞惊喜</button>
        <button class="intro-browse-button" type="button">先逛逛</button>
        <p class="intro-loading" role="status"></p>
      </div>
    `;
    document.body.append(this.entry);
    this.startButton = this.entry.querySelector('.intro-start-button')!;
    this.browseButton = this.entry.querySelector('.intro-browse-button')!;
    this.loading = this.entry.querySelector('.intro-loading')!;

    this.title = document.createElement('div');
    this.title.id = 'cinematic-intro-title';
    this.title.className = 'cinematic-intro-title';
    this.title.innerHTML = `
      <canvas class="intro-title-particles" aria-hidden="true"></canvas>
      <div class="intro-title-copy">
        <p class="intro-title-kicker">A CHRISTMAS FILM</p>
        <h2>${TITLE}</h2>
        <p class="intro-title-sub">${SUBTITLE}</p>
        <p class="intro-title-cn">${CHINESE}</p>
      </div>
      <i class="intro-title-sweep" aria-hidden="true"></i>
    `;
    document.body.append(this.title);
    this.titleCanvas = this.title.querySelector<HTMLCanvasElement>('.intro-title-particles')!;

    this.controls = document.createElement('div');
    this.controls.id = 'cinematic-intro-controls';
    this.controls.className = 'cinematic-intro-controls';
    this.controls.innerHTML = `
      <button type="button" data-intro="pause">暂停</button>
      <button type="button" data-intro="skip">跳过开场</button>
      <button type="button" data-intro="replay">重播</button>
      <button type="button" data-intro="exit">退出</button>
    `;
    document.body.append(this.controls);
    this.pauseButton = this.controls.querySelector('[data-intro="pause"]')!;
    this.skipButton = this.controls.querySelector('[data-intro="skip"]')!;
    this.replayButton = this.controls.querySelector('[data-intro="replay"]')!;
    this.exitButton = this.controls.querySelector('[data-intro="exit"]')!;

    this.startButton.addEventListener('click', () => this.callbacks.onStart());
    this.browseButton.addEventListener('click', () => this.callbacks.onBrowse());
    this.pauseButton.addEventListener('click', () => this.callbacks.onPauseToggle());
    this.skipButton.addEventListener('click', () => this.callbacks.onSkip());
    this.replayButton.addEventListener('click', () => this.callbacks.onReplay());
    this.exitButton.addEventListener('click', () => this.callbacks.onExit());

    window.addEventListener('resize', this.resizeHandler);
    this.hideAll();
  }

  showEntry(): void {
    this.entry.classList.add('is-open');
    this.entry.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-intro-entry');
    document.body.classList.remove('is-intro-playing');
    this.controls.classList.remove('is-open');
    this.setLoading('');
    this.startButton.disabled = false;
  }

  hideEntry(): void {
    this.entry.classList.remove('is-open');
    this.entry.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-intro-entry');
  }

  setLoading(message: string): void {
    this.loading.textContent = message;
    this.startButton.disabled = message.length > 0;
  }

  showControls(finished = false): void {
    this.controls.classList.add('is-open');
    this.pauseButton.hidden = finished;
    this.skipButton.hidden = finished;
    this.replayButton.hidden = false;
    this.exitButton.hidden = false;
  }

  hideControls(): void {
    this.controls.classList.remove('is-open');
  }

  setPaused(paused: boolean): void {
    this.pauseButton.textContent = paused ? '继续' : '暂停';
    this.pauseButton.setAttribute('aria-pressed', String(paused));
  }

  showTitle(): void {
    this.titleActive = true;
    this.titleTime = 0;
    this.title.classList.add('is-open');
    this.resizeTitleCanvas();
    this.createTitleParticles();
  }

  hideTitle(): void {
    this.titleActive = false;
    this.title.classList.remove('is-open');
    this.particles = [];
  }

  updateTitle(dt: number): void {
    if (!this.titleActive) return;
    this.titleTime += dt;
    const ctx = this.titleCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.titleCanvas.width, this.titleCanvas.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const particle of this.particles) {
      const local = this.titleTime - particle.delay;
      if (local <= 0) continue;
      const p = Math.min(1, local / 0.9);
      const ease = 1 - Math.pow(1 - p, 3);
      const x = particle.fromX + (particle.targetX - particle.fromX) * ease + Math.sin(this.titleTime * 2 + particle.phase) * (1 - ease) * 22;
      const y = particle.fromY + (particle.targetY - particle.fromY) * ease + Math.cos(this.titleTime * 1.7 + particle.phase) * (1 - ease) * 12;
      ctx.globalAlpha = Math.min(1, p * 1.4) * (0.78 + 0.22 * Math.sin(this.titleTime * 3 + particle.phase));
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  hideAll(): void {
    this.hideEntry();
    this.hideTitle();
    this.hideControls();
    document.body.classList.remove('is-intro-entry', 'is-intro-playing');
  }

  private resizeTitleCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.titleCanvas.width = Math.round(window.innerWidth * dpr);
    this.titleCanvas.height = Math.round(window.innerHeight * dpr);
    this.titleCanvas.style.width = `${window.innerWidth}px`;
    this.titleCanvas.style.height = `${window.innerHeight}px`;
    if (this.titleActive) this.createTitleParticles();
  }

  private createTitleParticles(): void {
    const box = this.title.querySelector<HTMLElement>('.intro-title-copy')?.getBoundingClientRect();
    const centerY = box ? box.top + box.height * 0.46 : window.innerHeight * 0.45;
    const left = box ? box.left : window.innerWidth * 0.2;
    const right = box ? box.right : window.innerWidth * 0.8;
    const width = Math.max(1, right - left);
    this.particles = [];
    const rng = (() => {
      let seed = 8807;
      return (): number => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();
    for (let i = 0; i < 600; i += 1) {
      const fromLeft = i % 2 === 0;
      const targetX = left + rng() * width;
      const targetY = centerY + (rng() - 0.5) * (box ? box.height * 1.15 : 100);
      this.particles.push({
        x: targetX,
        y: targetY,
        fromX: fromLeft ? -30 - rng() * 90 : window.innerWidth + 30 + rng() * 90,
        fromY: centerY + (rng() - 0.5) * window.innerHeight * 0.7,
        targetX,
        targetY,
        delay: rng() * 0.55,
        size: 0.8 + rng() * 1.8,
        color: i % 5 === 0 ? '#FF9CBA' : i % 3 === 0 ? '#FFE4B6' : '#FFD58A',
        phase: rng() * Math.PI * 2
      });
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.entry.remove();
    this.title.remove();
    this.controls.remove();
    this.hideAll();
  }
}
