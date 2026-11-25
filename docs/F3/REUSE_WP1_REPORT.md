# WP1 · Heart-Star 心形几何复用报告

> 分支：`f3-reuse`  
> 基线：`feature/visual-upgrade` / F3 `d9954c3` / 文档 `9b2e54c`  
> 状态：**WP1 已实现、已测试、已 A/B；未合并到 `feature/visual-upgrade`。**

## 1. 授权与来源

- 作者：Saklin Ali
- 仓库：https://github.com/saklincodes/Heart-Star
- 固定提交：`9317aeb`
- 原始文件：`Heart-Star/geometry.js`
- 授权：五位参考仓库作者已授权本项目直接复制、复用、修改其代码，使用保留作者署名与来源。

复制内容：

- `sampleHeart(t)`
- `sampleStar(t)`
- `jitter(point, strength, rng)`

新增文件：`src/objects/reuse/heartGeometry.ts`

归一化辅助：

- `createHeartOutline({ width, height, samples })`
- `createHeartShape(...)`

文件头保留了作者、仓库 URL、commit、授权来源。

## 2. 代码改动

| 文件 | 改动 |
| --- | --- |
| `src/objects/reuse/heartGeometry.ts` | 新增；复制 Heart-Star 三个几何函数；加入归一化 outline/shape |
| `src/objects/TreeHeartOrnaments.ts` | 48 爱心轮廓改为 Heart-Star `sampleHeart`；保留 4 材质、4 InstancedMesh、48 数量、悬浮/自转、开关 |
| `src/objects/TreeStar.ts` | 水晶心 ring 和 inner heart 改用共享 heart outline/shape；保留 0.95×0.85×0.22、材质、halo、sparkles、pickType='star' |

未改动：

- 9 层树体；
- 双螺旋；
- 360 灯泡；
- 展示台；
- 照片/礼物/音乐/45 秒演示/浪漫模式/三档画质；
- 无新增生产依赖。

## 3. A/B 截图

全部位于 `docs/F3/reuse-screenshots/`：

- [正面全景 A/B](reuse-screenshots/compare-01-front.png)
- [48 爱心近景 A/B](reuse-screenshots/compare-07-heart-ornaments-close.png)
- [水晶心近景 A/B](reuse-screenshots/compare-08-crystal-heart-close.png)
- [纯树体 A/B](reuse-screenshots/compare-10-pure-tree.png)

单侧 after 图也在同目录：

- `after-01-front.png`
- `after-07-hearts-close.png`
- `after-08-crystal-close.png`
- `after-10-pure-tree.png`

### 视觉结论

- 48 爱心轮廓改为经典参数式心形，轮廓清晰，未出现穿模；
- 水晶心是标准心形，仍保持精确尺寸和 3D 前后切面结构；
- 与旧版相比，新水晶心的切面高光更平滑，**内部切面线不如旧版明显**；
- 树体、双螺旋、360 灯和底座未受影响。

因此建议：

1. 48 爱心轮廓保留新实现；
2. 水晶心是否保留新轮廓，请以 A/B 图确认；如果更偏好旧版更明显的切面，可以只回滚 `TreeStar` 的 profile，保留 48 爱心复用。

## 4. 几何/交互检查

| 项 | 结果 |
| --- | --- |
| 48 爱心数量 | 48（4 × 12） |
| 爱心 InstancedMesh | 4 个 |
| 水晶心 bbox | `[-0.475, -0.425, -0.11]` → `[0.475, 0.425, 0.11]` |
| 水晶心尺寸 | 0.95 × 0.85 × 0.22 |
| 水晶心 pickType | `star` |
| 点击树顶许愿 | raycast 通过 |
| draw calls | 291（与基线一致） |
| triangles | 460,438（基线 461,210，WP1 少 772） |

## 5. 性能

数据：`qa/f3-reuse/performance.json`；基线：`qa/f3-reuse/baseline-performance.json`。

| Case | Before FPS | After FPS | Before P95 | After P95 | Calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440×900 兼容 | 95.4 | 217.5 | 16.9 ms | 8.3 ms | 291 |
| 1920×1080 兼容 | 113.2 | 238.0 | 16.6 ms | 4.3 ms | 291 |
| 4K 等效 | 80.6 | 209.5 | 25.0 ms | 8.4 ms | 291 |
| 1440×900 Bloom | 100.2 | 209.8 | 16.6 ms | 8.4 ms | 305 |
| 1920×1080 Bloom | 89.2 | 238.5 | 16.9 ms | 4.3 ms | 305 |

说明：

- 本轮测量 hit 240Hz 上限，FPS/P95 绝对值受窗口焦点和刷新率影响；
- 结论以 **draw calls 不变、triangles 略降** 为主；
- 未发现性能回退；
- 完整 4K 数值仍记录在 `qa/f3-reuse/performance.json`。

## 6. 回归

全部通过：

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `npm run build:single` | 通过 |
| `qa/smoke-test.mjs` | 通过，0 error |
| `qa/raycast-test.mjs` | 通过（含 star/tree probe） |
| `qa/qa2.mjs` | 通过 |
| `qa/qa3.mjs` | 通过 |
| `qa/mobile-test.mjs` | 通过 |
| `qa/singlefile-test.mjs` | 通过，file://，0 failed request |

日志：

- `qa/f3-reuse-smoke.log`
- `qa/f3-reuse-raycast.log`
- `qa/f3-reuse-qa2.log`
- `qa/f3-reuse-qa3.log`
- `qa/f3-reuse-mobile.log`
- `qa/f3-reuse-singlefile.log`
- `qa/f3-reuse/performance.log`

## 7. 产物

WP1 分支 standalone：

- `Christmas-Wish.html`
- SHA-256：`9567BFF024BF68C6EC37BF8B8C0082C063E48E58835E22A8EBEB220320909883`
- 基线 F3 standalone：`32A1DB7C...`（保留在 `feature/visual-upgrade`）

## 8. 合并状态

**未合并到 `feature/visual-upgrade`。**

等待确认：

1. 是否接受 48 爱心 + 水晶心都使用 Heart-Star 轮廓？
2. 或只保留 48 爱心复用、水晶心回滚旧版切面？
3. 接受后再决定是否将 `f3-reuse` 合并到正式分支。

WP2/WP3/后续 WP 未开始。
