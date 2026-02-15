
# 第三方集成 API

本页面提供 OpenChat 与第三方即时通讯平台集成相关的 API 文档。

## 支持的平台

| 平台 | 参数值 | 说明 |
|------|--------|------|
| WhatsApp | `whatsapp` | WhatsApp 消息平台 |
| Telegram | `telegram` | Telegram 消息平台 |
| 微信 | `wechat` | 微信消息平台 |
| Signal | `signal` | Signal 消息平台 |

## 接口列表

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/third-party/:platform/messages` | 发送第三方平台消息 | 否 |
| GET | `/third-party/:platform/messages/:id/status` | 获取消息状态 | 否 |
| POST | `/third-party/:platform/contacts/sync` | 同步联系人 | 否 |
| GET | `/third-party/:platform/contacts` | 获取联系人 | 否 |

## 数据结构

### ThirdPartyMessage

第三方平台消息结构。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息 ID |
| platform | string | 平台类型 |
| to | string | 接收者 |
| from | string | 发送者 |
| content | string | 消息内容 |
| type | string | 消息类型 |
| status | string | 消息状态 |
| metadata | object | 元数据 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

## 接口详情

### 发送第三方平台消息

向指定第三方平台发送消息。

**请求：**

```http
POST /third-party/whatsapp/messages
Content-Type: application/json

{
  "to": "+8613800138000",
  "from": "+8613900139000",
  "content": "Hello from OpenChat!",
  "type": "text",
  "metadata": {
    "conversationId": "conv-001"
  }
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | 是 | 平台类型：`whatsapp`、`telegram`、`wechat`、`signal` |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| to | string | 是 | 接收者 |
| from | string | 是 | 发送者 |
| content | string | 是 | 消息内容 |
| type | string | 否 | 消息类型，默认 `text` |
| metadata | object | 否 | 自定义元数据 |

**响应示例：**

```json
{
  "id": "msg-001",
  "platform": "whatsapp",
  "to": "+8613800138000",
  "from": "+8613900139000",
  "content": "Hello from OpenChat!",
  "type": "text",
  "status": "sent",
  "metadata": {
    "conversationId": "conv-001"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 获取消息状态

获取第三方平台消息的发送状态。

**请求：**

```http
GET /third-party/whatsapp/messages/msg-001/status
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | 是 | 平台类型 |
| id | string | 是 | 消息 ID |

**响应示例：**

```json
"delivered"
```

**状态说明：**

| 状态 | 说明 |
|------|------|
| `pending` | 待发送 |
| `sent` | 已发送 |
| `delivered` | 已送达 |
| `read` | 已读 |
| `failed` | 发送失败 |

---

### 同步联系人

同步第三方平台的联系人到 OpenChat。

**请求：**

```http
POST /third-party/whatsapp/contacts/sync
Content-Type: application/json

{
  "userId": "user-uuid"
}
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | 是 | 平台类型 |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |

**响应示例：**

```json
[
  {
    "id": "contact-001",
    "platform": "whatsapp",
    "platformUserId": "+8613800138000",
    "name": "张三",
    "avatar": "https://example.com/avatar.jpg",
    "userId": "user-uuid",
    "syncedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "contact-002",
    "platform": "whatsapp",
    "platformUserId": "+8613900139000",
    "name": "李四",
    "avatar": "https://example.com/avatar2.jpg",
    "userId": "user-uuid",
    "syncedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 获取联系人

从第三方平台获取联系人信息。

**请求：**

```http
GET /third-party/whatsapp/contacts?userId=user-uuid&amp;platformUserId=%2B8613800138000
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | 是 | 平台类型 |

**请求参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户 ID |
| platformUserId | string | 是 | 平台用户 ID |

**响应示例：**

```json
{
  "id": "contact-001",
  "platform": "whatsapp",
  "platformUserId": "+8613800138000",
  "name": "张三",
  "avatar": "https://example.com/avatar.jpg",
  "userId": "user-uuid",
  "syncedAt": "2024-01-01T00:00:00.000Z"
}
```

如果联系人不存在，返回 `null`。

