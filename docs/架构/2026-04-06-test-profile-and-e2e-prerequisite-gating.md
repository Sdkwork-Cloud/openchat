# OpenChat 测试环境剖面与 E2E 前置依赖门禁设计

日期: 2026-04-06
范围: `apps/openchat`

## 背景

在当前仓库中，`AppModule` 会在启动阶段接入 PostgreSQL、Redis、BullMQ、鉴权策略与多种扩展模块。若测试环境配置漂移，E2E 很容易表现为“长时间无输出超时”，而不是直接暴露真实阻塞点。

本轮对测试环境与 E2E 的目标不是“绕过依赖”，而是建立明确、可重复、可快速诊断的测试剖面与失败门禁。

## 设计原则

### 1. 测试环境必须收敛到文档定义的最小剖面

测试环境采用下列约束：

- `DB_NAME=openchat_test`
- `DB_USERNAME=openchat`
- `DB_PASSWORD=openchat_password`
- `REDIS_DB=10`
- `REDIS_QUEUE_DB=11`
- `WUKONGIM_ENABLED=false`
- `ENABLE_REDIS_ADAPTER=false`
- `QUEUE_ENABLED=false`

原因:

- 与 `docs/zh/config/server.md`、`docs/zh/deploy/index.md` 保持一致
- 减少测试阶段对完整消息基础设施的依赖
- 避免测试配置与运行时默认值互相冲突

### 2. 测试环境中的数据库连接必须 fail-fast

`createTypeOrmModuleOptions()` 在 `NODE_ENV=test` 下显式使用：

- `retryAttempts: 1`
- `retryDelay: 0`

原因:

- 生产环境容忍瞬时抖动是合理的
- 测试环境中，错误凭据或未初始化数据库不是瞬时抖动，而是确定性前置条件失败
- 长时间重试只会把根因包装成模糊超时

### 3. E2E 在启动 Nest 之前先验证前置依赖

`test/app.e2e-spec.ts` 在 `AppModule` 编译前执行：

- PostgreSQL 短超时连接探针
- Redis 短超时连接探针

若失败，直接抛出包含修复指令的错误，例如：

- 启动测试依赖: `make test-env`
- 初始化测试数据库: `npm run db:init:test`
- 或修正 `DB_*` / `REDIS_*` 配置

这样做的收益：

- 错误在秒级暴露
- 根因信息不再被 `TypeOrm` / `Nest` 启动链掩盖
- 适合跨操作系统的本地开发与 CI 排障

### 4. E2E 应复用同一个应用实例

旧实现为健康检查、鉴权、消息三个 suite 分别启动一次 `AppModule`。这会导致：

- 重复建立数据库 / Redis / 模块依赖
- 放大启动成本
- 在依赖错误时把等待时间乘以 suite 数量

因此改为：

- 单次 `beforeAll()` 初始化应用
- 单次 `afterAll()` 关闭应用
- 业务测试在同一应用实例上执行

## 当前结果

经过本轮收敛后：

- E2E 不再表现为长时间挂起
- 当前环境可在约 8 秒内直接报告数据库认证失败
- 失败信息中带有明确修复建议

这说明问题已经从“测试框架结构性拖慢排障”收敛为“单一环境前置条件未满足”。

## 后续建议

要让 E2E 全绿，后续应优先保证标准测试环境可用：

1. 提供或恢复 `.env.test`
2. 通过 `make test-env` 启动测试 PostgreSQL / Redis
3. 通过 `npm run db:init:test` 初始化 `openchat_test`
4. 在依赖满足后重新执行 `test/app.e2e-spec.ts`

如果之后仍有失败，再继续沿用“前置探针 -> 单一 blocker -> 最小修复 -> 验证”的闭环方式推进。
