# F3 · F2 集成性能报告

> 测试日期：2026-11-25  
> 分支：`f3-f2-integration`  
> 数据：`qa/f2-integration/performance.json`  
> 脚本：`qa/f2-integration-performance.mjs`  
> 对照基线：`qa/f0/performance-baseline.json` / [F0 PERFORMANCE_BASELINE](../F0/PERFORMANCE_BASELINE.md)

## 1. 环境

| 项 | 值 |
| --- | --- |
| OS | Windows 11 |
| CPU | 12th Gen Intel Core i9-12900H |
| GPU | NVIDIA GeForce RTX 3070 Ti Laptop GPU |
| WebGL | `ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti Laptop GPU, D3D11)` |
| Browser | Microsoft Edge 158.0.4370.33，headed，硬件加速 |
| 显示 | 2560×1440 @ 240 Hz |
| Three | 0.160.0 |
| 采样 | 每场景 3 秒 RAF 间隔；面板关闭；新浏览器 context |

## 2. 测试矩阵

| 场景 | 分辨率 | 模式 | 画质 | 粒子 |
| --- | --- | --- | --- | --- |
| full-1440x900 | 1440×900 | 兼容 | Ultra | 10000 爱心 + 12000/6000 星 + 5000 光瀑 |
| full-1920x1080 | 1920×1080 | 兼容 | Ultra | 同上 |
| full-3840x2160 | 3840×2160 | 兼容 | Ultra | 同上 |
| full-bloom-1440x900 | 1440×900 | 完整 Bloom | Ultra | 同上 |
| full-bloom-1920x1080 | 1920×1080 | 完整 Bloom | Ultra | 同上 |
| full-bloom-3840x2160 | 3840×2160 | 完整 Bloom | Ultra | 同上 |
| partial-1440x900 | 1440×900 | 兼容 | Ultra | Galaxy 关闭，保留树 + 10000 爱心 |
| performance-1440x900 | 1440×900 | 兼容 | Performance | 6000 爱心 + 3600/1800 星 + 1750 光瀑 |

## 3. 结果

| 场景 | 平均 FPS | P50 ms | P95 ms | Draw Calls | Triangles | Points | Textures | Geometries | JS Heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| full-1440x900 | **238.0** | 4.2 | 4.3 | 314 | 468,252 | 38,362 | 33 | 215 | 27.0 MB |
| full-1920x1080 | **239.7** | 4.2 | 4.3 | 315 | 468,252 | 38,362 | 33 | 216 | 31.8 MB |
| full-3840x2160 | **197.4** | 4.2 | 8.4 | 315 | 468,252 | 38,362 | 33 | 216 | 29.1 MB |
| full-bloom-1440x900 | **235.7** | 4.2 | 4.3 | 329 | 468,266 | 38,362 | 46 | 217 | 35.0 MB |
| full-bloom-1920x1080 | **239.7** | 4.2 | 4.3 | 329 | 468,266 | 38,362 | 46 | 217 | 30.1 MB |
| full-bloom-3840x2160 | **140.5** | 4.2 | 8.5 | 329 | 468,266 | 38,362 | 46 | 217 | 31.2 MB |
| partial-1440x900 | **237.0** | 4.2 | 4.3 | 293 | 460,438 | 14,822 | 33 | 216 | 23.6 MB |
| performance-1440x900 | **238.3** | 4.2 | 4.3 | 307 | 460,438 | 16,472 | 33 | 216 | 23.7 MB |

所有场景：

- `contextLost = 0`；
- console/page error = 0；
- 完整 Bloom 在 `?full=1` 下真实启用（pipeline=true）；
- 4K 画布为 3840×2160。

## 4. 与 F0 对照

| 场景 | F0 基线 | F2 集成 | 变化 |
| --- | ---: | ---: | --- |
| 1440×900 兼容 Ultra | 233.9 FPS / p95 4.3 ms / 271 calls / 310,674 tri | 236.3 FPS / p95 4.3 ms / 314 calls / 468,252 tri | FPS 持平；draw calls +43、triangles +157,578（新增 F2 内容） |
| 1920×1080 兼容 Ultra | 224.5 FPS / p95 8.3 ms / 271 calls | 239.7 FPS / p95 4.3 ms / 315 calls | 不低于基线 |
| 3840×2160 | 192.1 FPS / p95 8.4 ms / 271 calls | 197.4 FPS / p95 8.4 ms / 315 calls | 持平 |
| 1440×900 完整 Bloom | 196.0 FPS / p95 8.4 ms / 285 calls | 235.7 FPS / p95 4.3 ms / 329 calls | 不低于基线 |
| 3840×2160 完整 Bloom | 未单列 | 140.5 FPS / p95 8.5 ms / 329 calls | 新增记录，仍高于 60 FPS |
| Performance 1440×900 | 234.6 FPS / p95 4.3 ms | 237.0 FPS / p95 4.3 ms | 不低于基线 |

## 5. 资源

- 纹理：33（完整 Bloom 46）；
- 几何：215–217；
- Points：38,362（完整 F2）；14,822（Galaxy 关闭）；16,472（Performance）；
- 巨型爱心：10,000 / 6,000（Performance）；
- 星空：12,000 + 6,000 / 3,600 + 1,800（Performance）；
- 光瀑：5,000 / 1,750（Performance）；
- 星云/极光：3+4 层 / 0（Performance）。

## 6. 解释

- 所有兼容场景都触及 240 Hz 刷新上限；FPS 数字主要证明“60 FPS 余量”，不是无限性能；
- 4K 兼容场景保持 197.4 FPS / p95 8.4 ms；
- 4K 完整 Bloom 为 140.5 FPS / p95 8.5 ms，仍高于 60 FPS；
- 完整 Bloom 1440/1920 保持 235–240 FPS；
- Performance 档真实降低粒子、星空、光瀑、星云/极光层数和像素比；
- 关闭 Galaxy 后 draw calls 从 314 降到 293，points 从 38,362 降到 14,822；
- 本轮未做 30 分钟持续运行和 GPU 进程级显存采样；数据为 3 秒稳定窗口。

## 7. 结论

F2 三个实验集成后，在 1440×900、1920×1080、3840×2160 的完整特效和完整 Bloom 场景中均保持 60 FPS 以上；Partial 和 Performance 档也保持目标以上。新增内容使 draw calls 与 triangles 增加，但没有造成 FPS/P95 回退；资源数量稳定，无 WebGL context loss。
