# Admin RTC 控制面 API

本页描述带管理权限的 RTC 控制面接口。

## 运行时 OpenAPI

- 管理端文档：`http://localhost:3000/admin/im/v3/docs`
- 管理端 Schema：`http://localhost:3000/admin/im/v3/openapi.json`

## Surface

- 基础路径：`/admin/im/v3/rtc`
- 认证方式：JWT + 管理权限
- 面向对象：管理后台与运维自动化工具

## 核心接口

- `POST /admin/im/v3/rtc/channels`
- `GET /admin/im/v3/rtc/channels`
- `GET /admin/im/v3/rtc/channels/:id`
- `PUT /admin/im/v3/rtc/channels/:id`
- `DELETE /admin/im/v3/rtc/channels/:id`
- `GET /admin/im/v3/rtc/providers/stats`
- `GET /admin/im/v3/rtc/providers/health`

## 约束

- 这些接口只属于 admin schema，不能进入前端 SDK
- provider 健康度与统计信息属于控制面，不属于终端用户契约
- 客户端能力发现接口仍然保留在 `/im/v3/rtc/providers/capabilities`