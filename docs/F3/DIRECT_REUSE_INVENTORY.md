# 五仓库逐模块直接复用清单

> 状态：**清单阶段，未修改正式代码。**  
> 本清单用于确认“哪些代码直接复制、哪些只抽取算法、哪些不能替换”；确认后才进入整合。  
> 授权依据：**五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。** 本清单不以缺少 LICENSE 文件或此前的“未核验”表述作为限制。

## 0. 署名与来源

| 仓库 | 作者/署名 | 提交 | 授权状态 |
| --- | --- | --- | --- |
| [Heart-Star](https://github.com/saklincodes/Heart-Star) | Saklin Ali | `9317aeb` | MIT；作者已授权 |
| [ChristmasTree](https://github.com/dkvkvk/ChristmasTree) | dkvkvk | `59b14c5` | 作者已授权；公开 README 声称 MIT |
| [Immersive-Photo-Gallery](https://github.com/DancingCircles/immersive-photo-gallery) | DancingCircles | `c862c70` | MIT；作者已授权 |
| [Christmas-Tree-Photos](https://github.com/dongkui555/christmas-tree) | dongkui555 | `b5f4870` | 作者已授权；公开 README 声称 MIT |
| [Interactive-Xmas-Tree](https://github.com/HairuFan/interactive-xmas-tree) | HairuFan | `be75d04` | MIT；作者已授权 |

直接复制代码时，在目标文件头保留：作者、仓库 URL、commit、许可/授权记录。

## 0.1 结论先行

| 结论 | 数量/对象 |
| --- | --- |
| 可直接复制的小型纯函数模块 | 8 组（Heart-Star 几何 3 个函数、Immersive 3 个纯工具文件、Interactive 2 个纹理/采样函数） |
| 需要抽取为 TypeScript 的算法 | 7 组（树粒子/星形采样/照片轨道等） |
| 只能参考、不能整类替换 | ChristmasTree 的树/场景/控制器、Immersive 的 React 场景、Christmas-Tree-Photos 的 R3F/MediaPipe 组件、Interactive 的全局单文件 |
| 可整树直接替换 F3 树体的仓库 | **0 个** |
| F3 现在采用什么 | 项目自有 `TreeBranches` + 本项目已验证的 9 层树体；参考仓库的点云树不能直接替换而不破坏现有树体质量与交互 |

**为什么整树不能直接替换：**

- `ChristmasTree` 是 Vue + Three 0.171 + GSAP 的粒子圣诞树，树体本质是 Points 螺旋/锥形粒子；直接替换会让当前 9 层针叶树变成点云树。
- `Interactive-Xmas-Tree` 是 Three 0.159 CDN + 单文件全局脚本 + MediaPipe，树体也是 Points 粒子；没有 ES module 导出，不能直接进正式 Vite/TS 构建。
- `Christmas-Tree-Photos` 的树是 React Three Fiber 组件，依赖 R3F/drei/maath/MediaPipe；正式项目没有这些生产依赖。
- `Heart-Star` 是爱心/星形粒子场，不是圣诞树。
- `Immersive-Photo-Gallery` 是 React/Next 风格的照片画廊，不是树。

因此，“直接复用”应落在**可独立的函数/着色器/算法**，而不是整类组件替换。

---

## 1. Heart-Star（MIT，9317aeb）

仓库：`github-references/Heart-Star/`

| 文件/模块 | 导出/函数 | 能否直接复制 | 建议落点/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `geometry.js` | `sampleStar(t)` | **可以，低改** | 新 `src/particles/heartMath.ts` 或 `src/shared/heartGeometry.ts`，加 TS 类型 | 纯数学，依赖 `THREE.Vector3`；可直接保留算法 |
| `geometry.js` | `sampleHeart(t)` | **可以，低改** | 同上；可作为心形粒子/装饰几何的候选源 | 与现有 `TreeStar` 的 Bezier 心形是不同实现；替换前需 A/B，不直接覆盖 F3 视觉 |
| `geometry.js` | `jitter(point,strength)` | **可以，低改** | 直接搬入同文件，改为不依赖全局随机源（可注入 rng） | 轻量 |
| `particles.js` | `ParticleField` 类 | **不建议整套复制** | 只抽取 `buildGeometry` 的星/心双 home、`applyTheme` 的调色、`createSpriteTexture` | 自带 RAF/clock/主题循环；正式项目已有 `HeartParticles` + `AnimationManager`，整类会重复循环 |
| `particles.js` | `createSpriteTexture()` | **可以直接复制** | `src/particles/textures` 或现有 HeartParticles 的纹理函数 | 64×64 Canvas 五角星 spark，低耦合 |
| `particles.js` | `retint()`、`refreshColorAttributes()` | **抽取** | 复用“主题色 + 每粒随机亮度”的策略到现有 HeartParticles | 不直接接类 |
| `config.js` | `THEMES`、`MOTION` | **可以直接借鉴数值/数组** | 如果要新增粒子主题，复制 palette/节奏常量 | 不是新功能所必需 |
| `main.js` | 初始化/OrbitControls/Bloom/按钮 | **不直接使用** | 正式项目有自己的 Renderer/CameraManager/UI | 会引入第二套 renderer/loop |
| `style.css`、`index.html` | UI/页面 | 不适用 | 不复制 | 正式 UI 已存在 |

**Heart-Star 的整合建议：**

1. 先直接复制 `sampleHeart` / `sampleStar` / `jitter` 到新纯函数文件，保留 MIT 署名；
2. 用 A/B 方式替换现有心形粒子或 48 爱心/水晶心的形状候选，不立即覆盖 F3 已验证外观；
3. `ParticleField` 不整类导入，避免第二套动画循环。

---

## 2. ChristmasTree（59b14c5；作者已授权）

仓库：`github-references/ChristmasTree/`  
技术栈：Vue 3 + Three 0.171 + GSAP + lil-gui + Vite。

| 文件/模块 | 主要内容 | 能否直接复制 | 建议落点/改法 | 风险 |
| --- | --- | --- | --- | --- |
| `src/three/christmasTree.js` | `ChristmasTree` 类：`createTree()` 粒子螺旋+锥体、`loadStar()` GLB、`createStarParticles()`、`createGround()`、`update()` | **不能整类替换**；可抽取 `createTree()` 的螺旋/噪声分布、星周围粒子、falling star 逻辑 | 用作 `StarParticles`/MagicParticles 的算法候选；不替换 9 层树 | Three 0.171；中文参数键；Vue 状态；GLB/DRACO；自有 loop |
| `src/three/decorations.js` | `TreeDecorations`：`createBell()`、`createBow()`、`createDecorations()`、`update()` | **可以抽取几何** | 铃铛/蝴蝶结的 `BufferGeometry` 组合可搬进正式装饰模块；但 F3 目标是 48 爱心，不增加第二套装饰 | 12 个独立 Mesh，draw call 多；材质风格需重做 |
| `src/three/giftBoxes.js` | `GiftBoxes`：`createGiftBox()` + 礼物配置 | **不直接替换** | 只可抽取礼盒 bow/ribbon 几何细节到现有 `GiftBoxes.ts`；不得改礼物数量（仍 5 个） | 现有礼盒已有交互/开盖/阴影，整体替换会破坏 |
| `src/three/snow.js` | `Snow` 类：CPU 雪花位置更新 | **不直接使用** | 正式 `SnowParticles` 已存在；最多参考边界回绕/漂移 | CPU 每帧 2000 粒循环，不适合作为新实现 |
| `src/three/balloons.js` | `Balloons`：气球 + 绳子 | **不适用** | F3 不需要气球；不引入 | 目标视觉不匹配 |
| `src/three/musicalElements.js` | 音符/爱心/星形飘出 | **只参考** | 可参考 3D 爱心/星形的几何组合；不整类接入 | 与现有 MagicParticles/HeartParticles 重复 |
| `src/three/controls.js` | lil-gui 分页面板 | **不能替换** | 正式 ControlPanel 已有完整面板；不引入 lil-gui | 新依赖 + 第二套控件 |
| `src/three/scene.js` | `Scene` 类：Scene/Camera/OrbitControls/环境/点光 | **不能替换** | 正式 SceneManager/CameraManager 已有完整体系 | 第二套 scene/camera/renderer 冲突 |
| `src/three/renderer.js` | `Renderer` 类：WebGLRenderer + EffectComposer + Bloom | **不能替换** | 正式 `Renderer.ts` 已有兼容/完整 Bloom 和画质切换 | 重复 WebGLRenderer 是硬冲突 |
| `src/components/ChristmasTree.vue` | 场景装配/RAF/resize | **不能复制** | 只读作生命周期参考 | Vue/TS 不兼容 |
| `src/components/MusicPlayer.vue`、`App.vue` | 音乐/页面 | 不适用 | 正式 MusicEngine 已存在 | 音频资产/许可独立 |
| `src/shader/particle/*` | 粒子点精灵 GLSL | **可移植** | 抽取为正式 ShaderMaterial 的片元/顶点（改成项目 uniform 命名） | 依赖 `?raw`、`scale` attribute、Three 0.171 语法 |
| `src/shader/starParticle/*`、`fallingStar/*`、`star/*` | 星/流星/星形 shader | **可移植** | 作为未来 StarParticles/MagicParticles shader 候选 | 与现有 TreeLights/TreeStar 重复，需 A/B |
| `public/model/star.glb`、`public/music/*`、`public/draco/*` | 第三方/模型/音频资产 | 不自动复用 | F3 不使用；若未来使用，单独记录资产来源/许可 | 资产许可是另一层，不在代码授权内 |

**ChristmasTree 的整合建议：**

- 不替换正式 Scene/Renderer/Tree 类；
- 只抽取 **树粒子分布、装饰几何、点精灵 shader** 作为后续算法/视觉补强；
- 不引入 GSAP/Vue/lil-gui/Three 0.171。

---

## 3. Immersive-Photo-Gallery（MIT，c862c70）

仓库：`github-references/Immersive-Photo-Gallery/`  
技术栈：React 19/Next 风格 + Three 0.180 + GSAP + postprocessing；不是树项目。

| 文件/模块 | 导出/内容 | 能否直接复制 | 建议落点/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `shared/geometry/gallery-projection.ts` | `cameraDistanceForAspect`、`distortionForViewport`、`projectGalleryUv`、常量 | **可以，直接复制为 TS** | 新 `src/photos/galleryProjection.ts`，保留纯函数 | 低耦合，适合未来照片墙/镜头 |
| `features/gallery/scene/virtual-grid.ts` | `virtualCellForOffset`、`catalogIndexForCell`、`catalogItemForIndex`、`shouldPrefetchCatalog`、`createBindingGeneration` | **可以，直接复制为 TS** | 新 `src/photos/virtualGrid.ts`；未来照片网格/分页 | 纯函数，无 React/Three 依赖 |
| `shared/animation/repeating-transition.ts` | `computeStaggerDelays`、`generateMotionPath`、`getClipPathsForDirection`、`getDetailImageSide` | **可以，直接复制为 TS** | 新 `src/photos/transitions.ts`；未来照片详情过渡 | DOM Rect 纯函数，但正式目前不用 GSAP 时间线 |
| `features/gallery/detail/detail-state.ts` | gallery detail reducer/geometry 辅助 | **可抽取** | 照片详情状态模型可参考；不要整文件替换正式 PhotoManager | 依赖该仓库类型/GSAP 流程 |
| `features/gallery/catalog/card-view-model.ts`、`catalog-state.ts`、`use-catalog.ts` | 照片卡片/目录状态 | **只参考** | 可参考虚拟目录、占位图绑定 | React hooks 不适用于正式 Vanilla/TS |
| `features/gallery/scene/gallery-scene.tsx` | 固定卡片池、lens shader、虚拟网格、raycast | **不能整文件复制** | 只抽取 lens GLSL/相机距离/虚拟网格；不引入 React 场景 | 3000+ 行组件，React 生命周期 |
| `features/gallery/scene/cross-origin-image.ts` | 跨域图片加载 | **可复制** | 若未来需要外链图片，抽取纯工具 | F3 不使用外链图片 |
| `features/gallery/gallery-client.tsx` | GSAP/flight 转场 | **只参考** | 参考“卡片→详情”的 DOM 转场 | GSAP 不允许新增生产依赖；正式已有 CSS/相机体系 |
| `features/daily-edit/xylophone/reference/**` | 第三方 xylophone/FBO/流体 shader | **不整体复用** | 单独资产/第三方许可；本阶段不使用 | 不属于五个仓库核心代码，且是嵌套第三方 |
| `public/art/*`、`public/audio/*` | 图片/音乐资产 | 不自动复用 | F3 不使用；如未来使用需单独记录 | 资产许可独立 |

**Immersive 的整合建议：**

- 这三个纯函数文件可作为 **F4/照片系统** 的直接复制模块；F3 不修改照片系统，所以不在本阶段落地。
- 不引入 React/Next/GSAP/Three 0.180。

---

## 4. Christmas-Tree-Photos（b5f4870；作者已授权）

仓库：`github-references/Christmas-Tree-Photos/`  
技术栈：React 18 + R3F/drei + Three 0.169 + MediaPipe + IndexedDB。

| 模块/符号 | 内容 | 能否直接复制 | 建议落点/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `src/App.tsx` · `openPhotoDb` | IndexedDB 打开 | **可抽取为 TS** | 未来 `src/photos/photoDb.ts`；F3 不修改照片存储 | 纯 Promise/IDB，低耦合 |
| `getPhotoMeta` / `setPhotoMeta` | topId/order 元数据 | **可抽取** | 同上 | 需要 schema 决策，不能擅自迁移正式照片 |
| `getAllStoredPhotos` / `putStoredPhoto` / `deleteStoredPhoto` / `clearAllStoredPhotos` | 照片 Blob CRUD | **可抽取** | 未来照片管理；正式已有 PhotoManager 内存/上传机制，不能直接换 | 会改变照片存储机制，F3 明确禁止 |
| `CONFIG`、`FoliageMaterial` | 树尺寸/着色器 | **只参考** | 参考配色/树包络；不替换 F3 树 | R3F `shaderMaterial` |
| `getTreePosition()` | 树冠包络随机位置 | **可以抽取算法** | 可用于未来装饰/照片定位；“t = random” 与正式分布不同 | 纯函数，简单 |
| `Foliage` | 粒子树冠 + `useFrame` | **不能直接复制** | 只参考粒子堆积/状态 CHAOS/FORMED | R3F 组件，TSX |
| `Snow` | 雪粒子 | **只参考** | 正式 SnowParticles 已有 | R3F 组件 |
| `PhotoOrnaments` | 双面 Polaroid、照片分布、拾取/聚焦 | **只参考/抽取几何** | 双面卡片、照片分布、聚焦可参考；正式已有 PhotoCard/PhotoOrbit | R3F、useTexture、交互 ref |
| `ChristmasElements`、`FairyLights` | 装饰物/灯 | **只参考** | 不替换正式 360 灯/48 爱心 | R3F |
| `TopStar` | 星形/照片树顶 | **只参考** | F3 树顶已是水晶爱心，不替换 | R3F |
| `Experience` | Canvas/环境/Bloom | **不能复制** | 正式 SceneManager/Renderer 已有 | R3F + postprocessing |
| `GestureController` | MediaPipe 手势 | **不接入** | 不需要；会引入摄像头/MediaPipe 模型 | 安全/隐私/性能 |
| `GrandTreeApp` | 照片管理 UI/DB | **只参考** | 当前正式 UI 不可替换 | React/TSX |
| `public/mediapipe/**` | 手势模型/WASM | 不使用 | 不引入 | 第三方资产 |

**Christmas-Tree-Photos 的整合建议：**

- 最有价值的直接复用是 **IndexedDB helper 逻辑**；但 F3 明确禁止修改照片存储，所以只在后续 F4 评估时使用。
- 当前树体/照片视觉不直接替换。

---

## 5. Interactive-Xmas-Tree（be75d04；作者已授权）

仓库：`github-references/Interactive-Xmas-Tree/`  
技术栈：Three 0.159 CDN 全局脚本 + MediaPipe + 单文件 `index.html`。

| 模块/函数 | 内容 | 能否直接复制 | 建议落点/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `CONFIG`（index.html 内） | 树粒子/星/地面参数 | **可直接复制数值** | 作为粒子星/树背景的参数参考 | 全局常量，需改成 TS config |
| `getGlowTexture()` | Canvas 径向 glow 纹理 | **可直接复制** | `src/particles/textures` 或现有 texture 工具 | 低耦合 |
| `initThree()`、`addLights()` | 全局 scene/camera/renderer/lights | **不能整段复制** | 正式 SceneManager/Renderer 已有 | 全局变量、第二套 renderer |
| `buildTreeCore()` | 地面圆盘 | **可抽取** | 树底光晕/圆盘的候选；F3 已有展示台 | 简单 Mesh |
| `buildTrunkParticles()` | 树干粒子 | **只参考** | 正式树干是实体 Mesh，不替换 | 粒子树干 |
| `buildTreeParticles()` | 粒子树锥体/装饰分布 | **抽取算法** | 可用于未来星空/魔法粒子；不替换 9 层树 | 单文件全局脚本 |
| `createStarSampler(sizePx)` | Canvas alpha 实心五角星采样 | **可直接复制** | 新 `src/particles/starSampler.ts`；用于未来星形粒子 | 纯函数，低耦合，强候选 |
| `buildStarParticles()` | 树顶星粒子 | **只参考** | 与 F3 水晶树顶不同，不替换 | 1500 粒子 |
| `initGesture()` / MediaPipe 调用 | 手势 | **不接入** | 不引入摄像头/MediaPipe | 生产依赖/隐私 |
| `animate()` / `onWindowResize()` | 全局 RAF/尺寸 | **不能复制** | 正式 AnimationManager | 第二套循环 |
| `texture/*.png` | 云/叶/雪/星贴图 | 不自动复用 | F3 不引入；如需要单独记录 | 资产 |

**Interactive 的整合建议：**

- 直接复用优先级最高的是 **`createStarSampler`** 和 **`getGlowTexture`**；
- 粒子树算法只作为未来 Magic/Star 粒子候选，不替换正式树。

---

## 6. 汇总：直接复用 vs 抽取 vs 不替换

### A. 可直接复制（低改）

| # | 来源 | 目标正式模块（建议） | 备注 |
| --- | --- | --- | --- |
| A1 | Heart-Star `geometry.js` `sampleStar` | `src/particles/heartMath.ts` | 纯数学 + Three Vector3 |
| A2 | Heart-Star `geometry.js` `sampleHeart` | 同上 | 与现有 Bezier 心形做 A/B |
| A3 | Heart-Star `geometry.js` `jitter` | 同上 | 注入 rng |
| A4 | Immersive `gallery-projection.ts` | `src/photos/galleryProjection.ts` | 纯函数，未来照片 |
| A5 | Immersive `virtual-grid.ts` | `src/photos/virtualGrid.ts` | 纯函数，未来照片 |
| A6 | Immersive `repeating-transition.ts` | `src/photos/transitions.ts` | 纯函数，未来照片 |
| A7 | Interactive `createStarSampler` | `src/particles/starSampler.ts` | 纯函数，未来星形粒子 |
| A8 | Interactive `getGlowTexture` | `src/particles/textures/glowTexture.ts` | 低耦合 Canvas 纹理 |

### B. 抽取/移植（中改）

| # | 来源 | 内容 | 目标 |
| --- | --- | --- | --- |
| B1 | ChristmasTree `christmasTree.js` | 螺旋/锥形粒子分布、星周围粒子、falling star | `StarParticles`/`MagicParticles` 候选，不替换树 |
| B2 | ChristmasTree `decorations.js` | 铃铛/蝴蝶结几何 | 未来装饰几何库 |
| B3 | ChristmasTree shaders | 粒子/星/流星 GLSL | 未来粒子 shader |
| B4 | Christmas-Tree-Photos `App.tsx` | IndexedDB helpers | 未来照片持久化（不是 F3） |
| B5 | Christmas-Tree-Photos `getTreePosition` / PhotoOrnaments | 树冠包络、双面照片 | 未来装饰/照片 |
| B6 | Interactive `buildTreeParticles` / `buildStarParticles` | 粒子树/树顶星分布 | 未来粒子效果 |
| B7 | Heart-Star `ParticleField.retint` / theme constants | 调色与 shimmer | 现有 HeartParticles 主题增强 |

### C. 只参考/不能替换

- ChristmasTree：`Scene`、`Renderer`、`Controls`、`ChristmasTree` 类整体、Vue 组件。
- Immersive：`Scene`/`GalleryClient` 等 React/GSAP 组件；仅纯函数与 shader 算法可抽。
- Christmas-Tree-Photos：`Foliage`/`Experience`/`GestureController`/`GrandTreeApp` 等 R3F/MediaPipe 组件。
- Interactive：`initThree`/`addLights`/`animate` 等全局装配代码；只抽函数。
- 所有仓库的整树/整场景替换：**0 个**推荐。

### D. 明确不接入

- Vue / React / R3F / Next / GSAP / lil-gui / MediaPipe / 新依赖；
- 任何 `public/music`、`star.glb`、`mediapipe` 模型、图片纹理，F3 不自动复用；
- 任何第二套 WebGLRenderer、RAF loop、ControlPanel；
- 礼物数量/照片存储/45 秒演示机制。

---

## 7. 与 F3 当前成果的关系

- 当前 F3 的 9 层树、双螺旋、360 灯、48 爱心、水晶树顶、展示台 **已经使用项目自有实现**。
- 本清单不要求把整棵树换成任何参考仓库的粒子树；那会降低 F3 的树体质量并破坏交互。
- 若确认要“能直接复用的先直接复用”，建议第一批只做 A1–A8：
  - 纯函数、独立文件、可单测、不会改动现有树体结构；
  - 照片相关 A4–A6 在 F4 前不接入，避免修改照片系统；
  - A7/A8 可作为现有粒子系统的纹理/采样增强，需 A/B 截图。
- 第二批 B 类作为视觉增强候选，必须逐项确认，不能一次性替换。

## 8. 待你确认

请确认以下策略：

1. **先整合 A1–A3（Heart-Star 纯几何）到新共享模块，并用于心形粒子/装饰的 A/B，不改 F3 树体主结构？**
2. **A7–A8（星形采样/glow 纹理）是否现在接入现有 StarParticles？**
3. **A4–A6 是否留到 F4 照片阶段，而不是在 F3 改照片系统？**
4. **B 类中 ChristmasTree shader / Christmas-Tree-Photos IndexedDB 是否列入下一阶段？**

在得到确认前，本清单不修改正式代码。
