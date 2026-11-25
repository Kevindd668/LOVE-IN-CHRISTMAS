import {
  LIGHT_PALETTES,
  type LightMode,
  type QualityLevel,
  type WishSettings
} from '../config';
import { formatHex } from '../core/utils';
import type { SettingsKey, SettingsManager } from './SettingsManager';

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface ControlPanelOptions {
  settings: SettingsManager;
  onQuality: (quality: QualityLevel) => void;
  onReset: () => void;
  onRomance: () => void;
  onNotify: (message: string) => void;
}

const INTEGER_KEYS = new Set<SettingsKey>(['density', 'layers', 'lightCount', 'heartCount', 'snowCount']);
const ONE_DECIMAL_KEYS = new Set<SettingsKey>(['treeHeight']);
const TWO_DECIMAL_KEYS = new Set<SettingsKey>([
  'crownRadius',
  'treeRotateSpeed',
  'lightBrightness',
  'lightFlashSpeed',
  'heartSize',
  'heartSpeed',
  'photoRadius',
  'photoSpeed',
  'cardScale',
  'snowSpeed',
  'ambientBrightness',
  'musicVolume'
]);

const formatOutput = (key: SettingsKey, value: WishSettings[SettingsKey]): string => {
  if (INTEGER_KEYS.has(key)) return String(Math.round(Number(value)));
  if (ONE_DECIMAL_KEYS.has(key)) return Number(value).toFixed(1);
  if (TWO_DECIMAL_KEYS.has(key)) return Number(value).toFixed(2);
  return String(value);
};

export class ControlPanel {
  private readonly settings: SettingsManager;
  private readonly options: ControlPanelOptions;
  private readonly panel: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly backdrop: HTMLButtonElement;
  private readonly formControls: FormControl[] = [];
  private readonly qualityButtons: HTMLButtonElement[];
  private openState = false;
  private unsubscribe: (() => void) | null = null;

  constructor(options: ControlPanelOptions) {
    this.settings = options.settings;
    this.options = options;
    this.panel = document.querySelector<HTMLElement>('#control-panel')!;
    this.toggleButton = document.querySelector<HTMLButtonElement>('#btn-panel')!;
    this.closeButton = document.querySelector<HTMLButtonElement>('#btn-panel-close')!;
    this.backdrop = document.querySelector<HTMLButtonElement>('#panel-backdrop')!;
    this.qualityButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-quality]')];

    this.bindControls();
    this.bindPanelControls();
    this.buildMediaState();

    this.unsubscribe = this.settings.subscribe((settings) => this.sync(settings));
    this.sync(this.settings.current);

    if (window.innerWidth > 1100) {
      this.open();
    } else {
      this.close();
    }
  }

  private buildMediaState(): void {
    const media = window.matchMedia('(max-width: 980px)');
    const onChange = (): void => {
      document.body.classList.toggle('panel-open', this.openState);
      if (!media.matches && this.openState) {
        document.body.classList.remove('panel-open');
      }
    };
    media.addEventListener('change', onChange);
    onChange();
  }

  private bindPanelControls(): void {
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.closeButton.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    document.querySelector<HTMLButtonElement>('#btn-romance-panel')?.addEventListener('click', () => {
      this.close();
      this.options.onRomance();
    });

    document.querySelector<HTMLButtonElement>('#btn-reset-settings')?.addEventListener('click', () => {
      this.options.onReset();
      this.sync(this.settings.current);
      this.options.onNotify('所有场景参数已回到最初的圣诞夜');
    });

    for (const button of this.qualityButtons) {
      button.addEventListener('click', () => {
        const quality = button.dataset.quality as QualityLevel | undefined;
        if (!quality) return;
        this.options.onQuality(quality);
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.openState) return;
      const overlaysOpen =
        document.querySelector('.cinema.is-active') ||
        document.querySelector('.wish-overlay.is-open') ||
        document.querySelector('.photo-lightbox.is-open');
      if (!overlaysOpen) this.close();
    });
  }

  private bindControls(): void {
    const controls = document.querySelectorAll<FormControl>('[data-setting]');
    for (const control of controls) {
      this.formControls.push(control);
      const eventName =
        control instanceof HTMLInputElement && control.type === 'range' ? 'input' : 'input';
      control.addEventListener(eventName, () => this.handleControlInput(control));
      if (
        control instanceof HTMLSelectElement ||
        (control instanceof HTMLInputElement && control.type === 'checkbox')
      ) {
        control.addEventListener('change', () => this.handleControlInput(control));
      }
    }
  }

  private handleControlInput(control: FormControl): void {
    const key = control.dataset.setting as SettingsKey | undefined;
    if (!key) return;

    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox') {
        this.settings.set(key, control.checked as WishSettings[SettingsKey]);
        return;
      }
      if (control.type === 'color') {
        this.settings.set(key, control.value as WishSettings[SettingsKey]);
        return;
      }
      if (control.type === 'range' || control.type === 'number') {
        const min = control.min !== '' ? Number(control.min) : -Infinity;
        const max = control.max !== '' ? Number(control.max) : Infinity;
        const value = Number(control.value);
        if (!Number.isFinite(value)) return;
        const clamped = Math.min(max, Math.max(min, value));
        this.updateRangeFill(control);
        this.settings.set(key, clamped as WishSettings[SettingsKey]);
        return;
      }
      if (control.type === 'text') {
        this.settings.set(key, control.value as WishSettings[SettingsKey]);
        return;
      }
    }

    if (control instanceof HTMLTextAreaElement) {
      this.settings.set(key, control.value as WishSettings[SettingsKey]);
      return;
    }

    if (control instanceof HTMLSelectElement) {
      if (key === 'lightMode') {
        const mode = control.value as LightMode;
        this.settings.patch({
          lightMode: mode,
          lightColor: LIGHT_PALETTES[mode]?.[0] ?? this.settings.get('lightColor')
        });
      } else {
        this.settings.set(key, control.value as WishSettings[SettingsKey]);
      }
    }
  }

  private updateRangeFill(input: HTMLInputElement): void {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const ratio = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--p', `${Math.max(0, Math.min(100, ratio))}%`);
  }

  private sync(settings: WishSettings): void {
    for (const control of this.formControls) {
      const key = control.dataset.setting as SettingsKey | undefined;
      if (!key) continue;
      const value = settings[key];

      if (control instanceof HTMLInputElement) {
        if (control.type === 'checkbox') {
          control.checked = Boolean(value);
        } else if (control.type === 'color') {
          control.value = String(value);
          const label = document.querySelector(`[data-color-for="${key}"]`);
          if (label) label.textContent = formatHex(String(value));
        } else if (control.type === 'range' || control.type === 'number') {
          if (document.activeElement !== control || control.type === 'range') {
            control.value = String(value);
          }
          this.updateRangeFill(control);
        } else if (control.type === 'text') {
          if (document.activeElement !== control) control.value = String(value);
        }
        const output = document.querySelector(`output[data-for="${key}"]`);
        if (output) output.textContent = formatOutput(key, value);
      } else if (control instanceof HTMLTextAreaElement) {
        if (document.activeElement !== control) control.value = String(value);
      } else if (control instanceof HTMLSelectElement) {
        control.value = String(value);
      }
    }

    for (const button of this.qualityButtons) {
      button.classList.toggle('is-active', button.dataset.quality === settings.quality);
    }
  }

  open(): void {
    this.openState = true;
    this.panel.classList.add('is-open');
    this.panel.setAttribute('aria-hidden', 'false');
    this.toggleButton.setAttribute('aria-expanded', 'true');
    if (window.matchMedia('(max-width: 980px)').matches) {
      document.body.classList.add('panel-open');
    }
  }

  close(): void {
    this.openState = false;
    this.panel.classList.remove('is-open');
    this.panel.setAttribute('aria-hidden', 'true');
    this.toggleButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('panel-open');
  }

  toggle(): void {
    if (this.openState) this.close();
    else this.open();
  }

  get isOpen(): boolean {
    return this.openState;
  }

  setStats(fps: number, drawCalls: number): void {
    const fpsValue = document.querySelector<HTMLElement>('#fps-value');
    const drawValue = document.querySelector<HTMLElement>('#drawcall-value');
    if (fpsValue) fpsValue.textContent = String(fps);
    if (drawValue) drawValue.textContent = String(drawCalls);
  }

  refresh(): void {
    this.sync(this.settings.current);
  }

  dispose(): void {
    this.unsubscribe?.();
  }
}
