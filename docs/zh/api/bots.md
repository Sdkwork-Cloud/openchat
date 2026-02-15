# 机器人平台 API

机器人平台 API 提供机器人的创建、管理、Webhook设置等功能，支持第三方平台集成。

## 概述

所有机器人平台 API 都需要 JWT 认证，路径前缀为 `/api/v1/bots`。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建Bot | POST | `/bots` | 创建新机器人 |
| 获取Bot列表 | GET | `/bots` | 获取机器人列表 |
| 获取Bot详情 | GET | `/bots/:id` | 获取机器人详情 |
| 更新Bot | PUT | `/bots/:id` | 更新机器人信息 |
| 重新生成Token | POST | `/bots/:id/regenerate-token` | 重新生成Bot Token |
| 删除Bot | DELETE | `/bots/:id` | 删除机器人 |
| 设置Webhook | POST | `/bots/:id/webhook` | 设置Webhook |
| 删除Webhook | DELETE | `/bots/:id/webhook` | 删除Webhook |

---

## 创建Bot

创建一个新的机器人。

```http
POST /api/v1/bots
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 请求体

```json
{
  "name": "OpenChat Bot",
  "username": "openchat_bot",
  "description": "一个功能强大的OpenChat机器人",
  "avatar": "https://example.com/bot-avatar.jpg",
  "homepage": "https://openchat.com",
  "developerName": "OpenChat团队",
  "developerEmail": "developer@openchat.com",
  "intents": [1, 2, 3],
  "scopes": ["messages:read", "messages:write", "groups:read"]
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 机器人名称 |
| username | string | 是 | 机器人用户名（唯一） |
| description | string | 否 | 机器人描述 |
| avatar | string | 否 | 机器人头像URL |
| homepage | string | 否 | 机器人主页 |
| developerName | string | 否 | 开发者名称 |
| developerEmail | string | 否 | 开发者邮箱 |
| intents | number[] | 否 | 订阅的意图列表 |
| scopes | string[] | 否 | 权限范围列表 |

### 响应示例

```json
{
  "bot": {
    "id": "bot-uuid",
    "name": "OpenChat Bot",
    "username": "openchat_bot",
    "description": "一个功能强大的OpenChat机器人",
    "avatar": "https://example.com/bot-avatar.jpg",
    "homepage": "https://openchat.com",
    "developerName": "OpenChat团队",
    "developerEmail": "developer@openchat.com",
    "intents": [1, 2, 3],
    "scopes": ["messages:read", "messages:write"],
    "status": "active",
    "createdBy": "user-001",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "token": "bot_token_abcdefghijklmnopqrstuvwxyz"
}
```

### 错误响应

- 409: 用户名已存在

---

## 获取Bot列表

获取用户创建的所有机器人列表。

```http
GET /api/v1/bots?page=1&amp;limit=20&amp;status=active
Authorization: Bearer &lt;access-token&gt;
```

### 查询参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |
| status | string | 否 | - | 状态筛选：active, inactive, suspended |

### 响应示例

```json
{
  "bots": [
    {
      "id": "bot-001",
      "name": "OpenChat Bot",
      "username": "openchat_bot",
      "description": "一个功能强大的OpenChat机器人",
      "avatar": "https://example.com/bot-avatar.jpg",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "bot-002",
      "name": "通知机器人",
      "username": "notification_bot",
      "status": "inactive",
      "createdAt": "2024-01-14T15:00:00Z"
    }
  ],
  "total": 2
}
```

---

## 获取Bot详情

根据ID获取机器人详情。

```http
GET /api/v1/bots/:id
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

```json
{
  "id": "bot-uuid",
  "name": "OpenChat Bot",
  "username": "openchat_bot",
  "description": "一个功能强大的OpenChat机器人",
  "avatar": "https://example.com/bot-avatar.jpg",
  "homepage": "https://openchat.com",
  "developerName": "OpenChat团队",
  "developerEmail": "developer@openchat.com",
  "intents": [1, 2, 3],
  "scopes": ["messages:read", "messages:write"],
  "status": "active",
  "webhook": {
    "url": "https://example.com/webhook",
    "events": ["message.created", "member.joined"],
    "filters": {},
    "retryPolicy": {
      "maxRetries": 3,
      "backoffType": "exponential",
      "initialDelay": 1000,
      "maxDelay": 30000
    },
    "timeout": 30000,
    "enabled": true
  },
  "createdBy": "user-001",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 错误响应

- 404: 机器人不存在

---

## 更新Bot

更新机器人信息。

```http
PUT /api/v1/bots/:id
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 请求体

```json
{
  "name": "OpenChat Bot Pro",
  "description": "一个更强大的OpenChat机器人",
  "avatar": "https://example.com/new-avatar.jpg",
  "intents": [1, 2, 3, 4],
  "scopes": ["messages:read", "messages:write", "groups:read", "groups:write"],
  "status": "active"
}
```

### 响应示例

```json
{
  "id": "bot-uuid",
  "name": "OpenChat Bot Pro",
  "description": "一个更强大的OpenChat机器人",
  "intents": [1, 2, 3, 4],
  "status": "active",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### 错误响应

- 404: 机器人不存在
- 403: 无权限

---

## 重新生成Token

重新生成机器人的访问Token。

```http
POST /api/v1/bots/:id/regenerate-token
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

```json
{
  "token": "bot_token_newtoken1234567890abcdef"
}
```

### 错误响应

- 404: 机器人不存在
- 403: 无权限

---

## 删除Bot

删除指定的机器人。

```http
DELETE /api/v1/bots/:id
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

无内容（HTTP 204）

### 错误响应

- 404: 机器人不存在
- 403: 无权限

---

## 设置Webhook

为机器人设置Webhook，用于接收事件通知。

```http
POST /api/v1/bots/:id/webhook
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 请求体

```json
{
  "url": "https://example.com/webhook",
  "events": [
    "message.created",
    "message.updated",
    "message.deleted",
    "member.joined",
    "member.left"
  ],
  "filters": {
    "conversations": ["conv-001", "conv-002"],
    "users": ["user-001", "user-002"],
    "groups": ["group-001"]
  },
  "retryPolicy": {
    "maxRetries": 3,
    "backoffType": "exponential",
    "initialDelay": 1000,
    "maxDelay": 30000
  },
  "timeout": 30000
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | Webhook URL |
| events | string[] | 是 | 事件类型列表 |
| filters | object | 否 | 事件过滤器 |
| retryPolicy | object | 否 | 重试策略 |
| timeout | number | 否 | 请求超时时间（毫秒），默认30000 |

**事件类型：**
- `message.created` - 消息创建
- `message.updated` - 消息更新
- `message.deleted` - 消息删除
- `member.joined` - 成员加入
- `member.left` - 成员离开
- `group.created` - 群组创建
- `friend.request` - 好友请求
- `friend.accepted` - 好友接受

**重试策略：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| maxRetries | number | 否 | 3 | 最大重试次数 |
| backoffType | string | 否 | exponential | 退避类型：fixed, exponential |
| initialDelay | number | 否 | 1000 | 初始延迟（毫秒） |
| maxDelay | number | 否 | 30000 | 最大延迟（毫秒） |

### 响应示例

```json
{
  "id": "bot-uuid",
  "name": "OpenChat Bot",
  "webhook": {
    "url": "https://example.com/webhook",
    "events": ["message.created", "member.joined"],
    "filters": {},
    "retryPolicy": {
      "maxRetries": 3,
      "backoffType": "exponential",
      "initialDelay": 1000,
      "maxDelay": 30000
    },
    "timeout": 30000,
    "enabled": true,
    "secret": "webhook_secret_abcdef123456"
  },
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### 错误响应

- 404: 机器人不存在
- 403: 无权限

---

## 删除Webhook

删除机器人的Webhook配置。

```http
DELETE /api/v1/bots/:id/webhook
Authorization: Bearer &lt;access-token&gt;
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 机器人ID |

### 响应示例

无内容（HTTP 204）

### 错误响应

- 404: 机器人不存在
- 403: 无权限

---

## Webhook事件格式

### 消息创建事件

```json
{
  "id": "evt-uuid",
  "type": "message.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "messageId": "msg-uuid",
    "type": "text",
    "content": {
      "text": {
        "text": "Hello, bot!"
      }
    },
    "fromUserId": "user-001",
    "fromUserName": "张三",
    "toUserId": "bot-uuid",
    "conversationId": "conv-uuid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 成员加入事件

```json
{
  "id": "evt-uuid",
  "type": "member.joined",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "groupId": "group-uuid",
    "groupName": "技术交流群",
    "memberId": "user-001",
    "memberName": "张三",
    "operatorId": "user-002",
    "operatorName": "李四",
    "joinedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Bot状态

| 状态 | 说明 |
|------|------|
| active | 活跃 |
| inactive | 停用 |
| suspended | 暂停 |

---

## Bot权限范围

| 权限 | 说明 |
|------|------|
| `messages:read` | 读取消息 |
| `messages:write` | 发送消息 |
| `messages:delete` | 删除消息 |
| `groups:read` | 读取群组信息 |
| `groups:write` | 创建/修改群组 |
| `groups:members` | 管理群组成员 |
| `friends:read` | 读取好友信息 |
| `friends:write` | 管理好友 |

---

## 数据类型

```typescript
interface Bot {
  id: string;
  name: string;
  username: string;
  description?: string;
  avatar?: string;
  homepage?: string;
  developerName?: string;
  developerEmail?: string;
  intents?: number[];
  scopes?: string[];
  status: 'active' | 'inactive' | 'suspended';
  webhook?: WebhookConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WebhookConfig {
  url: string;
  events: string[];
  filters?: {
    conversations?: string[];
    users?: string[];
    groups?: string[];
  };
  retryPolicy: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  timeout: number;
  enabled: boolean;
  secret: string;
}

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}
```

---

## 相关链接

- [第三方集成 API](./third-party.md)
- [消息管理 API](./messages.md)
- [群组管理 API](./groups.md)
