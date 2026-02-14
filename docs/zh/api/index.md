# API 文档

OpenChat 提供完整的 RESTful API，支持即时通讯、用户管理、群组管理等功能。

## 概述

### 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `http://your-server:3000/api` |
| 协议 | HTTP/HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601 (`2024-01-15T10:30:00Z`) |

### API 模块

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 认证授权 | `/api/auth` | 登录、注册、Token 管理 |
| 用户管理 | `/api/users` | 用户信息、搜索、设置 |
| 消息管理 | `/api/messages` | 消息发送、查询、撤回 |
| 会话管理 | `/api/conversations` | 会话列表、未读管理 |
| 群组管理 | `/api/groups` | 群组创建、成员管理 |
| 好友管理 | `/api/friends` | 好友申请、分组管理 |
| IM 集成 | `/api/im` | WukongIM 相关接口 |

---

## 认证

OpenChat 使用 JWT (JSON Web Token) 进行 API 认证。

### 获取 Token

```http
POST /api/auth/login
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
| Access Token | 7 天 | API 请求认证 |
| Refresh Token | 30 天 | 刷新 Access Token |

---

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
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

- [认证授权 API](./auth.md) - 登录、注册、Token 刷新

### 用户相关

- [用户管理 API](./users.md) - 用户信息、搜索、设置

### 消息相关

- [消息管理 API](./messages.md) - 消息发送、查询、撤回
- [WukongIM 集成 API](./wukongim.md) - IM 消息引擎接口

### 社交相关

- [群组管理 API](./groups.md) - 群组创建、成员管理
- [好友管理 API](./friends.md) - 好友申请、分组管理

---

## 快速开始

### 1. 注册用户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "nickname": "Test User"
  }'
```

### 2. 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. 发送消息

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "receiver-user-id",
    "type": "text",
    "content": "Hello, OpenChat!"
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
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 登录
await client.auth.login({
  username: 'testuser',
  password: 'password123'
});

// 发送消息
await client.message.send({
  to: 'receiver-id',
  type: 'text',
  content: 'Hello!'
});

// 监听消息
client.message.onMessage((message) => {
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
