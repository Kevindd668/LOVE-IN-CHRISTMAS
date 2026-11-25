# Cinematic Design

## 1. 系统结构

```text
main.tick(delta)                     // 唯一主 RAF
└─ FilmDirector.update(delta)        // 唯一 68 秒时钟
   ├─ CinematicIntro segment        // 既有 0–8 秒
   ├─ FilmStory                     // 8–68 秒正式场景编排
   ├─ FilmCameraRig                 // 唯一电影相机写入者
   ├─ FilmAudioSync                 // 唯一 MusicEngine
   ├─ FilmPlaybackUI                // 字幕/进度/播放控制
   └─ FilmStateSnapshot             // 进入前快照/退出恢复
```

没有第二个 `Renderer`、没有第二个主动画循环、没有第二棵树或第二套爱心。

## 2. 核心文件

- `src/cinematic/FilmDirector.ts`：电影状态机、章节推进、UI/音频/恢复协调；
- `src/cinematic/FilmTimeline.ts`：68 秒章节；
- `src/cinematic/FilmStory.ts`：8–68 秒场景编排；
- `src/cinematic/FilmCameraRig.ts`：六类镜头；
- `src/cinematic/FilmPlaybackUI.ts`：正式电影 HUD；
- `src/cinematic/FilmStateSnapshot.ts`：相机/场景/音乐/UI 状态；
- `src/cinematic/FilmAudioSync.ts`：MusicEngine 适配；
- `src/cinematic/CinematicIntro.ts`：保留的原 8 秒 segment；
- `src/cinematic/CinematicParticleField.ts`：原 20k 开场粒子。

## 3. 时间与状态

- 总长 68 秒；
- 0–8 秒由 `CinematicIntro` 驱动；
- 8 秒时 `completeSegment()` 不执行原 `finish()`，由 `FilmDirector` 接管；
- 8–68 秒由 `FilmStory` 按绝对时间采样；
- 所有章节状态可重算，支持上一幕/下一幕/seek；
- `pause/resume` 同时冻结时间、相机、音频和 UI；
- 背景切换到后台时自动暂停。

## 4. 复用原则

- 树：正式 `ChristmasTree`；
- 爱心：正式 `HeartParticleSystem`；
- 照片：正式 `PhotoManager` 与 F4 真实记录；
- 520/1314：正式 `RomanticText` / `LoveNumbersController`；
- 星光/星云：正式 `GalaxyEnvironment`；
- 光效：正式 `MagicParticles`；
- 音乐：正式 `MusicEngine`，只做同步方法增量。

## 5. 视觉原则

- 电影期间隐藏普通 F4 UI；
- 正式电影 HUD 独立；
- 字幕 DOM/CSS，清晰中文；
- 超过 50% 画面亮度时不把标题做成粒子；
- 结束时恢复普通场景与 UI，不重建应用。
