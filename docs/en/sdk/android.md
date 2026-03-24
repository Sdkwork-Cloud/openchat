# Android Compatibility Wrapper

## Workspace

- wrapper: `sdkwork-im-sdk/sdkwork-im-sdk-android`
- canonical generator target: `sdkwork-im-sdk/sdkwork-im-sdk-kotlin`

## Purpose

This directory exists to preserve historical Android-labelled entry points while keeping SDKWORK Generator focused on the Kotlin workspace.

## Commands

The wrapper forwards generation and assembly to the Kotlin workspace:

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## Rules

- do not generate code into the wrapper directory
- use Kotlin as the authoritative generated HTTP SDK target
- Android-specific product code should be built above the Kotlin workspace
