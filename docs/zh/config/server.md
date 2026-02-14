# 服务端配置

OpenChat 服务端通过环境变量进行配置，支持 `.env` 文件方式管理配置。

## 配置文件

项目提供三个环境配置模板：

| 文件 | 用途 |
|------|------|
| `.env.development` | 开发环境 |
| `.env.test` | 测试环境 |
| `.env.production` | 生产环境 |

```bash
# 复制配置模板
cp .env.production .env

# 编辑配置
vim .env
```

## 基础配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |

## 数据库配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USER` | 数据库用户 | `openchat` |
| `DB_PASSWORD` | 数据库密码 | `openchat_password` |
| `DB_NAME` | 数据库名称 | `openchat` |
| `DB_LOGGING` | SQL 日志 | `false` |

### 连接池配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_POOL_MAX` | 最大连接数 | `20` |
| `DB_POOL_MIN` | 最小连接数 | `5` |
| `DB_IDLE_TIMEOUT` | 空闲超时(ms) | `30000` |
| `DB_CONNECTION_TIMEOUT` | 连接超时(ms) | `5000` |

## Redis 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | - |
| `REDIS_DB` | 默认数据库 | `0` |
| `REDIS_QUEUE_DB` | 队列数据库 | `1` |

## JWT 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 密钥 | - |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | 刷新 Token 有效期 | `30d` |

::: warning 安全提示
生产环境必须设置强密码作为 `JWT_SECRET`，建议至少 32 个字符。
:::

## 安全配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CORS_ORIGINS` | CORS 允许来源 | `http://localhost:3000` |
| `RATE_LIMIT_TTL` | 限流时间窗口(秒) | `60` |
| `RATE_LIMIT_MAX` | 限流最大请求数 | `100` |
| `BCRYPT_SALT_ROUNDS` | 密码加密轮数 | `10` |

## WebSocket 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WS_CORS_ORIGINS` | WebSocket CORS | `http://localhost:3000` |

## WukongIM 配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WUKONGIM_API_URL` | API 地址 | `http://localhost:5001` |
| `WUKONGIM_TCP_ADDR` | TCP 地址 | `localhost:5100` |
| `WUKONGIM_WS_URL` | WebSocket 地址 | `ws://localhost:5200` |
| `WUKONGIM_MANAGER_URL` | 管理地址 | `http://localhost:5300` |

## 日志配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LOG_LEVEL` | 日志级别 | `info` |
| `LOG_FILE_ENABLED` | 文件日志 | `false` |
| `LOG_FILE_DIR` | 日志目录 | `./logs` |
| `LOG_FILE_MAX_SIZE` | 单文件大小 | `10m` |
| `LOG_FILE_MAX_FILES` | 最大文件数 | `7` |

## 性能配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SLOW_QUERY_THRESHOLD` | 慢查询阈值(ms) | `1000` |
| `DB_QUERY_TIMEOUT` | 查询超时(ms) | `30000` |
| `BATCH_SIZE` | 批处理大小 | `100` |
| `CONCURRENCY_MAX` | 最大并发数 | `10` |

## 缓存配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CACHE_WARMUP_ON_START` | 启动预热 | `false` |
| `CACHE_DEFAULT_TTL` | 默认 TTL(秒) | `300` |

## 完整配置示例

```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your-secure-password
DB_NAME=openchat
DB_LOGGING=false
DB_POOL_MAX=20
DB_POOL_MIN=5

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_QUEUE_DB=1

# JWT 配置
JWT_SECRET=your-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 安全配置
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
BCRYPT_SALT_ROUNDS=10

# WukongIM 配置
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://wukongim:5200
WUKONGIM_MANAGER_URL=http://wukongim:5300

# 日志配置
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_DIR=./var/logs

# 性能配置
SLOW_QUERY_THRESHOLD=1000
DB_QUERY_TIMEOUT=30000
BATCH_SIZE=100
CONCURRENCY_MAX=10
```

## 下一步

- [数据库配置](./database) - 数据库详细配置
- [WukongIM 配置](./wukongim) - IM 服务配置
- [RTC 配置](./rtc) - 音视频配置
