# F0 · 回归检查清单

**基线：** `v1.0.0-baseline` / `c9e3d02`  
**用途：** F0 验收、F3–F5 每次改动后的回归门禁  
**原则：** 任何现有业务功能退化均为阻断项；不能用“视觉升级”为理由删除交互。

---

## 1. 基线与交付完整性（P0）

| ID | 检查项 | 方法 | 通过标准 | 频率 |
|---|---|---|---|---|
| BASE-01 | 基线 commit / tag 存在 | `git rev-parse v1.0.0-baseline` | 指向 `c9e3d02` | 每阶段开始/结束 |
| BASE-02 | 开发分支正确 | `git branch --show-current` | `feature/visual-upgrade`（或经批准的后续分支） | 每阶段 |
| BASE-03 | 正式单文件可运行 | 双击/`file://` 打开 | `ready=true`，无 console/page error | 每次构建 |
| BASE-04 | 单文件无外部依赖 | 捕获请求 | 仅一个 `file:///...Christmas-Wish.html`，无 CDN/字体/音频请求 | 每次构建 |
| BASE-05 | 正式业务源码无意外改动 | `git diff --stat` 对照文档变更 | 业务源码差异必须属于本阶段批准范围 | 每阶段 |
| BASE-06 | 备份未损坏 | 校验 zip 可解压、SHA-256 | 与 `BASELINE.md` 一致 | F0 / 阶段末 |

---

## 2. 必须保留的业务功能（P0 阻断）

### 2.1 照片与记忆

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| PHOTO-01 | 打开面板 → 04 我们的照片 | 默认显示 8 张占位照片、3 条轨道 | smoke / visual |
| PHOTO-02 | 选择 2 张 JPG/PNG/WEBP 上传 | 8 → 10 张；3D 场景与列表同步；有提示 | smoke-test |
| PHOTO-03 | 上传非法格式 / >30MB / 超过 24 张 | 拒绝并给出提示，不崩溃 | 手工 + 单元边界 |
| PHOTO-04 | 修改某张照片文字 | 3D 卡片 caption 同步，刷新设置后保留 | smoke-test |
| PHOTO-05 | 替换一张照片 | 新纹理替换，旧纹理与 ObjectURL 释放，卡片仍可点击 | smoke-test |
| PHOTO-06 | 上移/下移 | 顺序改变，轨道重新分配，无报错 | smoke-test |
| PHOTO-07 | 删除一张照片 | 数量减少，场景卡片移除，纹理/URL 释放 | smoke-test |
| PHOTO-08 | 关闭/打开“显示照片文字” | 所有 3D caption 同步显隐 | smoke-test |
| PHOTO-09 | 调整轨道半径、速度、卡片尺寸、暂停 | 实时真实改变且不遮挡树 | smoke-test + 视觉 |
| PHOTO-10 | 点击照片 | 打开 lightbox，内容与 3D 卡片对应 | raycast-test |
| PHOTO-11 | 刷新页面 | 设置保留；照片恢复为内置 8 张（本地会话设计） | smoke / 手工 |
| PHOTO-12 | 替换/删除后检查 `renderer.info.memory.textures` | 不出现持续净增长 | 资源测试 |

### 2.2 设置与持久化

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| SET-01 | 打开右侧六大模块 | 六个 section 均存在且可展开 | smoke / visual |
| SET-02 | 拖动树高、树冠、密度、层数 | 树体、相机尺度、数字位置、心形布局同步重建 | smoke-test |
| SET-03 | 调整树叶颜色 | 松针材质即时变化 | 手工 + smoke |
| SET-04 | 开关树旋转、调整速度 | 场景旋转状态/速度真实变化 | 手工 |
| SET-05 | 调整灯数/亮度/闪烁/颜色/模式 | 220 默认；灯串真实重建/着色；5 模式 | smoke-test |
| SET-06 | 调整爱心数/颜色/大小/速度/模式 | drawRange/材质/运动模式同步 | smoke-test |
| SET-07 | 调整雪/星/极光/背景/环境亮度 | 场景真实变化 | smoke-test |
| SET-08 | 修改 520/1314/祝福/落款/礼物文案 | 3D/弹窗/演示内容同步；中文回退可用 | qa3 |
| SET-09 | 刷新页面 | localStorage 设置保留，值经过 clamp | smoke / 手工 |
| SET-10 | 恢复初始设置 | 回到 8 m / 暖白 / Ultra 等默认；照片保留 | smoke-test |
| SET-11 | 切换 Ultra / Balanced / Performance | DPR、阴影、MSAA/Bloom、雪/灯/爱心/星星数量独立变化 | smoke + performance |
| SET-12 | 实时 FPS / draw calls | 面板底部更新 | smoke / 手工 |

### 2.3 树、灯光、星星与环境

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| TREE-01 | 打开默认场景 | 7 层程序化树、34 挂饰、树顶星、雪地完整 | final screenshot |
| TREE-02 | 调整高度到 9.2 | `tree.treeHeight=9.2`，视觉与镜头更新 | smoke |
| TREE-03 | 调整层数 4–12 | 树层重建，无 WebGL error | 手工 + smoke 边界 |
| LIGHT-01 | 默认场景 | 220 颗灯，螺旋分布 | visual |
| LIGHT-02 | 输入灯数 180 / 400 | 灯串真实重建 | smoke |
| LIGHT-03 | 切换冰蓝等模式 | 主色/调色板/灯光材质同步 | smoke |
| LIGHT-04 | 关闭灯光 | 灯串隐藏/变暗，树体仍可见 | 手工 |
| STAR-01 | 点击树顶星 | 镜头推近、灯亮、雪慢、数字显示、祝福弹窗 | raycast-test |
| STAR-02 | 关闭星星祝福 | 镜头/场景/雪速/心形模式恢复 | raycast-test |
| ENV-01 | 调整雪数量 1400 | `snow.drawRange=1400`，视觉同步 | smoke |
| ENV-02 | 关闭雪/星/极光 | 对应对象真实隐藏，无报错 | 手工 |
| ENV-03 | 选择背景色 `#081b2a` | 天空/雾/背景更新 | qa3 |

### 2.4 文字、爱心与点击

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| TEXT-01 | 输入中文「我爱你」 | Canvas 中文回退，不崩溃，可见 | qa3 |
| TEXT-02 | 输入英文「LOVE」 | 切回真正 3D 挤出文字 | qa3 |
| HEART-01 | 默认场景 | 600 爱心粒子环绕 | visual |
| HEART-02 | 数量改 720 | geometry drawRange=720 | smoke |
| HEART-03 | 点击夜空 | 聚合大爱心再散开，toast 提示 | raycast-test |
| MAGIC-01 | 点击树体 | 300ms 内出现金色光圈/爱心爆发/520 浮字 | qa2 |
| MAGIC-02 | 点击树后等待 | 粒子/场景恢复正常，无错误 | qa2 |

### 2.5 礼物

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| GIFT-01 | 投影并点击第一个礼物 | `openTarget=1`，盖升起，内部光/点光开启 | raycast / qa2 |
| GIFT-02 | 等待 520ms | 专属祝福 modal 出现，标题/落款正确 | raycast |
| GIFT-03 | 关闭 modal | 场景恢复，礼物状态不导致锁死 | raycast |
| GIFT-04 | 点击礼物 4/5 | 使用 fallback 文案，仍可打开 | 手工 |
| GIFT-05 | 修改三份礼物文案后点击 | 显示自定义文案 | smoke |

### 2.6 演示 / 浪漫

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| DEMO-01 | 点击「45 秒圣诞电影」 | 进入 cinema，有章节/进度；45 秒完整流程 | smoke / visual |
| DEMO-02 | 演示中暂停/继续 | 时间轴冻结/恢复，按钮状态同步 | smoke/qa2 |
| DEMO-03 | 演示中退出 | 回到自由场景；相机/树/照片/爱心/雪恢复 | qa2 |
| DEMO-04 | 结束卡片重播 | 时间轴归零，cinema 仍 active | qa2 |
| DEMO-05 | 演示终章 | 结束层出现；签名/祝福正确；数字不穿透标题 | visual |
| ROM-01 | 点击「只属于我们的圣诞节」 | 16 秒浪漫模式，灯光/照片/数字/爱心聚合 | qa3 |
| ROM-02 | 终章 modal → 关闭/退出 | 场景恢复，交互解锁 | qa3 |

### 2.7 音频 / 全屏 / 响应式

| ID | 操作步骤 | 期望 | 自动化证据 |
|---|---|---|---|
| MUSIC-01 | 点击音乐按钮 | `AudioContext.state="running"`，按钮/设置同步 | qa2 |
| MUSIC-02 | 切换三首曲目/音量 | 曲目切换、音量真实变化 | 手工 |
| MUSIC-03 | 关闭音乐 | 背景音乐停止，音效/场景仍工作 | 手工 |
| MUSIC-04 | 直接打开页面 | 不自动播放；首次手势后才可响 | 手工 |
| MOBILE-01 | 390×844 DPR2 | `body.scrollWidth=390`，无横向溢出；抽屉可用 | mobile-test |
| MOBILE-02 | 移动端点击遮罩/× | 面板关闭，不拦截其余触控 | mobile-test |
| UI-01 | 全屏按钮 | 进入/退出全屏，resize 正确 | 手工 |
| UI-02 | Escape / Space | 关闭面板/lightbox；演示暂停 | 手工 |

---

## 3. 性能与资源回归（P0）

| ID | 指标 | F0 基线来源 | 通过线 |
|---|---|---|---|
| PERF-01 | 默认兼容 1440×900 FPS | `PERFORMANCE_BASELINE.md` | 平均 ≥60 FPS；p95 帧 ≤16.7ms（当前远高于） |
| PERF-02 | 24 照片 1920×1080 | 同上 | 平均 ≥60 FPS；无持续掉帧 |
| PERF-03 | 等效 4K | 同上 | 平均 ≥60 FPS |
| PERF-04 | 完整 Bloom 1440×900 | 同上 | 平均 ≥60 FPS；若为宿主 GPU 特例需标注 |
| PERF-05 | 三档画质 | 同上 | 每档真实改变粒子/DPR/阴影/后处理 |
| PERF-06 | 5 分钟短时稳定 | 同上 | 无 context loss；纹理/几何数稳定；heap 不持续单向增长 |
| PERF-07 | 30 分钟稳定 | F0 尚未执行，F5 门禁 | 无泄漏、无卡顿、无 context loss |
| PERF-08 | 照片增删/替换 | 资源手动检查 | 不持续增加纹理/ObjectURL；删除后 GPU 资源可回落 |
| PERF-09 | 单渲染循环 | 代码审查 + runtime | 只有一个 AnimationManager/RAF（F2 实验页面除外） |
| PERF-10 | 构建体积 | `Christmas-Wish.html` | 记录变化；不得无理由大幅增加（目标 <2 MB 可协商） |

数值和允许波动以 [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md) 的实测表为准。后续新视觉如果让某个场景低于 60 FPS，必须优化或降级，不能删掉核心元素掩盖。

---

## 4. 每阶段新增回归

### F1（仅研究，不改产品）

- [ ] 五个仓库研究文档齐全。
- [ ] 许可证/第三方资产结论可追溯。
- [ ] 未把任何未授权代码/素材带入产品。
- [ ] 正式版本和 F0 基线仍可运行。

### F2（独立视觉实验室）

- [ ] 五个实验均有独立启动页、参数面板、说明、截图、性能数据。
- [ ] 实验不修改正式 `index.html`/`src/main.ts` 的业务路径。
- [ ] 每个实验只使用自己的渲染循环，且退出/切换时 dispose。
- [ ] 正式版本仍能构建和打开。

### F3（圣诞树视觉升级）

- [ ] 9 层树冠、360 灯、双螺旋、48 爱心球、水晶爱心树顶、地面反射等新增项真实存在。
- [ ] 原 7 层/220 灯可回退或参数化，不破坏原有树高/层数控件。
- [ ] 星星点击、祝福、树点击、灯光模式、雪/极光仍通过。
- [ ] 性能三档仍均达到 60 FPS 或明确降级策略。
- [ ] 默认兼容模式仍可运行；完整 Bloom 模式单独复测。

### F4（爱情与记忆）

- [ ] 巨型 3D 爱心 / 聚合 / 爆发 / 三层爱心轨道均可用。
- [ ] 520 / 1314 粒子文字或保留现有 3D 回退方案。
- [ ] 照片上传/替换/删除/排序/说明/轨道全部保持。
- [ ] 照片详情/记忆空间不会破坏隐私承诺。
- [ ] 礼物数量决策已获用户批准；5 个现有礼物不 silently 删除。
- [ ] 若引入 IndexedDB，版本迁移/配额失败/清空有测试。

### F5（电影级演示）

- [ ] 60 秒演示完整，章节/镜头/音乐同步。
- [ ] 暂停/继续/退出/重播全部保留。
- [ ] 45 秒旧行为已按批准变更为 60 秒，不能只是延长空白。
- [ ] 30 分钟稳定 + 内存 + context loss 全部通过。
- [ ] 最终桌面/移动端截图与视频/演示素材齐备。

---

## 5. 每次阶段的执行命令

```bash
cd Christmas-Wish
npm run typecheck
npm run build:single
```

然后验证正式单文件：

```bash
# 终端 1
npm run dev

# 终端 2（自动化）
node qa/smoke-test.mjs
node qa/raycast-test.mjs
node qa/qa2.mjs
node qa/qa3.mjs
node qa/mobile-test.mjs
node qa/singlefile-test.mjs
```

F0/性能基线：

```bash
node qa/f0-baseline.mjs
```

> `qa/f0-baseline.mjs` 会打开 headed Edge 并使用真实 GPU；约需 7–8 分钟（含短时稳定性采样）。不要在 headless SwiftShader 环境中取性能结论。

---

## 6. F0 实际复核结果

**执行时间：** 2026-11-25 15:18（Asia/Shanghai）  
**执行环境：** Vite 开发服务器 `http://127.0.0.1:4173/`（`singlefile-test.mjs` 单独使用正式 `file://` 单文件）+ Edge 158.0.4370.33 + RTX 3070 Ti Laptop GPU，headed  
**原始日志：** [`qa/f0/functional-tests.log`](../../qa/f0/functional-tests.log)  
**退出码汇总：** [`qa/f0/functional-summary.json`](../../qa/f0/functional-summary.json)

| 测试资产 | 结果 | 关键证据 |
|---|---|---|
| `tsc --noEmit` | **通过，exit 0** | 无类型错误 |
| `smoke-test.mjs` | **通过，exit 0** | 8→10 上传、替换、删除、设置、三档画质、重置、礼物、星星、演示、音乐；console/page error 0 |
| `raycast-test.mjs` | **通过，exit 0** | 真实光标命中照片 / 礼物 / 星星 / 树 / 夜空；sky gatherTimer=3.55 |
| `qa2.mjs` | **通过，exit 0** | 树点击 symbols=1；音乐 AudioContext=running；暂停/继续/重播/退出；礼物 lidY=1.03、light=5.5 |
| `qa3.mjs` | **通过，exit 0** | 中文「我爱你」Canvas 回退、英文「LOVE」3D；背景色、雪 1400、爱心 gather、浪漫终章 |
| `mobile-test.mjs` | **通过，exit 0** | 390×844，scrollWidth=390；抽屉、愿望弹窗在视口内 |
| `singlefile-test.mjs` | **通过，exit 0** | `file:` 协议、ready=true、8 照片、loader 完成、仅 1 个本地请求、无错误 |
| `f0-baseline.mjs` | **通过，exit 0** | 9 个性能场景 + 4 分钟稳定性；0 console errors，0 context lost |

### 补充专项复核

| 测试 | 文件 | 结果 |
|---|---|---|
| 参数持久化 + 照片会话行为 | [`qa/f0/persistence-check.json`](../../qa/f0/persistence-check.json) | 树高 9.2 写入 localStorage 并在 reload 后保留；刷新前 9 张照片，刷新后恢复 8 张；无错误 |
| 照片增删资源回环 | [`qa/f0/photo-resource-check.json`](../../qa/f0/photo-resource-check.json) | 8 张：纹理 31 / 几何 181 / draws 271；上传到 24：63 / 293 / 399；删除回 8：**31 / 181 / 271**；无错误 |

### 功能结论

- 原有业务功能在 F0 当前构建上**全部通过现有自动化回归**，没有 P0 失败。
- 演示组性能存在一次 1204 ms 首次编译长帧；它不是功能失败，但已列为 F5 前必须消除的性能风险。
- 照片轨道、面板、礼物、音乐、45 秒演示、浪漫模式、画质切换均保持。
- F0 没有修改任何业务源码；`qa/smoke-results.json` 在复核后被恢复为基线版本，新的测试证据统一放在 `qa/f0/`，避免污染历史验收文件。

---

## 7. 已知且被接受的限制

1. 照片只存活于当前会话；刷新恢复 8 张示例。
2. 默认兼容渲染无 Bloom；`?full=1` 为完整效果模式。
3. 24 张照片时轨道会层叠，是当前视觉预期。
4. 音乐为运行时合成，非外部曲目。
5. 音频必须由用户手势启动。
6. 移动端以 Chromium 响应式验收，不等于实体 iOS Safari。
7. F0 不包含 30 分钟稳定性验收；该项是 F5 的正式门禁。

---

## 8. F0 签字条件

- [x] 基线 tag、commit、分支正确。
- [x] 备份 zip 与独立单文件存在且哈希匹配。
- [x] 五份 F0 报告齐备。
- [x] 现有功能复核无 P0 失败。
- [x] 性能基线记录已确认并归档。
- [ ] 用户验收 F0 后才可进入 F1。

**F0 当前状态：审计与复核完成，等待用户验收；F1 未开始。**
