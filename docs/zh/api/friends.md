# 好友管理 API

好友管理 API 提供好友关系的建立、管理和查询等功能。

## 概述

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发送好友申请 | POST | `/api/friends/request` | 发送好友申请 |
| 处理好友申请 | PUT | `/api/friends/request/:id` | 接受/拒绝好友申请 |
| 获取好友申请列表 | GET | `/api/friends/requests` | 获取好友申请列表 |
| 获取好友列表 | GET | `/api/friends` | 获取好友列表 |
| 删除好友 | DELETE | `/api/friends/:id` | 删除好友 |
| 设置好友备注 | PUT | `/api/friends/:id/remark` | 设置好友备注 |
| 设置好友分组 | PUT | `/api/friends/:id/group` | 设置好友分组 |
| 创建分组 | POST | `/api/friend-groups` | 创建好友分组 |
| 获取分组列表 | GET | `/api/friend-groups` | 获取好友分组列表 |
| 更新分组 | PUT | `/api/friend-groups/:id` | 更新分组信息 |
| 删除分组 | DELETE | `/api/friend-groups/:id` | 删除好友分组 |

---

## 发送好友申请

向其他用户发送好友申请。

```http
POST /api/friends/request
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "userId": "string",         // 必填，目标用户 ID
  "message": "string",        // 可选，申请消息，最多 100 字符
  "source": "string"          // 可选，来源：search/qr_code/group/recommend
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 目标用户 ID |
| message | string | 否 | 申请消息，最多 100 字符 |
| source | string | 否 | 来源：search=搜索，qr_code=二维码，group=群聊，recommend=推荐 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "request-uuid",
    "fromUserId": "sender-uuid",
    "toUserId": "receiver-uuid",
    "message": "你好，我想加你为好友",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "好友申请已发送"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `ALREADY_FRIENDS` | 已经是好友关系 |
| 400 | `REQUEST_EXISTS` | 已有待处理的好友申请 |
| 404 | `USER_NOT_FOUND` | 用户不存在 |
| 403 | `USER_BLOCKED` | 被对方拉黑 |

---

## 处理好友申请

接受或拒绝好友申请。

```http
PUT /api/friends/request/:id
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友申请 ID |

**请求体：**

```json
{
  "action": "accept",         // 必填，操作：accept=接受，reject=拒绝
  "remark": "string",         // 可选，好友备注（接受时）
  "groupId": "string"         // 可选，分组 ID（接受时）
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| action | string | 是 | 操作：accept=接受，reject=拒绝 |
| remark | string | 否 | 好友备注，最多 30 字符 |
| groupId | string | 否 | 分组 ID |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "friend": {
      "id": "user-uuid",
      "nickname": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "remark": "备注名"
    }
  },
  "message": "好友申请已接受"
}
```

---

## 获取好友申请列表

获取收到的好友申请列表。

```http
GET /api/friends/requests
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 类型：received=收到的，sent=发送的，默认 received |
| status | string | 否 | 状态：pending/accepted/rejected |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20，最大 100 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request-uuid",
        "fromUser": {
          "id": "user-uuid",
          "nickname": "John Doe",
          "avatar": "https://example.com/avatar.jpg"
        },
        "message": "你好，我想加你为好友",
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z"
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

---

## 获取好友列表

获取当前用户的好友列表。

```http
GET /api/friends
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| groupId | string | 否 | 分组 ID，不填则返回全部好友 |
| keyword | string | 否 | 搜索关键词（昵称/备注） |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 50，最大 200 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "user-uuid",
        "nickname": "John Doe",
        "avatar": "https://example.com/avatar.jpg",
        "remark": "备注名",
        "groupId": "group-uuid",
        "groupName": "同事",
        "signature": "个性签名",
        "status": "online",
        "lastSeenAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200
    }
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 好友用户 ID |
| nickname | string | 好友昵称 |
| avatar | string | 好友头像 |
| remark | string | 好友备注 |
| groupId | string | 分组 ID |
| groupName | string | 分组名称 |
| signature | string | 个性签名 |
| status | string | 在线状态 |
| lastSeenAt | string | 最后在线时间 |

---

## 删除好友

删除好友关系。

```http
DELETE /api/friends/:id
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友用户 ID |

**响应示例：**

```json
{
  "success": true,
  "message": "好友已删除"
}
```

**注意事项：**

- 删除好友后，双方都将从对方的好友列表中移除
- 删除好友后，聊天记录不会被删除

---

## 设置好友备注

设置好友的备注名称。

```http
PUT /api/friends/:id/remark
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友用户 ID |

**请求体：**

```json
{
  "remark": "string"          // 必填，备注名，最多 30 字符，空字符串表示清除备注
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "remark": "新备注名"
  },
  "message": "备注设置成功"
}
```

---

## 设置好友分组

将好友移动到指定分组。

```http
PUT /api/friends/:id/group
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 好友用户 ID |

**请求体：**

```json
{
  "groupId": "string"         // 必填，分组 ID，空字符串表示移到默认分组
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "groupId": "group-uuid",
    "groupName": "同事"
  },
  "message": "分组设置成功"
}
```

---

## 创建分组

创建新的好友分组。

```http
POST /api/friend-groups
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "name": "string",           // 必填，分组名称，1-20 字符
  "sort": 0                   // 可选，排序值，默认 0
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 分组名称，1-20 字符 |
| sort | number | 否 | 排序值，数字越小越靠前 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "group-uuid",
    "name": "同事",
    "sort": 0,
    "memberCount": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "分组创建成功"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `GROUP_NAME_EXISTS` | 分组名称已存在 |
| 400 | `MAX_GROUPS_REACHED` | 分组数量已达上限 |

---

## 获取分组列表

获取所有好友分组列表。

```http
GET /api/friend-groups
Authorization: Bearer <access-token>
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "default",
        "name": "我的好友",
        "sort": 0,
        "memberCount": 100,
        "isDefault": true
      },
      {
        "id": "group-uuid",
        "name": "同事",
        "sort": 1,
        "memberCount": 20,
        "isDefault": false
      }
    ]
  }
}
```

---

## 更新分组

更新好友分组信息。

```http
PUT /api/friend-groups/:id
Authorization: Bearer <access-token>
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 分组 ID |

**请求体：**

```json
{
  "name": "string",           // 可选，分组名称
  "sort": 0                   // 可选，排序值
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "group-uuid",
    "name": "新分组名",
    "sort": 1
  },
  "message": "分组更新成功"
}
```

---

## 删除分组

删除好友分组。

```http
DELETE /api/friend-groups/:id
Authorization: Bearer <access-token>
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 分组 ID |

**注意事项：**

- 不能删除默认分组
- 删除分组后，分组内的好友会移动到默认分组

**响应示例：**

```json
{
  "success": true,
  "message": "分组已删除"
}
```

**错误响应：**

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `CANNOT_DELETE_DEFAULT` | 不能删除默认分组 |

---

## 好友申请状态

| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| accepted | 已接受 |
| rejected | 已拒绝 |
| expired | 已过期 |

---

## 数据类型

### Friend 对象

```typescript
interface Friend {
  id: string;                  // 用户 ID
  nickname: string;            // 昵称
  avatar?: string;             // 头像
  remark?: string;             // 备注
  groupId?: string;            // 分组 ID
  groupName?: string;          // 分组名称
  signature?: string;          // 个性签名
  status: UserStatus;          // 在线状态
  lastSeenAt?: string;         // 最后在线时间
  addedAt: string;             // 添加时间
}

interface FriendRequest {
  id: string;                  // 申请 ID
  fromUser: UserPublic;        // 发送者信息
  toUser: UserPublic;          // 接收者信息
  message?: string;            // 申请消息
  status: RequestStatus;       // 状态
  source?: string;             // 来源
  createdAt: string;           // 创建时间
  handledAt?: string;          // 处理时间
}

interface FriendGroup {
  id: string;                  // 分组 ID
  name: string;                // 分组名称
  sort: number;                // 排序值
  memberCount: number;         // 成员数量
  isDefault: boolean;          // 是否默认分组
  createdAt: string;           // 创建时间
}

type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
```

---

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `ALREADY_FRIENDS` | 400 | 已经是好友 |
| `REQUEST_EXISTS` | 400 | 申请已存在 |
| `USER_BLOCKED` | 403 | 被对方拉黑 |
| `NOT_FRIEND` | 400 | 不是好友关系 |
| `GROUP_NOT_FOUND` | 404 | 分组不存在 |
| `GROUP_NAME_EXISTS` | 400 | 分组名称已存在 |
| `MAX_GROUPS_REACHED` | 400 | 分组数量达上限 |
| `CANNOT_DELETE_DEFAULT` | 400 | 不能删除默认分组 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |

---

## 使用示例

### cURL

```bash
# 发送好友申请
curl -X POST http://localhost:3000/api/friends/request \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid", "message": "你好，我想加你为好友"}'

# 接受好友申请
curl -X PUT http://localhost:3000/api/friends/request/request-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'

# 获取好友列表
curl -X GET http://localhost:3000/api/friends \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### TypeScript SDK

```typescript
import { OpenChatClient } from '@openchat/sdk';

const client = new OpenChatClient({
  serverUrl: 'http://localhost:3000'
});

// 发送好友申请
await client.friend.sendRequest({
  userId: 'user-uuid',
  message: '你好，我想加你为好友'
});

// 获取好友申请列表
const requests = await client.friend.getRequests({ status: 'pending' });

// 接受好友申请
await client.friend.handleRequest('request-uuid', {
  action: 'accept',
  remark: '备注名'
});

// 获取好友列表
const friends = await client.friend.getList();

// 设置好友备注
await client.friend.setRemark('friend-uuid', '新备注');

// 创建分组
await client.friend.createGroup({ name: '同事' });
```

---

## 相关链接

- [用户管理 API](./users.md)
- [群组管理 API](./groups.md)
- [SDK 文档](../sdk/typescript.md)
