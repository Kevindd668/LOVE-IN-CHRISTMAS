# 材质、灯光与后期

## 1. 树体材质

`TreeBranches` 仍使用项目原有的 instanced 针叶 + 深色核心 + 枝臂体系。F3 调整的是调色和树体比例：

| 材质 | 颜色/参数 |
| --- | --- |
| 主针叶 | `#0B5D3B`，roughness 0.88，半粗糙 |
| 阴影针叶 | `#073D2A`（精确目标色） |
| 高光针叶 | `#27A66A`（精确目标色） |
| 枝芯/枝臂 | 由主色派生暗部，roughness 0.92–0.94 |
| 树干 | 程序化树皮纹理 + `#9B7558` 基调，roughness 0.94 |
| 雪盖 | 冷白灰，roughness 0.88–0.9 |

针叶的 3 个几何变体使用 `InstancedMesh`，实例色按主/阴影/高光/霜色分配；不是每个枝条一个 draw call。树体亮度的 UI 控件通过 `TreeBranches.setBrightness` 调整核心、枝臂、针叶 batch 与树干材质的颜色乘数。

## 2. 双螺旋材质

- 金色 `#FFD58A`，玫瑰 `#FF75A9`；
- `MeshBasicMaterial`，`toneMapped:false`，避免在冷月光 + Bloom 下两条带同时洗成白色；
- tube 半径 **0.035**，9 圈；
- 每条带有 216 个 additive shader 流光点；
- 完整 Bloom 模式下光带和流光会产生柔和光晕；兼容模式下靠色相与流光保持可读。

## 3. 360 灯泡

`TreeLights` 是一个 Points Shader，不是 360 个 `PointLight`：

- 点大小、颜色、相位、高度、seed 均为 attribute；
- 颜色分布精确为 162 / 90 / 54 / 54；
- shader 同时输出：
  - 随机 flicker；
  - 基于 `aHeight` 的波浪式点亮；
  - group wave 的呼吸；
  - uniform 亮度/闪烁速度；
- additive、圆形点、`depthTest:false`，确保在非常密的 F3 针叶中仍能读出灯光；
- 灯光模式切换只改变颜色 attribute 或 uniform，不重建真实光源。

## 4. 48 爱心装饰材质

| 材质 | 参数 |
| --- | --- |
| 玫瑰金 | `#C98086`，metalness 0.74，roughness 0.24 |
| 粉色水晶 | `#FF9CC2` + 低强度粉色 emissive + clearcoat + 透明 |
| 香槟金玻璃 | `#E9CBA0` + clearcoat + 透明 |
| 珍珠白 | `#FFF1E8`，metalness 0.24，roughness 0.18 |

为控制开销和避免额外的 transmission pass，48 颗爱心不使用真实 transmission；透明、clearcoat、envMap 反射和 Bloom 共同提供珠宝感。4 个并发材质各 12 个实例，总共 4 draw calls。

## 5. 树顶水晶爱心

- 颜色 `#FFB6D0`；
- 低多边形切面（64 轮廓点、前/后 fan、侧带）；
- `MeshPhysicalMaterial`：透明 0.94、clearcoat 1、roughness 0.1、flatShading、envMapIntensity 1.35；
- 没有使用 transmission/折射 pass；这是为了在保持“水晶/半透明”观感的同时避免全场景二次透射渲染；
- 粉色 halo + 内层 glow + 80 sparkles + 点光源 + 金色轮廓线；
- 自转 0.12 rad/s，上下浮动，flash 时 halo/emissive/点光增强。

## 6. 灯光 rig

F3 沿用正式项目已有 rig，并让树体尺寸/树顶适配：

| 灯 | 作用 |
| --- | --- |
| Hemisphere | 冷色天光/雪地反射底色 |
| Ambient | 极轻的暗部填充 |
| Moon Directional | 主月光、PCFSoft 阴影 |
| WarmKey Directional | 右前暖色轮廓 |
| TreeWarmth Point | 树体暖光溢出（颜色/亮度随灯串设置） |
| CoolFill Point | 左侧冷色补光 |
| GroundGlow Point | 地面金色光晕 |
| Crystal PointLight | 树顶水晶爱心的局部粉色光 |

没有为 360 颗灯创建 360 个真实光源。所有新增光都纳入 `LightEffect` 原有的质量预设/曝光/亮度管理。

## 7. Bloom 与画质

- 默认兼容路径：直接渲染，无 composer；稳定、无黑色 compositor tile。
- 完整 Bloom：`?full=1`，`Renderer.pipeline` 为真实 `PostPipeline`，`directRendering=false`；性能测试已验证 `pipeline:true`。
- 三档画质仍控制 pixelRatio、Bloom、shadow map、snow/heart 数量；`lightCount` 固定 360，不因画质降级。

## 8. 地面、底座与“反射”

新增 `tree-presentation-base`：

- 低矮石台 + 雪盖 + 金色内圈；
- 宽而近地平的展示环 + 金色外圈；
- 径向暖色光晕；
- 接地阴影扩大到 9.6 × 8.2；
- 场景环境反射来自 `RoomEnvironment` PMREM，不是实拍 HDRI。

**明确声明：** 地面上的金色“倒影”是 `simulated-ground-reflection`，由 CanvasTexture + additive plane 绘制，**不是**真实镜面反射、SSR、光线追踪或环境探针反射。它只是灯光氛围的一部分，不能作为物理反射能力宣传。

## 9. 色彩管理

- 渲染器仍使用 ACESFilmicToneMapping、SRGBColorSpace；
- 所有颜色使用 sRGB 源值（色板/CSS）；
- 完整 Bloom 与兼容路径共用同一色板，区别只在后期。

## 10. 已知取舍

- 树体针叶是风格化低多边形针叶，不是逐根高模；优势是实例化/性能，近景可见低模三角。
- 水晶心和爱心装饰的透明/clearcoat 是观感而非物理折射。
- 地面反射是模拟；所有文档和代码命名都明确标注。
