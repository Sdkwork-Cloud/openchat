# Go SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-go`
- 生成模块：`github.com/sdkwork/backend-sdk`
- 契约来源：`/im/v3/openapi.json`

## 当前形态

- 仅包含生成的 HTTP SDK
- 当前没有手写 WuKongIM adapter
- 适用于只消费前端 HTTP API 的后端服务与自动化程序

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