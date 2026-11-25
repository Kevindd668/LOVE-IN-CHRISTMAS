# Cinematic Intro 回归报告

> 日志：`qa/f5-*.log`  
> 基线：F4 `21de493` / `f4-accepted`

## 1. 构建

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `npm run build:single` | 通过 |
| `qa/singlefile-test.mjs` | 通过；`?intro=0` 绕过入口，file: 0 failed |

## 2. Intro 专项

| 测试 | 结果 |
| --- | --- |
| `qa/f5-intro-smoke.mjs` | 入口、preflight、阶段运行、0 errors |
| `qa/f5-phases.mjs` | 0.8 / 1.8 / 4.15 / 5.4 / 7.9 / 8s 真实截图 |
| `qa/f5-controls.mjs` | 暂停/继续、跳过、重播、退出、`?intro=0` |
| `qa/f5-performance.mjs` | 1440/1920/4K/full Bloom |
| `qa/f5-video.mjs` | 8s 完整录屏 |

### 控制验证

- 暂停后 `elapsed` 不变；
- 继续后恢复推进；
- 跳过进入 `phase=done`，正式树可见，UI 恢复；
- 重播进入 `awakening`，不重建粒子；
- 退出后 `tree.group.visible=true`，UI 恢复；
- 结束后控制条保留约 6s。

## 3. F3/F4 回归

所有原有脚本使用 `?intro=0` 绕过入口：

| 测试 | 结果 |
| --- | --- |
| smoke | 通过 |
| qa2（45s 演示/礼物） | 通过 |
| qa3（浪漫模式） | 通过 |
| raycast | 通过 |
| mobile | 通过 |
| singlefile | 通过 |

- F3 星空/光瀑/地面/照片/构图未改；
- F4 爱心/520/1314/照片记忆/五礼物/编辑未改；
- 45 秒演示截图与结束状态继续通过；
- 24 张照片、三档画质、F4 本地存储不在本次 Intro 修改范围内。

## 4. 资源与场景

| 项目 | 结果 |
| --- | --- |
| 第二个 Renderer | 无 |
| 第二个 RAF | 无 |
| 第二棵临时树 | 无 |
| 第二个爱心系统 | 无 |
| Intro 粒子 | 20,000 |
| Intro Points/Line/Sprite | 1/1/1 |
| 重播重建 Geometry | 无 |
| dispose | Intro field/UI 有 dispose |
| context lost | 0 |

## 5. 已知边界

- 标题是 DOM，8s 录屏使用 Canvas2D 合成器把 WebGL 与标题合成，以保证标题进入视频；
- 开场只做 8 秒，不实现 60 秒故事；
- 入口默认显示，自动化回归需 `?intro=0`；
- 4K 数据为本机显示上限附近采样，不是所有 GPU 承诺。
