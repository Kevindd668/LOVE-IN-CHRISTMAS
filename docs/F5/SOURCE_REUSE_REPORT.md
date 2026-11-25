# Source Reuse Report

## 复用对象

| 来源 | 使用 |
| --- | --- |
| F2 实验 01 / 正式 `HeartParticleSystem` | 18–30 秒聚合、心跳、爆散、重申 |
| F2 实验 02 / 正式 `ChristmasTree` | 全部树体、灯光、树顶、双螺旋、挂饰 |
| F2 实验 03 / 正式 `GalaxyEnvironment` | 星场、星云、极光、流星、光瀑、轨道 |
| F2 实验 04 / 正式 `PhotoManager` | 真实照片、元数据、冻结聚焦 |
| F2 实验 05 / 正式 `RomanticText` | 520、1314 |
| F3 正式场景 | 树、雪、礼物、地面、相机与性能基础 |
| F4 | 真实照片、内容、爱心、数字、礼物、音乐、UI |
| 现有 `CinematicIntro` | 0–8 秒 |
| 现有 `MusicEngine` | 全片音乐与音效 |

## 增量修改

- `CinematicIntro`：增加 segment 模式、start/complete 回调、`restoreScene()`；
- `MusicEngine`：增加 pause/resume/seek 电影同步；
- `main`：默认入口改由 `FilmDirector` 协调；
- 新增 F5 电影文件；未重写 F0–F4 的算法或视觉资产。

## 未做

- 未修改 F2 实验目录；
- 未新建第二个 Renderer / RAF / 树 / 爱心 / 星空；
- 未新增生产依赖；
- 未升级 Three.js；
- 未开发 F6；
- 未覆盖原 8 秒视频。
