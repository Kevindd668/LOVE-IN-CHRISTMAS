# F1 · 许可证与第三方资源审计

**审计日期：** 2026-11-25  
**审计对象：** 五个参考仓库及其依赖、图片、字体、音乐、模型、WASM 资源  
**原则：** 代码许可证不等于素材许可证；仓库根目录的 MIT 声明不会自动覆盖仓库内的摄影、音乐、字体或 3D 模型。

---

## 1. 结论先行

| 仓库 | 代码许可证状态 | 代码能否直接复用 | 素材能否复用 | 最终分级 |
|---|---|---|---|---|
| Heart-Star | **MIT 已确认** | 可以，保留版权声明 | 仅三大依赖 + 自生成贴图；无额外素材 | 绿色 |
| ChristmasTree | **未确认**：README 声称 MIT，但无 LICENSE 文件，链接失效 | **否**，只能技术研究 | MP3 / star.glb / Draco 无授权说明 | 红色 |
| Immersive-Photo-Gallery | **MIT 已确认**，另有第三方声明 | 可以，保留版权与第三方声明 | 照片为 CC BY-SA/CC0，BGM 授权未确认；不可默认复用 | 代码绿色，素材黄色 |
| Christmas-Tree-Photos | **未确认**：README 只说 MIT，无 LICENSE/版权/NOTICE | **否**，只能技术研究 | MediaPipe 资源、字体、截图无完整声明 | 红色 |
| Interactive-Xmas-Tree | **MIT 已确认** | 可以，保留版权声明 | 代码 MIT；`texture/` 19MB 未被引用且授权不明 | 代码绿色，素材红色 |

**F1 没有复制任何参考仓库的代码或素材进入产品。**

---

## 2. 代码许可证明细

### 2.1 Heart-Star

- 文件：`github-references/Heart-Star/LICENSE`
- 类型：MIT License
- 版权：Copyright (c) 2026 Saklin Ali
- 仓库没有 `package.json`；Three.js 由 jsDelivr CDN 加载。
- 代码许可证完整，可直接研究；如果复制算法/代码，必须保留 MIT 声明与版权行。
- 该仓库没有额外图片、音频或字体依赖；粒子 sprite 与几何均在运行时生成。

### 2.2 ChristmasTree

- **仓库没有 `LICENSE` / `LICENCE` / `COPYING` 文件。**
- README：
  - 第 8 行有 MIT badge；
  - 第 176–178 行写 `## License` 与 `MIT（指向 ./LICENSE） © dkvkvk`；
  - 但 `./LICENSE` 指向不存在的文件。
- 结论：许可证意图可见，但**法律文本与版权声明未随仓库提供**。按任务书“未确认许可证的项目只允许技术研究，不得直接复制”，**本仓库代码不得直接复制进 Christmas-Wish**。
- 仓库内代码可能还来自其他项目（未注明）；不能假定整个仓库为 MIT。

### 2.3 Immersive-Photo-Gallery

- 文件：`LICENSE`
- 类型：MIT License
- 版权：Copyright (c) 2026 DancingCircles
- 额外文件：`THIRD_PARTY_NOTICES.md`
  - Codrops Repeating Image Transition：MIT，Copyright 2009–2024 Codrops；
  - Sujenphea/xylophone：MIT，Copyright 2009–2026 Codrops；
  - 源码中的 `FluidSim.ts` 注释另称 adapted from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT)，但 `THIRD_PARTY_NOTICES.md` 未单独列出 Pavel 的版权段；如果复用 FluidSim，必须补齐该第三方声明。
- 代码 MIT 状态明确，可在保留版权/许可后研究复用。

### 2.4 Christmas-Tree-Photos

- **没有 `LICENSE` 文件、没有 NOTICE、没有 COPYING。**
- README 第 252–254 行只写了：
  ```text
  ## License
  MIT
  ```
  没有 MIT 全文、版权人、年份；也没有第三方声明。
- 结论：**许可证未确认**，只能技术研究，不得复制代码。
- 该仓库还包含从 MediaPipe 分发的 wasm/模型、外部 Google Fonts、以及可能的截图；这些资源另有许可，README 未列出。

### 2.5 Interactive-Xmas-Tree

- 文件：`MIT License`（文件名本身，不是 `LICENSE`）
- 类型：MIT License
- 版权：Copyright (c) 2025 Hairu Fan
- 代码 MIT 明确；可以研究和复用，保留 MIT 全文与版权声明。
- 但 `texture/` 目录的资源不在代码许可证的自动覆盖范围内，详见 §3.5。

---

## 3. 第三方素材明细

### 3.1 Heart-Star

| 资源 | 来源/授权 | 结论 |
|---|---|---|
| 粒子 sprite、心形/星形几何 | 代码运行时 Canvas 生成 | 随 MIT 代码 |
| Three.js r162 CDN | MIT，Three.js Authors | 依赖本身 MIT，需遵循 Three 许可 |
| 无外部图片/音乐/字体/模型 | — | 无额外素材风险 |

### 3.2 ChristmasTree

| 资源 | 位置/大小 | 授权 | 结论 |
|---|---|---|---|
| `Last Christmas.mp3` | `public/music/`，3.36 MB | 未说明；这是商业录音/歌曲名称 | **不可用** |
| `Lonely Christmas.mp3` | 4.48 MB | 未说明 | **不可用** |
| `圣诞快乐劳伦斯先生.mp3` | 5.65 MB | 未说明 | **不可用** |
| `圣诞星.mp3` | 2.93 MB | 未说明 | **不可用** |
| `圣诞结.mp3` | 4.51 MB | 未说明 | **不可用** |
| `public/model/star.glb` | 953 KB | 无模型作者/来源/许可 | **不可用** |
| `public/draco/*` | Draco decoder/encoder | 未附 NOTICE；不能确定再分发条款 | 不复制该副本；需要时使用 Three/Google 官方包并附许可 |
| `public/ChristmasTree.svg` | 10 KB | 无说明 | 不复制 |
| Three.js / Vue / lil-gui | npm 依赖 | 各自 MIT（需按包安装，不使用仓库副本） | 可另行使用官方包 |
| GSAP | package.json 依赖，但源码未 import | **Standard “no charge” License**，不是 MIT | 不建议引入 |

README 的 MIT 声明**不能覆盖音乐和模型**。即使未来补上 LICENSE，也应把这些素材单独移除或替换。

### 3.3 Immersive-Photo-Gallery

| 资源 | 数量/位置 | 授权 | 结论 |
|---|---|---|---|
| Demo 摄影图片 | `public/art/demo/`，20 张 | **15 张 CC BY-SA 4.0，5 张 CC0**；作者/来源/licenseUrl 在 `infrastructure/local/fixtures.ts` | CC BY-SA 要求署名与相同方式共享；不适合作为本项目素材；CC0 可用但仍建议保留来源 |
| BGM `memories-in-soft-light.mp3` | 7.79 MB | README 明确“再发布或用于其他项目前确认授权” | **不可复用** |
| `app/icon.png` / brand logo | 1.53 MB | 未单独说明 | 不使用 |
| Xylophone 模型/音频 | `features/daily-edit/xylophone/reference/assets/` | 所属 Sujenphea/xylophone 在 THIRD_PARTY_NOTICES 中声明 MIT | 若复用需保留该 MIT 声明；F1 不复制 |
| Codrops 过渡代码 | 首页转场 | MIT，Codrops | 可研究，保留声明 |
| `FluidSim` 衍生代码 | `reference/js/components/FluidSim.ts` | 注释称 MIT-derived from PavelDoGreat；NOTICE 未列出 | 复用前补齐 attribution |
| Three / React / GSAP / postprocessing | npm 依赖 | Three MIT、React MIT、GSAP Standard、postprocessing Zlib | 不能把 GSAP 当 MIT |

照片授权是**逐作品**的：仓库 MIT 不覆盖这些照片。若后续想借用其图像，必须逐张保留 `photographerName / sourceUrl / licenseName / licenseUrl / creditLine`，并遵守 CC BY-SA 的相同方式共享。F1 建议不使用这些图片。

### 3.4 Christmas-Tree-Photos

| 资源 | 位置/大小 | 授权 | 结论 |
|---|---|---|---|
| MediaPipe wasm | `public/mediapipe/wasm/`（两套 SIMD/non-SIMD，约 19.6 MB） | npm 包 `@mediapipe/tasks-vision` 为 **Apache-2.0**；仓库未附带 NOTICE | 可研究，不复制；如需使用必须引入官方包与 NOTICE |
| `gesture_recognizer.task` | 8.37 MB | MediaPipe 模型；未附单独条款 | 不复制 |
| Google Font `Great Vibes` | CSS `@import` 外部网络字体 | 仓库未附字体许可；常见 Google Fonts 为 SIL OFL 1.1，但未在此仓库确认 | 不依赖外部字体网络请求；不复制 |
| 截图 `docs/screenshots/` | tree.png、photos-manager.png | 项目截图，未单独声明 | 只作内部研究，不进入产品 |
| 无音乐/外部摄影 | — | — | — |

README 的单一 `MIT` 字串不构成完整许可，也不覆盖上述 MediaPipe / 字体 / 截图资源。

### 3.5 Interactive-Xmas-Tree

| 资源 | 位置/大小 | 授权 | 结论 |
|---|---|---|---|
| `texture/cloud.png` | 535 KB | 无说明 | 不复制 |
| `texture/leaf_noise.png` | 14.08 MB | 无说明 | 不复制 |
| `texture/snow_soft.png` | 871 KB | 无说明 | 不复制 |
| `texture/star.png` | 255 KB | 无说明 | 不复制 |
| `texture/star_glow.png` | 4.84 MB | 无说明 | 不复制 |
| MediaPipe Hands 0.3 CDN | 运行时加载 | npm 包 Apache-2.0；页面未附许可文本 | 不复制；如使用需官方包与 NOTICE |
| Three.js 0.159 CDN | 运行时加载 | MIT | 依赖本身 MIT |
| `Reusable Prompt…` 文件 | 9.99 KB | 项目内提示词 | 不进入产品 |

重要事实：`index.html` **没有引用任何 `texture/` 路径**；这些 19 MB 文件是未使用资源（死重），授权也不明。不要因为它们“在 MIT 仓库里”就当作 MIT 素材使用。

---

## 4. 依赖许可证

| 依赖 | 版本（参考） | 许可证 | 本项目策略 |
|---|---|---|---|
| Three.js | 0.160.0（现有）/ 0.159–0.180（参考） | MIT | 保留现有 0.160.0，不混版本 |
| GSAP | 3.12.5 / 3.12.7 | **Standard “no charge” License**（非 MIT/OSI） | **不建议引入**；现有 AnimationManager 足够 |
| `postprocessing`（pmndrs） | 6.39.5 | **Zlib** | 需要更复杂后期时再评估；F1 不引入 |
| `@mediapipe/tasks-vision` | 参考 0.10.22 RC | **Apache-2.0** | 因权限/体积/性能暂不引入 |
| `@mediapipe/hands` / `camera_utils` | 0.3 | Apache-2.0（CDN） | 不引入摄像头手势 |
| Vue | 3.5（参考） | MIT | 不引入；现有不是 Vue |
| React / React DOM | 18 / 19（参考） | MIT | 不引入；现有不是 React |
| Vite / TypeScript | 现有 5.4.11 / 5.6.3 | MIT / Apache-2.0 | 保持 |
| `lil-gui` | 0.20（参考） | MIT | 不使用；现有控制面板保留 |
| `uuid` / `maath` / `drei` / `r3f` | 参考依赖 | MIT（各自） | 不引入 R3F 生态 |
| `@react-three/postprocessing` | 参考 | MIT | 不引入 React 渲染栈 |

> 版本/许可证来自各仓库 `package.json`、`package-lock.json` 与 npm registry 元数据；GSAP、mediapipe、postprocessing 通过 `npm view <pkg> license` 核对。未在本机安装参考项目的依赖。

---

## 5. 许可证与复用规则

### 5.1 已确认可复用的代码

只限：

- **Heart-Star**（MIT，Copyright 2026 Saklin Ali）；
- **Immersive-Photo-Gallery**（MIT，Copyright 2026 DancingCircles；另保留 Codrops/Sujenphea/Pavel 等第三方声明）；
- **Interactive-Xmas-Tree**（MIT，Copyright 2025 Hairu Fan）。

复用要求：

1. 记录源仓库 URL、默认分支与 commit；
2. 在 `THIRD_PARTY_NOTICES.md` 或新的 F2/F3 声明文件中复制完整的 MIT 许可文本与版权人；
3. 如为算法改写，也在代码注释中写明来源；
4. 不把参考仓库的图片、音频、模型或字体当作代码许可的一部分；
5. 只使用我们自行生成或已获明确授权的素材。

### 5.2 禁止直接复用

- ChristmasTree 的任何代码或素材：**无 LICENSE 文件，README 声明不完整**；
- Christmas-Tree-Photos 的任何代码或素材：**无 LICENSE 文件、无第三方声明**；
- 五个仓库中的所有音乐、照片、模型、未引用 textures、品牌 logo；
- 任何 MediaPipe / Three 示例目录的二进制，除非通过官方包并遵循其 Apache/MIT 条款；
- GSAP 代码/包，除非明确接受其 Standard License 并完成合规审查；F1 建议不引入。

### 5.3 如果后续需要引入 MIT 代码

最小合规模板（实际使用前由项目维护者复核）：

```text
This project contains code derived from:
<Project name> (<repo URL>), commit <hash>
Copyright (c) <year> <author>
Licensed under the MIT License. The full MIT text is included below.
```

同时保留原文件的版权/许可注释，不删除作者信息。

### 5.4 如果后续需要引入 CC BY-SA 图片

不建议用于本私人礼物。若必须使用：

- 保留作者、作品名、来源 URL、CC BY-SA 4.0 链接；
- 任何改编/衍生需以相同方式共享；
- 不能把 CC BY-SA 图片伪装成项目自有素材；
- 不能仅依赖仓库的 MIT LICENSE。

---

## 6. 审计结论

1. **代码层面**：只有 Heart-Star、Immersive-Photo-Gallery、Interactive-Xmas-Tree 具备明确的 MIT 代码许可；其余两个仓库的 “MIT” 只是 README 声明，缺许可证文件，按任务书只能研究。
2. **素材层面**：没有仓库提供一份完整、覆盖其所有图片、音乐、字体、模型的授权清单。ChristmasTree 的音乐、Christmas-Tree-Photos 的 MediaPipe/字体、Interactive 的未使用 textures 都有实质风险。
3. **依赖层面**：GSAP 不是 MIT；本项目不应为了功能数量而引入。Three.js 仍保持 0.160.0；不混入其他版本。
4. **F1 行为**：没有复制任何代码/素材，没有修改正式业务代码，没有新增生产依赖。

**最终建议：代码复制范围严格限制在 MIT 且经过单独审核的小型算法；素材全部自制/程序化生成；无许可证仓库只用于研究思路。**
