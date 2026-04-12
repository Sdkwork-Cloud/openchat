# OpenChat 下一轮实施计划 V5

日期: 2026-04-06
阶段: 第七轮静态质量与 E2E 闭环推进
当前全局基线: `159 errors / eslint --quiet`

## 本轮前置结论

上一轮已完成 `BufferEncoding + import/export` 批次闭环，且新增两条回归测试：

1. `ExportService` 单次消费流导出缺陷已修复
2. `DataExportService` JSON 跨批次拼接缺陷已修复
3. 批次 A 目标文件已达到 `0 error`
4. `npm run lint:types` 与 `npm run build` 持续通过

## 本轮目标

继续优先收口 `src/common/services/*` 中低风险、高密度的 error，优先选择不会改变业务语义、且能直接降低全局 `eslint --quiet` 基线的文件。

## 批次顺序

### 批次 B: 锁与存储抽象集群

目标文件:

- `src/common/services/distributed-lock.service.ts`
- `src/common/services/file-storage.service.ts`
- `src/common/services/lock-manager.service.ts`
- `src/common/services/message-queue.service.ts`
- `src/common/services/metrics.service.ts`
- `src/common/services/notification.service.ts`

重点动作:

1. 清理未使用参数和未使用变量
2. 处理 `no-case-declarations`
3. 避免引入伪变量“消音”，优先删除无意义解构
4. 保持接口行为、返回值和控制流不变

验证:

- `npx eslint <targets>`
- `npm run lint:types`
- `npm run build`

### 批次 C: 调度与事务相关服务

候选文件:

- `src/common/services/scheduler-advanced.service.ts`
- `src/common/services/security-audit.service.ts`
- `src/common/services/task-queue.service.ts`
- `src/common/services/template-engine.service.ts`
- `src/common/services/throttle-strategy.service.ts`
- `src/common/services/transaction-manager.service.ts`

触发条件:

- 批次 B 验证完成后进入

### 批次 D: E2E 环境复试

前置条件:

1. 当前批次代码验证完成
2. Docker CLI 恢复稳定响应
3. `.env.test` 与测试文档保持一致

动作:

1. 验证 `docker ps`
2. 验证 `docker version`
3. 如仍卡住，继续输出更精确的环境阻塞点
4. 环境恢复后执行仓库约定的测试环境启动命令
5. 执行 `npm run db:init:test`
6. 重新运行:
   - `npm run test:e2e -- --runInBand --runTestsByPath test/app.e2e-spec.ts --detectOpenHandles --verbose`

## 成功标准

1. `eslint --quiet` 全局 error 从 `159` 继续下降
2. `npm run lint:types` 持续通过
3. `npm run build` 持续通过
4. 至少完成下一批 `common/services` 收口，或者在 Docker 恢复后完成一次新的 E2E 闭环尝试
