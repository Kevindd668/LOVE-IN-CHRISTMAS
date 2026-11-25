# 树体重构

## 1. 目标参数

| 项 | 值 |
| --- | --- |
| 高度 | 9.5 |
| 最大半径 | 3.0 |
| 树冠层数 | 9 |
| 树干高度 | 1.0 |
| 树干半径 | 0.22 |
| 主色 | `#0B5D3B` |
| 阴影色 | `#073D2A` |
| 高光色 | `#27A66A` |

在 `TreeBranches` 中新增固定 `trunkHeight: 1` / `trunkRadius: 0.22`，树冠 `layers=9`、`density=210`；`config.ts` 的默认值与静态控制面板值同步为 9.5 / 3.0 / 9 / 210。

## 2. 九层枝叶，而不是九个圆锥

保留并扩展项目原有 `TreeBranches` 的成熟结构：

- 每层由一层不规则褶皱的深色核心 + 大量针叶 sprig 实例 + 枝臂 + 层缘下垂 fringe 组成；
- 3 种针叶几何变体按 `InstancedMesh` 批量绘制；
- 每层/每枝的方位、长度、下垂角、色相 roll、明暗 shade 均由固定种子随机；
- 树冠轮廓是 `crown * pow(1 - t, 0.9)` 包络，层间有重叠，不是堆叠九个同形圆锥；
- 新增 9 层后，树干、树冠、灯光层、双螺旋、爱心装饰、树顶爱心都随树参数重建；
- 旧的 34 颗普通球形 bauble 被移除，由 48 颗爱心装饰替代，避免装饰读成噪声。

实际调参目标不是“更多几何”，而是“更自然的轮廓 + 更深的层次”。`TreeBranches` 的叶色、阴影、高光仍由调色板驱动；默认使用目标三色。

## 3. 双螺旋光带

新增 `src/objects/TreeHelix.ts`。

- 两条独立曲线，均绕树 9 圈（`TURNS = 9`）；
- 半径采用 `crown * (1 - t)^0.82 * 1.015 + 0.07`，略高于针叶包络，避免明显穿树；
- `TubeGeometry` 半径 **0.035**，连续无断裂；
- 第一条 `#FFD58A`，第二条 `#FF75A9`，第二条相位偏移 π，交错上升；
- 每条曲线 216 颗流光粒子，沿曲线滚动；
- 独立开关、旋转速度、相位（0–2π）；
- 树体自身旋转仍由 `ChristmasTree` 控制，光带在树体坐标系内独立自转；
- 材质使用 `MeshBasicMaterial + toneMapped:false` 保持金/玫瑰身份；完整 Bloom 模式会进一步产生光晕。

## 4. 360 颗动态灯泡

`TreeLights` 的目标总数固定为 **360**，并通过 `SettingsManager.sanitize` 和 UI 的 `min=max=360` 防止旧设置把总数降级。

- 颜色分配在默认 `warm` 模式精确为：
  - 暖金 45% = 162；
  - 玫瑰 25% = 90；
  - 冰蓝 15% = 54；
  - 珍珠白 15% = 54。
- 颜色索引先按精确配额构造，再用固定 rng 洗牌，避免形成高度色带；
- 灯泡使用一个 Points Shader + 4 个逐点颜色属性，**没有为每颗灯创建真实光源**；
- shader 同时提供随机闪烁、按高度的波式点亮、呼吸式亮度、分组亮度；
- 灯点略高于针叶包络，并关闭深度测试，以免密集 F3 树叶把一半灯吞掉；这是视觉可读性的明确取舍；
- UI 的灯光开关、亮度、闪烁速度、灯光模式真实影响 uniform 或颜色 attribute。

## 5. 48 颗爱心装饰

新增 `src/objects/TreeHeartOrnaments.ts`。

- 48 颗真正的 `ExtrudeGeometry` 3D 爱心，不是二维贴图；
- 4 种材质：玫瑰金、粉色水晶、香槟金玻璃、珍珠白；每种 12 颗；
- 分成 4 个 `InstancedMesh`，总共 4 draw calls；
- 位置在 9.5m 树体的针叶包络外侧，允许轻微悬浮和缓慢自转；
- 每帧只更新 48 个实例矩阵，无临时大量分配；
- 独立开关 `ornamentsOn`；
- 数量、几何和材质均在重建树体时释放旧资源。

## 6. 树顶水晶爱心

`TreeStar` 重构为 `tree-top-crystal-heart`：

- 64 点经典心形轮廓；
- 自定义三角切面 BufferGeometry：前/后中心、前后环、侧带，形成可见切面；
- 目标尺寸 **0.95 × 0.85 × 0.22**；
- 颜色 `#FFB6D0`，`MeshPhysicalMaterial`、clearcoat、flatShading、透明；
- 外部柔和 halo、内层粉色 glow、80 颗 sparkles、点光源、边缘线；
- 缓慢自转 + 上下浮动 + 脉冲发光；
- `getPickMeshes()` 仍返回 `pickType='star'`，原有“点击树顶许愿”交互得以保留；
- 不使用二维图片替代。

## 7. 相机与树底

- `CameraManager` 的 home framing 根据 `subjectHeight` 抬高/拉远，避免 9.5m 树和树顶被 16:9 画面裁切；
- `SceneManager` 新增树底展示台：低矮石台、雪盖、金色内圈、宽而近地平的展示环、金色外圈；
- 展示台半径控制在礼物内侧，不改变 5 个礼物的位置；
- 接地阴影面积扩大到 9.6 × 8.2；
- 地面反射为 CanvasTexture 平面（`simulated-ground-reflection`），不是真实镜面或 SSR。

## 8. 资源释放

- `TreeHelix.dispose()` 释放 2 个 TubeGeometry、2 个 Points geometry、材质；
- `TreeHeartOrnaments.dispose()` 释放共享 heart geometry、4 个 InstancedMesh 和材质；
- `TreeStar.dispose()` 遍历释放心形、边缘、inner heart、sparkles、halo、light；
- `SceneManager.dispose()` 释放展示台/反射/舞台纹理；
- `main.dispose()` 现在显式调用 `sceneManager.dispose()`；
- 连续四次高度重建测试中，`renderer.info.memory` 保持 `195 geometries / 33 textures`，未增长。

## 9. 来源与边界

- **五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。** 树体基础采用本项目自己的 `TreeBranches`，这是实现选择；缺少公开 LICENSE 文件或此前“未独立核验”的表述不再构成授权限制；
- 双螺旋、48 爱心、水晶心、展示台为 F3 独立实现；
- F2 实验 02 的对应代码与截图仅作行为/参数验证，不把实验截图当正式模型；
- 没有新增生产依赖，没有引入 GSAP，没有升级 Three.js。
