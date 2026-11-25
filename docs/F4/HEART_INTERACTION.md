# F4 · 巨型爱心交互

## 1. 复用

- 复用 `HeartParticleSystem` 的现有 10000 粒子能力和 heart/star/burst/free 模式。
- 没有重建 Geometry、ShaderMaterial 或第二套爱心系统。
- 只在 `heartPickProxy` 上增加一个不可见拾取球，避免修改粒子本身。

## 2. 状态

| 状态 | 触发 | 行为 |
| --- | --- | --- |
| Idle | 默认 | 现有心跳、缓慢自转、呼吸 |
| Gather | 单击爱心 | 收缩 → 聚合 → 光波 → 回到 Idle |
| Burst | 双击爱心 | 爆散 → 自动重新聚合 |
| Promise | “爱的约定”按钮 | 爱心放缓，显示 520 ♡ 1314 和可编辑承诺 |

## 3. 拾取与事件

- `MouseInteraction.PickTarget` 增加 `heart`。
- 单击/双击由 `HeartInteraction` 做 360ms 双击判定；单击延迟到判定窗口结束后再 Gather，避免双击被第一次 Gather 占用。
- “爱的约定”使用控制面板独立按钮，不依赖长按，避免与拖动/移动端手势冲突。
- 所有 Promise/Gather/Burst 都由 `RomanceStateManager` 锁定其他主交互，结束后恢复 `idle`。

## 4. 资源

- 拾取代理：一个 SphereGeometry + 一个不可见 MeshBasicMaterial。
- 不新增 RAF、Renderer、粒子 Buffer。
- `dispose()` 释放拾取代理 geometry/material、爱心系统和交互计时器。

## 5. 截图

- `docs/F4/screenshots/01-overall.png`
- `docs/F4/screenshots/02-promise.png`
- `docs/F4/final-video.webm`（Gather + 数字模式真实录屏）
