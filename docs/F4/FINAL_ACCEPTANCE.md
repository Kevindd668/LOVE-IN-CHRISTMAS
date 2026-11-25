# F4 最终自检与验收清单

> 状态：**F4 WP0–WP6 已通过用户验收，已合并到 `feature/visual-upgrade`。**  
> F5 未开始。  
> 最终 standalone SHA-256：`5A5053593E0F436E530A7C08CE6D6FD7625206AA3B088688F63A8895392816F3`

## 1. 基线

- 从 `feature/visual-upgrade` / F3 `ba1ed8d` / `f3-accepted` 分支创建 `f4-romance-memory`；
- 未修改 `main`、`v1.0.0-baseline`、F2 五个实验、F3 视觉模块；
- 继续使用 Three.js 0.160.0、单一 Renderer/RAF，无新增生产依赖。

## 2. 工作包

| 工作包 | 内容 | 结果 |
| --- | --- | --- |
| WP0 | 内容模型、照片元数据、状态管理器、编辑门禁 | 完成 |
| WP1 | 爱心 Gather/Burst/Promise | 完成 |
| WP2 | 520/1314 3D + 1800 粒子模式 | 完成 |
| WP3 | 照片记忆详情、相机恢复、上一张/下一张 | 完成 |
| WP4 | 五个礼物五种内容 | 完成 |
| WP5 | `?edit=1`、IndexedDB、清空 | 完成 |
| WP6 | 性能、回归、截图、录屏、文档 | 完成 |

## 3. 功能验收

### 爱心

- 保留 `HeartParticleSystem` 10000 粒子能力；
- 单击 Gather、双击 Burst、“爱的约定”Promise；
- 拾取代理正常；关闭后 `state=idle`；
- 没有重建 Geometry/Shader；
- 真实录屏：`docs/F4/final-video.webm`。

### 520/1314

- 3D 数字保留并可编辑；
- Idle 安静；
- 粒子模式 1800 Points，显示 520 / 1314 / 520 ♡ 1314；
- 1440×900 168.1 FPS，P95 8.5ms；
- 截图：`docs/F4/screenshots/03-love-numbers.png`。

### 照片记忆

- 初始 6 → 最大 24；
- 标题、日期、描述、分类可编辑；
- 详情可进/退/上一张/下一张/自动播放；
- 相机保存/恢复，场景不重建；
- 24 张详情测试通过；
- 截图：`docs/F4/screenshots/04-memory.png`。

### 五个礼物

- 仍为 5 个礼物盒；
- 五类内容：照片 / 相册 / 信件 / 未来约定 / 终章；
- 开盖、粒子、raycast 保留；
- 终章只做单次爱情高潮，不是 F5；
- 截图：`docs/F4/screenshots/05-gift-1.png` 至 `05-gift-5.png`。

### 编辑与存储

- 普通模式不创建 `#story-editor`；
- `?edit=1` 显示“我们的故事”；
- 昵称、承诺、信件、愿望、5 个礼物文案可编辑；
- 每张照片 title/date/description/category 可编辑；
- IndexedDB 默认关闭；开启后刷新恢复；
- 清空按钮可用；
- 跨设备礼物包未实现，列为可选后续；
- 截图：`docs/F4/screenshots/06-editor.png`。

## 4. 性能

| Case | FPS | P95 |
| --- | ---: | ---: |
| 1440×900 默认 | 193.0 | 8.4ms |
| 3840×2160 默认 | 146.0 | 12.5ms |
| 1440×900 完整 Bloom | 184.1 | 8.4ms |
| 1440×900 24 张照片 | 122.7 | 12.5ms |
| 1440×900 爱情数字 | 168.1 | 8.5ms |

全部 `contextLost=0`，0 console/page error。详见 `PERFORMANCE_REPORT.md`、`qa/f4/performance.json`。

## 5. 回归

| 测试 | 结果 |
| --- | --- |
| typecheck/build/build:single | 通过 |
| smoke | 通过 |
| qa2（45s demo/礼物） | 通过 |
| qa3（浪漫模式） | 通过 |
| raycast | 通过 |
| mobile | 通过 |
| singlefile | 通过 |
| f4-heart | 通过 |
| f4-memory | 通过 |
| f4-gifts | 通过 |
| f4-editor-storage | 通过 |
| f4-performance | 通过 |

## 6. 交付

```text
docs/F4/
├── README.md
├── HEART_INTERACTION.md
├── LOVE_NUMBERS.md
├── MEMORY_SYSTEM.md
├── GIFT_INTERACTION.md
├── STORAGE_DESIGN.md
├── CONTENT_MODEL.md
├── EDITOR_MODE.md
├── PERFORMANCE_REPORT.md
├── REGRESSION_REPORT.md
└── FINAL_ACCEPTANCE.md

docs/F4/screenshots/
├── 01-overall.png
├── 02-promise.png
├── 03-love-numbers.png
├── 04-memory.png
├── 05-gift-1.png … 05-gift-5.png
└── 06-editor.png

docs/F4/final-video.webm
Christmas-Wish.html
```

所有截图均来自真实 Edge/WebGL；录屏为 Canvas `captureStream + MediaRecorder`。

## 7. 已知边界

- 跨设备礼品包未实现；IndexedDB 仅同设备同浏览器；
- 24 张照片在极端投影下仍可能有轻微卡片重叠；
- 粒子数字仅支持数字/空格，其他文本回退到 3D 标签；
- 移动端验证布局/交互，不是移动 GPU 性能；
- F5 未开始。

## 8. 结论

F4 的爱心、数字、照片记忆、五个礼物、编辑与本地存储均完成并通过自动化验证；F3 视觉未回退。已通过用户验收并合并到 `feature/visual-upgrade`；F5 尚未开始。
