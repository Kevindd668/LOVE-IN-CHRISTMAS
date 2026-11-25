# F3 完整功能回归报告

> 分支：`f3-ground-composition`  
> 最终 standalone SHA-256：`06F00FDDD8640A97568548F3385949751C4DD76C6CC86BECDA326ADD64F9DE49`  
> 日志：`qa/f3-final-*.log`、`qa/smoke-results.json`、`qa/f3-final/performance.json`

## 1. 构建

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；仅 chunk size 提示 |
| `npm run build:single` | 通过；`Christmas-Wish.html` 1.26MB |
| `qa/singlefile-test.mjs` | 通过；`file:` 协议，0 failed requests |

## 2. 自动化交互

| 测试 | 结果 |
| --- | --- |
| `qa/smoke-test.mjs` | 通过；console/page errors 空 |
| `qa/raycast-test.mjs` | 通过；照片、礼物、树顶 star、树体 raycast |
| `qa/qa2.mjs` | 通过；树点击、音乐、45s demo 暂停/恢复/replay、礼物开盖 |
| `qa/qa3.mjs` | 通过；520/1314、照片控件、浪漫模式/终章 |
| `qa/mobile-test.mjs` | 通过；390×844 面板/许愿框在视口内 |
| `qa/wp3-photo-counts.mjs` | 通过；6/8/12/24 张，左右数量正确 |
| `qa/f3-final-performance.mjs` | 通过；7 cases，contextLost=0 |

### 对 QA 的必要适配

- `smoke-test` 的默认照片数改为动态读取（当前初始 6 张），不再硬编码 10；
- `raycast-test` 的树顶坐标改用 `getWorldPosition()`，适配 WP5 的树体 1.24 倍缩放；产品代码未为通过测试而改；
- 照片数量/卡片布局仍走真实 UI 上传/替换/删除/排序路径。

## 3. F3 视觉模块回归

| 模块 | 结果 |
| --- | --- |
| WP1 星空/银河/星云/极光/流星 | 保留；截图 `final-screenshots/02-03` |
| WP2 四条光瀑 | 保留；截图 `final-screenshots/04` |
| WP3 照片轨道 | 初始 6（左3/右3）→8（4/4）→12（6/6）→24（12/12） |
| WP4 地面 | 地面色、雪斑、冰晶、低空微光、环形光；三档画质 |
| WP5 树体 | 1.24 倍；树顶/底部完整；520/1314/爱心构图 |
| 5 个礼物 | 保留；位置外扩 1.2，raycast 通过 |
| 520 / 1314 | 保留；随树体比例缩放 |
| 巨型爱心 | 保留 10000 粒子能力；位置调整后不遮树 |
| 45 秒演示 | 保留；qa2 通过 |
| 浪漫模式 | 保留；qa3 通过 |
| 三档画质 | 通过；地面细节/照片/星数按档位变化 |
| 完整 Bloom | `?full=1` 通过；4K 性能 111.6 FPS |
| 设置持久化 | 通过 smoke/qa3 |
| 资源释放 | 新增地面 group 有 dispose；无环境重复创建 |

## 4. 照片边界

- 初始 6 张：左 3 / 右 3；
- 8 张：左 4 / 右 4；
- 12 张：左 6 / 右 6；
- 24 张：左 12 / 右 12；
- 上传、替换、删除、排序仍使用原 PhotoManager；
- 照片轨道半径在 WP5 中整体 ×1.16，数量/左右分配算法未改；
- 24 张时 draw calls 459，性能仍高于 60 FPS。

## 5. 明确没有做的事

- 未修改照片存储机制、未引入 IndexedDB；
- 未修改礼物数量（仍 5 个）；
- 未修改 45 秒演示时长；
- 未开发 F4 的照片记忆/爱情交互/礼物内容；
- 未开发 F5 的 60 秒电影；
- 未修改 `main`、`v1.0.0-baseline`、F0/F1/F2 报告、`experiments/01…05`；
- 未新增生产依赖、未升级 Three.js。

## 6. 已知边界

- 24 张照片在外侧弧形区域仍可能出现投影层面的轻微边缘重叠；已通过 1.16 轨道外扩和 0.74 卡片密度缩放降低；
- 移动端只验证布局和交互，不是移动 GPU 性能测试；
- 地面“反射”仍是 CanvasTexture 模拟反射，不是 SSR/镜面；
- 性能数据仅代表本机 Edge + RTX 3070 Ti Laptop。

## 7. 结论

F3 WP1–WP6 未发现阻断级回归。树、星空、光瀑、照片、地面、构图、礼物、45 秒演示、浪漫模式、三档画质、完整 Bloom 和 standalone 均可运行；无 console/page error 或 context lost。
