# F0 · 当前技术架构

**审计对象：** Christmas-Wish v1.0.0（基线 `c9e3d02`）  
**阶段：** F0 · 只读架构审计  
**文档性质：** 描述现状，不代表 F3–F5 已实现

---

## 1. 一句话架构

单个 Vite + TypeScript 页面中，统一创建 **1 个 WebGL2 渲染器、1 个 Scene、1 个 PerspectiveCamera、1 个 AnimationManager**；所有场景对象共享同一渲染循环，设置由 `SettingsManager` 集中持久化，UI 只负责发事件。

```text
index.html
  └─ src/main.ts  (ChristmasWishApp：唯一组合根)
       ├─ SettingsManager        参数状态 / localStorage
       ├─ Renderer               WebGLRenderer + 质量 / Bloom / 兼容渲染
       ├─ SceneManager           Scene / Sky / Ground / Lights / PMREM / 远景
       ├─ CameraManager          PerspectiveCamera / OrbitControls / 镜头动画
       ├─ AnimationManager       唯一 requestAnimationFrame 循环
       ├─ ChristmasTree          树体 / 灯光 / 星星
       ├─ RomanticText           520 / 1314 立体字 + 星屑
       ├─ GiftBoxes              5 个礼盒 / 开盖 / 光效
       ├─ PhotoManager           8 张内置 + 用户照片 / 三层轨道
       ├─ HeartParticles         600 爱心 / 聚合
       ├─ SnowParticles          1800 雪
       ├─ StarParticles          1200 星空 + 流星
       ├─ AuroraEffect           动态极光
       ├─ MagicParticles         点击爆发 / 光圈 / 浮字
       ├─ MusicEngine            纯 Web Audio 合成
       ├─ MouseInteraction       射线拾取
       ├─ GiftInteraction        礼物开启
       ├─ DemoController         45 秒演示
       ├─ RomanceMoment          16 秒浪漫时刻
       ├─ ControlPanel           六大设置模块
       ├─ PhotoUploader          照片列表 / 上传 / 替换 / 删除
       └─ UIManager              弹窗 / 电影 UI / 加载器 / Toast
```

---

## 2. 目录与模块

### 2.1 入口层

| 路径 | 职责 |
|---|---|
| `index.html` | 502 行；首屏、标题、控制面板六个 section、电影 UI、祝福弹窗、照片灯箱、加载器、照片 input |
| `src/main.ts` | 983 行；组合根、初始化、设置分发、交互路由、演示/浪漫回调、音频解锁、生命周期 |
| `src/styles.css` | 2,863 行；完整视觉系统、玻璃拟态、响应式、电影 UI、safe-mode |
| `scripts/build.mjs` | 跨平台任务包装，设置项目内 `.tmp` 供 esbuild 使用 |
| `scripts/build-single.mjs` | 内联 CSS/JS 到单文件，同时写项目内和上一级目录 |
| `vite.config.ts` | Vite 单页构建配置 |

### 2.2 Core

| 模块 | 职责 |
|---|---|
| `src/core/AnimationManager.ts` | 唯一 RAF 循环；暴露 `start / stop / dispose`；visibilitychange 时不计帧；每约 700ms 计算 FPS |
| `src/core/Renderer.ts` | 创建 WebGLRenderer；ACES Filmic、PCFSoft 阴影；质量档 DPR/分辨率；Bloom pipeline 或兼容直出；context 恢复 |
| `src/core/SceneManager.ts` | 天空 Shader、雪地几何与 Canvas 纹理、PMREM 环境、远景山脊/松林、接触阴影、背景/环境亮度 |
| `src/core/CameraManager.ts` | PerspectiveCamera、OrbitControls、桌面/移动端构图、开场推近、镜头 tween、电影模式 |
| `src/core/utils.ts` | 数学、缓动、Canvas 径向/文字纹理、随机种子等 |

### 2.3 Objects 与视觉效果

| 模块 | 当前实现 |
|---|---|
| `ChristmasTree` | 组合树体、灯串、树顶星；负责旋转/重建/显隐/演示姿态 |
| `TreeBranches` | 程序化树层核心、分叉枝臂、3 种松针变体（InstancedMesh）、树梢、34 个挂饰、支持 4–12 层 |
| `TreeLights` | 单 `Points` + ShaderMaterial，默认 220 颗螺旋灯；5 种灯光模式；颜色/亮度/闪烁/揭示 |
| `TreeStar` | 挤出五角星金属几何、柔光、80 颗环绕粒子、点击代理 |
| `RomanticText` | Droid Serif 轮廓字符 → TextGeometry/Extrude；中文回退 Canvas；200/150 星屑；金属材质 |
| `GiftBoxes` | 五份礼物：酒红 / 香槟 / 墨绿 / 珍珠 / 玫瑰；盒身、盒盖、丝带、蝴蝶结、吊牌、内部光、点光、开盖动画 |
| `AuroraEffect` | 动态极光带 Shader/几何 |
| `BloomEffect` | EffectComposer → RenderPass → UnrealBloomPass → OutputPass（仅完整渲染模式） |
| `LightEffect` | 场景主灯、补光、灯串 spill、质量调整 |

### 2.4 Particles

均为 GPU/单 draw call 优先：

- `SnowParticles`：默认 1800，上限 3200。
- `StarParticles`：默认 1200；含流星。
- `HeartParticles`：默认 600，上限 1500；`orbit / gather / drift` 三种模式；聚合轮廓光。
- `MagicParticles`：点击 Bloom 爆发、光圈、`520` 浮字、礼物/星星爆发。
- 演示组装粒子：`DemoController` 内 1150 个点，使用自定义 ShaderMaterial；退出演示时显式 dispose。

### 2.5 Photos

| 模块 | 职责 |
|---|---|
| `PhotoManager` | 管理 8 张内置程序化照片 + 本地上传；上限 24；上传/替换/删除/排序/文字；纹理与 ObjectURL 生命周期 |
| `PhotoCard` | 3D 相框：外层金色圆角框、奶油色 matte、照片平面、说明条、悬浮/缩放；提供 raycast 拾取 |
| `PhotoOrbit` | 3 条轨道（半径 3.15 / 3.82 / 4.5，高度范围不同）；**相机相对侧弧 + 缓慢摆动**，不是完整 360° 绕树穿屏；相机旋转时保持照片在左右侧 |
| `placeholderArt` | 8 张本地 Canvas 生成的冬夜占位海报；无外部图片依赖 |

上传限制：JPG/PNG/WEBP，单文件 ≤30 MB，最多 24 张。用户图片只存在于当前标签页：

- 通过 `URL.createObjectURL` + `TextureLoader` 加载；
- 替换时 dispose 旧纹理并 revoke 旧 URL；
- 删除时从 scene 移除 card、dispose 卡片材质、dispose 纹理、revoke URL；
- 页面刷新后回到 8 张内置照片；照片**不写入 localStorage / IndexedDB**。

### 2.6 Interaction

- `MouseInteraction`：canvas 指针事件，Raycaster 命中 tree / star / gift / photo / empty；hover 指针；移动端触控转换为点击/拖拽区分。
- `GiftInteraction`：维护打开状态、计算礼物中心、播放开盖、粒子爆发、520ms 后通过 UIManager 弹祝福。
- `DemoController`：45 秒时间轴、9 个镜头关键帧、场景重置/恢复、组装粒子、章节回调、暂停/继续/重播/退出。
- `RomanceMoment`：16 秒，镜头拉近、灯光揭示、照片/数字出现、爱心聚合、最终祝福。

### 2.7 UI / Settings

- `SettingsManager`：`WishSettings` 强类型；localStorage key `a-christmas-wish.settings.v1`；加载时校验并 clamp；220ms debounce 写入；subscribe 通知。
- `ControlPanel`：扫描 `[data-setting]`，将 UI 值写入 SettingsManager；quality 三按钮；重置；键盘 Escape 关闭。
- `PhotoUploader`：重建照片列表 DOM；上传、替换、删除、排序、文字编辑；不把照片数据写入持久层。
- `UIManager`：loader、电影 HUD/章节/进度/结束卡、愿望 modal、照片 lightbox、toast、全屏按钮状态、音乐按钮状态、提示。
- 所有设置都由 `main.handleSettingsChanged` 路由到真实 Three.js 对象；不是静态装饰。

### 2.8 Audio

`src/audio/MusicEngine.ts`（527 行）完全使用 Web Audio：

- 背景曲目：`starlight` / `sleigh` / `quiet`；
- 合成钢琴、风铃、雪橇铃、氛围垫、混响 IR/噪声；
- 音效：star / gift / photo / tap；
- 浏览器自动播放限制：首次 pointerdown/keydown unlock，之后才允许 `AudioContext.resume()`；音乐开关、演示、浪漫模式会触发。

没有外部音乐文件、CDN 或授权音频。

---

## 3. 帧循环与数据流

```text
AnimationManager.tick
  ├─ document.hidden ? 只更新时间戳并返回
  ├─ delta = clamp(0.0001 … 0.05)
  ├─ 每 ~700ms: FPS 回调 → main.lastFps → ControlPanel 数值
  └─ main.tick(delta, elapsed)
       ├─ CameraManager.update
       ├─ DemoController.update | RomanceMoment.update
       ├─ ChristmasTree.update (旋转/灯 shader/星星)
       ├─ RomanticText.update
       ├─ PhotoManager.update
       │    ├─ PhotoOrbit.update (侧弧 + 阻尼)
       │    ├─ 每张卡片 scale / opacity / caption / 悬浮
       │    └─ 相机距离上限保护
       ├─ HeartParticles / SnowParticles / StarParticles / AuroraEffect
       ├─ GiftBoxes.update
       ├─ MagicParticles.update
       └─ Renderer.render
            ├─ 兼容模式: renderer.render(scene, camera) → 默认 framebuffer
            └─ 完整模式: EffectComposer → Bloom → OutputPass
```

设置变更路径：

```text
用户操作 [data-setting]
  → ControlPanel.handleControlInput
  → SettingsManager.set / patch
  → subscribe 回调 main.handleSettingsChanged
  → 更新真实 Three.js 对象
  → 220ms 后 localStorage 持久化
```

结构重建（树高/树冠/密度/层数）：

```text
SettingsManager 连续变化
  → main.pendingShapeChange = true
  → 110ms 防抖
  → tree.rebuildTree / numbers.setLayout / hearts.setLayout / camera.setSubjectHeight
  → TreeBranches 重建设防抖 in-flight 标志
```

---

## 4. 渲染模式

### 兼容模式（默认）

`body.dataset.renderMode = 'compatible'`，`body.safe-mode`。

- `Renderer.setDirectRendering(true)`，`pipeline = null`。
- 场景直接渲染到默认 framebuffer；没有 Bloom、OutputPass、HalfFloat 离屏目标。
- CSS 关闭全屏渐变/颗粒/隐藏层毛玻璃；面板打开时也不使用 backdrop-filter。
- 保留完整的几何、灯光、照片、粒子、动画、音频和交互。

引入原因：当前 Windows / Edge / NVIDIA 合成路径在完整后处理与透明混合层叠加时，可能偶发中央纯黑矩形闪烁。兼容模式是已验证的稳定路径，并成为默认。

### 完整效果模式（`?full=1` / `?safe=0`）

- `Renderer.attachScene` 创建 `EffectComposer`。
- HalfFloat RenderTarget + 质量 preset samples（4 / 2 / 0）。
- `RenderPass → UnrealBloomPass → OutputPass`。
- 面板打开时 `backdrop-filter` 生效。
- 在无合成问题的环境中效果更饱满，但仍需按最终性能门槛复测。

> **F3–F5 的重要约束：** 视觉升级不能以“只有完整模式才好看/可用”为理由删掉稳定模式；默认兼容路径必须继续可用。若升级引入 GSAP/IndexedDB/新增粒子，必须同时验证两条路径。

---

## 5. 参数系统

`WishSettings` 当前字段（`src/config.ts`）：

- 树：`treeHeight` 4–12、`crownRadius` 1.5–4、`density` 50–400、`layers` 4–12、`foliageColor`、`treeRotate`、`treeRotateSpeed`。
- 灯：`lightsOn`、`lightColor`、`lightCount` 40–400、`lightBrightness`、`lightFlashSpeed`、`lightMode`。
- 爱心：`heartsOn`、`heartCount` 120–1500、`heartColor`、`heartSize`、`heartSpeed`、`heartMode`。
- 照片：`photoRadius` 0.78–1.38、`photoSpeed` 0–1.8、`cardScale` 0.68–1.28、`showCaptions`、`photosPaused`。
- 环境：`snowOn`、`snowCount` 200–3200、`snowSpeed`、`starsOn`、`auroraOn`、`backgroundColor`、`ambientBrightness`。
- 浪漫：`text520` / `text1314`、`blessingTitle` / `blessingMessage` / `signature`、`giftMessage0..2`、`musicTrack`、`musicVolume`、`musicOn`。
- 画质：`quality`。

质量预设集中在 `QUALITY_PRESETS`：

| 档位 | DPR cap | 分辨率 scale | Bloom | 阴影 | MSAA | 雪 / 灯 / 爱心 / 星 |
|---|---|---:|---|---:|---:|---|
| Ultra | 2 | 1.0 | 0.36 / 0.84 | 2048 | 4 | 1800 / 220 / 600 / 1200 |
| Balanced | 1.5 | 1.0 | 0.30 / 0.88 | 1024 | 2 | 1300 / 180 / 500 / 920 |
| Performance | 1.15 | 0.82 | 0.24 / 0.92 | 512 | 0 | 720 / 110 / 300 / 540 |

参数集中在 `config.ts`，但 `index.html` 中也存在同名控件的初始展示值（HTML 初始值）。**后续升级应避免继续把关键视觉参数散落在 `index.html` / 业务逻辑中。**

---

## 6. 资源与生命周期

已确认存在的机制：

- `PhotoCard.dispose` 释放几何/材质/CanvasTexture（不含外部照片纹理，由 PhotoManager 统一管理）。
- `PhotoManager.dispose`：遍历 cards、dispose 纹理、revoke ObjectURL、清空 group。
- 替换/删除照片时 dispose 对应纹理并 revoke 对应 ObjectURL。
- `TreeBranches.clear` 不会 dispose 共享的雪材质/代理材质；最终 `dispose` 才释放。
- `DemoController.exit/dispose` 移除并 dispose 组装粒子的 geometry/material。
- `Renderer.dispose` dispose pipeline 与 WebGLRenderer。
- `main.dispose` 按顺序停止 animation，dispose 各场景模块、音乐、renderer；`beforeunload` 调用。
- `webglcontextlost` preventDefault；`webglcontextrestored` 重建后处理并重绘。
- 窗口 resize / fullscreenchange / visibilitychange 触发尺寸重算。

尚未具备：

- IndexedDB 大对象存储与版本迁移；
- 用户照片的资源配额/回收策略（当前会话级，不会长期累积）；
- 自动化 GPU 显存采样（F5 验收需补齐更完整的泄漏检测）；
- 长时 30 分钟自动化稳定性 gate（F0 只做了短时基线）。

---

## 7. 构建与交付链

```text
tsc --noEmit (类型检查)
  → Vite build (dist/assets/*.js + *.css)
  → build-single.mjs 读取 dist/index.html
  → 内联 CSS 和 JS
  → 写 Christmas-Wish/Christmas-Wish.html
  → 复制一份到 ../Christmas-Wish.html
```

当前单文件约 1.21 MB，无外部请求。完整效果模式仍使用打包在 JS 中的 Three.js addons；不请求 CDN。

---

## 8. 现有架构的优点

1. **单一渲染循环**：没有多个 RAF 或重复 Renderer，符合升级约束。
2. **参数集中**：`WishSettings` + `SettingsManager` + `config.ts` 已形成主配置总线。
3. **粒子以 Points/Shader 为主**：树灯、雪、星空、爱心、魔法粒子不会退化成大量独立 Mesh。
4. **照片生命周期明确**：上传/替换/删除都有纹理与 ObjectURL 释放路径。
5. **演示/浪漫与主循环解耦**：通过控制器和回调改变场景，而不是另起渲染循环。
6. **单文件交付**：离线可运行，便于直接送出。
7. **已有自动化验收资产**：smoke / raycast / qa2 / qa3 / mobile / singlefile / performance。

---

## 9. 技术债与升级阻塞点（F0 只记录）

| 风险 / 缺口 | 现状 | 对后续阶段的影响 |
|---|---|---|
| 无 GSAP | 动画全部手写/时间轴 controller | F3/F5 若要引入 GSAP，必须评估包体、Pause 语义、单一循环约束 |
| 无 IndexedDB | 设置 localStorage；照片不持久化 | F4 “照片记忆系统”若需跨会话，新增 IDB 层与资源回收 |
| 只有 45 秒演示 | `CINEMA_DURATION=45` | F5 要改为 60 秒并重新编排章节/音乐节奏；现有暂停/重播/退出必须保留 |
| 仅有 7 层树、220 灯 | 程序化树最多 12 层；灯最多 400 | F3 的 9 层 / 360 灯可在现有系统扩展，但必须增加视觉细节而不是改数字 |
| 没有双螺旋光带 | 当前仅灯串螺旋 | F3 新增几何/Shader；需要统一预算，避免新增多个 PointLight |
| 没有 48 颗爱心装饰球 | 当前 34 个多色挂饰 | F3 需新增 InstancedMesh 或合批 |
| 没有水晶爱心树顶 | 当前五角星 | F3 需替换/叠加，不能破坏星星点击与祝福功能 |
| 没有地面真实反射 | 雪地 + 接触阴影 | F3 若增加反射，需评估 render target 与性能降级 |
| 没有永久 1800 流动粒子场 | 雪 1800、演示 1150 组装粒子 | F3 需明确“流动粒子”与雪的预算关系 |
| 没有巨型实体 3D 爱心 | 爱心粒子可聚合 | F4 要新增几何/粒子系统，并保留聚合/爆发 |
| 520/1314 是网格+星屑 | 不是粒子文字 | F4 若要改为粒子文字，应保留现有 3D 文本作为高画质 fallback |
| 5 个礼物 vs 目标 3 个 | 现在 5 个，且现有功能必须保留 | F4 的需求冲突需用户确认：保留 5 个 / 只展示 3 个主礼物 / 新增三个专属礼物 |
| 照片轨道是相机相对侧弧 | 不是完整 360° 穿屏 | F4 “三层爱心轨道/照片记忆空间”需明确与现有侧弧的关系 |
| 默认兼容模式关闭 Bloom | 为修复合成层闪黑 | 后续新增 Bloom 必须继续提供稳定路径；不能删除兼容模式 |
| HTML 初始值和 config 重复 | 控件初始 value | 参数集中化要求后续可能需做一次配置单一来源整理 |
| 无 package-lock | 依赖使用精确版本 | 后续引入 GSAP 等依赖时锁文件策略需决定 |
| `node_modules` 是 junction | 当前开发机特有 | 新机器需 `npm install`；备份不含 node_modules |

---

## 10. 对后续阶段的架构建议（不执行）

1. F1 只做仓库/许可证研究，不把任何未确认授权的代码或素材带进 `feature/visual-upgrade`。
2. F2 五个视觉实验必须是**独立 Vite 页面/独立入口**，不得替换正式 `index.html`，也不得改变当前单文件构建。
3. F3 新增树体视觉时，优先扩展现有 `TreeBranches` / `TreeLights` 和 `QUALITY_PRESETS`，新参数进入 `config.ts`；避免在 UI 里散落魔数。
4. F4 的照片记忆/IndexedDB 必须设计版本升级、配额失败回退、删除回收；不能破坏“照片仅在本地处理”的承诺。
5. F5 的 60 秒演示应复用单一 `AnimationManager` 与现有 pause/restart/exit 语义；不能创建第二个渲染循环。
6. 性能门槛：默认兼容模式与 `?full=1` 都要测量；若新增功能只在完整模式工作，需要在报告中明确标注。

**F0 结论：当前架构适合在现有代码上增量升级，但需要先解决“默认兼容模式 / 完整 Bloom 模式”“5 个礼物 vs 3 个礼物”“45 秒 vs 60 秒”“无 GSAP/IndexedDB”四个显式决策点。**
