# Camera System

## 实现

`FilmCameraRig` 是电影期间唯一写相机位置的模块。`CameraManager` 只接收最终 pose。

每个镜头包含：

- 类型；
- 开始/结束时间；
- 起始/结束位置；
- 起始/结束 LookAt；
- 起始/结束 FOV；
- 缓动；
- 绝对时间采样。

## 六类镜头

| 类型 | 使用区间 |
| --- | --- |
| Dolly In | 8–11 树，18–22 爱心，65–68 告白 |
| Dolly Out | 25–27 爱心，50–52 数字，57–62 全景 |
| Orbit | 11–14 树，22–25 爱心，34–38 照片，52–57 全景 |
| Crane Up | 14–16 树，42–47 数字 |
| Fly Through | 47–50 数字 |
| Focus Pull | 16–18 树顶，27–30 爱心回树，30–34/38–42 照片，62–65 告白 |

## 控制权

- 电影开始：`CameraManager.beginCinematic()`；
- 电影期间：`OrbitControls.enabled=false`，主 tick 不调用普通相机更新；
- `FilmCameraRig.update(time)` 是唯一相机写入；
- 退出：`FilmStateSnapshot.restore()` 恢复 position / target / FOV / controls；
- 暂停：时间冻结，镜头保持；
- 中断：`exit()` 直接恢复快照，不保留电影 pose。

## 快照

`FilmStateSnapshot` 保存：

- `camera.position`
- `camera.controls.target`
- `camera.fov`
- `OrbitControls.enabled`
- cinematic 状态

不使用第二个相机，不重建控件。
