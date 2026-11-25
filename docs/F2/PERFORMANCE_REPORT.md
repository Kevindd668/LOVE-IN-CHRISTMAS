# F2 性能记录

## 1. 测试环境

| 项 | 值 |
| --- | --- |
| 时间 | 2026-11-25 |
| 浏览器 | Microsoft Edge 158（Chromium），有头窗口 |
| 视口 | 1440 × 900，devicePixelRatio = 1 |
| 系统 | Windows，本机 |
| GPU | NVIDIA GeForce RTX 3070 Ti Laptop GPU（D3D11） |
| Three.js | 0.160.0，本地 `experiments/vendor/three/` |
| 采集脚本 | `qa/f2-lab-capture.mjs` |
| 原始 JSON | `qa/f2/performance.json` |
| 截图 | 各实验 `screenshots/`，真实 WebGL 画布 |

## 2. 方法

每个实验单独打开、单独采样 3000 ms 的 `requestAnimationFrame` 间隔：

- `FPS` = `1000 / 平均帧间隔`；
- `P95 帧时间` = 帧间隔数组的 95 分位；
- `draw calls` / `triangles` / `points` 来自 `renderer.info.render`；
- `textures` / `geometries` 来自 `renderer.info.memory`；
- `JS heap` 来自 `performance.memory.usedJSHeapSize`；
- 截图分辨率 1440×900；实验截图在参数面板关闭时截取；
- 所有实验都启用默认 Bloom；02 的指标在 `lights` 视角、04 的指标在 24 张照片状态采集。

> 帧率被 240 Hz 显示刷新率限制在约 240 FPS，不能据此推断性能上限。`P95 4.3 ms` 接近 240 Hz 上限；平均帧约 4.17 ms。

## 3. 汇总

| 实验 | FPS | P50 FPS | P95 帧时间 | Draw calls | Triangles | Points | Textures | Geometries | JS Heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 01 十万次心跳 | 240 | 238 | 4.3 ms | 17 | 16 | 11,400 | 14 | 4 | 10.1 MB |
| 02 双螺旋圣诞树 | 240 | 238 | 4.3 ms | 70 | 356,508 | 2,760 | 18 | 55 | 14.2 MB |
| 03 星河为你亮起 | 240 | 238 | 4.3 ms | 36 | 11,540 | 23,860 | 13 | 23 | 10.9 MB |
| 04 照片记忆（24 张） | 240 | 238 | 4.3 ms | 116 | 5,180 | 1,200 | 87 | 103 | 12.8 MB |
| 05 电影镜头与粒子字 | 240 | 238 | 4.3 ms | 17 | 16 | 10,600 | 14 | 4 | 7.4 MB |

### 逐项说明

- **01**：10000 粒子、17 calls。粒子数由 UI 上限 20000；默认状态 10000。帧时间接近显示上限。
- **02**：9 层、360 灯泡、48 爱心、2 条反向光带、约 1800 流光；本视角 70 calls，三角面 356,508，主要来自树冠枝叶实例。不同视角与 Bloom 开关会改变 calls。
- **03**：近/远星 18000、光瀑 5000、星云/极光/流星/轨道；36 calls。星云与极光为全屏/大平面着色器，成本主要在片元。
- **04**：24 张照片、每张 4 个 mesh、3 条轨道、星星；116 calls、87 textures。24 张为容量压力状态；12 张时为 68 calls。
- **05**：8000 粒子、17 calls；CPU 每帧更新粒子位置，3000 ms 采样内稳定在显示上限。

## 4. 浏览器与错误

- 五个实验在自动化采集过程中控制台 **0 error**、**0 page error**。
- 所有截图均由 Edge 真实渲染；不是合成图。
- 未测试移动端 Safari/Firefox、低端集显、4K DPR2 长时间稳定性；这些不作为 F2 的已验证范围。
- GPU 显存没有通过浏览器公开 API 采集；`textures`/`geometries` 是资源计数，不等于显存字节。JS heap 不是 GPU 内存。

## 5. 复现

```powershell
cd C:\Users\29636\Desktop\日常交流\Christmas-Wish
node experiments/serve.mjs
node qa/f2-lab-capture.mjs
```

重新运行会覆盖各实验 `screenshots/` 与 `qa/f2/performance.json`；不会写正式 localStorage 或正式页面。
