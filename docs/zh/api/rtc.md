# RTC 前端 API

本页只描述面向终端应用的 RTC surface。

管理控制面的 RTC 接口请查看 [Admin RTC API](../admin-api/rtc.md)。

## 运行时 OpenAPI

- 前端文档：`http://localhost:3000/im/v3/docs`
- 前端 Schema：`http://localhost:3000/im/v3/openapi.json`

## 前端 Surface

- 基础路径：`/im/v3/rtc`
- 认证方式：JWT
- 面向对象：终端应用与前端 SDK

## 核心接口

- `POST /im/v3/rtc/rooms`
- `PUT /im/v3/rtc/rooms/:id/end`
- `GET /im/v3/rtc/rooms/:id`
- `GET /im/v3/rtc/rooms/user/:userId`
- `POST /im/v3/rtc/tokens`
- `POST /im/v3/rtc/tokens/validate`
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

## 客户端集成约束

- 终端应用不得依赖 `/admin/im/v3/rtc/*`
- provider capability 查询保留在前端 surface，供 SDK 做运行时选路
- 房间编排、token 签发、录制与回放相关接口都属于前端业务契约

## Provider 说明

- 默认 provider：`volcengine`
- 支持 provider：`volcengine`、`tencent`、`alibaba`、`livekit`
- 路由与可用性判断以运行时 OpenAPI 为准

## 内部模块

RTC webhook 仍然属于内部模块，不进入公开前端 schema。