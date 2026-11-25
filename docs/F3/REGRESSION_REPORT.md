# F3 功能回归报告

## 1. 门禁与构建

| 测试 | 结果 | 证据 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | 无 TS 错误 |
| `npm run build` | 通过 | 54 modules；仅 chunk >500kB 提示 |
| `npm run build:single` | 通过 | `Christmas-Wish.html` 1.23MB；父目录同一文件 |
| `qa/smoke-test.mjs` | 通过 | `qa/smoke-results.json`；console/page errors 空 |
| `qa/raycast-test.mjs` | 通过 | 照片、礼物、树顶 star、树体 raycast probe 全部命中；0 errors |
| `qa/qa2.mjs` | 通过 | 树点击、音乐、demo 暂停/恢复/replay、礼物开盖；0 errors |
| `qa/qa3.mjs` | 通过 | 中英文标签、照片控件、浪漫模式/终章；0 errors |
| `qa/mobile-test.mjs` | 通过 | 390×844 面板/许愿框均在视口；0 errors |
| `qa/singlefile-test.mjs` | 通过 | `file:` 协议；0 errors；0 failed requests |
| `qa/f3-performance.mjs` | 通过 | 5 cases；`contextLost=0` |
| `qa/f3-controls.mjs` | 通过 | 14 个树体控件、灯光配额、持久化、内存稳定性 |

> 只对 QA 脚本做了必要的 F3 默认值/机位适配：smoke 的默认高度 9.5、灯数 360；raycast 的树体探针改为对新相机 framing 的屏幕列做真实 raycaster probe。产品逻辑未为通过测试而修改。

## 2. 树体专项

- 默认树高/半径/层数：9.5 / 3.0 / 9。
- 树干：1.0 / 0.22（代码固定）。
- 双螺旋：9 圈、两条独立曲线、宽度 0.035、颜色正确、开关/速度/相位真实生效。
- 灯泡：360 颗，精确 162/90/54/54；单一 Points shader，非 360 个真实光源。
- 爱心装饰：48 颗，4 个 InstancedMesh，开关生效。
- 树顶水晶爱心：可见、点击仍触发 star blessing；关闭开关后从 pick meshes 排除。
- 亮度、旋转、树叶颜色、灯光亮度/闪烁速度均有状态与场景侧证据。

## 3. 现有功能回归

| 功能 | 结果 |
| --- | --- |
| 照片上传 | 通过（smoke 上传 2 张，count/label/rows 一致） |
| 照片替换 | 通过（smoke 文件 chooser 替换为 3.jpg） |
| 照片删除/排序 | 通过（smoke 删除/移动） |
| 照片轨道 | 未改 PhotoOrbit；smoke/qa3 通过 |
| 520 / 1314 | 通过（qa3 中英文标签） |
| 现有爱心粒子 | 未改 HeartParticles；q3 中 heartMode 通过 |
| 5 个礼物 | 保留；control-results gifts=5；qa2 礼物开盖 |
| 礼物 raycast | 通过 |
| 背景音乐 | 通过（qa2 开/关，AudioContext running） |
| 45 秒演示 | 保留 `CINEMA_DURATION=45`；qa2 暂停/恢复/replay/结束 |
| 浪漫模式 | 通过；qa3 启动/终章/退出 |
| 三档画质 | 通过；smoke 切换 balanced/performance/ultra；灯数仍 360 |
| 设置持久化 | 通过；treeHeight=9.7 刷新后仍为 9.7 |
| 完整 Bloom | 通过；`?full=1`，`pipeline=true` |
| 资源释放 | 连续四次重建 geometry/texture 195/33 不变；新模块有 dispose |
| WebGL context | 性能 5 cases `contextLost=0` |

## 4. 明确没有做的事

- 未修改照片存储机制/照片 API。
- 未改礼物数量（仍 5 个）。
- 未把 45 秒演示改成其他时长；仅第三幕文案灯数 220→360。
- 未开发 F4/F5 的巨型爱心粒子系统或其他阶段功能。
- 未改 main / `v1.0.0-baseline` / F0/F1/F2 报告。
- 未新增生产依赖、未引入 GSAP、未升级 Three.js。

## 5. 已知回归边界

- qa3 的 `skyTop` 在深色背景下被现有测试记录为 `000000`（颜色空间/取色路径问题），未作为 F3 新增断言；背景光和 `backgroundColor` 均通过设置项验证。
- `qa/raycast-test` 的树体点击改为 raycaster probe（生产 MouseInteraction 使用同一个 raycaster），未直接触发 `onPick` 的 point-bloom；树点击行为仍由 qa2 的真实点击覆盖。
- 移动端只验证布局与许愿框，不是移动 GPU 性能测试。

## 6. 结论

F3 未发现阻断级功能回归；现有照片、礼物、音乐、45 秒演示、暂停/恢复、浪漫模式、三档画质、持久化和完整 Bloom 均保留可运行。详细原始日志位于 `qa/f3-*.log`、`qa/smoke-results.json`、`qa/f3/*.json`。
