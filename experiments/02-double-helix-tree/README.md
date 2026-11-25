# 02 · 双螺旋圣诞树

独立地址：`http://127.0.0.1:8787/02-double-helix-tree/`

## 视觉与交互

- 9 层成熟枝叶树冠（本地实验副本的圣诞树实现）、两条反向 TubeGeometry 双螺旋光带、360 颗呼吸灯泡、48 颗爱心装饰、约 1800 颗金色流动粒子、水晶爱心树顶、礼物盒、雪幕与光晕地面。
- 视角按钮：`front`、`angle45`、`side`、`top`、`helix`、`crown`、`lights`，带平滑相机过渡。
- 可调树高、树冠半径、层数、三种叶色、灯泡数量、爱心数量、流光数量、Bloom、旋转速度；支持暂停/重置/退出。

## 来源与改动

- 双螺旋、反向光带、树顶水晶爱心、7 个机位由本实验实现。
- 树冠基础使用 `src/objects/ChristmasTree.ts` 的本地实验副本（esbuild 打包为 `src/product-tree.js`），不是正式应用运行时 import。
- 灯光/粒子层的**行为参考** `ChristmasTree`（master `59b14c5`）与 `Interactive-Xmas-Tree`（MIT，main `be75d04`）；没有直接复制这两个仓库的代码。
- `ChristmasTree` 仓库没有 LICENSE 文件，README 声称 MIT；按“仅参考、不直接复制”处理，避免把无许可证文件当作可再许可代码。
- 未使用参考仓库图片、模型、字体或音频。

## 截图

`front.png`、`angle45.png`、`side.png`、`top.png`、`helix-close.png`、`crystal-heart-close.png`、`lights-close.png`、`controls.png`。

## 运行与证据

- 实测约 240 FPS、70–144 draw calls（视角/发光状态不同）、9 层、360 灯泡、48 爱心；控制台无错误。
- 性能与逐项验收见 `docs/F2/PERFORMANCE_REPORT.md`、`docs/F2/EXPERIMENT_02_TREE.md`。
