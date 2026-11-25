import { DEFAULT_SETTINGS, WISH_STORAGE_KEY, type WishSettings } from '../config';

export type SettingsKey = keyof WishSettings;
export type SettingsListener = (settings: WishSettings, changed: SettingsKey[]) => void;

const NUMBER_KEYS: SettingsKey[] = [
  'treeHeight',
  'crownRadius',
  'density',
  'layers',
  'treeRotateSpeed',
  'lightCount',
  'lightBrightness',
  'lightFlashSpeed',
  'heartCount',
  'heartSize',
  'heartSpeed',
  'photoRadius',
  'photoSpeed',
  'cardScale',
  'snowCount',
  'snowSpeed',
  'ambientBrightness',
  'musicVolume'
];

export class SettingsManager {
  private settings: WishSettings;
  private listeners = new Set<SettingsListener>();
  private saveTimer = 0;
  private readonly storage: Storage | null;

  constructor(storage?: Storage | null) {
    this.storage = storage === undefined ? this.safeStorage() : storage;
    this.settings = this.load();
  }

  private safeStorage(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      const probe = '__christmas_wish_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private load(): WishSettings {
    const next: WishSettings = {
      ...DEFAULT_SETTINGS,
      giftMessage0: DEFAULT_SETTINGS.giftMessage0,
      giftMessage1: DEFAULT_SETTINGS.giftMessage1,
      giftMessage2: DEFAULT_SETTINGS.giftMessage2
    };

    if (!this.storage) return next;

    try {
      const raw = this.storage.getItem(WISH_STORAGE_KEY);
      if (!raw) return next;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
        const value = parsed[key];
        if (value === undefined) continue;
        if (NUMBER_KEYS.includes(key as SettingsKey)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            (next as unknown as Record<string, unknown>)[key] = value;
          }
        } else if (typeof fallback === 'boolean') {
          if (typeof value === 'boolean') {
            (next as unknown as Record<string, unknown>)[key] = value;
          }
        } else if (typeof fallback === 'string' && typeof value === 'string') {
          (next as unknown as Record<string, unknown>)[key] = value.slice(0, 500);
        }
      }
    } catch {
      // A corrupted or unavailable local store should never block the gift.
    }

    return this.sanitize(next);
  }

  private sanitize(settings: WishSettings): WishSettings {
    return {
      ...settings,
      treeHeight: Math.min(12, Math.max(4, settings.treeHeight)),
      crownRadius: Math.min(4, Math.max(1.5, settings.crownRadius)),
      density: Math.min(400, Math.max(50, Math.round(settings.density))),
      layers: Math.min(12, Math.max(4, Math.round(settings.layers))),
      lightCount: Math.min(400, Math.max(40, Math.round(settings.lightCount))),
      heartCount: Math.min(1500, Math.max(120, Math.round(settings.heartCount))),
      snowCount: Math.min(3200, Math.max(200, Math.round(settings.snowCount))),
      musicVolume: Math.min(1, Math.max(0, settings.musicVolume))
    };
  }

  get current(): WishSettings {
    return this.settings;
  }

  get<K extends SettingsKey>(key: K): WishSettings[K] {
    return this.settings[key];
  }

  set<K extends SettingsKey>(key: K, value: WishSettings[K], options: { silent?: boolean } = {}): void {
    if (Object.is(this.settings[key], value)) return;
    this.settings = { ...this.settings, [key]: value };
    if (!options.silent) this.emit([key]);
    this.queueSave();
  }

  patch(partial: Partial<WishSettings>, options: { silent?: boolean } = {}): void {
    const changed: SettingsKey[] = [];
    for (const [key, value] of Object.entries(partial) as [SettingsKey, WishSettings[SettingsKey]][]) {
      if (!Object.is(this.settings[key], value)) {
        changed.push(key);
      }
    }
    if (changed.length === 0) return;
    this.settings = { ...this.settings, ...partial };
    if (!options.silent) this.emit(changed);
    this.queueSave();
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.emit(Object.keys(DEFAULT_SETTINGS) as SettingsKey[]);
    this.queueSave();
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(changed: SettingsKey[]): void {
    for (const listener of this.listeners) {
      listener(this.settings, changed);
    }
  }

  private queueSave(): void {
    if (!this.storage) return;
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        this.storage?.setItem(WISH_STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // Private browsing / quota limits are non-fatal.
      }
    }, 220);
  }
}
