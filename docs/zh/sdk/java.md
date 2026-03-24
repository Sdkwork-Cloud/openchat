# Java SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-java`
- 生成产物：`com.sdkwork:backend-sdk`
- 契约来源：`/im/v3/openapi.json`

## 当前形态

- 仅包含生成的 HTTP SDK
- 当前没有手写 WuKongIM adapter
- 如未来增加实时层，必须放在 `generated/server-openapi` 之外

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
- 重复生成时必须保护未来手写扩展层