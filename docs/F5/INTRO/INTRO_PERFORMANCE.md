# Cinematic Intro 性能报告

> 原始数据：`qa/f5/performance.json`  
> 脚本：`qa/f5-performance.mjs`  
> 采样：入口点击 → preflight/warmup → 定位到 galaxy 阶段后采样 5s  
> 浏览器：Microsoft Edge / Chromium，有头  
> GPU：NVIDIA GeForce RTX 3070 Ti Laptop GPU，D3D11  
> Three.js：0.160.0

## 1. 结果

| Case | FPS | P50 | P95 | Max | Particles | Scene points | Textures | Geometries | Programs | Warmup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×900 galaxy | 240.0 | 4.2 | 4.3 | 4.6 | 20,000 | 34,000 | 31 | 209 | 56 | 341ms |
| 1920×1080 galaxy | 240.0 | 4.2 | 4.3 | 5.1 | 20,000 | 34,000 | 31 | 209 | 56 | 160ms |
| 3840×2160 galaxy | 240.0 | 4.2 | 4.3 | 4.4 | 20,000 | 34,000 | 31 | 209 | 56 | 165ms |
| 1440×900 full Bloom | 240.0 | 4.2 | 4.3 | 4.7 | 20,000 | 34,000 | 44 | 210 | 104 | 246ms |

- 所有 case `contextLost=0`，0 console/page error；
- 240 FPS 是 240Hz 显示上限的采样值，不是 GPU 真实上限；
- 20,000 个 Intro 粒子 + 现有星空背景；
- `renderer.info` 记录的场景 draw calls：1440/1920/4K 默认 15，完整 Bloom 29；Intro 自身额外的绘制对象为 1 个 Points、1 个 LineSegments、1 个 Sprite；
- 标题粒子为 Canvas2D，不进入 WebGL draw call；
- `renderer.info` 的 scene points 为 34,000（星空背景），Intro 字段的 20,000 为逻辑粒子；实际场景视觉包含两者；
- 入口 preflight 预热 160–341ms，显著降低了开场第一帧的 Shader 编译长帧；
- 采样中最大帧 4.4–5.1ms，没有出现 F0 级别的首帧长尖峰。

## 2. 初始化与预热

- `Renderer.warmup()`：
  - `compileAsync` 编译 Intro/正式树/Bloom 材质；
  - 执行一次隐藏的 warm-up frame；
  - 入口按钮显示“正在准备这场圣诞电影…”；
- 预热完成前不开始时间轴；
- 预热失败不阻断开场，只记录 warning。

## 3. 资源边界

- 20k Positions/Colors/Sizes 一次性分配；
- 每帧位置写入复用 TypedArray，无每帧 Geometry/Material 创建；
- 拖尾复用同一字段的 LineSegments；
- 标题粒子 600 个在 Canvas2D，不新增 WebGL 系统；
- 重播只重置时间轴/位置，不重建资源。

## 4. 结论

Intro 在现有 Renderer/AnimationManager 上运行，1440/1920/4K 均达到显示上限附近；预热后首帧无长编译尖峰；无 context lost 或页面错误。性能数据包含真实浏览器采样，不代表低端 GPU 承诺。
