export type RomanceMode = 'idle' | 'heart' | 'numbers' | 'memory' | 'promise' | 'gift' | 'finale';

export class RomanceStateManager {
  private mode: RomanceMode = 'idle';
  private listeners = new Set<(mode: RomanceMode) => void>();

  get current(): RomanceMode {
    return this.mode;
  }

  get isBusy(): boolean {
    return this.mode !== 'idle';
  }

  begin(mode: Exclude<RomanceMode, 'idle'>): boolean {
    if (this.mode !== 'idle' && this.mode !== mode) return false;
    this.mode = mode;
    this.emit();
    return true;
  }

  set(mode: RomanceMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.emit();
  }

  end(): void {
    if (this.mode === 'idle') return;
    this.mode = 'idle';
    this.emit();
  }

  subscribe(listener: (mode: RomanceMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.mode);
  }
}
