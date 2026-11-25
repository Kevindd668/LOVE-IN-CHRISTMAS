export interface StoryPage {
  kicker: string;
  title: string;
  body: string;
  signature?: string;
  image?: string;
  list?: string[];
  counter?: string;
  actions?: { label: string; primary?: boolean; onClick: () => void }[];
}

/**
 * One DOM overlay for promises, letters, wish cards and gift albums.
 * It deliberately carries no Three.js objects; the scene continues underneath.
 */
export class StoryOverlay {
  private readonly root: HTMLElement;
  private readonly kicker: HTMLElement;
  private readonly title: HTMLElement;
  private readonly body: HTMLElement;
  private readonly signature: HTMLElement;
  private readonly media: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly list: HTMLElement;
  private readonly counter: HTMLElement;
  private readonly actions: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private closeHandler: (() => void) | null = null;
  private openState = false;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'story-overlay';
    this.root.className = 'story-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = `
      <div class="story-dialog" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <button class="story-close" type="button" aria-label="关闭">×</button>
        <p class="story-kicker"></p>
        <h2 class="story-title" id="story-title"></h2>
        <div class="story-line"><i></i><span>✦</span><i></i></div>
        <div class="story-media"><img alt="" /></div>
        <p class="story-body"></p>
        <ul class="story-list"></ul>
        <p class="story-signature"></p>
        <p class="story-counter"></p>
        <div class="story-actions"></div>
      </div>
    `;
    document.body.append(this.root);
    this.kicker = this.root.querySelector('.story-kicker')!;
    this.title = this.root.querySelector('.story-title')!;
    this.body = this.root.querySelector('.story-body')!;
    this.signature = this.root.querySelector('.story-signature')!;
    this.media = this.root.querySelector('.story-media')!;
    this.image = this.root.querySelector('.story-media img')!;
    this.list = this.root.querySelector('.story-list')!;
    this.counter = this.root.querySelector('.story-counter')!;
    this.actions = this.root.querySelector('.story-actions')!;
    this.closeButton = this.root.querySelector('.story-close')!;
    this.closeButton.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.openState) this.close();
    });
  }

  get isOpen(): boolean {
    return this.openState;
  }

  setCloseHandler(handler: (() => void) | null): void {
    this.closeHandler = handler;
  }

  show(page: StoryPage): void {
    this.kicker.textContent = page.kicker;
    this.title.textContent = page.title;
    this.body.textContent = page.body;
    this.body.hidden = !page.body;
    this.signature.textContent = page.signature ?? '';
    this.signature.hidden = !page.signature;
    this.counter.textContent = page.counter ?? '';
    this.counter.hidden = !page.counter;
    this.media.hidden = !page.image;
    if (page.image) {
      this.image.src = page.image;
      this.image.alt = page.title;
    } else {
      this.image.removeAttribute('src');
    }
    this.list.replaceChildren();
    for (const item of page.list ?? []) {
      const row = document.createElement('li');
      row.textContent = item;
      this.list.append(row);
    }
    this.list.hidden = (page.list?.length ?? 0) === 0;
    this.actions.replaceChildren();
    for (const action of page.actions ?? []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.primary ? 'story-action is-primary' : 'story-action';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      this.actions.append(button);
    }
    this.actions.hidden = (page.actions?.length ?? 0) === 0;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-story-open');
    this.openState = true;
    window.setTimeout(() => this.closeButton.focus({ preventScroll: true }), 40);
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-story-open');
    const handler = this.closeHandler;
    this.closeHandler = null;
    handler?.();
  }

  dispose(): void {
    this.root.remove();
  }
}
