# 68 秒 Timeline

| start | end | duration | chapter | camera | audio cue |
| ---: | ---: | ---: | --- | --- | --- |
| 0 | 8 | 8s | intro | 既有 intro 帧 | unlock |
| 8 | 18 | 10s | tree | Dolly In / Orbit / Crane Up / Focus Pull | seek 8 |
| 18 | 30 | 12s | heart | Dolly In / Orbit / Dolly Out / Focus Pull | star / tap |
| 30 | 42 | 12s | photos | Focus Pull / Orbit / Focus Pull | photo |
| 42 | 52 | 10s | numbers | Crane Up / Fly Through / Dolly Out | gift |
| 52 | 62 | 10s | scene | Orbit / Dolly Out | star |
| 62 | 68 | 6s | confession | Focus Pull / Dolly In | tap |
| **68** | — | **68s total** | complete | 恢复快照 | end |

## 关键事件

- 8.0：intro segment 完成，`FilmStory.startStory()`；
- 18.0：爱心可见；
- 24.5：爱心爆散 + 冲击波；
- 27.5：重新聚合；
- 30/34/38：照片 1/2/3；
- 42/46/50：520 / 1314 / 组合；
- 52：完整场景；
- 62：最终告白；
- 68：完成，恢复场景。

## 时间驱动规则

- 动画状态只由 `FilmDirector.elapsed` 派生；
- 禁止用多个 `setTimeout` 串联镜头；
- `pause` 冻结时间；
- `seek` 直接采样目标状态；
- 背景隐藏自动暂停，恢复继续。
