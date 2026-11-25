# F4 · 内容模型

## 1. RomanceContent

```ts
interface RomanceContent {
  version: 1;
  nickname: string;       // ≤16
  promise: string;        // ≤160
  letter: string;         // ≤500
  wishes: string[];       // 3–5 条，每条 ≤80
  giftMessages: [string, string, string, string, string]; // 每条 ≤160
}
```

存储：`localStorage['a-christmas-wish.romance.v1']`。

## 2. 照片元数据

```ts
interface PhotoMetadata {
  title: string;
  date: string;
  description: string;
  category: 'meeting' | 'memory' | 'future';
}
```

- 旧 `caption` 兼容为标题。
- 日期仅接受 `YYYY-MM-DD` 或空。
- 分类默认 `memory`；旧照片按前 3 张 `meeting`、其余 `memory` 初始化。

## 3. 迁移

- 没有 romance key 时，读取旧 `a-christmas-wish.settings.v1` 的 `giftMessage0..2` 填入前三个礼物文案；
- 其余使用 F4 默认值；
- 旧 `caption` → 标题；
- 不修改旧 settings key。

## 4. Gifts

固定 5 个礼物索引：

```text
0 photo
1 album
2 letter
3 promises
4 finale
```

内容不写死在礼物盒对象内；由 `GiftContentManager` 从内容存储和照片列表组合。

## 5. 约束

- 照片最多 24 张；
- 礼物固定 5 个；
- 不把示例文字冒充真实回忆；
- 所有编辑内容在刷新时由 localStorage/IndexedDB 恢复（按保存开关）。
