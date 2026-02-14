# 群组管理 API

群组管理 API 提供群组的创建、管理、成员管理等功能。

## 概述

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建群组 | POST | `/api/groups` | 创建新群组 |
| 获取群组列表 | GET | `/api/groups` | 获取用户的群组列表 |
| 获取群组信息 | GET | `/api/groups/:id` | 获取群组详细信息 |
| 更新群组信息 | PUT | `/api/groups/:id` | 更新群组信息 |
| 解散群组 | DELETE | `/api/groups/:id` | 解散群组 |
| 添加群成员 | POST | `/api/groups/:id/members` | 添加群成员 |
| 移除群成员 | DELETE | `/api/groups/:id/members/:userId` | 移除群成员 |
| 退出群组 | POST | `/api/groups/:id/quit` | 退出群组 |
| 设置管理员 | PUT | `/api/groups/:id/admins` | 设置/取消管理员 |
| 转让群主 | PUT | `/api/groups/:id/owner` | 转让群主身份 |
| 禁言成员 | PUT | `/api/groups/:id/mute` | 禁言/解禁成员 |
| 获取群成员列表 | GET | `/api/groups/:id/members` | 获取群成员列表 |

---

## 创建群组

创建一个新的群组。

```http
POST /api/groups
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "name": "string",           // 必填，群组名称，1-50 字符
  "avatar": "string",         // 可选，群组头像 URL
  "description": "string",    // 可选，群组描述，最多 500 字符
  "memberIds": ["string"],    // 可选，初始成员 ID 列表，最多 499 人
  "maxMembers": 500,          // 可选，最大成员数，默认 500
  "joinType": 0,              // 可选，加入方式：0=邀请，1=申请，2=自由加入
  "muteAll": false            // 可选，是否全员禁言，默认 false
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 群组名称，1-50 字符 |
| avatar | string | 否 | 群组头像 URL |
| description | string | 否 | 群组描述，最多 500 字符 |
| memberIds | array | 否 | 初始成员 ID 列表，最多 499 人（不含创建者） |
| maxMembers | number | 否 | 最大成员数，默认 500，最大 500 |
| joinType | number | 否 | 加入方式：0=仅邀请，1=可申请，2=自由加入 |
| muteAll | boolean | 否 | 是否全员禁言，默认 false |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "技术交流群",
    "avatar": "https://example.com/group-avatar.jpg",
    "description": "技术爱好者交流群",
    "ownerId": "owner-uuid",
    "memberCount": 5,
    "maxMembers": 500,
    "joinType": 0,
    "muteAll": false,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "群组创建成功"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 400 | `TOO_MANY_MEMBERS` | 初始成员超过限制 |
| 404 | `USER_NOT_FOUND` | 成员用户不存在 |

---

## 获取群组列表

获取当前用户加入的所有群组列表。

```http
GET /api/groups
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20，最大 100 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "技术交流群",
        "avatar": "https://example.com/group-avatar.jpg",
        "ownerId": "owner-uuid",
        "memberCount": 100,
        "maxMembers": 500,
        "myRole": 0,
        "muteAll": false,
        "lastMessage": {
          "content": "Hello",
          "timestamp": 1705312800000
        },
        "unreadCount": 5,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50
    }
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| myRole | number | 我在群中的角色：0=普通成员，1=管理员，2=群主 |
| muteAll | boolean | 是否全员禁言 |
| lastMessage | object | 最后一条消息（可选） |
| unreadCount | number | 未读消息数 |

---

## 获取群组信息

获取群组的详细信息。

```http
GET /api/groups/:id
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "技术交流群",
    "avatar": "https://example.com/group-avatar.jpg",
    "description": "技术爱好者交流群",
    "ownerId": "owner-uuid",
    "owner": {
      "id": "owner-uuid",
      "nickname": "群主",
      "avatar": "https://example.com/owner-avatar.jpg"
    },
    "admins": [
      {
        "id": "admin-uuid",
        "nickname": "管理员",
        "avatar": "https://example.com/admin-avatar.jpg"
      }
    ],
    "memberCount": 100,
    "maxMembers": 500,
    "joinType": 0,
    "muteAll": false,
    "myRole": 0,
    "isMuted": false,
    "notice": "群公告内容",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 404 | `GROUP_NOT_FOUND` | 群组不存在 |
| 403 | `NOT_GROUP_MEMBER` | 不是群组成员 |

---

## 更新群组信息

更新群组的基本信息。

```http
PUT /api/groups/:id
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**请求体：**

```json
{
  "name": "string",           // 可选，群组名称
  "avatar": "string",         // 可选，群组头像 URL
  "description": "string",    // 可选，群组描述
  "notice": "string",         // 可选，群公告
  "joinType": 0,              // 可选，加入方式
  "muteAll": false            // 可选，是否全员禁言
}
```

**权限要求：**

- 群主和管理员可以修改群信息
- 只有群主可以修改 `joinType` 和 `muteAll`

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新群名称",
    "updatedAt": "2024-01-15T12:00:00Z"
  },
  "message": "群组信息更新成功"
}
```

---

## 解散群组

解散群组（仅群主可操作）。

```http
DELETE /api/groups/:id
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**权限要求：**

- 仅群主可以解散群组

**响应示例：**

```json
{
  "success": true,
  "message": "群组已解散"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 404 | `GROUP_NOT_FOUND` | 群组不存在 |
| 403 | `NOT_GROUP_OWNER` | 不是群主 |

---

## 添加群成员

向群组添加新成员。

```http
POST /api/groups/:id/members
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userIds": ["string"],      // 必填，要添加的用户 ID 列表
  "reason": "string"          // 可选，邀请理由
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userIds | array | 是 | 要添加的用户 ID 列表，最多 40 人 |
| reason | string | 否 | 邀请理由，最多 200 字符 |

**权限要求：**

- 根据 `joinType` 设置：
  - `0`（仅邀请）：群主和管理员可添加
  - `1`（可申请）：群主和管理员可添加
  - `2`（自由加入）：所有成员可添加

**响应示例：**

```json
{
  "success": true,
  "data": {
    "added": 5,
    "failed": 0,
    "failedUsers": []
  },
  "message": "成员添加成功"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `GROUP_FULL` | 群组已满 |
| 400 | `ALREADY_MEMBER` | 用户已是群成员 |
| 404 | `USER_NOT_FOUND` | 用户不存在 |

---

## 移除群成员

从群组移除成员。

```http
DELETE /api/groups/:id/members/:userId
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |
| userId | string | 是 | 要移除的用户 ID |

**权限要求：**

- 群主可以移除任何人
- 管理员可以移除普通成员
- 不能移除自己（使用退出接口）

**响应示例：**

```json
{
  "success": true,
  "message": "成员已移除"
}
```

---

## 退出群组

退出当前群组。

```http
POST /api/groups/:id/quit
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**注意事项：**

- 群主退出前需要先转让群主身份或解散群组
- 最后一个成员退出时群组自动解散

**响应示例：**

```json
{
  "success": true,
  "message": "已退出群组"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `OWNER_CANNOT_QUIT` | 群主不能直接退出 |

---

## 设置管理员

设置或取消群管理员。

```http
PUT /api/groups/:id/admins
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userId": "string",         // 必填，用户 ID
  "isAdmin": true             // 必填，true=设为管理员，false=取消管理员
}
```

**权限要求：**

- 仅群主可以设置管理员

**响应示例：**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "role": 1
  },
  "message": "管理员设置成功"
}
```

---

## 转让群主

将群主身份转让给其他成员。

```http
PUT /api/groups/:id/owner
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**请求体：**

```json
{
  "newOwnerId": "string"      // 必填，新群主的用户 ID
}
```

**权限要求：**

- 仅群主可以转让群主身份

**响应示例：**

```json
{
  "success": true,
  "data": {
    "oldOwnerId": "old-owner-uuid",
    "newOwnerId": "new-owner-uuid"
  },
  "message": "群主转让成功"
}
```

---

## 禁言成员

对群成员进行禁言或解禁。

```http
PUT /api/groups/:id/mute
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**请求体：**

```json
{
  "userId": "string",         // 必填，用户 ID
  "mute": true,               // 必填，true=禁言，false=解禁
  "duration": 3600            // 可选，禁言时长（秒），不填为永久
}
```

**权限要求：**

- 群主可以禁言任何人
- 管理员可以禁言普通成员

**响应示例：**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "isMuted": true,
    "muteUntil": 1705316400000
  },
  "message": "禁言设置成功"
}
```

---

## 获取群成员列表

获取群组的成员列表。

```http
GET /api/groups/:id/members
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 群组 ID |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 50，最大 100 |
| role | number | 否 | 筛选角色：0=普通成员，1=管理员，2=群主 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "user-uuid",
        "nickname": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "role": 0,
        "joinTime": "2024-01-01T00:00:00Z",
        "lastSpeakTime": "2024-01-15T10:30:00Z",
        "isMuted": false,
        "muteUntil": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100
    }
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| role | number | 角色：0=普通成员，1=管理员，2=群主 |
| joinTime | string | 加入时间 |
| lastSpeakTime | string | 最后发言时间 |
| isMuted | boolean | 是否被禁言 |
| muteUntil | string | 禁言结束时间 |

---

## 群组角色

| 角色 | 角色值 | 权限说明 |
|------|--------|----------|
| 群主 | 2 | 最高权限，可解散群、转让群主、设置管理员、管理所有成员 |
| 管理员 | 1 | 可修改群信息、添加/移除成员、禁言成员 |
| 普通成员 | 0 | 基本权限，可发言、退出群组 |

---

## 群组数据类型

```typescript
interface Group {
  id: string;                  // 群组唯一标识
  name: string;                // 群组名称
  avatar?: string;             // 群组头像
  description?: string;        // 群组描述
  ownerId: string;             // 群主 ID
  memberCount: number;         // 成员数量
  maxMembers: number;          // 最大成员数
  joinType: JoinType;          // 加入方式
  muteAll: boolean;            // 是否全员禁言
  notice?: string;             // 群公告
  createdAt: string;           // 创建时间
  updatedAt?: string;          // 更新时间
}

interface GroupMember {
  id: string;                  // 用户 ID
  nickname: string;            // 昵称
  avatar?: string;             // 头像
  role: GroupRole;             // 角色
  joinTime: string;            // 加入时间
  lastSpeakTime?: string;      // 最后发言时间
  isMuted: boolean;            // 是否被禁言
  muteUntil?: string;          // 禁言结束时间
}

type JoinType = 0 | 1 | 2;     // 0=仅邀请，1=可申请，2=自由加入
type GroupRole = 0 | 1 | 2;    // 0=普通成员，1=管理员，2=群主
```

---

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `GROUP_NOT_FOUND` | 404 | 群组不存在 |
| `NOT_GROUP_MEMBER` | 403 | 不是群组成员 |
| `NOT_GROUP_OWNER` | 403 | 不是群主 |
| `NOT_GROUP_ADMIN` | 403 | 不是管理员 |
| `GROUP_FULL` | 400 | 群组已满 |
| `ALREADY_MEMBER` | 400 | 已是群成员 |
| `OWNER_CANNOT_QUIT` | 400 | 群主不能直接退出 |
| `CANNOT_REMOVE_OWNER` | 400 | 不能移除群主 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |

---

## 使用示例

### cURL

```bash
# 创建群组
curl -X POST http://localhost:3000/api/groups \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name": "技术交流群", "memberIds": ["user1", "user2"]}'

# 获取群组列表
curl -X GET http://localhost:3000/api/groups \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 添加群成员
curl -X POST http://localhost:3000/api/groups/group-uuid/members \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["user3", "user4"]}'
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 创建群组
const group = await client.group.create({
  name: '技术交流群',
  memberIds: ['user1', 'user2']
});

// 获取群组列表
const groups = await client.group.getMyGroups();

// 获取群组信息
const groupInfo = await client.group.getById('group-uuid');

// 添加成员
await client.group.addMembers('group-uuid', ['user3', 'user4']);

// 退出群组
await client.group.quit('group-uuid');
```

---

## 相关链接

- [消息管理 API](./messages.md)
- [好友管理 API](./friends.md)
- [SDK 文档](../sdk/typescript.md)
