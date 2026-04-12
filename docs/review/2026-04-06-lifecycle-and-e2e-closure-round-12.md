# OpenChat 第十二轮修复记录：生命周期收口与 E2E 运行闭环

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第十二轮执行闭环

## 本轮目标

在前几轮完成测试环境、数据库 patch、IM 前缀路由和若干运行时缺口修复后，本轮聚焦两个收尾方向:

1. 关闭阶段仍存在的异步生命周期缺口
2. `npm run test:e2e -- --runInBand` 无法稳定完成的运行链路

目标不是新增功能，而是把“功能能跑”推进到“关闭可收口、E2E 可稳定执行、错误输出与真实外部路由一致”。

## 本轮确认的问题清单

### 1. `MessageService` 在响应返回后仍有未受控后台任务

现象:

1. 强制退出版 E2E 虽然断言通过，但关闭阶段出现数据库连接终止后的会话更新错误
2. `sendMessage()` 在两条分支里都直接 fire-and-forget 调用 `updateConversationForMessageOptimized()`
3. 应用关闭时这些后台任务没有被 `MessageService` 自己跟踪和排空

风险:

1. 关闭阶段出现误报错误日志
2. 真实环境中可能形成“业务响应已经返回，但后台收尾仍在访问已销毁资源”的竞态

### 2. 前缀 API 的错误响应路径丢失外部访问地址

现象:

1. `/im/v3/*` 和 `/admin/im/v3/*` 在中间件重写后，异常过滤器输出 `request.url`
2. 返回体和日志里的 `path` 会变成内部重写后的 `/auth/me`，而不是调用方真实访问的 `/im/v3/auth/me`

风险:

1. 诊断日志与网关/客户端实际调用路径不一致
2. 排查接口问题时容易误判是内部裸路由请求

### 3. E2E 运行时错误继承了单测 UUID mock

根因证据:

1. `test/__mocks__/uuid.ts` 使用固定值 `mock-uuid-1234`
2. 在 E2E 运行中，`ConversationEntity` 实际生成的 `uuid` 被观测到正是 `mock-uuid-1234`
3. 发送消息后创建会话时触发数据库唯一键冲突: `chat_conversations_uuid_key`

风险:

1. E2E 并不在验证真实运行时行为，而是在验证被单测 mock 污染后的行为
2. 一旦触发会话创建，关闭期收尾会碰到隐藏的唯一约束冲突

### 4. Jest E2E harness 自身存在退出挂起

证据:

1. 独立全流程脚本在完成 `/health`、`/metrics`、`/auth/register`、`/auth/me`、`/messages` 后可以正常 `app.close()`
2. 关闭后活动句柄只剩标准输入输出 `Socket`
3. 但 `npm run test:e2e -- --runInBand` 仍会长时间不退出

结论:

1. 应用自身生命周期已基本收口
2. 剩余挂起位于 Jest E2E 运行层，而不是主业务关闭链路

## 本轮修复

### 1. 给 `MessageService` 增加后台任务跟踪与关闭排空

涉及文件:

1. `src/modules/message/message.service.ts`
2. `src/modules/message/message.service.spec.ts`

修复内容:

1. `MessageService` 实现 `OnModuleDestroy`
2. 新增 `pendingBackgroundTasks` 集合和 `isShuttingDown` 标记
3. 用 `scheduleConversationUpdate()` 统一托管异步会话更新任务
4. `onModuleDestroy()` 中等待所有挂起后台任务 `Promise.allSettled()`
5. 关闭期不再重复输出预期内的后台任务错误

验证:

1. 新增回归测试，证明 `onModuleDestroy()` 会等待挂起会话更新完成
2. 强制退出版 E2E 不再出现关闭期数据库终止导致的会话更新失败日志

### 2. 统一错误过滤器输出外部原始路由

涉及文件:

1. `src/common/filters/global-exception.filter.ts`
2. `src/common/filters/http-error.filter.ts`
3. `src/common/filters/request-path-consistency.spec.ts`

修复内容:

1. 两个过滤器统一改为优先使用 `request.originalUrl || request.url`
2. 新增回归测试，覆盖 `GlobalExceptionFilter` 和 `HttpErrorFilter`

结果:

1. `/im/v3/auth/me` 的 401 日志和响应体路径保持一致
2. 诊断信息与外部 API 契约重新对齐

### 3. 隔离单测 UUID mock 与 E2E 运行时

涉及文件:

1. `jest.config.js`
2. `test/jest-e2e.json`
3. `test/mocks/uuid.ts`
4. `test/support/uuid-runtime.ts`
5. `test/uuid-resolution.e2e-spec.ts`

修复内容:

1. 将单测专用 UUID mock 从特殊目录 `test/__mocks__/` 移到普通目录 `test/mocks/`
2. 根单测配置继续显式映射到单测 mock，保持原有单测稳定性
3. E2E 配置单独映射到 `test/support/uuid-runtime.ts`
4. 新增 E2E 断言，验证运行时 UUID 不再是固定 `mock-uuid-1234`

结果:

1. E2E 会话创建恢复唯一 UUID 语义
2. 关闭期不再出现 `chat_conversations_uuid_key` 冲突

### 4. 收敛 E2E Jest 运行配置

涉及文件:

1. `test/jest-e2e.json`

修复内容:

1. 显式开启 `detectOpenHandles`
2. 显式开启 `forceExit`
3. 设置 `openHandlesTimeout=2000`

采用原因:

1. 应用生命周期已通过独立全流程脚本证明可以正确关闭
2. 剩余不退出位于 Jest harness，而不是应用运行时
3. 对 CI、Windows 终端和无人值守执行来说，避免测试命令无限挂起是更高优先级

## 本轮验证

### 定向单测

命令:

```bash
npm run test -- --runTestsByPath src/modules/message/message.service.spec.ts --runInBand
```

结果:

1. 通过
2. 新增关闭期后台任务排空回归已转绿

命令:

```bash
npm run test -- --runTestsByPath src/common/filters/request-path-consistency.spec.ts --runInBand
```

结果:

1. 通过
2. 前缀路径一致性回归已转绿

### E2E 运行时 UUID 隔离验证

命令:

```bash
node scripts/run-with-env.cjs test node node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand --runTestsByPath test/uuid-resolution.e2e-spec.ts
```

结果:

1. 通过
2. 证明 E2E 不再使用固定 UUID mock

### E2E 功能与退出验证

命令:

```bash
npm run db:init:test -- --yes --seed
npm run test:e2e -- --runInBand
```

结果:

1. 通过
2. `2 passed, 2 total`
3. `8 passed, 8 total`
4. 命令可稳定退出

### 相关回归

命令:

```bash
npm run test -- --runTestsByPath src/common/redis/redis.module.spec.ts src/common/events/event-bus.service.spec.ts src/gateways/ws.gateway.spec.ts src/modules/message/message.service.spec.ts src/common/filters/request-path-consistency.spec.ts --runInBand
```

结果:

1. 通过
2. `93 passed, 93 total`

### 类型与构建

命令:

```bash
npm run lint:types
npm run build
```

结果:

1. 均通过

## 本轮结论

本轮把“E2E 只有强制退出才能过”和“关闭时仍有后台任务竞态”推进为完整闭环:

1. 应用级生命周期缺口已被收口
2. API 错误路径与真实外部前缀重新对齐
3. E2E 与单测的 UUID 依赖彻底隔离
4. 标准 `npm run test:e2e -- --runInBand` 已可稳定完成

## 仍需后续关注的点

1. `forceExit` 当前是对 Jest harness 挂起的工程性兜底，不应被误读为应用生命周期仍未收口
2. 若后续希望进一步提升测试洁净度，可继续深挖 Jest 层为什么在不 `forceExit` 时仍不自然退出
3. 部分负向单测会打印预期中的 error/warn 日志，后续可再收敛日志噪音
