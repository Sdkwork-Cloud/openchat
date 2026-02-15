# 认证授权 API

OpenChat 使用 JWT (JSON Web Token) 进行身份认证，支持访问令牌和刷新令牌机制。

## 概述

认证授权 API 的路径前缀为 `/api/v1/auth`。

| 接口 | 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|------|-------------|
| 用户登录 | POST | `/auth/login` | 用户登录获取令牌 | 否 |
| 用户登出 | POST | `/auth/logout` | 用户登出 | 是 |
| 刷新令牌 | POST | `/auth/refresh` | 刷新访问令牌 | 否 |
| 获取当前用户信息 | GET | `/auth/me` | 获取当前登录用户信息 | 是 |
| 更新密码 | PUT | `/auth/password` | 更新用户密码 | 是 |
| 忘记密码 | POST | `/auth/forgot-password` | 忘记密码 | 否 |
| 发送验证码 | POST | `/auth/send-code` | 发送验证码 | 否 |
| 验证验证码 | POST | `/auth/verify-code` | 验证验证码 | 否 |
| 用户注册 | POST | `/auth/register` | 用户注册 | 否 |
| 获取用户在线状态 | GET | `/auth/users/:id/online-status` | 获取用户在线状态 | 是 |
| 批量获取用户在线状态 | POST | `/auth/users/online-status/batch` | 批量获取用户在线状态 | 是 |

---

## 用户登录

使用用户名和密码登录，获取访问令牌。

```http
POST /api/v1/auth/login
Content-Type: application/json
```

**请求体：**

```json
{
  "username": "string",
  "password": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**响应示例：**

```json
{
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "nickname": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800,
  "imConfig": {
    "wsUrl": "ws://your-server:5200",
    "uid": "user-uuid",
    "token": "im-token"
  }
}
```

**错误响应：**

- 400: 请求参数错误
- 401: 用户名或密码错误

---

## 用户登出

注销当前用户会话，使令牌失效。

```http
POST /api/v1/auth/logout
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "refreshToken": "string"
}
```

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

- 401: 未授权

---

## 刷新令牌

使用刷新令牌获取新的访问令牌。

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

**请求体：**

```json
{
  "refreshToken": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

**响应示例：**

```json
{
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "nickname": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

**错误响应：**

- 401: 刷新令牌无效或已过期

---

## 获取当前用户信息

获取当前登录用户的信息。

```http
GET /api/v1/auth/me
Authorization: Bearer &lt;access-token&gt;
```

**响应示例：**

```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "nickname": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "email": "john@example.com",
  "phone": "+8613800138000",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**错误响应：**

- 401: 未授权

---

## 更新用户密码

更新当前用户的密码。

```http
PUT /api/v1/auth/password
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码 |

**响应示例：**

```json
{
  "success": true
}
```

**错误响应：**

- 400: 请求参数错误或旧密码错误
- 401: 未授权

---

## 忘记密码

忘记密码，发送重置邮件或短信。

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

**请求体：**

```json
{
  "email": "string",
  "phone": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 否 | 邮箱地址（与 phone 二选一） |
| phone | string | 否 | 手机号码（与 email 二选一） |

**响应示例：**

```json
{
  "success": true,
  "message": "密码重置邮件或短信已发送"
}
```

**错误响应：**

- 400: 请求参数错误

---

## 发送验证码

发送验证码。

```http
POST /api/v1/auth/send-code
Content-Type: application/json
```

**请求体：**

```json
{
  "email": "string",
  "phone": "string",
  "type": "register" | "login" | "reset"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 否 | 邮箱地址（与 phone 二选一） |
| phone | string | 否 | 手机号码（与 email 二选一） |
| type | string | 是 | 验证码类型：register=注册，login=登录，reset=重置密码 |

**响应示例：**

```json
{
  "success": true,
  "message": "验证码已发送"
}
```

**错误响应：**

- 400: 请求参数错误

---

## 验证验证码

验证验证码。

```http
POST /api/v1/auth/verify-code
Content-Type: application/json
```

**请求体：**

```json
{
  "email": "string",
  "phone": "string",
  "code": "string",
  "type": "register" | "login" | "reset"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 否 | 邮箱地址（与 phone 二选一） |
| phone | string | 否 | 手机号码（与 email 二选一） |
| code | string | 是 | 验证码 |
| type | string | 是 | 验证码类型：register=注册，login=登录，reset=重置密码 |

**响应示例：**

```json
{
  "success": true,
  "message": "验证码验证成功"
}
```

**错误响应：**

- 400: 请求参数错误

---

## 用户注册

注册新用户账号（支持手机号或邮箱）。

```http
POST /api/v1/auth/register
Content-Type: application/json
```

**请求体：**

```json
{
  "username": "string",
  "password": "string",
  "nickname": "string",
  "email": "string",
  "phone": "string",
  "verificationCode": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| nickname | string | 否 | 昵称 |
| email | string | 否 | 邮箱地址 |
| phone | string | 否 | 手机号码 |
| verificationCode | string | 否 | 验证码 |

**响应示例：**

```json
{
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "nickname": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

**错误响应：**

- 400: 请求参数错误
- 409: 用户名已存在

---

## 获取用户在线状态

获取指定用户的在线状态。

```http
GET /api/v1/auth/users/:id/online-status
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户 ID |

**响应示例：**

```json
{
  "userId": "user-uuid",
  "isOnline": true,
  "lastActiveAt": "2024-01-15T10:30:00Z"
}
```

---

## 批量获取用户在线状态

批量获取多个用户的在线状态。

```http
POST /api/v1/auth/users/online-status/batch
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "userIds": ["string"]
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userIds | array | 是 | 用户 ID 列表 |

**响应示例：**

```json
[
  {
    "userId": "user1-uuid",
    "isOnline": true
  },
  {
    "userId": "user2-uuid",
    "isOnline": false
  }
]
```

---

## Token 类型

| Token 类型 | 有效期 | 用途 |
|-----------|--------|------|
| Access Token | 7 天 | API 请求认证 |
| Refresh Token | 30 天 | 刷新 Access Token |

---

## 数据类型

```typescript
interface AuthResponseDto {
  user: {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: number;
  imConfig?: {
    wsUrl: string;
    uid: string;
    token: string;
  };
}

interface ForgotPasswordResponseDto {
  success: boolean;
  message: string;
}
```

---

## 相关链接

- [用户管理 API](./users.md)
- [消息管理 API](./messages.md)
- [SDK 文档](../sdk/)
