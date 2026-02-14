# 用户管理 API

用户管理 API 提供用户信息的查询、更新等功能。

## 概述

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取当前用户 | GET | `/api/users/me` | 获取当前登录用户信息 |
| 更新用户信息 | PUT | `/api/users/me` | 更新当前用户信息 |
| 上传头像 | POST | `/api/users/avatar` | 上传用户头像 |
| 搜索用户 | GET | `/api/users/search` | 搜索用户 |
| 获取用户信息 | GET | `/api/users/:id` | 获取指定用户信息 |
| 获取用户列表 | GET | `/api/users` | 获取用户列表（管理员） |
| 修改密码 | PUT | `/api/users/password` | 修改用户密码 |
| 设置在线状态 | PUT | `/api/users/status` | 设置用户在线状态 |

---

## 获取当前用户

获取当前登录用户的详细信息。

```http
GET /api/users/me
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
    "gender": 1,
    "birthday": "1990-01-01",
    "signature": "Hello World",
    "status": "online",
    "lastSeenAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户唯一标识（UUID） |
| username | string | 用户名 |
| nickname | string | 昵称/显示名称 |
| avatar | string | 头像 URL |
| email | string | 邮箱地址 |
| phone | string | 手机号码 |
| gender | number | 性别：0=未知，1=男，2=女 |
| birthday | string | 生日（YYYY-MM-DD） |
| signature | string | 个性签名 |
| status | string | 在线状态：online/offline/busy/away |
| lastSeenAt | string | 最后在线时间（ISO 8601） |
| createdAt | string | 创建时间（ISO 8601） |
| updatedAt | string | 更新时间（ISO 8601） |

---

## 更新用户信息

更新当前用户的个人信息。

```http
PUT /api/users/me
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "nickname": "string",       // 可选，昵称，1-50 字符
  "avatar": "string",         // 可选，头像 URL
  "gender": 1,                // 可选，性别：0=未知，1=男，2=女
  "birthday": "string",       // 可选，生日（YYYY-MM-DD）
  "signature": "string",      // 可选，个性签名，最多 200 字符
  "email": "string",          // 可选，邮箱地址
  "phone": "string"           // 可选，手机号码
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称，1-50 字符，不能包含特殊字符 |
| avatar | string | 否 | 头像 URL，必须是有效的 HTTP/HTTPS URL |
| gender | number | 否 | 性别：0=未知，1=男，2=女 |
| birthday | string | 否 | 生日，格式：YYYY-MM-DD |
| signature | string | 否 | 个性签名，最多 200 字符 |
| email | string | 否 | 邮箱地址，必须是有效的邮箱格式 |
| phone | string | 否 | 手机号码，必须符合国际手机号格式 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "nickname": "New Nickname",
    "avatar": "https://example.com/new-avatar.jpg",
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "用户信息更新成功"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 409 | `EMAIL_ALREADY_EXISTS` | 邮箱已被其他用户使用 |
| 409 | `PHONE_ALREADY_EXISTS` | 手机号已被其他用户使用 |

---

## 上传头像

上传用户头像图片。

```http
POST /api/users/avatar
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 头像图片文件 |

**文件要求：**

- 支持格式：JPEG、PNG、GIF、WebP
- 文件大小：最大 5MB
- 图片尺寸：建议 200x200 像素以上

**响应示例：**

```json
{
  "success": true,
  "data": {
    "avatar": "https://cdn.example.com/avatars/user-uuid.jpg",
    "thumbnail": "https://cdn.example.com/avatars/user-uuid-thumb.jpg"
  },
  "message": "头像上传成功"
}
```

---

## 搜索用户

根据关键词搜索用户。

```http
GET /api/users/search
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词，2-50 字符 |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20，最大 100 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "johndoe",
        "nickname": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "signature": "Hello World",
        "status": "online"
      }
    ],
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

## 获取用户信息

获取指定用户的公开信息。

```http
GET /api/users/:id
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户 ID（UUID） |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "nickname": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "signature": "Hello World",
    "status": "online",
    "lastSeenAt": "2024-01-15T10:30:00Z"
  }
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 404 | `USER_NOT_FOUND` | 用户不存在 |

---

## 获取用户列表

获取用户列表（需要管理员权限）。

```http
GET /api/users
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20，最大 100 |
| status | string | 否 | 筛选状态：online/offline |
| sortBy | string | 否 | 排序字段：createdAt/lastSeenAt |
| sortOrder | string | 否 | 排序方向：asc/desc，默认 desc |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "johndoe",
        "nickname": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "email": "john@example.com",
        "status": "online",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1000,
      "totalPages": 50
    }
  }
}
```

---

## 修改密码

修改当前用户密码。

```http
PUT /api/users/password
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "oldPassword": "string",    // 必填，当前密码
  "newPassword": "string",    // 必填，新密码
  "confirmPassword": "string" // 必填，确认新密码
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码，6-32 字符，必须包含字母和数字 |
| confirmPassword | string | 是 | 确认新密码，必须与 newPassword 一致 |

**响应示例：**

```json
{
  "success": true,
  "message": "密码修改成功，请重新登录"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 400 | `PASSWORD_MISMATCH` | 新密码与确认密码不一致 |
| 401 | `INVALID_PASSWORD` | 当前密码错误 |
| 400 | `PASSWORD_TOO_WEAK` | 密码强度不足 |

---

## 设置在线状态

设置用户的在线状态。

```http
PUT /api/users/status
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "status": "online"  // 必填，状态值
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 是 | 状态：online/offline/busy/away |

**状态说明：**

| 状态 | 说明 |
|------|------|
| online | 在线 |
| offline | 离线 |
| busy | 忙碌 |
| away | 离开 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "status": "online",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

## 用户数据类型

### User 对象

```typescript
interface User {
  id: string;              // 用户唯一标识
  username: string;        // 用户名
  nickname: string;        // 昵称
  avatar?: string;         // 头像 URL
  email?: string;          // 邮箱
  phone?: string;          // 手机号
  gender?: number;         // 性别
  birthday?: string;       // 生日
  signature?: string;      // 个性签名
  status: UserStatus;      // 在线状态
  lastSeenAt?: string;     // 最后在线时间
  createdAt: string;       // 创建时间
  updatedAt: string;       // 更新时间
}

type UserStatus = 'online' | 'offline' | 'busy' | 'away';
```

### UserPublic 对象

公开的用户信息（不包含敏感字段）：

```typescript
interface UserPublic {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  status: UserStatus;
  lastSeenAt?: string;
}
```

---

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `USER_ALREADY_EXISTS` | 409 | 用户名已存在 |
| `EMAIL_ALREADY_EXISTS` | 409 | 邮箱已被使用 |
| `PHONE_ALREADY_EXISTS` | 409 | 手机号已被使用 |
| `INVALID_PASSWORD` | 401 | 密码错误 |
| `PASSWORD_MISMATCH` | 400 | 密码不匹配 |
| `PASSWORD_TOO_WEAK` | 400 | 密码强度不足 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 权限不足 |

---

## 使用示例

### cURL

```bash
# 获取当前用户
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 更新用户信息
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"nickname": "New Name", "signature": "New signature"}'

# 搜索用户
curl -X GET "http://localhost:3000/api/users/search?keyword=john" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 获取当前用户
const user = await client.user.getCurrentUser();

// 更新用户信息
await client.user.update({
  nickname: 'New Name',
  signature: 'New signature'
});

// 搜索用户
const results = await client.user.search('john', { page: 1, limit: 20 });

// 获取指定用户
const otherUser = await client.user.getById('user-uuid');
```

---

## 相关链接

- [认证授权 API](./auth.md)
- [好友管理 API](./friends.md)
- [SDK 文档](../sdk/typescript.md)
