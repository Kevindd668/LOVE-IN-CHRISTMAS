# F3 · F2 视觉成果正式场景集成报告

> 分支：`f3-f2-integration`  
> 基线：`feature/visual-upgrade` / `89c9e41`（已接受 Heart-Star 48 爱心 + 水晶心轮廓）  
> 状态：**F3 集成实现、截图、回归与性能测试完成；等待验收。**  
> 正式 standalone：`Christmas-Wish.html`，SHA-256 `962607BC99988460F2C61EEA68C85D343132E99AE822A5FC22E8E4C6715A075A`  
> 范围：F2 实验 01（巨型爱心）、实验 03（星空/星云/极光/流星/光瀑/轨道）、实验 02（双螺旋树）正式集成；未进入 F4/F5。

## 1. 本阶段完成什么

F2 的三个实验已经接入同一个 Christmas-Wish Three.js 场景：

- **实验 01** → `src/particles/HeartParticleSystem.ts`
- **实验 03** → `src/effects/GalaxyEnvironment.ts`
- **实验 02** → 正式项目已有的 `ChristmasTree` + `TreeBranches` + `TreeHelix` + `TreeLights` + `TreeHeartOrnaments` + `TreeStar`

没有新建第二个 Renderer、第二个 RAF 循环、第二个 Scene 或第二个 WebGL 上下文。

```text
AnimationManager (single RAF)
        │
        ├─ ChristmasTree (9 层树 / 双螺旋 / 360 灯 / 48 爱心 / 水晶心)
        ├─ HeartParticleSystem (10000 粒子巨型爱心)
        ├─ GalaxyEnvironment (星空 / 星云 / 极光 / 流星 / 光瀑 / 三层轨道)
        ├─ StarParticles / AuroraEffect (原有 F3 夜空层，保留)
        ├─ PhotoManager / GiftBoxes / RomanticText
        └─ SnowParticles / MagicParticles
                    │
        SceneManager.scene → Renderer → EffectComposer (完整 Bloom 时)
```

## 2. 复用来源

| F2 实验 | 复用内容 | 正式模块 |
| --- | --- | --- |
| `experiments/01-heart-particles/src/main.js` | 心形/星形采样、10000 粒子、聚合、爆散、呼吸、颜色、shader | `src/particles/HeartParticleSystem.ts` |
| `experiments/03-galaxy-nebula/src/main.js` | 星空、星云、极光、流星、金色光瀑、三层轨道、shader | `src/effects/GalaxyEnvironment.ts` |
| `experiments/02-double-helix-tree/src/main.js` + `product-tree.js` | 9 层树、双螺旋、360 灯、48 爱心、水晶心、已验证参数 | 正式 `ChristmasTree` 体系 |

说明：实验 02 的 `product-tree.js` 本身就是正式树源码的实验副本；正式项目保留原始树体系，没有另造第二套双螺旋树。详细符号对照见 [F2_SOURCE_COMPARISON.md](F2_SOURCE_COMPARISON.md)。

## 3. 巨型 3D 爱心

文件：`src/particles/HeartParticleSystem.ts`

### 复用算法

- 520 点参数心形轮廓，归一化到 5.0 × 4.5 × 1.8；
- 星形轮廓（外径 2.4 / 内径 1.05）；
- 心形体积内随机采样 + 轮廓壳层采样；
- 散点球体分布；
- 单位爆散方向；
- 心形/星形之间插值；
- 聚合、爆散、自由漂浮；
- 心跳呼吸；
- 颜色由主色 → 金色 → 白色渐变。

### 正式适配

- 默认 **10000 粒子**，最大 20000；
- `group.position = (3.8, 7.6, -9.5)`，`scale = 1.4`，位于树后右侧，作为巨型爱心背景；
- 统一由 `AnimationManager` 调用 `update(delta, elapsed)`；
- 不创建自己的 Renderer/Bloom/OrbitControls/RAF；
- 暴露：
  - `setCount`
  - `setColors`
  - `setSize`
  - `setVisible`
  - `setPaused`
  - `setMode('heart' | 'star' | 'burst' | 'free')`
  - `gather()` / `burst()`
  - `dispose()`

### 交互

- 「巨型 3D 爱心」开关；
- 粒子数量 2000–16000；
- 主色选择；
- 「爱心聚合」按钮；
- 「爱心爆散」按钮；
- 「暂停巨型爱心」开关。

## 4. 星空、星云、极光、流星、光瀑、轨道

文件：`src/effects/GalaxyEnvironment.ts`

| F2 元素 | 正式实现 | 位置/参数 |
| --- | --- | --- |
| 星空 | 2 层 Points：12000 + 6000 | 半径 28–105，远景 |
| 星云 | 3 层 Shader Plane | z ≈ -58…-74，树后方 |
| 极光 | 4 层 Shader Plane | z ≈ -48…-66，树后方 |
| 流星 | 5 条 Line 轨迹 | z ≈ -38…-8，远景运动 |
| 金色光瀑 | 5000 粒子 + 半透明金色光帘 | 围绕树体，半径 2.6–4.8，高 12 |
| 三层轨道 | 3 个 LineLoop + 点阵 | 半径 5.1 / 6.5 / 8.1，y≈2.25 |

三层轨道各有独立速度：`0.19 / -0.13 / 0.08`。

### 开关

- 星空：控制原有星空 + Galaxy 星空；
- 极光：控制原有极光 + Galaxy 极光；
- 流星；
- 金色光瀑；
- 三层发光轨道。

### 性能降级

`GalaxyEnvironment.setQuality()`：

| 档位 | 星空 | 星云 | 极光 | 光瀑 |
| --- | --- | --- | --- | --- |
| Ultra | 12000 + 6000 | 3 层 | 4 层 | 5000 + 光帘 |
| Balanced | 7200 + 3600 | 3 层 | 4 层 | 3250 + 光帘 |
| Performance | 3600 + 1800 | 关闭 | 关闭 | 1750，无光帘 |

巨型爱心在 Performance 档降到 6000，Balanced 降到最多 8000。

## 5. 场景空间布局

| 层级 | 内容 | 构图 |
| --- | --- | --- |
| 远景 | 星空、星云、极光、流星 | 位于场景后方，不遮挡树冠 |
| 中景 | 三层轨道、金色光瀑 | 围绕树体，半径大于照片轨道 |
| 核心 | 双螺旋圣诞树 | 场景中心 |
| 爱情主体 | 巨型 3D 爱心 | 树后右侧，完整露出 |
| 地面 | 礼物、展示台、光影、雪 | 前景底部 |

巨型爱心不与树顶水晶心、520/1314、照片轨道重叠；光瀑在树体外围，光帘使用半透明加色混合。

## 6. 控件

新增/关联控件全部真实连接场景：

| 控件 | 作用 |
| --- | --- |
| 星空 | Galaxy 星空 + 原星空 |
| 极光 | Galaxy 极光 + 原极光 |
| F2 流星 | Galaxy meteor 组 |
| 金色光瀑 | 粒子 + 光帘 |
| 三层发光轨道 | 3 个 orbit 组 |
| 巨型 3D 爱心 | `giantHeart.group.visible` |
| 爱心聚合 | `gather()` |
| 爱心爆散 | `burst()` |
| 爱心粒子数量 | `setCount` |
| 巨型爱心主色 | `setColors` |
| 暂停巨型爱心 | `setPaused` |
| 双螺旋 | 原有 `helixOn` |
| 灯泡亮度 | 原有 `lightBrightness` |
| 圣诞树旋转 | 原有 `treeRotate` / `treeRotateSpeed` |

原有面板功能全部保留。

## 7. 截图

目录：`docs/F3/f2-integration-screenshots/`

| 文件 | 内容 |
| --- | --- |
| `01-overall.png` | 正式场景整体 |
| `02-stars-nebula.png` | 星空与星云 |
| `03-double-helix.png` | 双螺旋近景 |
| `04-giant-heart.png` | 巨型 3D 爱心 |
| `05-heart-gathering.png` | 爱心聚合过程 |
| `06-heart-bursting.png` | 爱心爆散过程 |
| `07-golden-waterfall.png` | 金色光瀑 |
| `08-three-orbits.png` | 三层轨道 |
| `09-effects-off.png` | 关闭新增特效后的树 |
| `10-controls-interaction.png` | 场景交互/控件 |

## 8. 回归

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `npm run build:single` | 通过 |
| `qa/smoke-test.mjs` | 通过，0 console/page error |
| `qa/raycast-test.mjs` | 通过 |
| `qa/qa2.mjs` | 通过 |
| `qa/qa3.mjs` | 通过 |
| `qa/mobile-test.mjs` | 通过 |
| `qa/singlefile-test.mjs` | 通过，0 failed request |

日志：`qa/f2-integration/*.log`。

新增控件逐项验证：`qa/f2-integration-controls.mjs` → `qa/f2-integration/controls.log`：

- 星空、极光、流星、光瀑、三层轨道、巨型爱心开关均真实改变对象可见性；
- 粒子数量 10000 → 5000 → 7000，drawRange 同步；
- 暂停后连续两次采样位置完全一致；
- 聚合按钮进入 `heart`，爆散按钮进入 `burst`；
- Performance 档爱心降到 6000、星空 3600/1800、光瀑 1750，星云/极光关闭；
- 0 console/page error。

## 9. 保留项

- 照片上传、替换、删除、排序；
- 照片轨道；
- 520 / 1314；
- 5 个礼物与交互；
- 背景音乐；
- 45 秒演示；
- 浪漫模式；
- 三档画质；
- 设置持久化；
- 完整 Bloom。

未开发 F4 照片记忆系统，未开发 F5 最终电影级演示。

## 10. 已知边界

- 原有 StarParticles/AuroraEffect 仍保留，以保护 45 秒演示和旧设置链路；GalaxyEnvironment 作为更远的 F2 夜空层叠加，而不是替换旧层；
- 所有新 GPU 资源在 `dispose()` 中释放；
- 4K 默认兼容与 4K 完整 Bloom 均已采样；完整 Bloom 4K 为 140.5 FPS / p95 8.5 ms；
- 未做 30 分钟持续运行；本轮为 3 秒稳定采样。
