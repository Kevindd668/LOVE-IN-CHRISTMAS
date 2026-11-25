# F4 · 五个礼物

## 1. 保留

- 现有 5 个 `GiftBoxes`、开盖动画、hover、raycast、位置和数量都不变。
- 没有新增礼物盒，也没有改成 3 个。
- `GiftInteraction` 继续负责开盖和粒子爆发。

## 2. 五类体验

| 礼物 | 类型 | 内容 |
| --- | --- | --- |
| 礼物一 | photo | 第一张照片 + 标题/日期/描述 |
| 礼物二 | album | 第 2–6 张照片的简短相册，可上一张/下一张 |
| 礼物三 | letter | 可编辑的专属信件，珍珠白/玫瑰金排版 |
| 礼物四 | promises | 未来愿望卡片列表 |
| 礼物五 | finale | 爱心 Gather + 520/1314 + 最终祝福 |

## 3. 路由

```text
GiftInteraction.handle(index)
  → 开盖/粒子
  → main.handleGiftOpened(result)
  → 420ms 后 GiftExperienceViewer.open(index)
  → 五类 StoryOverlay
```

- 不再统一弹旧的 `wish-overlay`；旧的 star blessing / romance 仍使用 `wish-overlay`。
- 礼物详情关闭后恢复 `state=idle`，爱心回到 Idle，数字回到 Idle。
- 礼物五不进入 F5 的 60 秒电影。

## 4. 内容编辑

`StoryEditor` 编辑：

- 五个礼物文案；
- 信件正文；
- 未来愿望（每行一条）；
- 照片标题/日期/描述/分类，供礼物一/二使用。

## 5. 截图

- `docs/F4/screenshots/05-gift-1.png` 至 `05-gift-5.png`
