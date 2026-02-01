# 消息管理

## 发送消息

### POST /messages

发送消息。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| to | string | 是 | 接收者 ID |
| type | string | 是 | 消息类型：text/image/audio/video/file |
| content | any | 是 | 消息内容 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "from": "user1",
    "to": "user2",
    "type": "text",
    "content": "Hello",
    "timestamp": 1705312800000
  }
}
```

## 获取消息列表

### GET /messages

获取消息列表。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID |
| limit | number | 否 | 数量限制，默认 20 |
| before | string | 否 | 消息 ID，获取此消息之前的历史 |

## 标记已读

### PUT /messages/read

标记消息已读。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID |
