# OpenChat 第七轮修复记录：Common Services 与 Common Core 持续收口

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第七轮静态质量持续压降

## 本轮目标

在第六轮已经完成流式导出真实缺陷闭环的基础上，继续沿低风险、高密度路径压降 `eslint --quiet` 基线，优先收口：

1. `src/common/services/*`
2. `src/common/types/*`
3. `src/common/utils/*`
4. `src/common/websocket/*`

## 本轮完成的批次

### 批次 B: 锁与存储抽象集群

覆盖文件:

- `src/common/services/distributed-lock.service.ts`
- `src/common/services/file-storage.service.ts`
- `src/common/services/lock-manager.service.ts`
- `src/common/services/message-queue.service.ts`
- `src/common/services/metrics.service.ts`
- `src/common/services/notification.service.ts`

收口内容:

1. 清理未使用参数和未使用解构变量
2. 修复 `metrics.service.ts` 中的 `no-case-declarations`
3. 保持接口行为不变，不引入占位伪变量

结果:

- 上述文件定向 ESLint 达到 `0 error`

### 批次 C: 调度、事务与工作流服务集群

覆盖文件:

- `src/common/services/scheduler-advanced.service.ts`
- `src/common/services/security-audit.service.ts`
- `src/common/services/task-queue.service.ts`
- `src/common/services/template-engine.service.ts`
- `src/common/services/throttle-strategy.service.ts`
- `src/common/services/transaction-manager.service.ts`
- `src/common/services/validation.service.ts`
- `src/common/services/version-control.service.ts`
- `src/common/services/webhook.service.ts`
- `src/common/services/workflow-engine.service.ts`

收口内容:

1. 清理未使用参数和未使用局部变量
2. 修复 `validation.service.ts` 中的 `no-case-declarations`
3. 修复遍历回调中无意义的未使用索引或键值

结果:

- 上述文件定向 ESLint 达到 `0 error`

### 批次 D: Common Core 公共核心集群

覆盖文件:

- `src/common/types/index.ts`
- `src/common/utils/index.ts`
- `src/common/utils/performance-optimizer.ts`
- `src/common/utils/query-builder.helper.ts`
- `src/common/utils/typeorm-batch-operation.service.ts`
- `src/common/websocket/base-websocket.gateway.ts`

收口内容:

1. `UnionToTuple` 条件类型中的无意义 `infer _` 改为 `unknown`
2. 公共工具统一改为显式访问 `globalThis.crypto`
3. 删除未使用的 TypeORM 辅助类型和无效 import
4. 清理 `base-websocket.gateway.ts` 中未使用参数与无效局部变量

结果:

- 上述文件定向 ESLint 达到 `0 error`

## 验证结果

### 功能回归测试

仍保留并通过的关键回归测试:

- `src/common/services/export.service.spec.ts`
- `src/common/services/data-export.service.spec.ts`

命令:

- `npm run test -- --runTestsByPath src/common/services/export.service.spec.ts src/common/services/data-export.service.spec.ts --runInBand`
  - 结果: 通过

### 定向静态检查

命令:

- `npx eslint <当前批次目标文件>`
  - 结果: 各批次目标文件均已达到 `0 error`

### 项目级验证

- `npm run lint:types`
  - 结果: 持续通过
- `npm run build`
  - 结果: 持续通过
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
  - 结果: 全局 error 继续下降到 `95`

## 基线变化

本轮进入前基线:

- `eslint --quiet`: `159 errors`

批次 B 完成后:

- `eslint --quiet`: `127 errors`

批次 C 完成后:

- `eslint --quiet`: `107 errors`

批次 D 完成后:

- `eslint --quiet`: `95 errors`

本轮净变化:

- `159 -> 95`
- 净下降 `64` 个 error

## 当前剩余高价值问题分布

当前 error 已经明显从 `common/services` 转移到更外围的模块层与扩展层，主要集中在:

1. `src/extensions/*`
2. `src/gateways/ws.gateway.ts`
3. `src/main.ts`
4. `src/modules/agent/*`
5. `src/modules/craw/*`
6. `src/modules/iot/*`
7. `src/modules/message/*`
8. `src/modules/friend/*`
9. `src/modules/group/*`
10. `src/modules/rtc/*`

## E2E 状态

本轮仍未重新尝试 E2E。原因不是代码回退，而是当前静态质量收口仍有明确、低风险、可持续推进的空间，同时 Docker CLI 阻塞问题还没有新证据表明已恢复。

已知前置结论维持不变:

1. `.env.test` 已存在
2. Docker CLI 之前仍有卡住现象
3. 环境恢复后仍需按仓库约定重新执行 `make test-env` 与 `npm run test:e2e`

## 结论

截至本轮结束，已经完成一条明确的质量收口路径:

1. 流式导出真实缺陷已通过测试闭环修复
2. `common/services` 大块 error 已基本出清
3. `common/types`、`common/utils`、`common/websocket` 进一步收口
4. `lint:types` 与 `build` 持续保持绿色
5. 全局 `eslint --quiet` 基线从 `159` 压到 `95`

下一步应继续沿“外围低风险集群”推进，优先处理 `extensions` 和少量网关入口，再逐步进入模块层。
