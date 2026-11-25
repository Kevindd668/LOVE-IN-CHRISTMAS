# F1 · 与现有 Christmas-Wish 技术栈的兼容性报告

**现有技术栈：** Three.js 0.160.0 / TypeScript 5.6.3（strict）/ Vite 5.4.11 / WebGL2 / 单一 Renderer / 单一 AnimationManager  
**现有渲染模式：** 默认兼容直出；`?full=1` 才走 EffectComposer + UnrealBloomPass  
**结论：** 参考项目没有需要升级 Three.js 的底层 API；真正的不兼容点是 **框架、许可证、组件生命周期和性能模型**。

---

## 1. 版本矩阵

| 仓库 | Three.js 版本 | 来源 | 现有 0.160 能否覆盖其 Three API | 架构/依赖兼容性 |
|---|---:|---|---|---|
| Heart-Star | 0.162.0 | CDN import map | 是（Points/OrbitControls/EffectComposer/UnrealBloom/OutputPass 均存在） | 无构建、无 TS，需要重写；可提取算法 |
| ChristmasTree | 0.171.0 | npm lock 精确 | 基本是（使用的 loader/Shader/shader examples 均存在于 0.160） | Vue 3 + Vite 6 + GSAP；不可并入当前 Vite/TS 单页 |
| Immersive-Photo-Gallery | 0.180.0 | npm lock 精确 | 是（Gallery 场景的核心 Three API 都是 0.160 已有） | React 19 + Next/Vinext + Vite 8 + GSAP；不可并入 |
| Christmas-Tree-Photos | 0.169.0 | npm lock 精确 | 核心 API 是，但 R3F 8 / Drei / R3F postprocessing 不在现有栈 | React/R3F；不可并入 |
| Interactive-Xmas-Tree | 0.159.0 | CDN script | 是（基础 Points/Sprite/Clock/Renderer） | 单文件全局脚本；可改写，但功能价值低 |

**禁止：** 把 0.159/0.162/0.169/0.171/0.180 的 Three 副本安装或打入正式项目。所有可复用部分必须用现有的 `three@0.160.0` 重新实现。

---

## 2. API 兼容性检查

### 2.1 已被现有 0.160.0 支持的 API

当前项目已经在 0.160.0 中实际使用：

- `WebGLRenderer`、`Scene`、`PerspectiveCamera`
- `BufferGeometry`、`BufferAttribute`、`Points`、`PointsMaterial`、`ShaderMaterial`
- `CanvasTexture`、`TextureLoader`
- `EffectComposer`、`RenderPass`、`UnrealBloomPass`、`OutputPass`
- `ShaderPass`（0.160 自带；参考的 lens 效果可直接用）
- `OrbitControls`、`GLTFLoader`、`DRACOLoader`（如需再评估）
- `THREE.SRGBColorSpace`、`MathUtils`、`InstancedMesh`（参考未用，现有树和挂饰使用）

因此：

- Heart-Star 的 `Points`/Bloom/OrbitControls 用法可以直接映射到 0.160；
- Immersive 的 Gallery 核心（Renderer/Scene/PerspectiveCamera/PlaneGeometry/CanvasTexture/EffectComposer/ShaderPass/OutputPass）在 0.160 可用；
- Interactive 的 `Points`/`Sprite`/`Clock` 在 0.160 可用；
- ChristmasTree 的点 shader / Bloom 语法在 0.160 可用；
- Christmas-Tree-Photos 的 `shaderMaterial` 是 Drei helper，不是 Three 核心，必须改成原生 `ShaderMaterial`。

### 2.2 0.160 中不存在或不建议使用的差异

F1 没有发现参考代码使用会导致 0.160 编译失败的“新 Three 核心 API”；但这些代码不能直接搬：

- React Three Fiber 8 / Drei / R3F postprocessing 不是 Three 核心，不能作为我们的依赖；
- Vue 3、Next/Vinext、React 19、Cloudflare 构建链不属于现有项目；
- `three/examples/jsm/...` 与 `three/addons/...` 都可解析，但必须统一由 Vite 打包并锁在 0.160；
- 参考项目的 CDN import map 与 UMD `<script>` 模式不能进入我们的模块化构建；
- 参考的动画循环（`setAnimationLoop` / Vue RAF / R3F `useFrame` / 独立 `requestAnimationFrame`）必须改为接入现有 `AnimationManager`，不能在正式项目中另起循环。

---

## 3. 逐仓库兼容性结论

### 3.1 Heart-Star

| 维度 | 结论 |
|---|---|
| Three 核心 | 兼容；使用的 Three API 都在 0.160 中 |
| 构建 | 无 package/build；CDN ES modules；不能直接成为生产模块 |
| TypeScript | 纯 JS；需重写为 TS strict 模块 |
| 渲染循环 | `renderer.setAnimationLoop`；不能复制，必须接入 AnimationManager |
| 性能 | 10k CPU 更新；与现有 GPU 路径冲突，不能直接替换 |
| 许可证 | MIT，兼容；保留声明 |
| 总体 | **A 类算法 / B 类动画思路** |

### 3.2 ChristmasTree

| 维度 | 结论 |
|---|---|
| Three 核心 | 主要 API 在 0.160 可用，但代码依赖 Three 0.171 的示例路径 |
| 框架 | Vue 3 + Vite 6 + GSAP；与现有 TS/Vite 5 单页冲突 |
| GLSL | 点精灵 shader 是标准语法，理论上可在 0.160 重写 |
| 资源管理 | 存在 FallingStar 持续创建不 dispose、树重建不释放等风险 |
| 许可证 | **无 LICENSE 文件**；不可复制 |
| 视觉真实性 | README 的“双螺旋/镜面反射”与源码不一致 |
| 总体 | **C 类**；只作研究，不能进生产 |

### 3.3 Immersive-Photo-Gallery

| 维度 | 结论 |
|---|---|
| Three 核心 | Gallery 核心 API 与 0.160 兼容 |
| 框架 | React 19 + Next/Vinext + Vite 8；不兼容现有架构 |
| 后期 | lens ShaderPass 可用；但默认兼容模式不能启用，需仅 `?full=1` 可选 |
| 照片 | 无用户上传/替换/删除；不能替换现有 PhotoManager |
| 资源管理 | 代码质量高，可借鉴固定池/按需渲染/完整 dispose |
| 许可证 | MIT 代码；图片 CC BY-SA/CC0、BGM 另议 |
| 总体 | **B 类模式 / C 类完整应用** |

### 3.4 Christmas-Tree-Photos

| 维度 | 结论 |
|---|---|
| Three 核心 | 0.169 + R3F；核心 API 可映射，但框架层不兼容 |
| React/R3F | R3F 8.18、Drei、R3F postprocessing；引入会导致第二套 React 渲染树/生命周期 |
| GLSL | Foliage shader 可用 0.160 重写；原代码无许可证 |
| IndexedDB | 原生 API 与 Three 版本无关；可独立重写 |
| 手势 | MediaPipe 摄像头；任务不需要，且无摄像头时 pageerror |
| 性能 | 120 张双面照片 × 4 mesh、600 元素、400 灯；高 draw call |
| 许可证 | **无 LICENSE**；不可复制 |
| 总体 | **C 类代码**；B 类 IndexedDB 架构概念（独立实现） |

### 3.5 Interactive-Xmas-Tree

| 维度 | 结论 |
|---|---|
| Three 核心 | 0.159 API 在 0.160 中可用；基础 Points/Sprite |
| 构建 | 单文件全局脚本，无 TS/模块；需重写 |
| 资源管理 | 无 dispose；不适合作为长期模块 |
| 视觉复杂度 | 低；无法支撑 9 层/双螺旋/反射 |
| 许可证 | MIT；代码可研究/复用，textures 无授权 |
| 总体 | **A 类实心星采样小算法 / C 类整树与手势** |

---

## 4. 架构兼容性硬约束

| 约束 | 对参考代码的影响 |
|---|---|
| 只允许一个 Renderer | 不能直接用 R3F 的 `<Canvas>`、Vue 组件或 Next 页面 |
| 只允许一个 AnimationManager | 不能复制 Heart 的 `setAnimationLoop`、Interactive 的 `requestAnimationFrame`、Immersive 的内部 RAF 或 R3F `useFrame` |
| 默认兼容渲染 | 所有新增 GLSL 后期必须能在默认直出模式中不存在/优雅关闭；不能强制打开 EffectComposer |
| 不增加不必要依赖 | GSAP（非 MIT）、React、Vue、Next、R3F、MediaPipe、postprocessing 均不默认引入 |
| 照片本地处理 | 不得引入参考仓库中的服务器/API/云内容；IndexedDB 只能由用户明确授权后增加 |
| 资源释放 | 参考仓库大多没有完整释放；必须按当前项目的 dispose 规范实现 |
| TypeScript strict | 参考的 JS/JSX 需要类型化重写 |
| 单一 0.160.0 | 不能混用 0.159/0.162/0.169/0.171/0.180 |

---

## 5. 模块级兼容矩阵

| 模块 | 源 | Three 0.160 兼容 | 架构兼容 | 许可证 | 可落地方式 |
|---|---|---|---|---|---|
| 心形参数采样 | Heart-Star | 高 | 高 | MIT | 纯 TS 重写 |
| 星形参数采样 | Heart-Star | 高 | 高 | MIT | 纯 TS 重写 |
| 实心星 Canvas 采样 | Interactive | 高 | 高 | MIT | 纯 Canvas 工具 |
| 径向 lens ShaderPass | Immersive | 高 | 中（仅 full 模式） | MIT | 可选 pass，需鼠标坐标重映射 |
| 心形聚合周期 | Heart-Star | 高 | 中 | MIT | 改为 GPU/现有 HeartParticles |
| 固定卡池/按需 RAF | Immersive | 高 | 中 | MIT | 移植为 TS 照片/渲染策略 |
| IndexedDB schema | Photos | 高 | 高（原生） | **未确认** | 只做独立设计，不复制 |
| 球→树 morph shader | Photos | 高 | 中 | **未确认** | 只研究数学，不复制 |
| 点精灵彩虹光晕 | ChristmasTree | 高 | 中 | **未确认** | 只研究，不复制 |
| 照片双面卡/120 张 | Photos | 高 | 低 | 未确认 | 不采用 |
| 摄像头手势 | Photos/Interactive | 中 | 低 | Apache/项目未确认 | 不引入 |
| GSAP DOM 转场 | Immersive/ChristmasTree | 高 | 低（非 MIT） | Standard | 不引入 |

---

## 6. 性能兼容性

### 6.1 当前项目基线

- 默认兼容 1440×900：233.9 FPS 平均，p95 4.3 ms；
- 24 张照片 1920×1080：172.1 FPS 平均，399 draw calls；
- 4K 等效：192.1 FPS；
- 4 分钟稳定：17.1 MB JS heap，纹理/几何稳定；
- 性能预算有限：当前默认模式 271 draw calls、31 textures（8 照片）。

### 6.2 参考项目的性能代价

| 参考 | 主要开销 | 与当前预算的关系 |
|---|---|---|
| Heart-Star | 10k CPU 位置/颜色/大小更新 | 场景简单仍能 241 FPS，但粒子 CPU 上传不适合直接叠加到现有 600 心 + 树 + 照片场景 |
| ChristmasTree | 5k 点 + 每 0.1s 新建 FallingStar（不 dispose） | 长期运行有 GPU 泄漏；不能用于 30 分钟验收 |
| Immersive | 48 张 CanvasTexture + 固定 mesh；按需渲染 | 构架优秀，但 48 张平面墙与我们的 24 照片轨道不同；适配需重新测量 |
| Photos | 15k 点 + 120 张照片 × 4 mesh + 600 元素 + 400 灯 | 高 draw call，可能远超当前 399；不作为视觉升级基础 |
| Interactive | ~8k 点 + 28×2 挂饰 draw calls | 轻量，但视觉细节不足；无 dispose |

**结论：任何参考技术都不能在不做 GPU/实例化/预算测算的情况下叠加到现有场景。**

### 6.3 最低适配要求

- 新增粒子必须使用 `BufferGeometry` / `Points` / `InstancedMesh`，不能每颗粒子建 Mesh。
- 新增纹理必须有显式释放路径；照片替换/删除必须 dispose。
- 新增 shader 必须在低画质档关闭或简化。
- 不得新增每帧 `new Vector3/Color` 热点。
- 新增资源不得让默认模式掉出 60 FPS；F2 实验需要独立性能报告。
- 30 分钟稳定性仍需在 F5 重新做，不能用 4 分钟 F0 基线替代。

---

## 7. 依赖与构建兼容性

| 依赖 | 建议 | 理由 |
|---|---|---|
| GSAP | **不引入** | 非 OSI 许可证；现有 AnimationManager/时间轴足够；新增体积与维护成本 |
| React / React DOM / Next / Vinext | **不引入** | 与当前单页 Three 架构冲突；会带来第二套生命周期/DOM |
| Vue / Vite 6 | **不引入** | 参考 ChristmasTree 的框架；当前项目不是 Vue |
| R3F / Drei / R3F postprocessing | **不引入** | 需要 React；与单一 Renderer/AnimationManager 不匹配 |
| MediaPipe tasks-vision / hands | **不引入** | 摄像头权限、27 MB 资源、当前交互不需要 |
| `postprocessing` (Zlib) | **暂不引入** | 当前 EffectComposer/Bloom 已足够；除非 F5 需要 SMAA/SSAO 且收益明确 |
| IndexedDB | **原生实现，如用户批准** | 无库依赖；需要隐私/配额/迁移设计 |
| Three.js | **保持 0.160.0** | 不升级、不混用；参考代码只作为算法参考 |

---

## 8. 最终兼容性判定

| 仓库 | 兼容性判定 | 处置 |
|---|---|---|
| Heart-Star | Three 兼容，需 TS/GPU 重写；MIT | A 类小算法、B 类时间轴研究 |
| ChristmasTree | 底层 API 大体兼容，但 Vue/GSAP、无许可证、资源泄漏、功能描述不符 | C 类，不引入 |
| Immersive-Photo-Gallery | Gallery 核心 Three 兼容；React/Next 生态不兼容；MIT 代码 | B 类模式/小 shader，C 类完整应用 |
| Christmas-Tree-Photos | R3F/React/媒体资产不兼容；无许可证 | C 类，IDB 仅作概念 |
| Interactive-Xmas-Tree | 基础 API 兼容；单文件、无清理、素材风险 | A 类小采样器，C 类整树/手势 |

**F1 兼容性结论：无需升级 Three.js；不把任何参考项目作为依赖或完整模块引入。所有正式实现继续使用 three@0.160.0，并把可借鉴算法放进 F2 独立实验中重写验证。**
