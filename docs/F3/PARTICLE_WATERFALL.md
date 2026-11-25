# F3 WP2 · 金色粒子光瀑重构

> 分支：`f3-visual-polish`  
> 基线：WP1 `b5b8368`  
> 范围：只执行 WP2；WP3–WP6 未开始。  
> standalone：`Christmas-Wish.html`  
> SHA-256：`EA4A0DAA5471A6C33890E3F216B605F5DF6C9387F12EE5B75AF7F0A440C0D5B3`

## 1. 结果

原来的单一 5000 粒子 + 一整圈金色光帘已删除，改为四条独立空间路径：

| 路径 | 数量 | 颜色 | 轨迹 |
| --- | ---: | --- | --- |
| 左侧香槟金 | 1200 | `#E8C98A` | 从树冠向地面下落，向左外侧弯曲 |
| 右侧玫瑰金 | 1800 | `#D88978` | 从树冠向地面下落，向右外侧弯曲 |
| 后方稀疏金幕 | 2000 | `#C9A260` | 后方宽幅、低透明度粒子幕 |
| 树顶向天空扩散 | 800 | `#FFD7A0` | 从树顶向上、向外螺旋扩散 |

总计 **5800** 粒子，与要求一致。

## 2. 实现

文件：`src/effects/GalaxyEnvironment.ts`

- 保持使用 F2 实验 03 的粒子 shader 体系；
- 四条路径各自是独立 `THREE.Points`，共用一个 `GalaxyEnvironment`；
- 每条路径独立：
  - speed
  - size
  - alpha
  - color
  - phase
  - 轨迹函数
- 删除原来的 `CylinderGeometry` 金色光帘，不再形成“金色墙”；
- 保留光瀑总开关；
- 保留三档画质降级：
  - Ultra：5800；
  - Balanced：按 0.65 缩放；
  - Performance：按 0.35 缩放。
- 新增调试接口 `setWaterfallPathMask(mask)`，用于单独截图/定位四条路径；正式 UI 不暴露该调试位。

## 3. 截图

目录：`docs/F3/wp2/`

| 文件 | 内容 |
| --- | --- |
| `00-overall.png` | 四条路径同时开启 |
| `01-left.png` | 左侧香槟金路径 |
| `02-right.png` | 右侧玫瑰金路径 |
| `03-rear.png` | 后方稀疏金幕视角 |
| `04-crown.png` | 树顶向天空扩散视角 |
| `05-all.png` | 全路径 |
| `compare-waterfall.png` | 旧金色墙 vs 四路径 |
| `waterfall-flow.webm` | 9 秒动态录屏 |

说明：后方路径本身是低透明度、宽幅、稀疏的幕后粒子；在正式正面构图中会被树体遮挡，需要绕到背面/侧面观察。树顶路径需要抬头或抬高镜头观察。

## 4. 性能

数据：`qa/wp2/performance.json`

| 场景 | FPS | P95 | Draw Calls | Points |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 | 239.6 | 4.3 ms | 316 | 33,962 |
| 3840×2160 | 148.7 | 12.5 ms | 316 | 33,962 |

- 粒子总数比 WP1 增加 800（5000 → 5800）；
- draw calls 从 314 增至 316（四条路径分组）；
- 4K 仍高于 60 FPS；
- 无 WebGL context loss。

## 5. 回归

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `npm run build:single` | 通过 |
| smoke | 通过，0 error |
| raycast | 通过 |
| qa2 | 通过 |
| qa3 | 通过 |
| mobile | 通过 |
| singlefile | 通过，0 failed request |

## 6. 边界

- 本阶段只改光瀑；照片、地面、树体比例、巨型爱心均未改；
- 后方/树顶路径是稀疏粒子，不是实心光柱；
- 动态录屏使用真实浏览器 Canvas `captureStream + MediaRecorder`，不是 AI 生成；
- WP3–WP6 未开始。
