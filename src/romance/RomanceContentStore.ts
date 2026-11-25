export const ROMANCE_STORAGE_KEY = 'a-christmas-wish.romance.v1';

export interface RomanceContent {
  version: 1;
  nickname: string;
  promise: string;
  letter: string;
  wishes: string[];
  giftMessages: [string, string, string, string, string];
}

const DEFAULT_CONTENT: RomanceContent = {
  version: 1,
  nickname: '我的女孩',
  promise: '我想陪你度过的不只是圣诞节，而是未来每一个平凡的日子。',
  letter:
    '谢谢你出现在我的生活里。\n\n从遇见你的那一天开始，普通的冬天也有了值得期待的理由。\n\n我想和你一起看很多场雪，也想陪你度过每一个不需要理由的普通日子。\n\n圣诞快乐，我最喜欢的人。',
  wishes: ['想和你一起去看海。', '想陪你过很多次生日。', '想和你看遍不同城市的雪。'],
  giftMessages: [
    '今年的圣诞礼物，是希望未来每一个冬天都有你。',
    '和你在一起以后，连冬天都开始变得温柔。',
    '有些话想写给你，慢慢看完就好。',
    '想和你一起，把未来过成我们喜欢的样子。',
    '这一份小小的心意，藏着我全部的喜欢。'
  ]
};

const sanitizeText = (value: unknown, fallback: string, maxLength: number): string => {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
};

const sanitize = (raw: unknown): RomanceContent => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const wishes = Array.isArray(source.wishes)
    ? source.wishes
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 5)
        .map((item) => item.slice(0, 80))
    : DEFAULT_CONTENT.wishes;
  const messages = Array.isArray(source.giftMessages)
    ? source.giftMessages
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 5)
        .map((item) => item.slice(0, 160))
    : [];
  return {
    version: 1,
    nickname: sanitizeText(source.nickname, DEFAULT_CONTENT.nickname, 16),
    promise: sanitizeText(source.promise, DEFAULT_CONTENT.promise, 160),
    letter: sanitizeText(source.letter, DEFAULT_CONTENT.letter, 500),
    wishes: wishes.length > 0 ? wishes : [...DEFAULT_CONTENT.wishes],
    giftMessages: [0, 1, 2, 3, 4].map((index) =>
      messages[index] ?? DEFAULT_CONTENT.giftMessages[index]
    ) as RomanceContent['giftMessages']
  };
};

export class RomanceContentStore {
  private content: RomanceContent;
  private listeners = new Set<(content: RomanceContent) => void>();
  private saveTimer = 0;

  constructor() {
    this.content = this.load();
  }

  private load(): RomanceContent {
    try {
      const raw = window.localStorage.getItem(ROMANCE_STORAGE_KEY);
      if (!raw) {
        const migrated = this.migrateLegacyGiftMessages();
        return migrated ?? { ...DEFAULT_CONTENT, wishes: [...DEFAULT_CONTENT.wishes], giftMessages: [...DEFAULT_CONTENT.giftMessages] as RomanceContent['giftMessages'] };
      }
      return sanitize(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_CONTENT, wishes: [...DEFAULT_CONTENT.wishes], giftMessages: [...DEFAULT_CONTENT.giftMessages] as RomanceContent['giftMessages'] };
    }
  }

  private migrateLegacyGiftMessages(): RomanceContent | null {
    try {
      const raw = window.localStorage.getItem('a-christmas-wish.settings.v1');
      if (!raw) return null;
      const settings = JSON.parse(raw) as Record<string, unknown>;
      const legacy = [settings.giftMessage0, settings.giftMessage1, settings.giftMessage2]
        .filter((value): value is string => typeof value === 'string' && value.length > 0);
      if (legacy.length === 0) return null;
      return sanitize({ ...DEFAULT_CONTENT, giftMessages: legacy });
    } catch {
      return null;
    }
  }

  get current(): RomanceContent {
    return this.content;
  }

  get<K extends keyof RomanceContent>(key: K): RomanceContent[K] {
    return this.content[key];
  }

  patch(partial: Partial<RomanceContent>): void {
    this.content = sanitize({ ...this.content, ...partial });
    this.emit();
    this.queueSave();
  }

  setWishes(wishes: string[]): void {
    this.patch({ wishes });
  }

  setGiftMessage(index: number, message: string): void {
    const next = [...this.content.giftMessages] as RomanceContent['giftMessages'];
    if (index < 0 || index >= next.length) return;
    next[index] = message;
    this.patch({ giftMessages: next });
  }

  subscribe(listener: (content: RomanceContent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.content = sanitize({ ...DEFAULT_CONTENT });
    this.emit();
    this.queueSave();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.content);
  }

  private queueSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(ROMANCE_STORAGE_KEY, JSON.stringify(this.content));
      } catch {
        // Local storage may be unavailable; the in-memory content still works.
      }
    }, 450);
  }
}
