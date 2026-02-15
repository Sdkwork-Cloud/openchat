# 群组管理 API

群组管理 API 提供群组的创建、管理、成员管理等功能。

## 概述

所有群组管理 API 都需要 JWT 认证，路径前缀为 `/api/v1/groups`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建群组 | POST | `/groups` | 创建新群组 |
| 获取群组详情 | GET | `/groups/:id` | 获取群组详细信息 |
| 更新群组信息 | PUT | `/groups/:id` | 更新群组信息 |
| 删除群组 | DELETE | `/groups/:id` | 删除群组 |
| 添加群成员 | POST | `/groups/:groupId/members` | 添加群成员 |
| 移除群成员 | DELETE | `/groups/:groupId/members/:userId` | 移除群成员 |
| 更新群成员角色 | PUT | `/groups/:groupId/members/:userId/role` | 更新群成员角色 |
| 获取群成员列表 | GET | `/groups/:groupId/members` | 获取群成员列表 |
| 获取用户所在群组列表 | GET | `/groups/user/:userId` | 获取用户所在群组列表 |
| 发送群组邀请 | POST | `/groups/invitation` | 发送群组邀请 |
| 接受群组邀请 | POST | `/groups/invitation/:id/accept` | 接受群组邀请 |
| 拒绝群组邀请 | POST | `/groups/invitation/:id/reject` | 拒绝群组邀请 |
| 取消群组邀请 | DELETE | `/groups/invitation/:id` | 取消群组邀请 |
| 添加用户到群黑名单 | POST | `/groups/:groupId/blacklist` | 添加用户到群黑名单 |
| 从群黑名单移除用户 | DELETE | `/groups/:groupId/blacklist/:userId` | 从群黑名单移除用户 |
| 获取群黑名单列表 | GET | `/groups/:groupId/blacklist` | 获取群黑名单列表 |
| 添加用户到群白名单 | POST | `/groups/:groupId/whitelist` | 添加用户到群白名单 |
| 从群白名单移除用户 | DELETE | `/groups/:groupId/whitelist/:userId` | 从群白名单移除用户 |
| 获取群白名单列表 | GET | `/groups/:groupId/whitelist` | 获取群白名单列表 |
| 踢出群成员并加入黑名单 | POST | `/groups/:groupId/kick/:userId` | 踢出群成员并加入黑名单 |
| 退出群组 | POST | `/groups/:groupId/quit` | 退出群组 |
| 更新群公告 | PUT | `/groups/:groupId/announcement` | 更新群公告 |
| 全员禁言设置 | PUT | `/groups/:groupId/mute-all` | 全员禁言设置 |
| 禁言群成员 | PUT | `/groups/:groupId/members/:userId/mute` | 禁言群成员 |
| 转让群主 | POST | `/groups/:groupId/transfer` | 转让群主 |

---

## 创建群组

创建一个新的群组。

```http
POST /api/v1/groups
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "name": "string",
  "avatar": "string",
  "description": "string"
}
```

**响应示例：**

```json
{
  "id": "group-uuid",
  "name": "技术交流群",
  "avatar": "https://example.com/group-avatar.jpg",
  "description": "技术爱好者交流群",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 获取群组详情

获取群组的详细信息。

```http
GET /api/v1/groups/:id
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**响应示例：**

```json
{
  "id": "group-uuid",
  "name": "技术交流群",
  "avatar": "https://example.com/group-avatar.jpg",
  "description": "技术爱好者交流群",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**错误响应：**

- 404: 群组不存在

---

## 更新群组信息

更新群组的基本信息。

```http
PUT /api/v1/groups/:id
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**请求体：**

```json
{
  "name": "string",
  "avatar": "string",
  "description": "string"
}
```

**响应示例：**

```json
{
  "id": "group-uuid",
  "name": "新群名称",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**错误响应：**

- 404: 群组不存在

---

## 删除群组

删除群组。

```http
DELETE /api/v1/groups/:id
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**响应示例：**

```json
true
```

**错误响应：**

- 404: 群组不存在

---

## 添加群成员

向群组添加新成员。

```http
POST /api/v1/groups/:groupId/members
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userId": "string",
  "role": "admin" | "member"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| role | string | 否 | 角色：admin=管理员，member=普通成员，默认 member |

**响应示例：**

```json
{
  "userId": "user-uuid",
  "groupId": "group-uuid",
  "role": "member",
  "joinedAt": "2024-01-15T10:30:00Z"
}
```

**错误响应：**

- 400: 群组不存在或用户已在群中

---

## 移除群成员

从群组移除成员。

```http
DELETE /api/v1/groups/:groupId/members/:userId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
true
```

---

## 更新群成员角色

更新群成员的角色。

```http
PUT /api/v1/groups/:groupId/members/:userId/role
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| userId | string | 是 | 用户 ID |

**请求体：**

```json
{
  "role": "admin" | "member"
}
```

**响应示例：**

```json
true
```

---

## 获取群成员列表

获取群组的成员列表。

```http
GET /api/v1/groups/:groupId/members
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**响应示例：**

```json
[
  {
    "userId": "user-uuid",
    "groupId": "group-uuid",
    "role": "member",
    "joinedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 获取用户所在群组列表

获取用户加入的所有群组列表。

```http
GET /api/v1/groups/user/:userId
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
    "id": "group-uuid",
    "name": "技术交流群",
    "avatar": "https://example.com/group-avatar.jpg",
    "description": "技术爱好者交流群",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 发送群组邀请

向用户发送群组邀请。

```http
POST /api/v1/groups/invitation
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "groupId": "string",
  "inviterId": "string",
  "inviteeId": "string",
  "message": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| inviterId | string | 是 | 邀请者 ID |
| inviteeId | string | 是 | 被邀请者 ID |
| message | string | 否 | 邀请消息 |

**响应示例：**

```json
{
  "id": "invitation-uuid",
  "groupId": "group-uuid",
  "inviterId": "inviter-uuid",
  "inviteeId": "invitee-uuid",
  "message": "欢迎加入",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**错误响应：**

- 400: 群组不存在、邀请者不是群成员或被邀请者已在群中

---

## 接受群组邀请

接受群组邀请。

```http
POST /api/v1/groups/invitation/:id/accept
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 邀请 ID |

**响应示例：**

```json
true
```

**错误响应：**

- 400: 邀请不存在或状态不正确

---

## 拒绝群组邀请

拒绝群组邀请。

```http
POST /api/v1/groups/invitation/:id/reject
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 邀请 ID |

**响应示例：**

```json
true
```

**错误响应：**

- 400: 邀请不存在或状态不正确

---

## 取消群组邀请

取消群组邀请。

```http
DELETE /api/v1/groups/invitation/:id
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 邀请 ID |

**响应示例：**

```json
true
```

**错误响应：**

- 400: 邀请不存在或状态不正确

---

## 添加用户到群黑名单

将用户添加到群黑名单。

```http
POST /api/v1/groups/:groupId/blacklist
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userId": "string"
}
```

**响应示例：**

```json
true
```

---

## 从群黑名单移除用户

将用户从群黑名单中移除。

```http
DELETE /api/v1/groups/:groupId/blacklist/:userId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
true
```

---

## 获取群黑名单列表

获取群组的黑名单列表。

```http
GET /api/v1/groups/:groupId/blacklist
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**响应示例：**

```json
["user1-uuid", "user2-uuid"]
```

---

## 添加用户到群白名单

将用户添加到群白名单。

```http
POST /api/v1/groups/:groupId/whitelist
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userId": "string"
}
```

**响应示例：**

```json
true
```

---

## 从群白名单移除用户

将用户从群白名单中移除。

```http
DELETE /api/v1/groups/:groupId/whitelist/:userId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
true
```

---

## 获取群白名单列表

获取群组的白名单列表。

```http
GET /api/v1/groups/:groupId/whitelist
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**响应示例：**

```json
["user1-uuid", "user2-uuid"]
```

---

## 踢出群成员并加入黑名单

踢出群成员并将其加入黑名单。

```http
POST /api/v1/groups/:groupId/kick/:userId
Authorization: Bearer &lt;access-token&gt;
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
true
```

---

## 退出群组

退出当前群组。

```http
POST /api/v1/groups/:groupId/quit
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userId": "string"
}
```

**响应示例：**

```json
true
```

**错误响应：**

- 400: 群主不能退出群组

---

## 更新群公告

更新群组的公告。

```http
PUT /api/v1/groups/:groupId/announcement
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "announcement": "string"
}
```

**响应示例：**

```json
{
  "id": "group-uuid",
  "announcement": "新的群公告",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

---

## 全员禁言设置

设置或取消全员禁言。

```http
PUT /api/v1/groups/:groupId/mute-all
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "muteAll": true
}
```

**响应示例：**

```json
{
  "id": "group-uuid",
  "muteAll": true,
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

---

## 禁言群成员

对群成员进行禁言或解禁。

```http
PUT /api/v1/groups/:groupId/members/:userId/mute
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |
| userId | string | 是 | 用户 ID |

**请求体：**

```json
{
  "duration": 3600
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| duration | number | 是 | 禁言时长（秒），0 表示取消禁言 |

**响应示例：**

```json
true
```

---

## 转让群主

将群主身份转让给其他成员。

```http
POST /api/v1/groups/:groupId/transfer
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 是 | 群组 ID |

**请求体：**

```json
{
  "newOwnerId": "string",
  "operatorId": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| newOwnerId | string | 是 | 新群主 ID |
| operatorId | string | 是 | 操作者 ID |

**响应示例：**

```json
{
  "id": "group-uuid",
  "ownerId": "new-owner-uuid",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**错误响应：**

- 400: 操作者不是群主或新群主不是群成员

---

## 数据类型

```typescript
interface Group {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  announcement?: string;
  muteAll?: boolean;
}

interface GroupMember {
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface GroupInvitation {
  id: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}
```

---

## 相关链接

- [消息管理 API](./messages.md)
- [好友管理 API](./friends.md)
