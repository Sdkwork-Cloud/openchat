# 群组管理

## 创建群组

### POST /groups

创建新群组。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 群组名称 |
| description | string | 否 | 群组描述 |
| members | array | 否 | 初始成员 ID 列表 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "group-uuid",
    "name": "开发团队",
    "ownerId": "user-uuid",
    "memberCount": 1
  }
}
```

## 获取群组列表

### GET /groups

获取当前用户的群组列表。

## 获取群组详情

### GET /groups/:id

获取群组详细信息。

## 加入群组

### POST /groups/:id/join

加入群组。

## 邀请成员

### POST /groups/:id/invite

邀请成员加入群组。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userIds | array | 是 | 用户 ID 列表 |
