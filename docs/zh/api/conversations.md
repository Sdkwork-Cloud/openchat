# 会话管理 API

会话管理 API 提供会话的创建、查询、更新、删除等功能。

## 概述

所有会话管理 API 都需要 JWT 认证，路径前缀为 `/api/v1/conversations`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建会话 | POST | `/conversations` | 创建新会话 |
| 获取会话详情 | GET | `/conversations/:id` | 获取会话详细信息 |
| 获取用户会话列表 | GET | `/conversations` | 获取用户的会话列表 |
| 获取与特定目标的会话 | GET | `/conversations/target/:userId/:targetId` | 获取与特定目标的会话 |
| 更新会话 | PUT | `/conversations/:id` | 更新会话信息 |
| 删除会话 | DELETE | `/conversations/:id` | 删除会话 |
| 置顶/取消置顶会话 | PUT | `/conversations/:id/pin` | 设置会话置顶状态 |
| 设置免打扰 | PUT | `/conversations/:id/mute` | 设置会话免打扰 |
| 清空未读消息数 | PUT | `/conversations/:id/read` | 清空会话未读消息数 |
| 获取未读消息总数 | GET | `/conversations/unread-total/:userId` | 获取用户未读消息总数 |
| 批量删除会话 | DELETE | `/conversations/batch` | 批量删除会话 |

---

## 创建会话

创建一个新的会话。

```http
POST /api/v1/conversations
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "type": "single",
  "userId": "user-001",
  "targetId": "user-002"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 会话类型：single=单聊，group=群聊 |
| userId | string | 是 | 用户ID |
| targetId | string | 是 | 目标ID（用户ID或群组ID） |

### 响应示例

```json
{
  "id": "conv-uuid",
  "type": "single",
  "userId": "user-001",
  "targetId": "user-002",
  "targetName": "张三",
  "targetAvatar": "https://example.com/avatar.jpg",
  "lastMessage": null,
  "unreadCount": 0,
  "isPinned": false,
  "isMuted": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 400: 会话已存在

---

## 获取会话详情

根据会话ID获取会话详细信息。

```http
GET /api/v1/conversations/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

### 响应示例

```json
{
  "id": "conv-uuid",
  "type": "single",
  "userId": "user-001",
  "targetId": "user-002",
  "targetName": "张三",
  "targetAvatar": "https://example.com/avatar.jpg",
  "lastMessage": {
    "id": "msg-001",
    "type": "text",
    "content": { "text": { "text": "你好！" } },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "unreadCount": 5,
  "isPinned": false,
  "isMuted": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 会话不存在

---

## 获取用户会话列表

获取用户的所有会话列表。

```http
GET /api/v1/conversations?userId=user-001&type=single&isPinned=false&limit=50&offset=0
Authorization: Bearer <access-token>
```

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| userId | string | 是 | - | 用户ID |
| type | string | 否 | - | 会话类型：single, group |
| isPinned | boolean | 否 | - | 是否置顶 |
| limit | number | 否 | 50 | 返回数量限制 |
| offset | number | 否 | 0 | 偏移量 |

### 响应示例

```json
[
  {
    "id": "conv-001",
    "type": "single",
    "userId": "user-001",
    "targetId": "user-002",
    "targetName": "张三",
    "targetAvatar": "https://example.com/avatar1.jpg",
    "lastMessage": {
      "id": "msg-001",
      "type": "text",
      "content": { "text": { "text": "你好！" } },
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "unreadCount": 5,
    "isPinned": true,
    "isMuted": false,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": "conv-002",
    "type": "group",
    "userId": "user-001",
    "targetId": "group-001",
    "targetName": "技术交流群",
    "targetAvatar": "https://example.com/group-avatar.jpg",
    "lastMessage": {
      "id": "msg-002",
      "type": "text",
      "content": { "text": { "text": "大家好！" } },
      "createdAt": "2024-01-15T10:25:00Z"
    },
    "unreadCount": 12,
    "isPinned": false,
    "isMuted": true,
    "updatedAt": "2024-01-15T10:25:00Z"
  }
]
```

---

## 获取与特定目标的会话

获取用户与特定目标（用户或群组）的会话。

```http
GET /api/v1/conversations/target/:userId/:targetId?type=single
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| targetId | string | 是 | 目标ID |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 会话类型：single, group |

### 响应示例

```json
{
  "id": "conv-uuid",
  "type": "single",
  "userId": "user-001",
  "targetId": "user-002",
  "targetName": "张三",
  "targetAvatar": "https://example.com/avatar.jpg",
  "unreadCount": 5,
  "isPinned": false,
  "isMuted": false
}
```

### 错误响应

- 404: 会话不存在

---

## 更新会话

更新会话信息。

```http
PUT /api/v1/conversations/:id
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

### 请求体

```json
{
  "isPinned": true,
  "isMuted": true
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isPinned | boolean | 否 | 是否置顶 |
| isMuted | boolean | 否 | 是否免打扰 |

### 响应示例

```json
{
  "id": "conv-uuid",
  "isPinned": true,
  "isMuted": true,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 会话不存在

---

## 删除会话

删除指定会话。

```http
DELETE /api/v1/conversations/:id
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

### 响应示例

```json
true
```

### 错误响应

- 404: 会话不存在

---

## 置顶/取消置顶会话

设置会话的置顶状态。

```http
PUT /api/v1/conversations/:id/pin
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

### 请求体

```json
{
  "isPinned": true
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isPinned | boolean | 是 | 是否置顶 |

### 响应示例

```json
true
```

### 错误响应

- 404: 会话不存在

---

## 设置免打扰

设置会话的免打扰状态。

```http
PUT /api/v1/conversations/:id/mute
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

### 请求体

```json
{
  "isMuted": true
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isMuted | boolean | 是 | 是否免打扰 |

### 响应示例

```json
true
```

### 错误响应

- 404: 会话不存在

---

## 清空未读消息数

清空会话的未读消息数。

```http
PUT /api/v1/conversations/:id/read
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话ID |

### 响应示例

```json
true
```

### 错误响应

- 404: 会话不存在

---

## 获取未读消息总数

获取用户所有会话的未读消息总数。

```http
GET /api/v1/conversations/unread-total/:userId
Authorization: Bearer <access-token>
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |

### 响应示例

```json
{
  "total": 25
}
```

---

## 批量删除会话

批量删除多个会话。

```http
DELETE /api/v1/conversations/batch
Authorization: Bearer <access-token>
Content-Type: application/json
```

### 请求体

```json
{
  "ids": ["conv-001", "conv-002", "conv-003"]
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | string[] | 是 | 会话ID列表 |

### 响应示例

```json
{
  "success": true,
  "count": 3
}
```

---

## 数据类型

```typescript
interface Conversation {
  id: string;                    // 会话ID
  type: 'single' | 'group';      // 会话类型
  userId: string;                // 用户ID
  targetId: string;              // 目标ID（用户ID或群组ID）
  targetName: string;            // 目标名称
  targetAvatar?: string;         // 目标头像
  lastMessage?: Message;         // 最后一条消息
  unreadCount: number;           // 未读消息数
  isPinned: boolean;             // 是否置顶
  isMuted: boolean;              // 是否免打扰
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}

interface CreateConversationRequest {
  type: 'single' | 'group';      // 会话类型
  userId: string;                // 用户ID
  targetId: string;              // 目标ID
}

interface UpdateConversationRequest {
  isPinned?: boolean;            // 是否置顶
  isMuted?: boolean;             // 是否免打扰
}
```

---

## 相关链接

- [消息管理 API](./messages.md)
- [联系人管理 API](./contacts.md)
- [群组管理 API](./groups.md)
