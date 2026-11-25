import * as THREE from 'three';
import type { CameraManager } from '../core/CameraManager';
import type { PhotoListItem, PhotoManager } from '../photos/PhotoManager';
import type { UIManager } from '../ui/UIManager';

interface MemoryViewerOptions {
  photos: PhotoManager;
  camera: CameraManager;
  ui: UIManager;
  onOpen?: (photo: PhotoListItem) => void;
  onClose?: () => void;
}

/**
 * Photo-memory mode. The scene is never rebuilt: only the camera and photo
 * orbit are paused, then the saved camera/target are restored.
 */
export class MemoryViewer {
  private readonly photos: PhotoManager;
  private readonly camera: CameraManager;
  private readonly ui: UIManager;
  private readonly onOpen?: (photo: PhotoListItem) => void;
  private readonly onClose?: () => void;
  private activeId: string | null = null;
  private savedPosition: THREE.Vector3 | null = null;
  private savedTarget: THREE.Vector3 | null = null;
  private autoplayTimer = 0;
  private playing = false;

  constructor(options: MemoryViewerOptions) {
    this.photos = options.photos;
    this.camera = options.camera;
    this.ui = options.ui;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.ui.bindMemoryHandlers({
      onClose: () => this.close(),
      onPrev: () => this.step(-1),
      onNext: () => this.step(1),
      onTogglePlay: () => this.togglePlay()
    });
  }

  get isOpen(): boolean {
    return this.activeId !== null;
  }

  open(id: string): boolean {
    const photo = this.photos.getPhotoById(id);
    if (!photo) return false;
    const isNewSession = this.activeId === null;
    if (isNewSession) {
      this.savedPosition = this.camera.camera.position.clone();
      this.savedTarget = this.camera.controls.target.clone();
      this.camera.beginCinematic();
    }
    this.activeId = id;
    this.photos.setMemoryMode(id);
    this.photos.setSelected(id);
    const index = this.photos.views.findIndex((item) => item.id === id);
    this.ui.showMemory(photo, Math.max(0, index), this.photos.count);
    this.ui.setMemoryPlaying(this.playing);
    this.framePhoto(id);
    this.onOpen?.(photo);
    if (this.playing) this.restartAutoplay();
    return true;
  }

  private framePhoto(id: string): void {
    const position = this.photos.getPhotoPosition(id);
    if (!position) return;
    const direction = new THREE.Vector3().subVectors(this.camera.camera.position, position);
    if (direction.lengthSq() < 0.001) direction.set(0, 0, 1);
    direction.normalize();
    const target = position.clone();
    const destination = position
      .clone()
      .addScaledVector(direction, 4.2)
      .add(new THREE.Vector3(0, 0.12, 0));
    this.camera.animateTo(destination, target, 1.1, false);
  }

  private step(direction: -1 | 1): void {
    if (!this.activeId) return;
    const views = this.photos.views;
    const current = views.findIndex((item) => item.id === this.activeId);
    if (current < 0 || views.length === 0) return;
    const next = (current + direction + views.length) % views.length;
    this.open(views[next].id);
  }

  private restartAutoplay(): void {
    window.clearTimeout(this.autoplayTimer);
    this.autoplayTimer = window.setTimeout(() => {
      if (!this.activeId || !this.playing) return;
      this.step(1);
      this.restartAutoplay();
    }, 5000);
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    this.ui.setMemoryPlaying(this.playing);
    if (this.playing) this.restartAutoplay();
    else window.clearTimeout(this.autoplayTimer);
  }

  close(): void {
    if (!this.activeId) return;
    this.activeId = null;
    this.playing = false;
    window.clearTimeout(this.autoplayTimer);
    this.photos.setMemoryMode(null);
    this.photos.setSelected(null);
    this.ui.closeLightbox();
    if (this.savedPosition && this.savedTarget) {
      this.camera.animateTo(this.savedPosition, this.savedTarget, 1.05, true);
    } else {
      this.camera.endCinematic();
      this.camera.resetView();
    }
    this.savedPosition = null;
    this.savedTarget = null;
    this.onClose?.();
  }

  dispose(): void {
    window.clearTimeout(this.autoplayTimer);
    if (this.activeId) this.close();
  }
}
