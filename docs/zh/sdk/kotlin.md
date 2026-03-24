# Kotlin SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-kotlin`
- 生成产物：`com.sdkwork:backend-sdk`
- 契约来源：`/im/v3/openapi.json`

## 当前形态

- 仅包含生成的 HTTP SDK
- 是 Android 侧的标准生成目标
- Android 产品层代码应建立在该工作区之上，而不是写入生成目录

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
- Android Wrapper 只用于转发入口，不是权威生成目录