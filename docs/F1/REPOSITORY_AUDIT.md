# F1 · 五个参考仓库源码审计

**阶段：** F1 · GitHub 成熟项目源码审计  
**审计日期：** 2026-11-25  
**产品基线：** `v1.0.0-baseline` / `c9e3d02`  
**参考仓库根目录：** `Christmas-Wish/github-references/`（本地目录，已排除出产品 Git）  
**产品代码是否修改：** **否**

> 本报告基于实际 `git clone` 的源码阅读，不是 README 摘要。每个仓库均记录默认分支、最新提交、目录、依赖、Three.js 版本、场景、几何、粒子、Shader、动画、相机、后期、资源管理、性能风险、许可证与第三方素材。

---

## 1. 克隆与仓库状态总表

五个仓库均真实存在、可访问，未出现被删除、私有或无法访问的情况。

| 本地目录 | GitHub 仓库 | 克隆 | 默认分支 | HEAD commit | 最新提交时间 | 跟踪文件 | 大小（不含 .git） |
|---|---|---|---|---|---|---|---:|---:|
| `Heart-Star` | `saklincodes/Heart-Star` | 成功 | `main` | `9317aeb1d053e63887081c3e6deca1287ee33d30` | 2026-08-18T03:21:54+05:30 | 9 | 0.03 MB |
| `ChristmasTree` | `dkvkvk/ChristmasTree` | 成功 | `master` | `59b14c50e41da780733802c4a6047e2954b4f5cf` | 2026-10-30T20:40:30+08:00 | 45 | 24.56 MB |
| `Immersive-Photo-Gallery` | `DancingCircles/immersive-photo-gallery` | 成功 | `main` | `c862c70e81c7be9303d03227f8f044bb5bd5eec4` | 2026-09-13T21:22:24+08:00 | 238 | 18.43 MB |
| `Christmas-Tree-Photos` | `dongkui555/christmas-tree` | 成功 | `main` | `b5f487097fd41dfa605c493338e63e96818fad5a` | 2025-12-14T15:26:32+08:00 | 23 | 27.83 MB |
| `Interactive-Xmas-Tree` | `HairuFan/interactive-xmas-tree` | 成功 | `main` | `be75d04afef0f3bf06c7ab27f6b863e785f9fb2f` | 2025-12-12T21:50:26-05:00 | 10 | 19.67 MB |

- 默认分支通过 `git ls-remote --symref <repo> HEAD` 预先确认，再按该分支执行 `git clone --depth 1 --no-tags`。
- 克隆过程：`Immersive-Photo-Gallery`、`Christmas-Tree-Photos`、`Interactive-Xmas-Tree` 首轮遇到 TLS/schannel 握手中断；使用 OpenSSL 后端与 HTTP/1.1 重试后全部成功。
- 克隆目录只作研究，不进入产品 Git 提交；`.git/info/exclude` 加入了 `/github-references/`。
- 所有结论对应上表 commit，后续如果上游更新，需按新 commit 重新审计。

### 运行性抽查

仅对两个无需安装依赖的静态仓库做了真实浏览器加载；没有为了研究而修改参考仓库。

| 仓库 | 方式 | 结果 |
|---|---|---|
| Heart-Star | 本地 HTTP + Edge 158，1440×900 | 成功；canvas 1440×900；rAF 约 241 FPS；无 page error；仅 favicon 404 |
| Interactive-Xmas-Tree | 本地 HTTP + Edge 158，1440×900 | 3D canvas 成功渲染；rAF 约 240 FPS；摄像头不可用产生 `NotFoundError`；页面仍播放自动动画；favicon 404 |

其余三个仓库分别是 Vue/Vite、Next/Vinext、React/R3F 应用；F1 没有执行 `npm install`，因此没有安装它们的框架依赖，也没有运行构建。相关结论基于 package/lock 与源码阅读；这不影响本阶段“源码审计”的结论。**F1 未向产品加入任何依赖。**

---

## 2. Heart-Star（`saklincodes/Heart-Star`）

### 2.1 仓库与依赖

- **克隆：成功**（浅克隆，默认分支 `main`；最新提交 `9317aeb…`；9 个文件）。
- 默认分支：`main`；HEAD：`9317aeb…`；9 个文件。
- **没有 `package.json`、没有构建工具、没有 lockfile**。
- Three.js 版本：**r162**，通过 `index.html` 的 import map 从 jsDelivr 加载：
  - `three@0.162.0/build/three.module.js`
  - `three@0.162.0/examples/jsm/`
- 页面必须由 HTTP 提供（ES modules），双击本地文件不可用。

### 2.2 实际检查矩阵

| 检查项 | 发现 |
|---|---|
| 场景初始化 | `main.js` 中直接创建 Scene / PerspectiveCamera / WebGLRenderer / OrbitControls / EffectComposer |
| 几何体生成 | `geometry.js` 用五角星多边形采样和经典心形参数曲线 |
| 粒子系统 | 10,000 个粒子，一个 `THREE.Points` + `BufferGeometry` |
| GLSL | 无自定义顶点/片元 Shader；粒子使用标准 `PointsMaterial`，后期使用标准 `UnrealBloomPass` |
| 动画循环 | `renderer.setAnimationLoop(tick)`，单循环；`dt` clamp 到 0.1 |
| 相机 | OrbitControls，阻尼；无移动端专门手势 |
| 后期处理 | `EffectComposer → RenderPass → UnrealBloomPass → OutputPass` |
| GPU 资源 | `ParticleField.dispose()` 释放 geometry/material/map；但页面没有调用它，也没有释放 composer/renderer |
| 性能 | 每帧在 CPU 循环更新 10,000×3 个位置、颜色和 size 数组；一个 draw call |
| 相机/UI | 极简控件：形态切换、暂停 |
| 第三方素材 | 代码、粒子贴图、几何均为仓库内生成；依赖仅 Three.js；无外部图片/字体/音乐 |

### 2.3 核心算法

- `sampleHeart(t)`：经典参数心形公式：
  - `x = 16 sin³θ`
  - `y = 13 cosθ − 5 cos2θ − 2 cos3θ − cos4θ`
  - `z = sin(4θ) × 2`
  - 乘以 `HEART_SCALE=2.2`。
- `sampleStar(t)`：5 个外顶点与 5 个内顶点的闭合多边形；按周长参数均匀取样。
- `ParticleField.update()`：
  - 在 starHome 与 heartHome 之间按 morph 插值；
  - 用 `scatterHold → assembleWindow → holdWindow → breakWindow → trailingScatter` 周期做聚合/散开；
  - 每颗粒子有 driftOffset，聚合时回到目标位置；
  - 颜色亮度、闪烁和大小随时间波动；
  - 使用 `1 - exp(-rate·dt)` 做帧率独立趋近。

### 2.4 重要实现问题

1. **并不是三维体积爱心**：心形来自一条二维参数曲线，`z` 仅是 ±2 的正弦抖动；视觉上是“心形轮廓云”，不是有厚度的实体 3D 爱心。
2. `PointsMaterial` **不会读取 geometry 的 `size` attribute**；代码每帧更新 size 数组，但固定材质 `size: 2.8`，因此逐粒子大小 shimmer 实际上不生效。若迁移，应改为自定义 ShaderMaterial 或使用尺寸属性。
3. 10,000 颗粒子每帧由 CPU 写回三个 attribute；对当前项目 600 爱心而言是可理解的参考，但直接换成 10,000 会与“避免每帧大量 JS 循环/上传”的约束冲突。
4. 缺少 `renderer.dispose()`、`composer` pass 释放；页面生命周期短时可忽略，生产模块不可照搬。

### 2.5 可复用与结论

- **A 类候选：** 心形/五角星参数采样数学（纯算法，MIT，可改写为 TypeScript；保留版权声明）。
- **B 类候选：** 聚合/散开周期和 morph 时间参数；需要改成 GPU/自定义 Shader 或适配现有 `HeartParticles`，不能直接套 10k CPU 循环。
- **C 类：** 整个页面结构、固定 `PointsMaterial`、无清理的资源管理；不建议作为产品模块。
- 许可证：MIT，Copyright © 2026 Saklin Ali；代码可复用，需保留 MIT 文本与版权声明。
- **最终建议：只研究心形公式与时间轴思想，不直接引入该页面。** 当前项目的 `HeartParticles` 已有更强的 3D 聚合/爆发，不应降级替换。

---

## 3. ChristmasTree（`dkvkvk/ChristmasTree`）

### 3.1 仓库与依赖

- **克隆：成功**（浅克隆，默认分支 `master`；最新提交 `59b14c5…`；45 个文件；24.56 MB）。
- 默认分支：`master`；HEAD：`59b14c5…`；45 个文件；24.56 MB。
- 技术栈：Vue 3 + Vite 6；Three.js **0.171.0**（lock 精确）；GSAP `^3.12.5`；lil-gui；DRACOLoader。
- 目录：`src/three`（场景/渲染器/树/雪/礼物/气球/音乐元素）、`src/shader`（4 组 GLSL）、`src/components`（Vue）、`public`（音乐/模型/Draco）。
- **仓库没有 `LICENSE` 文件**；README 第 176–178 行声称 `MIT © dkvkvk`，但链接的 `./LICENSE` 不存在。许可证状态为 **unconfirmed**，只能技术研究，禁止直接复制代码或素材。

### 3.2 实际检查矩阵

| 检查项 | 发现 |
|---|---|
| 场景初始化 | `scene.js`：Scene、PerspectiveCamera(75)、OrbitControls、AmbientLight + PointLight |
| 几何体 | 约 5,000 个点：70% 单条螺旋 + 30% 内部锥形；树顶加载 `star.glb`（Draco） |
| 粒子系统 | 树粒子、星周围 200 粒子、雪花 2,000 点；`ShaderMaterial` + AdditiveBlending |
| GLSL | `particle` / `starParticle` / `fallingStar` 三组点精灵 shader；有彩虹色、多层柔光、生命周期 |
| 动画循环 | Vue `animate()` 单 `requestAnimationFrame`；树更新使用固定 `time += 0.016`，不依赖 delta |
| 相机 | OrbitControls，enableDamping，min/max distance |
| 后期 | EffectComposer + UnrealBloomPass + OutputPass；ACES tone mapping |
| 资源管理 | Snow/Balloons/Decorations/GiftBoxes/MusicalElements 有局部 dispose；树、星星和 fallingStars 无 dispose |
| 性能问题 | 每 0.1 秒创建一颗 fallingStar；6 秒生命周期内最多约 60 个 Points，每个都是独立 geometry/material，移除时只 `scene.remove`，未 dispose；树的 5,000 点数可接受，但不断创建对象会累积 GPU 资源 |
| 地面反射 | **没有真正的反射**；`createGround()` 只是 metalness 0.8 的黑色 MeshStandardMaterial 平面；没有 `Reflector`、镜像相机或 render target |
| 双层螺旋 | **没有双螺旋**；源码只有 `spiralParticles` 单条螺旋 + `coneParticles` 锥形；README 的“双层螺旋”与源码不一致 |
| 音乐/模型 | 5 首 MP3（Last Christmas、Lonely Christmas、圣诞快乐劳伦斯先生、圣诞星、圣诞结）；`star.glb`；均无来源/授权/credit 说明 |

### 3.3 可借鉴但没有直接复用价值的部分

- 点精灵 fragment shader 的多层光晕 + 彩虹调制，可作为 F3 树灯/光点研究素材；但当前项目 `TreeLights` 已有自定义 shader，且本仓库无许可证。
- Bloom 参数与 ACES 配置是标准 Three.js 用法，已存在于我们项目。
- `star.glb`、音乐和 Draco 目录涉及第三方资产；不得复制。
- Vue 生命周期没有在 `onUnmounted` 中释放场景/renderer/composer；也不符合我们“统一 AnimationManager / 单一 Renderer”的架构。

### 3.4 结论

- **类别：** C（只研究，不建议引入任何代码或资产）。
- 复用难度：高。即使忽略许可证，场景是 Vue 单例 + 固定时间步 + GPU 资源泄漏，需要大幅重写；并且没有任务书要求的双螺旋和真实地面反射。
- 性能风险：中高（持续创建 FallingStar 且不释放；测试运行未执行，因为需要安装依赖且没有许可证）。
- **最终建议：** 只把它当作“点精灵发光可选视觉参考”；不要用它的树、地面、礼物、音频、模型或 GLSL 直接替换当前实现。任务书中的双螺旋和地面反射必须在 F3 自行实现。

---

## 4. Immersive-Photo-Gallery（`DancingCircles/immersive-photo-gallery`）

### 4.1 仓库与依赖

- **克隆：成功**（浅克隆，默认分支 `main`；最新提交 `c862c70…`；238 个文件；18.43 MB）。
- 默认分支：`main`；HEAD：`c862c70…`；238 个文件；18.43 MB。
- 技术栈：React 19、TypeScript、Next.js App Router 兼容层（Vinext 1.0）、Vite 8、Cloudflare Worker 构建；Three.js **0.180.0**；GSAP 3.12.7；`postprocessing` 6.39.5；Lenis。
- Node 要求 `>=22.13.0`；本项目当前 Node 24 可安装，但 F1 没有安装其依赖。
- 许可证：**MIT**（`LICENSE`，Copyright © 2026 DancingCircles）；`THIRD_PARTY_NOTICES.md` 额外声明 Codrops Repeating Image Transition 与 Sujenphea/xylophone 为 MIT。
- 摄影图片逐项标注授权：**15 张 CC BY-SA，5 张 CC0**；BGM `memories-in-soft-light.mp3` 明确说明“再发布前需确认授权”，**不能视为可复用**。

### 4.2 实际检查矩阵

| 检查项 | 发现 |
|---|---|
| 场景初始化 | `features/gallery/scene/gallery-scene.tsx` 在 React `useEffect` 内直接创建 Three Renderer、Scene、PerspectiveCamera；不是 R3F |
| 几何体 | 一个共享 PlaneGeometry，48 个固定卡片池 mesh；卡片内容绘制到 CanvasTexture（640×740 原始画布，0.6 缩放） |
| 粒子系统 | Gallery 场景没有粒子系统；`xylophone` 参考有流体/FBO 模拟，但与照片画廊分离 |
| GLSL | 一个小型全屏径向 lens ShaderPass（`distortion`、`backgroundColor`）；xylophone 另有大量 GLSL/Fluid/Glass/SMAA/SSAO |
| 动画循环 | 按需 `requestAnimationFrame`：仅惯性、相机移动、卡片 z 过渡或 lens 过渡时继续；静止时停止请求；不使用持续 RAF |
| 相机/输入 | 自定义相机 z 距离 + 指针/滚轮/方向键/Home + 指针拾取；没有 OrbitControls |
| 后期 | Three `EffectComposer → RenderPass → lens ShaderPass → OutputPass`；固定 48 卡片池 |
| 资源管理 | 明确清理事件监听、`ResizeObserver`、RAF、48 个 surface、geometry、materials、textures、composer passes、renderer、DOM canvas；实现质量高 |
| 性能优化 | 固定 48 卡池；每张卡片复用纹理；虚拟网格/分页预取；DPR cap 1.25；仅在需要时渲染；WebGL 不可用/低性能/减少动态时降级 Flat |
| 数据/照片 | 内容来自本地 fixtures 或 HTTP API；**没有 IndexedDB**；没有用户上传/替换/删除照片的交互 |
| 3D 形态 | 是可循环浏览的平面作品墙 + 径向 lens 透视效果，不是绕树三层轨道，也不是 3D 相框 |

### 4.3 真正值得研究的设计

1. 固定卡片池 + 虚拟网格 + 纹理复用：避免每次滚动创建/销毁大量 GPU 对象。
2. 按需渲染：场景静止时停止 RAF，减少无意义 GPU 消耗。
3. 完整 dispose：geometry/material/texture/composer/renderer/事件/observer 全部释放，可作为 F3–F5 资源管理参考。
4. 可访问性：键盘方向键/Home/Enter，reduced-motion 降级，WebGL context loss 处理。
5. lens shader：短小、MIT、API 可在 Three 0.160 的 ShaderPass 中复现；但只在 `?full=1` 后期模式有意义。
6. 图片授权：作品详情保留作者、来源、许可证；这提示我们不要拿它的演示图片当素材。

### 4.4 结论

- **类别：** 代码 MIT，可研究并可谨慎改造；效果/架构为 B，完整 Next/React 应用为 C。
- 复用难度：中高（React/Next 架构 + 平面画廊与我们的环绕照片系统差异大；只能提取算法/模式）。
- 性能风险：适配后可控；完整应用依赖 Node 22、Next/Vinext、React 19，远大于本项目视觉升级所需，不建议引入。
- **最终建议：** 保留为“固定卡池/按需渲染/完整 dispose”的研究样本；照片系统不替换当前实现。若 F4 采用它的 lens 或卡池思路，应重写为当前 TypeScript/Three 类，而不是复制 React 组件。

---

## 5. Christmas-Tree-Photos（`dongkui555/christmas-tree`）

### 5.1 仓库与依赖

- **克隆：成功**（浅克隆，默认分支 `main`；最新提交 `b5f4870…`；23 个文件；27.83 MB）。
- 默认分支：`main`；HEAD：`b5f4870…`；23 个文件；27.83 MB。
- 技术栈：React 18 + Vite 5 + React Three Fiber 8.18 + Drei + `@react-three/postprocessing`；Three.js **0.169.0**；MediaPipe GestureRecognizer；`maath`；`uuid`。
- **没有 `LICENSE` 文件**；README 末尾只写了 `License: MIT`，没有 MIT 全文、版权声明或链接；同时没有 `THIRD_PARTY_NOTICES`。许可证状态为 **unconfirmed**，只能研究，禁止直接复制代码或素材。
- 仓库大量依赖与资源：MediaPipe wasm/model 约 27 MB；外部 Google Fonts `Great Vibes`（通过 `@import` 网络加载）。
- 代码为单个约 1,220 行 `src/App.tsx`，业务、UI、Three、MediaPipe、IndexedDB 混在一起。

### 5.2 实际检查矩阵

| 检查项 | 发现 |
|---|---|
| 场景初始化 | React Three Fiber `<Canvas shadows dpr={[1,2]} camera={{position:[0,0,40], fov:50}}>`；`Experience` 内部 OrbitControls |
| 几何体 | `CONFIG.counts.foliage = 15000`；球形初始点 → 树形目标点的 BufferGeometry；`getTreePosition()` 用随机锥体采样 |
| 粒子系统 | 自定义 `FoliageMaterial` shader（`uTime/uProgress`，position/aTargetPos/aRandom）；1,000 雪点 |
| GLSL | 一个 Foliage shader；点大小 `(60*(1+aRandom))/-mv.z`；使用 `gl_PointCoord` 圆形裁剪；无复杂后期自定义 shader（Bloom/Vignette 来自 R3F postprocessing） |
| 动画循环 | R3F 的 `useFrame`（多组件共享 R3F 单一 loop）；R3F 管理一个 renderer |
| 相机 | R3F `OrbitControls`；手势通过 camera rotationSpeed 影响场景 |
| 后期 | `@react-three/postprocessing` 的 EffectComposer + Bloom + Vignette |
| 照片系统 | **IndexedDB**：`christmas-tree` DB、`photos` store（Blob）、`meta` store（topId/order）；上传/删除/清空/设置 TOP；没有替换、逐张排序 UI；用 `URL.createObjectURL` 生成预览并在 effect cleanup 中 revoke |
| 照片 3D | `CONFIG.counts.ornaments = 120` 固定数量的双面拍立得，每张照片由 4 个 Mesh（正/背 image + border）构成，共约 480 个 mesh；重复使用照片纹理；没有 InstancedMesh |
| 手势 | MediaPipe GestureRecognizer（Open_Palm / Closed_Fist / Pinch）；请求摄像头，cleanup 中会停止 track 并清空 srcObject |
| 资源管理 | React/R3F 会处理部分场景资源；代码没有显式 dispose/IndexedDB 关闭外的纹理释放；photo textures 由 `useTexture` 管理；MediaPipe stream cleanup 较好 |
| 性能风险 | 15k foliage + 120 个双面照片 × 4 mesh + 600 个圣诞装饰 + 400 个独立灯 + 1,000 雪点，Draw call 数量极高；未使用 InstancedMesh/几何合并；照片纹理重复使用但照片对象没有池化 |

### 5.3 可研究点

- IndexedDB 的两 store 设计（Blob + meta：topId/order）是一个清晰的小型参考；但代码无许可证，只能自己重写。
- 照片的 object URL 在 effect cleanup 中统一 revoke，方向正确。
- Foliage shader 的“从球体/混沌位置向树形目标 morph”可以启发 F3/F5 的粒子聚合，但它不是结构化 9 层树，且性能模型不适合直接搬。
- 手势 cleanup 正确停止 camera tracks，说明作者重视资源释放；但任务明确“不需要为了手势识别增加不必要的摄像头权限”，因此本项目不应采用。

### 5.4 结论

- **类别：** C（没有许可证，直接复用禁止）；IDB 概念可作 B 类研究，但实现必须独立重写。
- 复用难度：高（单文件 React/R3F、3D 照片与手势耦合、无许可证）。
- 性能风险：高（固定 120 张双面照片 × 多 mesh、600+ 元素、400 灯，无实例化）；没有在本机安装运行，不能拿作者截图当性能证明。
- **最终建议：** 只研究 IndexedDB schema 和照片资源释放思路；不要复制代码、模型、MediaPipe 资源、字体或截图。不要用它的照片/手势系统替换当前照片上传和 raycast 交互。

---

## 6. Interactive-Xmas-Tree（`HairuFan/interactive-xmas-tree`）

### 6.1 仓库与依赖

- **克隆：成功**（浅克隆，默认分支 `main`；最新提交 `be75d04…`；10 个跟踪文件；19.67 MB）。
- 默认分支：`main`；HEAD：`be75d04…`；10 个跟踪文件；19.67 MB。
- 技术栈：单文件 HTML + 原生 JavaScript；Three.js **0.159.0**（CDN `three.min.js`）；MediaPipe Hands 0.3（CDN）；无 package.json、无构建、无 lockfile。
- 许可证：仓库根目录 `MIT License`，Copyright © 2025 Hairu Fan；MIT 代码可研究/复用并保留声明。
- 页面还带一个 19 MB 的 `texture/` 目录（cloud/leaf_noise/snow_soft/star/star_glow），但 **index.html 没有引用任何 texture 路径**；素材来源/授权不明，不得复用。

### 6.2 实际检查矩阵

| 检查项 | 发现 |
|---|---|
| 场景初始化 | `initThree()`：Scene、PerspectiveCamera(40)、WebGLRenderer(antialias)，Hemisphere + SpotLight，一个 `treeGroup` |
| 几何体 | 树 3,600 点、树干 420 点、地面雪环 2,400 点、金色实心星 1,500 点；28 个球体挂饰 + Sprite 光晕 |
| 粒子系统 | 多个 `THREE.Points` + BufferGeometry；每帧 CPU 更新 position 数组（爆炸、漂浮、手势跟随） |
| GLSL | **没有任何自定义 Shader / ShaderMaterial**；只用 PointsMaterial / SpriteMaterial |
| 动画循环 | `requestAnimationFrame(animate)` 单循环；Three.Clock |
| 相机 | PerspectiveCamera，无 OrbitControls；固定相机并可轻微 tilt；手势改变 hand/tree 位置 |
| 后期 | 无 EffectComposer、无 Bloom、无反射、无阴影后处理 |
| GPU 资源 | 没有 `dispose()`、没有 remove listener、没有 renderer.dispose；页面生命周期短 |
| 性能优化 | 点系统较少 draw call；但 28 个挂饰每个都有 Mesh + Sprite，无实例化；没有质量档位 |
| 手势 | MediaPipe Hands + webcam；无摄像头时自动动画继续（测试中出现 `NotFoundError` pageerror） |
| 实心星采样 | `createStarSampler(sizePx)`：Canvas 2D 画实心五角星，`getImageData` 拒绝星形外采样；1,500 个粒子构成星星 |
| 视觉资产 | `texture/` 19 MB 全部未使用；无来源/授权说明 |

### 6.3 可研究点

- 实心星采样器是一个独立、可理解的 Canvas 采样算法（MIT），可用于星形粒子装饰；但它做的是五角星，不是水晶爱心。
- Sprite 光晕 + 球体挂饰可以给挂饰视觉参考；当前项目已有更结构化的挂饰/礼物。
- 没有双螺旋、9 层树、地面反射、Bloom 或照片系统；树是简单圆锥点云。
- 手势需要摄像头，而且没有正确的权限失败 UI；不符合本项目“不增加不必要摄像头权限”的约束。

### 6.4 结论

- **类别：** 代码 MIT；星形采样/光晕 Sprite 可作为 A/B 类小算法参考；整树、手势、纹理资产为 C。
- 复用难度：低（提取算法），但视觉升级价值低。
- 性能风险：中低（点数约 8k、材质简单），但无资源清理/质量档位；与当前项目相比明显更简单。
- **最终建议：** 只保留“实心星采样”作为可能的装饰研究；不要用它的点云树替换现有 7 层程序化树；不要请求摄像头，不要使用未引用的 textures。

---

## 7. 跨仓库结论

### 7.1 没有仓库直接提供升级书中的核心视觉

| 升级书目标 | 五个仓库的实际实现 | 结论 |
|---|---|---|
| 9 层立体树冠 | 三个参考是粒子锥（ChristmasTree / Photos / Interactive）；其余不是树 | 没有可复用实现；必须在现有 `TreeBranches` 上自行扩展 |
| 双螺旋光带 | ChristmasTree README 声称“双层螺旋”，源码实际只有单螺旋 + 锥形；其他仓库没有 | 必须在 F3 自行设计 |
| 360 颗动态灯泡 | 当前项目已有 220 颗 shader 灯；参考没有更成熟的灯串模块 | 扩展现有 `TreeLights`，不引入参考 |
| 48 颗爱心装饰球 | 没有仓库实现 | 自行建模/实例化 |
| 水晶爱心树顶 | 参考为 `star.glb` 或点云五角星 | 自行建模；不能直接用模型 |
| 地面反射 | ChristmasTree 使用金属材质平面，不是 Reflector/真实反射 | 必须在 F3 自行实现并测性能 |
| 巨型 3D 爱心 | Heart-Star 只有二维心形轮廓粒子 | 不适合直接用于实体 3D 爱心；当前爱心聚合可作基础 |
| 三层爱心轨道 / 照片记忆空间 | 当前项目已有照片三轨道；参考没有同等轨道系统 | 保留并扩展现有 PhotoOrbit |
| 粒子文字 520/1314 | 无参考实现 | 当前 3D 网格 + 星屑保留，F4 自行研究粒子文字 |
| 60 秒电影 | 无参考达到；当前 45 秒 | 基于现有 DemoController 重编排 |
| GSAP | ChristmasTree 安装了但源码未使用；Immersive 用于 DOM 转场 | 不建议引入（非 OSI 许可证 + 无必要） |
| IndexedDB | 仅 Christmas-Tree-Photos，且无许可证 | 若用户批准，按原生 API 独立实现 |

### 7.2 价值排序

1. **Immersive-Photo-Gallery**：资源管理、固定卡池、按需渲染、可访问性、lens shader；代码 MIT。对 F4/性能工程最有价值，但不能直接搬 React/Next。
2. **Heart-Star**：心形/星形参数数学、morph/聚合时间轴；MIT，代码体量最小，最容易安全研究。
3. **Interactive-Xmas-Tree**：实心星采样、简单点云组织；MIT，但视觉复杂度低。
4. **Christmas-Tree-Photos**：IndexedDB 与照片资源释放思路，但无许可证、R3F、性能风险高；只能远距离研究。
5. **ChristmasTree**：点精灵 shader 与 Bloom 有零散参考，但无 LICENSE、README 与源码不一致、资源泄漏、素材风险；不建议引入。

### 7.3 总体建议

- **不 vendor 任何完整仓库。**
- **不复制任何未确认许可证仓库的代码/素材。**
- 只对 Heart-Star、Immersive-Photo-Gallery、Interactive-Xmas-Tree 的 MIT 代码做小型算法研究；实际进入产品前重写并保留版权声明。
- 大视觉目标（双螺旋、9 层、反射、爱心树顶、粒子文字）必须自研或在 F2 独立实验中验证。
- 正式项目继续使用 Three.js 0.160.0、单一 Renderer、单一 AnimationManager；不引入 React/Vue/Next/R3F/GSAP。
