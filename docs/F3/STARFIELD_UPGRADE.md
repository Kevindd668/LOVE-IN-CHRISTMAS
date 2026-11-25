# F3 WP1 · 星空环境升级

> 分支：`f3-visual-polish`（已合并入 F3 最终分支）  
> 基线：`bb7f05c`（已验收 F3）  
> 范围：WP1；WP2–WP6 已完成。  
> 最终 standalone：`Christmas-Wish.html`  
> 最终 SHA-256：`06F00FDDD8640A97568548F3385949751C4DD76C6CC86BECDA326ADD64F9DE49`

## 1. 五层结构

| 层 | 实现 | 参数 |
| --- | --- | --- |
| 1 深空背景 | 155 半径 Sky Dome Shader + Scene 背景 | `#080E20` 主背景，向地平线过渡为蓝紫 |
| 2 远景恒星 | 均匀球壳 Points | 6000 |
| 3 银河星尘 | 倾斜银河带 Points + 程序化银河带 Shader | 8000 |
| 4 动态星云 | 3 层 FBM Shader Plane | `#704A91` / `#243F78` / `#3B5AA6` |
| 5 多层极光 | 4 层极光 Plane Shader | `#36C9B0` 系 |
| 流星 | 5 条 Line 轨迹 | 独立生命周期 |

星尘不再均匀塞满球壳，而是沿一条倾斜的银河带分布：核心 68% 粒子集中在窄带内，外围保留稀疏尘埃；银河带 Shader 提供蓝紫云气、亮核与星点，而不是单纯增加粒子。

## 2. 关键改动

### `GalaxyEnvironment`

- 远景恒星：6000；
- 银河星尘：8000；
- 星尘 shader 增加 `uDust` 分支：蓝紫/粉紫调色、尺寸和 alpha 提升；
- 新增 `SKY_VERTEX/FRAGMENT`：155 半径深空穹顶；
- 新增 `GALAXY_BAND_FRAGMENT`：倾斜银河带程序化云气；
- 星云颜色改为蓝/紫；
- 极光颜色改为青绿色系；
- 流星保持 5 条；
- 深空背景、星尘、星云、极光、流星仍共享一个 Scene/AnimationManager。

### 旧夜空层

- 正常场景：旧 `StarParticles`/`AuroraEffect` 隐藏；
- 45 秒演示与浪漫模式：旧层仍按原透明度编排显示；
- 未删除旧模块，避免破坏演示与旧设置链路；
- 正常场景只有 Galaxy 一套星空/极光/流星，避免叠加。

### 设置

- 默认背景色从 `#061522` 改为 `#080E20`；
- 设置面板颜色默认值同步；
- 星空/极光/流星/光瀑/轨道开关继续绑定真实对象。

## 3. 截图

目录：`docs/F3/wp1/`

| 文件 | 内容 |
| --- | --- |
| `01-stars.png` | 星空：恒星 + 银河带 |
| `02-nebula.png` | 3 层星云 |
| `03-aurora.png` | 4 层极光 |
| `04-meteor-sky.png` | 流星 |
| `05-complete.png` | 完整场景（UI 隐藏） |
| `wp1-compare-overall.png` | 整体前后对比 |
| `wp1-compare-sky.png` | 星空前后对比 |

## 4. 性能

数据：`qa/wp1/performance.json`

| 场景 | FPS | P95 | Draw Calls | Points |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 | 206.8 | 8.4 ms | 314 | 33,162 |
| 1920×1080 | 238.8 | 4.3 ms | 314 | 33,162 |
| 3840×2160 | 132.9 | 8.4 ms | 314 | 33,162 |
| 1440×900 Bloom | 96.8 | 16.6 ms | 328 | 33,162 |

与基线相比：

- 粒子总数从 38,362 降到 33,162；
- draw calls 314/328，与基线基本持平；
- 4K 仍高于 60 FPS；
- 4K 采样出现一次 1000ms 首帧/编译尖峰，P95 仍为 8.4ms；WP6 会做更完整的稳定窗口；
- 无 WebGL context loss。

## 5. 回归

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `npm run build:single` | 通过 |
| `qa/smoke-test.mjs` | 通过，0 error |
| `qa/raycast-test.mjs` | 通过 |
| `qa/qa2.mjs` | 通过 |
| `qa/qa3.mjs` | 通过 |
| `qa/mobile-test.mjs` | 通过 |
| `qa/singlefile-test.mjs` | 通过，0 failed request |

## 6. 已知边界

- 星云与极光是程序化 Shader，不是照片级真实天文图；
- 正常场景旧星空层隐藏，只在演示/浪漫模式显示；
- 本轮没有改照片布局、光瀑、地面、树体比例；
- WP2–WP6 未开始。
