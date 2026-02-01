# 好友管理

## 获取好友列表

### GET /friends

获取好友列表。

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "friend-uuid",
      "userId": "user-uuid",
      "nickname": "好友昵称",
      "avatar": "https://example.com/avatar.jpg",
      "status": "online"
    }
  ]
}
```

## 发送好友申请

### POST /friends/requests

发送好友申请。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| toUserId | string | 是 | 目标用户 ID |
| message | string | 否 | 申请留言 |

## 处理好友申请

### PUT /friends/requests/:id

接受或拒绝好友申请。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| accept | boolean | 是 | 是否接受 |

## 删除好友

### DELETE /friends/:id

删除好友。
