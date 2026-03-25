# RTC 前端 API

本页只描述面向终端应用的 RTC 能力面。

管理控制面的 RTC 接口请查看 [Admin RTC API](../admin-api/rtc.md)。

## 运行时 OpenAPI

- 前端文档：`http://localhost:3000/im/v3/docs`
- 前端 Schema：`http://localhost:3000/im/v3/openapi.json`
- 管理端文档：`http://localhost:3000/admin/im/v3/docs`
- 管理端 Schema：`http://localhost:3000/admin/im/v3/openapi.json`

`sdkwork-im-sdk` 只消费前端 Schema，不包含 admin API。

## 前端 Surface

- 基础路径：`/im/v3/rtc`
- 认证方式：JWT
- 面向对象：终端应用、前端 SDK、RTC 启动客户端

## 核心接口

- `POST /im/v3/rtc/rooms`
- `PUT /im/v3/rtc/rooms/:id/end`
- `GET /im/v3/rtc/rooms/:id`
- `GET /im/v3/rtc/rooms/user/:userId`
- `POST /im/v3/rtc/tokens`
- `POST /im/v3/rtc/tokens/validate`
- `POST /im/v3/rtc/rooms/:id/connection`
- `POST /im/v3/rtc/rooms/:id/participants`
- `DELETE /im/v3/rtc/rooms/:id/participants/:userId`
- `GET /im/v3/rtc/providers/capabilities`
- `POST /im/v3/rtc/rooms/:roomId/recordings/start`
- `POST /im/v3/rtc/rooms/:roomId/recordings/stop`
- `POST /im/v3/rtc/video-records`
- `GET /im/v3/rtc/video-records/:id`
- `GET /im/v3/rtc/rooms/:roomId/video-records`
- `GET /im/v3/rtc/users/:userId/video-records`
- `PUT /im/v3/rtc/video-records/:id/status`
- `PUT /im/v3/rtc/video-records/:id/metadata`
- `POST /im/v3/rtc/video-records/:id/sync`
- `DELETE /im/v3/rtc/video-records/:id`
- `GET /im/v3/rtc/video-records`

## 聚合连接引导

`POST /im/v3/rtc/rooms/:id/connection` 是面向客户端的 RTC 启动引导接口。服务端会一次性返回媒体 provider 启动配置、WuKongIM 实时连接配置以及 RTC 信令规则，客户端不需要再自行拼装多份配置。

请求字段：

- `channelId`：可选，显式指定 RTC 渠道
- `provider`：可选，期望使用的 provider，例如 `volcengine`
- `role`：可选，provider 侧 ACL 角色，例如 `host`
- `expireSeconds`：可选，RTC token 过期时间覆盖值
- `includeRealtimeToken`：是否返回 WuKongIM 实时连接 token

响应结构：

- `room`：OpenChat 业务房间信息
- `rtcToken`：服务端签发的 RTC token 记录
- `providerConfig`：RTC 媒体层启动配置
- `signaling`：RTC 信令的 WuKongIM 事件路由约定
- `realtime`：WuKongIM 长连接启动配置

关键字段说明：

- `providerRoomId`：RTC 媒体 SDK 入会时使用的房间号
- `businessRoomId`：OpenChat 业务房间号，HTTP API 和信令都基于它
- `transport = WUKONGIM_EVENT`
- `eventType = RTC_SIGNAL`
- `namespace = rtc`
- `broadcastConversation.type = GROUP`
- `broadcastConversation.targetId = room.id`

## 推荐客户端流程

1. 创建房间或查询已有房间。
2. 调用 `POST /im/v3/rtc/rooms/:id/connection`。
3. 使用 `providerConfig` 初始化 RTC 媒体 SDK。
4. 使用 `realtime` 启动 WuKongIM 长连接。
5. 按照 `RTC_SIGNAL` 事件协议交换信令。
6. 媒体层入会使用 `providerRoomId`，不要误用 `businessRoomId`。

## 客户端集成约束

- 终端应用不得依赖 `/admin/im/v3/rtc/*`。
- provider capability 保留在前端 surface，供 SDK 运行时做动态选路。
- 房间编排、token 签发、连接引导、录制与回放接口都属于前端契约。
- 反复生成 SDK 时，只允许刷新 `generated/server-openapi`，手写的 WuKongIM 与 RTC 封装层不能被覆盖。

## Provider 说明

- 默认 provider：`volcengine`
- 支持 provider：`volcengine`、`tencent`、`alibaba`、`livekit`
- 运行时路由与可用性以 OpenAPI 合约和 `GET /im/v3/rtc/providers/capabilities` 为准

## 内部模块

RTC webhook 仍属于内部模块，不进入公开前端 schema。
