---
layout: home

hero:
  name: OpenChat
  text: 面向现代应用的 IM 服务与 SDK 体系
  tagline: 发送消息走 HTTP，长连接与实时接收走 WuKongIM；同时输出前端与 Admin 两套独立 OpenAPI 3.x 契约，并支持基于运行时 schema 的多语言 SDK 生成。
  image:
    src: /logo.svg
    alt: OpenChat
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/quickstart
    - theme: alt
      text: 前端 API
      link: /zh/api/
    - theme: alt
      text: Admin API
      link: /zh/admin-api/
    - theme: alt
      text: SDK 文档
      link: /zh/sdk/

features:
  - title: 双通道即时通信架构
    details: 消息发送通过 HTTP API 进入服务端，服务端持久化后再通过 WuKongIM 完成实时分发与客户端接收。
  - title: 双 OpenAPI Surface
    details: 前端业务 API 固定为 /im/v3，控制面 Admin API 固定为 /admin/im/v3，运行时可直接通过 URL 获取 schema。
  - title: 生成层与实时层解耦
    details: SDKWORK Generator 只写入 generated/server-openapi，手写的 adapter-wukongim 与 composed 始终独立，反复生成互不影响。
  - title: 面向 AI 时代的消息与事件模型
    details: 消息 envelope 统一支持 message 与 event，适配文本、多媒体、RTC 信令、游戏状态同步与未来扩展负载。
---

## 快速入口

- 前端 Swagger UI：`http://localhost:3000/im/v3/docs`
- 前端 OpenAPI JSON：`http://localhost:3000/im/v3/openapi.json`
- 管理端 Swagger UI：`http://localhost:3000/admin/im/v3/docs`
- 管理端 OpenAPI JSON：`http://localhost:3000/admin/im/v3/openapi.json`

## 运行模式

::: code-group

```bash [完整服务]
npm ci
npm run start:dev
```

```bash [仅导出 OpenAPI]
npm ci
npm run start:openapi
```

```powershell [生成多语言 SDK]
powershell -ExecutionPolicy Bypass -File .\sdkwork-im-sdk\bin\generate-sdk.ps1
```

:::

## 标准约束

- 前端 SDK 只消费 `/im/v3/openapi.json`
- `sdkwork-im-sdk` 不包含 admin API
- 生成器只覆盖 `generated/server-openapi`
- `adapter-wukongim` 与 `composed` 保持手写隔离
- 运行时 OpenAPI 是唯一权威契约，仓库内快照属于派生产物

## 文档入口

- 中文前端 API Reference：[API 文档](/zh/api/)
- 中文 Admin API Reference：[Admin API 文档](/zh/admin-api/)
- 中文 SDK 文档：[SDK 文档](/zh/sdk/)
- English App API Reference: [API Documentation](/en/api/)
- English Admin API Reference: [Admin API Documentation](/en/admin-api/)
- English SDK Documentation: [SDK Documentation](/en/sdk/)
- OpenAPI 与 SDK 标准：[IM OpenAPI And SDK Standard](./im-openapi-sdk-standard.md)
- SDK 工作区说明：`sdkwork-im-sdk/README.md`

## 关键目录

```text
openchat-server/
|- src/                    # 服务端源码
|- docs/                   # VitePress 文档站
|- scripts/                # 启动、部署、生成脚本
|- database/               # 数据库脚本
|- sdkwork-im-sdk/         # IM SDK 工作区
|  |- openapi/             # OpenAPI 权威/派生输入
|  |- schemas/             # JSON Schema 注册表
|  |- docs/                # SDK 体系规范文档
|  |- bin/                 # 根生成与装配脚本
|  |- sdkwork-im-sdk-typescript/
|  |- sdkwork-im-sdk-flutter/
|  |- sdkwork-im-sdk-python/
|  |- sdkwork-im-sdk-go/
|  |- sdkwork-im-sdk-java/
|  |- sdkwork-im-sdk-kotlin/
|  |- sdkwork-im-sdk-swift/
|  |- sdkwork-im-sdk-csharp/
```

## 验证命令

```bash
npm run lint:types
npm run build
npm test -- test/sdkwork-im-sdk/openapi-runtime-server.spec.ts test/sdkwork-im-sdk/ensure-openapi-runtime.spec.ts test/sdkwork-im-sdk/workspace-docs.spec.ts --runInBand
```