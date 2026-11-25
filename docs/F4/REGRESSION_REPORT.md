# F4 完整回归报告

> 分支：`f4-romance-memory`  
> 最终 standalone SHA-256：`5A5053593E0F436E530A7C08CE6D6FD7625206AA3B088688F63A8895392816F3`  
> 日志：`qa/f4-final-*.log`、`qa/f4-*.log`、`qa/smoke-results.json`、`qa/f4/performance.json`

## 1. 构建

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；chunk size 提示 |
| `npm run build:single` | 通过；1.30MB |
| `qa/singlefile-test.mjs` | 通过；`file:` 协议，0 failed request |

## 2. 自动化

| 测试 | 结果 |
| --- | --- |
| `qa/smoke-test.mjs` | 通过；0 console/page error |
| `qa/qa2.mjs` | 通过；树点击、音乐、45s 演示、暂停/恢复、礼物开盖 |
| `qa/qa3.mjs` | 通过；520/1314、照片、浪漫模式/终章 |
| `qa/raycast-test.mjs` | 通过；照片、礼物、树顶、树体 |
| `qa/mobile-test.mjs` | 通过；390×844 |
| `qa/f4-heart.mjs` | 通过；单击 Gather、双击 Burst、Promise、关闭恢复 idle |
| `qa/f4-memory.mjs` | 通过；24 张、上一张/下一张、关闭恢复 idle |
| `qa/f4-gifts.mjs` | 通过；五礼物五类内容、letter/wishes、finale |
| `qa/f4-editor-storage.mjs` | 通过；昵称/元数据持久化、IndexedDB 刷新恢复、清空、普通模式无编辑器 |
| `qa/f4-performance.mjs` | 通过；5 cases，contextLost=0 |

### 测试适配

- `smoke/qa2/raycast` 的礼物断言从旧 `#wish-overlay` 改为 F4 的 `#story-overlay`；
- 这是 F4 礼物内容升级后的预期行为，产品逻辑没有为“通过旧测试”而保留双重弹窗；
- 树照片/树顶 raycast 仍走生产 `MouseInteraction`；
- 照片默认数量仍为 6，最大 24。

## 3. F3 视觉回归

| 项目 | 结果 |
| --- | --- |
| 星空/星云/极光/光瀑 | 保留 |
| 地面/树体 1.24/爱心 | 保留 |
| 照片初始 6 → 最大 24 | 保留 |
| 5 个礼物 | 保留 |
| 45 秒演示 | 保留；qa2 通过 |
| 浪漫模式 | 保留；qa3 通过 |
| 三档画质 | 通过 |
| 完整 Bloom | 通过 |
| 设置持久化 | 通过 |
| 24 张照片性能 | 122.7 FPS / P95 12.5ms |

## 4. F4 专项

| 项目 | 结果 |
| --- | --- |
| 爱心 10000 粒子 | 保留 |
| Gather/Burst/Promise | 通过 |
| 爱心拾取代理 | 通过 |
| 520/1314 3D 标签 | 保留 |
| 粒子数字 1800 Points | 通过；168.1 FPS |
| 照片标题/日期/描述/分类 | 通过 |
| 相机靠近/恢复 | 通过；关闭后 state=idle |
| 五礼物内容 | 通过 |
| 专属信件 | 通过 |
| 未来愿望 | 通过 |
| 礼物终章 | 通过；未进入 F5 |
| `?edit=1` 编辑器 | 通过 |
| 本机 IndexedDB | 通过；首次保存/刷新恢复/清空 |
| 普通模式无编辑器 | 通过 |

## 5. 明确没有做的事

- 未实现跨设备专属礼物包；这是 WP6 可选后续，IndexedDB 不等于跨设备同步；
- 未实现 F5 的 60 秒电影；
- 未重写 F3 视觉模块或 F2 实验；
- 未修改 `main`、`v1.0.0-baseline`、F0/F1/F2 报告；
- 未新增生产依赖、未升级 Three.js。

## 6. 已知边界

- 24 张照片详情图片较小/投影层面仍可能有轻微卡片重叠；
- 移动端验证布局与交互，不是移动 GPU 性能测试；
- 本机保存只覆盖同一浏览器同一设备；
- 编辑模式是作者入口，不是加密权限系统；
- 粒子数字为非 ASCII 文本时回退到 3D 标签。

## 7. 结论

F4 核心验收项全部通过；F3 视觉、45 秒演示、浪漫模式、五礼物、24 张照片和三档画质未出现阻断级回归。
