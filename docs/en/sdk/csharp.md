# C# SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-csharp`
- generated package: `Backend`
- app schema source: `/im/v3/openapi.json`

## Current Shape

- generated HTTP client only
- no handwritten WuKongIM adapter layer
- suitable for .NET services and tooling that consume the app-facing IM API

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
- future realtime layers must stay outside the generated directory
