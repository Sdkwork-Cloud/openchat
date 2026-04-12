# OpenChat 第十轮修复记录：测试环境跨平台闭环与宿主机阻塞收敛

日期: 2026-04-06
范围: `apps/openchat`
阶段: 第十轮执行闭环

## 本轮核心问题

围绕 `test:e2e` 的阻塞链路，本轮确认了 6 个根因：

1. `scripts/run-with-env.cjs` 只写入 `NODE_ENV`，并不会真正加载 `.env.test`
2. `test/setup.ts` 硬编码覆盖 `DB_PORT` / `REDIS_PORT` / `JWT_SECRET` 等变量，使 `.env.test` 即使存在也无法生效
3. 测试环境沿用 `5432` / `6379`，容易直接撞上本机 PostgreSQL / Redis 或 WSL 转发端口
4. 仓库只有 `make test-env` 这类类 Unix 入口，Windows 上测试依赖启动路径不统一
5. `db:init:test` 强依赖宿主机 `psql`，在未安装 PostgreSQL 客户端的 Windows 主机上不可用
6. 当前宿主机 Docker CLI 已安装，但 `docker compose up` / `docker compose ps` 在限定时间内无响应，E2E 仍被外部环境阻塞

## 本轮修复

### 1. 让测试脚本真正受 `.env.test` 驱动

修改文件：

- `scripts/run-with-env.cjs`
- `test/setup.ts`
- `test/support/apply-test-env-defaults.ts`
- `test/runtime/run-with-env.spec.ts`
- `test/runtime/test-env-defaults.spec.ts`

修复内容：

1. `run-with-env.cjs` 现在会通过共享环境解析逻辑加载目标环境文件，而不只是设置 `NODE_ENV`
2. `test/setup.ts` 不再无条件覆盖环境变量，改为仅补全缺失的默认值
3. 为该行为新增回归测试，证明：
   - 子进程能收到 `.env.test` 中的真实值
   - 测试默认值只会填补缺失项，不会覆盖外部注入

### 2. 为测试环境建立独立端口和 Docker 资源命名

修改文件：

- `.env.test`
- `.env.example`
- `docker-compose.yml`
- `test/runtime/test-environment-cli.spec.ts`

修复内容：

1. `.env.test` 默认切换到独立端口：
   - PostgreSQL `55432`
   - Redis `56379`
2. `.env.test` 增加测试环境隔离变量：
   - `COMPOSE_PROJECT_NAME=openchat-test`
   - `POSTGRES_CONTAINER_NAME=openchat-test-postgres`
   - `REDIS_CONTAINER_NAME=openchat-test-redis`
   - `POSTGRES_VOLUME_NAME=openchat_test_postgres_data`
   - `REDIS_VOLUME_NAME=openchat_test_redis_data`
   - `NETWORK_NAME=openchat-test-network`
3. `docker-compose.yml` 支持读取上述容器名与卷名变量，避免测试环境继续和默认开发环境抢占同名资源
4. `app.depends_on` 对 `postgres` / `redis` / `wukongim` 改为 `required: false`，避免只启动测试依赖时被 `app -> wukongim` 的校验链拦截
5. 删除主 compose 文件中过时的 `version` 字段，消除 Docker Compose 警告

### 3. 新增跨平台测试依赖入口

修改文件：

- `scripts/lib/node/test-environment.cjs`
- `scripts/lib/node/cli.cjs`
- `scripts/test-environment.sh`
- `scripts/test-environment.ps1`
- `package.json`
- `test/runtime/openchat-cli.spec.ts`

修复内容：

1. 新增共享 CLI 子命令：
   - `test-env up`
   - `test-env down`
   - `test-env status`
2. 新增 npm 快捷命令：
   - `npm run test:env:up`
   - `npm run test:env:down`
   - `npm run test:env:status`
3. `status` 会输出：
   - 当前 `.env.test` 文件
   - PostgreSQL / Redis 目标端口
   - 本地 TCP listener 状态
   - Docker Compose 是否超时
4. `up` / `status` 对 Docker 超时给出可读错误，而不是原始 `spawnSync docker ETIMEDOUT`

### 4. 为数据库 CLI 增加 Docker 容器内 `psql` 回退

修改文件：

- `scripts/lib/node/database.cjs`
- `test/runtime/database-cli.spec.ts`
- `database/README.md`

修复内容：

1. 当宿主机没有 `psql`，但环境文件提供了 `POSTGRES_CONTAINER_NAME` 且 Docker 可用时：
   - `db init`
   - `db patch`
   会自动回退到 `docker exec <container> psql`
2. 新增回归测试，验证该回退路径确实被使用

### 5. 更新 E2E 诊断信息与用户文档

修改文件：

- `test/app.e2e-spec.ts`
- `README.md`
- `README_CN.md`

修复内容：

1. E2E 前置依赖错误不再继续提示旧的 `make test-env`
2. 现在会根据当前 `.env.test` 输出具体端点，例如 `127.0.0.1:55432/openchat_test`
3. 文档统一改为使用新的跨平台命令入口

## 本轮验证

### 通过

命令：

```bash
npm run test -- --runTestsByPath test/runtime/openchat-cli.spec.ts test/runtime/run-with-env.spec.ts test/runtime/test-env-defaults.spec.ts test/runtime/test-environment-cli.spec.ts test/runtime/database-cli.spec.ts --runInBand
```

结果：

- 通过
- `16 passed, 16 total`

命令：

```bash
npm run lint:types
```

结果：

- 通过

命令：

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --quiet
```

结果：

- 通过

命令：

```bash
npm run build
```

结果：

- 通过

命令：

```bash
npm run test:env:status
```

结果：

- 通过
- 能输出：
  - `.env.test`
  - `127.0.0.1:55432/openchat_test`
  - `127.0.0.1:56379`
  - Docker Compose 超时诊断

### 当前仍失败但已收敛根因

命令：

```bash
npm run test:env:up
```

结果：

- 失败
- 当前真实错误为：
  - `docker compose --profile database --profile cache up -d postgres redis timed out after 120000ms`

结论：

- 测试环境启动路径已经在仓库内闭环
- 当前 blocker 不再是应用逻辑或脚本设计缺陷，而是宿主机 Docker daemon / Docker Desktop 响应性

命令：

```bash
npm run test:e2e -- --runInBand
```

结果：

- 失败
- 当前失败为预期中的前置依赖失败：
  - `connect ECONNREFUSED 127.0.0.1:55432`

结论：

- `test:e2e` 现在不会误连错误的本机数据库
- 失败路径已经稳定收敛为“测试依赖未启动”

## 当前阶段结论

与上一轮相比，本轮已经把 E2E 阶段从：

- “测试环境文件写了但没被真正使用”
- “Windows 上没有统一测试依赖入口”
- “本机端口冲突后提示仍然指向错误操作”
- “没装 `psql` 就无法初始化测试库”

推进到：

- `.env.test` 真正成为测试剖面的单一配置源
- 测试依赖拥有独立端口与独立 Docker 资源命名
- 测试依赖有统一的跨平台入口和状态诊断
- `db:init:test` 在无宿主机 `psql` 时具备容器内回退能力
- E2E 失败路径稳定收敛为宿主机 Docker 不可用这一单一外部 blocker

## 剩余问题

1. 宿主机 Docker 在当前环境中无法在 120 秒内完成 `compose up`
2. 在 Docker 未恢复前，无法完成 `db:init:test` 的真实执行与 E2E 全绿
3. 数据库 schema / patch 的下一轮系统性审计尚未展开
