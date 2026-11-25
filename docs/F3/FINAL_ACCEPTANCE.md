# F3 最终自检与验收清单

> 状态：**F3 实现、真实截图、回归与性能记录完成，等待用户验收。**  
> F4 / F5 未开始；F3 不提供“提前进入 F4”的接口或页面。

## 1. 阶段门禁

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 只在 F3 工作 | 通过 | 没有 F4/F5 文件或功能 |
| 修改前可恢复 | 通过 | 标注标签 `f3-pre-visual-reconstruction`（标签对象 `f3cf963`，目标 `4d33116`） |
| 不修改 main | 通过 | main 仍为 `c9e3d02` |
| 不修改 v1.0.0-baseline | 通过 | 标签目标仍为 `c9e3d02` |
| 不覆盖 F0/F1/F2 报告 | 通过 | 无 docs/F0、docs/F1、docs/F2 改动 |
| F2 五个实验保留 | 通过 | `experiments/01…05` 未删改 |
| 不引入生产依赖/GSAP | 通过 | package.json 未新增依赖 |
| Three.js 版本 | 通过 | 仍为 0.160.0 |
| 单一渲染循环 | 通过 | 仍由 `AnimationManager` 驱动 |
| 不修改照片存储机制 | 通过 | PhotoManager/IndexedDB 未改 |
| 礼物数量不变 | 通过 | 仍为 5 个 |
| 45 秒演示不变 | 通过 | `CINEMA_DURATION=45`；仅第三幕文案 220→360 |

## 2. 树体验收

### 参数

- 高度 9.5，最大半径 3.0，9 层，树干 1.0 / 0.22。
- 主色 `#0B5D3B`，阴影 `#073D2A`，高光 `#27A66A`。

### 双螺旋

- 两条独立 TubeGeometry，9 圈，宽度 0.035，金 `#FFD58A` / 玫瑰 `#FF75A9`；
- 交错上升、连续、带流光；
- 开关、速度、相位均为真实控件；
- 实拍见 `05-helix-close.png`。

### 360 灯泡

- 精确 162 / 90 / 54 / 54（45/25/15/15）；
- 单一 Points Shader；不是 360 个真实光源；
- 随机闪烁 + 高度波浪 + 分组呼吸；
- 关闭、亮度、闪烁速度、灯光模式均真实生效；
- 实拍见 `06-bulbs-close.png`。

### 48 爱心装饰

- 48 颗真正 3D ExtrudeGeometry 爱心；
- 玫瑰金 / 粉水晶 / 香槟玻璃 / 珍珠白各 12；
- 4 个 InstancedMesh；轻微悬浮/自转；真实开关；
- 实拍见 `07-heart-ornaments-close.png`。

### 水晶树顶

- 低多边形切面心形，目标 0.95 × 0.85 × 0.22；
- `#FFB6D0`、透明、clearcoat、halo、sparkles、自转/浮动；
- 仍可点击触发原 star blessing；
- 实拍见 `04-crown-close.png`、`08-crystal-heart-close.png`。

### 地面

- 树底石台/雪盖/金色内圈/展示环/金色外圈；
- 接地阴影、环境光、地面光晕；
- 金色环境反射来自 PMREM；
- 地面“反射”是明确标注的 **simulated-ground-reflection**（CanvasTexture 平面），不是真实镜面/SSR；
- 实拍见 `09-ground-base-close.png`。

## 3. 十项真实截图

全部位于 `docs/F3/screenshots/`，由 Edge 真实 WebGL 画布输出，1440×900。

| # | 要求 | 文件 | 状态 |
| --- | --- | --- | --- |
| 1 | 正面全景 | `01-front.png` | 有 |
| 2 | 45° 全景 | `02-angle45.png` | 有 |
| 3 | 侧面全景 | `03-side.png` | 有 |
| 4 | 树冠近景 | `04-crown-close.png` | 有 |
| 5 | 双螺旋近景 | `05-helix-close.png` | 有 |
| 6 | 灯泡近景 | `06-bulbs-close.png` | 有 |
| 7 | 爱心装饰近景 | `07-heart-ornaments-close.png` | 有 |
| 8 | 水晶树顶近景 | `08-crystal-heart-close.png` | 有 |
| 9 | 地面光影近景 | `09-ground-base-close.png` | 有 |
| 10 | 纯树体（关闭额外叙事层） | `10-pure-tree.png` | 有 |
| + | F0 并排对比 | `00-f0-vs-f3.png` | 有 |
| + | 参数面板 | `11-controls.png`、`12-controls-lights-helix.png` | 有 |

F0 侧使用 F0 正式版 `qa/f0/screenshots/compatible-1440.png`（F0 commit `c9e3d02`）；F3 侧使用真实 F3 构建截图。对比图为 Python/Pillow 拼接，未修改两张源图内容。

## 4. 交互验收

14 个树体控件全部实测：

- 树体旋转开关/速度、高度、半径、树叶颜色、整体亮度；
- 双螺旋开关/速度/相位；
- 360 灯开关/亮度/闪烁速度/颜色模式；
- 48 爱心开关；
- 树顶水晶爱心开关。

`qa/f3/control-results.json` 记录：灯数配额精确 162/90/54/54，所有开关/数值进入真实场景状态；高度 9.7 刷新后持久化；连续四次重建 `195 geometries / 33 textures` 不变；控制台 0 error。

## 5. 现有功能回归

| 功能 | 结果 |
| --- | --- |
| typecheck | 通过 |
| build / build:single | 通过 |
| smoke | 通过，0 console/page error |
| raycast | 通过（照片/礼物/树顶/树体） |
| qa2 | 通过（树点击、音乐、45s demo 暂停/恢复/replay、礼物） |
| qa3 | 通过（520/1314、照片控件、浪漫模式） |
| mobile | 通过（390×844 布局） |
| singlefile | 通过（file: 协议，0 failed request） |
| 照片上传/替换/删除/排序 | 保留并通过 smoke |
| 5 个礼物 | 保留并通过 qa2 / control-results |
| 音乐 | 保留并通过 qa2 |
| 45 秒演示 | 保留；qa2 结束/重播通过 |
| 暂停和恢复 | 通过 qa2 |
| 浪漫模式 | 通过 qa3 |
| 三档画质 | 通过 smoke；灯数仍 360 |
| 设置持久化 | 通过 control-results |
| 完整 Bloom | 通过；`pipeline=true` |
| 资源释放 | 重建内存稳定；新模块 dispose |

## 6. 性能

详见 `PERFORMANCE_REPORT.md` 与 `qa/f3/performance.json`。

- 1440×900 兼容：平均 **95.4 FPS**，P95 **16.9 ms**，291 calls，461,210 triangles；
- 1920×1080 兼容：113.2 FPS，P95 16.6 ms，291 calls；
- 4K 等效：80.6 FPS，P95 25.0 ms，291 calls；
- 1440×900 完整 Bloom：100.2 FPS，P95 16.6 ms，305 calls，pipeline=true；
- 所有 case contextLost=0，0 console error；
- 主分辨率平均 >60 FPS；4K 不承诺稳定 60 FPS。

## 7. 产物与哈希

- 正式 standalone：`Christmas-Wish.html`
  - SHA-256 `32A1DB7C8ECDE7807D38CB9E094B15A044086FE7659BFCE725C0B0E844B61A20`
  - 父目录同名文件哈希一致
- F0 旧正式版哈希（基线）：`12E39D0EFDDC6E24C0B6111F85321E7939E294E55268CBE85BDFF46CF94BD725`
- F3 实现提交：`d9954c3`
- F2 最终提交：`4d33116`
- F3 修改前恢复点：`f3-pre-visual-reconstruction`（`4d33116`）
- main / baseline：`c9e3d02` / `c9e3d02`

## 8. 已知限制

1. 4K 等效 P95 25ms，不保证 4K 60 FPS。
2. 1440/1920 P95 约 16.6–16.9ms，平均远高于 60，但并非每帧严格 <16.7ms。
3. 树冠针叶是低多边形实例化针叶，近景可见三角；不是逐叶高模。
4. 水晶爱心是低多边形切面 + clearcoat/透明，不启用真实 transmission/折射 pass。
5. 地面反射是明确标注的模拟纹理，不是真实镜面/SSR。
6. 48 爱心与部分灯点会被针叶遮挡；这是自然遮挡，不是丢失。
7. 未覆盖移动 GPU、Firefox/Safari、低端集显性能。
8. 未独立验证参考作者授权；F3 未复制无许可证仓库代码，继续沿用 F2 来源边界。

## 9. 结论

F3 已把 9 层树体、双螺旋、360 灯、48 爱心、水晶树顶、树底光影与 14 个真实控件整合进正式项目；现有照片/礼物/音乐/45 秒演示/浪漫/画质/持久化/Bloom 均通过回归。

**F3 自检通过，等待用户最终验收。未进入 F4 或 F5。**
