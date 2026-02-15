# WukongIM 集成 API

OpenChat 与 WukongIM 深度集成，提供可靠的实时消息服务。本文档介绍 WukongIM 相关的 API 接口。

## 概述

WukongIM API 的路径前缀为 `/api/v1/im`，大部分接口需要 JWT 认证。

| 接口 | 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|------|-------------|
| 获取悟空IM连接配置 | GET | `/im/config` | 获取悟空IM连接所需配置信息 | 是 |
| 获取悟空IM用户Token | POST | `/im/token` | 获取悟空IM用户Token | 是 |
| 发送消息 | POST | `/im/message/send` | 通过WukongIM发送消息 | 是 |
| 批量发送消息 | POST | `/im/message/sendbatch` | 批量发送消息 | 是 |
| 同步消息 | GET | `/im/message/sync` | 同步历史消息 | 是 |
| 创建频道 | POST | `/im/channel/create` | 创建新的消息频道 | 是 |
| 删除频道 | POST | `/im/channel/delete` | 删除消息频道 | 是 |
| 添加订阅者 | POST | `/im/channel/subscriber/add` | 向频道添加订阅者 | 是 |
| 移除订阅者 | POST | `/im/channel/subscriber/remove` | 从频道移除订阅者 | 是 |
| 健康检查 | GET | `/im/health` | 悟空IM健康检查 | 否 |
| 获取系统信息 | GET | `/im/system/info` | 获取悟空IM系统信息 | 是 |

---

## 获取悟空IM连接配置

获取悟空IM连接所需配置信息。

```http
GET /api/v1/im/config
Authorization: Bearer &lt;access-token&gt;
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "wsUrl": "ws://your-server:5200",
    "tcpAddr": "your-server:5100",
    "apiUrl": "http://your-server:5001",
    "managerUrl": "http://your-server:5300"
  }
}
```

---

## 获取悟空IM用户Token

获取悟空IM用户Token。

```http
POST /api/v1/im/token
Authorization: Bearer &lt;access-token&gt;
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "token": "wukongim-token"
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "获取Token失败"
}
```

---

## 发送消息

通过WukongIM发送消息。

```http
POST /api/v1/im/message/send
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",
  "channelType": 1,
  "payload": "string",
  "clientMsgNo": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| payload | string | 是 | 消息内容（Base64编码） |
| clientMsgNo | string | 否 | 客户端消息编号 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "messageId": "msg-xxx",
    "messageSeq": 12345
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "发送消息失败"
}
```

---

## 批量发送消息

批量发送消息。

```http
POST /api/v1/im/message/sendbatch
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
[
  {
    "channelId": "string",
    "channelType": 1,
    "payload": "string",
    "clientMsgNo": "string"
  }
]
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "messageId": "msg-xxx",
      "messageSeq": 12345
    }
  ]
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "批量发送消息失败"
}
```

---

## 同步消息

同步历史消息。

```http
GET /api/v1/im/message/sync
Authorization: Bearer &lt;access-token&gt;
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| lastMessageSeq | number | 否 | 最后一条消息序列号 |
| limit | number | 否 | 消息数量限制，默认50 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "messageId": "msg-xxx",
      "messageSeq": 12345,
      "channelId": "user1",
      "channelType": 1,
      "fromUid": "user2",
      "payload": "base64-encoded-payload",
      "timestamp": 1705312800000
    }
  ]
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "channelId and channelType are required"
}
```

---

## 创建频道

创建新的消息频道。

```http
POST /api/v1/im/channel/create
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",
  "channelType": 2,
  "name": "string",
  "avatar": "string"
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| name | string | 否 | 频道名称 |
| avatar | string | 否 | 频道头像URL |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "channelId": "channel-xxx",
    "channelType": 2,
    "name": "群组名称",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "创建频道失败"
}
```

---

## 删除频道

删除消息频道。

```http
POST /api/v1/im/channel/delete
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",
  "channelType": 2
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "channelId": "channel-xxx"
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "删除频道失败"
}
```

---

## 添加订阅者

向频道添加订阅者。

```http
POST /api/v1/im/channel/subscriber/add
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",
  "channelType": 2,
  "subscribers": ["string"]
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| subscribers | array | 是 | 订阅者ID列表 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "added": 5
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "添加订阅者失败"
}
```

---

## 移除订阅者

从频道移除订阅者。

```http
POST /api/v1/im/channel/subscriber/remove
Authorization: Bearer &lt;access-token&gt;
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",
  "channelType": 2,
  "subscribers": ["string"]
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| subscribers | array | 是 | 订阅者ID列表 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "removed": 5
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "移除订阅者失败"
}
```

---

## 健康检查

悟空IM健康检查。

```http
GET /api/v1/im/health
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## 获取系统信息

获取悟空IM系统信息。

```http
GET /api/v1/im/system/info
Authorization: Bearer &lt;access-token&gt;
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "uptime": 86400,
    "connections": 1000
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "获取系统信息失败"
}
```

---

## 数据类型

```typescript
interface WukongIMChannelType {
  PRIVATE: 1;
  GROUP: 2;
}

interface SendMessageOptions {
  channelId: string;
  channelType: WukongIMChannelType;
  fromUid: string;
  payload: string;
  clientMsgNo?: string;
}

interface CreateChannelOptions {
  channelId: string;
  channelType: WukongIMChannelType;
  name?: string;
  avatar?: string;
}
```

---

## 相关链接

- [WukongIM 官方文档](https://githubim.com/)
- [SDK 文档](../sdk/typescript.md)
- [消息管理 API](./messages.md)
