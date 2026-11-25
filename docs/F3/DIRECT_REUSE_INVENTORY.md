# F3 · 五仓库逐模块直接复用清单

> 状态：**清单与方案阶段，未修改正式代码。**  
> 授权依据：**五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者署名与来源。** 本清单不以缺少 LICENSE 文件或此前的“未核验”表述限制复用；所有取舍仅基于技术兼容性、F3 视觉目标和回归风险。

## 0. 署名与来源

| 仓库 | 作者/署名 | 固定提交 | 授权与公开许可档案 |
| --- | --- | --- | --- |
| [Heart-Star](https://github.com/saklincodes/Heart-Star) | Saklin Ali | `9317aeb` | 作者已授权；公开 MIT |
| [ChristmasTree](https://github.com/dkvkvk/ChristmasTree) | dkvkvk | `59b14c5` | 作者已授权；公开 README 声称 MIT |
| [Immersive-Photo-Gallery](https://github.com/DancingCircles/immersive-photo-gallery) | DancingCircles | `c862c70` | 作者已授权；公开 MIT |
| [Christmas-Tree-Photos](https://github.com/dongkui555/christmas-tree) | dongkui555 | `b5f4870` | 作者已授权；公开 README 声称 MIT |
| [Interactive-Xmas-Tree](https://github.com/HairuFan/interactive-xmas-tree) | HairuFan | `be75d04` | 作者已授权；公开 MIT License 文件 |

直接复制代码时，在目标文件头保留以下信息：

```text
/*
 * Adapted from <author>, <repository>
 * Source commit: <commit>
 * Original file: <path>
 * Authorized for this project; attribution retained.
 * See docs/F2/SOURCE_REUSE_REPORT.md and docs/F3/DIRECT_REUSE_INVENTORY.md.
 */
```

## 1. 复用判定口径

| 判定 | 含义 |
| --- | --- |
| **直接复制** | 文件/函数可以基本原样进入正式项目，只需要补 TS 类型、路径和署名 |
| **抽取适配** | 算法/几何/着色器可用，但必须改 Three 版本、模块系统、类型、生命周期或材质 |
| **仅参考** | 只参考结构、数值或视觉思路，不直接复制代码 |
| **不替换** | 与正式项目的 Renderer/Scene/循环/交互冲突，或会破坏 F3 已验收树体 |
| **F4 延期** | 属于照片/画廊功能，F3 不接入 |

## 2. 数量口径

| 指标 | 数量 |
| --- | ---: |
| 文件级直接复制候选 | **6 个文件** |
| 直接复制候选组（A1–A9） | **9 组** |
| 直接复制可调用函数/方法 | **18 个** |
| 抽取/移植候选（B1–B7） | **7 组** |
| 可整树替换 F3 的参考仓库 | **0 个** |

A1–A9 的“组”按复制单元划分：Heart-Star 三个几何函数各算 A1–A3；Heart-Star 纹理函数 A4；Interactive 采样/发光函数 A5/A6（同在 `index.html`）；Immersive 三个 TS 文件 A7–A9。文件级统计为 6 个来源文件：Heart-Star `geometry.js`、Heart-Star `particles.js`、Interactive `index.html`、Immersive 的三个 TS 文件。

## 3. F3 已直接复用的项目内部源码

这些不是参考仓库，而是正式项目自己的既有代码；F3 直接复用并扩展了它们：

| 正式文件 | 复用的能力 | F3 的修改 |
| --- | --- | --- |
| `src/objects/TreeBranches.ts` | 针叶 InstancedMesh、层核、枝臂、树皮、雪堆、树冠包络、pick proxy | 9 层、9.5 高、3.0 半径、固定树干 1.0/0.22、精确三色、树体亮度、移除旧 34 球形 bauble |
| `src/objects/TreeLights.ts` | 单一 Points 灯点 shader、颜色/闪烁/亮度 | 360 颗、162/90/54/54 四色配额、高度波浪、呼吸、depthTest 调整 |
| `src/objects/TreeStar.ts` | 树顶 pick 接口、star blessing、sparkles/light 结构 | 星星 → 0.95×0.85×0.22 的 3D 切面水晶爱心，保留 pick 与许愿 |
| `src/objects/ChristmasTree.ts` | 树体 group、旋转、rebuild、灯光 API、生命周期 | 接入双螺旋、48 爱心、水晶心、亮度和开关 |
| `src/core/SceneManager.ts` | 雪地、接触阴影、环境光、远景、环境反射 | 树底石台/雪盖/金环/展示环、模拟反射、扩大树影 |
| `src/core/LightEffect.ts` | 月光、暖光、冷补光、地面光 | 适配 9.5m 树 |
| `src/core/CameraManager.ts` | OrbitControls、home framing、镜头 | 根据 9.5m 树和树顶高度调整取景 |
| `src/ui/ControlPanel.ts`、`src/ui/SettingsManager.ts` | 参数绑定与 localStorage | 新增 14 个树体控件，全部接入真实场景 |
| `src/core/AnimationManager.ts` | 单一 RAF 循环 | 保持单循环，无第二套 renderer/loop |

## 4. Heart-Star（MIT，9317aeb）

仓库路径：`github-references/Heart-Star/`  
技术栈：Three r162 ES module、无构建、`main.js` 自带 RAF/Theme/Bloom。

| 文件/模块 | 导出/函数 | 判定 | 目标正式模块/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `geometry.js` | `sampleStar(t)` | **直接复制（A2）** | `src/objects/reuse/heartGeometry.ts`，补 TS 类型 | 纯数学；可服务未来星形粒子，不直接影响 F3 树体 |
| `geometry.js` | `sampleHeart(t)` | **直接复制（A1）** | 同上；供 48 爱心/水晶心轮廓 A/B | 需归一化到目标宽高；不直接覆盖当前视觉 |
| `geometry.js` | `jitter(point,strength)` | **直接复制（A3）** | 同上；改为注入 rng | 小工具，避免全局随机 |
| `particles.js` | `ParticleField` | **不整套复制** | 只抽取 `buildGeometry` 的星/心双 home、`applyTheme` 调色、`createSpriteTexture` | 自带 RAF/clock/主题循环，会与 AnimationManager 冲突 |
| `particles.js` | `createSpriteTexture()` | **直接复制（A4）** | `src/objects/reuse/textures.ts` → `createSparkTexture()` | 64×64 Canvas 五角星 spark；只替换纹理时无 draw call 变化 |
| `particles.js` | `retint()` / `refreshColorAttributes()` | **抽取适配（B7）** | 复用“主题色 + 每粒随机亮度”到现有 HeartParticles | 不直接接类 |
| `config.js` | `THEMES`、`MOTION` | **仅参考/可选数值** | 若未来新增粒子主题再复制常量 | 非 F3 必需 |
| `main.js` | 初始化/OrbitControls/Bloom/按钮 | **不替换** | 正式项目已有 Renderer/CameraManager/UI | 会引入第二套 renderer/loop |
| `style.css`、`index.html` | 页面/UI | **不使用** | — | 正式 UI 已存在 |

**Heart-Star 结论：** A1–A4 是干净的直接复制候选；A1–A3 是第一批核心，A4 纹理只在 A/B 明确更好时接入。

## 5. ChristmasTree（59b14c5；作者已授权）

仓库路径：`github-references/ChristmasTree/`  
技术栈：Vue 3 + Three 0.171 + GSAP + lil-gui + Vite；树体是 Points 粒子。

| 文件/模块 | 主要内容 | 判定 | 目标正式模块/改法 | 风险 |
| --- | --- | --- | --- | --- |
| `src/three/christmasTree.js` | `ChristmasTree`：`createTree()` 螺旋/锥形粒子、`loadStar()` GLB、`createStarParticles()`、`createGround()`、falling star、`update()` | **抽取适配（B1）** | 只作为 `StarParticles`/`MagicParticles` 的算法候选 | Three 0.171、中文参数键、GLB/DRACO、Vue 生命周期、自有 loop |
| `src/three/decorations.js` | `TreeDecorations`：`createBell()`、`createBow()`、`createDecorations()`、`update()` | **抽取适配（B2）** | 几何组合可作为未来装饰库；不替换 48 爱心 | 12 个独立 Mesh，draw call 高；风格不匹配 |
| `src/three/giftBoxes.js` | `GiftBoxes`：`createGiftBox()` + 配置 | **不替换；可抽细节** | 只可参考 bow/ribbon 几何；保持 5 个礼物与交互 | 替换会破坏开盖、阴影、计数 |
| `src/three/snow.js` | CPU 雪花 2000 粒 | **不直接使用** | 正式 SnowParticles 已存在 | CPU 每帧循环；无增益 |
| `src/three/balloons.js` | 气球 + 绳子 | **不适用** | 不引入 | 与 F3 目标不符 |
| `src/three/musicalElements.js` | 音符/爱心/星形飘出；`createHeart()` | **抽取适配（B2/B7）** | 3D 爱心/星形几何可作 A/B 备选；不整类接入 | 与现有 Magic/Heart 粒子重复 |
| `src/three/controls.js` | lil-gui 分页面板 | **不替换** | 保留正式 ControlPanel | 新依赖 + 第二套控件 |
| `src/three/scene.js` | Scene/Camera/OrbitControls/灯 | **不替换** | 正式 SceneManager/CameraManager | 第二套 scene/camera |
| `src/three/renderer.js` | WebGLRenderer + Bloom composer | **不替换** | 正式 Renderer.ts | 重复 WebGLRenderer 是硬冲突 |
| `src/components/ChristmasTree.vue` | 场景装配/RAF/resize | **仅参考** | 生命周期参考 | Vue/TS 不兼容 |
| `src/components/MusicPlayer.vue`、`App.vue` | 音乐/页面 | **不使用** | 正式 MusicEngine | 音频资产/机制不同 |
| `src/shader/particle/*` | 粒子点精灵 GLSL | **抽取适配（B3）** | 未来 TreeLights/StarParticles shader A/B | `?raw`、`scale` attribute、0.171 语法 |
| `src/shader/starParticle/*`、`fallingStar/*`、`star/*` | 星/流星/星形 shader | **抽取适配（B3）** | 未来粒子效果 | 与现有实现重叠 |
| `public/model/star.glb`、`public/music/*`、`public/draco/*` | 模型/音乐/DRACO 资产 | **不接入** | 不使用参考资产 | 资产授权与代码授权分开记录 |

**ChristmasTree 结论：** 不替换 Scene/Renderer/Controls/Tree；只抽 B1/B2/B3，且优先作为未来效果候选。

## 6. Immersive-Photo-Gallery（MIT，c862c70）

仓库路径：`github-references/Immersive-Photo-Gallery/`  
技术栈：React 19/Next 风格 + Three 0.180 + GSAP + postprocessing；不是树项目。

| 文件/模块 | 导出/内容 | 判定 | 目标正式模块/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `shared/geometry/gallery-projection.ts` | `cameraDistanceForAspect`、`distortionForViewport`、`projectGalleryUv` + 常量 | **直接复制（A7）** | `src/photos/reuse/galleryProjection.ts` | 纯函数；F4 照片阶段使用 |
| `features/gallery/scene/virtual-grid.ts` | `virtualCellForOffset`、`catalogIndexForCell`、`catalogItemForIndex`、`shouldPrefetchCatalog`、`createBindingGeneration` | **直接复制（A8）** | `src/photos/reuse/virtualGrid.ts` | 纯函数；F4 使用 |
| `shared/animation/repeating-transition.ts` | `computeStaggerDelays`、`generateMotionPath`、`getClipPathsForDirection`、`getDetailImageSide` | **直接复制（A9）** | `src/photos/reuse/transitions.ts` | DOM Rect 纯函数；F4 使用 |
| `features/gallery/detail/detail-state.ts` | 照片详情 reducer/几何辅助 | **抽取适配（B5）** | 参考状态模型 | 依赖仓库类型/GSAP 流程 |
| `features/gallery/catalog/*` | 卡片/目录状态 | **仅参考** | — | React hooks 不适用 |
| `features/gallery/scene/gallery-scene.tsx` | 固定卡片池、lens shader、虚拟网格、raycast | **不能整文件复制** | 仅抽 lens GLSL/相机距离 | React 生命周期、3000+ 行 |
| `features/gallery/gallery-client.tsx` | GSAP flight 转场 | **仅参考** | — | 不引入 GSAP |
| `features/daily-edit/xylophone/reference/**` | 第三方 xylophone/FBO/流体 shader | **不整体复用** | 不作为本阶段代码源 | 它是嵌套第三方参考，不是本仓库作者的主功能；另行处理 |
| `public/art/*`、`public/audio/*` | 图片/音频资产 | **不接入** | — | F3 不使用 |

**Immersive 结论：** A7–A9 可以原样复制为 TS 纯函数，但归属 F4 照片阶段；F3 不改 PhotoManager/照片存储。

## 7. Christmas-Tree-Photos（b5f4870；作者已授权）

仓库路径：`github-references/Christmas-Tree-Photos/`  
技术栈：React 18 + R3F/drei + Three 0.169 + MediaPipe + IndexedDB；主体是单文件 `App.tsx`。

| 模块/符号 | 内容 | 判定 | 目标正式模块/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `src/App.tsx` · `openPhotoDb` | IndexedDB 打开 | **抽取适配（B4）** | 未来 `src/photos/reuse/photoDb.ts` | F3 不改照片存储 |
| `getPhotoMeta` / `setPhotoMeta` | topId/order 元数据 | **抽取适配（B4）** | 同上 | 需 schema 决策 |
| `getAllStoredPhotos` / `putStoredPhoto` / `deleteStoredPhoto` / `clearAllStoredPhotos` | Blob CRUD | **抽取适配（B4）** | 未来照片持久化 | 不能直接替换现有 PhotoManager |
| `CONFIG`、`FoliageMaterial` | 树尺寸/着色器 | **仅参考** | — | R3F `shaderMaterial` |
| `getTreePosition()` | 树冠包络随机位置 | **抽取算法（B5）** | 未来装饰/照片定位 | 纯函数，随机分布不同 |
| `Foliage` | 粒子树冠 + `useFrame` | **不直接复制** | 仅参考 CHAOS/FORMED | R3F 组件 |
| `Snow` | 雪粒子 | **仅参考** | 正式 SnowParticles 已有 | R3F |
| `PhotoOrnaments` | 双面 Polaroid、照片分布、聚焦 | **抽取几何（B5）** | 未来 PhotoCard/PhotoOrbit | R3F/useTexture/交互 ref |
| `ChristmasElements`、`FairyLights` | 装饰/灯 | **仅参考** | 不替换 360 灯/48 爱心 | R3F |
| `TopStar` | 星形/照片树顶 | **仅参考** | F3 水晶心已替代 | R3F |
| `Experience` | Canvas/环境/Bloom | **不复制** | 正式 SceneManager/Renderer | R3F + postprocessing |
| `GestureController` | MediaPipe 手势 | **不接入** | — | 摄像头/依赖/性能 |
| `GrandTreeApp` | 照片管理 UI/DB | **仅参考** | — | React/TSX |
| `public/mediapipe/**` | 手势模型/WASM | **不使用** | — | 第三方资产 |

**Christmas-Tree-Photos 结论：** 只有 B4（IndexedDB）和 B5（树冠/照片几何）值得后续抽取；F3 不接入照片系统。

## 8. Interactive-Xmas-Tree（be75d04；作者已授权）

仓库路径：`github-references/Interactive-Xmas-Tree/`  
技术栈：Three 0.159 CDN + 全局 `index.html` + MediaPipe。

| 模块/函数 | 内容 | 判定 | 目标正式模块/改法 | 备注 |
| --- | --- | --- | --- | --- |
| `CONFIG` | 树/星/地面参数 | **仅参考** | 参数数值参考 | 全局常量 |
| `getGlowTexture()` | Canvas 径向 glow | **直接复制（A6）** | `src/objects/reuse/textures.ts` → `createGlowTexture()` | 低耦合 |
| `initThree()` / `addLights()` | 全局 scene/camera/renderer/lights | **不替换** | 正式 SceneManager/Renderer | 第二套 renderer |
| `buildTreeCore()` | CircleGeometry 地面 | **抽取适配（B6）** | 可作为底座圆盘参考 | F3 已有更完整展示台 |
| `buildTrunkParticles()` | 粒子树干 | **仅参考** | 正式树干是实体 Mesh | 不替换 |
| `buildTreeParticles()` | 粒子树分布/装饰 | **抽取适配（B6）** | 未来 StarParticles/MagicParticles | 不替换 9 层树 |
| `createStarSampler(sizePx)` | Canvas alpha 实心五角星采样 | **直接复制（A5）** | `src/particles/reuse/starSampler.ts` | 纯函数、低耦合，备用 |
| `buildStarParticles()` | 树顶星粒子 | **仅参考** | 与 F3 水晶心不同 | 不替换 |
| `initGesture()` / MediaPipe | 手势控制 | **不接入** | — | 依赖/隐私 |
| `animate()` / `onWindowResize()` | 全局 RAF/尺寸 | **不替换** | 正式 AnimationManager | 第二套循环 |
| `texture/*.png` | 云/叶/雪/星贴图 | **不接入** | — | 资产另记 |

**Interactive 结论：** A5/A6 是直接复制候选；B6 仅作为未来粒子算法，不替换 F3 树体。

## 9. 候选登记表

### A. 可直接复制（6 个文件 / 9 组 / 18 个函数）

| ID | 来源 | 目标正式模块 | 接入阶段 |
| --- | --- | --- | --- |
| A1 | Heart-Star `geometry.js` → `sampleHeart` | `src/objects/reuse/heartGeometry.ts` | Phase 1（WP1） |
| A2 | Heart-Star `geometry.js` → `sampleStar` | 同上 | Phase 1 共享工具；F3 不视觉替换 |
| A3 | Heart-Star `geometry.js` → `jitter` | 同上（注入 rng） | Phase 1（WP1） |
| A4 | Heart-Star `particles.js` → `createSpriteTexture` | `src/objects/reuse/textures.ts` | Phase 2（WP2，可选 A/B） |
| A5 | Interactive `createStarSampler` | `src/particles/reuse/starSampler.ts` | Phase 2（WP3，可选 A/B） |
| A6 | Interactive `getGlowTexture` | `src/objects/reuse/textures.ts` | Phase 2（WP2，可选 A/B） |
| A7 | Immersive `gallery-projection.ts` | `src/photos/reuse/galleryProjection.ts` | F4（WP6） |
| A8 | Immersive `virtual-grid.ts` | `src/photos/reuse/virtualGrid.ts` | F4（WP6） |
| A9 | Immersive `repeating-transition.ts` | `src/photos/reuse/transitions.ts` | F4（WP6） |

### B. 抽取/移植（7 组）

| ID | 来源 | 内容 | 目标/阶段 |
| --- | --- | --- | --- |
| B1 | ChristmasTree `christmasTree.js` | 螺旋/粒子分布、星周围粒子、falling star | StarParticles/MagicParticles 候选；Phase 3 |
| B2 | ChristmasTree `decorations.js` / `musicalElements.js` | 铃铛/蝴蝶结/3D 爱心几何 | 未来装饰/爱心 A/B；Phase 3 |
| B3 | ChristmasTree shaders | 粒子/星/流星 GLSL | TreeLights/StarParticles 候选；Phase 3 |
| B4 | Christmas-Tree-Photos `App.tsx` | IndexedDB helpers | F4（WP7） |
| B5 | Christmas-Tree-Photos | `getTreePosition`、PhotoOrnaments | F4（WP7） |
| B6 | Interactive | `buildTreeParticles` / `buildStarParticles` / `buildTreeCore` | 未来粒子/底座；Phase 3 |
| B7 | Heart-Star | `retint` / theme constants | 现有 HeartParticles 主题增强；Phase 3 |

### C. 不替换 / 仅参考

- ChristmasTree：`Scene`、`Renderer`、`Controls`、`ChristmasTree` 整体、Vue 组件。
- Immersive：`gallery-scene.tsx`、`gallery-client.tsx` 等 React/GSAP 组件。
- Christmas-Tree-Photos：`Foliage`、`Experience`、`GestureController`、`GrandTreeApp` 等 R3F/MediaPipe 组件。
- Interactive：`initThree`、`addLights`、`animate`、Gesture 等全局装配。
- 整树/整场景替换：**0 个推荐**。

## 10. 与 F3 当前成果的关系

- F3 当前树体、双螺旋、360 灯、48 爱心、水晶树顶、底座已经使用**项目自有实现**。
- 本清单不把整树换成参考仓库的粒子树；那会破坏 F3 的 9 层实体树与 14 个控件。
- 第一批只做 A1–A3（心形纯数学），不改树体主结构；A4/A5/A6 只有 A/B 明确更好时接入。
- A7–A9 与 B4/B5 属于 F4 照片阶段，F3 不接入。

## 11. 需要确认的边界

1. 是否按 A1–A3 做第一轮共享心形模块与 48 爱心/水晶心 A/B？
2. A4/A5/A6 是否只做独立工具 + A/B，不通过则保留工具但不替换现有视觉？
3. A7–A9、B4/B5 是否统一下沉到 F4，避免 F3 修改照片系统？
4. B1–B3、B6、B7 是否只进入候选库，不在 F3 强行替换？

在用户确认前，本清单不修改正式代码。
