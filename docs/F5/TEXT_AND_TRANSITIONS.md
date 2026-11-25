# Text & Transitions

## 文字层级

1. 8 秒开场标题：现有 DOM/CSS；
2. 章节字幕：`FilmPlaybackUI`；
3. 照片元数据：真实 F4 metadata；
4. 520 / 1314：现有 3D 粒子文字；
5. 最终告白：现有可编辑 `blessingTitle / blessingMessage / signature`。

## 清晰度

- 主标题和字幕使用 DOM/CSS，不使用模糊粒子拼字；
- 中文字体 fallback：系统宋体/衬线栈；
- `white-space: pre-line` 支持告白换行；
- 字幕有半透明径向暗底和文本阴影；
- 4K 使用 clamp 字体与最大宽度，不裁切；
- 照片默认内容明确标“示例记忆”。

## 转场

- 章节淡入淡出由 CSS opacity/transform；
- 开场标题保留金色扫光；
- 粒子转场复用现有开场场与 `MagicParticles`；
- 不新增第二套粒子文字或 Shader；
- 视觉特效不能盖住字幕。

## UI

- 入口保留 `MERRY CHRISTMAS` 与原按钮；
- 正式 HUD：暂停/继续、上一幕、下一幕、跳过开场、跳过电影、完整重播、退出、进度条；
- 电影期间普通 F4 UI 隐藏；
- 完成后普通场景恢复，HUD 保留重播/退出。
