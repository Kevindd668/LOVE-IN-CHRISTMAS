# 03 · 星河为你亮起

独立地址：`http://127.0.0.1:8787/03-galaxy-nebula/`

## 视觉与交互

- 12000 颗近星 + 6000 颗远星（均可调），三层程序化星云平面，四层极光，5 颗可循环流星。
- 5000 颗金色粒子光瀑；三层发光椭圆轨道、中心爱心粒子和粉色光带。
- 视角：星空全景、星云近景、极光近景、金色光瀑、等待流星；相机平滑过渡。
- 可调星点数量、远景星点、流星数量、星云/极光层数、光瀑粒子、三种颜色、Bloom、自动环绕；支持暂停/重置/退出。

## 来源与改动

- 星云、极光、光瀑、轨道和镜头动效为本实验独立编写的 GLSL/Three.js 实现。
- 星场粒子与相机结构参考 `Interactive-Xmas-Tree`（MIT，main `be75d04`）的粒子/相机组织方式，代码未直接复制。
- 未使用参考仓库的图片、贴图、音频或模型；所有星云/极光是程序化着色器。

## 截图

`panorama.png`、`nebula-close.png`、`aurora-close.png`、`golden-fall.png`、`meteor.png`、`controls.png`。

## 运行与证据

- 实测约 240 FPS、36 draw calls、约 23000 粒子；控制台无错误。
- 详见 `docs/F2/EXPERIMENT_03_GALAXY.md` 与 `docs/F2/PERFORMANCE_REPORT.md`。
