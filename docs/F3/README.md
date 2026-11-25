# F3 · 正式圣诞树视觉重构

## 状态

- F0：已通过
- F1：已完成
- F2：已通过验收
- **F3：实现与自检完成，等待用户验收**
- F4 / F5：未开始

## 恢复点与提交

| 项 | 值 |
| --- | --- |
| 分支 | `feature/visual-upgrade` |
| F2 最终提交 | `4d33116` |
| F3 修改前恢复标签 | `f3-pre-visual-reconstruction`（标签对象 `f3cf963`，指向 `4d33116`） |
| F3 实现提交 | `d9954c3` |
| 正式 standalone | `Christmas-Wish.html`，SHA-256 `32A1DB7C8ECDE7807D38CB9E094B15A044086FE7659BFCE725C0B0E844B61A20` |
| main / v1.0.0-baseline | `c9e3d02` / 标签目标 `c9e3d02`（未修改） |

## 授权记录

**五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。** 该授权适用于 F2/F3；不再以“未独立核验”或“缺少 LICENSE 文件”作为复用限制。详细来源档案见 `docs/F2/SOURCE_REUSE_REPORT.md`。

## 本阶段只做了什么

把 F2 实验 02 验证过的树体方向落到正式项目：

- 9 层枝叶树冠、9.5 高度、3.0 半径、1.0 树干、0.22 树干半径；
- 9 圈双反向光带（金 `#FFD58A` / 玫瑰 `#FF75A9`，宽度 0.035）；
- 360 颗四色灯泡（暖金 45% / 玫瑰 25% / 冰蓝 15% / 珍珠白 15%）；
- 48 颗真正 3D 爱心装饰（4 种珠宝材质、4 个 InstancedMesh 批次）；
- 0.95 × 0.85 × 0.22 的低多边形切面水晶爱心树顶；
- 柔和树底装饰台、接地阴影、环境反射与明确标注的**模拟**地面反射；
- 树体控制面板新增/补齐 14 个真实控件；
- 相机 home framing 适配 9.5m 树与更高的树顶。

## 启动正式项目

```powershell
cd C:\Users\29636\Desktop\日常交流\Christmas-Wish
npm run dev
# 打开 Vite 输出的本地地址（通常 http://127.0.0.1:5173/）

# 或使用正式构建 / 单文件：
npm run build
npm run build:single
# 直接打开 Christmas-Wish.html
```

完整 Bloom（`?full=1`）仍保留；默认兼容渲染路径不变。F3 没有引入新生产依赖、GSAP 或 Three 升级；Three 仍为 0.160.0，动画仍由单一 `AnimationManager` 驱动。

## 交付

- `docs/F3/` 七份文档 + `DIRECT_REUSE_INVENTORY.md`（五仓库逐模块清单）+ `REUSE_INTEGRATION_PLAN.md`（按 F3 组件的复用方案，尚未整合）
- `docs/F3/screenshots/` 13 张真实浏览器截图（10 项验收截图 + 参数面板 + F0 并排对比）
- `qa/f3/performance.json`、`qa/f3/control-results.json`
- `qa/f3-performance.mjs`、`qa/f3-visual-capture.mjs`、`qa/f3-controls.mjs`、`qa/f3-comparison.py`

## 截图索引

| 文件 | 内容 |
| --- | --- |
| `00-f0-vs-f3.png` | F0 正式版 vs F3 并排对比 |
| `01-front.png` | 正面全景（真实页面） |
| `02-angle45.png` | 45° 全景 |
| `03-side.png` | 侧面全景 |
| `04-crown-close.png` | 树冠近景 |
| `05-helix-close.png` | 双螺旋近景 |
| `06-bulbs-close.png` | 360 灯泡近景 |
| `07-heart-ornaments-close.png` | 48 爱心装饰近景 |
| `08-crystal-heart-close.png` | 水晶树顶近景 |
| `09-ground-base-close.png` | 地面、装饰台与礼物近景 |
| `10-pure-tree.png` | 关闭额外叙事层后的纯树体 |
| `11-controls.png` | 树体顶级控制面板 |
| `12-controls-lights-helix.png` | 灯光与双螺旋控制面板 |

## 边界

- 未修改照片存储机制、未改 5 个礼物、未改 45 秒演示长度、未开发 F4/F5。
- 未修改 main 分支、`v1.0.0-baseline`、F0/F1/F2 报告。
- 未引入第三方图片、音乐、模型、字体或贴图。
- 地面“反射”是按 Canvas 纹理绘制的模拟反射，不是镜面/SSR/光线追踪；详见 `MATERIAL_LIGHTING.md`。

## 已知限制

- 4K 等效分辨率下 95 分位帧时间约 25ms，平均约 80.6 FPS；4K 是记录项，默认主目标是 1440×900/1920×1080 的 60 FPS 以上。
- 水晶爱心为低多边形切面 + 半透明清漆材质，不使用真实折射/透射 pass。
- 游戏/移动端 GPU 未测。
- F3 不改变 F2 五个独立实验；F2 仍可单独运行。

## 复用文档（计划阶段，未整合代码）

- [五仓库逐模块直接复用清单](DIRECT_REUSE_INVENTORY.md)
- [参考仓库复用整合计划](REUSE_INTEGRATION_PLAN.md)
- 当前状态：清单/计划已完成；正式代码整合需用户确认 WP1 或指定批次后执行。
