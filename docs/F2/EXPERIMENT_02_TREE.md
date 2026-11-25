# 实验 02 · 双螺旋圣诞树

路径：`experiments/02-double-helix-tree/`  
入口：`http://127.0.0.1:8787/02-double-helix-tree/`

## 目标

保留成熟枝叶树的体积与细节，在其上实现两条反向上升光带、360 颗呼吸灯泡、48 颗爱心装饰、金色流动粒子、水晶爱心树顶和 7 个独立观察机位。

## 来源与实现

| 项 | 内容 |
| --- | --- |
| 参考 | `ChristmasTree`（master `59b14c5`，README 声称 MIT；作者已授权本项目直接复用）；`Interactive-Xmas-Tree`（MIT，main `be75d04`） |
| 参考内容 | 灯光/粒子层行为、相机组织 |
| 树冠基础 | 本项目既有 `src/objects/ChristmasTree.ts` 的本地实验副本，esbuild 打包为 `src/product-tree.js`；不是正式应用运行时 import |
| 双螺旋/水晶心/机位 | 本实验实现 |
| 第三方素材 | 无 |

实现要点：

- 9 层成熟树冠（`layers=9`, `density=210`），本地实验副本；正式源码不修改。
- 两条反向 `TubeGeometry` 螺旋：金色 `#FFD58A` 与粉色 `#FF75A9`，半径约 0.035，长度/圈数随树高变化。
- 360 颗自定义圆形点精灵灯泡（关闭树实现内部的方形灯泡层，避免近距离方块感）。
- 48 颗挤出爱心装饰 + 金色小球；约 1800 颗 GPU 金色流动粒子。
- 树顶水晶爱心：挤出心形 + `MeshPhysicalMaterial` + 发光边缘 + 粉色内芯。
- 3 个礼物盒、程序化地面光环、600 颗雪点、星空背景。
- Bloom 管线；`renderer.info.autoReset=false`，确保统计的是实际绘制调用。

## 交互与参数

- 树高、最大半径、层数、叶色/高光/阴影、灯泡数量、爱心数量、流动粒子数量、Bloom、旋转速度。
- 视角：正面、45°、侧面、俯视、双螺旋近景、水晶心近景、灯饰近景；平滑相机过渡。
- 暂停/继续、重置、复位视角、退出实验。

## 真实浏览器证据

截图（`experiments/02-double-helix-tree/screenshots/`）：

`front.png`、`angle45.png`、`side.png`、`top.png`、`helix-close.png`、`crystal-heart-close.png`、`lights-close.png`、`controls.png`。

实测：

- 9 层、360 灯泡、48 爱心、2 颗反向螺旋；约 240 FPS；无控制台错误。
- 视角切换成功；树冠/螺旋/水晶心/礼物/雪均可见。
- Draw calls 随视角与 Bloom 状态变化，完整数值见 `PERFORMANCE_REPORT.md`。

## 已知限制

- 树冠基础是本项目既有实现，不是参考仓库的完整树；参考 `ChristmasTree` 只有单螺旋/点云式树体，直接复制不能达到 9 层双螺旋的视觉要求。
- 水晶爱心为风格化水晶；不是宝石级折射模拟。
- 远处的 48 颗爱心与礼物较小，需要近景机位观察。
