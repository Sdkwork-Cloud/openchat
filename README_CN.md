# OpenChat Server

OpenChat Server 是基于 NestJS 的即时通讯后端，提供单聊、群聊、RTC、AI Agent，以及可选的 WuKongIM 集成能力。

## 技术栈

- NestJS 11
- TypeScript 5
- PostgreSQL 15+
- Redis 7+
- TypeORM 0.3
- Socket.IO
- WuKongIM

## 环境矩阵

| 环境 | 环境文件           | 默认端口 | 默认数据库      | Redis DB  | 说明                                                      |
| ---- | ------------------ | -------- | --------------- | --------- | --------------------------------------------------------- |
| 开发 | `.env.development` | `7200`   | `openchat_dev`  | `0 / 1`   | 本地开发，默认启用 Redis Adapter 和队列                   |
| 测试 | `.env.test`        | `7201`   | `openchat_test` | `10 / 11` | 自动化测试或联调，默认关闭 WuKongIM、队列和 Redis Adapter |
| 生产 | `.env.production`  | `7200`   | `openchat`      | `0 / 1`   | 正式部署，必须替换密码、密钥和域名                        |

应用、OpenAPI 运行时、TypeORM 数据源、健康检查脚本都会按 `NODE_ENV` 自动解析环境文件：

- `development` / `dev`：`.env.development` -> `.env.dev` -> `.env`
- `test`：`.env.test` -> `.env`
- `production` / `prod`：`.env.production` -> `.env.prod` -> `.env`
- 未设置或无法识别：`.env` -> `.env.development` -> `.env.dev`

## 前置条件

- 推荐 Node.js 24.x
- 当前工具链最低要求 Node.js `20.19.0`
- npm `10+`
- PostgreSQL 已安装并可连接
- Redis 已安装并可连接
- `psql` 已加入 `PATH`
- `redis-cli` 已加入 `PATH`

如果当前环境暂时不启动 WuKongIM，建议在对应环境文件中设置：

```bash
WUKONGIM_ENABLED=false
```

## 初始化

### 1. 安装依赖

```bash
npm ci
```

### 2. 选择环境文件

仓库已经提供了三套默认模板：

- `.env.development`
- `.env.test`
- `.env.production`

如果需要自定义环境，可以从 `.env.example` 复制一份新文件。

至少需要确认这些变量：

- `NODE_ENV`
- `HOST`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `WUKONGIM_ENABLED`

### 3. 初始化数据库

仅在“全新数据库”场景使用初始化脚本。默认推荐所有环境都保持 `DB_SYNCHRONIZE=false`，统一通过 `schema.sql + seed.sql + patches` 管理数据库结构。

开发环境新库：

```bash
./scripts/init-database.sh development --yes --seed
# 或 npm run db:init:dev -- --yes --seed
```

测试环境新库：

```bash
./scripts/init-database.sh test --yes --seed
# 或 npm run db:init:test -- --yes --seed
```

生产环境新库：

```bash
./scripts/init-database.sh production --yes
# 或 npm run db:init:prod -- --yes
```

如果数据库已经存在，不要重新初始化，改用补丁流程：

```bash
./scripts/apply-db-patches.sh development
./scripts/apply-db-patches.sh test
./scripts/apply-db-patches.sh production
```

## 启动方式

### 开发环境

```bash
npm run start:dev
curl http://127.0.0.1:7200/health
```

### 测试环境

```bash
npm run test
npm run test:e2e
```

如果需要直接用测试配置启动服务：

```bash
npm run start:test
curl http://127.0.0.1:7201/health
```

### 生产环境

```bash
npm run build
npm run start:prod
```

或者使用运行时包装器，把 PID、日志统一写入 `var/`：

```bash
./bin/openchat start --environment production --host 127.0.0.1 --port 7200 --strict-port
./bin/openchat status --environment production
./bin/openchat health --environment production
./bin/openchat stop --environment production
```

运行时包装器是宿主机场景的首选入口，因为它补齐了安全启动与停止能力：

- 按环境生成运行时文件，例如 `var/run/openchat.production.pid`、`var/run/openchat.production.runtime.json`
- 按环境写入日志，例如 `var/logs/production.stdout.log`、`var/logs/production.stderr.log`
- 启动后会等待 `GET /health` 成功才返回成功
- 生产环境建议保持 `OPENCHAT_STRICT_PORT=true`，端口冲突直接失败，避免服务漂移到未知端口
- 停止时会先校验 PID 对应进程仍然像 OpenChat，再发送 `SIGTERM`，等待 `OPENCHAT_SHUTDOWN_TIMEOUT_MS`，必要时才强制退出

## 健康检查

快速检查：

```bash
./scripts/health-check.sh quick
```

完整诊断：

```bash
./scripts/health-check.sh full
```

按环境文件执行：

```bash
OPENCHAT_ENV_FILE=.env.production ./scripts/health-check.sh full
```

单项检查：

```bash
./scripts/health-check.sh runtime
./scripts/health-check.sh config
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh app
./scripts/health-check.sh wukongim
```

## Docker 与 Makefile

`Makefile` 已切换为按环境文件直接启动，不再依赖把配置手工复制到 `.env`。

```bash
make dev
make test-env
make prod
make deploy-standalone ENV=production DB_ACTION=auto SERVICE=1
make db-init ENV=development SEED=1
make db-patch ENV=production
make runtime-start ENV=production
make runtime-stop ENV=production
make runtime-status ENV=production
make runtime-health ENV=production
make health
make health-full
```

其中 `make runtime-*` 是宿主机最安全的启停与巡检入口，`make deploy-standalone` 适合一键完成安装、数据库处理、启动和可选的 Systemd 注册。

## 高可用建议

- 开发、测试、生产必须分离数据库与 Redis DB，不要复用测试数据做生产发布验证。
- 生产环境建议只监听内网地址，由 Nginx、Caddy 或云负载均衡对外暴露。
- 推荐使用 `./scripts/deploy-server.sh production --db-action auto --yes --service` 或 `make deploy-standalone ENV=production SERVICE=1`，让 Systemd 统一管理自动拉起、启动超时、停止超时、文件句柄和最小权限。
- 发布顺序固定为“备份 -> 补丁 -> 构建 -> 重启 -> 健康检查”。
- 若需要更高可用，应至少部署两个应用节点并通过反向代理做切流；数据库和 Redis 的高可用需独立设计。

## 常用命令

| 命令                                                                     | 说明                                 |
| ------------------------------------------------------------------------ | ------------------------------------ |
| `npm run start:dev`                                                      | 使用 `.env.development` 启动开发服务 |
| `npm run start:test`                                                     | 使用 `.env.test` 启动测试服务        |
| `npm run start:prod`                                                     | 使用 `.env.production` 启动编译产物  |
| `npm run test`                                                           | 使用测试环境运行单测                 |
| `npm run test:e2e`                                                       | 使用测试环境运行 E2E                 |
| `npm run db:init:dev`                                                    | 开发环境数据库初始化快捷入口         |
| `npm run db:init:test`                                                   | 测试环境数据库初始化快捷入口         |
| `npm run db:init:prod`                                                   | 生产环境数据库初始化快捷入口         |
| `npm run db:patch:dev`                                                   | 开发环境数据库补丁快捷入口           |
| `npm run db:patch:test`                                                  | 测试环境数据库补丁快捷入口           |
| `npm run db:patch:prod`                                                  | 生产环境数据库补丁快捷入口           |
| `./bin/openchat <command>`                                               | 宿主机运行时管理                     |
| `./scripts/deploy-server.sh production --db-action auto --yes --service` | 宿主机一键部署                       |
| `make runtime-start ENV=production`                                      | 宿主机安全启动                       |
| `make runtime-stop ENV=production`                                       | 宿主机安全停止                       |
| `make deploy-standalone ENV=production SERVICE=1`                        | 宿主机一键部署并注册服务             |

## 相关文档

- English README: [README.md](./README.md)
- 数据库说明: [database/README.md](./database/README.md)
- 部署总览: [docs/zh/deploy/index.md](./docs/zh/deploy/index.md)
- 安装指南: [docs/zh/deploy/installation.md](./docs/zh/deploy/installation.md)
- 传统部署: [docs/zh/deploy/traditional.md](./docs/zh/deploy/traditional.md)
- 服务端配置: [docs/zh/config/server.md](./docs/zh/config/server.md)
- 数据库配置: [docs/zh/config/database.md](./docs/zh/config/database.md)

## License

AGPL-3.0
