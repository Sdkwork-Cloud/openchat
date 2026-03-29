# 部署指南

本指南给出 OpenChat 在开发、测试、生产三种环境下的推荐部署方式。当前仓库已经内置 `.env.development`、`.env.test`、`.env.production`，不再要求把配置手工复制为 `.env` 才能运行。

## 快速导航

| 文档                               | 说明                               |
| ---------------------------------- | ---------------------------------- |
| [安装指南](./installation.md)      | 从零安装、初始化数据库、按环境启动 |
| [传统部署](./traditional.md)       | 宿主机 / Systemd / PM2 部署        |
| [Docker 部署](./docker.md)         | 容器化部署                         |
| [Kubernetes 部署](./kubernetes.md) | 集群部署                           |
| [监控与告警](./monitoring.md)      | Prometheus / Grafana / 告警        |

## 环境矩阵

| 环境 | 环境文件           | 默认端口 | 默认数据库      | Redis DB  | 默认特征                              |
| ---- | ------------------ | -------- | --------------- | --------- | ------------------------------------- |
| 开发 | `.env.development` | `7200`   | `openchat_dev`  | `0 / 1`   | 启用队列、Redis Adapter、WuKongIM     |
| 测试 | `.env.test`        | `7201`   | `openchat_test` | `10 / 11` | 默认关闭队列、Redis Adapter、WuKongIM |
| 生产 | `.env.production`  | `7200`   | `openchat`      | `0 / 1`   | 强密码、文件日志、显式域名与公网 IP   |

环境文件加载顺序：

- `NODE_ENV=development|dev`：`.env.development` -> `.env.dev` -> `.env`
- `NODE_ENV=test`：`.env.test` -> `.env`
- `NODE_ENV=production|prod`：`.env.production` -> `.env.prod` -> `.env`

## 推荐方案

### 本地开发

```bash
npm ci
docker compose --env-file .env.development --profile database --profile cache --profile im up -d
./scripts/init-database.sh development --yes --seed
npm run start:dev
```

### 测试联调

```bash
npm ci
docker compose --env-file .env.test --profile database --profile cache up -d
./scripts/init-database.sh test --yes --seed
npm run test
npm run start:test
```

### 生产部署

```bash
# 先编辑 .env.production，替换密码、JWT 密钥、域名、公网 IP
./scripts/apply-db-patches.sh production
npm ci
npm run build
./bin/openchat start --environment production --host 127.0.0.1 --port 7200 --strict-port
```

如果需要直接把服务注册为宿主机服务，可使用：

```bash
./scripts/deploy-server.sh production --db-action auto --yes --service
```

## Makefile 快捷入口

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

对应行为：

- `make dev`：用 `.env.development` 启动开发容器栈
- `make test-env`：用 `.env.test` 启动测试依赖栈
- `make prod`：用 `.env.production` 启动生产 compose
- `make deploy-standalone`：执行宿主机安装 / 构建 / 数据库处理 / 启动，可选注册 Systemd
- `make db-init`：初始化指定环境数据库
- `make db-patch`：执行指定环境数据库补丁
- `make runtime-start|stop|status|health`：按环境安全管理宿主机运行时

## 环境处理原则

### 开发环境

- 可以保留本地地址和默认开发密码，但不要提交个人私有配置。
- 推荐使用 `schema.sql + seed.sql` 初始化新库。
- 如果本地不启 WuKongIM，把 `WUKONGIM_ENABLED=false`。

### 测试环境

- 保持独立数据库和独立 Redis DB，避免污染开发数据。
- 默认关闭队列与 Redis Adapter，减少对完整基础设施的依赖。
- 推荐每轮集成测试前重建数据库，避免脏状态影响结果。

### 生产环境

- 必须替换 `DB_PASSWORD`、`REDIS_PASSWORD`、`JWT_SECRET`、`CORS_ORIGINS`、`EXTERNAL_IP`。
- 不要使用 `seed.sql`。
- 不要开启 `DB_SYNCHRONIZE`，只允许执行基线 SQL 与增量补丁。
- 发布顺序建议固定为“备份数据库 -> 执行补丁 -> 部署新版本 -> 健康检查”。
- 建议保持 `OPENCHAT_STRICT_PORT=true`、`OPENCHAT_SKIP_HEALTH_CHECK=false`，避免端口漂移和未就绪即对外提供服务。

## 运行时文件与安全启停

使用 `./bin/openchat` 或 `make runtime-*` 时，运行状态会按环境隔离：

- `var/run/openchat.development.pid`
- `var/run/openchat.test.pid`
- `var/run/openchat.production.pid`
- `var/run/openchat.<env>.runtime.json`
- `var/logs/<env>.stdout.log`
- `var/logs/<env>.stderr.log`

运行时包装器具备这些安全能力：

- 启动时先检查端口策略，生产环境默认建议严格端口模式
- 启动成功前会轮询 `/health`
- 停止时会校验 PID 对应进程命令行，避免误杀无关进程
- 先发 `SIGTERM`，超时后才按配置决定是否 `SIGKILL`

## 高可用部署建议

- 至少准备独立的生产 PostgreSQL、Redis、WuKongIM，不与开发 / 测试共用。
- 应用节点建议监听内网地址，通过 Nginx / Caddy / 云 LB 暴露。
- 建议将 `deploy-server.sh` 与 Systemd 配合，统一重启策略、超时、句柄上限和最小权限。
- 若需要不停机升级，采用双节点或多节点部署，通过反向代理摘流 / 加回实现滚动发布。
- 监控至少覆盖 `/health`、进程状态、数据库连接、Redis 可达性、日志增长和磁盘剩余空间。

## 外部依赖服务

如果数据库、Redis、WuKongIM 由外部系统托管，只需要在对应环境文件里修改连接项即可：

```bash
DB_HOST=your-db-host
REDIS_HOST=your-redis-host
WUKONGIM_API_URL=http://your-wukongim:5001
WUKONGIM_TCP_ADDR=your-wukongim:5100
WUKONGIM_WS_URL=ws://your-wukongim:5200
```

容器场景可继续使用：

```bash
docker compose -f docker-compose.external-db.yml up -d
```

## 下一步

- 查看 [安装指南](./installation.md) 获取完整初始化步骤
- 查看 [传统部署](./traditional.md) 获取宿主机部署与运维方式
- 查看 [数据库配置](../config/database.md) 获取数据库参数与初始化策略
