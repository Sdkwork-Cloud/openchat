# Admin WuKongIM 控制面 API

本页描述带管理权限的 WuKongIM 控制面接口。

## 运行时 OpenAPI

- 管理端文档：`http://localhost:3000/admin/im/v3/docs`
- 管理端 Schema：`http://localhost:3000/admin/im/v3/openapi.json`

## Surface

- 基础路径：`/admin/im/v3/wukongim`
- 认证方式：JWT + 管理权限
- 面向对象：管理后台、服务运维人员、控制面自动化工具

## 核心接口

- `POST /admin/im/v3/wukongim/message/send`
- `POST /admin/im/v3/wukongim/message/sendbatch`
- `GET /admin/im/v3/wukongim/message/sync`
- `POST /admin/im/v3/wukongim/channel/create`
- `POST /admin/im/v3/wukongim/channel/delete`
- `POST /admin/im/v3/wukongim/channel/subscriber/add`
- `POST /admin/im/v3/wukongim/channel/subscriber/remove`
- `GET /admin/im/v3/wukongim/health`
- `GET /admin/im/v3/wukongim/system/info`

## 约束

- 消息控制面操作只属于 admin schema
- 终端应用接入所需的 bootstrap 接口仍保留在 `/im/v3/wukongim`
- admin schema 与 WuKongIM SDK 手写集成代码必须持续解耦