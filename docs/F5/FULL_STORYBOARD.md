# 68 秒完整分镜

## 0–8 秒：Cinematic Intro

现有 8 秒开场，原文件、标题、20k 粒子、爱心、正式树交接保留。WP2 证据见 `docs/F5/INTRO_STORYBOARD.md`。

## 8–18 秒：The Tree Wakes

- 8.0–8.6 秒：从开场灯光状态极短收束，避免生硬切光；
- 8.6–10 秒：下层灯光；
- 10–13 秒：中层灯光；
- 13–15 秒：上层灯光；
- 15–17 秒：树顶；
- 17–18 秒：双螺旋、挂饰、星芒完全点亮。
- 相机：Dolly In → Orbit → Crane Up → Focus Pull。
- 文案：`THE TREE WAKES` / `一盏一盏，把冬天点亮。`

## 18–30 秒：A Heart For You

- 18–22 秒：正式巨型爱心从散点到心形聚合；
- 22–24.5 秒：心跳；
- 24.5 秒：玫瑰金冲击波 + 爆散；
- 27.5 秒：重新聚合；
- 28–30 秒：爱心回稳，接照片。
- 相机：Dolly In → Orbit → Dolly Out → Focus Pull。
- 不创建新爱心。

## 30–42 秒：Our Moments

- 30–34 / 34–38 / 38–42 秒：三张照片。
- 优先从 `PhotoManager.views` 读取最多 3 张非默认真实照片；不足时补足现有默认卡片，并明确标“示例记忆”。
- 使用 `setMemoryMode` 冻结轨道、聚焦卡片，字幕读取 `metadata.title/date/description`。
- 不虚构用户回忆，不打开 F4 记忆灯箱。
- 相机：Focus Pull / Orbit / Focus Pull。

## 42–52 秒：520 / 1314

- 42–44 秒：520 显现；
- 46–50 秒：1314 显现；
- 50–52 秒：组合展示。
- 使用正式 `RomanticText`；`LoveNumbersController` 只用 idle 脉冲，不覆盖 reveal。
- 相机：Crane Up → Fly Through → Dolly Out。

## 52–62 秒：Our Christmas

- 树、爱心、照片、礼物、雪、星云、520/1314 同框；
- 相机：Orbit → Dolly Out。

## 62–68 秒：Final Confession

- 最终告白使用 `settings.blessingTitle / blessingMessage / signature`；
- 相机：Focus Pull → Dolly In；
- 68 秒结束，恢复正式场景和普通 UI；
- 结束后保留完整重播/退出。

## 边界处理

- 8 秒开场不重做；开场结束后树已较亮，完整电影用 0.6 秒极短重灯进入 8–18 秒逐层点亮；历史 8 秒视频不覆盖。
- 所有章节从绝对时间采样，跳转后不依赖尚未播放的增量事件。
