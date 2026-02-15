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
| Docker | 24.0+ | 容器运行时 |
| Docker Compose | 2.0+ | 容器编排 |

## 安装前检查

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

## 安装方式

### 方式一：一键安装（推荐）

::: code-group

```bash [Linux/macOS]
# 快速安装
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/quick-install.sh | bash

# 或克隆后安装
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
docker compose -f docker-compose.quick.yml ps
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
docker compose -f docker-compose.quick.yml ps
```

:::

### 方式三：Docker 开发环境（灵活配置）

使用 `docker-compose.yml` 支持灵活配置，可选择性启动服务：

::: code-group

```bash [Linux/macOS]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 配置环境变量
cp .env.example .env
vim .env

# 启动所有服务（数据库+Redis+IM+应用）
docker compose --profile database --profile cache --profile im up -d

# 或使用 npm 脚本
pnpm run docker:up

# 只启动应用（使用外部数据库）
docker compose up -d

# 查看服务状态
docker compose ps
```

```powershell [Windows]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 配置环境变量
copy .env.example .env
notepad .env

# 启动所有服务（数据库+Redis+IM+应用）
docker compose --profile database --profile cache --profile im up -d

# 或使用 npm 脚本
pnpm run docker:up

# 只启动应用（使用外部数据库）
docker compose up -d

# 查看服务状态
docker compose ps
```

:::

### 方式四：手动部署

::: code-group

```bash [Linux/macOS]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 配置环境变量
cp .env.example .env
vim .env

# 启动服务
docker compose up -d
```

```powershell [Windows]
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 配置环境变量
copy .env.example .env
notepad .env

# 启动服务
docker compose up -d
```

:::

## 验证安装

### 运行安装测试

::: code-group

```bash [Linux/macOS]
# 快速测试
./scripts/install-test.sh quick

# 完整测试
./scripts/install-test.sh full
```

```powershell [Windows]
# 快速测试
pnpm run test:install

# 完整测试
pnpm run test:install:full
```

:::

### 测试 API

::: code-group

```bash [Linux/macOS]
# 测试健康检查
curl http://localhost:3000/health

# 预期响应
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

```powershell [Windows]
# 测试健康检查
Invoke-WebRequest -Uri http://localhost:3000/health

# 预期响应
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

:::

### 访问服务

| 服务 | 地址 | 说明 |
|------|------|------|
| OpenChat API | http://localhost:3000 | 主服务 API |
| API 文档 | http://localhost:3000/api/docs | Swagger 文档 |
| WukongIM Demo | http://localhost:5172 | IM 演示页面 |
| WukongIM 管理 | http://localhost:5300/web | IM 管理后台 |
| Prometheus | http://localhost:9090 | 监控面板 |

## 第一个聊天应用

### 1. 注册用户

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/api/auth/register \
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

Invoke-RestMethod -Uri http://localhost:3000/api/auth/register `
    -Method POST -Headers $headers -Body $body
```

:::

### 2. 登录获取 Token

::: code-group

```bash [Linux/macOS]
curl -X POST http://localhost:3000/api/auth/login \
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

Invoke-RestMethod -Uri http://localhost:3000/api/auth/login `
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
./scripts/precheck.sh

# 错误诊断
./scripts/diagnose.sh

# 自动修复
./scripts/auto-fix.sh --all

# 日志分析
./scripts/log-analyzer.sh analyze

# 健康监控
./scripts/health-check.sh --monitor
```

```powershell [Windows]
# 系统预检查
pnpm run precheck

# 错误诊断
pnpm run diagnose

# 自动修复
pnpm run auto-fix

# 健康监控
pnpm run health:monitor
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
pnpm run install:status

# 运行诊断
pnpm run diagnose

# 自动修复
pnpm run auto-fix
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
