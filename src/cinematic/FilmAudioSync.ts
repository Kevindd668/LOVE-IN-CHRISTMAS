import type { MusicTrack } from '../config';
import type { MusicEngine } from '../audio/MusicEngine';
import type { SettingsManager } from '../ui/SettingsManager';

/**
 * Adapter over the one existing MusicEngine. No second player is created.
 */
export class FilmAudioSync {
  private readonly music: MusicEngine;
  private readonly settings: SettingsManager;
  private active = false;
  private paused = false;
  private previousEnabled = false;
  private previousTrack: MusicTrack = 'starlight';
  private previousVolume = 0.45;

  constructor(music: MusicEngine, settings: SettingsManager) {
    this.music = music;
    this.settings = settings;
  }

  get isActive(): boolean {
    return this.active;
  }

  begin(): void {
    if (this.active) return;
    this.previousEnabled = this.music.isEnabled;
    this.previousTrack = this.music.currentTrack;
    this.previousVolume = this.settings.get('musicVolume');
    this.paused = false;
    // The entry button is the explicit user gesture. The film may start its
    // score even if ambient music was muted; exit restores that muted state.
    this.active = true;
    void this.music.enable(this.settings.get('musicTrack'), this.previousVolume);
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    void this.music.pauseFilm();
  }

  resume(): void {
    if (!this.active || !this.paused) return;
    this.paused = false;
    void this.music.resumeFilm();
  }

  seek(seconds: number): void {
    if (!this.active || !this.music.isEnabled) return;
    this.music.seekFilm(seconds);
  }

  cue(name: 'gift' | 'star' | 'tap' | 'photo'): void {
    if (!this.active || this.paused) return;
    this.music.playEffect(name);
  }

  end(): void {
    if (!this.active) {
      this.active = false;
      this.paused = false;
      return;
    }
    this.active = false;
    this.paused = false;
    if (this.previousEnabled) {
      void this.music.enable(this.previousTrack, this.previousVolume);
    } else {
      this.music.disable();
    }
  }
}
