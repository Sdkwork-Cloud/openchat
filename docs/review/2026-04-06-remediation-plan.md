# OpenChat 缺陷整改实施计划

日期: 2026-04-06
目标: 在不破坏现有脏工作树的前提下，以最小批次持续提升 openchat 的功能正确性、稳定性、跨平台能力和运维成熟度。

## 总体策略

采用“公共层优先、TDD 驱动、证据闭环”的推进方式:

1. 优先修复公共层真实缺陷
2. 每个问题先加失败测试，再写最小修复
3. 每个批次都执行 fresh verification
4. 每轮同步更新 review 文档、缺陷清单、架构文档
5. 控制单次改动范围，避免与现有脏工作树冲突

## Phase 1: 文档与基线

目标:

- 建立 review 与架构文档目录
- 固化当前质量基线和已确认问题

动作:

1. 建立 `docs/review/`
2. 建立 `docs/架构/`
3. 记录当前 lint/types/test/build 基线
4. 形成缺陷清单与优先级

完成标准:

- 文档已入库
- 后续每次迭代可回写

## Phase 2: 调度器稳定性修复

目标:

- 修复 `TaskSchedulerService` 的真实运行时缺陷

子步骤:

1. 为参数校验缺失编写失败测试
2. 为 pause/resume 行为错误编写失败测试
3. 为重试 timer 生命周期问题编写失败测试
4. 实现最小修复
5. 执行定向 jest、targeted lint、types、full lint
6. 更新文档状态

完成标准:

- 不依赖非空断言
- 非法调度参数会明确抛错
- 暂停/恢复行为对不同任务类型可预测
- 取消/销毁后不再发生幽灵重试

## Phase 3: 公共层 warning 燃尽

优先模块:

1. `src/common/logger/logger.service.ts`
2. `src/common/services/api-client.service.ts`
3. `src/common/entities/audit-log.entity.ts`

执行原则:

- 只处理一个模块或一个问题簇
- 如果是行为缺陷，必须先补测试
- 目标不是“清零 warning”，而是“持续消除高风险 warning”

## Phase 4: 跨平台运行能力收敛

目标:

- 让 Windows / Linux / macOS 都能通过统一入口启动、测试和部署

动作:

1. 梳理 shell / PowerShell / Node 脚本职责
2. 尽量以 `npm` + `node scripts/*.cjs` 作为主入口
3. 收敛编码、路径、换行和 shell 差异
4. 为关键运行链路补跨平台文档与验证步骤

完成标准:

- 至少开发、测试、构建、数据库初始化具备统一入口
- 启动日志在不同平台可读

## Phase 5: 运维与高可用收敛

目标:

- 把现有 health / metrics / queue / redis / db 能力收敛成可部署方案

动作:

1. 明确 readiness / liveness / startup health 边界
2. 统一关键指标与错误日志格式
3. 补 HA 部署和故障恢复设计文档
4. 为数据库、Redis、IM provider、队列建立降级思路

完成标准:

- 文档可指导生产部署
- 关键依赖故障时具备明确暴露和恢复路径

## 每轮必须执行的验证

最少验证:

- `npm run lint:types`
- `npm run lint`
- 针对本次修改的 jest 命令

涉及运行期/编译期改动时追加:

- `npm run build`

在时间允许且修复面扩大时追加:

- `npm test -- --runInBand`
- `npm run test:e2e`

## 风险控制

- 严禁清理或回滚与当前任务无关的脏改动
- 对 `sdkwork-im-sdk` 子模块变更保持只读
- 每次只推进一小批问题，避免与用户已有修改交叉污染

## 下一步

当前进入:

- `Phase 2: 调度器稳定性修复`

本轮结束前需要交付:

1. 调度器回归测试
2. 调度器修复代码
3. fresh verification 结果
4. 文档状态回写
