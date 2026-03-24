# Kotlin SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-kotlin`
- generated package: `com.sdkwork:backend-sdk`
- app schema source: `/im/v3/openapi.json`

## Current Shape

- generated HTTP client only
- canonical generator target for Android-side JVM usage
- Android-specific product code should live above this workspace, not inside `generated/server-openapi`

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
- wrapper consumers should prefer the Android compatibility wrapper only for forwarding convenience
