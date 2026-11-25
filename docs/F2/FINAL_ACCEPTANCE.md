# F2 最终自检与验收清单

> 状态：**F2 实验与证据完成，等待用户最终验收。**  
> F2 未开始 F3，未接入正式产品，未修改正式源码/文档。

## 1. 阶段门禁

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 只做 F2，不开始 F3 | 通过 | 无 F3 文件/代码；实验目录只有 01–05 |
| 不接入正式页面 | 通过 | `experiments/` 独立入口；正式 HTML 不 import 实验 |
| 不修改正式 main / baseline | 通过 | `main`、`v1.0.0-baseline` 仍为 `c9e3d02` |
| 不修改正式 HTML | 通过 | SHA-256 仍为 `12E39D0EFDDC6E24C0B6111F85321E7939E294E55268CBE85BDFF46CF94BD725` |
| 不修改 F0/F1 文档与正式源码 | 通过 | 变更范围仅 `experiments/`、`docs/F2/`、`qa/` |
| 不升级 Three.js / 生产依赖 | 通过 | 本地 vendor 为 0.160.0；未改 `package.json` 生产依赖 |
| 五个实验相互独立 | 通过 | 五个 HTML、五个独立入口、单一 `LabLoop` |
| 不合并成单页 demo | 通过 | `experiments/index.html` 只是入口索引 |

## 2. 五个实验与证据

| 实验 | 核心能力 | 截图 | 文档 |
| --- | --- | --- | --- |
| 01 十万次心跳 | 爱心/星星/爆散/自由/心跳；10000–20000 粒子；实时参数 | `experiments/01-heart-particles/screenshots/`（5 张） | `EXPERIMENT_01_HEART.md` |
| 02 双螺旋圣诞树 | 9 层树、双反向光带、360 灯、48 爱心、1800 流光、水晶心、7 机位 | `experiments/02-double-helix-tree/screenshots/`（8 张） | `EXPERIMENT_02_TREE.md` |
| 03 星河为你亮起 | 18000 星、3 层星云、4 层极光、5 流星、5000 光瀑、3 轨道 | `experiments/03-galaxy-nebula/screenshots/`（6 张） | `EXPERIMENT_03_GALAXY.md` |
| 04 照片记忆 | 12 初始/最大 24；真实上传/替换/删除/排序/聚焦；3 轨道 | `experiments/04-photo-memory/screenshots/`（6 张） | `EXPERIMENT_04_PHOTO.md` |
| 05 电影镜头与粒子字 | 穿越星河、爱心聚合/爆散、520/1314/LOVE/Merry；俯视、定格 | `experiments/05-cinematic-effects/screenshots/`（8 张） | `EXPERIMENT_05_CINEMATIC.md` |

每个实验都有：
- 独立 `index.html`、`src/main.js`、`README.md`、`assets/README.md`、`screenshots/`；
- 共享 UI + 实时参数 + 暂停/重置/退出；
- `window.__LAB__` 测试接口（`getStats`/`dispose` 等）；
- 真实浏览器截图；控制台 0 error。

## 3. 交互实测

### 实验 04（最关键的真实上传链路）

脚本：`qa/lab4-actions.mjs`，Edge 158。

| 步骤 | 实测结果 |
| --- | --- |
| 初始 | 12 张 / 12 行 |
| 上传 8 张真实 JPG | 20 张 / 20 行 |
| 替换一张 | 文件名由 `1.jpg` → `3.jpg`，数量不变 |
| 删除一张 | 19 张 / 19 行 |
| 下移排序 | `memory-02.jpg` 与 `memory-01.jpg` 交换成功 |
| 点击 3D 卡片 | 聚焦成功，详情面板打开，`getStats().focused` 有值 |
| 补足 24 张 | 24 张 / 24 行；116 calls |
| 控制台 | 0 error |

补充：IndexedDB 实验入口已实测保存一张上传图、刷新页面后读回，记录数由 12 → 13；见运行记录（`qa/f2-idb-test.mjs`）。

### 实验 05

`compiled text` 的 `520`、`1314` 成功形成；`LOVE` / `Merry Christmas` 可切换；`heartSequence`、`journey`、`top`、`freeze` 均执行；0 error。

### 实验 01 / 02 / 03

- 01：heart → star → burst → free 成功；240 FPS。
- 02：7 个视角全部截图；9 层/360 灯/48 爱心；0 error。
- 03：5 个视角全部截图；星云/极光/光瀑/流星可见；0 error。

## 4. 性能

详见 `PERFORMANCE_REPORT.md` 与 `qa/f2/performance.json`。

- 五个实验均约 240 FPS（240 Hz 上限），P95 帧时间 4.3 ms。
- 最大 draw calls：04 的 24 张照片状态 116；02 的灯光近景 70。
- 最大三角面：02 的 356,508；最大粒子：03 的 23,860。
- 未发现控制台错误。

## 5. 来源与素材合规

- 五个参考仓库的 URL、分支、提交、公开 LICENSE 档案与实际使用范围见 `SOURCE_REUSE_REPORT.md`。
- **五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。** 该授权适用于 F2/F3；不再以“未独立核验”或缺少 LICENSE 文件作为限制。
- 未引入第三方图片/音乐/模型/字体/贴图；04 的 QA 上传图片仅用于测试链路。

## 6. 已知限制

1. 01 的星形高光在极高 Bloom 下可能略方/过曝。
2. 02 的树冠基础是本项目既有实现的本地副本；参考仓库没有 9 层双螺旋树体。
3. 03 的极光是艺术化着色器，不是物理模拟。
4. 04 的 24 张状态会发生轨道遮挡；这是容量压力结果。
5. 05 的 LOVE/Merry 粒子字体清晰度低于数字文本。
6. 性能只测了本机 Edge 158 + RTX 3070 Ti Laptop，未覆盖低端设备/移动端。
7. IndexedDB 仅实验验证，不进入正式产品。

## 7. 结论

F2 的五个独立实验、真实浏览器截图、性能记录、来源/许可证记录和九份 F2 文档均已完成；正式产品与 F0/F1 边界未被改动。**F2 自检通过，待用户最终验收。**
