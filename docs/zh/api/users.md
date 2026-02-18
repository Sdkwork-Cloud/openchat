# 用户管理 API

用户管理 API 提供用户信息的查询、更新等功能。

## 概述

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取当前用户 | GET | `/im/api/v1/users/me` | 获取当前登录用户信息 |
| 获取用户详情 | GET | `/im/api/v1/users/:id` | 获取指定用户详情 |
| 更新用户资料 | PUT | `/im/api/v1/users/:id` | 更新用户资料（仅限自己） |
| 搜索用户 | GET | `/im/api/v1/users` | 根据关键词搜索用户 |

---

## 获取当前用户

获取当前登录用户的详细信息。

```http
GET /im/api/v1/users/me
Authorization: Bearer &lt;access-token&gt;
```

**响应示例：**

```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "nickname": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "status": "online",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户唯一标识（UUID） |
| username | string | 用户名 |
| nickname | string | 昵称/显示名称 |
| avatar | string | 头像 URL |
| status | string | 在线状态：online/offline/busy |
| createdAt | string | 创建时间（ISO 8601） |
| updatedAt | string | 更新时间（ISO 8601） |

---

## 获取用户详情

获取指定用户的公开信息。

```http
GET /im/api/v1/users/{id}
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户 ID（UUID） |

**响应示例：**

```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "nickname": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "status": "online"
}
```

或用户不存在时返回：

```json
null
```

---

## 更新用户资料

更新用户的个人信息（只能更新自己的资料）。

```http
PUT /im/api/v1/users/{id}
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户 ID（UUID，必须为当前登录用户） |

**请求体：**

```json
{
  "nickname": "string",       // 可选，昵称
  "avatar": "string",         // 可选，头像 URL
  "status": "string"          // 可选，在线状态：online/offline/busy
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称 |
| avatar | string | 否 | 头像 URL |
| status | string | 否 | 在线状态：online/offline/busy |

**响应示例：**

```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "nickname": "New Nickname",
  "avatar": "https://example.com/new-avatar.jpg",
  "status": "busy",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

或无权限时：

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## 搜索用户

根据关键词搜索用户。

```http
GET /im/api/v1/users?keyword=john&amp;limit=20
Authorization: Bearer &lt;access-token&gt;
```

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 是 | - | 搜索关键词 |
| limit | string | 否 | 20 | 返回数量限制 |

**响应示例：**

```json
[
  {
    "id": "user-uuid-1",
    "username": "johndoe",
    "nickname": "John Doe",
    "avatar": "https://example.com/avatar1.jpg",
    "status": "online"
  },
  {
    "id": "user-uuid-2",
    "username": "johnsmith",
    "nickname": "John Smith",
    "avatar": "https://example.com/avatar2.jpg",
    "status": "offline"
  }
]
```

---

## 用户数据类型

### User 对象

```typescript
interface User {
  id: string;              // 用户唯一标识
  username: string;        // 用户名
  nickname?: string;       // 昵称
  avatar?: string;         // 头像 URL
  status?: 'online' | 'offline' | 'busy';  // 在线状态
  createdAt: string;       // 创建时间
  updatedAt: string;       // 更新时间
}
```

---

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `FORBIDDEN` | 403 | 权限不足 |
| `UNAUTHORIZED` | 401 | 未授权 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |

---

## 使用示例

### cURL

```bash
# 获取当前用户
curl -X GET http://localhost:3000/im/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 获取指定用户
curl -X GET http://localhost:3000/im/api/v1/users/user-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 更新用户资料
curl -X PUT http://localhost:3000/im/api/v1/users/user-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"nickname": "New Name"}'

# 搜索用户
curl -X GET "http://localhost:3000/im/api/v1/users?keyword=john&amp;limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### TypeScript SDK

```typescript
import { OpenChatClient, DeviceFlag } from '@openchat/typescript-sdk';

const client = new OpenChatClient({
  server: { baseUrl: 'http://localhost:3000' },
  im: { wsUrl: 'ws://localhost:5200', deviceFlag: DeviceFlag.WEB },
  auth: { uid: 'user-uid', token: 'user-token' },
});

// 获取当前用户
const currentUser = client.auth.getCurrentUser();

// 获取指定用户
const user = await client.api.users.getById('user-uuid');

// 更新用户资料
const updatedUser = await client.api.users.update('user-uuid', {
  nickname: 'New Name',
  avatar: 'https://example.com/avatar.jpg',
  status: 'online'
});

// 搜索用户
const users = await client.api.users.search('john', { limit: 20 });
```

---

## 相关链接

- [认证授权 API](./auth.md)
- [好友管理 API](./friends.md)
- [SDK 文档](../sdk/typescript.md)
