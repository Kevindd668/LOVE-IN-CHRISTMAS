# 8 秒开场分镜与 WP2 证据

## 分镜

| 时间 | 画面 | 技术 |
| --- | --- | --- |
| 0–0.5s | 黑场、中心粉色光点 | `#080E20` 背景，光照苏醒 |
| 0.5–1.0s | 光点放大、心跳 | 中央 Sprite + 心跳节拍 |
| 1.0–1.5s | 星尘出现 | 现有星场 + 星尘 |
| 1.5–3.0s | 三层螺旋星河爆发 | 20,000 粒子，7,000 蓝 / 7,000 金 / 6,000 玫瑰 |
| 3.0–4.5s | 巨型 3D 爱心聚合 | 正式爱心目标 + 心跳 + 冲击波 |
| 4.5–6.5s | LOVE IN CHRISTMAS 标题 | DOM/CSS 标题 + 600 粒子汇聚 + 扫光 |
| 6.5–8.0s | 星云展开、树登场 | 同一正式 `ChristmasTree`，相机拉远 |

## 真实性

- 没有创建第二棵树。
- 没有创建第二个 Renderer 或主动画循环。
- 爱心目标来自正式 `HeartParticleSystem`。
- 标题不是粒子拼字。

## 证据

### 历史开场

- 文件：`docs/F5/INTRO/final-video.webm`
- 冻结副本：`docs/F5/evidence/01-intro-8s-current.webm`
- SHA-256：`F55157D91E02A882AC10841F911257C7CBB389117378C26981270C56C5E97E8D`

### 集成开场（当前 director 包装后）

- 文件：`docs/F5/evidence/01-intro-8s-integrated.webm`
- SHA-256：`99E2921DBAC84D552FED3F55F7CE908FD944AC12F556B74FD8C0449CDCEFE94B`
- 时长：约 9.14 秒（包含 8 秒开场完成后的正式树交接帧）
- 证据截图：
  - `wp2-00-entry.png`
  - `wp2-01-awakening.png`
  - `wp2-02-spiral.png`
  - `wp2-03-heart.png`
  - `wp2-04-title.png`
  - `wp2-05-tree.png`

## WP2 门禁

当前停在 WP2：等待用户观看集成 8 秒录屏并确认视觉验收。  
未确认前不进入 WP3，不实现 8–68 秒故事。
