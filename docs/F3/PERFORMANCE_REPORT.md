# F3 最终性能报告

> 范围：F3 WP1–WP6 全部视觉与构图完成后的实测。  
> 原始数据：`qa/f3-final/performance.json`  
> 测试脚本：`qa/f3-final-performance.mjs`  
> 最终 standalone SHA-256：`06F00FDDD8640A97568548F3385949751C4DD76C6CC86BECDA326ADD64F9DE49`

## 1. 环境

| 项 | 值 |
| --- | --- |
| 浏览器 | Microsoft Edge / Chromium，有头 |
| GPU | NVIDIA GeForce RTX 3070 Ti Laptop GPU，D3D11 |
| Three.js | 0.160.0 |
| 默认画质 | ultra |
| 采样 | 预热约 6.5s；rAF 采样 5s |
| 渲染路径 | 默认兼容路径；`?full=1` 为完整 Bloom |
| 窗口 | 1440×900 / 1920×1080 / 3840×2160，DPR 1 |

## 2. 实测结果

| Case | FPS | P50 | P95 | Max | Draw calls | Triangles | Points | Textures | Geometries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×900 默认 | 174.1 | 4.2 | 8.4 | 29.2 | 315 | 467,184 | 34,142 | 30 | 206 |
| 1920×1080 默认 | 160.9 | 4.3 | 8.4 | 24.9 | 315 | 467,184 | 34,142 | 30 | 206 |
| 3840×2160 默认 | 185.9 | 4.2 | 8.4 | 12.5 | 315 | 467,184 | 34,142 | 30 | 206 |
| 1440×900 完整 Bloom | 135.1 | 8.3 | 8.5 | 12.8 | 329 | 467,198 | 34,142 | 43 | 207 |
| 3840×2160 完整 Bloom | 111.6 | 8.3 | 12.5 | 12.7 | 329 | 467,198 | 34,142 | 43 | 207 |
| 1440×900 Performance | 164.1 | 4.3 | 8.4 | 12.6 | 306 | 458,922 | 15,012 | 30 | 206 |
| 1440×900 24 张照片 | 125.4 | 8.3 | 12.4 | 16.8 | 459 | 493,392 | 34,142 | 66 | 332 |

所有 case：

- `contextLost=0`；
- `console/page error` 为空；
- 默认 1440/1920/4K 平均 **160.9–185.9 FPS**；
- 完整 Bloom 1440/4K 平均 **135.1 / 111.6 FPS**；
- 24 张照片平均 **125.4 FPS**，P95 12.4ms；
- 24 张照片 draw calls 459，比 6 张多 144，主要来自 18 张额外卡片；
- Performance 档渲染 canvas 为 1180×738（0.82 分辨率缩放），points 15,012。

## 3. 与 F0 基线

F0 基线（`c9e3d02`）实测：

| Case | F0 FPS | F0 P95 | F0 calls |
| --- | ---: | ---: | ---: |
| 1440×900 兼容 | 233.9 | 4.3 | 271 |
| 1920×1080 兼容 | 224.5 | 8.3 | 271 |
| 4K 等效兼容 | 192.1 | 8.4 | 271 |
| 1440×900 完整 Bloom | 196.0 | 8.4 | 285 |

F3 增加了星空、星云、极光、四条光瀑、地面细节、放大树体和照片卡片，draw calls 315 对 271，triangles 467,184 对 310,674；平均 FPS 仍保持在 60 FPS 目标之上。F0 与 F3 的采样窗口/刷新率状态不同，本报告不把差异宣传为严格提升比例。

## 4. 资源与稳定性

| 项 | 结果 |
| --- | --- |
| 6 张照片 | 30 textures / 206 geometries / 48 programs |
| 24 张照片 | 66 textures / 332 geometries / 48 programs |
| 完整 Bloom 4K | 43 textures / 207 geometries / 54 programs |
| context lost | 0 |
| console/page error | 0 |
| 内存 | 24 张照片 heap 约 34.8MB；未观察持续增长 |

新增地面细节在 `SceneManager.dispose()` 中释放；照片纹理仍由现有 `PhotoManager` 管理。

## 5. 结论

- F3 默认 1440/1920/4K 均远高于 60 FPS 目标；
- 完整 Bloom 4K 仍 >60 FPS；
- 24 张照片仍 >60 FPS，但 draw calls 明显增加，这是卡片数量带来的预期成本；
- 统一使用单一 Renderer、单一 AnimationManager，没有新增后处理管线或第二套 RAF；
- 性能数据仅代表本机 Edge + RTX 3070 Ti Laptop，不承诺低端集显/移动 GPU 的同等结果。
