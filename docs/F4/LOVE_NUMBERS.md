# F4 · 520 / 1314 爱情数字

## 1. 两种层

| 层 | 实现 | 用途 |
| --- | --- | --- |
| 3D 数字 | 现有 `RomanticText` + 字体几何 + sparkle | 日常常驻、可编辑文本 |
| 粒子数字 | `ParticleLoveText`，1800 个 Points | 交替/爱情/终章的短暂聚合 |

没有替换现有 3D 字体系统；粒子只在模式激活时出现，Idle 时隐藏。

## 2. 模式

| 模式 | 表现 |
| --- | --- |
| Idle | 3D 数字正常运行，粒子隐藏 |
| Alternate | 3D 数字淡出，粒子“520”与“1314”每 3.2s 切换 |
| Love | 粒子显示“520 ♡ 1314” |
| Finale | 礼物五/终章使用，结束后回到 Idle |

## 3. 实现

- `src/romance/LoveNumbersController.ts`：模式切换、粒子标签、3D 标签揭示。
- `src/romance/ParticleLoveText.ts`：Canvas 文字采样 → 1800 个世界空间 Points；不加载新字体，不创建第二套渲染器。
- 保留 WP5 的 1.24 倍数字组缩放；控制器只做相对脉冲，不覆盖基础缩放。
- 非 ASCII 自定义文字仍由 3D `RomanticText` 承担；粒子层只接受数字/空格。
- 控制面板“让 520 与 1314 聚合”按钮触发 Alternate；Promise 与礼物五使用 Love/Finale。

## 4. 性能

粒子模式实测：

- 1440×900：168.1 FPS，P95 8.5ms；
- draw calls 310（比默认少 5，因为 3D 标签隐藏）；
- points 35,592（场景 34,142 + 粒子 1,800）；
- 0 console/page error。

## 5. 截图

- `docs/F4/screenshots/03-love-numbers.png`
- `docs/F4/screenshots/02-promise.png`
