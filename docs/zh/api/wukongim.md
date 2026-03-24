# WuKongIM 前端接入 API

本页只描述面向终端应用的 WuKongIM 接入 surface。

管理控制面的 WuKongIM 接口请查看 [Admin WuKongIM API](../admin-api/wukongim.md)。

## 职责拆分

- 消息发送：服务端 HTTP 业务 API
- 客户端长连接：WuKongIM SDK
- 实时接收：WuKongIM

## 运行时 OpenAPI

- 前端文档：`http://localhost:3000/im/v3/docs`
- 前端 Schema：`http://localhost:3000/im/v3/openapi.json`

## 前端 Surface

- 基础路径：`/im/v3/wukongim`
- 面向对象：终端应用接入 WuKongIM 前的配置准备

## 接口

- `GET /im/v3/wukongim/config`
- `POST /im/v3/wukongim/token`

## 集成约束

- 前端 bootstrap 接口属于前端 schema，可进入生成 SDK
- 控制面操作不得混入前端 surface
- `wukongimjssdk` 与 `wukongimfluttersdk` 的实时集成必须保留在手写层

## SDK 边界

- HTTP 业务 API 从 `/im/v3/openapi.json` 生成
- `sdkwork-im-sdk` 不包含 admin API
- 手写 WuKongIM adapter 必须留在 `generated/server-openapi` 之外