# F2 · 五个独立视觉实验

本目录只存放 **F2 视觉实验**，不属于正式产品入口，不被 `Christmas-Wish.html`、`src/` 或正式构建引用。

## 启动

```powershell
cd C:\Users\29636\Desktop\日常交流\Christmas-Wish
node experiments/serve.mjs
```

打开 <http://127.0.0.1:8787/>：

| 编号 | 实验 | 独立入口 |
| --- | --- | --- |
| 01 | 十万次心跳 · 3D 爱心与星形粒子 | `/01-heart-particles/` |
| 02 | 双螺旋圣诞树 · 9 层树冠与反向光带 | `/02-double-helix-tree/` |
| 03 | 星河为你亮起 · 星云、极光与金色光瀑 | `/03-galaxy-nebula/` |
| 04 | 我们的照片记忆 · 3D 本地照片轨道 | `/04-photo-memory/` |
| 05 | 把这句话写进星河 · 电影镜头与粒子文字 | `/05-cinematic-effects/` |

每个实验均可单独刷新、单独截图、单独测量；没有共享的动画循环，也没有“合并演示”。

## 运行边界

- 使用本地 `experiments/vendor/three/` 的 Three.js **0.160.0** 与所需 addons；不是正式项目依赖。
- 不写正式 `localStorage`、不连正式 API、不改动产品页面。
- 照片实验只把文件读入当前浏览器内存；IndexedDB 写入必须由用户主动点击，且只用于验证实验能力。
- 本目录的截图是真实浏览器截图，参数性能见 `docs/F2/PERFORMANCE_REPORT.md`。

## 文档

- `docs/F2/README.md`：F2 总览、启动、文件边界
- `docs/F2/SOURCE_REUSE_REPORT.md`：参考仓库、版本、许可证、授权声明与改动
- `docs/F2/PERFORMANCE_REPORT.md`：环境、方法、统一指标
- `docs/F2/FINAL_ACCEPTANCE.md`：逐项验收与证据

## 许可与素材

Three.js 使用其 MIT 许可证，见 `experiments/vendor/three/LICENSE`。实验代码与生成纹理为本次 F2 工作产物；参考仓库的许可证状态、用户授权声明与具体复用范围以 `docs/F2/SOURCE_REUSE_REPORT.md` 为准。未引入第三方图片、音乐、模型、字体或贴图素材。
