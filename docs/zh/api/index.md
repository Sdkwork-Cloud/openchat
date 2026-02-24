# API 文档

OpenChat 提供完整的 RESTful API，支持即时通讯、用户管理、群组管理等功能。

## 概述

### 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `http://your-server:3000/im/api/v1` |
| 协议 | HTTP/HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601 (`2024-01-15T10:30:00Z`) |

### API 模块

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证授权 | `/im/api/v1/auth` | 登录、注册、Token 管理 |
| 用户管理 | `/im/api/v1/users` | 用户信息、搜索、设置 |
| 消息管理 | `/im/api/v1/messages` | 消息发送、查询、撤回 |
| 消息搜索 | `/im/api/v1/message-search` | 消息全文搜索、高级搜索 |
| 会话管理 | `/im/api/v1/conversations` | 会话列表、未读管理 |
| 群组管理 | `/im/api/v1/groups` | 群组创建、成员管理 |
| 好友管理 | `/im/api/v1/friends` | 好友申请、分组管理 |
| 联系人管理 | `/im/api/v1/contacts` | 联系人管理、分组 |
| 实时音视频 | `/im/api/v1/rtc` | 音视频通话、信令 |
| AI 机器人 | `/im/api/v1/ai-bots` | AI 机器人管理、消息处理 |
| AI Agent | `/im/api/v1/agents` | AI Agent 管理、工具调用 |
| 机器人平台 | `/im/api/v1/bots` | 多平台机器人集成 |
| 记忆管理 | `/im/api/v1/memory` | 对话记忆、知识库管理 |
| IoT | `/im/api/v1/iot` | IoT 设备管理、消息控制 |
| 健康检查 | `/im/api/v1/health` | 服务健康状态检查 |
| 监控指标 | `/im/api/v1/metrics` | Prometheus 监控指标 |
| 第三方集成 | `/im/api/v1/third-party` | 多平台消息集成 |
| IM 集成 | `/im/api/v1/im` | WukongIM 相关接口 |

---

## 认证

OpenChat 使用 JWT (JSON Web Token) 进行 API 认证。

### 获取 Token

```http
POST /im/api/v1/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

### 使用 Token

在请求头中添加 Authorization：

```http
Authorization: Bearer <your-access-token>
```

### Token 类型

| Token 类型 | 有效期 | 用途 |
|-----------|--------|------|
| Access Token | 1 小时 | API 请求认证 |
| Refresh Token | 7 天 | 刷新 Access Token |

---

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
  },
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 成功（无内容） |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 Token 无效） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

---

## 通用错误码

| 错误码 | 说明 |
|--------|------|
| `VALIDATION_ERROR` | 参数验证失败 |
| `UNAUTHORIZED` | 未授权 |
| `FORBIDDEN` | 权限不足 |
| `NOT_FOUND` | 资源不存在 |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 |
| `INTERNAL_ERROR` | 服务器内部错误 |

---

## 请求限制

| 类型 | 限制 |
|------|------|
| 默认频率限制 | 100 次/分钟 |
| 登录频率限制 | 10 次/分钟 |
| 消息发送限制 | 60 条/分钟 |
| 文件上传大小 | 最大 50MB |

---

## API 文档导航

### 认证相关

| 文档 | 说明 |
|------|------|
| [认证授权 API](./auth.md) | 登录、注册、Token 刷新、密码管理 |

### 用户相关

| 文档 | 说明 |
|------|------|
| [用户管理 API](./users.md) | 用户信息、搜索、设置 |
| [联系人管理 API](./contacts.md) | 联系人管理、分组、备注 |

### 消息相关

| 文档 | 说明 |
|------|------|
| [消息管理 API](./messages.md) | 消息发送、查询、撤回、转发 |
| [消息搜索 API](./message-search.md) | 消息全文搜索、高级搜索 |
| [WukongIM 集成 API](./wukongim.md) | IM 消息引擎接口 |

### 会话相关

| 文档 | 说明 |
|------|------|
| [会话管理 API](./conversations.md) | 会话列表、置顶、免打扰、未读管理 |

### 社交相关

| 文档 | 说明 |
|------|------|
| [群组管理 API](./groups.md) | 群组创建、成员管理、权限设置 |
| [好友管理 API](./friends.md) | 好友申请、分组管理、黑名单 |

### 实时通讯

| 文档 | 说明 |
|------|------|
| [实时音视频 API](./rtc.md) | 音视频通话、信令交换 |

### AI 功能

| 文档 | 说明 |
|------|------|
| [AI 机器人 API](./ai-bots.md) | AI 机器人管理、消息处理 |
| [AI Agent API](./agents.md) | AI Agent 管理、工具调用、工作流 |
| [机器人平台 API](./bots.md) | 多平台机器人集成 |
| [记忆管理 API](./memory.md) | 对话记忆、向量存储、知识库 |

### IoT 功能

| 文档 | 说明 |
|------|------|
| [IoT API](./iot.md) | IoT 设备管理、消息控制 |

### 运维监控

| 文档 | 说明 |
|------|------|
| [健康检查 API](./health.md) | 服务健康状态检查 |
| [监控指标 API](./metrics.md) | Prometheus 监控指标 |

### 集成功能

| 文档 | 说明 |
|------|------|
| [第三方集成 API](./third-party.md) | WhatsApp、Telegram、微信等平台集成 |

---

## 快速开始

### 1. 注册用户

```bash
curl -X POST http://localhost:3000/im/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "nickname": "Test User"
  }'
```

### 2. 登录获取 Token

```bash
curl -X POST http://localhost:3000/im/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. 发送消息

```bash
curl -X POST http://localhost:3000/im/api/v1/messages \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": {
      "text": {
        "text": "Hello, OpenChat!"
      }
    },
    "fromUserId": "your-user-id",
    "toUserId": "receiver-user-id"
  }'
```

---

## SDK 支持

OpenChat 提供多语言 SDK，简化 API 调用：

- [TypeScript SDK](../sdk/typescript.md)
- [Java SDK](../sdk/java.md)
- [Go SDK](../sdk/go.md)
- [Python SDK](../sdk/python.md)

### TypeScript SDK 示例

```typescript
import { OpenChatClient, DeviceFlag } from '@openchat/typescript-sdk';

const client = new OpenChatClient({
  server: { baseUrl: 'http://localhost:3000' },
  im: { wsUrl: 'ws://localhost:5200', deviceFlag: DeviceFlag.WEB },
  auth: { uid: 'user-uid', token: 'user-token' },
});

// 初始化
await client.init();

// 发送消息
await client.im.messages.sendText({
  toUserId: 'receiver-uuid',
  text: 'Hello!'
});

// 监听消息
client.on('message_received', (message) => {
  console.log('收到消息:', message);
});
```

---

## 在线 API 文档

启动服务后，可以访问 Swagger UI 查看交互式 API 文档：

```
http://localhost:3000/api/docs
```

Swagger UI 提供：
- 完整的 API 列表
- 在线测试功能
- 请求/响应示例
- 数据模型定义

---

## 相关链接

- [快速开始指南](../guide/quickstart.md)
- [SDK 文档](../sdk/)
- [部署指南](../deploy/)
