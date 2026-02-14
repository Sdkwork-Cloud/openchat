# WukongIM 集成 API

OpenChat 与 WukongIM 深度集成，提供可靠的实时消息服务。本文档介绍 WukongIM 相关的 API 接口。

## 概述

WukongIM 是一个高性能的即时通讯消息引擎，OpenChat 通过 WukongIM 实现：

- 消息的实时推送和接收
- 用户在线状态管理
- 消息的离线存储和同步
- 群组消息的路由

## 连接配置

### 获取 IM 配置

获取 WukongIM 连接所需配置信息。

```http
GET /api/im/config
Authorization: Bearer <access-token>
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "tcpAddr": "your-server:5100",
    "wsUrl": "ws://your-server:5200",
    "apiUrl": "http://your-server:5001",
    "managerUrl": "http://your-server:5300"
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| tcpAddr | string | TCP 连接地址，用于移动端长连接 |
| wsUrl | string | WebSocket 连接地址，用于 Web 端 |
| apiUrl | string | HTTP API 地址 |
| managerUrl | string | 管理后台地址 |

---

## 消息发送

### 发送消息

通过 WukongIM 发送消息。

```http
POST /api/im/message/send
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",      // 必填，接收者 ID（用户ID或群组ID）
  "channelType": 1,           // 必填，频道类型：1=单聊，2=群聊
  "fromUid": "string",        // 必填，发送者用户 ID
  "payload": "string",        // 必填，消息内容（Base64 编码）
  "header": {                 // 可选，消息头
    "noPersist": 0,           // 是否不存储：0=存储，1=不存储
    "redPacket": 0,           // 是否红包消息
    "syncOnce": 0             // 是否只同步一次
  }
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 接收者 ID。单聊为用户 ID，群聊为群组 ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| fromUid | string | 是 | 发送者用户 ID |
| payload | string | 是 | 消息内容，Base64 编码的 JSON 字符串 |
| header | object | 否 | 消息头配置 |
| header.noPersist | number | 否 | 是否不存储：0=存储，1=不存储 |
| header.redPacket | number | 否 | 是否红包消息：0=否，1=是 |
| header.syncOnce | number | 否 | 是否只同步一次：0=否，1=是 |

**Payload 格式：**

Payload 是 Base64 编码的 JSON 字符串，解码后的格式：

```json
{
  "type": 1,                  // 消息类型：1=文本，2=图片，3=语音，4=视频，5=文件
  "content": "消息内容",       // 文本内容或媒体 URL
  "extra": {                  // 扩展信息
    "width": 1920,            // 图片/视频宽度
    "height": 1080,           // 图片/视频高度
    "duration": 60,           // 语音/视频时长（秒）
    "size": 1024000,          // 文件大小（字节）
    "fileName": "file.pdf"    // 文件名
  }
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "messageId": "msg_xxxxx",
    "messageSeq": 12345,
    "timestamp": 1705312800000
  }
}
```

---

### 同步消息

同步历史消息。

```http
GET /api/im/message/sync
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道 ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| startMessageSeq | number | 否 | 起始消息序列号 |
| endMessageSeq | number | 否 | 结束消息序列号 |
| limit | number | 否 | 消息数量限制，默认 20，最大 100 |
| pullMode | number | 否 | 拉取模式：0=向下拉取，1=向上拉取 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "messageId": "msg_xxxxx",
        "messageSeq": 12345,
        "channelId": "user2",
        "channelType": 1,
        "fromUid": "user1",
        "payload": "Base64EncodedPayload",
        "timestamp": 1705312800000,
        "status": 1
      }
    ],
    "more": true
  }
}
```

---

## 频道管理

### 创建频道

创建新的消息频道。

```http
POST /api/im/channel/create
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",      // 必填，频道 ID
  "channelType": 2,           // 必填，频道类型：1=单聊，2=群聊
  "groupName": "string",      // 群聊时必填，群组名称
  "groupAvatar": "string"     // 可选，群组头像 URL
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道 ID，建议使用 UUID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| groupName | string | 群聊必填 | 群组名称，1-50 字符 |
| groupAvatar | string | 否 | 群组头像 URL |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "channelId": "group_xxxxx",
    "channelType": 2,
    "createdAt": 1705312800000
  }
}
```

---

### 删除频道

删除消息频道。

```http
POST /api/im/channel/delete
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",      // 必填，频道 ID
  "channelType": 2            // 必填，频道类型
}
```

**响应示例：**

```json
{
  "success": true,
  "message": "频道删除成功"
}
```

---

### 添加订阅者

向频道添加订阅者（成员）。

```http
POST /api/im/channel/subscriber/add
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",      // 必填，频道 ID
  "channelType": 2,           // 必填，频道类型
  "subscribers": [            // 必填，订阅者列表
    {
      "uid": "string",        // 用户 ID
      "role": 0               // 角色：0=普通成员，1=管理员，2=群主
    }
  ]
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channelId | string | 是 | 频道 ID |
| channelType | number | 是 | 频道类型：1=单聊，2=群聊 |
| subscribers | array | 是 | 订阅者列表 |
| subscribers[].uid | string | 是 | 用户 ID |
| subscribers[].role | number | 否 | 角色：0=普通成员，1=管理员，2=群主 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "added": 5,
    "failed": 0
  }
}
```

---

### 移除订阅者

从频道移除订阅者。

```http
POST /api/im/channel/subscriber/remove
Authorization: Bearer <access-token>
Content-Type: application/json
```

**请求体：**

```json
{
  "channelId": "string",      // 必填，频道 ID
  "channelType": 2,           // 必填，频道类型
  "uids": ["user1", "user2"]  // 必填，要移除的用户 ID 列表
}
```

---

## 在线状态

### 获取在线状态

获取用户在线状态。

```http
GET /api/im/online
Authorization: Bearer <access-token>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| uids | string | 是 | 用户 ID 列表，逗号分隔 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "uid": "user1",
      "online": true,
      "deviceFlag": 1,
      "lastOffline": 1705312800000
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| uid | string | 用户 ID |
| online | boolean | 是否在线 |
| deviceFlag | number | 设备标识：1=Web，2=iOS，4=Android，8=PC |
| lastOffline | number | 最后离线时间戳 |

---

## 消息类型

### 支持的消息类型

| 类型值 | 类型名 | 说明 |
|--------|--------|------|
| 1 | 文本消息 | 纯文本内容 |
| 2 | 图片消息 | 图片 URL + 宽高信息 |
| 3 | 语音消息 | 语音文件 URL + 时长 |
| 4 | 视频消息 | 视频文件 URL + 时长 + 缩略图 |
| 5 | 文件消息 | 文件 URL + 文件名 + 大小 |
| 6 | 位置消息 | 经纬度 + 地址描述 |
| 7 | 名片消息 | 用户名片信息 |
| 8 | 撤回消息 | 撤回通知 |
| 9 | 系统消息 | 系统通知 |
| 10 | 自定义消息 | 自定义 JSON 数据 |

### 消息内容格式示例

#### 文本消息

```json
{
  "type": 1,
  "content": "这是一条文本消息"
}
```

#### 图片消息

```json
{
  "type": 2,
  "content": "https://example.com/image.jpg",
  "extra": {
    "width": 1920,
    "height": 1080,
    "size": 512000
  }
}
```

#### 语音消息

```json
{
  "type": 3,
  "content": "https://example.com/voice.mp3",
  "extra": {
    "duration": 30,
    "size": 102400
  }
}
```

#### 视频消息

```json
{
  "type": 4,
  "content": "https://example.com/video.mp4",
  "extra": {
    "width": 1920,
    "height": 1080,
    "duration": 120,
    "size": 10240000,
    "thumbnail": "https://example.com/thumb.jpg"
  }
}
```

#### 文件消息

```json
{
  "type": 5,
  "content": "https://example.com/file.pdf",
  "extra": {
    "fileName": "document.pdf",
    "size": 1024000
  }
}
```

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 1001 | 用户不存在 |
| 1002 | 频道不存在 |
| 1003 | 无权限操作 |
| 1004 | 消息发送失败 |
| 1005 | 消息内容无效 |
| 1006 | 频道类型错误 |
| 1007 | 订阅者已存在 |
| 1008 | 订阅者不存在 |

---

## 最佳实践

### 1. 消息发送流程

```
1. 客户端构建消息内容 JSON
2. 将 JSON 转为字符串并 Base64 编码
3. 调用发送接口
4. 处理响应，获取消息 ID 和序列号
5. 本地更新消息状态
```

### 2. 消息同步策略

```typescript
// 首次进入会话
const messages = await syncMessages({
  channelId: 'user2',
  channelType: 1,
  limit: 20
});

// 上拉加载更多
const moreMessages = await syncMessages({
  channelId: 'user2',
  channelType: 1,
  startMessageSeq: messages[0].messageSeq,
  pullMode: 1,
  limit: 20
});
```

### 3. 连接管理

```typescript
// WebSocket 连接示例
const ws = new WebSocket('ws://your-server:5200');

ws.onopen = () => {
  // 发送认证包
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token',
    uid: 'user1'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // 处理接收到的消息
};
```

---

## 相关链接

- [WukongIM 官方文档](https://githubim.com/)
- [SDK 文档](../sdk/typescript.md)
- [消息管理 API](./messages.md)
