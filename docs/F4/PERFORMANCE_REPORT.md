# F4 性能报告

> 原始数据：`qa/f4/performance.json`  
> 脚本：`qa/f4-performance.mjs`  
> 浏览器：Microsoft Edge / Chromium，有头  
> GPU：NVIDIA GeForce RTX 3070 Ti Laptop GPU，D3D11  
> Three.js：0.160.0  
> 最终 standalone SHA-256：`5A5053593E0F436E530A7C08CE6D6FD7625206AA3B088688F63A8895392816F3`

## 1. 结果

| Case | FPS | P50 | P95 | Draw calls | Triangles | Points | Textures | Geometries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440×900 默认 | 193.0 | 4.2 | 8.4 | 315 | 467,184 | 34,142 | 30 | 207 |
| 3840×2160 默认 | 146.0 | 8.3 | 12.5 | 315 | 467,184 | 34,142 | 30 | 207 |
| 1440×900 完整 Bloom | 184.1 | 4.2 | 8.4 | 329 | 467,198 | 34,142 | 43 | 208 |
| 1440×900 24 张照片 | 122.7 | 8.3 | 12.5 | 459 | 493,392 | 34,142 | 66 | 333 |
| 1440×900 爱情数字 | 168.1 | 4.2 | 8.5 | 310 | 435,792 | 35,592 | 30 | 208 |

全部 case：

- `contextLost=0`；
- 0 console/page error；
- 1440/4K 默认均显著高于 60 FPS；
- 24 张照片 122.7 FPS，P95 12.5ms；
- 爱情数字模式增加 1,800 个 Points，FPS 仍高于 60；
- 未新增 Renderer、RAF、后处理或每帧 DOM 重建。

## 2. 与 F3 对比

F3 最终实测（`docs/F3/PERFORMANCE_REPORT.md`）：

| Case | F3 FPS | F4 FPS | F3 calls | F4 calls |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 默认 | 174.1 | 193.0 | 315 | 315 |
| 3840×2160 默认 | 185.9 | 146.0 | 315 | 315 |
| 1440×900 完整 Bloom | 135.1 | 184.1 | 329 | 329 |
| 1440×900 24 张照片 | 125.4 | 122.7 | 459 | 459 |

F4 的默认场景 draw calls 与 F3 相同；主要新增成本来自 24 张照片（+144 calls）和爱情数字（+1,800 points）。采样窗口与 GPU 状态存在波动，不把 FPS 差值宣传为严格提升比例。

## 3. 资源边界

- 爱心拾取代理 1 个不可见 Mesh；
- 爱情数字 1 个 Points（1,800）；
- StoryOverlay/StoryEditor 为 DOM，不参与 WebGL draw call；
- 24 张照片仍由现有 PhotoManager 管理，不复制纹理；
- 本地保存只在开启时写 IndexedDB，不影响每帧渲染。

## 4. 结论

F4 在保留 F3 全部视觉和 24 张照片能力的前提下，默认 1440/4K、完整 Bloom、24 张照片和爱情数字模式均高于 60 FPS 目标；无 context lost 或页面错误。
