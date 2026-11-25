# 05 · 把这句话写进星河

独立地址：`http://127.0.0.1:8787/05-cinematic-effects/`

## 视觉与交互

- 8000 颗心形粒子（可调 2500–12000），3D 爱心体积与呼吸；爆散/重组。
- Canvas 采样生成的粒子文字目标：`520`、`1314`、`LOVE`、`Merry Christmas`，由同一粒子场平滑变形。
- 三条独立镜头序列：
  1. 镜头穿越星河（缓慢推进 + 穿过星场）；
  2. 巨型爱心聚合（镜头推进、聚合、爆散、重组）；
  3. 520 → 1314 粒子文字；
- 额外 `俯视镜头` 与 `定格终章`；支持暂停/重置/退出。
- 可调粒子数量、尺寸、Bloom；结束允许自由旋转。

## 来源与改动

- 爱心参数式、粒子爆散/重组、粒子文字采样、镜头编排为本实验独立实现。
- 参考 `Heart-Star`（MIT，main `9317aeb`）的爱心/星形数学与粒子节奏，及 `Interactive-Xmas-Tree`（MIT，main `be75d04`）的相机/粒子层组织思路。
- 未使用第三方字体文件；文字由 Canvas 系统字体绘制后采样。
- 未使用参考仓库图片、音频、模型或贴图。

## 截图

`heart.png`、`text-520.png`、`text-1314.png`、`text-love.png`、`text-merry-christmas.png`、`journey-through-stars.png`、`top-down.png`、`controls.png`。

## 运行与证据

- 实测约 240 FPS、17 draw calls、8000 粒子；控制台无错误。
- 详见 `docs/F2/EXPERIMENT_05_CINEMATIC.md` 与 `docs/F2/PERFORMANCE_REPORT.md`。
