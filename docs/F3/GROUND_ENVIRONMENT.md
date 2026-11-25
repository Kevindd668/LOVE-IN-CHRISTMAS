# F3 WP4 · 冬日地面与展示台

> 分支：`f3-ground-composition`  
> 范围：WP4 完成；WP5/WP6 已完成并进入最终验收。  
> 真实截图：`docs/F3/wp4/`、`docs/F3/final-screenshots/`  
> 最终 standalone SHA-256：`06F00FDDD8640A97568548F3385949751C4DD76C6CC86BECDA326ADD64F9DE49`

## 1. 目标

把原本偏平的雪地做成有层次的冬日展示空间：

- 地面基色 `#263B4C`，雪高光 `#A8BBC8`；
- 不规则积雪和近景微地形；
- 石台、雪盖、金色内圈、展示环；
- 香槟金环形光；
- 冰晶、低空地面微光；
- 礼物周围保留柔和环境光；
- 不使用镜面/SSR，继续使用 Canvas 模拟反射。

## 2. 实现

文件：`src/core/SceneManager.ts`

- `createGround()`：
  - 顶点色改为深蓝地面到雪高光的渐变；
  - 雪纹理底色调整，降低整块地面泛白；
  - 保留原有 110×110 微起伏和远景渐隐。
- 新增 `createGroundDetails()`：
  - 9 个近地不规则雪斑（CircleGeometry 顶点扰动，非白色圆盘）；
  - 48 个冰晶实例（Ultra 48 / Balanced 24 / Performance 0）；
  - 180 个低空地面微光 Points（Ultra 180 / Balanced 90 / Performance 0）；
  - 香槟金环形光（Additive Plane）。
- `SceneManagerOptions` 增加可选 `quality`；
- 新增 `setTreeShadowScale()`，供 WP5 树体放大后同步树影；
- `groundDetails` 在 `dispose()` 中统一释放。

## 3. 保留

- 原树台/雪盖/金圈/展示环；
- 5 个礼物位置、开盖和点击；
- 原 `SnowParticles` 雪花；
- 模拟反射，不引入镜面或 SSR。

## 4. 截图

| 文件 | 内容 |
| --- | --- |
| `01-overall-ground.png` | 地面整体 |
| `02-ground-close.png` | 展示台、雪斑、礼物近景 |

## 5. 验证

- typecheck/build 通过；
- 5 个礼物可点击/开盖；
- 三档画质切换，冰晶和地面微光按档位降级；
- 无 console/page error。

## 6. 边界

- 地面细节是轻量装饰，不承担物理积雪/碰撞；
- 24 张照片构图和树体放大属于 WP5；
- WP6 的完整性能/回归和最终交付见 `PERFORMANCE_REPORT.md`、`REGRESSION_REPORT.md`、`FINAL_ACCEPTANCE.md`。
