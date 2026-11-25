# F1 · 技术选择与后续建议

**阶段：** F1 · GitHub 源码研究  
**状态：** 研究完成，等待验收；不进入 F2  
**产品代码：** 未修改  
**参考代码是否进入产品：** 否

---

## 1. 执行摘要

五个仓库都已实际克隆和阅读源码。结论不是“找到几个可以直接搬的炫酷项目”，而是：

1. **没有任何一个仓库能整体复用。**
2. 只有三个仓库的**代码**具备明确 MIT 许可：Heart-Star、Immersive-Photo-Gallery、Interactive-Xmas-Tree。
3. 另外两个仓库（ChristmasTree、Christmas-Tree-Photos）只是 README 写了 MIT，**没有 LICENSE 文件**；按任务书只能研究。
4. 参考仓库的图片、音乐、模型、字体、MediaPipe 资源**不在代码 MIT 范围内**，不能顺手拿来。
5. 升级书中的核心视觉（9 层树、双螺旋、360 灯、48 爱心球、水晶爱心树顶、真实地面反射、巨型 3D 爱心、粒子文字、60 秒电影）**没有一个参考仓库提供成熟实现**；必须基于当前项目自研/F2 实验。
6. **GSAP 不是 MIT**；当前 AnimationManager 足够，不建议引入。
7. **IndexedDB 只在无许可证的 Christmas-Tree-Photos 中出现**；如需照片跨会话保存，应用原生 API 独立实现，并先取得用户对隐私边界变化的同意。
8. **不引入 React/Vue/Next/R3F/MediaPipe**：现有单 Renderer + 单 AnimationManager 的架构不能被替换。

---

## 2. 推荐采用（按价值排序）

### 2.1 采用：Heart-Star 的心形/星形数学与时间轴思想（A/B）

- 只取 `sampleHeart` / `sampleStar` 的纯数学（MIT，保留版权）。
- 时间分段（散开→聚合→停留→爆散）可作为 F2 `01-heart-particles` 的对照实验。
- 不复制 10k CPU 循环，不替换现有的 `HeartParticles`。
- 当前 `HeartParticles` 已有 GPU 爱心、聚合、爆发，继续作为产品基础。

**预期收益：** 粒子心形轮廓更可控，支持形状 morph 研究。  
**风险：** 低（纯数学）；不要引入 10k 粒子的 CPU 版本。  
**合法前提：** 保留 `Copyright (c) 2026 Saklin Ali` 与 MIT 文本。

### 2.2 采用：Immersive-Photo-Gallery 的资源/渲染模式（B）

- 固定卡池、纹理复用、虚拟网格、按需渲染、完整 dispose、键盘/减少动效降级，都是值得借鉴的**模式**。
- 但它是平面 48 卡墙，不是围绕树的 3D 轨道；不能替换现有 `PhotoManager`，也不能引入 React/Next。
- F4 只在现有 `PhotoOrbit` / `PhotoCard` 上实现相应的限额和释放策略。

**预期收益：** 照片系统在 24 张上限下的资源可预测性、按需更新。  
**风险：** 中；需要保持上传/替换/删除/排序等现有行为。

### 2.3 研究后决定：Photo/Immersive 的小型 shader（A-04）

- 径向 lens shader 是 MIT、短小、Three 0.160 可运行。
- 但只能在 `?full=1` 完整后期模式中作为实验，不得进入默认兼容模式。
- 照片交互射线需要重新映射，不能直接套用。

**建议：** F2 的 `05-cinematic-effects` 可以做一个独立实验，产品默认不使用，除非性能与视觉验收都通过。

### 2.4 研究：Christmas-Tree-Photos 的 IndexedDB/对象 URL 模式（B，代码不可复制）

- 其双 store（照片 Blob + meta top/order）和 URL revoke 思路值得研究。
- 没有 LICENSE，不能复制代码。
- 当前产品刻意采用“照片只存在于当前会话”；如果 F4 要改为跨会话，必须由用户明确批准，并实现：
  - 用户清除、配额失败、版本迁移；
  - 删除照片时删除 Blob 与元数据；
  - 不上传、不同步；
  - 在 UI 中说明本地持久化范围。
- 建议使用原生 `indexedDB`，不引入依赖。

### 2.5 不采用：Interactive 的整树与手势（C）；只保留实心星采样作为小算法参考（A）

- 树是简单粒子圆锥，无法支撑 9 层/双螺旋/反射。
- 摄像头手势违反“不增加不必要权限”，且无摄像头时会 pageerror。
- 14 MB leaf_noise 等 textures 未被页面引用，且授权不明。

---

## 3. 明确不采用

| 项 | 原因 |
|---|---|
| ChristmasTree 全部代码/素材 | 无 LICENSE；README 与源码不一致；资源泄漏；音乐/模型授权不明 |
| Christmas-Tree-Photos 全部代码/素材 | 无 LICENSE；R3F/React/MediaPipe；480 个照片 mesh + 600 元素高 draw call |
| 5 首 MP3 / star.glb / 未引用 textures / demo 照片 / BGM | 素材授权未确认或明确不可再分发 |
| GSAP | Standard “no charge” License，不是 MIT；无实际必要；现有 AnimationManager 足够 |
| React / React DOM / Vue / Next / Vinext | 与现有单页 Three 架构冲突；引入第二套渲染/生命周期 |
| R3F / Drei / R3F-postprocessing | 需要 React；无法在现有单一渲染循环下工作 |
| MediaPipe / 摄像头手势 | 27 MB 资源 + 权限 + 隐私；任务明确不必要 |
| 参考项目的完整树/点云 | 当前程序化 7 层树比参考更接近目标；不能降级 |
| 参考项目的地面反射实现 | 没有真正的反射；不能把金属平面当作任务完成 |
| 任何未确认许可证的代码复制 | 违反任务书与法律边界 |

---

## 4. 升级书核心视觉的落地建议

### 4.1 圣诞树（F3）

**现状：** 7 层程序化树、220 灯、五角星、雪地/接触阴影。  
**参考结论：** 没有可复用的 9 层结构化树、双螺旋、爱心球、水晶爱心、地面反射。  
**建议：**

- 继续使用 `TreeBranches` 的枝层/枝臂/InstancedMesh 松针；扩展到 9 层。
- 双螺旋用独立的螺旋参数曲线 + `Points`/管状几何 + 单 shader；不要按参考仓库的点云锥。
- 360 灯：扩展现有 `TreeLights` 的单个 Points/shader，不增加 360 个 PointLight。
- 48 爱心球：用 InstancedMesh 或合批的镂空/实心爱心几何，避免 48 个独立材质 draw call。
- 水晶爱心树顶：新增几何/材质实验，设计点击命中与星星祝福的兼容方案；不复制 star.glb。
- 地面反射：优先尝试低成本方案（模糊镜像/局部反射/环境反射），在 F3 实验室测量；不能直接依赖全屏 Reflector 而拖垮 60 FPS。
- 所有新参数进入 `config.ts`；保持默认兼容模式可运行。

### 4.2 爱情与记忆（F4）

- 保留现有照片上传/替换/删除/排序/文字/三层轨道/24 上限。
- 巨型 3D 爱心：结合 Heart-Star 数学与当前 `HeartParticles`，做体积/厚度而非纯 2D 轮廓。
- 520/1314：当前 3D 网格+星屑是稳定基线；粒子文字作为 F2/F4 实验，若性能不足保留现有方案。
- 爱心轨道：现有照片轨道/爱心粒子系统已有基础；不要引入 Immersive 的 48 卡平面墙。
- 礼物数量：**需要用户决策**，因为任务书说“三个独立礼物”，但保护要求说现有 5 个礼物不能删除。F1 建议保留 5 个现有礼物，并新增/突出 3 个“专属”礼物；不能在未批准情况下删减。
- 照片持久化：若需要 IndexedDB，先获得明确同意；否则保持会话本地。

### 4.3 电影级演示（F5）

- 基线 `DemoController` 是 45 秒、8 章、单一 AnimationManager；F5 扩为 60 秒。
- 不引入 GSAP；用现有时间轴/缓动/相机帧。
- 60 秒的新章节必须在当前 45 秒内容上扩展，不能删掉现有交互/pause/restart/exit。
- 在 F5 前解决 F0 发现的 1.2 秒首次编译长帧（预编译/预热）。
- 音乐/粒子节奏同步使用现有 Web Audio 事件和自定义时间轴，不引入第三方。

---

## 5. 建议的 F2 实验输入

F2 尚未开始；以下是如果 F1 通过后的研究输入，不是实施承诺。

| 实验 | 可用参考 | 不该做什么 |
|---|---|---|
| `01-heart-particles` | Heart-Star 心形/星形公式、周期分段（MIT） | 不复制 10k CPU 全量、不用其 2D 轮廓直接当巨型 3D 爱心 |
| `02-double-helix-tree` | 无可靠上游实现 | 不把 ChristmasTree 单螺旋点云称为双螺旋 |
| `03-galaxy-nebula` | 无直接可复用实现；Imsersive 的 lens/fluid 仅可研究 | 不引入 Next/React/postprocessing/GSAP |
| `04-photo-memory` | Immersive 固定池/按需渲染/清理（MIT）；Photos IDB 设计（无许可证，只能重写） | 不复制 120 张照片 mesh 堆；不引入 R3F |
| `05-cinematic-effects` | 当前 DemoController + 可选 lens shader（MIT） | 不引入 GSAP/非 OSI 动画库；不破坏默认兼容模式 |

每个实验需按任务书交付独立页面、控制面板、技术说明、截图和性能数据；实验不得修改正式 `index.html` / `src/main.ts`。

---

## 6. 需要用户确认的决策

1. **礼物数量：** 保留现有 5 个礼物并新增 3 个专属礼物，还是只突出 3 个？现有保护要求不能 silent 删除 5 个。
2. **60 秒演示：** 直接替换现有 45 秒，还是保留“45 秒经典版 + 60 秒完整版”？
3. **照片持久化：** 是否允许 IndexedDB 跨会话保存（会改变当前“刷新即恢复示例照片”的隐私设计）？
4. **GSAP：** 任务书目标技术栈包含 GSAP，但它是非 OSI 许可证且本项目不需要；是否接受“不引入 GSAP，使用现有 AnimationManager”？
5. **完整 Bloom 模式：** 是否继续保留 `?full=1` 作为可选，还是让默认兼容模式成为唯一交付形态？
6. **参考素材：** 是否同意完全不使用参考项目的照片、音乐、模型、字体、纹理？（F1 建议同意。）

---

## 7. F1 最终建议

- **继续使用当前项目作为唯一产品骨架。**
- **不 vendor 任何参考仓库，不复制任何未确认许可证代码/素材。**
- 只把 MIT 的小型数学/算法作为 F2 实验输入，并保留完整归属声明。
- 9 层树、双螺旋、爱心球、水晶爱心、地面反射、粒子文字、60 秒电影均应在 F2/F3/F4/F5 中自研验证。
- 不增加 GSAP、React、Vue、Next、R3F、MediaPipe、postprocessing 等生产依赖。
- 保持 Three.js 0.160.0、单一 Renderer、单一 AnimationManager、三档画质、默认兼容渲染与全部现有业务功能。

**F1 到此完成。没有修改正式业务代码，没有进入 F2。等待验收与决策确认。**
