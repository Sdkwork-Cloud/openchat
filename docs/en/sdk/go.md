# Go SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-go`
- generated module: `github.com/sdkwork/backend-sdk`
- app schema source: `/im/v3/openapi.json`

## Current Shape

- generated HTTP client only
- no handwritten WuKongIM adapter layer
- suitable for backend services and automation that only need app-facing HTTP APIs

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
- future realtime layers must remain outside the generated directory
