# 04 · 我们的照片记忆

独立地址：`http://127.0.0.1:8787/04-photo-memory/`

## 视觉与交互

- 12 张初始示例照片（程序化生成，不是外部素材）；最多 24 张。
- 三层 3D 轨道，半径默认 4.2 / 5.2 / 6.2，三层独立速度。
- 卡片 1.3 × 1.7 × 0.04，奶油色边框 + `#FFD58A` 金色外框。
- 真实本地上传（JPG/PNG/WEBP）、单张替换、删除、上下排序、文字与日期编辑。
- 点击卡片进入聚焦镜头：相机推近、其他照片变暗、显示详情层；返回轨道时恢复相机。
- 所有照片只在浏览器本地处理；不会上传到服务器。
- IndexedDB 入口是实验性验证，必须由用户主动点击“保存/读取”，不进入正式产品。

## 来源与改动

- 3D 照片轨道、双面卡片、聚焦相机、上传/替换/删除/排序由本实验实现。
- 行为参考 `Immersive-Photo-Gallery`（MIT，main `c862c70`）与 `Christmas-Tree-Photos`（main `b5f4870`，无 LICENSE 文件、README 声称 MIT）。
- 对 `Christmas-Tree-Photos` 只研究方法与交互，不复制代码。
- 没有使用参考仓库的照片、音频、模型、字体或贴图；示例图均为本地 Canvas 生成。

## 截图

`overall-12.png`、`uploaded-20.png`、`focus-detail.png`、`stress-24.png`、`controls-and-library.png`、`photo-library.png`。

## 验证

已使用 8 张真实本地图片上传、替换 1 张、删除 1 张、排序、点击卡片聚焦，并补足到 24 张压力测试；详见 `docs/F2/EXPERIMENT_04_PHOTO.md`。
