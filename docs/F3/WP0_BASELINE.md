# F3 WP0 · 视觉精修基线

> 分支：`f3-visual-polish`  
> 基线提交：`bb7f05c`（已验收 F3）  
> 基线 standalone：`Christmas-Wish.html`  
> 基线 SHA-256：`A443243AFA0C50D222C8728A46178551635DB838A50C0417FEFF0D7CFAE0C511`  
> 基线性能：`qa/f2-integration/performance.json`

## 1. 冻结内容

- 9 层双螺旋树、360 灯泡、48 爱心、水晶心；
- 巨型 3D 体积爱心（10000 粒子、z ±1.29）；
- F2 星空/星云/极光/流星/光瀑/三层轨道；
- 照片、5 个礼物、音乐、45 秒演示、浪漫模式、三档画质、Bloom。

## 2. 基线截图

- `docs/F3/f2-integration-screenshots/01-overall.png`
- `docs/F3/f2-integration-screenshots/02-stars-nebula.png`
- `docs/F3/f2-integration-screenshots/03-double-helix.png`
- `docs/F3/f2-integration-screenshots/04-giant-heart.png`
- `docs/F3/f2-integration-screenshots/07-golden-waterfall.png`
- `docs/F3/f2-integration-screenshots/08-three-orbits.png`
- `docs/F3/f2-integration-screenshots/09-effects-off.png`
- `docs/F3/f2-integration-screenshots/10-controls-interaction.png`
- `docs/F3/heart-look/volume-front.png`
- `docs/F3/heart-look/volume-side.png`

## 3. 基线性能

| 场景 | FPS | P95 | Calls | Points |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 兼容 | 238.0 | 4.3 ms | 314 | 38,362 |
| 1920×1080 兼容 | 239.7 | 4.3 ms | 315 | 38,362 |
| 3840×2160 兼容 | 197.4 | 8.4 ms | 315 | 38,362 |
| 1440×900 Bloom | 235.7 | 4.3 ms | 329 | 38,362 |
| 3840×2160 Bloom | 140.5 | 8.5 ms | 329 | 38,362 |

## 4. 本阶段决策

1. **星空权威层**：正常场景由 `GalaxyEnvironment` 统一承载五层星空；旧 `StarParticles/AuroraEffect` 保留代码，但正常场景隐藏，只在 45 秒演示/浪漫模式中显示。
2. **24 张照片**：≤18 时 4/6/8；>18 时按比例扩展到 6/8/10（WP3 使用，本阶段不实现）。
3. **照片选中**：hover 提亮/轻放大；click 选中放大并变暗其他照片（WP3 使用，本阶段不实现）。

## 5. WP1 范围

只做：

- 深空背景；
- 6000 远景恒星；
- 8000 银河星尘；
- 3 层星云；
- 4 层极光；
- 5 条流星；
- 星空单独/星云/极光/流星/完整场景截图。

不做 WP2–WP5。
