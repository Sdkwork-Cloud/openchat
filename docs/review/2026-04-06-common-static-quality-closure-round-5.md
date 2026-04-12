# OpenChat 第五轮静态质量收敛记录：Common 基础设施与 Service 集群

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第五轮静态质量收敛与验证闭环

## 本轮目标

在保持 `npm run lint:types` 与 `npm run build` 持续通过的前提下，继续压缩 `eslint --quiet` 全局 error 基线，优先清理 `src/common/*` 下低风险、可验证、不会改变业务语义的问题。

## 本轮完成的两个批次

### 批次 A: `src/common` 基础设施卫生问题收敛

覆盖范围:

- `src/common/events/event-bus.service.ts`
- `src/common/filters/*`
- `src/common/interceptors/*`
- `src/common/logger/logger.service.ts`
- `src/common/metrics/*`
- `src/common/middleware/compression.middleware.ts`
- `src/common/monitoring/performance-monitor.service.ts`
- `src/common/pipes/*`
- `src/common/queue/*`
- `src/common/redis/redis.module.ts`
- `src/common/schedulers/message-retry.scheduler.ts`
- `src/common/services/audit-log.service.ts`

已修复问题:

1. 多处未使用 import、未使用参数、未使用局部变量导致的 `@typescript-eslint/no-unused-vars`
2. `compression.middleware.ts` 中包装 `res.end()` 时未透传可选参数，顺手补齐为 `originalEnd(data, ...args)`，避免未来回调被吞
3. `event-bus.service.ts` 中历史损坏注释触发 `no-irregular-whitespace`

修复说明:

- 对未使用 import 直接移除
- 对接口/框架签名要求保留的参数改为 `_metadata` 等前缀形式
- 对 switch-case 中仅用于 lint 收敛的问题保持最小改动，不引入行为变化
- 对损坏注释没有做大范围编码迁移，而是采用局部 `eslint-disable/enable` 包裹并补充 ASCII 说明注释，避免误改整文件内容

### 批次 B: `src/common/services/*` 第二批低风险收敛

覆盖范围:

- `src/common/services/batch-operation.service.ts`
- `src/common/services/cache-strategy.service.ts`
- `src/common/services/cache.service.ts`
- `src/common/services/circuit-breaker.service.ts`
- `src/common/services/connection-manager.service.ts`
- `src/common/services/health-check-extension.service.ts`
- `src/common/services/i18n.service.ts`
- `src/common/services/id-generator.service.ts`
- `src/common/services/idempotency.service.ts`

已修复问题:

1. 未使用的解构字段、局部变量和参数
2. `cache-strategy.service.ts` 与 `id-generator.service.ts` 的 `no-case-declarations`
3. `idempotency.service.ts` 在去掉无意义泛型后，调用点残留 `<T>` 引发的 TypeScript 构建回归

修复说明:

- `batch-operation.service.ts` 中不再解构未使用字段，避免通过假变量“消音”
- `circuit-breaker.service.ts` 删除未使用的临时 `CircuitBreakerService` 实例，避免误导维护者
- `idempotency.service.ts` 保持 `getRecord()` 为非泛型私有方法，并同步修正调用点

## 重要问题与处理决策

### BUG-012 `user-context.decorator.ts` 的导出重命名导致类型发射回归

- 严重级别: Medium
- 状态: 已修复
- 症状:
  - `npm run lint:types`
  - `npm run build`
  同时报错 `TS4022`
- 根因:
  - 为绕过 `no-redeclare`，把三个参数装饰器重命名后再导出，导致 `SearchParams` 接口继承链在声明发射阶段引用到非公开名
- 修复:
  - 恢复为 TypeScript 允许的“类型/值同名导出”模式
  - 仅对三处 decorator 常量添加局部 `// eslint-disable-next-line no-redeclare`
- 结果:
  - 类型导出恢复正常
  - `lint:types/build` 重新回到绿色

### BUG-013 `event-bus.service.ts` 存在遗留编码污染注释

- 严重级别: Low
- 状态: 已收敛
- 症状:
  - 单行损坏注释触发 `no-irregular-whitespace`
- 根因:
  - 历史文件中存在已损坏的注释内容和异常空白字符
- 修复:
  - 仅在受影响注释块周围使用局部 `eslint-disable no-irregular-whitespace`
  - 增补一条 ASCII 注释，明确该方法语义
- 说明:
  - 这是受控收敛，不是完整编码迁移；完整迁移应在未来统一评估文件编码策略后进行

## 验证结果

### 定向验证

- `npx eslint` 针对本轮修改文件:
  - 结果: 全部 `0 error`，仅保留 warning
- `npx eslint src/common/decorators/user-context.decorator.ts --ext .ts`
  - 结果: `0 error`

### 项目级验证

- `npm run lint:types`
  - 结果: 通过
- `npm run build`
  - 结果: 通过
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`
  - 结果: 未全部通过，但全局 error 继续下降到 `174`

## 基线变化

本轮开始时:

- `eslint --quiet`: `240 errors`

批次 A 完成后:

- `eslint --quiet`: `190 errors`

批次 B 完成后:

- `eslint --quiet`: `174 errors`

净变化:

- `240 -> 174`
- 净下降 `66` 个 error

## 当前剩余高价值问题簇

下一批仍主要集中在 `src/common/services/*`:

1. `BufferEncoding` 被 ESLint 当作未定义标识符:
   - `data-export.service.ts`
   - `encryption.service.ts`
   - `file-handler.service.ts`
2. 导出/导入服务中的无效赋值和未使用参数:
   - `export.service.ts`
   - `import.service.ts`
3. 锁与存储抽象中的占位参数:
   - `distributed-lock.service.ts`
   - `file-storage.service.ts`

## E2E 环境复核结果

本轮对 E2E 前置条件做了轻量复核，结果如下:

1. 复核时发现 `.env.test` 缺失，现已补齐
2. `Makefile` 中 `test-env` 目标依赖 `.env.test`
3. `docker ps` 在本机 34 秒内未返回
4. `docker version` 在本机 19 秒内未返回
5. `Get-Service *docker*` 显示 `com.docker.service` 为 `Running`

结论:

- 当前 E2E 仍不适合直接重试
- 阻塞点已经从“应用启动链模糊超时”进一步收敛为:
  1. Docker 客户端与守护进程通信异常或卡死
  2. 上一轮已确认的测试数据库认证需在环境恢复后重新验证

下一轮应优先确认 Docker CLI 可正常响应，然后执行 `make test-env`

## 结论

本轮已经形成完整闭环:

1. 识别真实基线，而不是沿用已过期问题列表
2. 完成两批低风险静态质量收敛
3. 发现并修复一处真实的 TypeScript 导出回归
4. 保持 `types/build` 绿色
5. 把 `eslint --quiet` 全局 error 从 `240` 压到 `174`

当前尚未重新跑通 E2E；本轮已经补齐 `.env.test`，但 Docker CLI 仍处于卡住状态，因此无法继续启动测试依赖。环境恢复后，仍需回到上一轮已定位的测试数据库认证链路继续验证。
