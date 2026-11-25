# F3 最终自检与验收清单

> 状态：**F3 WP1–WP6 已通过用户验收，已合并到 `feature/visual-upgrade`。**  
> F4 / F5 未开始。  
> 最终 standalone SHA-256：`06F00FDDD8640A97568548F3385949751C4DD76C6CC86BECDA326ADD64F9DE49`

## 1. 阶段门禁

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 只在 F3 工作 | 通过 | 没有 F4/F5 功能文件 |
| 不修改 main | 通过 | `main` 仍为 `c9e3d02` |
| 不修改 v1.0.0-baseline | 通过 | 标签目标仍为 `c9e3d02` |
| 不覆盖 F0/F1/F2 报告 | 通过 | 只更新 `docs/F3/` |
| F2 五个实验保留 | 通过 | `experiments/01…05` 未删改 |
| 不引入生产依赖/GSAP | 通过 | `package.json` 未新增依赖 |
| Three.js 版本 | 通过 | 0.160.0 |
| 单一渲染循环 | 通过 | 仍由 `AnimationManager` 驱动 |
| 礼物数量 | 通过 | 仍为 5 个 |
| 45 秒演示 | 通过 | `CINEMA_DURATION=45` |

## 2. WP1–WP6 完成度

| 工作包 | 内容 | 结果 |
| --- | --- | --- |
| WP0 | 视觉基线冻结 | 完成 |
| WP1 | 五层星空、银河带、星云、极光、流星 | 完成 |
| WP2 | 四条独立金色光瀑，5800 粒子 | 完成 |
| WP3 | 三层照片轨道，初始 6 → 最大 24 | 完成 |
| WP4 | 冬日地面、雪斑、冰晶、环形光、展示台 | 完成 |
| WP5 | 树体 1.24 倍、相机/照片/爱心构图 | 完成 |
| WP6 | 性能、回归、截图、录屏、最终文档 | 完成 |

## 3. 视觉验收

### 3.1 星空

- 6000 远景恒星 + 8000 银河星尘；
- 3 层星云、4 层极光、5 条流星；
- 旧 StarParticles/AuroraEffect 只在 45 秒演示/浪漫模式可见；
- 截图：`final-screenshots/02-starfield.png`、`03-nebula-aurora.png`。

### 3.2 光瀑

- 四条路径 1200 / 1800 / 2000 / 800，总计 5800；
- 无圆柱光帘；
- 截图：`final-screenshots/04-waterfall.png`；录屏：`wp2/waterfall-flow.webm`。

### 3.3 照片

| 照片数 | 左 | 右 | 轨道 |
| ---: | ---: | ---: | --- |
| 6（初始） | 3 | 3 | 2/2/2 |
| 8 | 4 | 4 | 2/2/4 |
| 12 | 6 | 6 | 4/4/4 |
| 24（最终） | 12 | 12 | 6/8/10 |

- 上传、替换、删除、排序保留；
- 选中放大、其他变暗保留；
- 截图：`final-screenshots/05-photo-6.png`、`06-photo-24.png`。

### 3.4 地面

- 地面 `#263B4C` / 雪高光 `#A8BBC8`；
- 不规则雪斑、冰晶、低空微光、香槟金环光；
- 石台/雪盖/金圈/展示环、接触阴影、模拟反射；
- 三档画质：冰晶 48/24/0，低空微光 180/90/0；
- 截图：`final-screenshots/07-ground.png`、`docs/F3/wp4/`。

### 3.5 树体与构图

- 树体展示缩放 1.24；
- 树顶水晶心完整，底部展示台可见；
- 520/1314 同步缩放；
- 巨型爱心位于右后方，不遮挡树顶；
- 照片轨道半径 ×1.16；
- 5 个礼物位置 ×1.2，raycast 通过；
- 截图：`final-screenshots/01-overall.png`、`09-tree.png`、`08-heart.png`。

## 4. 性能

| Case | FPS | P95 |
| --- | ---: | ---: |
| 1440×900 默认 | 174.1 | 8.4 ms |
| 1920×1080 默认 | 160.9 | 8.4 ms |
| 3840×2160 默认 | 185.9 | 8.4 ms |
| 1440×900 完整 Bloom | 135.1 | 8.5 ms |
| 3840×2160 完整 Bloom | 111.6 | 12.5 ms |
| 1440×900 Performance | 164.1 | 8.4 ms |
| 1440×900 24 张照片 | 125.4 | 12.4 ms |

全部 `contextLost=0`，0 console/page error。完整数据见 `PERFORMANCE_REPORT.md` 与 `qa/f3-final/performance.json`。

## 5. 回归

| 测试 | 结果 |
| --- | --- |
| typecheck | 通过 |
| build | 通过 |
| build:single | 通过 |
| smoke | 通过 |
| raycast | 通过 |
| qa2（树点击/音乐/45s demo/礼物） | 通过 |
| qa3（浪漫模式/照片） | 通过 |
| mobile | 通过 |
| singlefile | 通过 |
| 6/8/12/24 张照片 | 通过 |
| 三档画质 | 通过 |
| 完整 Bloom | 通过 |
| 设置持久化 | 通过 |

详细记录见 `REGRESSION_REPORT.md`。

## 6. 交付资产

```text
docs/F3/
├── README.md
├── STARFIELD_UPGRADE.md
├── PARTICLE_WATERFALL.md
├── PHOTO_LAYOUT.md
├── GROUND_ENVIRONMENT.md
├── SCENE_COMPOSITION.md
├── SOURCE_REUSE_REPORT.md
├── PERFORMANCE_REPORT.md
├── REGRESSION_REPORT.md
└── FINAL_ACCEPTANCE.md

docs/F3/final-screenshots/
├── 01-overall.png
├── 02-starfield.png
├── 03-nebula-aurora.png
├── 04-waterfall.png
├── 05-photo-6.png
├── 06-photo-24.png
├── 07-ground.png
├── 08-heart.png
├── 09-tree.png
├── 10-controls.png
└── 11-before-after.png

docs/F3/final-video.webm
Christmas-Wish.html
```

截图均为真实 Edge/WebGL 输出；2/3/4 为 WP1/WP2 的正式截图资产，7 为 WP4 地面近景，1/5/6/8/9/10/11 为 WP5/WP6 最终构建。录屏为 Canvas `captureStream + MediaRecorder`，不是 AI 生成。

## 7. 已知边界

- 24 张照片在极端投影下仍可能有轻微边缘重叠；
- 地面反射是 CanvasTexture 模拟反射，不是 SSR；
- 性能数据仅代表本机 Edge + RTX 3070 Ti Laptop；
- 移动端只验证布局与交互，不是移动 GPU 性能测试；
- F4 的照片记忆、爱情交互、礼物内容、IndexedDB 和专属礼物包均未实现；
- F5 的 60 秒电影未实现。

## 8. 最终结论

F3 的视觉精修、地面、构图、性能、回归、截图和文档均已完成，未发现阻断级问题。已通过用户验收并合并到 `feature/visual-upgrade`；F4 尚未开始。
