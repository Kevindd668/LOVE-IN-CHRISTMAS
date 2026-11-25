import type { PhotoListItem, PhotoManager } from '../photos/PhotoManager';

interface PhotoUploaderOptions {
  notify: (message: string) => void;
}

export class PhotoUploader {
  private readonly manager: PhotoManager;
  private readonly notify: (message: string) => void;
  private readonly input: HTMLInputElement;
  private readonly uploadZone: HTMLElement;
  private readonly list: HTMLElement;
  private readonly countLabel: HTMLElement;
  private readonly onChange = (): void => this.render();
  private reading = false;

  constructor(manager: PhotoManager, options: PhotoUploaderOptions) {
    this.manager = manager;
    this.notify = options.notify;

    this.input = document.querySelector<HTMLInputElement>('#photo-input')!;
    this.uploadZone = document.querySelector<HTMLElement>('#upload-zone')!;
    this.list = document.querySelector<HTMLElement>('#photo-list')!;
    this.countLabel = document.querySelector<HTMLElement>('#photo-count')!;

    this.uploadZone.addEventListener('click', () => this.openFilePicker());
    this.uploadZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openFilePicker();
      }
    });
    this.uploadZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.uploadZone.classList.add('is-dragging');
    });
    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('is-dragging');
    });
    this.uploadZone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.uploadZone.classList.remove('is-dragging');
      if (event.dataTransfer?.files) {
        void this.ingest(event.dataTransfer.files);
      }
    });
    this.input.addEventListener('change', () => {
      if (this.input.files) void this.ingest(this.input.files);
      this.input.value = '';
    });

    this.manager.onChange = this.onChange;
    this.render();
  }

  private openFilePicker(): void {
    if (this.reading) return;
    this.input.click();
  }

  private async ingest(files: FileList | File[]): Promise<void> {
    if (this.reading) return;
    this.reading = true;
    this.uploadZone.classList.add('is-loading');
    const zoneStrong = this.uploadZone.querySelector('strong');
    const oldLabel = zoneStrong?.textContent ?? '';
    if (zoneStrong) zoneStrong.textContent = '正在读取照片…';
    try {
      const result = await this.manager.addFiles(files);
      if (result.added > 0) {
        this.notify(
          result.rejected.length > 0
            ? `已加入 ${result.added} 张照片 · ${result.rejected[0]}`
            : `已加入 ${result.added} 张照片，它们正在绕圣诞树旋转`
        );
      } else {
        this.notify(result.rejected[0] ?? '没有读取到可用的照片');
      }
    } catch {
      this.notify('照片读取失败，请换一张试试');
    } finally {
      this.reading = false;
      this.uploadZone.classList.remove('is-loading');
      if (zoneStrong) zoneStrong.textContent = oldLabel;
      this.render();
    }
  }

  private async replacePhoto(id: string): Promise<void> {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/jpeg,image/png,image/webp';
    picker.addEventListener('change', async () => {
      const file = picker.files?.[0];
      if (!file) return;
      const result = await this.manager.replacePhoto(id, file);
      if (result.added > 0) {
        this.notify('照片已替换，场景里的相框也同步更新了');
      } else {
        this.notify(result.rejected[0] ?? '替换失败');
      }
    });
    picker.click();
  }

  render(): void {
    const previousScroll = this.list.scrollTop;
    this.list.replaceChildren();
    const photos = this.manager.views;
    this.countLabel.textContent = String(photos.length);

    if (photos.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'photo-empty';
      empty.textContent = '相框还空着。上传一张属于你们的照片吧。';
      this.list.append(empty);
      return;
    }

    photos.forEach((photo, index) => {
      this.list.append(this.createRow(photo, index, photos.length));
    });
    this.list.scrollTop = previousScroll;
  }

  private createRow(photo: PhotoListItem, index: number, total: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'photo-item';
    row.dataset.photoId = photo.id;

    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    const image = document.createElement('img');
    image.src = photo.displayUrl;
    image.alt = photo.caption || photo.fileName;
    image.loading = 'lazy';
    thumb.append(image);

    const meta = document.createElement('div');
    meta.className = 'photo-meta';
    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.maxLength = 32;
    captionInput.value = photo.caption;
    captionInput.placeholder = '给这张照片写一句话';
    captionInput.setAttribute('aria-label', `照片 ${index + 1} 的文字`);
    captionInput.addEventListener('input', () => {
      this.manager.setCaption(photo.id, captionInput.value);
    });
    const detail = document.createElement('span');
    detail.textContent = `${String(index + 1).padStart(2, '0')} · 轨道 ${photo.track + 1}${photo.isDefault ? ' · 示例' : ''}`;
    meta.append(captionInput, detail);

    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    actions.append(
      this.actionButton('↑', '向前移动', () => {
        if (this.manager.movePhoto(photo.id, -1)) this.render();
      }, index === 0),
      this.actionButton('↓', '向后移动', () => {
        if (this.manager.movePhoto(photo.id, 1)) this.render();
      }, index === total - 1),
      this.actionButton('↺', '替换这张照片', () => {
        void this.replacePhoto(photo.id);
      }),
      this.actionButton('×', '删除这张照片', () => {
        this.manager.removePhoto(photo.id);
        this.notify('照片已从圣诞树旁收起');
        this.render();
      }, false, 'delete')
    );

    row.append(thumb, meta, actions);
    return row;
  }

  private actionButton(
    label: string,
    title: string,
    action: () => void,
    disabled = false,
    actionName?: string
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.disabled = disabled;
    if (actionName) button.dataset.photoAct = actionName;
    button.addEventListener('click', action);
    return button;
  }
}
