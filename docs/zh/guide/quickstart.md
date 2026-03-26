# 快速开始

本指南将帮助你在 5 分钟内搭建并运行 OpenChat 完整环境。

## 环境要求

在开始之前，请确保你的系统满足以下要求：

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 20 GB | 50 GB SSD |
| 操作系统 | Linux/macOS/Windows | Linux |

### 软件依赖

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| npm | 9+ | 包管理器 |
| PostgreSQL | 15+ | 数据库 |
| Redis | 7+ | 缓存与队列 |

## 安装前检查

::: code-group

```bash [Linux/macOS]
# 运行预检查脚本
./scripts/precheck.sh --mode standalone
```

```powershell [Windows]
# 运行预检查脚本
.\scripts\precheck.ps1
```

:::

## 安装方式

### 方式一：统一主机部署（推荐）

::: code-group

```bash [Linux/macOS]
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
cp .env.example .env
# 按需编辑 .env
./scripts/deploy-server.sh production --db-action auto --yes --service
```

```powershell [Windows]
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
Copy-Item .env.example .env
# 按需编辑 .env
.\scripts\deploy-server.ps1 production -DbAction auto -Yes
```

:::

### 方式二：手工低层部署

::: code-group

```bash [Linux/macOS]
./scripts/precheck.sh --mode standalone
npm ci
npm run build
./scripts/init-database.sh production --yes
./scripts/apply-db-patches.sh production
./bin/openchat start --environment production --host 127.0.0.1 --port 7200
```

```powershell [Windows]
.\scripts\precheck.ps1
npm ci
npm run build
.\scripts\init-database.ps1 -Environment production -Yes
.\scripts\apply-db-patches.ps1 -Environment production
.\bin\openchat.ps1 start --environment production --host 127.0.0.1 --port 7200
```

:::

## 验证安装

### 检查运行状态

::: code-group

```bash [Linux/macOS]
./bin/openchat status
./bin/openchat health
curl http://127.0.0.1:7200/ready
```

```powershell [Windows]
.\bin\openchat.ps1 status
Invoke-WebRequest -Uri http://127.0.0.1:7200/health
```

:::

### 测试 API

::: code-group

```bash [Linux/macOS]
# 测试健康检查
curl http://127.0.0.1:7200/health
curl http://127.0.0.1:7200/ready

# 预期响应
# {"status":"ok",...}
```

```powershell [Windows]
# 测试健康检查
Invoke-WebRequest -Uri http://127.0.0.1:7200/health

# 预期响应
# {"status":"ok",...}
```

:::

### 访问服务

| 服务 | 地址 | 说明 |
|------|------|------|
| OpenChat API | http://127.0.0.1:7200 | 主服务 API |
| 前端 API 文档 | http://127.0.0.1:7200/im/v3/docs | 面向应用接入的 Swagger 文档 |
| 前端 OpenAPI JSON | http://127.0.0.1:7200/im/v3/openapi.json | 用于生成 sdkwork-im-sdk 的 schema |
| 管理端 API 文档 | http://127.0.0.1:7200/admin/im/v3/docs | 面向控制面的 Swagger 文档 |
| 管理端 OpenAPI JSON | http://127.0.0.1:7200/admin/im/v3/openapi.json | 管理端 schema |
| WukongIM Demo | http://localhost:5172 | IM 演示页面 |
| WukongIM 管理 | http://localhost:5300/web | IM 管理后台 |
| Prometheus | http://localhost:9090 | 监控面板 |

## 第一个聊天应用

### 1. 注册用户

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/im/v3/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123",
    "nickname": "用户1"
  }'
```

```powershell [Windows]
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    username = "user1"
    password = "password123"
    nickname = "用户1"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/im/v3/auth/register `
    -Method POST -Headers $headers -Body $body
```

:::

### 2. 登录获取 Token

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/im/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

```powershell [Windows]
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    username = "user1"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/im/v3/auth/login `
    -Method POST -Headers $headers -Body $body
```

:::

响应示例：

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "用户1"
    }
  }
}
```

### 3. 使用 SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000',
  imConfig: {
    tcpAddr: 'localhost:5100',
    wsUrl: 'ws://localhost:5200'
  }
});

// 初始化
await client.init();

// 登录
await client.auth.login({
  username: 'user1',
  password: 'password123'
});

// 发送消息
await client.message.send({
  to: 'user2',
  type: 'text',
  content: 'Hello, OpenChat!'
});
```

## 运维工具

OpenChat 提供完整的运维工具集：

::: code-group

```bash [Linux/macOS]
# 系统预检查
./scripts/precheck.sh --mode standalone

# 统一部署或更新
./scripts/deploy-server.sh production --db-action auto --yes --service

# 运行时
./bin/openchat restart
./bin/openchat status
./bin/openchat health
```

```powershell [Windows]
# 系统预检查
.\scripts\precheck.ps1

# 统一部署或更新
.\scripts\deploy-server.ps1 production -DbAction auto -Yes

# 运行时
.\bin\openchat.ps1 restart
.\bin\openchat.ps1 status
Invoke-WebRequest -Uri http://127.0.0.1:7200/health
```

:::

## 常见问题

### 端口冲突

如果提示端口被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 将主机的 3001 映射到容器的 3000
```

### 防火墙配置

::: code-group

```bash [Ubuntu/Debian (ufw)]
# 开放端口
sudo ufw allow 3000/tcp
sudo ufw allow 5100/tcp
sudo ufw allow 5200/tcp

# 启用防火墙
sudo ufw enable
```

```bash [CentOS/RHEL (firewalld)]
# 开放端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5100/tcp
sudo firewall-cmd --permanent --add-port=5200/tcp

# 重载防火墙
sudo firewall-cmd --reload
```

```powershell [Windows]
# 开放端口 (管理员权限)
New-NetFirewallRule -DisplayName "OpenChat API" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OpenChat TCP" -Direction Inbound -Port 5100 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OpenChat WS" -Direction Inbound -Port 5200 -Protocol TCP -Action Allow
```

:::

### 安装失败

::: code-group

```bash [Linux/macOS]
# 检查安装状态
./scripts/install-manager.sh status

# 恢复安装
./scripts/install-manager.sh resume

# 运行诊断
./scripts/diagnose.sh

# 自动修复
./scripts/auto-fix.sh --all
```

```powershell [Windows]
# 检查安装状态
.\scripts\install-manager.ps1 status

# 运行诊断
.\scripts\precheck.ps1

# 运行时健康检查
.\bin\openchat.ps1 status
```

:::

## 下一步

- [项目概览](./overview.md) - 了解 OpenChat 的核心特性
- [架构设计](./architecture.md) - 深入了解系统架构
- [API 文档](/zh/api/) - 查看完整的 API 文档
- [SDK 文档](/zh/sdk/) - 了解如何使用 SDK

## 获取帮助

- 💬 [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- 🐛 [Issue 报告](https://github.com/Sdkwork-Cloud/openchat/issues)
- 📧 邮箱: contact@sdkwork.com
