# 服务端配置

OpenChat 通过环境变量进行配置，推荐按环境分别维护 `.env.development`、`.env.test`、`.env.production`。

## 环境文件

| 文件               | 用途                |
| ------------------ | ------------------- |
| `.env.development` | 本地开发默认配置    |
| `.env.test`        | 测试 / 联调默认配置 |
| `.env.production`  | 生产默认模板        |
| `.env.example`     | 自定义环境通用模板  |

加载规则：

- `NODE_ENV=development|dev`：`.env.development` -> `.env.dev` -> `.env`
- `NODE_ENV=test`：`.env.test` -> `.env`
- `NODE_ENV=production|prod`：`.env.production` -> `.env.prod` -> `.env`

## 按环境推荐值

| 变量                   | 开发           | 测试            | 生产       |
| ---------------------- | -------------- | --------------- | ---------- |
| `HOST`                 | `127.0.0.1`    | `127.0.0.1`     | `0.0.0.0`  |
| `PORT`                 | `7200`         | `7201`          | `7200`     |
| `DB_NAME`              | `openchat_dev` | `openchat_test` | `openchat` |
| `REDIS_DB`             | `0`            | `10`            | `0`        |
| `REDIS_QUEUE_DB`       | `1`            | `11`            | `1`        |
| `WUKONGIM_ENABLED`     | `true`         | `false`         | `true`     |
| `ENABLE_REDIS_ADAPTER` | `true`         | `false`         | `true`     |
| `QUEUE_ENABLED`        | `true`         | `false`         | `true`     |
| `LOG_LEVEL`            | `debug`        | `warn`          | `info`     |

## 基础配置

| 变量       | 说明                   | 默认值                  |
| ---------- | ---------------------- | ----------------------- |
| `NODE_ENV` | 运行环境               | `development`           |
| `HOST`     | 服务监听地址           | `127.0.0.1` / `0.0.0.0` |
| `PORT`     | 服务端口               | `7200` / `7201`         |
| `APP_HOST` | 健康检查使用的访问地址 | 与 `HOST` 一致          |
| `APP_PORT` | 健康检查使用的访问端口 | 与 `PORT` 一致          |

## 运行时管理配置

| 变量                             | 说明                                            | 开发默认值 | 测试默认值 | 生产默认值 |
| -------------------------------- | ----------------------------------------------- | ---------- | ---------- | ---------- |
| `OPENCHAT_STRICT_PORT`           | `true` 时端口冲突直接失败，`false` 时自动换端口 | `false`    | `false`    | `true`     |
| `OPENCHAT_HEALTH_TIMEOUT_MS`     | 运行时包装器启动后等待 `/health` 的超时时间     | `30000`    | `30000`    | `60000`    |
| `OPENCHAT_SHUTDOWN_TIMEOUT_MS`   | 运行时包装器优雅停机等待时间                    | `15000`    | `15000`    | `20000`    |
| `OPENCHAT_FORCE_STOP_ON_TIMEOUT` | 超时后是否允许强制退出                          | `true`     | `true`     | `true`     |
| `OPENCHAT_SKIP_HEALTH_CHECK`     | 是否跳过运行时包装器启动后的健康检查            | `false`    | `false`    | `false`    |

说明：

- `npm run start:*`、`./bin/openchat *`、`deploy-server.sh` 都会读取对应环境文件。
- 直接启动应用时，`OPENCHAT_STRICT_PORT` 也会生效，避免生产环境端口漂移。
- 宿主机运行时文件按环境隔离，默认写入 `var/run/openchat.<env>.pid`、`var/run/openchat.<env>.runtime.json`、`var/logs/<env>.stdout.log`、`var/logs/<env>.stderr.log`。

## 数据库配置

| 变量                         | 说明               |
| ---------------------------- | ------------------ |
| `DB_HOST`                    | PostgreSQL 地址    |
| `DB_PORT`                    | PostgreSQL 端口    |
| `DB_USERNAME`                | 数据库用户         |
| `DB_PASSWORD`                | 数据库密码         |
| `DB_NAME`                    | 数据库名           |
| `DB_POOL_MIN`                | 连接池最小连接数   |
| `DB_POOL_MAX`                | 连接池最大连接数   |
| `DB_CONNECTION_TIMEOUT`      | 建连超时，毫秒     |
| `DB_IDLE_TIMEOUT`            | 空闲超时，毫秒     |
| `DB_ACQUIRE_TIMEOUT`         | 获取连接超时，毫秒 |
| `DB_SSL`                     | 是否启用 SSL       |
| `DB_SSL_REJECT_UNAUTHORIZED` | SSL 时是否校验证书 |
| `DB_LOGGING`                 | 是否输出 SQL 日志  |
| `DB_SYNCHRONIZE`             | 是否自动同步表结构 |

推荐：

- 默认所有环境都保持 `DB_SYNCHRONIZE=false`
- 新数据库使用 `schema.sql + seed.sql`
- 已有数据库只执行 `database/patches/*.sql`

## Redis 与队列配置

| 变量                   | 说明                             |
| ---------------------- | -------------------------------- |
| `REDIS_HOST`           | Redis 地址                       |
| `REDIS_PORT`           | Redis 端口                       |
| `REDIS_PASSWORD`       | Redis 密码                       |
| `REDIS_DB`             | 主缓存库编号                     |
| `REDIS_QUEUE_DB`       | BullMQ 队列库编号                |
| `ENABLE_REDIS_ADAPTER` | 是否启用 Socket.IO Redis Adapter |
| `QUEUE_ENABLED`        | 是否启用 BullMQ 队列             |

## 认证与安全配置

| 变量                     | 说明                           |
| ------------------------ | ------------------------------ |
| `JWT_SECRET`             | JWT 密钥，生产环境至少 32 字符 |
| `JWT_EXPIRES_IN`         | Access Token 过期时间          |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 过期时间         |
| `CORS_ORIGINS`           | 允许的跨域来源，逗号分隔       |

## WuKongIM 配置

| 变量                   | 说明                              |
| ---------------------- | --------------------------------- |
| `IM_PROVIDER`          | IM Provider 名称，默认 `wukongim` |
| `WUKONGIM_ENABLED`     | 是否启用 WuKongIM 集成            |
| `WUKONGIM_API_URL`     | API 地址                          |
| `WUKONGIM_TCP_ADDR`    | TCP 地址                          |
| `WUKONGIM_WS_URL`      | WebSocket 地址                    |
| `WUKONGIM_MANAGER_URL` | 管理端地址                        |
| `WUKONGIM_TOKEN_AUTH`  | 是否启用 Token 鉴权               |
| `WUKONGIM_TIMEOUT`     | 请求超时，毫秒                    |

## 日志配置

| 变量                 | 说明                             |
| -------------------- | -------------------------------- |
| `LOG_LEVEL`          | 日志级别                         |
| `LOG_FORMAT`         | 日志格式，默认 `pretty` / `json` |
| `LOG_FILE_ENABLED`   | 是否启用文件日志                 |
| `LOG_FILE_DIR`       | 文件日志目录                     |
| `LOG_FILE_MAX_SIZE`  | 单个日志文件大小                 |
| `LOG_FILE_MAX_FILES` | 保留文件数量                     |
| `LOG_FILE_COMPRESS`  | 是否压缩轮转日志                 |

## 配置示例

### 开发环境

```bash
NODE_ENV=development
HOST=127.0.0.1
PORT=7200
DB_NAME=openchat_dev
REDIS_DB=0
REDIS_QUEUE_DB=1
WUKONGIM_ENABLED=true
ENABLE_REDIS_ADAPTER=true
QUEUE_ENABLED=true
LOG_LEVEL=debug
OPENCHAT_STRICT_PORT=false
OPENCHAT_HEALTH_TIMEOUT_MS=30000
OPENCHAT_SHUTDOWN_TIMEOUT_MS=15000
```

### 测试环境

```bash
NODE_ENV=test
HOST=127.0.0.1
PORT=7201
DB_NAME=openchat_test
REDIS_DB=10
REDIS_QUEUE_DB=11
WUKONGIM_ENABLED=false
ENABLE_REDIS_ADAPTER=false
QUEUE_ENABLED=false
LOG_LEVEL=warn
OPENCHAT_STRICT_PORT=false
OPENCHAT_HEALTH_TIMEOUT_MS=30000
OPENCHAT_SHUTDOWN_TIMEOUT_MS=15000
```

### 生产环境

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=7200
DB_NAME=openchat
REDIS_DB=0
REDIS_QUEUE_DB=1
WUKONGIM_ENABLED=true
ENABLE_REDIS_ADAPTER=true
QUEUE_ENABLED=true
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_DIR=./var/logs
OPENCHAT_STRICT_PORT=true
OPENCHAT_HEALTH_TIMEOUT_MS=60000
OPENCHAT_SHUTDOWN_TIMEOUT_MS=20000
```

## 下一步

- [数据库配置](./database.md)
- [部署指南](../deploy/index.md)
