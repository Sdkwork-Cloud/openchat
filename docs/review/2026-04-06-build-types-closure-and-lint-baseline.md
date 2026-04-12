# OpenChat 第二轮修复记录：Build/Types 打通与 Lint 新基线

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第二轮质量收敛

## 本轮目标

在不做大规模重构的前提下，优先清除阻塞构建和类型检查的真实缺陷，并把本轮触达文件中的 lint error 一并收口，建立新的可迭代基线。

## 已完成修复

### 1. 公共错误归一化能力收口

新增:

- `src/common/utils/error.util.ts`
- `src/common/utils/error.util.spec.ts`

提供统一能力:

- `getErrorMessage(error: unknown): string`
- `toError(error: unknown): Error`
- `asRecord(value: unknown): Record<string, unknown> | undefined`

收益:

- 避免在各模块重复手写 `instanceof Error`
- 消除 `unknown` 直接访问 `.message` 的构建错误
- 为后续 `preserve-caught-error`、错误链路保真和日志规范化提供公共基础

### 2. 剩余 build / lint:types 阻塞项已闭环

已修复的问题簇:

- Redis 订阅监听器类型不安全
- 分页装饰器 `this` 推断错误
- 重试装饰器 `this` 推断错误
- 并发控制队列的 `unknown -> Error` 类型断裂
- 扩展注册中心 `ExtensionError` 的 cause 类型错误
- WebSocket ACK 暂存日志中的未知异常访问
- WebSocket JWT guard 的未知异常访问
- Agent memory / runtime / tool registry 中的未知异常访问和 `Error` 赋值错误
- LLM provider fallback 可能返回 `undefined`
- AI Bot、群消息批处理、小智 IoT 模块中大量 `unknown` 错误消息访问
- OpenAI Chat 服务的结构化错误响应读取不安全

### 3. 本轮触达文件 lint error 收口

在本轮修改过的关键文件中，已经把 lint `error` 收敛到 `0`，剩余仅为历史 warning:

- `src/bootstrap.ts`
- `src/common/redis/redis.service.ts`
- `src/common/services/pagination.service.ts`
- `src/extensions/core/extension-registry.service.ts`
- `src/modules/agent/**/*`
- `src/modules/iot/xiaozhi/**/*`

## 验证结果

### Fresh verification

- `npm run lint:types`
  - 结果: 通过
- `npm run build`
  - 结果: 通过
- `npm test -- --runInBand --runTestsByPath src/common/utils/error.util.spec.ts src/modules/agent/providers/llm-provider.factory.spec.ts src/common/schedulers/task-scheduler.service.spec.ts`
  - 结果: 13/13 通过
- `npm run lint`
  - 结果: 未通过
  - 最新基线: `309 errors / 2184 warnings`

### 与上一轮对比

上一轮基线:

- `npm run build`: 50 errors
- `npm run lint:types`: 与 build 同步失败
- `npm run lint`: 353 errors / 2184 warnings

当前基线:

- `npm run build`: 通过
- `npm run lint:types`: 通过
- `npm run lint`: 309 errors / 2184 warnings

净变化:

- Build 错误: `50 -> 0`
- Types 错误: `50 -> 0`
- Lint error: `353 -> 309`

## 本轮结论

当前仓库已经从“无法稳定构建”进入“可以构建、可以继续分批清理 lint error”的阶段。质量收敛路径是正确的，且公共层治理已证明收益明显。

但系统距离“可发布的极致质量态”仍有明显差距，主要体现在:

- 全局 lint error 仍有 309 个
- 历史 warning 体量依然很高
- `src/common/base/*`、`src/modules/user/*`、`test/*` 中仍存在大量低风险但高密度的静态问题

## 下一轮最优路径

建议继续按“高杠杆、低风险、可验证”的顺序推进:

1. `src/common/base/*` 统一清理 unused imports / unused catch vars / 参数命名问题
2. `src/modules/user/*` 清理 unused destructuring、无效 import、错误 cause 丢失问题
3. `test/*` 清理 `no-useless-escape`、`no-unassigned-vars` 等测试静态问题
4. 在上述 error 清零后，再分模块燃尽 warning

## 风险说明

- 本轮未改变核心业务流程，仅收敛公共错误边界和静态类型问题，回归风险可控
- 当前 `npm run lint` 仍未通过，不能宣称仓库已达到可发布质量
- 后续每一轮都必须继续保持 `lint:types` 与 `build` 通过，避免重新退回阻塞状态
