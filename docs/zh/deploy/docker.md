# Docker 部署

本指南介绍如何使用 Docker 和 Docker Compose 部署 OpenChat，支持灵活配置外部数据库、Redis 和 WukongIM。

## 前置条件

- Docker 24.0+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 20GB 可用磁盘空间

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
```

### 2. 配置环境变量

```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置
vim .env
```

### 3. 启动服务

```bash
# 启动所有服务（开发模式）
docker compose up -d

# 或使用部署脚本
./scripts/docker-deploy.sh install
```

## 部署模式

### 开发环境（使用内置服务）

默认的 `docker-compose.yml` 包含完整的服务栈：

- PostgreSQL 15
- Redis 7
- WukongIM v2
- Prometheus

```bash
# 启动所有服务
docker compose up -d

# 或使用 profiles 选择性启动
docker compose --profile database --profile cache --profile im up -d
```

### 生产环境

使用 `docker-compose.prod.yml`：

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 使用外部服务

使用 `docker-compose.external-db.yml`：

```bash
# 配置外部数据库连接
vim .env

# 设置外部服务配置
USE_EXTERNAL_DB=true
DB_HOST=your-database-host

USE_EXTERNAL_REDIS=true
REDIS_HOST=your-redis-host

USE_EXTERNAL_WK=true
WUKONGIM_API_URL=http://your-wukongim-host:5001

# 启动
docker compose -f docker-compose.external-db.yml up -d
```

### 使用部署脚本

```bash
# 安装并启动
./scripts/docker-deploy.sh install

# 使用外部数据库启动
./scripts/docker-deploy.sh external

# 查看帮助
./scripts/docker-deploy.sh --help
```

## Profile 使用

使用 Docker Compose profiles 可以灵活选择启动的服务：

| Profile | 包含服务 | 说明 |
|--------|---------|------|
| `database` | PostgreSQL | 数据库服务 |
| `cache` | Redis | 缓存服务 |
| `im` | WukongIM | IM 服务 |
| `monitoring` | Prometheus | 监控服务 |

```bash
# 只启动应用（需要外部服务）
docker compose up -d

# 启动应用 + 数据库
docker compose --profile database up -d

# 启动应用 + 数据库 + IM
docker compose --profile database --profile im up -d

# 启动全部服务
docker compose --profile database --profile cache --profile im --profile monitoring up -d
```

## 核心配置

### 数据库配置

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USER` | 数据库用户名 | `openchat` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | `openchat` |
| `USE_EXTERNAL_DB` | 使用外部数据库 | `false` |

### Redis 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | - |
| `REDIS_DB` | Redis 数据库编号 | `0` |
| `USE_EXTERNAL_REDIS` | 使用外部 Redis | `false` |

## WukongIM 配置

### 应用端配置

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `WUKONGIM_API_URL` | API 地址 | `http://localhost:5001` |
| `WUKONGIM_TCP_ADDR` | TCP 地址 | `localhost:5100` |
| `WUKONGIM_WS_URL` | WebSocket 地址 | `ws://localhost:5200` |
| `WUKONGIM_MANAGER_URL` | 管理地址 | `http://localhost:5300` |
| `WUKONGIM_TOKEN_AUTH` | Token 认证 | `false` |
| `WUKONGIM_TIMEOUT` | 请求超时 | `10000` |
| `WUKONGIM_APP_ID` | 应用ID | - |
| `WUKONGIM_APP_SECRET` | 应用密钥 | - |
| `USE_EXTERNAL_WK` | 使用外部 IM | `false` |

### WukongIM 服务端配置

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `WK_CLUSTER_NODEID` | 集群节点ID | `1001` |
| `WK_MODE` | 运行模式 | `release` |
| `WK_CONN_MAX` | 最大连接数 | `10000` |
| `WK_CHANNEL_MAX` | 最大频道数 | `1000` |
| `WK_MSG_MAX_SIZE` | 消息最大大小 | `4096` |
| `WK_STORE_TYPE` | 存储类型 | `sqlite` |
| `WK_REDIS_HOST` | Redis 主机 | - |
| `WK_TOKEN_SECRET` | Token 密钥 | - |
| `WK_WEBHOOK_ENABLED` | Webhook 启用 | `false` |
| `WK_WEBHOOK_URL` | Webhook URL | - |

### WukongIM 端口说明

| 端口 | 用途 |
|------|------|
| 5001 | HTTP API |
| 5100 | TCP 协议 |
| 5200 | WebSocket |
| 5300 | 管理接口 |
| 11110 | 集群通信 |

### 使用外部 WukongIM

```bash
# 配置外部 IM
USE_EXTERNAL_WK=true
WUKONGIM_API_URL=http://your-wukongim-host:5001
WUKONGIM_TCP_ADDR=your-wukongim-host:5100
WUKONGIM_WS_URL=ws://your-wukongim-host:5200
WUKONGIM_MANAGER_URL=http://your-wukongim-host:5300
WUKONGIM_TOKEN_AUTH=true
```

### WukongIM Token 认证

```bash
# 启用 Token 认证
WUKONGIM_TOKEN_AUTH=true
WK_TOKEN_SECRET=your-secret-key

# 在应用端配置
WUKONGIM_APP_ID=your-app-id
WUKONGIM_APP_SECRET=your-app-secret
```

### WukongIM 集群配置

```bash
# 节点1
WK_CLUSTER_NODEID=1001
WK_CLUSTER_SERVERADDR=node1:11110

# 节点2
WK_CLUSTER_NODEID=1002
WK_CLUSTER_SERVERADDR=node2:11110

# 使用 Redis 进行集群协调
WK_REDIS_HOST=redis-host
WK_REDIS_PORT=6379
WK_REDIS_PASSWORD=your-redis-password
```

### WukongIM Webhook

```bash
# 启用 Webhook
WK_WEBHOOK_ENABLED=true
WK_WEBHOOK_URL=http://your-server/webhook
WK_WEBHOOK_TIMEOUT=5000
```

## 服务管理

### 启动服务

```bash
# 启动所有服务
docker compose up -d

# 启动指定服务
docker compose up -d app

# 启动带监控的服务
docker compose --profile monitoring up -d
```

### 停止服务

```bash
docker compose down
```

### 查看日志

```bash
# 所有服务日志
docker compose logs -f

# 特定服务日志
docker compose logs -f app
docker compose logs -f wukongim
docker compose logs -f postgres
docker compose logs -f redis
```

## 混合部署示例

### 场景：使用外部数据库，内置 Redis 和 WukongIM

```bash
# .env 配置
USE_EXTERNAL_DB=true
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-user
DB_PASSWORD=your-password

USE_EXTERNAL_REDIS=false

USE_EXTERNAL_WK=false

# 启动
docker compose --profile cache --profile im up -d
```

### 场景：完全外部服务

```bash
# .env 配置
USE_EXTERNAL_DB=true
DB_HOST=your-db-host

USE_EXTERNAL_REDIS=true
REDIS_HOST=your-redis-host

USE_EXTERNAL_WK=true
WUKONGIM_API_URL=http://your-wukongim:5001

# 启动（只启动应用）
docker compose -f docker-compose.external-db.yml up -d
```

### 场景：只使用 WukongIM 集群

```bash
# 启动多个 WukongIM 节点
docker compose --profile im up -d --scale wukongim=3
```

## 数据库初始化

### 初始化数据库

首次启动时，数据库会自动初始化：

```bash
# 启动数据库（自动执行 schema.sql 和 seed.sql）
docker compose --profile database up -d postgres
```

### 手动初始化外部数据库

如果使用外部 PostgreSQL，需要手动初始化：

```bash
# 连接到外部数据库
psql -h your-db-host -U your-db-user -d openchat

# 执行初始化脚本
\i database/schema.sql
\i database/seed.sql
```

### 数据库迁移

```bash
# 进入应用容器
docker exec -it openchat sh

# 运行迁移
npm run migration:run

# 创建迁移
npm run migration:generate -- -n MigrationName
```

## 数据持久化

Docker Compose 配置了以下数据卷：

| 卷名 | 用途 |
|------|------|
| `postgres_data` | PostgreSQL 数据 |
| `redis_data` | Redis 数据 |
| `wukongim_data` | WukongIM 数据 |

## 故障排除

### 常见问题

#### WukongIM 连接失败

```bash
# 检查 WukongIM 状态
docker compose ps wukongim

# 查看 WukongIM 日志
docker compose logs wukongim

# 检查 WukongIM 健康状态
curl http://localhost:5001/health
```

#### 数据库连接失败

```bash
# 检查数据库状态
docker compose ps postgres

# 运行数据库诊断
docker compose exec postgres pg_isready -U openchat
```

#### 端口冲突

```bash
# 查看端口占用
lsof -i :5001

# 修改端口
WUKONGIM_API_PORT=5002 docker compose up -d
```

## 生产环境最佳实践

### 1. 安全配置

```bash
# 生产环境必须修改的配置
JWT_SECRET=your-very-long-secret-key
DB_PASSWORD=strong-database-password
REDIS_PASSWORD=strong-redis-password
WK_TOKEN_SECRET=your-wukongim-secret
NODE_ENV=production
```

### 2. 资源限制

```bash
# 根据服务器配置调整
APP_MEMORY_LIMIT=2G
POSTGRES_MEMORY_LIMIT=2G
REDIS_MEMORY_LIMIT=1G
WUKONGIM_MEMORY_LIMIT=2G
```

### 3. WukongIM 生产配置

```bash
# 高并发配置
WK_CONN_MAX=50000
WK_CHANNEL_MAX=5000
WK_MSG_CACHE_SIZE=5000

# 使用 MySQL 存储
WK_STORE_TYPE=mysql
WK_STORE_HOST=your-mysql-host
WK_STORE_PORT=3306
WK_STORE_USER=your-user
WK_STORE_PASSWORD=your-password
WK_STORE_DATABASE=wukongim

# 启用 Redis 缓存
WK_REDIS_HOST=your-redis-host
WK_REDIS_PORT=6379
```

### 4. 监控配置

```bash
# 启动监控
docker compose --profile monitoring up -d

# 访问 Prometheus
# http://localhost:9090
```

## 下一步

- [配置说明](../config/) - 详细配置参数
- [Kubernetes 部署](./kubernetes.md) - 集群部署
- [传统部署](./traditional.md) - 非 Docker 部署
