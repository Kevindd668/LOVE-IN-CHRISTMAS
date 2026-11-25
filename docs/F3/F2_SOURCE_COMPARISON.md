# F3 · F2 源码复用对照

> 本文逐项记录 F2 实验代码 → 正式模块的复用关系，避免只以“视觉相似”证明集成。  
> F2 实验目录未被修改；正式项目没有引入 GSAP、React、Vue、R3F、MediaPipe 或新生产依赖。

## 1. 巨型爱心

| F2 源 | 正式目标 | 复用方式 |
| --- | --- | --- |
| `experiments/01-heart-particles/src/main.js` → `buildHeartOutline` | `src/particles/HeartParticleSystem.ts` → `buildHeartOutline` | 算法与 5.0 × 4.5 × 1.8 归一化尺寸直接复用 |
| `fillHeart` | `buildTargets` 内心形采样 | 壳层/体积采样、z 深度、jitter 复用 |
| `starOutline` / `fillStar` | `buildStarOutline` / `buildTargets` 星形采样 | 五角星内外径 2.4 / 1.05 复用 |
| 散点球体分布 | `scatterPositions` | 半径 5.5–13、球面随机复用 |
| 爆散方向数组 | `burstDirections` | 单位向量复用 |
| `buildColors` | `buildColors` | 主色 → 金色 → 白色渐变复用 |
| 点精灵 vertex/fragment shader | `HeartParticleSystem` material shader | 保留点大小/柔光思路，改成项目 uniform 名 |
| 逐帧位置/颜色插值 | `update(dt, elapsed)` | 保留聚合/星形/爆散/自由漂浮/呼吸状态机 |
| `EffectComposer` + `UnrealBloomPass` | 正式 `Renderer` / `EffectComposer` | 删除实验自带 composer，统一使用正式 Bloom |
| `OrbitControls` / `LabLoop` / `createLabUI` | 正式 `CameraManager` / `AnimationManager` / `ControlPanel` | 不复制实验基础设施 |

正式新增内容：

- 默认 10000 粒子；
- `setCount` / `setColors` / `setSize` / `setVisible` / `setPaused`；
- `setMode` / `gather` / `burst`；
- `dispose`；
- 数量、颜色、暂停、聚合、爆散控件；
- 场景坐标 `(3.8, 7.6, -9.5)`、缩放 1.4。

## 2. 星空 / 星云 / 极光 / 流星 / 光瀑 / 轨道

| F2 源 | 正式目标 | 复用方式 |
| --- | --- | --- |
| `experiments/03-galaxy-nebula/src/main.js` → `buildNearFar` | `GalaxyEnvironment.buildStars` | 双层星点结构、颜色/大小/闪烁 shader 复用 |
| `buildNebula` | `buildNebula` | 多层平面、fbm 噪声、紫/蓝色云气 shader 复用 |
| `buildAurora` | `buildAurora` | 4 层极光平面、帘幕噪声 shader 复用 |
| `buildMeteors` / `resetMeteor` / `updateMeteors` | `buildMeteors` / `resetMeteor` / `update` | 流星线段、生命周期、速度复用 |
| `buildWaterfall` | `buildWaterfall` | 金色粒子光瀑复用，并增加半透明光帘 |
| `buildOrbits` | `buildOrbits` | 三层 LineLoop + 点阵复用，半径与速度按正式树体调整 |
| `EffectComposer` / `OrbitControls` / `LabLoop` | 正式 Renderer / CameraManager / AnimationManager | 不复制实验基础设施 |
| `createLabUI` | 正式 ControlPanel | 改成正式设置项 |

正式适配：

- 星空半径 28–105，放在树后方远景；
- 星云 z ≈ -58…-74；
- 极光 z ≈ -48…-66；
- 流星 z ≈ -38…-8；
- 光瀑围绕树体，半径 2.6–4.8，高 12；
- 三层轨道半径 5.1 / 6.5 / 8.1，独立速度；
- `setQuality` 根据 Ultra / Balanced / Performance 降低星点、光瀑和层数；
- 所有效果均可独立开关。

## 3. 双螺旋圣诞树

F2 实验 02 的 `src/product-tree.js` 文件头已经注明：

> F2 lab-only adaptation of the existing, already-tested Christmas-Wish tree source. It is copied into this experiment so the lab remains standalone. Source: `src/objects/ChristmasTree.ts` at product baseline; not imported from the formal application at runtime.

因此模块 03 的正式来源是项目自己的树体系：

| 正式模块 | 内容 | F2 实验室对应 |
| --- | --- | --- |
| `src/objects/TreeBranches.ts` | 9 层实体针叶、层核、树皮、树冠包络 | `experiments/02-double-helix-tree/src/product-tree.js` 中的树体 |
| `src/objects/TreeHelix.ts` | 双螺旋 Tube + 9 圈 + 流星光 | 实验 02 的 helix/view 参数 |
| `src/objects/TreeLights.ts` | 360 灯泡、四色配额、波式点亮 | 实验 02 的 360 bulbs |
| `src/objects/TreeHeartOrnaments.ts` | 48 颗 Heart-Star 爱心 | 实验 02 的 48 hearts |
| `src/objects/TreeStar.ts` | 水晶爱心树顶 | 实验 02 的 crown heart |
| `src/objects/ChristmasTree.ts` | 组合/旋转/rebuild/API | 实验 02 的场景装配 |
| `src/core/SceneManager.ts` | 展示台/雪/金环 | 实验 02 的底座 |

结论：**没有重新制作第二套双螺旋系统**；正式树就是 F2 实验 02 的上游源码。实验 02 是只读副本，正式项目继续维护同一套树体。

## 4. 基础设施对照

| 能力 | F2 实验 | 正式集成 |
| --- | --- | --- |
| Renderer | 每个 lab 自己 `new WebGLRenderer` | 单一 `Renderer` |
| RAF | `LabLoop` | 单一 `AnimationManager` |
| Bloom | 每个 lab 自己 `EffectComposer` | 正式 Renderer/Composer |
| Camera/Controls | 每个 lab `OrbitControls` | `CameraManager` |
| UI | `createLabUI` | `ControlPanel` + `SettingsManager` |
| 资源释放 | lab `dispose` | `HeartParticleSystem.dispose` / `GalaxyEnvironment.dispose` / 统一 app dispose |
| 依赖 | Vite + Three | Three 0.160.0；无新增生产依赖 |

## 5. 未修改项

- `experiments/01-heart-particles/` 保持原样；
- `experiments/02-double-helix-tree/` 保持原样；
- `experiments/03-galaxy-nebula/` 保持原样；
- `F2` 实验室仍可独立运行；
- `main` 与 `v1.0.0-baseline` 未修改；
- 未进入 F4/F5。

## 6. 授权与署名

五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。F2 实验代码为本项目自有代码；Heart-Star 参考代码的作者与 commit 已保留在 `src/objects/reuse/heartGeometry.ts` 文件头及 F3 文档中。
