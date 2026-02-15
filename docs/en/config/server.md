# Server Configuration

OpenChat server is configured via environment variables, supporting `.env` file management.

## Configuration File

Project provides a unified environment configuration template:

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |

```bash
# Copy template
cp .env.example .env

# Edit configuration
vim .env
```

## Basic Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Listen address | `0.0.0.0` |

## Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USER` | Database user | `openchat` |
| `DB_PASSWORD` | Database password | `openchat_password` |
| `DB_NAME` | Database name | `openchat` |
| `DB_SYNCHRONIZE` | Auto sync schema | `true` for dev, `false` for production |
| `DB_LOGGING` | SQL logging | `false` |

### Connection Pool Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_POOL_MAX` | Max connections | `20` |
| `DB_POOL_MIN` | Min connections | `5` |
| `DB_IDLE_TIMEOUT` | Idle timeout (ms) | `30000` |
| `DB_CONNECTION_TIMEOUT` | Connection timeout (ms) | `5000` |
| `DB_MAX_LIFETIME` | Max connection lifetime (ms) | `300000` |

## Redis Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_DB` | Default DB | `0` |
| `REDIS_QUEUE_DB` | Queue DB | `1` |

## JWT Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `30d` |

::: warning Security Note
Production environments must set a strong password for `JWT_SECRET`, at least 32 characters recommended.
:::

## Security Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `RATE_LIMIT_TTL` | Rate limit time window (sec) | `60` |
| `RATE_LIMIT_MAX` | Rate limit max requests | `100` |
| `BCRYPT_SALT_ROUNDS` | Password encryption rounds | `10` |

## WebSocket Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_CORS_ORIGINS` | WebSocket CORS | `http://localhost:3000` |

## WukongIM Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WUKONGIM_API_URL` | API URL | `http://localhost:5001` |
| `WUKONGIM_TCP_ADDR` | TCP address | `localhost:5100` |
| `WUKONGIM_WS_URL` | WebSocket URL | `ws://localhost:5200` |
| `WUKONGIM_MANAGER_URL` | Manager URL | `http://localhost:5300` |

## Logging Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Log level | `info` |
| `LOG_FILE_ENABLED` | File logging | `false` |
| `LOG_FILE_DIR` | Log directory | `./logs` |
| `LOG_FILE_MAX_SIZE` | Single file size | `10m` |
| `LOG_FILE_MAX_FILES` | Max files | `7` |

## Performance Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SLOW_QUERY_THRESHOLD` | Slow query threshold (ms) | `1000` |
| `DB_QUERY_TIMEOUT` | Query timeout (ms) | `30000` |
| `BATCH_SIZE` | Batch size | `100` |
| `CONCURRENCY_MAX` | Max concurrency | `10` |

## Cache Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_WARMUP_ON_START` | Warm up on start | `false` |
| `CACHE_DEFAULT_TTL` | Default TTL (sec) | `300` |

## Full Configuration Example

```bash
# App configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your-secure-password
DB_NAME=openchat
DB_LOGGING=false
DB_POOL_MAX=20
DB_POOL_MIN=5

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_QUEUE_DB=1

# JWT configuration
JWT_SECRET=your-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security configuration
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
BCRYPT_SALT_ROUNDS=10

# WukongIM configuration
WUKONGIM_API_URL=http://wukongim:5001
WUKONGIM_TCP_ADDR=wukongim:5100
WUKONGIM_WS_URL=ws://wukongim:5200
WUKONGIM_MANAGER_URL=http://wukongim:5300

# Logging configuration
LOG_LEVEL=info
LOG_FILE_ENABLED=true
LOG_FILE_DIR=./var/logs

# Performance configuration
SLOW_QUERY_THRESHOLD=1000
DB_QUERY_TIMEOUT=30000
BATCH_SIZE=100
CONCURRENCY_MAX=10
```

## Next Steps

- [Database Configuration](./database.md) - Detailed database config
- [WukongIM Configuration](./wukongim.md) - IM service config
- [RTC Configuration](./rtc.md) - Audio/video config
