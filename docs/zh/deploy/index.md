# 部署指南

本指南介绍 OpenChat 在不同环境下的部署方式。

## 快速导航

| 文档 | 说明 |
|------|------|
| [安装指南](./installation) | 详细安装步骤和系统要求 |
| [Docker 部署](./docker) | Docker 部署详解 |
| [Kubernetes 部署](./kubernetes) | 集群部署指南 |
| [传统部署](./traditional) | 非 Docker 部署方式 |
| [快速部署](./quickstart) | 快速体验部署 |

## 环境说明

| 环境 | 配置文件 | 说明 |
|------|---------|------|
| 开发环境 | `.env.development` | 本地开发，详细日志 |
| 测试环境 | `.env.test` | 功能测试，模拟数据 |
| 生产环境 | `.env.production` | 正式部署，安全加固 |

## 一键安装

```bash
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash
```

## 快速开始

### 1. 准备环境配置

```bash
# 复制对应环境的配置文件
cp .env.development .env    # 开发环境
# 或
cp .env.test .env           # 测试环境
# 或
cp .env.production .env     # 生产环境

# 编辑配置
vim .env
```

### 2. 启动服务

```bash
# 开发环境
./scripts/docker-deploy.sh install

# 测试环境
./scripts/docker-deploy.sh start -e .env.test

# 生产环境
docker compose -f docker-compose.prod.yml up -d
```

## 开发环境部署

### 使用 Docker Compose

```bash
# 启动所有服务
docker compose --profile database --profile cache --profile im up -d

# 或使用脚本
./scripts/docker-deploy.sh install
```

### 本地开发（不使用 Docker）

```bash
# 安装依赖
pnpm install

# 启动数据库和 Redis
docker compose --profile database --profile cache up -d

# 运行应用
pnpm start:dev
```

### 开发环境特点

- 详细的调试日志
- 启用 Swagger API 文档
- 数据库同步模式开启
- 较低的资源限制

## 测试环境部署

### 配置说明

```bash
# 使用测试环境配置
cp .env.test .env

# 启动服务
./scripts/docker-deploy.sh start -e .env.test
```

### 测试环境特点

- 独立的测试数据库
- 模拟外部服务
- 较短的 Token 过期时间
- 启用 Prometheus 监控

### 运行测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:cov
```

## 生产环境部署

### 前置要求

- Docker 24.0+
- Docker Compose 2.0+
- 至少 8GB 内存
- 至少 50GB 磁盘空间
- SSL 证书（可选）

### 1. 准备配置

```bash
# 复制生产环境配置
cp .env.production .env

# 编辑配置（必须修改以下项）
vim .env
```

**必须修改的配置项：**

```bash
# 服务器 IP
EXTERNAL_IP=your-server-ip

# 数据库密码（强密码）
DB_PASSWORD=your-strong-password

# Redis 密码（强密码）
REDIS_PASSWORD=your-strong-password

# JWT 密钥（至少 32 字符）
JWT_SECRET=your-jwt-secret-at-least-32-characters

# CORS 允许的域名
CORS_ORIGINS=https://your-domain.com
```

### 2. 生成密钥

```bash
# 生成 JWT 密钥
openssl rand -base64 32

# 生成数据库密码
openssl rand -base64 24
```

### 3. 配置 SSL（可选）

```bash
# 创建 SSL 目录
mkdir -p etc/nginx/ssl

# 复制证书
cp your-cert.pem etc/nginx/ssl/cert.pem
cp your-key.pem etc/nginx/ssl/key.pem
```

### 4. 启动服务

```bash
# 拉取镜像
docker compose -f docker-compose.prod.yml pull

# 启动服务
docker compose -f docker-compose.prod.yml up -d

# 检查状态
./scripts/health-check.sh full
```

### 生产环境特点

- 内部网络隔离
- Nginx 反向代理
- SSL/TLS 支持
- Prometheus 监控
- 资源限制配置
- 日志轮转

## 使用外部服务

### 使用外部数据库

```bash
# .env 配置
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=openchat

# 使用外部数据库配置启动
docker compose -f docker-compose.external-db.yml up -d
```

### 使用外部 Redis

```bash
# .env 配置
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# 启动
docker compose -f docker-compose.external-db.yml up -d
```

### 使用外部 WukongIM

```bash
# .env 配置
WUKONGIM_API_URL=http://your-wukongim:5001
WUKONGIM_TCP_ADDR=your-wukongim:5100
WUKONGIM_WS_URL=ws://your-wukongim:5200

# 启动
docker compose -f docker-compose.external-db.yml up -d
```

## 部署脚本命令

```bash
# 查看帮助
./scripts/docker-deploy.sh --help

# 安装并启动
./scripts/docker-deploy.sh install

# 启动服务
./scripts/docker-deploy.sh start

# 停止服务
./scripts/docker-deploy.sh stop

# 重启服务
./scripts/docker-deploy.sh restart

# 查看状态
./scripts/docker-deploy.sh status

# 查看日志
./scripts/docker-deploy.sh logs

# 使用外部服务
./scripts/docker-deploy.sh external

# 使用指定 profiles
./scripts/docker-deploy.sh profiles -p database,cache

# 更新服务
./scripts/docker-deploy.sh update

# 清理数据
./scripts/docker-deploy.sh clean
```

## 健康检查

```bash
# 快速检查
./scripts/health-check.sh quick

# 完整诊断
./scripts/health-check.sh full

# 检查特定服务
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh wukongim
./scripts/health-check.sh app
```

## 数据备份与恢复

### 备份

```bash
# 备份数据库
docker exec openchat-postgres pg_dump -U openchat openchat > backup_$(date +%Y%m%d).sql

# 备份 Redis
docker exec openchat-redis redis-cli -a your-password BGSAVE
docker cp openchat-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### 恢复

```bash
# 恢复数据库
cat backup.sql | docker exec -i openchat-postgres psql -U openchat openchat

# 恢复 Redis
docker cp ./redis_backup.rdb openchat-redis:/data/dump.rdb
docker compose restart redis
```

## 故障排除

### 常见问题

#### 服务无法启动

```bash
# 检查日志
docker compose logs app

# 运行诊断
./scripts/health-check.sh full

# 检查端口
./scripts/health-check.sh ports
```

#### 数据库连接失败

```bash
# 检查数据库状态
docker compose ps postgres

# 测试连接
docker exec -it openchat-postgres psql -U openchat -d openchat
```

#### 内存不足

```bash
# 查看资源使用
docker stats

# 调整资源限制
# 编辑 .env 文件中的 *_MEMORY_LIMIT 配置
```

## 监控与日志

### Prometheus 监控

```bash
# 启动监控
docker compose --profile monitoring up -d

# 访问 Prometheus
# http://localhost:9090
```

### 日志查看

```bash
# 所有日志
docker compose logs -f

# 特定服务日志
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f wukongim
```

## 安全建议

1. **修改默认密码**：所有密码必须使用强密码
2. **启用 SSL**：生产环境必须使用 HTTPS
3. **配置防火墙**：只开放必要端口
4. **定期备份**：设置自动备份计划
5. **更新依赖**：定期更新 Docker 镜像
6. **监控告警**：配置 Prometheus 告警规则

## 下一步

- [Docker 部署详解](./docker) - Docker 部署详细说明
- [配置说明](../config/) - 完整配置参数
- [API 文档](../api/) - API 接口文档
