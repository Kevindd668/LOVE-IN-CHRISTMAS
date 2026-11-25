# 实验 01 · 十万次心跳

路径：`experiments/01-heart-particles/`  
入口：`http://127.0.0.1:8787/01-heart-particles/`

## 目标

用真实可交互的粒子场重建三类状态：3D 爱心、星星、爆散/自由漂浮；支持重新聚合、心跳与实时参数，不是贴图或预录视频。

## 来源与实现

| 项 | 内容 |
| --- | --- |
| 参考 | `Heart-Star`，MIT，main `9317aeb` |
| 参考内容 | 参数式爱心/星形、聚合/爆散/时间节奏 |
| 本实验实现 | 独立 ES module；3D 体积采样、点着色器、Bloom、统一 UI、状态机 |
| 第三方素材 | 无 |

- 参数式爱心轮廓：`x=16sin³t`，`y=13cos t−5cos2t−2cos3t−cos4t`。
- 体积：轮廓内部用拒绝采样填充；约 1/5 粒子落在轮廓壳层；z 方向加入厚度，爱心不是平面图。
- 星星：填充五角星轮廓，并对亮色点做轻微闪烁。
- 模式：`heart` / `star` / `burst` / `free`；`burst` 后回到自由漂浮，再可“重新聚合”。
- 心跳：`sin` 周期缩放；`gatherTime`、`burstTime`、`beatPeriod` 可调。
- 渲染：自定义 additive Points shader；`EffectComposer → RenderPass → UnrealBloomPass → OutputPass`；Bloom 可关闭。
- 默认关闭自动循环，避免打开页面时错过爱心状态；可打开自动循环。

## 交互与参数

- 粒子数量 1000–20000；默认 10000。
- 粒子尺寸、爱心主色、星星颜色、聚合时间、爆散时间、心跳周期、Bloom 开关/强度。
- 操作：形成爱心、形成星星、爆散、重新聚合、自由漂浮、暂停/继续、重置、复位视角、退出实验。
- `window.__LAB__` 暴露 actions、scene/camera/renderer、`getStats`、`setBloom`、`dispose`。

## 真实浏览器证据

截图（`experiments/01-heart-particles/screenshots/`）：

| 文件 | 状态 |
| --- | --- |
| `overall-heart.png` | 整体爱心 |
| `star.png` | 星星 |
| `burst.png` | 爆散 |
| `free-float.png` | 自由漂浮 |
| `controls.png` | 参数面板与状态 |

实测：

- Edge 158，1440×900，D3D11，RTX 3070 Ti Laptop。
- 约 240 FPS；10000 粒子；17 draw calls；无控制台错误。
- 状态切换测试：heart → star → burst → free 均成功，`__LAB__.getStats()` 返回正确 mode/count。

## 已知限制

- 星星尖角在高 Bloom 下可能过曝/略方；属于高光饱和的视觉取舍。
- 自动循环默认关闭，需要用户手动打开；手动状态按钮仍完整。
- 参考仓库的 HTML/CSS/素材没有被复制；只使用数学与节奏思路。
