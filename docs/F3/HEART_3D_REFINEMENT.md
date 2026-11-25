# 巨型爱心 3D 体积升级

> 分支：`f3-heart-look`（已 fast-forward 合并到 `feature/visual-upgrade`）  
> 基线：已验收 F3 `18949dd`  
> 状态：**验收通过并已合并；合并提交 `248e1c8`。**  
> standalone：`Christmas-Wish.html`，SHA-256 `A443243AFA0C50D222C8728A46178551635DB838A50C0417FEFF0D7CFAE0C511`

## 1. 改动目标

把原来的“薄片粒子爱心”改成真正有体积的 3D 心形：

- 原来 z 轴只有 ±0.56，视觉上接近平面贴纸；
- 现在 z 轴范围 **±1.29，总厚度约 2.58**；
- 每个 z 层的 2D 心形截面按深度平滑收缩，形成真实的实体体积；
- 前后层有不同亮度和颜色，侧面/斜视角能看出厚度；
- 保留 10000 粒子、聚合/爆散、呼吸、数量/颜色/暂停控件。

## 2. 具体实现

文件：`src/particles/HeartParticleSystem.ts`

### 体积采样

```text
depthNorm  ∈ [-1, 1]
z          = depthNorm × 1.29
depthScale = (1 - |depthNorm|^2.4)^0.55
x,y        = 心形截面点 × depthScale × shellScale
```

- `z=0` 时是完整心形截面；
- 向 `z=±1.29` 移动时截面逐渐收缩，形成厚实的前后体积；
- 不再把粒子只压在轮廓壳层；
- 10% 外壳采样 + 内部体积采样。

### 深度着色

新增 `aDepth` attribute：

- 前层粒子偏白、尺寸稍大；
- 后层粒子偏玫红、尺寸稍小；
- 片元着色器根据 `vDepth` 调整颜色和 alpha；
- 从斜侧看时能区分前后层。

### 颜色

- 移除原来的金色/蓝色混合；
- 主色为热粉 → 浅粉 → 白；
- 更接近参考图的白色火花爱心。

### 发光

- 新增一张 256×256 径向 glow CanvasTexture；
- 使用 additive Sprite 作为整颗爱心的柔光底；
- 不额外增加 Bloom pass，兼容模式也能看到光晕；
- 完整 Bloom 模式下继续由正式 EffectComposer 叠加。

### 3D 朝向

- 心形粒子组以 Y 轴 ±0.45 rad 缓慢摆动；
- X 轴 ±0.055 rad 轻微俯仰；
- 让正面看起来仍是心形，斜侧能看出真实厚度。

## 3. 证据截图

目录：`docs/F3/heart-look/`

| 文件 | 内容 |
| --- | --- |
| `compare-heart-volume.png` | 已验收旧版 vs 新版并排 |
| `volume-front.png` | 正面：白色粉色粒子心 |
| `volume-angle.png` | 斜侧：厚度/深度层次 |
| `volume-side.png` | 90° 侧面：厚度轮廓 |
| `volume-three-quarter.png` | 3/4 视角 |
| `after-heart-close.png` | 场景内近景 |
| `after-overall.png` | 正式场景整体 |

关键数据：

```text
z min = -1.2921
z max =  1.2921
总厚度 = 2.5842
粒子数 = 10000
```

## 4. 回归

| 测试 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过 |
| `npm run build:single` | 通过 |
| `qa/smoke-test.mjs` | 通过，0 error |
| `qa/raycast-test.mjs` | 通过 |
| `qa/singlefile-test.mjs` | 通过，0 failed request |

## 5. 性能

数据：`qa/heart-look/performance.json`

| 场景 | FPS | P95 | Draw Calls | Points |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 | 216.8 | 8.3 ms | 315 | 38,362 |
| 3840×2160 | 156.3 | 8.4 ms | 315 | 38,362 |

- 同场景 draw calls 仅 +1（glow Sprite）；
- 粒子数仍为 10000；
- 4K 仍高于 60 FPS；
- 未改照片/礼物/音乐/45 秒演示/浪漫模式/画质设置。

## 6. 边界

- 这是粒子体积，不是实心 Mesh；侧面看起来是厚实的椭圆截面，正面仍是心形轮廓；
- 发光 Sprite 是 2D billboard，粒子体本身有真实 z 厚度；
- 未合并、未覆盖已验收 F3；当前只在 `f3-heart-look` 分支。
