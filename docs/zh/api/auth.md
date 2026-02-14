# 认证授权 API

OpenChat 使用 JWT (JSON Web Token) 进行身份认证，支持访问令牌和刷新令牌机制。

## 概述

### 认证流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────>│   Server    │────>│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Login         │                   │
       │ ─────────────────>│                   │
       │                   │  2. Verify        │
       │                   │ ─────────────────>│
       │                   │                   │
       │                   │  3. User Data     │
       │                   │ <─────────────────│
       │  4. JWT Token     │                   │
       │ <─────────────────│                   │
       │                   │                   │
       │  5. API Request   │                   │
       │ ─────────────────>│                   │
       │     + Token       │                   │
       │                   │                   │
       │  6. Response      │                   │
       │ <─────────────────│                   │
```

### Token 类型

| Token 类型 | 有效期 | 用途 |
|-----------|--------|------|
| Access Token | 7 天 | API 请求认证 |
| Refresh Token | 30 天 | 刷新 Access Token |

---

## API 端点

### 用户注册

注册新用户账号。

```http
POST /api/auth/register
Content-Type: application/json
```

**请求体：**

```json
{
  "username": "string",    // 必填，4-20字符，字母数字下划线
  "password": "string",    // 必填，6-32字符
  "nickname": "string",    // 可选，显示名称
  "email": "string",       // 可选，邮箱地址
  "phone": "string"        // 可选，手机号码
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "nickname": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "注册成功"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 409 | `USER_ALREADY_EXISTS` | 用户名已存在 |
| 409 | `EMAIL_ALREADY_EXISTS` | 邮箱已被注册 |

---

### 用户登录

使用用户名和密码登录，获取访问令牌。

```http
POST /api/auth/login
Content-Type: application/json
```

**请求体：**

```json
{
  "username": "string",    // 必填
  "password": "string"     // 必填
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "tokenType": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "nickname": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "email": "john@example.com"
    }
  },
  "message": "登录成功"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 401 | `INVALID_CREDENTIALS` | 用户名或密码错误 |
| 429 | `RATE_LIMIT_EXCEEDED` | 登录尝试次数过多 |

---

### 刷新令牌

使用刷新令牌获取新的访问令牌。

```http
POST /api/auth/refresh
Content-Type: application/json
```

**请求体：**

```json
{
  "refreshToken": "string"    // 必填
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "tokenType": "Bearer"
  },
  "message": "令牌刷新成功"
}
```

---

### 用户登出

注销当前用户会话，使令牌失效。

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

**响应示例：**

```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 获取当前用户

获取当前登录用户的信息。

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "nickname": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "email": "john@example.com",
    "phone": "+8613800138000",
    "status": "online",
    "lastSeenAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 使用示例

### cURL

```bash
# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "password123"}'

# 获取用户信息
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### JavaScript

```javascript
// 登录
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'johndoe',
    password: 'password123'
  })
});

const { data } = await response.json();
const { accessToken, user } = data;

// 存储 Token
localStorage.setItem('accessToken', accessToken);

// 使用 Token 请求 API
const userResponse = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 登录
const { user, accessToken } = await client.auth.login({
  username: 'johndoe',
  password: 'password123'
});

// 获取当前用户
const currentUser = await client.auth.getCurrentUser();
```

---

## 安全建议

### Token 存储

- **Web 应用**: 使用 `httpOnly` Cookie 或 `localStorage`
- **移动应用**: 使用安全的本地存储（如 Keychain/Keystore）
- **服务端**: 使用环境变量或密钥管理服务

### Token 刷新策略

```typescript
// 自动刷新 Token 示例
let accessToken = localStorage.getItem('accessToken');

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const { data } = await response.json();
  accessToken = data.accessToken;
  localStorage.setItem('accessToken', accessToken);
  return accessToken;
}

// 请求拦截器
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status === 401) {
    // Token 过期，尝试刷新
    await refreshAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }
  
  return response;
}
```

---

## 下一步

- [用户管理 API](./users) - 用户相关接口
- [消息管理 API](./messages) - 消息相关接口
- [SDK 文档](../sdk/) - 使用 SDK 简化开发
