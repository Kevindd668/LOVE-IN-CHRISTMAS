# Playback State Machine

## 状态

```text
idle -> entry -> preflight -> playing <-> paused
                                      |
                                      -> completed
                                      -> exiting -> idle
```

`CinematicIntro` 内部仍负责 0–8 秒的准备/暂停；`FilmDirector` 接过后接管全片。

## 控制映射

| UI | 方法 | 行为 |
| --- | --- | --- |
| 暂停/继续 | `togglePause()` | 冻结/恢复时间、相机、字幕、音频 |
| 上一幕 | `previousChapter()` | 回到章节起点或上一章 |
| 下一幕 | `nextChapter()` | 跳到下一章节起点 |
| 跳过开场 | `skipIntro()` | 只到 8 秒 |
| 跳过电影 | `skipFilm()` | 直接完成并恢复 |
| 完整重播 | `replay()` | 从 0 重新开始 |
| 退出 | `exit()` | 恢复进入前快照 |
| 完成 | `complete()` | 68 秒后恢复并显示重播/退出 |

## 快照

`FilmStateSnapshot.capture()` 在入口开始前调用，保存：

- 相机位置/目标/FOV/controls；
- 场景组可见性；
- 树体/灯/星/双螺旋/挂饰；
- 爱心可见性和模式；
- 照片内存模式；
- 520/1314 可见性；
- 礼物开启状态；
- 音乐 enabled/track/volume；
- UI/body 类。

## 恢复

- 不重建应用；
- `CinematicIntro.restoreScene()` 恢复其 0–8 秒内保存的相机/树；
- `FilmStateSnapshot.restore()` 恢复完整电影前状态；
- 移除电影 body class，恢复 `#ui`；
- 退出后 UI 可用，交互重新启用。

## 后台

`visibilitychange`：
- hidden 且未暂停：自动暂停；
- visible 且由后台暂停：自动恢复；
- 用户手动暂停不被自动恢复覆盖。
