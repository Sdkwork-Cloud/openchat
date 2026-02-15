# OpenChat Server 安装指南

本指南将帮助您在不同平台上安装和配置 OpenChat Server。

## 系统要求

### 硬件要求

| 环境 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 开发环境 | 2核 | 4GB | 20GB |
| 测试环境 | 4核 | 8GB | 50GB |
| 生产环境 | 8核+ | 16GB+ | 100GB+ |

### 软件要求

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Docker | 24.0+ | 容器运行时 |
| Docker Compose | 2.0+ | 容器编排 |
| Node.js | 18+ | 开发模式需要 |
| pnpm | 8+ | 包管理器 |
| Git | 2.0+ | 版本控制 |

## 安装前检查

在安装前，建议运行检查脚本验证系统环境：

::: code-group

```bash [Linux/macOS]
# 运行预检查脚本
pnpm run precheck
```

```powershell [Windows]
# 运行预检查脚本
pnpm run precheck:win
```

:::

检查项目包括：
- ✅ 操作系统和架构
- ✅ 内存和磁盘空间
- ✅ Docker 和 Docker Compose 安装状态
- ✅ 端口可用性
- ✅ 网络连接

## 快速安装

### 方式一：一键安装脚本 (推荐)

::: code-group

```bash [Linux/macOS]
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# 或克隆项目后运行
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

```powershell [Windows]
# 快速安装
.\scripts\quick-install.bat

# 或 PowerShell 完整安装
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

:::

### 方式二：Docker 快速启动

::: code-group

```bash [Linux/macOS]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 一条命令启动所有服务
docker compose -f docker-compose.quick.yml up -d

# 或使用 npm 脚本
pnpm run docker:quick

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

```powershell [Windows]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 一条命令启动所有服务
docker compose -f docker-compose.quick.yml up -d

# 或使用 npm 脚本
pnpm run docker:quick

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

:::

### 方式三：本地开发模式

::: code-group

```bash [Linux/macOS]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 安装依赖
pnpm install

# 配置环境
cp .env.example .env

# 启动开发服务
pnpm run dev
```

```powershell [Windows]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 安装依赖
pnpm install

# 配置环境
copy .env.example .env

# 启动开发服务
pnpm run dev
```

:::

### 验证安装

::: code-group

```bash [Linux/macOS]
# 健康检查
curl http://localhost:3000/health

# 运行健康检查脚本
pnpm run health

# 完整诊断
pnpm run health:full
```

```powershell [Windows]
# 健康检查
Invoke-WebRequest -Uri http://localhost:3000/health

# 运行健康检查脚本
pnpm run health

# 完整诊断
pnpm run health:full
```

:::

## 安装模式详解

### 1. Docker 快速模式 (推荐新手)

最简单的安装方式，适合快速体验和开发测试。

::: code-group

```bash [Linux/macOS]
# 使用快速配置
docker compose -f docker-compose.quick.yml up -d

# 或使用 npm 脚本
pnpm run docker:quick
```

```powershell [Windows]
# 使用快速配置
docker compose -f docker-compose.quick.yml up -d

# 或使用 npm 脚本
pnpm run docker:quick
```

:::

**特点：**
- ✅ 自动安装所有依赖服务
- ✅ 开箱即用
- ✅ 易于管理和维护

### 2. 外部服务模式

使用外部数据库和 Redis，适合生产环境。

::: code-group

```bash [Linux/macOS]
# 配置外部服务
cp .env.example .env

# 编辑配置文件
vim .env
```

```powershell [Windows]
# 配置外部服务
copy .env.example .env

# 编辑配置文件
notepad .env
```

:::

配置内容：

```bash
DB_HOST=your-db-host
DB_PORT=5432
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

启动服务：

```bash
docker compose -f docker-compose.external-db.yml up -d
```

### 3. 独立服务模式

直接在服务器上运行，适合需要精细控制的场景。

::: code-group

```bash [Linux/macOS]
# 使用安装脚本
sudo ./scripts/install.sh standalone

# 或手动安装
pnpm install
pnpm run build
pnpm run start:prod
```

```powershell [Windows]
# 手动安装
pnpm install
pnpm run build
pnpm run start:prod
```

:::

## 环境配置

### 必需配置项

创建 `.env` 文件并配置以下内容：

```bash
# 服务器 IP（音视频通话需要）
EXTERNAL_IP=your-server-ip

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=openchat
DB_PASSWORD=your-secure-password
DB_NAME=openchat

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# JWT 密钥（至少 32 字符）
JWT_SECRET=your-jwt-secret-at-least-32-characters
```

### 可选配置项

```bash
# 悟空IM 配置
WUKONGIM_API_URL=http://localhost:5001
WUKONGIM_TCP_ADDR=localhost:5100
WUKONGIM_WS_URL=ws://localhost:5200
WUKONGIM_TOKEN_AUTH=false

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 安全配置
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX=100
```

## 安装后配置

### 1. 安全配置

::: code-group

```bash [Linux/macOS]
# 生成强密码
openssl rand -base64 24

# 生成 JWT 密钥
openssl rand -base64 32

# 更新 .env 文件
vim .env
```

```powershell [Windows]
# 生成强密码 (需要 OpenSSL)
openssl rand -base64 24

# 或使用 PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# 更新 .env 文件
notepad .env
```

:::

### 2. 防火墙配置

::: code-group

```bash [Linux (firewalld)]
# 开放必要端口
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=5001/tcp
firewall-cmd --permanent --add-port=5100/tcp
firewall-cmd --permanent --add-port=5200/tcp

# 重载防火墙
firewall-cmd --reload
```

```bash [Linux (ufw)]
# 开放必要端口
sudo ufw allow 3000/tcp
sudo ufw allow 5001/tcp
sudo ufw allow 5100/tcp
sudo ufw allow 5200/tcp

# 启用防火墙
sudo ufw enable
```

```powershell [Windows]
# 开放必要端口 (管理员权限)
New-NetFirewallRule -DisplayName "OpenChat API" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "WukongIM API" -Direction Inbound -Port 5001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "WukongIM TCP" -Direction Inbound -Port 5100 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "WukongIM WS" -Direction Inbound -Port 5200 -Protocol TCP -Action Allow
```

:::

### 3. SSL 配置

::: code-group

```bash [Linux/macOS]
# 创建 SSL 目录
mkdir -p etc/nginx/ssl

# 复制证书
cp your-cert.pem etc/nginx/ssl/cert.pem
cp your-key.pem etc/nginx/ssl/key.pem

# 启用 HTTPS 配置
mv etc/nginx/conf.d/ssl.conf.example etc/nginx/conf.d/ssl.conf

# 重启 Nginx
docker compose restart nginx
```

```powershell [Windows]
# 创建 SSL 目录
New-Item -ItemType Directory -Force -Path etc\nginx\ssl

# 复制证书
copy your-cert.pem etc\nginx\ssl\cert.pem
copy your-key.pem etc\nginx\ssl\key.pem

# 启用 HTTPS 配置
Rename-Item etc\nginx\conf.d\ssl.conf.example ssl.conf

# 重启 Nginx
docker compose restart nginx
```

:::

## 验证安装

### 健康检查

::: code-group

```bash [Linux/macOS]
# 快速检查
./scripts/health-check.sh quick

# 完整诊断
./scripts/health-check.sh full

# 检查特定服务
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh wukongim
```

```powershell [Windows]
# 快速检查
pnpm run health

# 完整诊断
pnpm run health:full
```

:::

### 访问测试

::: code-group

```bash [Linux/macOS]
# API 健康检查
curl http://localhost:3000/health

# 打开 API 文档
open http://localhost:3000/api/docs

# 打开 WukongIM 管理后台
open http://localhost:5300/web
```

```powershell [Windows]
# API 健康检查
Invoke-WebRequest -Uri http://localhost:3000/health

# 打开 API 文档
Start-Process "http://localhost:3000/api/docs"

# 打开 WukongIM 管理后台
Start-Process "http://localhost:5300/web"
```

:::

## 常见问题

### 端口被占用

::: code-group

```bash [Linux/macOS]
# 查看端口占用
lsof -i :3000

# 或使用 netstat
netstat -tlnp | grep 3000

# 终止占用进程
kill -9 <PID>
```

```powershell [Windows]
# 查看端口占用
netstat -ano | findstr :3000

# 终止占用进程
taskkill /PID <PID> /F
```

:::

### 数据库连接失败

::: code-group

```bash [Linux/macOS]
# 检查数据库状态
docker compose ps postgres

# 查看数据库日志
docker compose logs postgres

# 测试连接
docker exec -it openchat-postgres psql -U openchat -d openchat
```

```powershell [Windows]
# 检查数据库状态
docker compose ps postgres

# 查看数据库日志
docker compose logs postgres

# 测试连接
docker exec -it openchat-postgres psql -U openchat -d openchat
```

:::

### 内存不足

::: code-group

```bash [Linux/macOS]
# 查看资源使用
docker stats

# 查看系统内存
free -h
```

```powershell [Windows]
# 查看资源使用
docker stats

# 查看系统内存
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10
```

:::

### 服务无法启动

::: code-group

```bash [Linux/macOS]
# 查看日志
docker compose logs app

# 运行诊断
./scripts/health-check.sh full

# 尝试自动修复
./scripts/auto-fix.sh
```

```powershell [Windows]
# 查看日志
docker compose logs app

# 运行诊断
pnpm run health:full
```

:::

## 升级

::: code-group

```bash [Linux/macOS]
# 备份数据
make db-backup

# 拉取最新代码
git pull

# 更新服务
make update
```

```powershell [Windows]
# 备份数据
pnpm run db:backup

# 拉取最新代码
git pull

# 更新服务
pnpm run update
```

:::

## 卸载

::: code-group

```bash [Linux/macOS]
# 使用安装脚本卸载
./scripts/install.sh uninstall

# 或手动卸载
docker compose down -v
rm -rf /opt/openchat
```

```powershell [Windows]
# 手动卸载
docker compose down -v
Remove-Item -Recurse -Force .\data
```

:::

## 下一步

- [配置说明](../config/) - 详细配置参数
- [API 文档](../api/) - API 接口文档
- [项目概览](../guide/overview.md) - 了解项目架构
