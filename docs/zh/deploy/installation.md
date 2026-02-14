# OpenChat Server 安装指南

## 系统要求

### 硬件要求

| 环境 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 开发环境 | 2核 | 4GB | 20GB |
| 测试环境 | 4核 | 8GB | 50GB |
| 生产环境 | 8核+ | 16GB+ | 100GB+ |

### 软件要求

| 软件 | 版本要求 |
|------|---------|
| Docker | 24.0+ |
| Docker Compose | 2.0+ |
| Node.js | 18+ (开发模式) |
| PostgreSQL | 15+ (外部数据库) |
| Redis | 7+ (外部缓存) |

## 安装前检查

在安装前，建议运行检查脚本验证系统环境：

```bash
# Linux / macOS
pnpm run precheck

# Windows
pnpm run precheck:win
```

检查项目包括：
- 操作系统和架构
- 内存和磁盘空间
- Docker 和 Docker Compose 安装状态
- 端口可用性
- 网络连接

## 快速安装

### 一键安装 (推荐)

**Linux / macOS:**

```bash
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# 或克隆项目后运行
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/quick-install.sh
```

**Windows:**

```powershell
# 快速安装
.\scripts\quick-install.bat

# 或 PowerShell 完整安装
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

### Docker 快速启动

```bash
# 一条命令启动所有服务
docker compose -f docker-compose.quick.yml up -d

# 或使用 npm 脚本
pnpm run docker:quick

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 验证安装

```bash
# 健康检查
curl http://localhost:3000/health

# 运行健康检查脚本
pnpm run health

# 完整诊断
pnpm run health:full
```

## 安装模式

### 1. Docker 快速模式 (推荐新手)

最简单的安装方式，适合快速体验和开发测试。

```bash
# 使用快速配置
docker compose -f docker-compose.quick.yml up -d

# 或使用 npm 脚本
pnpm run docker:quick
```

**特点：**
- 自动安装所有依赖服务
- 开箱即用
- 易于管理和维护

### 2. 外部服务模式

使用外部数据库和 Redis，适合生产环境。

```bash
# 配置外部服务
cp .env.example .env

# 编辑配置
DB_HOST=your-db-host
DB_PORT=5432
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# 启动
docker compose -f docker-compose.external-db.yml up -d
```

### 3. 独立服务模式

直接在服务器上运行，适合需要精细控制的场景。

```bash
# 使用安装脚本
sudo ./scripts/install.sh standalone

# 或手动安装
npm install
npm run build
npm run start:prod
```

## 环境配置

### 必需配置项

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

```bash
# 生成强密码
openssl rand -base64 24

# 生成 JWT 密钥
openssl rand -base64 32

# 更新 .env 文件
vim .env
```

### 2. 防火墙配置

```bash
# 开放必要端口
# 应用端口
firewall-cmd --permanent --add-port=3000/tcp

# WukongIM 端口
firewall-cmd --permanent --add-port=5001/tcp
firewall-cmd --permanent --add-port=5100/tcp
firewall-cmd --permanent --add-port=5200/tcp

# 重载防火墙
firewall-cmd --reload
```

### 3. SSL 配置

```bash
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

## 验证安装

### 健康检查

```bash
# 快速检查
./scripts/health-check.sh quick

# 完整诊断
./scripts/health-check.sh full

# 检查特定服务
./scripts/health-check.sh database
./scripts/health-check.sh redis
./scripts/health-check.sh wukongim
```

### 访问测试

```bash
# API 健康检查
curl http://localhost:3000/health

# API 文档
open http://localhost:3000/api/docs

# WukongIM 管理后台
open http://localhost:5300/web
```

## 常见问题

### 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 修改端口
# 编辑 .env 文件中的 PORT 配置
```

### 数据库连接失败

```bash
# 检查数据库状态
docker compose ps postgres

# 查看数据库日志
docker compose logs postgres

# 测试连接
docker exec -it openchat-postgres psql -U openchat -d openchat
```

### 内存不足

```bash
# 查看资源使用
docker stats

# 调整资源限制
# 编辑 .env 文件中的 *_MEMORY_LIMIT 配置
```

### 服务无法启动

```bash
# 查看日志
docker compose logs app

# 运行诊断
./scripts/health-check.sh full

# 尝试自动修复
./scripts/auto-fix.sh
```

## 升级

```bash
# 备份数据
make db-backup

# 拉取最新代码
git pull

# 更新服务
make update
```

## 卸载

```bash
# 使用安装脚本卸载
./scripts/install.sh uninstall

# 或手动卸载
docker compose down -v
rm -rf /opt/openchat
```

## 下一步

- [配置说明](../config/) - 详细配置参数
- [API 文档](../api/) - API 接口文档
- [开发指南](../development/) - 开发指南
