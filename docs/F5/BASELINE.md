# F5 Baseline

## 分支与标签

- 工作分支：`f5-cinematic-full`
- 起点：`f5-cinematic-intro` / `2edb643`
- 开场冻结标签：`f5-intro-prototype-8s` → `2edb643`
- F4 验收：`f4-accepted` → `21de493`
- F3 验收：`f3-accepted` → `ba1ed8d`
- `main`：`c9e3d02`

## 现有 8 秒开场证据

- 历史文件：`docs/F5/INTRO/final-video.webm`
- 冻结副本：`docs/F5/evidence/01-intro-8s-current.webm`
- SHA-256：`F55157D91E02A882AC10841F911257C7CBB389117378C26981270C56C5E97E8D`
- 冻结规则：不覆盖、不删除；完整电影另存证据。

## 当前源码事实

- 当前开场由 `CinematicIntro` 驱动，原时间轴固定 8 秒。
- `CinematicIntro` 的原 `finish()` 会在第 8 秒恢复普通场景和 UI。
- 完整 F5 使用 `FilmDirector` 接管 8 秒后的 60 秒故事。
- 现有 `DemoController` 是 45 秒旧演示，不参与 68 秒电影。
- 现有 `MusicEngine` 尚无电影暂停/继续/seek。
- 现有 `CameraManager` 尚无完整 FOV/OrbitControls 快照。
- 现有 `HeartParticleSystem` 可复用 gather/burst。
- 现有 `PhotoManager`、`RomanticText`、`ChristmasTree` 作为正式复用对象。

## 兼容旁路

- `?intro=0`：跳过完整电影，保留 F3/F4 回归。
- `?introOnly=1`：只运行原 8 秒开场，用于历史开场回归。
- 默认入口：完整电影。
