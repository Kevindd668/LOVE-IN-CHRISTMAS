# F2 · 视觉实验室总览

## 阶段边界

F2 只完成五个**彼此独立**的视觉实验。本阶段：

- 不开始 F3；
- 不把实验接入正式 `Christmas-Wish.html` / `src/` / 正式构建；
- 不修改正式 main、基线标签、F0/F1 文档、正式源码或生产依赖；
- 不升级 Three.js；实验使用本地 0.160.0 副本；
- 不把实验合并成一个演示页；`experiments/index.html` 只是五个独立入口的索引。

正式产品基线仍为 `c9e3d02`，正式页面哈希保持 `12E39D0EFDDC6E24C0B6111F85321E7939E294E55268CBE85BDFF46CF94BD725`。

## 运行

```powershell
cd C:\Users\29636\Desktop\日常交流\Christmas-Wish
node experiments/serve.mjs
```

打开 <http://127.0.0.1:8787/>，或直接进入：

| 实验 | URL | 来源/重点 |
| --- | --- | --- |
| 01 十万次心跳 | `/01-heart-particles/` | Heart-Star 的爱心/星形数学与节奏 |
| 02 双螺旋圣诞树 | `/02-double-helix-tree/` | 9 层树冠 + 双反向光带 + 360 灯泡 + 水晶爱心 |
| 03 星河为你亮起 | `/03-galaxy-nebula/` | 星云、极光、流星、金色光瀑、发光轨道 |
| 04 我们的照片记忆 | `/04-photo-memory/` | 3D 照片轨道、本地上传/替换/删除/排序/聚焦 |
| 05 把这句话写进星河 | `/05-cinematic-effects/` | 电影镜头、爱心聚合、520/1314/LOVE 粒子字 |

每个实验都有独立 HTML、独立入口、独立参数面板、暂停/重置/退出和 `window.__LAB__` 测试接口；共享的只有 `shared/loop.js`、`shared/ui.js`、`shared/lab.css` 与本地 Three.js 副本。每个实验只有一个 `LabLoop` rAF 主循环。

## 产物

- `experiments/01-heart-particles/` … `experiments/05-cinematic-effects/`
- 每个实验的 `README.md`、`assets/README.md`、`screenshots/`（真实浏览器截图）
- `qa/f2-lab-capture.mjs`：在 1440×900 下重新截取全部实验截图和指标
- `qa/f2/performance.json`：2026-11-25 的实测性能原始记录
- 本目录九份文档：
  - `README.md`、`EXPERIMENT_01_HEART.md`、`EXPERIMENT_02_TREE.md`、`EXPERIMENT_03_GALAXY.md`、`EXPERIMENT_04_PHOTO.md`、`EXPERIMENT_05_CINEMATIC.md`
  - `SOURCE_REUSE_REPORT.md`、`PERFORMANCE_REPORT.md`、`FINAL_ACCEPTANCE.md`

## 证据边界

- 截图均为 Edge 158 的真实 WebGL 画布截图，1440×900，非设计稿、非产品截图。
- 性能数据来自本机 RTX 3070 Ti Laptop；受显卡、浏览器节流、窗口可见性影响，不能外推为所有设备。
- 参考仓库的图像、音乐、模型、字体、贴图没有被引入。照片实验的 12 张初始图是本地 Canvas 生成的占位图；QA 上传图只用于验证上传链路。
- **五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。** 该授权适用于 F2/F3；不再以“未独立核验”或“仓库缺少 LICENSE 文件”作为限制。来源档案见 `SOURCE_REUSE_REPORT.md`。

## 已知限制

- 01 的星形尖角在 Bloom 高光下仍可能出现轻微方形/过曝；不影响聚合/爆散/参数交互。
- 02 的树冠基础是项目既有树实现的本地实验副本，不是来自参考仓库的完整树体；参考仓库的树体为点云/单螺旋，无法直接满足“9 层双螺旋”的视觉要求。
- 03 的极光/星云是艺术化程序化着色器，不是天文模拟。
- 04 的照片仅在本地浏览器内处理；IndexedDB 为实验性能力，未写入正式产品。
- 05 的 `LOVE` / `Merry Christmas` 在 8000 粒子下受 Bloom 影响，清晰度低于 `520` / `1314`；已提供单独按钮和不同粒子目标。

F2 未开始 F3，也未进行任何正式集成。
