# F3 源码复用报告

> 结论：F3 的视觉精修全部在现有 Three.js 场景上扩展，没有引入新的渲染器、动画循环、生产依赖或第二套视觉系统。F2 五个实验目录未修改。

## 1. F2 实验使用情况

| 实验 | 内容 | F3 使用方式 |
| --- | --- | --- |
| `experiments/01-heart-particles` | 3D 爱心粒子 | 已在 F2 阶段整合为 `HeartParticleSystem`；F3 保留 10000 粒子巨型爱心 |
| `experiments/02-double-helix-tree` | 双螺旋树体 | 已在 F2 阶段整合为现有树体模块；F3 未重写 |
| `experiments/03-galaxy-nebula` | 星空/星云/光瀑 | WP1/WP2 在 `GalaxyEnvironment` 中重构并复用粒子/Shader 思路 |
| `experiments/04-photo-memory` | 照片记忆/相机聚焦 | **F3 未导入**；F3 WP3 复用正式 `PhotoManager/PhotoOrbit`，实验 04 保留给 F4 计划参考 |
| `experiments/05-cinematic-effects` | 电影镜头/粒子文字 | **F3 未导入**；属于后续电影/浪漫阶段，F3 不提前实现 |

## 2. 正式场景内部复用

| 模块 | 来源/复用 |
| --- | --- |
| `ChristmasTree` | 复用 F2 树体、双螺旋、灯泡、爱心装饰、树顶水晶心 |
| `GalaxyEnvironment` | WP1 五层星空、银河带、星云、极光、流星；WP2 四路径光瀑 |
| `PhotoManager / PhotoOrbit / PhotoCard` | WP3 三层照片轨道、动态 6→24 张、选中/变暗 |
| `SceneManager` | WP4 地面/展示台扩展；保留原模拟反射和接触阴影 |
| `CameraManager` | WP5 构图/树体缩放；仍由原相机管理器负责 |
| `HeartParticleSystem` | 巨型爱心粒子；F3 不改粒子算法 |
| `GiftBoxes` | 5 个礼物；F3 不改数量、交互 |
| `RomanticText` | 520/1314 3D 文字；WP5 随树体比例缩放 |

## 3. 明确没有做的事

- 没有复制 F2 实验源码到正式 `src/`；
- 没有新增 Three.js 依赖、GSAP、后处理库；
- 没有新增第二个 Renderer/RAF/AnimationManager；
- 没有修改 `main`、`v1.0.0-baseline`、F0/F1/F2 报告；
- 没有修改 `experiments/01…05`；
- 没有导入 F4 的照片记忆、爱情交互、礼物内容或 IndexedDB；
- 没有提前实现 F5 的 60 秒电影。

## 4. 复用边界

- F2 实验 04/05 是后续 F4/F5 的参考资产，不是 F3 的生产依赖；
- F3 的 WP1/WP2 的 Shader 和粒子分布属于正式场景，不是实验拷贝；
- 所有新增地面细节、照片布局和构图参数都通过现有模块的公开方法扩展。
