# 快速开始

本指南将帮助你在 5 分钟内搭建并运行 OpenChat 完整环境。

## 环境要求

在开始之前，请确保你的系统满足以下要求：

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 20 GB | 50 GB SSD |
| 操作系统 | Linux/macOS/Windows(WSL2) | Linux |

### 软件依赖

| 软件 | 版本 | 说明 |
|------|------|------|
| Docker | 24.0+ | 容器运行时 |
| Docker Compose | 2.0+ | 容器编排 |

## 安装方式

### 方式一：安装向导（推荐）

**Linux / macOS:**

```bash
# 下载并运行安装向导
curl -fsSL https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.sh | bash

# 或克隆后运行
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat
./scripts/setup-wizard.sh
```

**Windows:**

```powershell
# 下载并运行安装向导
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Sdkwork-Cloud/openchat/main/scripts/setup-wizard.bat" -OutFile "setup-wizard.bat"
.\setup-wizard.bat
```

安装向导将引导您完成：
1. 选择安装环境（开发/测试/生产）
2. 选择安装模式（Docker/独立部署/混合模式）
3. 配置数据库连接
4. 配置 Redis 连接
5. 自动生成配置文件
6. 启动服务

### 方式二：Docker Compose

```bash
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps
```

### 方式三：手动部署

```bash
# 克隆项目
git clone https://github.com/Sdkwork-Cloud/openchat.git
cd openchat

# 配置环境变量
cp .env.production .env
vim .env

# 启动服务
docker compose up -d
```

## 验证安装

### 运行安装测试

```bash
# 快速测试
./scripts/install-test.sh quick

# 完整测试
./scripts/install-test.sh full
```

### 测试 API

```bash
# 测试健康检查
curl http://localhost:3000/health

# 预期响应
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

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

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123",
    "nickname": "用户1"
  }'
```

### 2. 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

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

```bash
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

## 常见问题

### 端口冲突

如果提示端口被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 将主机的 3001 映射到容器的 3000
```

### 防火墙配置

确保防火墙开放以下端口：

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 5100/tcp
sudo ufw allow 5200/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 安装失败

```bash
# 检查安装状态
./scripts/install-manager.sh status

# 恢复安装
./scripts/install-manager.sh resume

# 运行诊断
./scripts/diagnose.sh

# 自动修复
./scripts/auto-fix.sh --all
```

## 下一步

- [项目概览](./overview) - 了解 OpenChat 的核心特性
- [架构设计](./architecture) - 深入了解系统架构
- [API 文档](/zh/api/) - 查看完整的 API 文档
- [SDK 文档](/zh/sdk/) - 了解如何使用 SDK

## 获取帮助

- 💬 [GitHub Discussions](https://github.com/Sdkwork-Cloud/openchat/discussions)
- 🐛 [Issue 报告](https://github.com/Sdkwork-Cloud/openchat/issues)
- 📧 邮箱: contact@sdkwork.com
