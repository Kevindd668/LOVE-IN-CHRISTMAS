# F5 Final Baseline

## 最终基线

| 项 | 值 |
| --- | --- |
| 项目名称 | **LOVE IN CHRISTMAS** |
| 版本 | `v1.0.0` |
| 分支 | `main` |
| GitHub | https://github.com/Kevindd668/LOVE-IN-CHRISTMAS |
| 技术基线 | Three.js `0.160.0` / TypeScript / Vite |
| 单文件 | `Christmas-Wish.html` |
| 电影 | 68 秒（8 秒开场 + 60 秒故事） |

## 不可变资产

- 原 8 秒开场视频：`docs/F5/INTRO/final-video.webm`
- 冻结副本：`docs/F5/evidence/01-intro-8s-current.webm`
  - SHA-256：`F55157D91E02A882AC10841F911257C7CBB389117378C26981270C56C5E97E8D`
- 68 秒完整电影：`docs/F5/evidence/02-film-68s.webm`
  - 时长：67.94 秒
  - SHA-256：`6BCD45BB419E05777C277B308C35D6889559E5407E3AE87C9FDEBBB8EDA05653`

## 验证摘要

- 1440 / 1920 / 4K / full Bloom 完整播放；
- 30 分钟稳定性：27 次完整重播，0 context lost，Geometry/Texture/Program 恒定；
- F3/F4 回归、单文件离线通过；
- 已知单帧长 rAF 异常保留在性能原始数据，未删除测试。

## 历史基线

- `v1.0.0-baseline`：项目最初基线，保留不改；
- `f3-accepted`、`f4-accepted`：F3/F4 验收点；
- `f5-candidate`：F5 完整电影候选点。
