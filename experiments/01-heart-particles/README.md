# 01 · 十万次心跳

独立地址：`http://127.0.0.1:8787/01-heart-particles/`

## 视觉与交互

- 10000 颗（可调至 20000）粒子的 3D 爱心体积；心形轮廓采用经典参数式轮廓，内部用拒绝采样填充，避免中心过亮的径向堆积。
- `HEART`、`STAR`、`BURST`、`FREE` 四种状态；支持重新聚合、暂停、重置、复位视角。
- 心跳周期、聚合时长、爆散时长、粒子数量、点尺寸、心形/星形颜色、Bloom 强度均可实时调整。
- `setView` 由 OrbitControls 保持可拖拽；点击“退出实验”返回 F2 入口。

## 来源与改动

- 参考：`Heart-Star`（MIT，main `9317aeb`）的爱心/星形参数式数学、聚合与时间节奏思路。
- 本实验为独立 JavaScript 重写；未复制参考仓库的运行时 HTML/CSS 或打包产物。
- 未使用作者图片、音频、模型、字体或贴图。

## 截图

`overall-heart.png`、`star.png`、`burst.png`、`free-float.png`、`controls.png`。

## 运行与证据

- 浏览器：Edge 158，1440×900；Three.js 0.160.0。
- 实测约 240 FPS、17 draw calls、10000 粒子，浏览器控制台无错误。
- 详细性能与验收见 `docs/F2/PERFORMANCE_REPORT.md` 与 `docs/F2/EXPERIMENT_01_HEART.md`。
