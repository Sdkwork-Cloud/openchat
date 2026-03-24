# iOS Compatibility Wrapper

## Workspace

- wrapper: `sdkwork-im-sdk/sdkwork-im-sdk-ios`
- canonical generator target: `sdkwork-im-sdk/sdkwork-im-sdk-swift`

## Purpose

This directory exists to preserve historical iOS-labelled entry points while keeping SDKWORK Generator focused on the Swift workspace.

## Commands

The wrapper forwards generation and assembly to the Swift workspace:

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
- use Swift as the authoritative generated HTTP SDK target
- iOS-specific product code should be built above the Swift workspace
