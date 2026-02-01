# 用户管理

## 获取当前用户

### GET /users/me

获取当前登录用户信息。

**请求头：**

```
Authorization: Bearer <token>
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "user1",
    "nickname": "用户1",
    "avatar": "https://example.com/avatar.jpg",
    "status": "online"
  }
}
```

## 更新用户信息

### PUT /users/me

更新当前用户信息。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称 |
| avatar | string | 否 | 头像 URL |

## 搜索用户

### GET /users/search

搜索用户。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "用户1"
    }
  ]
}
```
