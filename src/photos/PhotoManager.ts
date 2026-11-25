import * as THREE from 'three';
import { DEFAULT_CAPTIONS, PHOTO_MAX } from '../config';
import { easeOutCubic } from '../core/utils';
import { PhotoCard } from './PhotoCard';
import { PhotoOrbit, type PhotoOrbitSettings } from './PhotoOrbit';
import { createPlaceholderArt } from './placeholderArt';

export type MemoryCategory = 'meeting' | 'memory' | 'future';

export interface PhotoMetadata {
  title: string;
  date: string;
  description: string;
  category: MemoryCategory;
}

export interface StoredPhotoRecord {
  id: string;
  name: string;
  mime: string;
  blob: Blob;
  metadata: PhotoMetadata;
  order: number;
}

export interface PhotoRecord {
  id: string;
  texture: THREE.Texture;
  displayUrl: string;
  fileName: string;
  caption: string;
  isDefault: boolean;
  objectUrl?: string;
  blob?: Blob;
  metadata: PhotoMetadata;
}

export interface PhotoListItem {
  id: string;
  displayUrl: string;
  fileName: string;
  caption: string;
  isDefault: boolean;
  track: number;
  metadata: PhotoMetadata;
}

export interface PhotoAddResult {
  added: number;
  rejected: string[];
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_BYTES = 30 * 1024 * 1024;

const createId = (): string =>
  `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isValidImageFile = (file: File): boolean =>
  ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.test(file.name);

export class PhotoManager {
  readonly group = new THREE.Group();
  private records: PhotoRecord[] = [];
  private readonly cards = new Map<string, PhotoCard>();
  private readonly orbit = new PhotoOrbit();
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly scales = new Map<string, number>();
  private reveal = 1;
  private showCaptions = true;
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private memoryId: string | null = null;
  private lastCaptionState = true;
  onChange: (() => void) | null = null;

  constructor() {
    this.group.name = 'floating-photos';
    this.createDefaultPhotos();
    this.syncOrbit();
  }

  private createDefaultPhotos(): void {
    // Initial scene: 6 photos = 3 left + 3 right. Uploads grow the orbit up
    // to the existing 24-photo maximum.
    for (let i = 0; i < 6; i += 1) {
      const art = createPlaceholderArt(i);
      const caption = DEFAULT_CAPTIONS[i] ?? '我们的故事';
      const record: PhotoRecord = {
        id: `default-${i + 1}`,
        texture: art.texture,
        displayUrl: art.dataUrl,
        fileName: `winter-memory-${i + 1}.jpg`,
        caption,
        isDefault: true,
        metadata: {
          title: caption,
          date: '',
          description: '',
          category: i < 3 ? 'meeting' : 'memory'
        }
      };
      this.records.push(record);
      const card = new PhotoCard({
        id: record.id,
        texture: record.texture,
        caption: record.caption,
        fileName: record.fileName
      });
      this.cards.set(record.id, card);
      this.scales.set(record.id, 0.01);
      this.group.add(card.group);
    }
  }

  private syncOrbit(): void {
    const ordered = this.records
      .map((record) => this.cards.get(record.id))
      .filter((card): card is PhotoCard => Boolean(card));
    this.orbit.sync(ordered);
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        () => reject(new Error('图片解码失败'))
      );
    });
  }

  private async createRecordFromFile(file: File): Promise<PhotoRecord> {
    const objectUrl = URL.createObjectURL(file);
    const texture = await this.loadTexture(objectUrl).catch((error: unknown) => {
      URL.revokeObjectURL(objectUrl);
      throw error;
    });
    return {
      id: createId(),
      texture,
      displayUrl: objectUrl,
      objectUrl,
      blob: file,
      fileName: file.name,
      caption: '我们的新回忆',
      isDefault: false,
      metadata: {
        title: '我们的新回忆',
        date: '',
        description: '',
        category: 'memory'
      }
    };
  }

  async addFiles(files: FileList | File[]): Promise<PhotoAddResult> {
    const list = Array.from(files);
    const rejected: string[] = [];
    let accepted = list.filter((file) => {
      if (!isValidImageFile(file)) {
        rejected.push(`${file.name} · 格式不支持`);
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} · 文件超过 30MB`);
        return false;
      }
      return true;
    });
    const remaining = PHOTO_MAX - this.records.length;
    if (remaining <= 0) {
      return { added: 0, rejected: ['最多只能播放 24 张照片'] };
    }
    if (accepted.length > remaining) {
      rejected.push(`最多还能加入 ${remaining} 张照片`);
      accepted = accepted.slice(0, remaining);
    }

    const loaded: PhotoRecord[] = [];
    for (const file of accepted) {
      try {
        const record = await this.createRecordFromFile(file);
        loaded.push(record);
      } catch {
        rejected.push(`${file.name} · 无法读取`);
      }
    }

    for (const record of loaded) {
      this.records.push(record);
      const card = new PhotoCard({
        id: record.id,
        texture: record.texture,
        caption: record.caption,
        fileName: record.fileName
      });
      card.setCaptionsVisible(this.showCaptions);
      this.cards.set(record.id, card);
      this.scales.set(record.id, 0.01);
      this.group.add(card.group);
    }
    this.syncOrbit();
    this.reveal = 1;
    this.onChange?.();
    return { added: loaded.length, rejected };
  }

  async replacePhoto(id: string, file: File): Promise<PhotoAddResult> {
    if (!isValidImageFile(file)) {
      return { added: 0, rejected: [`${file.name} · 格式不支持`] };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { added: 0, rejected: [`${file.name} · 文件超过 30MB`] };
    }
    const record = this.records.find((item) => item.id === id);
    const card = this.cards.get(id);
    if (!record || !card) {
      return { added: 0, rejected: ['这张照片已经不存在了'] };
    }

    let next: PhotoRecord | null = null;
    try {
      next = await this.createRecordFromFile(file);
    } catch {
      return { added: 0, rejected: [`${file.name} · 无法读取`] };
    }

    const oldTexture = record.texture;
    const oldObjectUrl = record.objectUrl;
    record.texture = next.texture;
    record.displayUrl = next.displayUrl;
    record.fileName = next.fileName;
    record.objectUrl = next.objectUrl;
    record.isDefault = false;
    card.setTexture(next.texture, next.fileName);
    this.onChange?.();
    oldTexture.dispose();
    if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
    return { added: 1, rejected: [] };
  }

  removePhoto(id: string): boolean {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const record = this.records[index];
    const card = this.cards.get(id);
    if (card) {
      this.group.remove(card.group);
      card.dispose();
      this.cards.delete(id);
    }
    this.scales.delete(id);
    this.records.splice(index, 1);
    record.texture.dispose();
    if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    this.syncOrbit();
    this.onChange?.();
    return true;
  }

  movePhoto(id: string, direction: -1 | 1): boolean {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const target = index + direction;
    if (target < 0 || target >= this.records.length) return false;
    const [record] = this.records.splice(index, 1);
    this.records.splice(target, 0, record);
    this.syncOrbit();
    this.onChange?.();
    return true;
  }

  setCaption(id: string, caption: string): void {
    this.setMetadata(id, { title: caption });
  }

  setMetadata(id: string, patch: Partial<PhotoMetadata>): void {
    const record = this.records.find((item) => item.id === id);
    const card = this.cards.get(id);
    if (!record || !card) return;
    const next = { ...record.metadata, ...patch };
    next.title = next.title.slice(0, 32);
    next.description = next.description.slice(0, 160);
    next.date = /^\d{4}-\d{2}-\d{2}$/.test(next.date) ? next.date : '';
    if (!['meeting', 'memory', 'future'].includes(next.category)) next.category = 'memory';
    record.metadata = next;
    record.caption = next.title || '我们的故事';
    card.setCaption(record.caption);
  }

  getMetadata(id: string): PhotoMetadata | null {
    return this.records.find((record) => record.id === id)?.metadata ?? null;
  }

  getPhotoBlob(id: string): Blob | null {
    return this.records.find((record) => record.id === id)?.blob ?? null;
  }

  getPhotoPosition(id: string): THREE.Vector3 | null {
    return this.cards.get(id)?.group.getWorldPosition(new THREE.Vector3()) ?? null;
  }

  setMemoryMode(id: string | null): void {
    this.memoryId = id;
    this.selectedId = id;
  }

  get memoryModeId(): string | null {
    return this.memoryId;
  }

  async addStoredRecords(items: StoredPhotoRecord[]): Promise<number> {
    let added = 0;
    for (const item of items.slice(0, Math.max(0, PHOTO_MAX - this.records.length))) {
      try {
        const file = new File([item.blob], item.name, { type: item.mime || 'image/jpeg' });
        const record = await this.createRecordFromFile(file);
        record.id = item.id;
        record.metadata = { ...item.metadata };
        record.caption = record.metadata.title || '我们的故事';
        record.isDefault = false;
        const card = new PhotoCard({
          id: record.id,
          texture: record.texture,
          caption: record.caption,
          fileName: record.fileName
        });
        card.setCaptionsVisible(this.showCaptions);
        this.records.push(record);
        this.cards.set(record.id, card);
        this.scales.set(record.id, 0.01);
        this.group.add(card.group);
        added += 1;
      } catch {
        // A single corrupt stored photo must not block the rest.
      }
    }
    if (added > 0) {
      this.syncOrbit();
      this.reveal = 1;
      this.onChange?.();
    }
    return added;
  }

  getStoredRecords(): StoredPhotoRecord[] {
    return this.records
      .map((record, order) => ({ record, order }))
      .filter(({ record }) => !record.isDefault && record.blob)
      .map(({ record, order }) => ({
        id: record.id,
        name: record.fileName,
        mime: record.blob?.type || 'image/jpeg',
        blob: record.blob!,
        metadata: { ...record.metadata },
        order
      }));
  }

  removeDefaultPhotos(): void {
    for (const record of [...this.records]) {
      if (record.isDefault) this.removePhoto(record.id);
    }
  }

  clearAll(): void {
    for (const record of [...this.records]) this.removePhoto(record.id);
  }

  setShowCaptions(show: boolean): void {
    this.showCaptions = show;
    if (this.lastCaptionState === show) return;
    this.lastCaptionState = show;
    for (const card of this.cards.values()) {
      card.setCaptionsVisible(show);
    }
  }

  setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    for (const [cardId, card] of this.cards) {
      card.setHovered(cardId === id);
    }
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
  }

  setReveal(progress: number): void {
    this.reveal = Math.min(1, Math.max(0, progress));
  }

  getPhotoById(id: string): PhotoListItem | null {
    const record = this.records.find((item) => item.id === id);
    if (!record) return null;
    return {
      id: record.id,
      displayUrl: record.displayUrl,
      fileName: record.fileName,
      caption: record.caption,
      isDefault: record.isDefault,
      track: this.orbit.getTrack(record.id),
      metadata: { ...record.metadata }
    };
  }

  update(
    dt: number,
    time: number,
    camera: THREE.Camera,
    settings: PhotoOrbitSettings & { cardScale: number; showCaptions: boolean }
  ): void {
    if (this.lastCaptionState !== settings.showCaptions) {
      this.lastCaptionState = settings.showCaptions;
      this.showCaptions = settings.showCaptions;
      for (const card of this.cards.values()) {
        card.setCaptionsVisible(settings.showCaptions);
      }
    }

    this.orbit.update(dt, time, camera, {
      ...settings,
      photosPaused: settings.photosPaused || Boolean(this.memoryId),
      frozen: Boolean(this.memoryId)
    });

    const orderedIds = this.records.map((record) => record.id);
    const densityScale =
      this.records.length > 18 ? 0.74 : this.records.length > 12 ? 0.88 : 1;
    const focusedId = this.selectedId ?? this.hoveredId;
    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index];
      const card = this.cards.get(id);
      if (!card) continue;
      const focused = focusedId === id;
      const dimmed = Boolean(focusedId) && !focused;
      card.setFocus(focused, dimmed);
      const staggerStart = index * 0.014;
      const rawReveal =
        this.reveal >= 1
          ? 1
          : Math.min(1, Math.max(0, (this.reveal - staggerStart) / 0.4));
      const appear = this.reveal >= 1 ? 1 : easeOutCubic(rawReveal);
      card.group.visible = rawReveal > 0.002;
      let targetScale =
        settings.cardScale *
        densityScale *
        card.getScaleBoost() *
        (focused ? 1.3 : 1) *
        (dimmed ? 0.94 : 1) *
        (this.reveal >= 1 ? 1 : 0.08 + 0.92 * appear);
      if (camera instanceof THREE.PerspectiveCamera) {
        // Safety net: a photo card must never balloon over the lens if the
        // user zooms in while the orbit radius/size sliders are at their max.
        const distance = camera.position.distanceTo(card.group.position);
        const viewHalfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const maxScale = (0.34 * 2 * Math.max(1, distance) * viewHalfHeight) / 1.4;
        targetScale = Math.min(targetScale, Math.max(0.24, maxScale));
      }
      const current = this.scales.get(id) ?? 0.01;
      const next = current + (targetScale - current) * (1 - Math.exp(-7.2 * dt));
      this.scales.set(id, next);
      card.group.scale.setScalar(next);
      card.update(dt);
    }
  }

  getPickMeshes(): THREE.Object3D[] {
    return [...this.cards.values()].flatMap((card) => card.getPickMeshes());
  }

  get views(): PhotoListItem[] {
    return this.records.map((record) => ({
      id: record.id,
      displayUrl: record.displayUrl,
      fileName: record.fileName,
      caption: record.caption,
      isDefault: record.isDefault,
      track: this.orbit.getTrack(record.id),
      metadata: { ...record.metadata }
    }));
  }

  get count(): number {
    return this.records.length;
  }

  dispose(): void {
    for (const card of this.cards.values()) {
      card.dispose();
    }
    for (const record of this.records) {
      record.texture.dispose();
      if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
    }
    this.cards.clear();
    this.records = [];
    this.group.clear();
  }
}
