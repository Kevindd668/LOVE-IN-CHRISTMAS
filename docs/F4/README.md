# F4 · LOVE IN CHRISTMAS 爱情与记忆系统

> 分支：`f4-romance-memory`  
> 基线：F3 `ba1ed8d` / 标签 `f3-accepted`  
> 状态：**WP0–WP6 已通过用户验收，已合并到 `feature/visual-upgrade`。**  
> F5 未开始。  
> 最终 standalone SHA-256：`5A5053593E0F436E530A7C08CE6D6FD7625206AA3B088688F63A8895392816F3`

## 目标

F4 不重做 F3 的圣诞树、星空、光瀑、地面、爱心和照片轨道，而是在现有场景上增加：

- 巨型爱心 Gather / Burst / Promise；
- 520 / 1314 的安静常驻、交替和爱情模式；
- 照片标题、日期、描述、分类与相机记忆详情；
- 五个礼物对应五种独立内容；
- `?edit=1` 专属编辑模式和可选 IndexedDB 本地保存。

## 七个工作包

| 工作包 | 内容 | 状态 |
| --- | --- | --- |
| WP0 | 内容模型、照片元数据、状态管理、编辑门禁 | 完成 |
| WP1 | 爱心 Gather / Burst / Promise | 完成 |
| WP2 | 520/1314 3D + 粒子模式 | 完成 |
| WP3 | 照片记忆详情、相机恢复、上一张/下一张 | 完成 |
| WP4 | 五个礼物五种内容 | 完成 |
| WP5 | 编辑模式、IndexedDB、本机清除 | 完成 |
| WP6 | 性能、回归、截图、录屏、文档 | 完成 |

## 快速验收

```text
正常观看：http://127.0.0.1:4173/
作者编辑：http://127.0.0.1:4173/?edit=1
```

正常观看：

- 点击右侧巨型爱心：Gather；
- 双击爱心：Burst；
- 点击面板“爱的约定 · 520 ♡ 1314”：Promise；
- 点击照片：相机靠近并显示标题/日期/描述；
- 点击五个礼物：照片、相册、信件、愿望、终章。

编辑模式：

- 昵称、承诺、信件、愿望、五个礼物文案；
- 每张照片的标题、日期、描述、分类；
- “在本机保存照片”开关；
- 清空本机照片。

## 文档

- [爱心交互](HEART_INTERACTION.md)
- [爱情数字](LOVE_NUMBERS.md)
- [照片记忆](MEMORY_SYSTEM.md)
- [五个礼物](GIFT_INTERACTION.md)
- [本地存储](STORAGE_DESIGN.md)
- [内容模型](CONTENT_MODEL.md)
- [编辑模式](EDITOR_MODE.md)
- [性能](PERFORMANCE_REPORT.md)
- [回归](REGRESSION_REPORT.md)
- [最终验收](FINAL_ACCEPTANCE.md)

## 资产

- 真实截图：`docs/F4/screenshots/`
- 真实录屏：`docs/F4/final-video.webm`
- 性能原始数据：`qa/f4/performance.json`
- F4 测试：`qa/f4-heart.mjs`、`qa/f4-memory.mjs`、`qa/f4-gifts.mjs`、`qa/f4-editor-storage.mjs`、`qa/f4-performance.mjs`

## 边界

- 正常模式默认收起控制面板；编辑功能只通过 `?edit=1` 显示。
- 照片默认临时保存在当前页面；开启“在本机保存照片”后才写 IndexedDB。
- 跨设备礼物包未实现，属于 WP6 可选后续能力；IndexedDB 不等于跨设备同步。
- 不修改 F3 视觉模块、F2 实验、`main`、`v1.0.0-baseline`。
- 不进入 F5 的 60 秒电影。
