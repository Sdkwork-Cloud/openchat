# SDK Documentation

OpenChat ships the app-facing SDK system through the `sdkwork-im-sdk` workspace.

This workspace generates HTTP API clients from the runtime app schema and keeps WuKongIM realtime integration in separate handwritten modules.

## Source of Truth

- app schema: `http://localhost:3000/im/v3/openapi.json`
- admin schema: `http://localhost:3000/admin/im/v3/openapi.json`
- runtime docs: `/im/v3/docs` and `/admin/im/v3/docs`

Only the app schema is used for `sdkwork-im-sdk` generation.

## Generation Model

- generator-owned output: `generated/server-openapi`
- handwritten realtime adapter: `adapter-wukongim`
- handwritten product layer: `composed`

Repeated generation must never overwrite handwritten WuKongIM integration code.

## Language Matrix

| Language / Target | Workspace | Realtime Layer | Notes |
|------|------|------|------|
| TypeScript | `sdkwork-im-sdk-typescript` | yes | first-class with `wukongimjssdk` |
| Flutter | `sdkwork-im-sdk-flutter` | yes | first-class with `wukongimfluttersdk` |
| Java | `sdkwork-im-sdk-java` | generated HTTP only | JVM package |
| Kotlin | `sdkwork-im-sdk-kotlin` | generated HTTP only | canonical Android-side generator target |
| Go | `sdkwork-im-sdk-go` | generated HTTP only | Go module |
| Python | `sdkwork-im-sdk-python` | generated HTTP only | Python package |
| Swift | `sdkwork-im-sdk-swift` | generated HTTP only | canonical iOS-side generator target |
| C# | `sdkwork-im-sdk-csharp` | generated HTTP only | .NET package |
| Android Wrapper | `sdkwork-im-sdk-android` | wrapper only | forwards to Kotlin workspace |
| iOS Wrapper | `sdkwork-im-sdk-ios` | wrapper only | forwards to Swift workspace |

## Script Entry Points

- root generate: `sdkwork-im-sdk/bin/generate-sdk.sh`
- root generate: `sdkwork-im-sdk/bin/generate-sdk.ps1`
- language generate: `sdkwork-im-sdk-XXX/bin/sdk-gen.sh`
- language generate: `sdkwork-im-sdk-XXX/bin/sdk-gen.ps1`
- language assemble: `sdkwork-im-sdk-XXX/bin/sdk-assemble.sh`
- language assemble: `sdkwork-im-sdk-XXX/bin/sdk-assemble.ps1`

The root wrappers can auto-start `npm run start:openapi` when the runtime schema is unavailable.

## Pages

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
