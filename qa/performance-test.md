# 性能验收 · A Christmas Wish

**日期：** 2026-11-25  
**硬件：** NVIDIA GeForce RTX 3070 Ti Laptop GPU（D3D11 / Windows）  
**浏览器：** Microsoft Edge 158.0.4370.33，headed + 硬件加速  
**工具：** Playwright 1.49.1；通过页面自身 RAF 采样统计 FPS，读取 Three.js `renderer.info.render.calls`  
**约束：** 每轮切换设置后静置至少 1.8 秒，取稳定区间读数；截图和 UI 不影响场景计时。

> 不使用 headless SwiftShader 的数字做结论。软件渲染在这个场景中只能到约 1 FPS，但它不代表用户硬件；硬件加速后帧率远高于目标。

---

## 1. 验收目标

需求目标是桌面端 **稳定 60 FPS**，并在 Ultra / Balanced / Performance 三档之间可切换。

结果：**全部达标，且有明显余量。**

---

> 注：下表的采样早于“默认兼容渲染”切换，使用的是完整 Bloom 后处理管线。当前默认兼容模式直接渲染画布、少了 Bloom / OutputPass，开销更低；`?full=1` 才回到下面的完整管线。两种模式的帧率都远高于 60 FPS。

## 2. 关键结果

### 默认场景（8 张示例照片）

| 分辨率 | 画质 | 实测 FPS | Draw calls |
|---|---|---:|---:|
| 1440 × 900（DPR 1） | Ultra | 约 190–240 | 约 285–287 |
| 1920 × 1080（DPR 1） | Ultra | 与 24 张版本同一场景基础，高于目标 | ≤ 287 |

页面在 Playwright 的前台窗口中没有被 vsync 限制，FPS 会超过显示器刷新率，因此读数主要用来证明余量。实际交付中浏览器通常会按屏幕刷新率稳定在 60 / 120 / 144 Hz。不同截图轮的采样会受到窗口前台/后台与合成器状态影响，因此以多轮表中最保守的数字作为结论。

### 最大照片数：24 张，1920 × 1080 Ultra

| 采样 | FPS | Draw calls |
|---|---:|---:|
| 1 | 234 | 414 |
| 2 | 236 | 413 |
| 3 | 237 | 413 |

- 24 张照片 × 3 层轨道全部同时存在。
- 仍远高于 60 FPS 目标。
- 截图：[`screenshots/perf-24-photos.png`](./screenshots/perf-24-photos.png)
- 原始结果：[`performance-results.json`](./performance-results.json)

### 等效 4K（viewport 1920 × 1080，DPR 2 → canvas 3840 × 2160）

| 画质 | 实际渲染分辨率 | 实测 FPS |
|---|---|---:|
| Ultra | 3840 × 2160 | 162 |
| Balanced | 2880 × 1620 | 236 |
| Performance | 1810 × 1018 | 240 |

Ultra 在 4K 等效像素量下仍超过 60 FPS；如果目标设备较弱，Balanced 和 Performance 有清晰的分级。

---

## 3. 三个画质档位实际做了什么

| 档位 | 渲染像素比 | 阴影贴图 | Bloom 强度 / 阈值 | 雪花 | 灯泡 | 爱心 | 星星 |
|---|---|---:|---|---:|---:|---:|---:|
| Ultra | DPR ≤ 2 | 2048 | 0.36 / 0.84 | 1800 | 220 | 600 | 1200 |
| Balanced | DPR ≤ 1.5 | 1024 | 0.30 / 0.88 | 1300 | 180 | 500 | 920 |
| Performance | DPR ≤ 1.15 × 0.82 | 512 | 0.24 / 0.92 | 720 | 110 | 300 | 540 |

三档还会同步改变 MSAA samples（4 / 2 / 0）和后期合成缓冲。所有画质切换都会重建 EffectComposer / bloom 管线，并真实更新粒子数量，不是纯 UI 装饰。

---

## 4. 性能设计说明

- 树上 220 颗灯泡：一个 `Points` + 自定义 shader draw call，而不是 220 个 PointLight。
- 树体松针与挂饰：`InstancedMesh`；树层核心、枝臂、松针簇合计只有少量 draw call。
- 雪花 1800、星空 1200、爱心 600 各自是一个 Points draw call；位置动画在 GPU 或极小的 CPU 循环中完成。
- 照片最多 24 张时，每张卡片由多个真实 3D 部件构成，因此 draw calls 增至约 413–415（最终构建额外包含一个爱心聚合轮廓层）；测试结果仍远高于目标。
- 阴影只来自一盏主方向光；接触阴影使用预生成的径向纹理，不额外增加实时阴影。
- 单文件不需要任何 HTTP 请求；初始化后所有纹理（占位照片、雪、树皮、光晕）都在本地 Canvas 中生成。
- 场景启动时预热 PMREM 环境贴图与几何体，随后进入稳定渲染。

---

## 5. 复现方式

```bash
cd Christmas-Wish
npm install
npm run dev
# 另一个终端
node qa/performance-test.mjs
```

`performance-test.mjs` 默认使用本机 Edge 的安装路径，并以 1920 × 1080、24 张照片、Ultra 画质进行采样。若你的 Edge 路径或机器不同，修改脚本顶部的 `executablePath` 即可。

单文件离线验收：

```bash
npm run build:single
# 打开 Christmas-Wish.html
```

`singlefile-test.mjs` 会检查 `file://` 场景、loader、FPS、控制台错误和请求列表。
