# Cinematic Intro 源码复用

## 1. 实际复用

| 来源 | 使用方式 |
| --- | --- |
| `HeartParticleSystem`（F2 实验 01 的正式适配） | 读取 20k 爱心目标；正式爱心系统仍是场景里唯一的爱心系统 |
| `GalaxyEnvironment`（F2 实验 03 的正式适配） | 星场、星云、极光作为开场背景；不重新创建星空 |
| F2 实验 05 的镜头/时间轴思路 | 采用 keyframe/时间轴方式；不导入实验的 renderer/controls |
| F3 `ChristmasTree` | 开场结束直接 reveal 同一个树对象 |
| F3 `Renderer` | 新增 warmup，仍只有一个 WebGLRenderer |
| F3 `AnimationManager` | 开场 update 从主 tick 调用，无第二 RAF |
| F3 `CameraManager` | 保存/恢复相机，beginCinematic/endCinematic |
| F4 `StoryOverlay` 等 | 开场前关闭，不改其功能；`?intro=0` 保留原场景 |

## 2. 新增

- `CinematicParticleField`：20k 螺旋/爱心目标、Points、LineSegments、中央 glow；
- `CinematicIntroUI`：入口、标题、控制条、2D 标题粒子；
- `CinematicIntro`：时间轴、相机、场景显隐、Pause/Skip/Replay/Exit；
- `Renderer.warmup`；
- `SceneManager.setCinematicSceneVisible`；
- `HeartParticleSystem.copyHeartPositions`。

## 3. 明确没有做

- 没有修改 F2 `experiments/01…05`；
- 没有复制 F2 实验目录到 `src/`；
- 没有新建第二棵圣诞树；
- 没有新建第二个巨型爱心粒子系统；
- 没有新建第二套星空/星云/极光；
- 没有新增 Renderer、RAF、GSAP 或生产依赖；
- 没有开发 60 秒故事。
