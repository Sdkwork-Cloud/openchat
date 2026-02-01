# 认证授权

## 用户注册

### POST /auth/register

注册新用户。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| nickname | string | 否 | 昵称 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "user1",
    "nickname": "用户1"
  }
}
```

## 用户登录

### POST /auth/login

用户登录获取 Token。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-uuid",
      "username": "user1",
      "nickname": "用户1"
    }
  }
}
```

## 刷新 Token

### POST /auth/refresh

刷新访问令牌。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```
