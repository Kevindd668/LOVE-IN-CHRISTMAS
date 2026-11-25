# F4 · 照片记忆空间

## 1. 保留

- WP3 的三层照片轨道、初始 6 → 最大 24、左右分配、选中/变暗。
- 原 `PhotoManager.addFiles / replacePhoto / removePhoto / movePhoto`。
- 不重写照片轨道算法。

## 2. 照片故事字段

```ts
interface PhotoMetadata {
  title: string;       // ≤32
  date: string;        // YYYY-MM-DD，可空
  description: string; // ≤160
  category: 'meeting' | 'memory' | 'future';
}
```

- 旧 `caption` 作为标题的兼容字段。
- 默认标题来自现有 6 张示例；日期为空；描述为空。
- 编辑模式在 `StoryEditor` 中为每张照片提供标题、日期、分类、描述。

## 3. 详情打开

1. 点击 3D 照片或调试 API `openMemory(id)`；
2. `RomanceStateManager` 进入 `memory`；
3. `PhotoManager` 暂停轨道并冻结照片位置；
4. 保存当前相机 `position` 与 `OrbitControls.target`；
5. `CameraManager.beginCinematic()` + `animateTo()` 靠近当前照片；
6. `#photo-lightbox` 扩展为记忆详情：
   - 图片；
   - 标题；
   - 日期；
   - 描述；
   - 当前序号；
   - 上一张 / 下一张 / 自动播放 / 关闭。

## 4. 切换与恢复

- 上一张/下一张循环浏览所有照片。
- 自动播放间隔 5s；可手动暂停。
- Esc、左右方向键可用。
- 关闭时相机回到保存的 pose，照片轨道恢复，场景**不重建**。
- 照片删除/存储读取失败时，详情关闭并回退到轨道。

## 5. 24 张验证

- 照片数量仍为最大 24；
- 详情计数器 24/24；
- 切换到下一张会循环到 01/24；
- 关闭后 `state=idle`，详情关闭；
- 相机恢复至 home pose（连续打开/关闭不重建场景）。

## 6. 截图

- `docs/F4/screenshots/04-memory.png`
- 24 张记忆测试见 `qa/f4-memory.log`。
