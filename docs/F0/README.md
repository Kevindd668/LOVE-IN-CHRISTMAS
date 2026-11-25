# F0 · 现有项目审计交付索引

**阶段状态：** 完成，等待验收；F1 尚未开始。  
**基线：** `v1.0.0-baseline` / `c9e3d02`  
**开发分支：** `feature/visual-upgrade`

| 报告 | 内容 |
|---|---|
| [`BASELINE.md`](./BASELINE.md) | 正式版本、Git 基线、分支、备份、环境、F0 边界 |
| [`CURRENT_ARCHITECTURE.md`](./CURRENT_ARCHITECTURE.md) | 渲染循环、模块分层、资源生命周期、技术债与升级阻塞点 |
| [`CURRENT_FEATURES.md`](./CURRENT_FEATURES.md) | 当前功能清单、必须保留的业务能力、与升级目标的差距 |
| [`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md) | 真实硬件性能、24 照片、4K、三档画质、4 分钟稳定性与风险 |
| [`REGRESSION_CHECKLIST.md`](./REGRESSION_CHECKLIST.md) | F0 复核结果、P0 阻断项、F3–F5 每阶段回归门禁 |

## QA 证据

- 性能原始数据与截图：`qa/f0/`
- F0 功能测试日志：`qa/f0/functional-tests.log`
- 功能测试退出码汇总：`qa/f0/functional-summary.json`
- 参数持久化专项：`qa/f0/persistence-check.json`
- 照片资源回环专项：`qa/f0/photo-resource-check.json`
- 官方单文件备份：`C:\Users\29636\Desktop\日常交流\backups\Christmas-Wish-v1.0.0-standalone.html`
- 完整源码备份：`C:\Users\29636\Desktop\日常交流\backups\Christmas-Wish-v1.0.0-baseline_2026-11-25.zip`

## 当前阻塞 F1 的条件

1. 用户验收 F0。
2. 确认 F4 前“5 个现有礼物 vs 3 个目标礼物”的产品决策。
3. 确认 F5 的 60 秒演示与当前 45 秒流程的替换方式（保留暂停/继续/退出/重播）。
4. 确认是否允许引入 GSAP 与 IndexedDB，以及照片跨会话保存的隐私边界。

**F0 没有修改任何业务源码。**
