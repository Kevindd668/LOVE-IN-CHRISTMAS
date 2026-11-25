# Regression Report

> 所有回归使用 `?intro=0` 绕过 F5 完整电影；不修改 F3/F4 行为。

## 1. 运行结果

| 测试 | 结果 |
| --- | --- |
| `qa/smoke-test.mjs` | 通过，0 console/page error |
| `qa/qa2.mjs`（45 秒演示/礼物） | 通过 |
| `qa/qa3.mjs`（浪漫模式/finale） | 通过 |
| `qa/raycast-test.mjs` | 通过 |
| `qa/mobile-test.mjs` | 通过 |
| `qa/f4-heart.mjs` | 通过 |
| `qa/f4-memory.mjs` | 通过 |
| `qa/f4-gifts.mjs` | 通过 |
| `qa/f4-editor-storage.mjs` | 通过 |
| `qa/f4-storage.mjs` | 通过 |
| `qa/f4-smoke.mjs` | 通过；照片/编辑/礼物显示正常 |
| `qa/f4-heart-gifts.mjs` | 通过；五个礼物、单双击爱心正常 |
| `qa/singlefile-test.mjs` | 通过；`file:`、0 failed、0 console errors |

## 2. 覆盖

- 照片上传/替换/删除/排序/记忆；
- 五个礼物盒及交互；
- 520 / 1314；
- 巨型爱心聚合/爆散；
- 双螺旋、灯光、树顶；
- 星空、光瀑、轨道、雪；
- 背景音乐；
- 45 秒旧演示；
- 浪漫模式；
- 三档画质；
- 设置持久化；
- 隐私/存储；
- 单文件离线。

## 3. 修复的回归问题

在 F5 HUD 初次接入后，`FilmPlaybackUI` 虽然视觉隐藏，但仍以 `visibility` 未隐藏状态覆盖普通页面，导致 `qa/qa3.mjs` 点击 `#btn-romance` 被 `.film-buttons` 拦截。

修复：

```css
.film-playback {
  visibility: hidden;
  pointer-events: none;
}
.film-playback.is-open {
  visibility: visible;
}
```

修复后 `qa3` 通过，普通 F4 UI 点击恢复。

## 4. 结论

未发现 F0–F4 功能回归。完整电影隐藏时不得拦截普通 UI；该问题已真实复现并修复。
