# A Christmas Wish · 圣诞心愿

> *You are my only Christmas wish.*
>
> 这个冬天，想把所有浪漫都送给你。

一个可以送给她的 **3D 互动圣诞礼物**。打开页面，是一棵程序化生成的圣诞树、环绕漂浮的照片、520 与 1314、温暖的灯串、雪夜、极光和礼物。她可以上传照片、调整灯光与粒子、换成你们的文字，也可以按下「45 秒圣诞电影」，让整个场景替你说完那段话。

项目使用 **Three.js r160 + TypeScript + WebGL2 + Vite**。所有场景资产均实时生成，不依赖后台、图库或在线字体。

---

## 直接打开

**双击 [`Christmas-Wish.html`](./Christmas-Wish.html)**，用 Chrome 或 Edge 打开即可。

这份单文件版本已经内联了 Three.js、CSS、字体轮廓和全部场景代码：

- 完全离线，不需要启动服务器；
- 没有外部网络请求；
- 文件约 **1.2 MB**；
- 上传的照片只在当前浏览器的内存中处理，不会离开她的设备。

> 另外，仓库根目录（`../Christmas-Wish.html`）也保留了一份同样的单文件副本，方便直接发送。

音乐、雪花、照片卡片和光照都是运行时生成的。照片上传属于当前会话：刷新页面后恢复为内置的 8 张示例照片，这是刻意的隐私设计（不做后台上传）。

---

## 给她的使用顺序

1. 打开页面，稍等 2 秒，圣诞树会被点亮。
2. 点右上角 **「开启音乐」**，或者直接开始「45 秒圣诞电影」/「只属于我们的圣诞节」，音乐会在用户手势后自动开启。
3. 展开右侧 **04 我们的照片**，上传你们的照片；支持 JPG / PNG / WEBP，最多 24 张。
4. 展开 **06 专属浪漫**，改 520、1314、祝福语、落款、礼物里的话和音乐。
5. 点 **「45 秒圣诞电影」** 播放完整故事；点 **「只属于我们的圣诞节」** 进入亲密特写。
6. 点右下角的相机图标可进入全屏欣赏。

### 场景里藏着的互动

| 操作 | 会发生什么 |
|---|---|
| 点击树顶星星 | 镜头拉近，树灯亮起，雪变慢，520 / 1314 同时出现，并打开专属祝福 |
| 点击圣诞树 | 点击处出现金色光圈与「520」字样，爱心粒子从指尖散开 |
| 点击夜空的空白处 | 600 颗爱心粒子短暂聚合成一颗大爱心，再缓缓散开 |
| 点击礼物盒 | 盖子升起、内部透出金光、爱心粒子爆开，并显示写在礼物里的那句话 |
| 点击照片卡片 | 打开大图与照片文字 |
| 拖动 / 滚轮 | 旋转和靠近这棵圣诞树 |

---

## 六大控制模块

右侧玻璃拟态面板里的每一项都会真实作用于 3D 场景，而不是装饰性 UI。

1. **圣诞树** — 高度、树冠、枝叶密度、层数、树叶颜色、旋转与速度。调整树体时会重建程序化枝层、树灯螺旋、树顶星、数字位置和镜头尺度。
2. **树体灯光** — 开关、主色、灯泡数量、亮度、闪烁速度、五种灯光模式（暖白 / 金色 / 冰蓝 / 七彩 / 粉色）。
3. **爱心粒子** — 开关、数量、颜色、大小、速度、环绕 / 聚合 / 飘散三种模式。
4. **我们的照片** — 本地上传、替换、删除、上下移动、文字编辑、三层轨道尺度、旋转速度、卡片尺寸、是否显示文字、暂停。
5. **冬夜环境** — 下雪、雪花数量与速度、星空、极光、夜空颜色、环境亮度。
6. **专属浪漫** — 520 / 1314 文本、祝福标题、祝福语、落款、三份礼物文字、音乐曲目与音量、一键浪漫。

面板底部还有 **Ultra / Balanced / Performance** 三档画质与实时 FPS、draw calls 读数。

---

## 技术实现

| 层次 | 方案 |
|---|---|
| 渲染 | WebGL2 / Three.js r160 / ACES Filmic tone mapping |
| 圣诞树 | 7 层程序化枝盘 + 分叉枝臂 + 3 组变体松针簇（InstancedMesh）+ 树冠内层 + 金/酒红/珍珠/玫瑰挂饰 + 树皮程序纹理 |
| 灯光 | 220 颗默认螺旋灯泡，单 draw call 的 ShaderMaterial 粒子灯泡 + 少量真实点光 + UnrealBloomPass |
| 文字 | Droid Serif 字体轮廓 → TextGeometry / ExtrudeGeometry；中文输入自动回退到 Canvas 纹理，保证仍可显示 |
| 照片 | Canvas/Blob 本地纹理，圆角相框几何体 + 相册面板 + 三层朝向摄像机的照片轨道 |
| 粒子 | 自写 GLSL：雪、星空、流星、爱心、点击魔法、极光和树体聚合 |
| 音频 | 纯 Web Audio 合成（钢琴、风铃、雪橇铃、氛围垫），无外部音频文件 |
| 后期 | EffectComposer → UnrealBloomPass → OutputPass，标题与 UI 走独立 DOM，不参与 bloom |
| 单文件 | Vite 构建后将 CSS / JS 内联，产出完全离线的 HTML |

### 目录

```text
Christmas-Wish/
├── Christmas-Wish.html        # 构建出的单文件礼物（同时复制到上一级目录）
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   ├── build.mjs               # 本地开发 / 构建的跨平台任务入口
│   └── build-single.mjs
├── src/
│   ├── main.ts
│   ├── styles.css
│   ├── config.ts
│   ├── core/                  # Renderer / SceneManager / CameraManager / AnimationManager / utils
│   ├── objects/               # ChristmasTree / TreeBranches / TreeLights / TreeStar / GiftBoxes / RomanticText
│   ├── particles/             # SnowParticles / HeartParticles / StarParticles / MagicParticles
│   ├── photos/                # PhotoManager / PhotoCard / PhotoOrbit / placeholderArt
│   ├── effects/               # AuroraEffect / BloomEffect / LightEffect
│   ├── interaction/           # MouseInteraction / GiftInteraction / DemoController / RomanceMoment
│   ├── ui/                    # ControlPanel / PhotoUploader / SettingsManager / UIManager
│   ├── audio/                 # MusicEngine
│   └── assets/fonts/          # 内联字体轮廓 + 字体 NOTICE
└── qa/                        # 验收报告、自动化脚本、截图
```

### 从源码运行

```bash
cd Christmas-Wish
npm install
npm run dev
# http://127.0.0.1:4173

# 生产构建 + 生成单文件礼物
npm run build:single
```

> 页面已针对键盘导航、`prefers-reduced-motion`、移动端抽屉和触控做了基础适配。推荐 Chrome / Edge（Chromium 158 实测）。

---

## 实测结果

在 **Edge 158 + NVIDIA RTX 3070 Ti Laptop GPU + Windows** 的真实硬件加速环境下：

| 场景 | 分辨率 | 结果 |
|---|---|---:|
| 默认场景，开箱即用 | 1440 × 900（DPR 1） | 约 190–240 FPS |
| 24 张照片，Ultra | 1920 × 1080（DPR 1） | 约 234–237 FPS，约 413 draw calls |
| 8 张照片，Ultra（等效 4K） | 3840 × 2160（DPR 2） | 约 162 FPS |
| 8 张照片，Balanced | 2880 × 1620 | 约 236 FPS |
| 8 张照片，Performance | 1810 × 1018 | 约 240 FPS |

更完整的验收与环境说明见：

- [`qa/visual-test.md`](./qa/visual-test.md)
- [`qa/performance-test.md`](./qa/performance-test.md)

---

## 渲染模式与画面闪黑

### 默认：兼容渲染

为了避免 Windows / Edge 上偶发的中央纯黑矩形闪烁，**现在默认使用兼容渲染**：

- WebGL 直接渲染到画布，不经过 Bloom 离屏合成链；
- 关闭全屏渐变、颗粒混合层和背景毛玻璃；
- 保留圣诞树、灯光、照片、粒子、相机、音乐和全部交互；
- 画面更干净、稳定，在当前机器上实测约 240 FPS。

### 完整效果模式

如果设备没有合成层闪烁问题，可以尝试完整 Bloom + 毛玻璃版本：在文件地址后加 `?full=1`，例如 `file:///C:/…/Christmas-Wish.html?full=1`。

`?safe=1` 仍然兼容并保持稳定模式；`?safe=0` 也可用于切到完整模式。

### 如果兼容模式仍然闪黑

这说明问题已经超出页面本身，属于 Edge / Chromium 在 Windows 上的 GPU 合成或 MPO（Multi-Plane Overlay）异常，通常与以下因素有关：

1. 浏览器硬件加速 / 显卡驱动状态；
2. RTSS、Game Bar、QQ 等屏幕覆盖层；
3. Windows 多平面覆盖层（MPO）与 WebGL 合成冲突。

可以尝试关闭 Edge 的“使用图形加速”后重启浏览器、关闭屏幕叠加层，或更新显卡驱动来验证。这个黑块不是圣诞树、照片、礼物或粒子模型导致的；场景代码里没有任何会形成那种纯黑矩形的物体。

## 说明与边界

- **照片不会上传**，只通过 `URL.createObjectURL` 在浏览器本地处理；刷新后不保留。这样送礼物时不会有隐私或后端成本。
- **浏览器策略要求音频先由用户手势触发**。直接点「开启音乐」，或开始电影 / 浪漫模式，音乐都会在当前用户操作后开始。
- 没有随机外部图片、CDN、在线字体或第三方音频。只有 Three.js（MIT）和嵌入的 Droid Serif 字体数据（Apache 2.0），见 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。
- 场景美术为程序化写意风格，追求圣诞夜的温柔氛围，而不是照片级写实。她的照片上传后才是这个场景真正的主角。
