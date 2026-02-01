# 快速开始

本指南将帮助你在 5 分钟内搭建并运行 OpenChat 完整环境。

## 环境要求

在开始之前，请确保你的系统满足以下要求：

- **操作系统**: Linux / macOS / Windows (WSL2)
- **Docker**: 24.0+ ([安装指南](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.20+ ([安装指南](https://docs.docker.com/compose/install/))
- **内存**: 至少 4GB 可用内存
- **磁盘**: 至少 20GB 可用空间

## 一键部署

OpenChat 提供了一键部署脚本，让你可以在几分钟内启动完整的服务。

### 1. 克隆项目

```bash
git clone https://github.com/openchat-team/openchat-server.git
cd openchat-server
```

### 2. 运行一键部署脚本

```bash
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

脚本将自动完成以下操作：
- ✅ 检查 Docker 环境
- ✅ 检测服务器 IP 地址
- ✅ 生成环境变量配置
- ✅ 拉取 Docker 镜像
- ✅ 启动所有服务
- ✅ 等待服务就绪

### 3. 访问服务

部署完成后，你将看到以下访问地址：

```
🎉 部署成功！

服务访问地址:
  • OpenChat API:    http://your-server-ip:3000
  • 悟空IM Demo:     http://your-server-ip:5172
  • 悟空IM 管理后台: http://your-server-ip:5300/web
  • Prometheus:      http://your-server-ip:9090
```

## 手动部署

如果你希望手动控制部署过程，可以按照以下步骤操作：

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下配置：

```env
# 服务器IP（必须修改）
EXTERNAL_IP=your-server-ip

# 安全密钥（生产环境必须修改）
JWT_SECRET=your-secret-key
DB_PASSWORD=your-db-password
REDIS_PASSWORD=your-redis-password
```

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 检查服务状态

```bash
docker compose ps
```

## 验证安装

### 测试 API

```bash
# 测试 OpenChat Server
curl http://localhost:3000/health

# 预期响应
{"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### 测试悟空IM

```bash
# 测试悟空IM
curl http://localhost:5001/health

# 预期响应
{"status":"ok"}
```

### 访问 Demo

打开浏览器访问 `http://your-server-ip:5172`，输入任意用户名和密码即可登录体验。

## 第一个聊天应用

现在让我们创建一个简单的聊天应用来测试 OpenChat。

### 1. 注册用户

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123",
    "nickname": "用户1"
  }'
```

### 2. 登录获取 Token

```bash
curl -X POST http://localhost:3000/auth/login \
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
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "用户1"
    }
  }
}
```

### 3. 获取 IM 配置

```bash
curl http://localhost:3000/im/config \
  -H "Authorization: Bearer your-token"
```

响应示例：

```json
{
  "success": true,
  "data": {
    "tcpAddr": "your-server-ip:5100",
    "wsUrl": "ws://your-server-ip:5200",
    "apiUrl": "http://your-server-ip:5001"
  }
}
```

### 4. 发送消息

```bash
curl -X POST http://localhost:3000/im/message/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "channelId": "user2",
    "channelType": 1,
    "fromUid": "user1",
    "payload": "SGVsbG8gV29ybGQh"  # Base64 编码的消息内容
  }'
```

## 客户端 SDK 接入

### TypeScript SDK

```bash
npm install @openchat/sdk
```

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://your-server-ip:3000',
  imConfig: {
    tcpAddr: 'your-server-ip:5100',
    wsUrl: 'ws://your-server-ip:5200'
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

## 常见问题

### 端口冲突

如果提示端口被占用，可以修改 `compose.yaml` 中的端口映射：

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
sudo ufw allow 5300/tcp
sudo ufw allow 5172/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=5100/tcp
sudo firewall-cmd --permanent --add-port=5200/tcp
sudo firewall-cmd --permanent --add-port=5300/tcp
sudo firewall-cmd --permanent --add-port=5172/tcp
sudo firewall-cmd --reload
```

### 内存不足

如果启动失败，可能是内存不足。可以尝试：

1. 增加服务器内存
2. 减少服务内存限制（修改 `compose.yaml`）
3. 单独启动服务

```bash
# 只启动核心服务
docker compose up -d postgres redis app
```

## 下一步

- [架构设计](./architecture) - 了解 OpenChat 的系统架构
- [功能特性](./features) - 探索所有功能特性
- [API 文档](/api/) - 查看完整的 API 文档
- [SDK 文档](/sdk/) - 了解如何使用 SDK

## 获取帮助

- 💬 [GitHub Discussions](https://github.com/openchat-team/openchat-server/discussions)
- 🐛 [Issue 报告](https://github.com/openchat-team/openchat-server/issues)
- 📧 邮箱: support@openchat.dev
