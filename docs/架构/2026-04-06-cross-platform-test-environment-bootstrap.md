# OpenChat 跨平台测试环境引导与数据库 CLI 回退设计

日期: 2026-04-06
范围: `apps/openchat`

## 背景

OpenChat 的测试链路原本存在两个结构性问题：

1. `.env.test` 只是“看起来存在”，但实际执行链路没有稳定加载它
2. 测试库初始化依赖宿主机 `psql`，这在 Windows 或新机器上并不可靠

如果继续沿用旧路径，E2E 失败时会出现多种伪根因：

- 连到了错误的本机 PostgreSQL
- 被 `test/setup.ts` 的硬编码覆盖
- 没装 `psql` 无法初始化数据库
- 只能通过 `make test-env` 这种非跨平台入口启动依赖

本轮设计目标不是引入新的测试体系，而是在现有 Docker Compose + `.env.*` + CLI 体系内，把测试环境真正闭环。

## 设计决策

### 1. `run-with-env` 必须加载真实环境文件

`run-with-env.cjs` 现在统一通过共享环境解析逻辑装载：

- `.env.development`
- `.env.test`
- `.env.production`

这样做的原因：

1. 让 `npm run test` / `npm run test:e2e` / `npm run start:test` 使用同一条环境解析路径
2. 不再让测试环境依赖散落在 `setup.ts`、shell、CI 注入之间互相覆盖

### 2. 测试默认值只能补缺，不能覆盖

`test/setup.ts` 不再直接写死测试环境变量，而是调用 `applyTestEnvironmentDefaults()`：

- 若外部环境已注入值，则保留
- 若值缺失，则填充默认值

这样可以同时满足：

1. 本地没有 `.env.test` 时仍能提供兜底
2. `.env.test` 一旦存在，就成为真正的单一配置源

### 3. 测试端口与 Docker 资源要和开发环境隔离

`.env.test` 默认调整为：

- PostgreSQL `55432`
- Redis `56379`

并增加：

- `COMPOSE_PROJECT_NAME`
- `POSTGRES_CONTAINER_NAME`
- `REDIS_CONTAINER_NAME`
- `POSTGRES_VOLUME_NAME`
- `REDIS_VOLUME_NAME`
- `NETWORK_NAME`

原因：

1. 规避本机已有 `5432` / `6379` 服务
2. 规避测试环境和开发环境继续共享同名 Docker 资源
3. 让测试环境的所有诊断都能精确指向 `.env.test`

### 4. 测试依赖启动入口统一为共享 CLI

新增：

- `test-env up`
- `test-env down`
- `test-env status`

以及 npm 封装：

- `npm run test:env:up`
- `npm run test:env:down`
- `npm run test:env:status`

这样做的原因：

1. `make test-env` 对 Windows 不友好
2. 现有仓库已经有统一 CLI 入口，测试环境不应再额外维护一套分叉逻辑
3. 测试环境状态输出应与项目其他运维命令使用同一风格的日志与错误格式

### 5. 数据库 CLI 必须具备无 `psql` 宿主机回退能力

数据库初始化与补丁流程现在采用两级策略：

1. 优先使用宿主机 `psql`
2. 若宿主机没有 `psql`，则在存在 `POSTGRES_CONTAINER_NAME` 且 Docker 可用时，回退到：
   - `docker exec <container> psql`

原因：

1. Windows 新机器常常没有 PostgreSQL client
2. 测试环境本身就是 Docker 驱动时，不应再强制要求额外安装宿主机工具
3. 保留宿主机 `psql` 优先级，可以兼容外部数据库与非 Docker 场景

## 为什么不引入 Testcontainers

本轮没有引入 Testcontainers，原因如下：

1. 当前仓库已经围绕 `docker-compose.yml`、`.env.*`、手工数据库基线与运维脚本建立了稳定体系
2. 在已有体系尚未闭环时，再引入一套 JavaScript 侧容器编排，只会形成第二条并行测试架构
3. 当前主要问题不是“没有容器编排能力”，而是“现有测试环境入口没有真正被使用和验证”

因此本轮选择“修复现有路径”，而不是“新增第二套路径”。

## 当前边界

截至本轮，仓库内已完成：

1. 环境文件加载闭环
2. 测试默认值补缺闭环
3. 独立测试端口与资源命名
4. 跨平台测试依赖 CLI
5. 无宿主机 `psql` 的数据库 CLI 回退

当前未在仓库内解决的部分是：

1. 宿主机 Docker daemon / Docker Desktop 的响应性
2. 真正拉起测试 PostgreSQL / Redis 后的 E2E 端到端结果

这意味着当前架构层面的主要工作已经完成，剩余问题属于宿主机环境可用性与最终集成验证。
