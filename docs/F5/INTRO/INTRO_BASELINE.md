# F5 Intro Baseline

> 基线：`feature/visual-upgrade` / `21de493`（F4 已验收，标签 `f4-accepted`）  
> 新分支：`f5-cinematic-intro`  
> 日期：2026-11-25  
> 本次范围：只做 8 秒 Cinematic Intro，不做 60 秒故事。

## 1. 当前架构

| 项 | 实际实现 |
| --- | --- |
| 入口 | `index.html` + `src/main.ts` |
| Renderer | `src/core/Renderer.ts`，单一 WebGLRenderer，默认 direct/compatible，`?full=1` 走 Bloom pipeline |
| 动画循环 | `src/core/AnimationManager.ts`，单一 rAF |
| Camera | `src/core/CameraManager.ts`，OrbitControls + intro/tween/cinematic |
| Scene | `src/core/SceneManager.ts`，天空、地面、树台、接触阴影、远景 |
| 树 | `ChristmasTree`，正式对象，presentationScale 1.24 |
| 巨型爱心 | `HeartParticleSystem`，max 20,000，默认 10,000 |
| 星空 | `GalaxyEnvironment`，F3 正式星空/星云/极光/光瀑 |
| F4 | StoryOverlay、MemoryViewer、GiftExperienceViewer、RomanceStateManager |
| 三档画质 | ultra / balanced / performance |

## 2. 可复用

### F2 实验 01 / 正式 HeartParticleSystem

- 真实三维爱心目标、体积、深度、心跳；
- `MAX_COUNT=20000`，`HeartParticleSystem` 已经拥有 20k 目标数组；
- 开场只需要新增只读 API 读取目标 positions，不新建第二套爱心系统；
- 不复制 F2 实验 01 的 Renderer/RAF。

### F2 实验 03 / 正式 GalaxyEnvironment

- 近景/远景星场；
- 星云、极光；
- 光瀑/轨道/流星可单独关闭；
- 开场直接显示正式 group，不重新创建星空。

### F2 实验 05

- 镜头 tween/keyframe 思路；
- 粒子文字采样/聚合思路；
- 不导入其独立 renderer、controls、RAF；
- 标题改为 DOM 高质量文字，避免粒子笔画模糊。

### F3

- 正式圣诞树对象；
- 正式树灯光、双螺旋、水晶树心；
- 现有 CameraManager/Camera home framing；
- 现有 Renderer/AnimationManager。

## 3. 需要适配

| 问题 | 适配 |
| --- | --- |
| 爱心目标 positions 为 private | `HeartParticleSystem.copyHeartPositions(target, count)` 只读复制 |
| SceneManager 地面/树台/远景 private | `setCinematicSceneVisible(visible)` |
| Renderer 没有预热 | `Renderer.warmup(scene, camera)` |
| 页面自动 playIntro | 入口模式抑制；`?intro=0` 保留 F3/F4 原流程 |
| 控制面板/UI 默认显示 | 开场 body class 隐藏 UI，结束恢复 |
| F4 overlay | 开场前关闭；不改 F4 功能 |
| 原生 45 秒 demo | 与 Intro 互斥；Intro 不调用 demo |

## 4. 兼容性结论

- Intro 使用同一个 Scene、Renderer、AnimationManager、CameraManager；
- 不创建第二棵圣诞树；
- 不创建第二个爱心粒子系统；
- 不重新创建星空；
- 20k 粒子是 Intro 自己的临时电影层，结束后释放/隐藏；
- 正式树在 6.5s 通过现有对象 reveal；
- 结束后恢复 F3/F4 正常场景和 UI。

## 5. 开场与正式场景连接

```text
页面加载 → loader → Intro 入口
入口点击 → preflight（audio / shader warmup）
       → 8s Intro timeline
       → 6.5s：正式树 reveal
       → 8s：正式树 + F4 场景恢复
```

`?intro=0` 直接进入 F3/F4 原场景，用于现有回归测试。
