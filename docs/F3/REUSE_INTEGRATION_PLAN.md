# F3 · 参考仓库复用整合计划

> 状态：**计划阶段，未修改正式代码。**  
> 授权：五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用时保留作者、仓库 URL、commit 与来源。  
> 本计划不再以缺少 LICENSE 文件或此前的“未核验”表述限制复用；取舍只基于技术兼容性、F3 视觉目标与回归风险。
>
> 本文件批准的是**复用计划与清单**；正式代码整合需要用户对具体批次另行确认后执行。

## 1. 目标与成功标准

### 目标

在不破坏 F3 已完成的 9 层树、双螺旋、360 灯、48 爱心、水晶树顶、展示台和 14 个控件的前提下：

1. 优先直接复制参考仓库中可独立、低耦合的源码；
2. 对树体相关算法只做小范围替换/A-B，不整树重写；
3. 每个 WP 都有源文件、目标文件、API 影响、测试、回滚；
4. 保留作者、仓库、commit、授权来源；
5. 若视觉/性能没有明确收益，保留现有 F3 实现，不为了“用参考代码”而降低质量。

### 成功标准

- 第一批只改心形几何，不改树体/双螺旋/灯光/底座；
- 48 爱心和水晶树顶 A/B 截图通过；
- 所有回归测试通过；
- 性能不出现明显回归；
- 每个复制文件带署名头；
- 没有新增生产依赖、没有第二套 renderer/loop。

## 2. 非目标

- 不整树替换成参考仓库的粒子树/React 树/Vue 树；
- 不引入 Vue、React、R3F、Next、GSAP、lil-gui、MediaPipe 或新生产依赖；
- 不新增第二套 WebGLRenderer、RAF 循环、SceneManager、ControlPanel；
- 不修改 5 个礼物、照片存储、45 秒演示、浪漫模式、三档画质；
- 不进入 F4/F5；
- 不在本计划批准后立即执行代码整合；需用户确认 WP1（或指定批次）后开始。

## 3. 当前基线

| 项 | 值 |
| --- | --- |
| 分支 | `feature/visual-upgrade` |
| F3 实现提交 | `d9954c3` |
| F3 恢复标签 | `f3-pre-visual-reconstruction` → `4d33116` |
| F3 正式树体 | `TreeBranches` / `TreeLights` / `TreeStar` / `TreeHelix` / `TreeHeartOrnaments` |
| F3 性能基线 | `qa/f3/performance.json` |
| F3 截图基线 | `docs/F3/screenshots/` |
| 当前复用清单 | `docs/F3/DIRECT_REUSE_INVENTORY.md` |

## 4. F3 组件 × 参考仓库映射

| F3 组件/文件 | 当前实现 | 参考仓库可用内容 | 决策 |
| --- | --- | --- | --- |
| 9 层树体 `TreeBranches.ts` | 项目自有实体针叶 Mesh | ChristmasTree / Interactive 的 Points 粒子树 | **不替换**；参考树无法提供 9 层实体枝叶与现有 pick/控制 |
| 双螺旋 `TreeHelix.ts` | 自研 9 圈 Tube + 流光 | Immersive `helix.ts` 的相位/实例布局；ChristmasTree 螺旋角公式 | **不替换主管道**；B6 仅作未来流光/实例参考 |
| 360 灯泡 `TreeLights.ts` | 自研单 Points Shader + 精确四色配额 | ChristmasTree 点精灵 GLSL；Heart-Star spark 纹理；Interactive glow 纹理 | **保留现有分布/波动**；A4/A6 仅做纹理 A/B，B3 作为后备 |
| 48 爱心 `TreeHeartOrnaments.ts` | 自研 Extrude 爱心 + 4 组 InstancedMesh | Heart-Star `sampleHeart`；ChristmasTree `createHeart` | **A1/WP1**：只替换轮廓生成，保持 48/材质/实例 |
| 水晶树顶 `TreeStar.ts` | 自研 64 点切面心 + 物理材质 | Heart-Star `sampleHeart`；ChristmasTree Extrude 心形 | **A1/WP1**：只替换轮廓环，保持 0.95×0.85×0.22 和切面 |
| 树底展示台 `SceneManager.ts` | 自研石台/雪盖/金环/模拟反射 | Interactive `buildTreeCore`；ChristmasTree `createGround` | **不替换**；最多参考层次，B6 备用 |
| 相机 `CameraManager.ts` | 自研 home framing/OrbitControls | 参考相机距离数值 | **仅参考**，不复制 |
| StarParticles | 项目自有 | Interactive `createStarSampler`；Heart-Star `sampleStar` | **A2/A5** 作为未来共享工具；不替换树体 |
| 光晕/纹理 | 项目自有 Canvas 纹理 | Heart-Star `createSpriteTexture`；Interactive `getGlowTexture` | **A4/A6/WP2**，按 A/B |
| 照片/画廊 | 项目自有，F3 未改 | Immersive A7–A9；Christmas-Tree-Photos B4/B5 | **F4，不在 F3 接入** |
| 礼物/音乐/演示/UI | 项目自有 | 参考仓库 Vue/React/lil-gui 组件 | **不替换** |

## 5. 直接复制候选（A）

| ID | 来源符号 | 目标正式路径 | 阶段 |
| --- | --- | --- | --- |
| A1 | Heart-Star `sampleHeart(t)` | `src/objects/reuse/heartGeometry.ts` | WP1 |
| A2 | Heart-Star `sampleStar(t)` | 同上 | WP1（共享工具，不改变 F3 视觉） |
| A3 | Heart-Star `jitter(point,strength)` | 同上（注入 rng） | WP1 |
| A4 | Heart-Star `createSpriteTexture()` | `src/objects/reuse/textures.ts` | WP2 |
| A5 | Interactive `createStarSampler(sizePx)` | `src/particles/reuse/starSampler.ts` | WP3 |
| A6 | Interactive `getGlowTexture()` | `src/objects/reuse/textures.ts` | WP2 |
| A7 | Immersive `gallery-projection.ts` | `src/photos/reuse/galleryProjection.ts` | F4/WP6 |
| A8 | Immersive `virtual-grid.ts` | `src/photos/reuse/virtualGrid.ts` | F4/WP6 |
| A9 | Immersive `repeating-transition.ts` | `src/photos/reuse/transitions.ts` | F4/WP6 |

## 6. 工作包

### WP0 · 基线与回滚门

- 从 `feature/visual-upgrade` 创建 `f3-reuse` 分支；
- 固定 `d9954c3` 为视觉/性能基线；
- 备份 10 张 F3 截图与 `qa/f3/performance.json`；
- 每个 WP 单独 commit，失败可单独 revert；
- 不直接修改 `feature/visual-upgrade`。

### WP1 · Heart-Star 心形数学（第一优先）

**来源**

- `github-references/Heart-Star/geometry.js`（MIT，`9317aeb`，Saklin Ali）
- `sampleHeart(t)`、`sampleStar(t)`、`jitter(point,strength)`

**新增文件**

`src/objects/reuse/heartGeometry.ts`

- 复制三个函数，补 TypeScript 类型；
- `jitter` 改为接收 rng，避免直接使用全局随机；
- 文件头保留作者/仓库/commit/授权。

**几何适配**

`sampleHeart` 原始坐标：

```text
x = 16 sin^3(t) * 2.2
y = (13cos t - 5cos2t - 2cos3t - cos4t) * 2.2
z = sin(4t) * 2
```

正式模块需要：

1. 计算 x/y 的 min/max；
2. 归一化到 [-0.5, 0.5]；
3. 按目标宽高缩放：48 爱心保留当前实例尺寸；水晶心保持 **0.95 × 0.85 × 0.22**；
4. 48 爱心使用扁平轮廓（忽略 z 或控制 z 幅度）；
5. 水晶心保留前/后切面环、中心、厚度和 flatShading。

**修改点**

- `TreeHeartOrnaments.createHeartGeometry()`：只替换 shape 生成，不改 4 材质、4 InstancedMesh、48 数量、悬浮/自转、开关；
- `TreeStar.createHeartGeometry()`：只替换轮廓 ring，不改材质、halo、sparkles、pickType='star'、自转/浮动、crownHeartOn。

**API/数据流**

- 不新增公开 API；
- `getPickMeshes()` 不变；
- `TreeStar` 的 0.95×0.85×0.22 与 `pickType='star'` 不变；
- 不改变 48 爱心的 instanceMatrix/材质分配；
- 新增的 `heartGeometry.ts` 只导出纯函数。

**A/B 门禁**

- 同机位：front、48 爱心近景、水晶心近景；
- 同灯光/相机/时间；
- 通过条件：轮廓更像心形、无穿模、宽高比稳定、可读性不下降；
- 未通过：保留 `heartGeometry.ts`，不改两个组件的外观。

### WP2 · 纹理/光晕（可选）

**来源**

- Heart-Star `createSpriteTexture()`；
- Interactive `getGlowTexture()`。

**新增文件**

`src/objects/reuse/textures.ts`

- `createSparkTexture()`（Heart-Star）；
- `createGlowTexture()`（Interactive）；
- 保留 Canvas 算法，补 TS 类型和署名；
- 不替换现有材质，只替换 `map` 做 A/B。

**接入点**

- `TreeStar` 的 halo/coreGlow；
- `StarParticles` / `MagicParticles` 的可选纹理；
- 360 灯 shader 不改，避免破坏四色配额与波动。

**A/B 门禁**

- 1440×900 树顶近景；
- draw calls 不增加；
- 若只是“不同”而非“更好”，不合并。

### WP3 · Interactive 星形采样（可选）

**来源**

- `Interactive-Xmas-Tree/index.html` → `createStarSampler(sizePx)`。

**新增文件**

`src/particles/reuse/starSampler.ts`

- 原函数使用 Canvas alpha + 拒绝采样；
- 补 TS 类型，保留算法；
- 不引入全局 `THREE`/CDN。

**用途**

- 未来 StarParticles 的星形/实心采样；
- F3 不替换水晶树顶；
- 不改 360 灯泡。

### WP4 · ChristmasTree 装饰/粒子 shader（第二批）

**来源**

- `src/three/decorations.js` → `createBell()` / `createBow()`
- `src/shader/particle/*`、`starParticle/*`、`fallingStar/*`、`star/*`
- `src/three/musicalElements.js` → `createHeart()`

**决策**

- 只作为未来 StarParticles/MagicParticles 或装饰库候选；
- 不替换 `TreeLights`、`GiftBoxes`、`ChristmasTree`、`SceneManager`；
- 不引入 GSAP/Vue/Three 0.171；
- 进入前需单独 A/B 和用户确认。

### WP5 · Immersive helix 布局（可选）

**来源**

- `features/daily-edit/xylophone/reference/js/components/xylophone/helix.ts`
- `writeHelixTransforms()`、`buildInstanceTransforms()`、`wrap()`

**决策**

- 其“条形乐器”实例布局不等同于 F3 的连续 Tube 光带；
- 不替换 `TreeHelix`；
- 最多作为未来流光/实例相位算法参考，不进入第一批。

### WP6 · F4 照片纯函数（延期）

直接复制候选：

- `shared/geometry/gallery-projection.ts`
- `features/gallery/scene/virtual-grid.ts`
- `shared/animation/repeating-transition.ts`

目标：

- `src/photos/reuse/galleryProjection.ts`
- `src/photos/reuse/virtualGrid.ts`
- `src/photos/reuse/transitions.ts`

F3 不修改照片系统；F4 单独做照片轨道/网格/过渡时再接入。

### WP7 · F4 IndexedDB helpers（延期）

来源：`Christmas-Tree-Photos/src/App.tsx`

- `openPhotoDb`
- `getPhotoMeta` / `setPhotoMeta`
- `getAllStoredPhotos` / `putStoredPhoto` / `deleteStoredPhoto` / `clearAllStoredPhotos`

目标：`src/photos/reuse/photoDb.ts`

F3 不接入；F4 需单独设计 schema、迁移、隐私和上限。

### WP8 · 不使用清单

- ChristmasTree `Scene` / `Renderer` / `Controls` / 整类；
- Vue/React/R3F/MediaPipe/GSAP/lil-gui 组件；
- 第二套 renderer/RAF/ControlPanel；
- 参考仓库 `public/music`、模型、纹理、MediaPipe 模型；
- 任何会改变 5 礼物、照片存储、45 秒演示的替换。

## 7. 代码整合顺序

1. **WP0**：分支/基线/截图/性能备份；
2. **WP1**：heartGeometry + 48 爱心/水晶心 A/B；
3. **WP2/WP3**：纹理/星形采样 A/B，只有明确收益才合并；
4. **WP4/WP5**：可选 shader/装饰/螺旋布局，不通过则只保留参考；
5. **WP6/WP7**：F4 照片阶段，不在 F3。

每个 WP 完成后单独 commit；任何视觉/性能回退立即 revert，不影响其他 WP。

## 8. 回归与验收

### 必跑

```text
npm run typecheck
npm run build
npm run build:single
qa/smoke-test.mjs
qa/raycast-test.mjs
qa/qa2.mjs
qa/qa3.mjs
qa/mobile-test.mjs
qa/singlefile-test.mjs
```

### 专项

- 48 爱心数量/材质/4 InstancedMesh；
- 水晶心尺寸/切面/pick/点击许愿；
- 360 灯四色配额 162/90/54/54；
- 9 层树/双螺旋/展示台；
- 5 礼物/照片/音乐/45 秒演示/浪漫模式/三档画质/持久化；
- 资源释放、无 context lost、无重复 renderer/loop。

### 截图/性能

- 10 项 F3 截图 + 48 爱心/水晶心 A/B；
- 1440×900、1920×1080、4K 等效；
- 记录 FPS、P95、draw calls、triangles、textures；
- 与 `qa/f3/performance.json` 基线对比。

## 9. 风险与回滚

| 风险 | 处理 |
| --- | --- |
| Heart-Star 轮廓改变宽高比 | 归一化并固定目标尺寸；A/B 不过则回滚 |
| 水晶心切面/材质被破坏 | 只换 ring，不换材质/厚度/中心结构 |
| 48 爱心穿模/遮挡 | 保持原实例位置/缩放，仅换几何 |
| 纹理 A/B 变差 | 只保留工具文件，不替换 map |
| shader 替换破坏 360 灯配额 | 不进入 WP1；WP4 仅可选且需单独 A/B |
| 引入第二套循环/依赖 | 硬性禁止；code review 检查 |
| 照片/礼物/演示回归 | 完整回归门禁 |
| 性能回退 | 1440/1920 对比基线；P95/draw calls 明显变差则回滚 |

## 10. 假设

- 五仓库固定提交不变；
- 作者授权已成立，公开 LICENSE 文件只作来源档案；
- F3 当前实现为视觉基线；
- 本阶段不改正式代码，先确认清单与计划；
- 代码整合需用户另行确认 WP 或批次。

## 11. 建议的首批确认

建议只批准 **WP1**：

- 新建 `src/objects/reuse/heartGeometry.ts`；
- 复制 Heart-Star `sampleHeart` / `sampleStar` / `jitter`；
- 只改 48 爱心轮廓与水晶心轮廓生成；
- 不动 9 层树、双螺旋、360 灯、展示台；
- 产出同机位 A/B 截图、性能、回归结果，再决定是否合并。

其他 WP 先作为清单/候选，不进入 F3 实际修改。
