# 快速部署

本指南帮助您快速部署 OpenChat，适合首次体验和快速验证。

## 安装前检查

在安装前，建议运行检查脚本验证系统环境：

```bash
# Linux / macOS
./scripts/precheck.sh --mode standalone

# Windows
.\scripts\precheck.ps1
```

检查项目包括：
- 操作系统和架构
- 内存和磁盘空间
- Docker 和 Docker Compose 安装状态
- 端口可用性
- 网络连接

## 统一部署（推荐）

### Linux / macOS

```bash
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
cp .env.example .env
# 按需编辑 .env
./scripts/deploy-server.sh production --db-action auto --yes --service
```

### Windows

```powershell
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
Copy-Item .env.example .env
# 按需编辑 .env
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

## Docker 快速启动

### 方式一：快速启动（推荐）

使用 `docker-compose.quick.yml` 一键启动所有服务，无需额外配置：

```bash
# 一条命令启动所有服务
docker compose -f docker-compose.quick.yml up -d

# 查看服务状态
docker compose -f docker-compose.quick.yml ps

# 查看日志
docker compose -f docker-compose.quick.yml logs -f
```

### 方式二：开发环境启动

使用 `docker-compose.yml` 支持灵活配置，需要指定 profiles：

```bash
# 启动所有服务（数据库+Redis+IM+应用）
docker compose --profile database --profile cache --profile im up -d

# 只启动应用（使用外部数据库）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

## 验证安装

### 1. 检查服务状态

```bash
# 查看服务状态
./bin/openchat status
./bin/openchat health

# Linux 服务状态
systemctl status openchat.service
```

### 2. 检查服务健康

```bash
# 健康检查
curl http://127.0.0.1:7200/health
curl http://127.0.0.1:7200/ready
```

### 3. 查看日志

```bash
# 查看所有日志
docker compose logs -f

# 查看应用日志
docker compose logs -f app
```

## 访问服务

安装成功后，可以访问以下服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| OpenChat API | http://127.0.0.1:7200 | 主服务 API |
| 前端 API 文档 | http://127.0.0.1:7200/im/v3/docs | 前端 IM Swagger 文档 |
| 管理端 API 文档 | http://127.0.0.1:7200/admin/im/v3/docs | 管理端 Swagger 文档 |
| 健康检查 | http://127.0.0.1:7200/health | 服务健康状态 |
| WukongIM Demo | http://localhost:5172 | IM 演示页面 |
| WukongIM 管理 | http://localhost:5300/web | IM 管理后台 |
| Prometheus | http://localhost:9090 | 监控面板 |

## 运维工具

OpenChat 提供完整的运维工具：

```bash
# 系统预检查
./scripts/precheck.sh --mode standalone

# 统一部署或更新
./scripts/deploy-server.sh production --db-action auto --yes --service

# 数据库
./scripts/init-database.sh production --yes
./scripts/apply-db-patches.sh production

# 运行时
./bin/openchat restart
./bin/openchat status
./bin/openchat health
```

## 常见问题

### 安装失败

```bash
# 检查安装状态
./scripts/install-manager.sh status

# 恢复安装
./scripts/install-manager.sh resume

# 重置安装
./scripts/install-manager.sh reset
```

### 服务无法启动

```bash
# 查看 systemd 状态
systemctl status openchat.service

# 查看应用日志
tail -f var/logs/stdout.log
tail -f var/logs/stderr.log
```

### 端口被占用

```bash
# 检查端口
lsof -i :7200

# 修改端口
./scripts/deploy-server.sh production --db-action auto --yes --service --port 7300
```

## 下一步

- [Docker 部署](./docker.md) - 详细 Docker 部署指南
- [配置说明](../config/) - 完整配置参数
- [API 文档](../api/) - API 使用说明
