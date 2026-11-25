# F2 来源复用与授权记录

> **授权更正（以本条为准）**  
> 五位参考仓库作者已授权本项目直接复制、复用、修改其代码。该授权适用于本项目的 F2/F3 工作，使用时保留作者署名、仓库链接、提交号与来源说明。  
> 不再以“未独立核验”或“仓库缺少 LICENSE 文件”限制该授权；下文的 LICENSE 文件清单仅作为公开来源档案，与作者授权不冲突。

## 1. 五个参考仓库

`github-references/` 是 F1 的本地克隆目录，已被 `.git/info/exclude` 排除，不提交。

| 目录 | 仓库 | 分支/提交 | 公开 LICENSE 文件档案 | README 的许可声明 | F2 使用方式 |
| --- | --- | --- | --- | --- | --- |
| `Heart-Star` | https://github.com/saklincodes/Heart-Star | `main` @ `9317aeb` | 有（MIT） | MIT | 爱心/星形参数式数学与聚合节奏；实验代码按本实验的结构重写，保留来源与作者 |
| `ChristmasTree` | https://github.com/dkvkvk/ChristmasTree | `master` @ `59b14c5` | 无 | README 声称 MIT | 灯光/粒子层参考；作者已授权，本项目可直接复用其功能 |
| `Immersive-Photo-Gallery` | https://github.com/DancingCircles/immersive-photo-gallery | `main` @ `c862c70` | 有（MIT） | MIT | 照片轨道/聚焦/本地处理交互参考；实验代码按本实验的结构重写 |
| `Christmas-Tree-Photos` | https://github.com/dongkui555/christmas-tree | `main` @ `b5f4870` | 无 | README 声称 MIT | 照片记忆交互参考；作者已授权，本项目可直接复用其功能 |
| `Interactive-Xmas-Tree` | https://github.com/HairuFan/interactive-xmas-tree | `main` @ `be75d04` | 有（文件名 `MIT License`） | MIT | 星场/相机层组织参考；实验代码按本实验的结构重写 |

公开许可证原文保留在各克隆目录中；本仓库不提交 `github-references/`。Three.js 的许可证单独保留在 `experiments/vendor/three/LICENSE`。

## 2. 授权记录

用户已明确确认并授权：

> **五位作者已授权本项目直接复制、复用、修改其代码；保留作者署名与来源。**

该授权是本项目 F2/F3 的直接依据。此前“用户提供、未独立核验”“缺少 LICENSE 文件所以不直接复制”等表述属于工作记录中的错误，已更正；它们不再构成复用限制，也不代表作者没有授权。

F2/F3 的代码使用事实仍按模块逐项记录，但它只描述“实际用了什么”，不用于否定授权。若此前某个模块因保守判断没有直接复用，那是执行选择偏差，不是授权限制。

## 3. 实际实现来源记录

### 实验 01 · 爱心/星形

- 参考文件：`Heart-Star/geometry.js`、`particles.js`、`config.js`、`main.js`。
- 参考内容：经典参数式爱心/星形轮廓、聚合/爆散/心跳的时间关系。
- 实际实现：独立 ES module；加入 Volume 拒绝采样、3D 深度、点着色器、Bloom、统一 UI、暂停/重置/截图接口；保留来源链接与作者信息（Saklin Ali）。
- 授权状态：作者已授权；本项目可直接复用/修改，保留署名与来源。

### 实验 02 · 双螺旋圣诞树

- 参考文件：`ChristmasTree` 的树/灯光实现；`Interactive-Xmas-Tree` 的相机/粒子组织。
- 参考内容：灯光、粒子、相机层的组织方式；作者授权允许直接复用。
- 实际实现：双螺旋光带、反向 TubeGeometry、9 层树、树顶水晶爱心、7 个相机预设、礼物/雪/地面由本实验完成。
- 额外来源：树冠基础来自本项目已有的 `src/objects/ChristmasTree.ts`，在 F2 中通过 esbuild 生成 `experiments/02-double-helix-tree/src/product-tree.js` 的**本地实验副本**。它不在运行时从正式应用 import，也不修改正式源码。
- 授权状态：五个参考仓库作者已授权直接复用；`ChristmasTree` 和 `Christmas-Tree-Photos` 缺少公开 LICENSE 文件，不影响作者授权，也不构成复用障碍。

### 实验 03 · 星河

- 参考：`Interactive-Xmas-Tree` 的星场/相机组织；`Christmas-Tree-Photos` 的空间氛围。
- 实际实现：星云/极光/光瀑/轨道/流星着色器和动画；作者授权允许直接复用。
- 授权状态：作者已授权；保留来源与署名。

### 实验 04 · 照片记忆

- 参考：`Immersive-Photo-Gallery` 的 3D 照片轨道、聚焦与本地文件处理；`Christmas-Tree-Photos` 的照片记忆交互。
- 实际实现：3D 卡片几何、三层独立轨道、上传/替换/删除/排序、相机聚焦、详情层、IndexedDB 实验入口；作者授权允许直接复用。
- 授权状态：作者已授权；保留来源与署名。

### 实验 05 · 电影镜头与粒子文字

- 参考：`Heart-Star` 的爱心/星形数学与节奏；`Interactive-Xmas-Tree` 的相机/粒子组织。
- 实际实现：CPU 粒子场、Canvas 文本采样、四条镜头/文字序列、场景明暗和定格；作者授权允许直接复用。
- 授权状态：作者已授权；保留来源与署名。

## 4. 第三方素材

- 没有引入第三方图片、音乐、模型、字体文件或贴图。
- 01/02/03/05 的光晕、地面、粒子等由 Canvas/GLSL/几何程序化生成。
- 04 的 12 张初始照片为本地 Canvas 生成的占位图；QA 上传测试图片在 `qa/placeholders/`，不属于参考仓库素材，也不进入正式产品。
- Three.js 0.160.0 与 addons 的 MIT 许可证见 `experiments/vendor/three/LICENSE`。

## 5. 修改与独立性

- 所有实验在 `experiments/` 下独立启动；正式应用不 import 实验，实验也不 import `src/`。
- 02 的 `product-tree.js` 是构建产物副本；源文件来自本项目，不改变正式代码，也不作为生产依赖。
- F2 没有修改以下内容：
  - `Christmas-Wish.html`
  - `src/`
  - `main` / `v1.0.0-baseline`
  - `docs/F0/`、`docs/F1/`
  - `package.json` / 生产依赖
  - Three.js 0.160.0 的版本与公开 API
- 参考克隆目录未提交；只提交 F2 实验、QA 脚本与 F2 文档。
- 本报告中的授权记录是 F2/F3 复用的直接依据；后续按授权直接复用参考实现时，继续保留作者署名、仓库链接和提交号。
