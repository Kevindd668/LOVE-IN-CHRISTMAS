# F1 · GitHub 成熟项目源码审计与复用研究

**阶段状态：** 完成，等待验收；F2 未开始  
**产品代码：** 未修改  
**参考仓库：** 全部实际克隆到 `github-references/`，仅研究，不纳入产品 Git  
**参考代码是否进入产品：** 否

---

## 1. 交付文档

| 文档 | 内容 |
|---|---|
| [REPOSITORY_AUDIT.md](./REPOSITORY_AUDIT.md) | 五个仓库的克隆状态、默认分支/HEAD、目录、依赖、场景、几何、粒子、Shader、动画、相机、后期、资源管理、性能与结论 |
| [LICENSE_AUDIT.md](./LICENSE_AUDIT.md) | 代码许可证、第三方图片/音乐/字体/模型/WASM、依赖许可与复用规则 |
| [MODULE_REUSE_PLAN.md](./MODULE_REUSE_PLAN.md) | A/B/C 模块分级：可直接提取、需重写、只研究；对应 F2–F5 的取舍 |
| [COMPATIBILITY_REPORT.md](./COMPATIBILITY_REPORT.md) | 与 Three.js 0.160 + TS/Vite 单 Renderer 架构的兼容性、性能与依赖分析 |
| [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) | 最终采用/不采用建议、F2 实验输入、待用户确认的决策 |

运行抽查证据：

- [runtime-spot-check.json](../../qa/f1/runtime-spot-check.json)
- [Heart-Star 实际运行截图](../../qa/f1/heart-star-runtime.png)
- [Interactive-Xmas-Tree 实际运行截图](../../qa/f1/interactive-xmas-tree-runtime.png)
- [runtime-check.mjs](../../qa/f1/runtime-check.mjs)

---

## 2. 克隆清单

| 仓库 | 默认分支 | HEAD | Three.js | 代码许可 |
|---|---|---|---|---|
| `saklincodes/Heart-Star` | main | `9317aeb…` | 0.162.0 CDN | MIT 明确 |
| `dkvkvk/ChristmasTree` | master | `59b14c5…` | 0.171.0 | **无 LICENSE，README 声称 MIT** |
| `DancingCircles/immersive-photo-gallery` | main | `c862c70…` | 0.180.0 | MIT 明确 |
| `dongkui555/christmas-tree` | main | `b5f4870…` | 0.169.0 | **无 LICENSE，README 只写 MIT** |
| `HairuFan/interactive-xmas-tree` | main | `be75d04…` | 0.159.0 CDN | MIT 明确 |

完整哈希、文件数、大小与运行结果见 [REPOSITORY_AUDIT.md](./REPOSITORY_AUDIT.md)。

---

## 3. 最重要的发现

1. **没有完整仓库可以直接引入。** 五个项目都各自绑定 Vue/React/Next/R3F/单文件架构，且没有实现升级书中的 9 层树/双螺旋/真实反射等核心视觉。
2. **两个仓库的 MIT 声明缺乏许可证文件。** ChristmasTree 和 Christmas-Tree-Photos 只能研究，不能复制代码。
3. **参考项目的素材不能按代码许可证使用。** 包括 5 首商业音乐、star.glb、20 张 CC BY-SA/CC0 照片、BGM、MediaPipe 资源、未引用 textures。
4. **ChristmasTree 的 README 与源码不一致。** 源码只有单螺旋 + 锥形粒子，地面只是金属材质平面，没有双螺旋或真实反射；还每 0.1 秒创建 FallingStar 且不 dispose。
5. **没有 3D 照片轨道可直接复用。** Immersive 是 48 卡平面作品墙；Christmas-Tree-Photos 是 120 个高 draw call 的双面照片 mesh。当前项目已有的 PhotoManager/PhotoOrbit 应保留扩展。
6. **GSAP 不是 MIT**；不引入。**IndexedDB 只出现在无许可证仓库**；若需要持久化，必须经用户同意并用原生 API 独立实现。
7. **A/B/C 分级：**
   - **A（4 项小算法）：** Heart-Star 心形/星形采样；Interactive 实心星采样；Immersive lens shader（仅 full 模式）。
   - **B（7 项需重写/仅借鉴）：** Heart-Star 聚合时间轴；Immersive 固定卡池/按需渲染/清理与可访问性；Photos 的 IndexedDB 与照片释放模式（无许可证，只能独立重写）；Photos 的球→树 shader 思路；ChristmasTree 点精灵光晕思路。
   - **C（不引入）：** 两个无许可证仓库的代码/素材、所有完整框架应用、摄像头手势、参考树体、GSAP/React/Vue/Next/R3F/MediaPipe 生产依赖。

---

## 4. 运行验证

- **Heart-Star**：本地静态页在 Edge 1440×900 成功渲染；约 241 FPS；无 page error；仅 favicon 404。
- **Interactive-Xmas-Tree**：3D 自动动画成功；约 240 FPS；无摄像头时出现 `NotFoundError`（其手势依赖摄像头）；favicon 404。
- 其余三个为 Vue/Vite、Next/Vinext、React/R3F 工程；F1 没有安装它们的依赖，避免引入大批参考依赖，只做源码与 package/lock 审计。

---

## 5. 边界与保护

- `main`、`v1.0.0-baseline`、正式 `Christmas-Wish.html` 未改动。
- F0 文档未修改。
- 正式业务代码未修改。
- 没有升级 Three.js。
- 没有新增生产依赖。
- 没有进入 F2。
- 参考仓库通过 `.git/info/exclude` 排除，不会误提交。

---

## 6. 下一步

先验收 F1 和 [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) 中的决策点；确认后才进入 F2。F2 的五个实验只做独立实验，不修改正式场景。
