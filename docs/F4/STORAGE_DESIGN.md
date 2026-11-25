# F4 · 本地存储设计

## 1. 默认行为

- 默认：照片只在当前页面有效，刷新后回到内置示例；不上传服务器。
- 内容文字（昵称、承诺、信件、愿望、礼物文案）使用 localStorage `a-christmas-wish.romance.v1` 持久化。
- 照片本地保存默认关闭，必须由作者在 `?edit=1` 中明确开启。

## 2. IndexedDB

| 项 | 值 |
| --- | --- |
| DB | `christmas-wish.memories` |
| 版本 | 1 |
| Store | `photos` |
| keyPath | `id` |
| 字段 | id / name / mime / blob / metadata / order |

`MemoryStorage` 提供：

- `saveAll(records)`
- `loadAll()`
- `clear()`
- `estimate()`

## 3. 保存流程

1. 编辑模式打开“在本机保存照片”；
2. `PhotoManager.getStoredRecords()` 只导出非默认、有 Blob 的照片；
3. 最长边 2000px、JPEG 0.86 规范化；
4. 写入 IndexedDB；
5. 照片元数据随记录写入；
6. 失败/配额不足：保留当前会话，提示“仅本次有效”，不阻塞页面。

## 4. 加载流程

1. 启动时读取 `a-christmas-wish.local-photos.v1`；
2. 为 `1` 时读取 IndexedDB；
3. 若存在保存照片，移除 6 张示例，加载保存照片（最多 24）；
4. 空/失败时使用默认示例。

## 5. 清除

- “清空本机照片”清空 IndexedDB，并把本机保存开关置 0；
- 当前页面照片不被强制删除（由照片管理面板单独删除）；
- 刷新后回到默认示例。

## 6. 验证

`qa/f4-editor-storage.mjs` 已实测：

- 开启保存后刷新，照片数 2、标题/日期/描述/分类完整；
- 昵称“小满”刷新后保留；
- 清空后开关变为 0；
- 正常模式不加载 `#story-editor`；
- 0 console/page error。

## 7. 边界

- IndexedDB 只保证同一设备同一浏览器；不是跨设备同步。
- 跨设备“专属礼物包”未实现，作为 WP6 可选后续能力；不在 F4 核心验收内。
- 不引入服务器、账号、云同步。
