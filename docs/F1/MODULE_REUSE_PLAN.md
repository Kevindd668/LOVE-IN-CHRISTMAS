# F1 · 模块复用计划与 A/B/C 分类

**阶段：** F1 · 源码研究  
**产品代码：** 未修改  
**结论前提：** 现有项目必须保持 Three.js 0.160.0、单一 Renderer、单一 AnimationManager；不能为了复用引入第二套渲染循环或新框架。

---

## 1. 分类定义

| 类别 | 定义 | 允许的动作 |
|---|---|---|
| **A** | 许可证明确、算法边界清晰、与现有技术栈冲突小，可接近直接提取/改写 | 提取并重写进现有 TypeScript 模块，保留 MIT/版权声明 |
| **B** | 技术有价值，但与现有架构、性能模型或依赖差异较大，需要重构/独立实现 | 只研究设计，必要时在 F2 实验室独立重写；不改正式代码 |
| **C** | 不满足许可证、技术必要性、性能或安全约束 | 仅阅读研究，不引入任何代码或素材 |

> 本次没有实际提取代码。下面“A 类”是**可提取候选**，真正进入产品仍需在 F2 实验验证。

---

## 2. A 类候选

### A-01 · 心形参数采样数学

- **来源：** Heart-Star `geometry.js` `sampleHeart(t)`，MIT。
- **内容：** 16 sin³θ / 13 cosθ − 5 cos2θ − 2 cos3θ − cos4θ，带 z 正弦扰动。
- **为什么是 A：**
  - 纯数学函数，无依赖、无状态；
  - 复制/改写的法律条件清晰（MIT + 版权声明）；
  - 可改成当前 TypeScript 的 `THREE.Vector3` 或直接计算到 `Float32Array`；
  - 对 F4 的心形轮廓/聚合目标有直接参考价值。
- **注意：** 这是二维心形轮廓，不能单独满足“巨型 3D 爱心”；必须与现有 `HeartParticles` 的 3D 轨道/聚合系统结合。
- **适配成本：** 低。
- **性能：** 只在初始化时采样，不影响每帧性能；10k 粒子的每帧 CPU 更新部分不属于 A。

### A-02 · 五角星多边形采样数学

- **来源：** Heart-Star `geometry.js` `sampleStar(t)`，MIT。
- **内容：** 10 个外/内顶点的闭合多边形，按参数沿边均匀采样，z 做正弦厚度。
- **为什么是 A：** 同样为纯函数，适合作为心形/星形 morph 的对照目标，也可以用于 F2 的“爱心粒子”实验对照。
- **注意：** 不能替代水晶爱心树顶；它只是粒子形状采样。
- **适配成本：** 低。

### A-03 · Canvas 实心五角星采样器

- **来源：** Interactive-Xmas-Tree `index.html` `createStarSampler(sizePx)`，MIT。
- **内容：** Canvas 2D 画实心五角星，读取 `getImageData` 的 alpha，拒绝星形外的随机点；返回 1,500 个粒子位置。
- **为什么是 A：**
  - 纯 Canvas + 数组算法，不依赖 Three 或框架；
  - MIT 明确；
  - 可用于“实心星形装饰粒子”或测试粒子密度。
- **不适用：** 目标中的“水晶爱心树顶”不是五角星；当前五角星也可保留。适合作为可选装饰研究，不是必须引入。
- **适配成本：** 低。

> A-03 的代码中有 `sizePx`、`getImageData` 和 2D 坐标映射；改写为离线 CanvasTexture 采样即可，不需要引入它的页面。

### A-04 · 径向 lens ShaderPass

- **来源：** Immersive-Photo-Gallery `features/gallery/scene/gallery-scene.tsx` 第 37–45 行 `lens`，MIT。
- **内容：** `tDiffuse / distortion / backgroundColor`，把 UV 做径向缩放并做暗角，短小独立。
- **为什么是 A：**
  - 单文件 GLSL，标准 Three ShaderPass 接口；
  - Three 0.160 已有 `ShaderPass`、`EffectComposer`、`OutputPass`；
  - 许可证明确；
  - 可作为 F2 `05-cinematic-effects` 的一个实验方案。
- **限制：**
  - **只在 `?full=1` 完整后期模式中有意义**；默认兼容模式直接渲染，不能引入额外离屏 pass；
  - 本项目的照片是环绕树的三维卡片，lens 可能造成边缘撕裂/交互坐标偏移，必须重算鼠标射线；
  - 不能默认启用，性能/可访问性需测试。
- **适配成本：** 低到中。

### A-05 · CSS/Canvas 粒子 Sprite 纹理

- Heart-Star 的 `createSpriteTexture()` 和 Interactive 的 `getGlowTexture()` 都是 MIT 的简单 Canvas radial/5-point star 纹理。
- 当前项目的 `core/utils.ts` 已经有 `makeRadialTexture / makeCanvasTexture` 且质量更符合现有视觉，**重复引入没有价值**。
- 因此不作为正式复用；如果研究需要，可作为 A 级小片段，但不应新增重复工具。

---

## 3. B 类候选（需要重构/只提取模式）

### B-01 · 心形聚合/散开周期

- **来源：** Heart-Star `particles.js`，MIT。
- **价值：** 用 `scatterHold → assembleWindow → holdWindow → breakWindow → trailingScatter` 组织一个同步的“散开→聚合成心→停留→爆散”循环；时间轴清晰。
- **为什么不是 A：**
  - 10,000 颗粒子每帧由 CPU 写位置/颜色/尺寸；
  - 使用固定 `PointsMaterial`，size attribute 无效；
  - 心形是 2D 轮廓，不是当前要求的巨型 3D 爱心；
  - 现有 `HeartParticles` 已经有 GPU 轨道、聚合、爆发、轮廓光，直接替换会降低现有能力。
- **正确做法：** 只研究时间分段和“从散点到心形目标”的目标插值；在现有 `HeartParticles` 的 GPU 路径上新增实验，不复制 CPU 循环。
- **适配成本：** 中高。

### B-02 · 固定卡片池 / 虚拟网格 / 按需渲染

- **来源：** Immersive-Photo-Gallery `gallery-scene.tsx`，MIT。
- **价值：**
  - 固定 48 个 mesh + 48 个 CanvasTexture，不随滚动反复构造；
  - 虚拟网格按偏移映射卡槽，避免无限 DOM/geometry；
  - RAF 只在惯性/相机/过渡时请求，静止即停；
  - DPR 1.25 cap、reduced-motion、WebGL 不可用降级 Flat；
  - 清晰的完整 dispose。
- **为什么是 B：** 它是平面作品墙，适配的是 48 张平面，不是围绕圣诞树的三层 3D 轨道；而且实现嵌在 React `useEffect` 中。我们的 `PhotoManager` 有上传/替换/删除/排序/详情等现有功能，必须保留。只能提取“固定池 + 按需渲染 + 释放”模式。
- **可采用的 F4 方向：**
  - 保留现有 1–24 张卡片的增删和三层轨道；
  - 在照片数量大时采用固定卡槽/纹理复用，限制每帧上传；
  - 对静态时停止不必要的照片 repaint；
  - 不引入 React/Next。
- **适配成本：** 中高。
- **性能风险：** 适配后可控；原版依赖 React 且不提供我们的轨道布局。

### B-03 · IndexedDB Blob + 元数据模式

- **来源：** Christmas-Tree-Photos `App.tsx` 第 34–117 行与 943–1040 行（无 LICENSE，**不可复制代码**）。
- **价值：** schema 很清晰：
  - DB `christmas-tree`，version 1；
  - `photos` store：`{id, name, type, blob}`，keyPath id；
  - `meta` store：`{topId, order[]}`；
  - `URL.createObjectURL(blob)` 加载，effect cleanup 中 revoke；
  - add/remove/clear/refresh；照片本地存储，不上传。
- **为什么是 B/C（法律）：**
  - 仓库无 LICENSE，代码复制禁止；
  - 只能把它作为“原生 IndexedDB 设计参考”，由我们用现有 TypeScript 独立实现；
  - 现有产品照片仅会话有效，若要跨会话保存，需要用户明确同意修改隐私边界；
  - 还需要实现配额失败、用户清除、旧版本迁移、删除相册时清理 Blob。
- **结论：** 模式可借鉴，代码不可复制。F4 前必须获得用户对“照片持久化”的明确授权。
- **适配成本：** 中（原生 API，不增加依赖）。

### B-04 · 球体 → 树形的粒子 morph Shader

- **来源：** Christmas-Tree-Photos `FoliageMaterial`，无许可证，**不可复制**。
- **价值：** 使用 `position / aTargetPos / aRandom` 三个 attribute，通过 `uProgress` 在球体与树形之间混合，点大小按距离衰减；视觉上适合“粒子树聚合”。
- **为什么是 B：**
  - 仅可学习数学结构与 attribute 设计；
  - 代码/资产授权不清；
  - 它生成的是随机锥形树，不是 9 层结构化树冠；
  - 15,000 点 + 当前几何树会超出预算。
- **结论：** 只研究 shader 思路，若 F2 需要，独立重写。
- **适配成本：** 中高。

### B-05 · 点精灵多层光晕/彩虹调制

- **来源：** ChristmasTree `src/shader/particle/fragment.glsl`，无 LICENSE，**不可复制**。
- **价值：** 多层 soft circle + rainbow + sparkle，适合树灯或星屑的发光点。
- **为什么是 B：**
  - 当前 `TreeLights` 已有自己的 shader、灯色/亮度/节奏/揭示控制，直接替换会破坏现有功能；
  - 原仓库无许可证；
  - 它没有真正的双螺旋/树形结构。
- **结论：** 只作为 F2 `05-cinematic-effects` 的点精灵数学参考，独立实现。
- **适配成本：** 中。

### B-06 · 可访问性与输入模式

- **来源：** Immersive-Photo-Gallery（MIT）。
- **价值：**
  - 键盘方向键/Home/Enter 操作 WebGL 画廊；
  - reduced-motion 下取消惯性/变形；
  - WebGL 创建失败时降级 Flat 内容；
  - pointer capture / 拖拽阈值。
- **为什么是 B：** 当前项目已有基本键盘/移动端适配，但 F2/F4 的“照片记忆空间”可以研究更完整的 WCAG 输入模式；必须适配现有 PhotoOrbit 和 Lightbox，而不是复制 48 卡墙。
- **适配成本：** 中。

### B-07 · 轻量 DOM 时间轴 / GSAP 式转场

- **来源：** Immersive 使用 GSAP 做首页/详情页 DOM 转场；ChristmasTree 安装了 GSAP 但源码未使用。
- **为什么是 B/C：**
  - **GSAP 不是 MIT**：Standard “no charge” License，加入前需要法律审查；
  - 当前项目已有 `AnimationManager`、`UIManager`、`DemoController` 的时间轴/回调；
  - 60 秒电影是 Three.js 场景时间轴，不是 DOM 卡片转场；
  - 为几个按钮/弹窗引入非 OSI 动画库会增加体积和维护成本。
- **结论：** 不引入 GSAP。只研究缓动/时间轴编排，使用现有手写 easing。
- **适配成本：** 不需要。

---

## 4. C 类：只研究，不引入

### C-01 · ChristmasTree 整仓

- **原因：** 无 LICENSE；README 与源码不一致（假双螺旋/假反射）；资源泄漏；Vue 单例；音乐/模型无授权。
- **禁止：** 5 首 MP3、star.glb、Draco 副本、Vue 组件、点云树、配置面板、任何代码复制。
- **可研究：** 点精灵发光片段的数学思想、Bloom 参数（标准 Three 用法）。

### C-02 · Christmas-Tree-Photos 整仓

- **原因：** 无 LICENSE；R3F/React 渲染栈；480 个照片 mesh + 600 元素 + 400 灯的高 draw call；摄像头权限；外部字体；MediaPipe 资源无 NOTICE。
- **禁止：** 代码、MediaPipe 资源、Google Font、截图、react 组件、照片 UI。
- **可研究：** IndexedDB schema（独立重写）、照片 object URL 清理、球→树 shader 的数学思路。

### C-03 · Immersive 的完整 Next/React 应用

- **原因：** 引入 React 19/Next/Vinext/Cloudflare 构建、GSAP、Lenis、postprocessing，远超本项目的纯 Three + TS 结构；违反单一渲染循环/避免不必要依赖的原则。
- **允许研究：** 其 MIT 的固定池/按需渲染/清理/lens shader/键盘模式；无需引入其运行栈。
- **禁止：** 真实照片、BGM、品牌图标、xylophone 的模型/音频（除非单独满足其许可与体积评估）。

### C-04 · 摄像头手势系统

- **来源：** Christmas-Tree-Photos、Interactive-Xmas-Tree。
- **原因：** 任务明确“不需要为了手势识别增加不必要的摄像头权限”；两套实现都请求 getUserMedia；Interactive 在无摄像头时还产生 pageerror；MediaPipe 包/模型体积大。
- **结论：** 不引入。若未来用户明确要求手势，另立项并做隐私/权限/失败降级设计。

### C-05 · 用点云锥形树替换当前树体

- **来源：** ChristmasTree、Christmas-Tree-Photos、Interactive-Xmas-Tree。
- **原因：** 目标要求 9 层立体树冠、双螺旋、48 爱心球、水晶树顶、地面反射；参考均为粒子锥/随机点，不是结构化树体。当前 7 层程序化树比它们更接近目标。
- **结论：** 不替换；在 `TreeBranches` 上扩展。

### C-06 · 用参考照片系统替换现有照片系统

- **原因：** 当前 `PhotoManager` 已支持上传/替换/删除/排序/文字/三层轨道/24 上限/资源释放。Immersive 没有用户上传；Photos 仓库没有我们的完整编辑能力且无许可证。
- **结论：** 只借用固定池/按需渲染/IDB 概念；不替换。

### C-07 · GSAP / React / Vue / R3F / Next 生产依赖

- **原因：** 与当前单 Renderer、单 AnimationManager、Vite + TypeScript 架构冲突；框架会引入第二套生命周期与体积；GSAP 许可证不符合“无额外依赖”的原则。
- **结论：** 不新增。

---

## 5. 对应升级目标的取舍

| 目标 | 参考仓库能提供什么 | 计划 |
|---|---|---|
| 心形几何/聚合 | Heart-Star 的 MIT 心形公式和时间轴；当前已有 GPU 爱心 | A-01 + B-01 研究；不替换现有 HeartParticles |
| 双螺旋光带 | 无真实实现（ChristmasTree 只有单螺旋+锥形，README 夸大） | 自研；F2 `02-double-helix-tree` |
| 9 层树冠/360 灯/48 爱心球/水晶树顶 | 无 | 扩展现有 TreeBranches/TreeLights，F3 |
| 地面反射 | 无真实反射（ChristmasTree 只是金属平面） | 自研低成本反射/假反射；F3 评估 |
| 照片记忆空间 | Immersive 固定池/按需渲染/清理；Photos 的 IDB/资源释放 | B-02/B-03 概念；保留现有照片系统 |
| 照片 3D 轨道 | 无同等实现；当前已有三条侧弧轨道 | 保留，不更换 |
| 520/1314 粒子文字 | 无 | 当前 3D 网格+星屑保留，F4 自行研究粒子字 |
| 60 秒电影 | 无 | 基于现有 DemoController 重编排，F5 |
| GSAP | 两个仓库引用，但许可证/必要性不支持 | 不引入 |
| IndexedDB | 只有无许可证的 Photos 仓库实现 | 若用户批准持久化，原生独立实现 |

---

## 6. 复用流程（如果 F2 决定使用）

1. 在 F2 独立实验目录（如 `labs/01-heart-particles`）实现，不碰 `src/**` 正式代码。
2. 记录源仓库、commit、版权、许可证。
3. 用 Three 0.160 重写，禁止安装参考项目的 Three/React/Gsap。
4. 对每个实验提供参数面板、截图、性能数据，按任务书 F2 要求交付。
5. 验收后才考虑进入 F3–F5；在 `THIRD_PARTY_NOTICES.md` 添加 MIT 文本与版权。
6. 任何未确认许可证的仓库只用于阅读，不能把代码粘贴进实验或正式项目。

**F1 结论：A 类只有 4 个小型算法候选，B 类 7 个需要重写/仅借鉴，C 类整个应用和无授权资产全部禁止引入。**
