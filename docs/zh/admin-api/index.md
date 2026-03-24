# Admin API Reference

OpenChat 将管理控制面的 IM HTTP 接口统一挂载在 `/admin/im/v3`。
这套 surface 与前端业务 API 明确隔离，不允许进入 `sdkwork-im-sdk` 前端 SDK 工作区。

## 运行时 OpenAPI

- 管理端 Swagger UI：`http://localhost:3000/admin/im/v3/docs`
- 管理端 OpenAPI JSON：`http://localhost:3000/admin/im/v3/openapi.json`
- 完整服务：`npm run start:dev`
- 仅导出 Schema：`npm run start:openapi`

## 范围说明

| Surface | 前缀 | 面向对象 | 是否进入前端 SDK |
|------|------|------|------|
| Admin IM API | `/admin/im/v3` | 管理后台、运维控制台、控制面自动化工具 | 否 |
| 前端 IM API | `/im/v3` | 各类终端应用与前端 SDK | 是 |

前端业务接口请查看 [前端 API Reference](../api/index.md)。

## 主要模块

| 模块 | 前缀 |
|------|------|
| RTC 控制面 | `/admin/im/v3/rtc` |
| WuKongIM 控制面 | `/admin/im/v3/wukongim` |

## 核心文档

- [RTC 控制面](./rtc.md)
- [WuKongIM 控制面](./wukongim.md)
- [前端 API Reference](../api/index.md)

## 标准约束

- admin schema 独立导出在 `/admin/im/v3/openapi.json`
- admin 契约可以独立演进，但不能破坏前端 SDK 边界
- `sdkwork-im-sdk` 永远不允许吸收 admin endpoint
- 如未来需要 admin 专用 SDK，应独立生成，不进入前端 SDK 工作区
