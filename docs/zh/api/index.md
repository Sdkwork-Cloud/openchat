# API 概览

OpenChat Server 提供完整的 RESTful API，支持用户管理、消息管理、群组管理、好友管理等即时通讯核心功能。

## 基础信息

### 服务器地址

```
http://localhost:3000
```

### 请求格式

所有请求使用 JSON 格式：

```http
Content-Type: application/json
```

### 响应格式

统一响应格式：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，Token 无效或过期 |
| 403 | 禁止访问，权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 认证授权

API 使用 JWT Token 进行认证。在请求头中添加：

```http
Authorization: Bearer <your-jwt-token>
```

获取 Token：

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "password": "your-password"
  }'
```

## API 分类

### 认证相关

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 用户注册 | POST | `/auth/register` | 注册新用户 |
| 用户登录 | POST | `/auth/login` | 用户登录 |
| 刷新 Token | POST | `/auth/refresh` | 刷新访问令牌 |
| 登出 | POST | `/auth/logout` | 用户登出 |

### 用户管理

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取用户信息 | GET | `/users/me` | 获取当前用户信息 |
| 更新用户信息 | PUT | `/users/me` | 更新当前用户信息 |
| 上传头像 | POST | `/users/avatar` | 上传用户头像 |
| 搜索用户 | GET | `/users/search` | 搜索用户 |
| 获取用户列表 | GET | `/users` | 获取用户列表 |

### 好友管理

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取好友列表 | GET | `/friends` | 获取好友列表 |
| 添加好友 | POST | `/friends/requests` | 发送好友申请 |
| 处理好友申请 | PUT | `/friends/requests/:id` | 接受/拒绝好友申请 |
| 删除好友 | DELETE | `/friends/:id` | 删除好友 |
| 获取好友申请列表 | GET | `/friends/requests` | 获取好友申请列表 |

### 群组管理

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建群组 | POST | `/groups` | 创建新群组 |
| 获取群组列表 | GET | `/groups` | 获取群组列表 |
| 获取群组详情 | GET | `/groups/:id` | 获取群组详情 |
| 更新群组信息 | PUT | `/groups/:id` | 更新群组信息 |
| 解散群组 | DELETE | `/groups/:id` | 解散群组 |
| 加入群组 | POST | `/groups/:id/join` | 加入群组 |
| 退出群组 | POST | `/groups/:id/leave` | 退出群组 |
| 获取群成员 | GET | `/groups/:id/members` | 获取群成员列表 |
| 邀请成员 | POST | `/groups/:id/invite` | 邀请成员加入 |
| 移除成员 | DELETE | `/groups/:id/members/:userId` | 移除群成员 |

### 消息管理

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发送消息 | POST | `/messages` | 发送消息 |
| 获取消息列表 | GET | `/messages` | 获取消息列表 |
| 获取会话列表 | GET | `/conversations` | 获取会话列表 |
| 标记已读 | PUT | `/messages/read` | 标记消息已读 |
| 撤回消息 | POST | `/messages/:id/recall` | 撤回消息 |
| 删除消息 | DELETE | `/messages/:id` | 删除消息 |

### 悟空IM

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取IM配置 | GET | `/im/config` | 获取悟空IM连接配置 |
| 发送消息 | POST | `/im/message/send` | 通过悟空IM发送消息 |
| 创建频道 | POST | `/im/channel/create` | 创建频道 |
| 删除频道 | POST | `/im/channel/delete` | 删除频道 |
| 添加订阅者 | POST | `/im/channel/subscriber/add` | 添加频道订阅者 |
| 同步消息 | GET | `/im/message/sync` | 同步历史消息 |

### RTC 音视频

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建房间 | POST | `/rtc/rooms` | 创建音视频房间 |
| 获取房间信息 | GET | `/rtc/rooms/:id` | 获取房间信息 |
| 加入房间 | POST | `/rtc/rooms/:id/join` | 加入音视频房间 |
| 离开房间 | POST | `/rtc/rooms/:id/leave` | 离开音视频房间 |
| 获取 Token | GET | `/rtc/token` | 获取 RTC Token |

### AI Bot

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取Bot列表 | GET | `/ai-bots` | 获取AI Bot列表 |
| 发送消息 | POST | `/ai-bots/:id/message` | 向AI Bot发送消息 |
| 获取对话历史 | GET | `/ai-bots/:id/messages` | 获取对话历史 |

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| `AUTH_INVALID_TOKEN` | Token 无效 |
| `AUTH_TOKEN_EXPIRED` | Token 已过期 |
| `USER_NOT_FOUND` | 用户不存在 |
| `USER_ALREADY_EXISTS` | 用户已存在 |
| `INVALID_PASSWORD` | 密码错误 |
| `GROUP_NOT_FOUND` | 群组不存在 |
| `NOT_GROUP_MEMBER` | 不是群组成员 |
| `PERMISSION_DENIED` | 权限不足 |
| `MESSAGE_NOT_FOUND` | 消息不存在 |
| `RATE_LIMIT_EXCEEDED` | 请求过于频繁 |

## 限流说明

API 默认开启限流保护：

- 普通接口：100 请求/15分钟
- 登录接口：5 请求/分钟
- 发送消息：60 请求/分钟

## SDK 支持

推荐使用官方 SDK 调用 API：

- [TypeScript SDK](/sdk/typescript)
- [Java SDK](/sdk/java)
- [Go SDK](/sdk/go)
- [Python SDK](/sdk/python)
