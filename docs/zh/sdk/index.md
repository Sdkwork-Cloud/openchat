# SDK 文档

OpenChat 通过 `sdkwork-im-sdk` 工作区交付面向前端应用的 SDK 体系。
该工作区基于运行时前端 schema 生成 HTTP SDK，同时把 WuKongIM 实时集成保留在独立手写模块中。

## 契约来源

- 前端 schema：`http://localhost:3000/im/v3/openapi.json`
- 管理端 schema：`http://localhost:3000/admin/im/v3/openapi.json`
- 运行时文档：`/im/v3/docs` 与 `/admin/im/v3/docs`

`sdkwork-im-sdk` 只消费前端 schema，不包含 admin API。

## 生成模型

- 生成器托管目录：`generated/server-openapi`
- 手写实时适配层：`adapter-wukongim`
- 手写产品组合层：`composed`

反复生成时，绝不允许覆盖手写的 WuKongIM、RTC 和业务 facade 代码。

## 语言矩阵

| 语言 / 目标 | 工作区 | 实时层 | 说明 |
|------|------|------|------|
| TypeScript | `sdkwork-im-sdk-typescript` | 有 | 接入 `wukongimjssdk` |
| Flutter | `sdkwork-im-sdk-flutter` | 有 | 接入 `wukongimfluttersdk` |
| Java | `sdkwork-im-sdk-java` | 无 | 仅生成 HTTP SDK |
| Kotlin | `sdkwork-im-sdk-kotlin` | 无 | Android 标准生成目标 |
| Go | `sdkwork-im-sdk-go` | 无 | 仅生成 HTTP SDK |
| Python | `sdkwork-im-sdk-python` | 无 | 仅生成 HTTP SDK |
| Swift | `sdkwork-im-sdk-swift` | 无 | iOS 标准生成目标 |
| C# | `sdkwork-im-sdk-csharp` | 无 | 仅生成 HTTP SDK |
| Android Wrapper | `sdkwork-im-sdk-android` | 包装层 | 转发到 Kotlin 工作区 |
| iOS Wrapper | `sdkwork-im-sdk-ios` | 包装层 | 转发到 Swift 工作区 |

## 脚本入口

- 根生成脚本：`sdkwork-im-sdk/bin/generate-sdk.sh`
- 根生成脚本：`sdkwork-im-sdk/bin/generate-sdk.ps1`
- 语言生成脚本：`sdkwork-im-sdk-XXX/bin/sdk-gen.sh`
- 语言生成脚本：`sdkwork-im-sdk-XXX/bin/sdk-gen.ps1`
- 语言装配脚本：`sdkwork-im-sdk-XXX/bin/sdk-assemble.sh`
- 语言装配脚本：`sdkwork-im-sdk-XXX/bin/sdk-assemble.ps1`

当运行时 schema 不可访问时，根脚本会自动尝试拉起 `npm run start:openapi`。

## 页面导航

- [TypeScript](./typescript.md)
- [Flutter](./flutter.md)
- [Java](./java.md)
- [Kotlin](./kotlin.md)
- [Go](./go.md)
- [Python](./python.md)
- [Swift](./swift.md)
- [C#](./csharp.md)
- [Android Wrapper](./android.md)
- [iOS Wrapper](./ios.md)
