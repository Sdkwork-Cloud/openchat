# OpenChat 生命周期排空与 E2E 运行时隔离设计

日期: 2026-04-06
范围: `apps/openchat`

## 背景

本轮在修复 E2E 时，暴露出三类容易被忽略但会直接影响系统稳定性的架构问题:

1. 业务服务在响应返回后继续执行后台任务，但没有生命周期托管
2. API 前缀重写后，错误日志和错误响应仍使用内部路径
3. 单测 mock 通过测试框架配置泄漏到 E2E 运行时

这三类问题表面上分别属于“关闭日志”“错误输出”“测试配置”，本质上都指向同一条架构原则:

外部可观察行为必须与真实运行语义一致，且不同测试层级必须严格隔离。

## 设计决策 1：响应后异步任务必须由所有者显式托管

适用对象:

1. 在 controller/service 中发起
2. 不阻塞当前 HTTP 返回
3. 但会继续访问数据库、Redis、外部 IM 或其他共享资源

决策:

1. 业务服务不能直接裸 `promise.catch(...)`
2. 必须维护任务集合
3. 在 `onModuleDestroy()` / `onApplicationShutdown()` 中显式排空

本轮落地:

1. `MessageService` 新增后台任务集合
2. `scheduleConversationUpdate()` 统一调度
3. `onModuleDestroy()` 统一 `Promise.allSettled()`

收益:

1. 关闭阶段不再出现“资源已释放，后台任务仍在跑”的竞态
2. fire-and-forget 被收口为“可观测、可等待、可审计”的生命周期行为

## 设计决策 2：错误路径必须反映调用方看到的真实路由

问题本质:

1. 中间件重写后的 `request.url` 是内部路由
2. 客户端实际访问的是带前缀的 `request.originalUrl`

决策:

1. 面向外部返回或日志展示的 `path` 字段应优先使用 `request.originalUrl`
2. 只有在 `originalUrl` 缺失时才回退 `request.url`

本轮落地:

1. `GlobalExceptionFilter`
2. `HttpErrorFilter`

收益:

1. 错误日志、监控、网关追踪、客户端报错能使用同一条外部路径语义
2. 避免“服务端说的是 `/auth/me`，客户端调用的是 `/im/v3/auth/me`”这类诊断断层

## 设计决策 3：单测 mock 与 E2E runtime 依赖必须物理隔离

问题本质:

1. `uuid` 单测 mock 使用固定返回值
2. 该 mock 对 E2E 运行产生污染
3. 结果是会话创建时 `uuid` 固定，直接触发唯一键冲突

决策:

1. 单测专用 mock 不放在会被 Jest 作为特殊手工 mock 目录长期扫描的位置
2. 单测和 E2E 分别维护自己的 `moduleNameMapper`
3. E2E 若无法直接消费真实依赖入口，应使用“语义等价但不固定”的 runtime shim

本轮落地:

1. 单测 mock 移到 `test/mocks/uuid.ts`
2. E2E 单独使用 `test/support/uuid-runtime.ts`
3. 新增 `uuid-resolution.e2e-spec.ts` 作为隔离回归

收益:

1. 单测可继续保留可预测 UUID
2. E2E 恢复真实运行时的“值唯一、格式正确”语义
3. 不同测试层级互不污染

## 设计决策 4：当应用关闭链路已验证正确时，E2E harness 可以采用显式收口策略

证据:

1. 独立全流程脚本可完成完整请求序列并 `app.close()`
2. 关闭后只剩标准输入输出句柄
3. 但 Jest E2E 进程仍可能不自然退出

决策:

1. 在应用已独立验证正确关闭的前提下
2. E2E harness 允许显式配置:
   - `detectOpenHandles`
   - `forceExit`
   - `openHandlesTimeout`

边界:

1. 这不是拿 `forceExit` 掩盖应用资源泄漏
2. 前提是必须先有独立证据证明应用自身可收口

收益:

1. CI、Windows 和无人值守终端不会因 Jest harness 自身挂起而卡死
2. 测试命令的可运维性显著提升

## 当前架构约束

后续新增模块时，应遵守以下约束:

1. 任何响应后异步任务都必须被托管和排空
2. 面向外部的路径语义一律优先 `originalUrl`
3. 单测 mock 不得默认泄漏到 E2E
4. 若引入新的测试级依赖替身，必须同时定义其“单测用”和“E2E 用”边界

## 当前落地文件

1. `src/modules/message/message.service.ts`
2. `src/common/filters/global-exception.filter.ts`
3. `src/common/filters/http-error.filter.ts`
4. `jest.config.js`
5. `test/jest-e2e.json`
6. `test/mocks/uuid.ts`
7. `test/support/uuid-runtime.ts`
8. `test/uuid-resolution.e2e-spec.ts`

## 总结

这轮设计不是局部修一个报错，而是把三个长期隐患统一收敛到明确架构原则:

1. 异步任务必须可排空
2. 错误路径必须反映真实外部路由
3. 测试层级必须严格隔离

这三条原则会直接影响后续的稳定性、安全诊断能力和跨平台可运维性。
