# 实验 05 · 把这句话写进星河

路径：`experiments/05-cinematic-effects/`  
入口：`http://127.0.0.1:8787/05-cinematic-effects/`

## 目标

用同一个真实粒子场完成三种电影化段落：镜头穿越星场、巨型爱心聚合/爆散、520/1314/LOVE/Merry Christmas 粒子文字；并支持俯视与定格。

## 来源与实现

| 项 | 内容 |
| --- | --- |
| 参考 | `Heart-Star`（MIT，main `9317aeb`）；`Interactive-Xmas-Tree`（MIT，main `be75d04`） |
| 参考内容 | 爱心/星形数学与节奏、相机/粒子组织 |
| 实际实现 | 独立 CPU 粒子场、Canvas 文本采样、相机序列、明暗与定格 |
| 第三方素材 | 无；文字使用系统字体绘制到 Canvas，不打包字体 |

实现要点：

- 最多 12000 粒子，默认 8000；所有粒子共享一个 `Points` 与一个 additive shader。
- 目标位：爱心体积（参数式轮廓 + 拒绝采样 + 深度）、四组 Canvas 文本采样目标。
- 文本目标：`520`、`1314`、`LOVE`、`Merry Christmas`；点从画布 alpha 采样，映射到 3D 平面。
- 聚合/变形使用指数阻尼，形成真实的粒子流动。
- 爱心模式有轻微呼吸；爆散后回到目标。
- 三条独立演示：
  1. **镜头穿越星河**：远景高位推进到近景，穿过星场；
  2. **巨型爱心聚合**：推进 + 聚合 + 爆散 + 重组；
  3. **520 → 1314**：粒子文字聚合，定时切换到 1314；
- 附加 **俯视镜头**、**LOVE / Merry Christmas**、**定格终章**、暂停/重置/退出。
- 光照过渡：粒子 opacity 在序列开始时从低到高；星空背景保持深色。

## 交互与参数

- 粒子数量 2500–12000，粒子尺寸，Bloom，结束后允许自由旋转。
- 按钮：三条序列、LOVE、Merry Christmas、俯视、定格、暂停、重置。

## 真实浏览器证据

截图（`experiments/05-cinematic-effects/screenshots/`）：

`heart.png`、`text-520.png`、`text-1314.png`、`text-love.png`、`text-merry-christmas.png`、`journey-through-stars.png`、`top-down.png`、`controls.png`。

实测：

- 约 240 FPS；17 draw calls；8000 粒子；无控制台错误。
- `520` 与 `1314` 成功形成；`LOVE`/`Merry Christmas` 按钮成功切换；俯视镜头可到达；定格按钮暂停循环。

## 已知限制

- `LOVE` 与 `Merry Christmas` 在 8000 粒子 + Bloom 下清晰度低于数字文本；已降低文本点尺寸，但仍是艺术化粒子字。
- 文字采样使用系统字体，不保证跨平台字形完全一致。
- 镜头序列是预设时间轴，不是可拖拽的电影剪辑器。
- “场景渐暗 → 灯光渐亮”通过粒子 opacity 与相机景别表达，不是独立的物理灯光系统。
