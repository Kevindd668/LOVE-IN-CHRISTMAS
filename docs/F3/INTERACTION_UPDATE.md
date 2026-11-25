# 交互与设置更新

## 1. 新增/接通的树体控件

所有控件都通过 `data-setting` 进入 `SettingsManager`，再经 `ChristmasTree`/`SceneManager` 的真实方法作用到场景；没有装饰性控件。

| 控件 | setting key | 默认值 | 实际作用 |
| --- | --- | --- | --- |
| 圣诞树高度 | `treeHeight` | 9.5 | 触发 `TreeBranches.build`、灯串/双螺旋/爱心/树顶重建，并更新相机 framing |
| 树冠大小 | `crownRadius` | 3.0 | 重建树冠/螺旋/爱心包络，更新相机 |
| 每层枝叶密度 | `density` | 210 | 重建针叶实例 |
| 枝叶层数 | `layers` | 9 | 重建 9 层树冠及装饰 |
| 树叶颜色 | `foliageColor` | `#0B5D3B` | 更新主色/派生阴影/高光/针叶实例色 |
| 树体缓慢旋转 | `treeRotate` | true | `ChristmasTree.setRotationEnabled` |
| 旋转速度 | `treeRotateSpeed` | 0.28 | `setRotationSpeed` |
| 树体整体亮度 | `treeBrightness` | 1.00 | `TreeBranches.setBrightness`（核心/枝臂/针叶/树干颜色乘数） |
| 48 颗爱心装饰 | `ornamentsOn` | true | `TreeHeartOrnaments.setEnabled` |
| 树顶水晶爱心 | `crownHeartOn` | true | `TreeStar.root.visible`；同时从 pick meshes 移除 |
| 双螺旋光带 | `helixOn` | true | `TreeHelix.setEnabled` |
| 螺旋旋转速度 | `helixSpeed` | 0.32 | `TreeHelix.setSpeed` / 流光滚动 |
| 螺旋相位 | `helixPhase` | 0.00 | `TreeHelix.setPhase` |
| 点亮灯串 | `lightsOn` | true | `TreeLights.setEnabled` |
| 灯光亮度 | `lightBrightness` | 1.45 | `uBrightness` uniform |
| 闪烁速度 | `lightFlashSpeed` | 1.00 | `uSpeed` uniform |

灯泡数量固定为 **360**；UI 的 number input 也设为 `min=max=360`，避免旧 localStorage 把目标树的灯数静默降级。灯光颜色/灯光模式继续保留 `lightMode` 控件。

## 2. 设置持久化

- 继续使用原 `WISH_STORAGE_KEY = 'a-christmas-wish.settings.v1'`，未改照片存储机制。
- `SettingsManager.NUMBER_KEYS` 新增 `treeBrightness`、`helixSpeed`、`helixPhase`。
- `sanitize()` 对新字段做范围约束；灯数固定 360。
- 实测：把 treeHeight 改为 9.7 后刷新，读取仍为 9.7；重置后回到 9.5 / 3.0 / 9 / 360。

## 3. 真实交互验证

`qa/f3/control-results.json` 的实测结果：

| 项 | 结果 |
| --- | --- |
| 初始树体 | 9.5 / 3 / 9 layers / 360 bulbs |
| 灯光配额 | 162 / 90 / 54 / 54（45% / 25% / 15% / 15%） |
| treeRotate | false 实际关闭；speed 0.55 实际写入 |
| treeHeight / crown | 9.8 / 3.1 实际重建 |
| foliageColor | `#123456` 实际进入调色板 |
| helix | 关闭、speed 0.7、phase 1.1 全部写入 |
| lights | 关闭、brightness 2、flash 2 全部写入 |
| ornaments/crown | 两个开关实际隐藏 |
| treeBrightness | 1.2 实际写入 |
| 画面质量 | balanced / performance / ultra 均保持 360 灯 |
| 礼物 | 5 个 |
| 照片 | 8 张初始 |
| 刷新持久化 | 通过 |
| 连续重建内存 | `195 geometries / 33 textures` 四次不变 |
| console errors | 0 |

## 4. 保留的现有功能

| 功能 | 状态/证据 |
| --- | --- |
| 照片上传、替换、删除、排序 | 保留；`qa/smoke-test.mjs` 通过 |
| 照片轨道 | 保留；PhotoOrbit 未改 |
| 520 / 1314 | 保留；qa3 验证中英文标签 |
| 现有爱心粒子 | 保留；HeartParticles 未改 |
| 5 个礼物 | 保留；`gifts:5` |
| 礼物交互 | 保留；qa2 gift lid / open；raycast gift wish |
| 背景音乐 | 保留；qa2 music on/off |
| 45 秒演示 | 保留；`CINEMA_DURATION=45`；qa2 暂停/恢复/replay |
| 浪漫模式 | 保留；qa3 |
| 三档画质 | 保留；smoke 切换三档 |
| 设置持久化 | 保留；F3 新字段通过实测 |
| 完整 Bloom | 保留；`?full=1` pipeline 实测 |

45 秒演示只更新了第三幕文案中的灯数（220 → 360），**没有修改 45 秒长度、镜头数量或章节结构**。

## 5. 交互边界

- 树顶爱心关闭后不再触发“许愿”点击，因为 `ChristmasTree.getPickMeshes()` 会在不可见时排除它。
- 树体亮度只影响树体材质，不改变灯泡亮度；两者是独立控件。
- 双螺旋速度是光带自转/流光速度，不是树体旋转；树体旋转仍是 `treeRotateSpeed`。
- 所有新控件的值都会进入 localStorage；没有新增 UI 假状态。
