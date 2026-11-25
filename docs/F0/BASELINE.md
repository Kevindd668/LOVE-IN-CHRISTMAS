# F0 · 项目基线与安全备份

**项目：** Christmas-Wish（现有正式版本）  
**阶段：** F0 · 现有项目审计  
**审计日期：** 2026-11-25  
**审计性质：** 只读审计；F0 不修改正式业务代码  
**当前状态：** F0 审计完成，等待验收；F1 尚未开始

---

## 1. 当前正式版本

| 项目 | 值 |
|---|---|
| 项目名称 | A Christmas Wish · 圣诞心愿 |
| package 版本 | 1.0.0 |
| 正式单文件 | `C:\Users\29636\Desktop\日常交流\Christmas-Wish.html` |
| 仓库内单文件副本 | `C:\Users\29636\Desktop\日常交流\Christmas-Wish\Christmas-Wish.html` |
| 单文件大小 | 1,265,093 字节（约 1.21 MB） |
| 单文件 SHA-256 | `12E39D0EFDDC6E24C0B6111F85321E7939E294E55268CBE85BDFF46CF94BD725` |
| 页面技术栈 | Three.js 0.160.0 / TypeScript 5.6.3 / WebGL2 / Vite 5.4.11 |
| 默认渲染模式 | 兼容渲染（直接画布渲染，不启用 Bloom 后处理） |
| 完整效果模式 | `?full=1`（EffectComposer + UnrealBloomPass） |

当前单文件仍保持可直接双击、`file://` 离线打开。正式版没有后端、CDN、在线字体或外部音频请求。

> 项目名升级为 **LOVE IN CHRISTMAS —— 爱在圣诞** 属于后续阶段目标；F0 未改动现有品牌、文案或视觉代码。

---

## 2. Git 基线

审计开始时该项目**没有 Git 仓库**（`git rev-parse` 返回 not a git repository）。F0 建立了本地 Git 基线：

| 项目 | 值 |
|---|---|
| 仓库根目录 | `C:\Users\29636\Desktop\日常交流\Christmas-Wish` |
| 基线分支 | `main` |
| 基线提交 | `c9e3d02f88a6ecaf58e8bae6c954b5a9370f4fd3` |
| 基线提交信息 | `chore(baseline): freeze Christmas-Wish v1.0.0 before visual upgrade` |
| 基线标签 | `v1.0.0-baseline` |
| 开发分支 | `feature/visual-upgrade` |
| 基线跟踪文件数 | 76 |
| 基线跟踪文件总字节 | 11,474,085 |
| 被忽略的本地目录 | `node_modules/`、`dist/`、`.tmp/` |

说明：

- `node_modules` 是当前开发机上的 Windows junction，指向 `CardioTwin-V3` 本地依赖目录；它不进入 Git，也不进入备份包。
- 基线标签为附带说明的 annotated tag，标签内容为 `F0 baseline: official runnable version before visual upgrade`。
- 基线提交创建后立刻切到 `feature/visual-upgrade`；`main` 不被后续视觉升级提交污染。
- Git 身份只配置在仓库本地（`A Christmas Wish <christmas-wish@localhost>`），没有修改全局 Git 配置。

---

## 3. 安全备份

| 项目 | 值 |
|---|---|
| 源码备份 | `C:\Users\29636\Desktop\日常交流\backups\Christmas-Wish-v1.0.0-baseline_2026-11-25.zip` |
| 备份大小 | 9,878,785 字节 |
| 备份 SHA-256 | `EC58F98E6A8CE1C82BD05D72079632388D47584027F2D27A58C1168BE42FAFE5` |
| 独立正式单文件备份 | `C:\Users\29636\Desktop\日常交流\backups\Christmas-Wish-v1.0.0-standalone.html` |
| 独立单文件 SHA-256 | `12E39D0EFDDC6E24C0B6111F85321E7939E294E55268CBE85BDFF46CF94BD725` |

备份通过 `git archive HEAD` 生成，包含 76 个受版本管理文件以及构建后的 `Christmas-Wish.html`，不含 `node_modules`、`dist`、`.tmp`。源码包需要 `npm install` 才能重新开发；独立单文件无需安装依赖即可运行。

**安全保留策略：**

1. `main` 与 `v1.0.0-baseline` 永远可作为正式版恢复点。
2. `feature/visual-upgrade` 独立开发，任何升级不直接改 `main`。
3. 视觉升级验收完成前，不移动、不删除基线标签。
4. 备份包不覆盖；后续阶段如需整阶段快照，另建带阶段名的归档。

---

## 4. 审计环境

| 项目 | 值 |
|---|---|
| 操作系统 | Windows 11 家庭版 中文版，10.0.26300，64 位 |
| CPU | 12th Gen Intel Core i9-12900H，14 核 / 20 线程 |
| 内存 | 16,823,738,368 字节（约 16 GB） |
| 独显 | NVIDIA GeForce RTX 3070 Ti Laptop GPU，驱动 32.0.16.2124，显存报告约 4 GB |
| 集显 | Intel Iris Xe Graphics，驱动 31.0.101.4502 |
| 显示器 | 2560 × 1440，240 Hz；Windows 逻辑工作区 1707 × 960 |
| 浏览器 | Microsoft Edge 158.0.4370.33（Chromium，硬件加速） |
| Node.js | v24.15.0 |
| npm | 11.12.1 |
| 自动化 | Playwright Core 1.49.1，headed Edge |

详细逐项性能读数见 [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)。

---

## 5. 依赖与构建冻结

`package.json` 的关键依赖全部是精确版本，没有 `^` 或 `~` 浮动：

- `three@0.160.0`
- `@types/three@0.160.0`
- `typescript@5.6.3`
- `vite@5.4.11`
- `playwright-core@1.49.1`

当前没有：

- GSAP；
- IndexedDB 封装或业务使用；
- 后端服务；
- 云端照片上传。

这三项属于后续升级目标或架构缺口，F0 只记录，不引入。

### 构建脚本注意事项

项目当前使用 `scripts/build.mjs` 把 `TEMP` / `TMP` 指向项目内 `.tmp`，以绕开该 Windows 环境上 esbuild 清理系统临时目录时的权限错误。`npm run build:single` 是正式单文件的唯一生成入口：

```bash
cd Christmas-Wish
npm run build:single
```

生成后会同时写入项目内 `Christmas-Wish.html` 和桌面根目录的 `../Christmas-Wish.html`。

---

## 6. 已完成的现状保护

F0 已确认：

- [x] 完整项目结构已清点（37 个 `src` 文件，含字体资源与样式）。
- [x] Three.js 版本已确认（0.160.0）。
- [x] 现有业务功能已清点（见 `CURRENT_FEATURES.md`）。
- [x] Git 基线已建立并打标签。
- [x] 独立开发分支已创建。
- [x] 正式可运行单文件已保留并单独备份。
- [x] 当前性能基线已用正式单文件实测（见性能报告）。
- [x] 照片、设置、礼物、音乐、演示、浪漫模式、画质切换均列入回归清单。

---

## 7. F0 的变更范围

F0 只允许并实际发生以下非业务变更：

| 类型 | 内容 | 是否修改正式业务代码 |
|---|---|---|
| Git | 初始化仓库、基线提交、标签、开发分支 | 否 |
| 备份 | 源码 zip + 独立正式单文件 | 否 |
| QA | 新增 F0 性能基线与功能回归脚本、数据、截图 | 否 |
| 文档 | 本目录五份 F0 报告 | 否 |
| 业务源码 | `src/**`、`index.html`、`styles.css`、构建配置 | **未修改** |

后续如果执行 `git diff v1.0.0-baseline..HEAD`，预期只能看到 F0 新增文档和 QA 证据，以及测试过程被明确恢复的既有验收文件；不允许出现业务功能代码差异。

---

## 8. F0 验收门槛

进入 F1 前，以下条件必须同时满足：

1. `main` / `v1.0.0-baseline` 仍指向 `c9e3d02`。
2. `feature/visual-upgrade` 上只有 F0 文档与 QA 证据新增。
3. 正式单文件哈希仍与基线一致，或如果因测试之外的原因重建，必须在差异报告中说明。
4. 五份 F0 报告齐全。
5. 现有核心功能的自动化或手工核验结果已记录在回归清单中。
6. 用户明确验收 F0 后，才允许进入 F1 的 GitHub 源码研究。

**当前 F0 结论：基线、备份、环境、性能入口和回归范围均已建立；等待验收。**
