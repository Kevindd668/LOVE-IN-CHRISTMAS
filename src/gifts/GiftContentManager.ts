import type { PhotoManager, PhotoListItem } from '../photos/PhotoManager';
import type { RomanceContentStore } from '../romance/RomanceContentStore';

export type GiftExperienceKind = 'photo' | 'album' | 'letter' | 'promises' | 'finale';

export interface GiftExperience {
  index: number;
  kind: GiftExperienceKind;
  title: string;
  kicker: string;
  body: string;
  photos: PhotoListItem[];
  wishes: string[];
}

const KICKERS = [
  'A FIRST MEMORY',
  'OUR LITTLE ALBUM',
  'A LETTER FOR YOU',
  'OUR FUTURE WISHES',
  'THE CHRISTMAS SURPRISE'
] as const;

const TITLES = [
  '第一次遇见你',
  '我们的回忆',
  '想对你说',
  '未来约定',
  '圣诞惊喜'
] as const;

export class GiftContentManager {
  constructor(
    private readonly content: RomanceContentStore,
    private readonly photos: PhotoManager
  ) {}

  get(index: number): GiftExperience {
    const views = this.photos.views;
    const kind: GiftExperienceKind =
      index === 0 ? 'photo' : index === 1 ? 'album' : index === 2 ? 'letter' : index === 3 ? 'promises' : 'finale';
    const selected =
      kind === 'photo' ? views.slice(0, 1) : kind === 'album' ? views.slice(1, 7) : [];
    return {
      index,
      kind,
      title: TITLES[index] ?? TITLES[TITLES.length - 1],
      kicker: KICKERS[index] ?? KICKERS[KICKERS.length - 1],
      body:
        kind === 'letter'
          ? this.content.current.letter
          : kind === 'promises'
            ? '想和你一起，把未来过成我们喜欢的样子。'
            : this.content.current.giftMessages[index] ?? this.content.current.giftMessages[4],
      photos: selected,
      wishes: this.content.current.wishes
    };
  }
}
