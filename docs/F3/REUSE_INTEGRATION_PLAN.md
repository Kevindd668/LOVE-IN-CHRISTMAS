# F3 参考仓库复用整合方案

> 状态：**方案阶段，未修改正式代码。**  
> 授权前提：五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者、仓库 URL、commit 与来源。  
> 本方案不再以缺少 LICENSE 文件或此前的“未核验”表述限制复用；所有取舍仅基于技术兼容性、F3 视觉目标与回归风险。

## 1. 目标与不做什么

### 目标

在不破坏 F3 已完成的 9 层树、双螺旋、360 灯、48 爱心、水晶树顶、展示台和 14 个控件的前提下：

1. 优先直接复制参考仓库中**可独立、低耦合**的源码；
2. 对树体相关算法进行**小范围替换/A-B**，而不是整树重写；
3. 明确每个文件的目标落点、改动范围、风险与验收方式；
4. 保留作者署名、仓库、commit、来源说明；
5. 完成后重新跑 F3 的完整回归与性能。

### 不做

- 不把 F3 的 9 层 Mesh 树替换成任何参考仓库的粒子树/React 树/Vue 树；
- 不引入 Vue、React、R3F、GSAP、lil-gui、MediaPipe 或新生产依赖；
- 不新增第二套 WebGLRenderer、RAF 循环、SceneManager、ControlPanel；
- 不修改 5 个礼物、照片存储、45 秒演示、浪漫模式、三档画质；
- 不在本方案内进入 F4/F5。

## 2. F3 组件 × 参考仓库映射

| F3 组件/文件 | F3 当前实现 | 参考仓库可复用内容 | 建议动作 |
| --- | --- | --- | --- |
| 9 层树体 `TreeBranches.ts` | 项目自有针叶实例、层核、树皮、树冠包络 | ChristmasTree `christmasTree.js` 的粒子树；Interactive 的粒子树 | **不替换**；只保留算法参考。参考树是 Points 点云，替换会丢失 9 层实体枝叶 |
| 双螺旋 `TreeHelix.ts` | 自研 TubeGeometry + 9 圈 + 流光 | Immersive `helix.ts` 的 `writeHelixTransforms` / `wrap`；ChristmasTree 的螺旋角公式 | **不替换主管道**；可选抽取“相位/实例布局”用于流光，不作为第一批 |
| 360 灯泡 `TreeLights.ts` | 单一 Points Shader，四色配额 | ChristmasTree `shader/particle/*`；Heart-Star `createSpriteTexture`；Interactive `getGlowTexture` | **保留现有颜色/波动逻辑**；可选 A/B 参考 shader 的柔光写法，不整段替换 |
| 48 爱心 `TreeHeartOrnaments.ts` | 自研爱心几何 + 4 组 InstancedMesh | Heart-Star `geometry.js` 的 `sampleHeart`；ChristmasTree `musicalElements.js` 的 `createHeart` | **第一批直接复用候选**：抽成共享 heart shape，A/B 后替换形状生成 |
| 水晶树顶 `TreeStar.ts` | 自研 64 点切面心 + 物理材质 | Heart-Star `sampleHeart`；ChristmasTree `createHeart` 的 Extrude 思路 | **第一批候选**：用 `sampleHeart` 生成轮廓环，保持 0.95×0.85×0.22 与切面结构 |
| 树底展示台 `SceneManager.ts` | 自研石台/雪盖/金环/模拟反射 | Interactive `buildTreeCore()` 的 CircleGeometry；ChristmasTree `createGround()` | **不替换**；现有展示台更完整；最多参考圆盘的层次 |
| 相机/视口 `CameraManager.ts` | 自研 home framing/OrbitControls | ChristmasTree/Immersive 的相机距离经验 | **不直接复制**；仅做数值参考 |
| 灯泡/星空粒子 `StarParticles.ts` | 项目自有 | Interactive `createStarSampler`；Heart-Star `sampleStar` | 可做 **第二批** 星形采样增强；不涉及 F3 树体主结构 |
| 光晕/纹理 | 项目自有 Canvas 纹理 | Heart-Star `createSpriteTexture`；Interactive `getGlowTexture` | **第一批可直接复制**为独立纹理工具，按需接入 |
| 照片轨道/相册 `PhotoManager.ts` | 项目自有，F3 未改 | Immersive `gallery-projection.ts`、`virtual-grid.ts`、`repeating-transition.ts`；Christmas-Tree-Photos IndexedDB helpers | **F4 方案，不在 F3 接入**；避免修改照片存储 |
| 礼物/音乐/演示/UI | 项目自有 | 参考仓库的 Vue/React/lil-gui 组件 | **不替换**；会引入第二套架构 |

## 3. 第一批：低风险直接复制（建议先做）

### WP1 · Heart-Star 心形数学 → 共享 heart 模块

**来源：**

- `github-references/Heart-Star/geometry.js`
- 作者：Saklin Ali
- commit：`9317aeb`
- 函数：`sampleHeart(t)`、`sampleStar(t)`、`jitter(point, strength)`

**落点：**

- 新建 `src/objects/reuse/heartGeometry.ts`（或 `src/shared/heartGeometry.ts`）
- 直接复制三个函数，补 TS 类型；
- 文件头保留作者、仓库、commit、授权说明；
- 随机函数改为可注入的 rng，避免污染全局随机。

**如何用于 F3：**

- `TreeHeartOrnaments.createHeartGeometry()`：
  - 用 `sampleHeart` 生成轮廓环，再按当前 Extrude/bevel 参数生成 48 颗爱心；
  - 保持当前 4 材质、4 InstancedMesh、48 数量、轻微悬浮/自转不变；
- `TreeStar.createHeartShape()`：
  - 用 `sampleHeart` 的 64 点轮廓替换当前 Bezier 轮廓；
  - 保持目标尺寸 0.95×0.85×0.22、前/后切面环、体积中心、材质、halo、pick 接口；
  - 不改变树顶功能与交互。

**风险与 A/B：**

- 参数化心形与当前 Bezier 心形轮廓不同，可能改变视觉宽高比；
- 先在分支上做 A/B 截图（同一相机、同一灯光），通过再合并；
- 若轮廓变差，只保留 `heartGeometry.ts` 文件而不替换树体形状；
- 保持当前 F3 截图作为回滚基线。

**预期收益：**

- 真正复用参考仓库代码，而不是只参考；
- 共享心形数学可同时服务 48 爱心、水晶心、后续 HeartParticles；
- 纯数学、无新增 draw call、无架构风险。

### WP2 · 纹理/光晕工具直接复制

**来源：**

- Heart-Star `particles.js` 的 `createSpriteTexture()`；
- Interactive-Xmas-Tree `getGlowTexture()`。

**落点：**

- `src/objects/reuse/textures.ts` 或 `src/core/textures.ts`；
- 复制 Canvas 绘制代码，改造成 `createSparkTexture()` / `createRadialGlowTexture()`。

**用途：**

- 作为现有 `TreeStar` halo/coreGlow、StarParticles 的**可选纹理替代**；
- 不改变当前 360 灯泡 shader；不改变 F3 树体结构；
- A/B 只替换纹理，不动材质/几何/灯光逻辑。

**优先级：** 中低。当前纹理已经工作，只有在 A/B 明确更好时接入。

## 4. 第二批：可抽取但需适配（不先动树体）

### WP3 · ChristmasTree 的装饰/粒子 shader

**来源：**

- `ChristmasTree/src/shader/particle/{vertex,fragment}.glsl`
- `starParticle/*`、`fallingStar/*`、`star/*`
- `ChristmasTree/src/three/decorations.js` 的 `createBell()` / `createBow()`

**可复用内容：**

- 点精灵柔光、sparkle、彩虹粒子的 GLSL 思路；
- 铃铛/蝴蝶结的 3D 几何组合。

**不建议：**

- 直接替换 `TreeLights`；现有 162/90/54/54 分布、波式点亮、深度测试策略是为 F3 专门调过的，整套 shader 替换会回归灯光；
- 直接替换 `GiftBoxes`；5 个礼物的开盖/交互/阴影必须保留；
- 直接把 `fallingStar` 加到树体；F3 的树顶是水晶爱心，不是流星。

**潜在用法：**

- 作为 `StarParticles`/`MagicParticles` 的未来 shader 补充；
- 把铃铛/蝴蝶结作为独立装饰库，不进入当前 48 爱心主题。

**优先级：** 低；不建议为了“用了参考代码”而替换已验收的灯光。

### WP4 · Interactive 星形采样 / 粒子树算法

**来源：**

- `createStarSampler(sizePx)`；
- `buildTreeParticles()` / `buildStarParticles()`；
- `getGlowTexture()`。

**落点：**

- `src/particles/reuse/starSampler.ts`；
- 可用于背景星形粒子、魔法粒子或未来的星形状态；
- 不替换 F3 树体、不替换 360 灯。

**优先级：** 中低；F3 树体不需要，但它是干净、可测试的纯函数。

### WP5 · Immersive 的 helix 布局

**来源：**

- `features/daily-edit/xylophone/reference/js/components/xylophone/helix.ts`
- `writeHelixTransforms()`、`buildInstanceTransforms()`、`wrap()`

**可复用内容：**

- 无分配地写入螺旋位置/旋转；
- 相位滚动、wrap、实例布局。

**注意：**

- 这个文件在嵌套的 xylophone reference 目录中，且是“条形乐器”的螺旋布局，不是 9 圈 Tube 光带；
- 不能替换 `TreeHelix` 的 Tube/流光；
- 最多用于未来的“螺旋实例装饰”或流光的相位算法，不作为第一批。

## 5. 第三批：F4 照片方向，F3 不接入

### WP6 · Immersive 照片纯函数

可直接复制为 TS：

- `shared/geometry/gallery-projection.ts`
- `features/gallery/scene/virtual-grid.ts`
- `shared/animation/repeating-transition.ts`

适合未来照片网格、虚拟目录、详情过渡。  
F3 明确不修改照片系统，因此只登记，不接入。

### WP7 · Christmas-Tree-Photos IndexedDB helpers

可抽取：

- `openPhotoDb`、`getPhotoMeta`、`setPhotoMeta`；
- `getAllStoredPhotos`、`putStoredPhoto`、`deleteStoredPhoto`、`clearAllStoredPhotos`。

用途：未来照片持久化。  
F3 不修改照片存储；需要单独做 schema/迁移方案，不能直接替换现有 PhotoManager。

## 6. 明确不进入 F3 的部分

- ChristmasTree `Scene` / `Renderer` / `Controls` / `ChristmasTree` 整体；
- ChristmasTree Vue 组件、MusicPlayer；
- Immersive React/GSAP 场景；
- Christmas-Tree-Photos R3F/MediaPipe 组件；
- Interactive 的 `initThree` / `animate` / 手势模块；
- 所有参考仓库的 `public/music`、模型、纹理、MediaPipe 模型；
- 任何第二套 renderer/loop/control panel。

## 7. 实施步骤

### Phase 0 · 冻结与对照

- 固定当前 F3 基线：`feat(f3)` commit `d9954c3`，恢复标签 `f3-pre-visual-reconstruction`；
- 保存当前 10 张验收截图和性能 JSON；
- 新分支：`f3-reuse`（不直接提交到 `feature/visual-upgrade`，验收后再合并）。

### Phase 1 · 共享 heartGeometry（WP1）

1. 新建 `src/objects/reuse/heartGeometry.ts`；
2. 复制 Heart-Star 三个函数，补类型/署名；
3. 编写纯函数单测/几何断言（尺寸、点数、边界）；
4. 在 `TreeHeartOrnaments` 和 `TreeStar` 中做 A/B 分支；
5. 生成同机位截图与 draw call/FPS；
6. 若视觉通过，合并；否则保留工具文件，不改树体。

### Phase 2 · 纹理/星形采样（WP2/WP4）

1. 复制 `createSpriteTexture`/`getGlowTexture`；
2. 仅替换纹理，不改 shader；
3. A/B 树顶光晕、StarParticles；
4. 若没有明确提升，不合并，只保留工具文件。

### Phase 3 · 可选 shader/装饰（WP3/WP5）

- 除非 A/B 明确改善灯光/树体，否则不替换现有实现；
- 不引入任何新依赖。

### Phase 4 · F4 资产（不在本阶段）

- WP6/WP7 只用于后续照片阶段；
- 不在 F3 修改照片存储。

## 8. 验收标准

每个 WP 必须同时通过：

- `npm run typecheck`；
- `npm run build` / `build:single`；
- `qa/smoke-test.mjs`、`qa/raycast-test.mjs`、`qa/qa2.mjs`、`qa/qa3.mjs`、`qa/mobile-test.mjs`、`qa/singlefile-test.mjs`；
- F3 10 项截图 + 与基线并排；
- 1440×900/1920×1080 性能不出现明显回归；
- 5 礼物、照片、音乐、45 秒演示、浪漫模式、三档画质、持久化不破；
- 文件头保留作者/仓库/commit/授权来源。

## 9. 推荐决策

**建议先只做 Phase 1（WP1）。**

理由：

1. 这是最干净、最直接、最符合“复用源码”的候选；
2. 不改树体架构、不引入依赖、不增加 draw call；
3. 可以用 48 爱心 + 水晶树顶两个位置做 A/B；
4. 即使视觉不接受，也可以保留共享数学文件、不改 F3 外观；
5. 其他模块（灯光 shader/照片/IndexedDB）要么技术上冲突，要么属于 F4，不建议为了“用完五个仓库”而强行替换。

如果你确认，我将按 Phase 1 开始：新分支、复制 Heart-Star 的 `sampleHeart`/`sampleStar`/`jitter`、只改心形几何生成，不动 9 层树/双螺旋/360 灯/展示台，完成后交 A/B 截图和回归结果再决定是否合并。
