# 前端 API Reference

OpenChat 面向终端应用的 IM HTTP 接口统一挂载在 `/im/v3`。

这套 surface 是前端 SDK 唯一允许消费的服务端契约。

## 运行时 OpenAPI

- 前端 Swagger UI：`http://localhost:3000/im/v3/docs`
- 前端 OpenAPI JSON：`http://localhost:3000/im/v3/openapi.json`
- 仅导出 Schema：`npm run start:openapi`

如果 markdown 页面与运行中的服务行为不一致，以运行时 OpenAPI 为准。

## 范围说明

| Surface | 前缀 | 面向对象 | 是否进入前端 SDK |
|------|------|------|------|
| 前端 IM API | `/im/v3` | Web、移动端、桌面端、Bot、前端 SDK | 是 |
| Admin IM API | `/admin/im/v3` | 管理后台、运维控制台、控制面工具 | 否 |

管理端 API 已单独整理到 [Admin API Reference](../admin-api/index.md)。

## 主要模块

| 模块 | 前缀 |
|------|------|
| 认证授权 | `/im/v3/auth` |
| 用户 | `/im/v3/users` |
| 联系人 | `/im/v3/contacts` |
| 消息 | `/im/v3/messages` |
| 会话 | `/im/v3/conversations` |
| 群组 | `/im/v3/groups` |
| 好友 | `/im/v3/friends` |
| 时间线 | `/im/v3/timeline` |
| RTC | `/im/v3/rtc` |
| WuKongIM 接入 | `/im/v3/wukongim` |
| AI / Agent | `/im/v3/ai-bots`、`/im/v3/agents` |

## 核心文档

- [认证授权](./auth.md)
- [消息](./messages.md)
- [会话](./conversations.md)
- [RTC](./rtc.md)
- [WuKongIM 接入](./wukongim.md)
- [开放接入](./open-access.md)
- [Admin API Reference](../admin-api/index.md)

## 标准约束

- 运行时 schema 版本：`openapi: 3.2.0`
- 运行时 dialect：`jsonSchemaDialect: https://spec.openapis.org/oas/3.2/dialect/base`
- 前端 SDK 生成只能消费 `/im/v3/openapi.json`
- 管理控制面 schema 独立保留在 `/admin/im/v3/openapi.json`
- WuKongIM 实时集成代码必须留在手写层，不能进入 `generated/server-openapi`