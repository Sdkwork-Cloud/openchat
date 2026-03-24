# C# SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-csharp`
- 生成产物：`Backend`
- 契约来源：`/im/v3/openapi.json`

## 当前形态

- 仅包含生成的 HTTP SDK
- 当前没有手写 WuKongIM adapter
- 适用于 .NET 服务与工具链

## 命令

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## 规则

- 只有 `generated/server-openapi` 属于生成器托管
- 不包含 admin API
- 未来实时层必须放在生成目录之外