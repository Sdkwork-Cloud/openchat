# Swift SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-swift`
- generated package: `BackendSDK`
- app schema source: `/im/v3/openapi.json`

## Current Shape

- generated HTTP client only
- canonical generator target for Apple-platform integration
- iOS-specific product code should live above this workspace

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
- future handwritten realtime layers must stay outside the generated directory
