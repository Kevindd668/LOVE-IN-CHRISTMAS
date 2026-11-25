import type { HeartParticleSystem } from '../particles/HeartParticleSystem';
import type { LoveNumbersController } from '../romance/LoveNumbersController';
import type { RomanceStateManager } from '../romance/RomanceStateManager';
import type { StoryOverlay } from '../ui/StoryOverlay';
import type { GiftContentManager, GiftExperience } from './GiftContentManager';

interface GiftExperienceViewerOptions {
  gifts: GiftContentManager;
  overlay: StoryOverlay;
  state: RomanceStateManager;
  heart: HeartParticleSystem;
  numbers: LoveNumbersController;
}

export class GiftExperienceViewer {
  private readonly gifts: GiftContentManager;
  private readonly overlay: StoryOverlay;
  private readonly state: RomanceStateManager;
  private readonly heart: HeartParticleSystem;
  private readonly numbers: LoveNumbersController;
  private active: GiftExperience | null = null;
  private albumIndex = 0;
  private closing = false;

  constructor(options: GiftExperienceViewerOptions) {
    this.gifts = options.gifts;
    this.overlay = options.overlay;
    this.state = options.state;
    this.heart = options.heart;
    this.numbers = options.numbers;
  }

  open(index: number): void {
    if (this.active) this.close();
    const gift = this.gifts.get(index);
    this.active = gift;
    this.albumIndex = 0;
    this.closing = false;
    this.state.begin(gift.kind === 'finale' ? 'finale' : 'gift');
    this.overlay.setCloseHandler(() => this.close());
    if (gift.kind === 'finale') {
      this.heart.setPaused(false);
      this.heart.gather(performance.now() / 1000);
      this.numbers.setMode('finale');
    }
    this.render(gift);
  }

  private render(gift: GiftExperience): void {
    if (gift.kind === 'photo') {
      const photo = gift.photos[0];
      this.overlay.show({
        kicker: gift.kicker,
        title: photo?.metadata.title || gift.title,
        body: photo?.metadata.description || gift.body,
        signature: photo?.metadata.date ? photo.metadata.date.replaceAll('-', ' · ') : undefined,
        image: photo?.displayUrl,
        actions: [{ label: '收下这份回忆', primary: true, onClick: () => this.close() }]
      });
      return;
    }
    if (gift.kind === 'album') {
      const photos = gift.photos;
      const photo = photos[this.albumIndex];
      this.overlay.show({
        kicker: gift.kicker,
        title: photo?.metadata.title || gift.title,
        body: photo?.metadata.description || gift.body,
        signature: photo?.metadata.date ? photo.metadata.date.replaceAll('-', ' · ') : undefined,
        image: photo?.displayUrl,
        counter: photos.length > 0 ? `${this.albumIndex + 1} / ${photos.length}` : undefined,
        actions: photos.length > 1
          ? [
              { label: '上一张', onClick: () => this.albumStep(-1) },
              { label: '下一张', primary: true, onClick: () => this.albumStep(1) },
              { label: '合上相册', onClick: () => this.close() }
            ]
          : [{ label: '收下这份回忆', primary: true, onClick: () => this.close() }]
      });
      return;
    }
    if (gift.kind === 'letter') {
      this.overlay.show({
        kicker: gift.kicker,
        title: gift.title,
        body: gift.body,
        signature: `—— 永远爱你的我`,
        actions: [{ label: '把信收好', primary: true, onClick: () => this.close() }]
      });
      return;
    }
    if (gift.kind === 'promises') {
      this.overlay.show({
        kicker: gift.kicker,
        title: gift.title,
        body: gift.body,
        list: gift.wishes,
        actions: [{ label: '一起完成', primary: true, onClick: () => this.close() }]
      });
      return;
    }
    this.overlay.show({
      kicker: gift.kicker,
      title: '原来我想要的圣诞礼物，一直都是你。',
      body: gift.body,
      signature: '—— 给最重要的你',
      actions: [{ label: '抱住这个冬天', primary: true, onClick: () => this.close() }]
    });
  }

  private albumStep(direction: -1 | 1): void {
    const gift = this.active;
    if (!gift || gift.kind !== 'album' || gift.photos.length === 0) return;
    this.albumIndex = (this.albumIndex + direction + gift.photos.length) % gift.photos.length;
    this.render(gift);
  }

  close(): void {
    if (!this.active || this.closing) return;
    this.closing = true;
    this.overlay.close();
    this.active = null;
    this.heart.setMode('heart');
    this.numbers.setMode('idle');
    this.state.end();
    this.closing = false;
  }

  get isOpen(): boolean {
    return this.active !== null;
  }
}
