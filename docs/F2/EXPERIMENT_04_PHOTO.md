# 实验 04 · 我们的照片记忆

路径：`experiments/04-photo-memory/`  
入口：`http://127.0.0.1:8787/04-photo-memory/`

## 目标

把真实本地照片变成可以在 3D 轨道中旋转、排序、放大和管理的记忆卡片。重点是交互闭环，不是静态画廊。

## 来源与实现

| 项 | 内容 |
| --- | --- |
| 参考 | `Immersive-Photo-Gallery`（MIT，main `c862c70`）；`Christmas-Tree-Photos`（main `b5f4870`；作者已授权本项目直接复用） |
| 参考内容 | 3D 轨道、聚焦、本地文件处理、照片记忆交互 |
| 实际实现 | 独立 Canvas/Three.js：卡片、上传、替换、删除、排序、相机聚焦、IndexedDB 实验入口 |
| 第三方素材 | 无；12 张初始图由 Canvas 生成，QA 上传图在 `qa/placeholders/` |

实现要点：

- 12 张初始照片，最多 24 张；照片只在本地内存处理。
- 三层轨道，默认半径 4.2 / 5.2 / 6.2；三层独立速度。
- 实体卡片：1.3 × 1.7 × 0.04，奶油 matte + 金色背板；图片贴图、文字/日期贴图。
- 卡片始终朝向相机；三层轨道独立旋转。
- 点击卡片：相机推近；其他照片降透明度；显示标题/日期详情层；隐藏轨道线避免近距离横带；关闭时恢复。
- 上传/替换：`URL.createObjectURL` + `TextureLoader`；删除时释放 texture 与 object URL。
- 排序：上下移动即改变轨道分配与排版。
- IndexedDB：仅实验入口；用户主动点击保存/读取，保存上传文件的 Blob 与元数据，不自动运行。
- 参数：三层半径/速度、卡片尺寸、文字/日期开关、相机环绕、Bloom。

## 真实浏览器验证

验证环境：Edge 158，1440×900；脚本 `qa/lab4-actions.mjs`。

| 步骤 | 结果 |
| --- | --- |
| 初始 | 12 张，12 行列表 |
| 上传 8 张真实 JPG | 20 张，20 行；第一张上传文件名 `1.jpg` |
| 替换第 13 张 | 文件名变为 `3.jpg`，数量仍 20 |
| 删除第 14 张 | 19 张，19 行 |
| 下移第一张 | 顺序变为 `memory-02.jpg`, `memory-01.jpg` |
| 点击 3D 卡片 | 聚焦成功，详情层打开，`focused` 为照片 id |
| 补足 | 24 张、24 行；116 draw calls |
| 控制台 | 0 错误 |

截图（`experiments/04-photo-memory/screenshots/`）：

`overall-12.png`、`uploaded-20.png`、`focus-detail.png`、`stress-24.png`、`controls-and-library.png`、`photo-library.png`。

## 已知限制

- 24 张时轨道卡片会互相遮挡，这是容量压力测试的预期结果；不是最终布局优化版。
- 示例照片是程序化占位图，不是真实情侣照片；真实上传已验证。
- IndexedDB 是实验能力，未接入正式产品；未在正式页面写入任何持久化数据。
- 没有 EXIF 方向/裁剪处理；本轮只验证常见 JPG/PNG/WEBP 读取与纹理更新。
