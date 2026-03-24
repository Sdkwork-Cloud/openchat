# Java SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-java`
- generated package: `com.sdkwork:backend-sdk`
- app schema source: `/im/v3/openapi.json`

## Current Shape

- generated HTTP client only
- no handwritten WuKongIM adapter in this workspace
- future realtime work must stay outside `generated/server-openapi`

## Commands

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## Rules

- only `generated/server-openapi` is generator-owned
- admin APIs are excluded
- repeated generation must preserve any future handwritten layers by keeping them outside the generated directory
