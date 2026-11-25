# F5 Final Acceptance

## 实现与验证状态

技术开发 S0–S9 已完成，用户已确认进入最终基线与 GitHub 发布。

| 项 | 状态 |
| --- | --- |
| 8 秒原视频保留 | 完成；SHA-256 `F55157D91E02A882AC10841F911257C7CBB389117378C26981270C56C5E97E8D` |
| 8 秒集成视频 | 完成；`01-intro-8s-integrated.webm` |
| 68 秒完整电影 | 完成；`02-film-68s.webm`，67.94 秒，SHA-256 `6BCD45BB419E05777C277B308C35D6889559E5407E3AE87C9FDEBBB8EDA05653` |
| 重要分镜 | 19 张 `story-*.png` |
| 1440/1920/4K 首次播放 | 完成 |
| 10 次以上重播 | 完成；30 分钟测试内 27 次 |
| 6 个中途退出 | 完成；`behavior.json` |
| 5+ 暂停状态 | 完成；`behavior.json` |
| 前后跳转 | 完成 |
| 三档画质 | 完成；三种画质设置均可启动 |
| 窗口尺寸变化 | 完成 |
| 后台恢复 | 完成（导演 visibilitychange 暂停/恢复） |
| 30 分钟稳定性 | 完成；30 分 47 秒，27 次重播，0 context lost，资源计数恒定 |
| GPU 泄漏 | 未发现；Geometry 210 / Texture 31 / Program 110 全程恒定 |
| F3/F4 完整回归 | 完成；smoke、qa2、qa3、raycast、mobile、F4 爱心/记忆/礼物/编辑/存储、单文件均通过 |
| 用户最终确认 | 已确认（2026-11-26） |
| 最终基线 | `main` / `v1.0.0` |

## 性能摘要

- 1440×900：144.4 FPS，P95 8.5ms，P99 12.5ms；
- 1920×1080：218.5 FPS，P95 8.3ms，P99 8.4ms；
- 3840×2160：150.0 FPS，P95 12.4ms，P99 12.6ms；
- 1440 full Bloom：173.7 FPS，P95 8.4ms，P99 8.5ms；
- 0 console/page error，0 context lost。

## 已记录异常

首次完整播放有单个长 rAF 间隔：1440 为 2774.9ms，full Bloom 为 2004.1ms；P99 分别为 12.5ms / 8.5ms。原始数据保留于 `performance-full.json`，未删除测试、未降低标准。该项作为最终验收已知异常记录，稳定性测试未复现为持续问题。

## 最终门禁

- 原 8 秒视频已保留；
- 合并到 `main`；
- 最终基线标签：`v1.0.0`；
- 推送 GitHub：https://github.com/Kevindd668/LOVE-IN-CHRISTMAS
- 不进入 F6。
