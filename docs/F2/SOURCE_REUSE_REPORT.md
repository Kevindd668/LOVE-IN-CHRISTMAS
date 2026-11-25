# F2 来源复用与许可证报告

## 1. 五个参考仓库

`github-references/` 是 F1 的本地克隆目录，已被 `.git/info/exclude` 排除，不提交。

| 目录 | 仓库 | 分支/提交 | LICENSE 文件 | README 的许可声明 | F2 使用方式 |
| --- | --- | --- | --- | --- | --- |
| `Heart-Star` | https://github.com/saklincodes/Heart-Star | `main` @ `9317aeb` | 有（MIT） | MIT | 爱心/星形参数式数学与聚合节奏的**行为参考**；实验代码独立重写 |
| `ChristmasTree` | https://github.com/dkvkvk/ChristmasTree | `master` @ `59b14c5` | 无 | README 声称 MIT | 灯光/粒子层行为参考；**未直接复制**无 LICENSE 文件的代码 |
| `Immersive-Photo-Gallery` | https://github.com/DancingCircles/immersive-photo-gallery | `main` @ `c862c70` | 有（MIT） | MIT | 照片轨道/聚焦/本地处理交互的行为参考；实验代码独立重写 |
| `Christmas-Tree-Photos` | https://github.com/dongkui555/christmas-tree | `main` @ `b5f4870` | 无 | README 声称 MIT | 照片记忆交互行为研究；**未直接复制**无 LICENSE 文件的代码 |
| `Interactive-Xmas-Tree` | https://github.com/HairuFan/interactive-xmas-tree | `main` @ `be75d04` | 有（文件名 `MIT License`） | MIT | 星场/相机层组织的行为参考；实验代码独立重写 |

许可证原文保留在各克隆目录中；本仓库不提交 `github-references/`。Three.js 的许可证单独保留在 `experiments/vendor/three/LICENSE`。

## 2. 用户授权声明

用户在 F2 指令中声明：五个参考仓库的作者都已同意本项目直接复制、复用、修改其代码。该声明由用户提供，**F2 未独立联系作者或验证授权范围**。因此本报告同时保留每个仓库的许可证状态，不把该声明写成“已核验”。

如果未来发布或分发：
- 对 MIT 仓库，保留版权与许可声明；MIT 允许复制、修改、再分发。
- 对没有 LICENSE 文件的两个仓库，不直接复制代码；本实验仅参考行为/结构，避免把 README 的“MIT”当作充分许可。
- 用户声明不能替代许可证文本；若需公开分发，应再次确认作者授权与署名方式。

## 3. 实际复用清单

### 实验 01 · 爱心/星形

- 参考文件：`Heart-Star/geometry.js`、`particles.js`、`config.js`、`main.js`。
- 复用内容：经典参数式爱心/星形轮廓、聚合/爆散/心跳的时间关系。
- 实际改动：改为独立 ES module；加入 Volume 拒绝采样、3D 深度、点着色器、Bloom、统一 UI、暂停/重置/截图接口；未复制原 HTML/CSS 与打包产物。
- 许可证：MIT；保留来源链接与作者信息（Saklin Ali）。

### 实验 02 · 双螺旋圣诞树

- 参考文件：`ChristmasTree` 的树/灯光实现；`Interactive-Xmas-Tree` 的相机/粒子组织。
- 复用内容：灯光、粒子、相机层的**行为研究**。
- 实际改动：双螺旋光带、反向 TubeGeometry、9 层树、树顶水晶爱心、7 个相机预设、礼物/雪/地面由本实验实现。
- 额外来源：树冠基础来自本项目已有的 `src/objects/ChristmasTree.ts`，在 F2 中通过 esbuild 生成 `experiments/02-double-helix-tree/src/product-tree.js` 的**本地实验副本**。它不在运行时从正式应用 import，也不修改正式源码。
- 许可证：参考仓库 MIT（README）/无 LICENSE 文件；本项目自身代码不改变正式产品许可。由于 `ChristmasTree` 缺少 LICENSE 文件，未直接复制其源码。

### 实验 03 · 星河

- 参考：`Interactive-Xmas-Tree` 的星场/相机组织；`Christmas-Tree-Photos` 的空间氛围。
- 复用内容：行为与构图研究。
- 实际改动：星云/极光/光瀑/轨道/流星着色器和动画均为独立实现；没有复制参考代码或素材。
- 许可证：MIT / 无 LICENSE 文件（后者仅参考）。

### 实验 04 · 照片记忆

- 参考：`Immersive-Photo-Gallery` 的 3D 照片轨道、聚焦与本地文件处理；`Christmas-Tree-Photos` 的照片记忆交互。
- 复用内容：交互模式研究。
- 实际改动：3D 卡片几何、三层独立轨道、上传/替换/删除/排序、相机聚焦、详情层、IndexedDB 实验入口均为独立实现；没有复制参考代码。
- 许可证：MIT / 无 LICENSE 文件（后者仅参考）。

### 实验 05 · 电影镜头与粒子文字

- 参考：`Heart-Star` 的爱心/星形数学与节奏；`Interactive-Xmas-Tree` 的相机/粒子组织。
- 复用内容：行为与数学思路。
- 实际改动：CPU 粒子场、Canvas 文本采样、四条镜头/文字序列、场景明暗和定格均为独立实现。
- 许可证：MIT。

## 4. 第三方素材

- 没有引入第三方图片、音乐、模型、字体文件或贴图。
- 01/02/03/05 的光晕、地面、粒子等由 Canvas/GLSL/几何程序化生成。
- 04 的 12 张初始照片为本地 Canvas 生成的占位图；QA 上传测试图片在 `qa/placeholders/`，不属于参考仓库素材，也不进入正式产品。
- Three.js 0.160.0 与 addons 的 MIT 许可证见 `experiments/vendor/three/LICENSE`。

## 5. 修改与独立性

- 所有实验在 `experiments/` 下独立启动；正式应用不 import 实验，实验也不 import `src/`。
- 02 的 `product-tree.js` 是构建产物副本；源文件来自本项目，不改变正式代码，也不作为生产依赖。
- 没有修改以下内容：
  - `Christmas-Wish.html`
  - `src/`
  - `main` / `v1.0.0-baseline`
  - `docs/F0/`、`docs/F1/`
  - `package.json` / 生产依赖
  - Three.js 0.160.0 的版本与公开 API
- 参考克隆目录未提交；只提交 F2 实验、QA 脚本与 F2 文档。
