# 好友管理 API

好友管理 API 提供好友关系的建立、管理和查询等功能。

## 概述

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发送好友请求 | POST | `/api/friends/request` | 发送好友请求 |
| 接受好友请求 | POST | `/api/friends/request/:id/accept` | 接受好友请求 |
| 拒绝好友请求 | POST | `/api/friends/request/:id/reject` | 拒绝好友请求 |
| 取消好友请求 | DELETE | `/api/friends/request/:id` | 取消好友请求 |
| 删除好友 | DELETE | `/api/friends/:userId/:friendId` | 删除好友 |
| 获取好友请求列表 | GET | `/api/friends/requests/:userId` | 获取好友请求列表 |
| 获取好友列表 | GET | `/api/friends/:userId` | 获取好友列表 |
| 检查好友关系 | GET | `/api/friends/:userId/:friendId/check` | 检查是否为好友 |
| 获取发送的好友请求 | GET | `/api/friends/requests/sent/:userId` | 获取发送的好友请求列表 |
| 拉黑好友 | POST | `/api/friends/:userId/:friendId/block` | 拉黑好友 |
| 取消拉黑 | POST | `/api/friends/:userId/:friendId/unblock` | 取消拉黑 |
| 检查是否被拉黑 | GET | `/api/friends/:userId/:friendId/blocked` | 检查是否被拉黑 |

---

## 发送好友请求

向其他用户发送好友请求。

```http
POST /api/friends/request
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "fromUserId": "string",         // 必填，发送者用户 ID
  "toUserId": "string",           // 必填，目标用户 ID
  "message": "string"             // 可选，申请消息
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fromUserId | string | 是 | 发送者用户 ID |
| toUserId | string | 是 | 目标用户 ID |
| message | string | 否 | 申请消息 |

**响应示例：**

```json
{
  "id": "request-uuid",
  "fromUserId": "sender-uuid",
  "toUserId": "receiver-uuid",
  "message": "你好，我想加你为好友",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 接受好友请求

接受待处理的好友请求。

```http
POST /api/friends/request/{id}/accept
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友请求 ID |

**响应示例：**

```json
true
```

---

## 拒绝好友请求

拒绝待处理的好友请求。

```http
POST /api/friends/request/{id}/reject
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友请求 ID |

**响应示例：**

```json
true
```

---

## 取消好友请求

取消已发送但未处理的好友请求。

```http
DELETE /api/friends/request/{id}
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友请求 ID |

**响应示例：**

```json
true
```

---

## 删除好友

删除好友关系。

```http
DELETE /api/friends/{userId}/{friendId}
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| friendId | string | 是 | 要删除的好友 ID |

**响应示例：**

```json
true
```

---

## 获取好友请求列表

获取收到的好友请求列表。

```http
GET /api/friends/requests/{userId}?status=pending
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态：pending/accepted/rejected |

**响应示例：**

```json
[
  {
    "id": "request-uuid-1",
    "fromUserId": "user-1",
    "toUserId": "current-user",
    "message": "你好",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": "request-uuid-2",
    "fromUserId": "user-2",
    "toUserId": "current-user",
    "message": "想加你好友",
    "status": "pending",
    "createdAt": "2024-01-15T11:00:00Z"
  }
]
```

---

## 获取好友列表

获取用户的好友列表。

```http
GET /api/friends/{userId}
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
["friend-uuid-1", "friend-uuid-2", "friend-uuid-3"]
```

---

## 检查好友关系

检查两个用户是否为好友关系。

```http
GET /api/friends/{userId}/{friendId}/check
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| friendId | string | 是 | 好友 ID |

**响应示例：**

```json
true
```

---

## 获取发送的好友请求列表

获取已发送的好友请求列表。

```http
GET /api/friends/requests/sent/{userId}
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
[
  {
    "id": "request-uuid-1",
    "fromUserId": "current-user",
    "toUserId": "user-1",
    "message": "你好",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 拉黑好友

将用户加入黑名单。

```http
POST /api/friends/{userId}/{friendId}/block
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| friendId | string | 是 | 要拉黑的用户 ID |

**响应示例：**

```json
true
```

---

## 取消拉黑

将用户从黑名单移除。

```http
POST /api/friends/{userId}/{friendId}/unblock
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| friendId | string | 是 | 要取消拉黑的用户 ID |

**响应示例：**

```json
true
```

---

## 检查是否被拉黑

检查是否已被指定用户拉黑。

```http
GET /api/friends/{userId}/{friendId}/blocked
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| friendId | string | 是 | 检查的用户 ID |

**响应示例：**

```json
true
```

---

## 数据类型

### FriendRequest 对象

```typescript
interface FriendRequest {
  id: string;                  // 请求 ID
  fromUserId: string;          // 发送者用户 ID
  toUserId: string;            // 接收者用户 ID
  message?: string;            // 请求消息
  status: 'pending' | 'accepted' | 'rejected';  // 状态
  createdAt: string;           // 创建时间
}
```

---

## 使用示例

### cURL

```bash
# 发送好友请求
curl -X POST http://localhost:3000/api/friends/request \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "user-1",
    "toUserId": "user-2",
    "message": "你好，我想加你为好友"
  }'

# 接受好友请求
curl -X POST http://localhost:3000/api/friends/request/request-uuid/accept \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 拒绝好友请求
curl -X POST http://localhost:3000/api/friends/request/request-uuid/reject \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 获取好友列表
curl -X GET http://localhost:3000/api/friends/user-1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 删除好友
curl -X DELETE http://localhost:3000/api/friends/user-1/friend-2 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 发送好友请求
await client.friend.sendRequest({
  fromUserId: 'user-1',
  toUserId: 'user-2',
  message: '你好'
});

// 接受好友请求
await client.friend.acceptRequest('request-uuid');

// 拒绝好友请求
await client.friend.rejectRequest('request-uuid');

// 获取好友列表
const friends = await client.friend.getList('user-1');

// 删除好友
await client.friend.remove('user-1', 'friend-2');

// 检查好友关系
const isFriend = await client.friend.check('user-1', 'friend-2');

// 拉黑好友
await client.friend.block('user-1', 'user-2');

// 取消拉黑
await client.friend.unblock('user-1', 'user-2');
```

---

## 相关链接

- [用户管理 API](./users.md)
- [群组管理 API](./groups.md)
- [消息管理 API](./messages.md)
- [SDK 文档](../sdk/typescript.md)
