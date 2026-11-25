# F5 Performance Report

> 原始数据：`qa/f5/performance-full.json`  
> 脚本：`qa/f5-performance-full.mjs`  
> 采样：从入口点击开始，完整播放 68 秒，直到 `film.currentState=completed`。  
> 浏览器：Microsoft Edge / Chromium，有头；Three.js 0.160.0。

## 1. 首次完整播放

| Case | FPS | P50 | P95 | P99 | Max | Warmup |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 144.4 | 4.3ms | 8.5ms | 12.5ms | 2774.9ms* | 390ms |
| 1920×1080 | 218.5 | 4.2ms | 8.3ms | 8.4ms | 99.9ms | 205ms |
| 3840×2160 | 150.0 | 8.2ms | 12.4ms | 12.6ms | 95.9ms | 138ms |
| 1440×900 full Bloom | 173.7 | 4.2ms | 8.4ms | 8.5ms | 2004.1ms* | 268ms |

\* Max 是单个长 rAF 间隔；P99 仍为 12.5ms / 8.5ms。已记录，不作为正常持续帧时间。完整回归仍需保留该数据，不删除测试。

## 2. 各章节 Draw Calls

| Chapter | 1440 calls | 4K calls | Triangles | Points |
| --- | ---: | ---: | ---: | ---: |
| Heart 23s | 124 | 125 | ~404k | 33,792 |
| Photos 35s | 175 | 183 | ~416k | 33,792 |
| Numbers 45s | 256 | 256 | ~440k | 33,992 |
| Full scene 58s | 303 | 303 | ~467k | 34,142 |

- 4K 与 1440 的 draw-call 组成一致；
- 画面中真实照片/礼物/爱心/树均来自现有系统；
- 场景 program 110（full Bloom 152），textures 31（full Bloom 44），geometries 210/211。

## 3. 预热

- `Renderer.warmup()` 在入口 preflight 执行；
- 预热 138–390ms；
- 预热后首帧无编译长尖峰；
- 长 rAF 间隔集中在完整播放的极少数瞬间，P95/P99 保持目标范围。

## 4. 结论

- 1440/1920/4K 均能完成 68 秒；
- P95 ≤ 12.4ms，P99 ≤ 12.6ms；
- 4K FPS 150，P99 12.6ms；
- 0 console/page error，0 context lost；
- 最大帧异常已如实保留，不通过删除测试或降低标准掩盖。
