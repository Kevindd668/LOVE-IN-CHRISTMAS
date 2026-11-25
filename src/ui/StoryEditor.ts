import type { PhotoMetadata } from '../photos/PhotoManager';
import type { PhotoManager } from '../photos/PhotoManager';
import type { RomanceContentStore } from '../romance/RomanceContentStore';
import { MemoryStorage } from '../storage/MemoryStorage';

export const LOCAL_PHOTOS_KEY = 'a-christmas-wish.local-photos.v1';

interface StoryEditorOptions {
  content: RomanceContentStore;
  photos: PhotoManager;
  storage: MemoryStorage;
  notify: (message: string) => void;
}

const normalizeImage = async (blob: Blob): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86)
    );
    return compressed && compressed.size < blob.size ? compressed : blob;
  } catch {
    return blob;
  }
};

export class StoryEditor {
  private readonly content: RomanceContentStore;
  private readonly photos: PhotoManager;
  private readonly storage: MemoryStorage;
  private readonly notify: (message: string) => void;
  private readonly root: HTMLElement;
  private readonly photoList: HTMLElement;
  private readonly status: HTMLElement;
  private readonly localToggle: HTMLInputElement;
  private readonly estimate: HTMLElement;
  private readonly launcher: HTMLButtonElement;
  private storageTimer = 0;

  constructor(options: StoryEditorOptions) {
    this.content = options.content;
    this.photos = options.photos;
    this.storage = options.storage;
    this.notify = options.notify;
    this.root = document.createElement('aside');
    this.root.id = 'story-editor';
    this.root.className = 'story-editor';
    this.root.innerHTML = `
      <header class="story-editor-head">
        <div><p>MAKE IT YOURS</p><h2>我们的故事</h2></div>
        <button type="button" class="story-editor-close" aria-label="关闭编辑">×</button>
      </header>
      <div class="story-editor-scroll">
        <label class="field"><span class="field-head"><span>她的昵称</span></span><input data-story="nickname" maxlength="16" /></label>
        <label class="field"><span class="field-head"><span>爱情承诺</span></span><textarea data-story="promise" rows="3" maxlength="160"></textarea></label>
        <label class="field"><span class="field-head"><span>专属信件</span></span><textarea data-story="letter" rows="7" maxlength="500"></textarea></label>
        <label class="field"><span class="field-head"><span>未来约定 · 每行一条</span></span><textarea data-story="wishes" rows="4" maxlength="260"></textarea></label>
        <div class="text-divider"><span>五个礼物</span></div>
        ${[0, 1, 2, 3, 4]
          .map(
            (index) =>
              `<label class="field"><span class="field-head"><span>礼物 ${index + 1}</span></span><textarea data-gift="${index}" rows="2" maxlength="160"></textarea></label>`
          )
          .join('')}
        <div class="text-divider"><span>照片故事</span></div>
        <div class="story-photo-editor"></div>
        <div class="text-divider"><span>本机保存</span></div>
        <label class="switch-row">
          <span><strong>在本机保存照片</strong><small>写入浏览器 IndexedDB，不上传服务器</small></span>
          <input class="story-local-toggle" type="checkbox" />
          <span class="switch-track" aria-hidden="true"></span>
        </label>
        <p class="story-editor-estimate"></p>
        <div class="story-editor-actions">
          <button type="button" class="story-save">立即保存</button>
          <button type="button" class="story-clear">清空本机照片</button>
        </div>
        <p class="story-editor-status" role="status"></p>
      </div>
    `;
    document.body.append(this.root);
    this.launcher = document.createElement('button');
    this.launcher.type = 'button';
    this.launcher.className = 'story-editor-launcher';
    this.launcher.textContent = '编辑我们的故事';
    document.body.append(this.launcher);
    if (new URLSearchParams(window.location.search).get('edit') === '1') {
      document.body.classList.add('is-edit-mode');
    }
    this.photoList = this.root.querySelector('.story-photo-editor')!;
    this.status = this.root.querySelector('.story-editor-status')!;
    this.localToggle = this.root.querySelector('.story-local-toggle')!;
    this.estimate = this.root.querySelector('.story-editor-estimate')!;
    this.localToggle.checked = this.isLocalSaveEnabled;
    this.bind();
    this.renderContent();
    this.renderPhotos();
    window.addEventListener('christmas-wish-photos-changed', () => {
      this.renderPhotos();
      this.scheduleStorageSave();
    });
    void this.updateEstimate();
  }

  get isLocalSaveEnabled(): boolean {
    try {
      return window.localStorage.getItem(LOCAL_PHOTOS_KEY) === '1';
    } catch {
      return false;
    }
  }

  private bind(): void {
    this.root.querySelector('.story-editor-close')?.addEventListener('click', () => this.close());
    this.launcher.addEventListener('click', () => this.open());
    this.root.querySelector('.story-save')?.addEventListener('click', () => void this.saveNow());
    this.root.querySelector('.story-clear')?.addEventListener('click', () => void this.clearStorage());
    this.localToggle.addEventListener('change', () => {
      try {
        window.localStorage.setItem(LOCAL_PHOTOS_KEY, this.localToggle.checked ? '1' : '0');
      } catch {
        // Ignore storage denial; the session still works.
      }
      if (this.localToggle.checked) void this.saveNow();
      this.notify(this.localToggle.checked ? '本机保存已开启' : '本机保存已关闭，本次照片仅在当前页面有效');
    });

    for (const field of this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-story]')) {
      field.addEventListener('input', () => {
        const key = field.dataset.story;
        if (key === 'wishes') {
          this.content.setWishes(
            field.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .slice(0, 5)
          );
        } else if (key === 'nickname' || key === 'promise' || key === 'letter') {
          this.content.patch({ [key]: field.value });
        }
      });
    }
    for (const field of this.root.querySelectorAll<HTMLTextAreaElement>('[data-gift]')) {
      field.addEventListener('input', () => {
        this.content.setGiftMessage(Number(field.dataset.gift), field.value);
      });
    }
  }

  private renderContent(): void {
    const value = this.content.current;
    const set = (key: string, text: string): void => {
      const field = this.root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-story="${key}"]`);
      if (field) field.value = text;
    };
    set('nickname', value.nickname);
    set('promise', value.promise);
    set('letter', value.letter);
    set('wishes', value.wishes.join('\n'));
    for (let i = 0; i < 5; i += 1) {
      const field = this.root.querySelector<HTMLTextAreaElement>(`[data-gift="${i}"]`);
      if (field) field.value = value.giftMessages[i];
    }
  }

  private renderPhotos(): void {
    this.photoList.replaceChildren();
    const views = this.photos.views;
    if (views.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'story-editor-empty';
      empty.textContent = '还没有照片。先在定制面板上传一张。';
      this.photoList.append(empty);
      return;
    }
    for (const photo of views) {
      const row = document.createElement('div');
      row.className = 'story-photo-row';
      const image = document.createElement('img');
      image.src = photo.displayUrl;
      image.alt = photo.metadata.title;
      const fields = document.createElement('div');
      fields.className = 'story-photo-fields';
      const title = document.createElement('input');
      title.value = photo.metadata.title;
      title.maxLength = 32;
      title.placeholder = '标题';
      const date = document.createElement('input');
      date.type = 'date';
      date.value = photo.metadata.date;
      const category = document.createElement('select');
      for (const [value, label] of [
        ['meeting', '初次相遇'],
        ['memory', '共同回忆'],
        ['future', '未来约定']
      ] as const) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = photo.metadata.category === value;
        category.append(option);
      }
      const description = document.createElement('textarea');
      description.rows = 2;
      description.maxLength = 160;
      description.value = photo.metadata.description;
      description.placeholder = '写给她的一段话';
      fields.append(title, date, category, description);
      row.append(image, fields);
      const apply = (patch: Partial<PhotoMetadata>): void => {
        this.photos.setMetadata(photo.id, patch);
        this.scheduleStorageSave();
      };
      title.addEventListener('input', () => apply({ title: title.value }));
      date.addEventListener('change', () => apply({ date: date.value }));
      category.addEventListener('change', () =>
        apply({ category: category.value as PhotoMetadata['category'] })
      );
      description.addEventListener('input', () => apply({ description: description.value }));
      this.photoList.append(row);
    }
  }

  private scheduleStorageSave(): void {
    if (!this.localToggle.checked) return;
    window.clearTimeout(this.storageTimer);
    this.storageTimer = window.setTimeout(() => void this.saveNow(), 900);
  }

  private async saveNow(): Promise<void> {
    if (!this.localToggle.checked) {
      this.setStatus('本机保存未开启');
      return;
    }
    const records = this.photos.getStoredRecords();
    if (records.length === 0) {
      this.setStatus('还没有上传照片，示例照片不会写入本机');
      return;
    }
    this.setStatus('正在保存到本机…');
    try {
      const compressed = [];
      for (const record of records) {
        compressed.push({ ...record, blob: await normalizeImage(record.blob) });
      }
      await this.storage.saveAll(compressed);
      this.setStatus(`已在本机保存 ${compressed.length} 张照片`);
      this.notify('照片已保存在这台设备上');
      await this.updateEstimate();
    } catch {
      this.setStatus('本机存储空间不足，当前照片仅在本次页面有效');
      this.notify('本机保存失败，照片仍然只在当前页面有效');
    }
  }

  private async clearStorage(): Promise<void> {
    window.clearTimeout(this.storageTimer);
    this.localToggle.checked = false;
    try {
      window.localStorage.setItem(LOCAL_PHOTOS_KEY, '0');
    } catch {
      // Ignore storage denial.
    }
    try {
      await this.storage.clear();
      this.setStatus('本机照片已清空，本机保存已关闭');
      this.notify('本机照片已清空');
      await this.updateEstimate();
    } catch {
      this.setStatus('清空失败，请检查浏览器存储权限');
    }
  }

  private async updateEstimate(): Promise<void> {
    try {
      const estimate = await this.storage.estimate();
      if (!estimate) {
        this.estimate.textContent = '浏览器未提供存储空间信息';
        return;
      }
      this.estimate.textContent = `本机已用 ${(estimate.usage / 1048576).toFixed(1)} MB / 可用 ${(estimate.quota / 1048576).toFixed(0)} MB`;
    } catch {
      this.estimate.textContent = '无法读取本机存储空间';
    }
  }

  private setStatus(message: string): void {
    this.status.textContent = message;
  }

  open(): void {
    document.body.classList.add('is-edit-mode', 'is-story-editor-open');
  }

  close(): void {
    document.body.classList.remove('is-story-editor-open');
  }

  dispose(): void {
    window.clearTimeout(this.storageTimer);
    this.root.remove();
    this.launcher.remove();
  }
}
