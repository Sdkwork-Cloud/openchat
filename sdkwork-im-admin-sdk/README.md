# SDKWork IM Admin SDK Workspace

`sdkwork-im-admin-sdk` is the admin control-plane SDK workspace for OpenChat IM.

It is separate from `sdkwork-im-sdk` and owns:

- runtime-driven admin OpenAPI inputs
- admin SDK generation wrappers
- admin TypeScript generated HTTP SDKs
- handwritten admin TypeScript facade packages

## Runtime Contract

The running server exports two independent OpenAPI surfaces:

- app docs: `/im/v3/docs`
- app schema: `/im/v3/openapi.json`
- admin docs: `/admin/im/v3/docs`
- admin schema: `/admin/im/v3/openapi.json`

This workspace generates from the admin schema only.

## Ownership Rules

- `generated/server-openapi` is generator-owned
- `composed` is handwritten and stable for admin-console consumers
- repeated generation must only touch `generated/server-openapi`

## Workspace Layout

```text
sdkwork-im-admin-sdk/
  openapi/
  bin/
  docs/
  sdkwork-im-admin-sdk-typescript/
```

## Script Standard

Workspace-level generation:

- `bin/generate-sdk.sh`
- `bin/generate-sdk.ps1`
- `bin/materialize-typescript-workspace.mjs`

TypeScript workspace scripts:

- `sdkwork-im-admin-sdk-typescript/bin/sdk-gen.sh`
- `sdkwork-im-admin-sdk-typescript/bin/sdk-gen.ps1`
- `sdkwork-im-admin-sdk-typescript/bin/sdk-assemble.sh`
- `sdkwork-im-admin-sdk-typescript/bin/sdk-assemble.ps1`

## TypeScript Layers

- generated HTTP package: `@sdkwork/im-admin-backend-sdk`
- composed admin facade package: `@openchat/sdkwork-im-admin-sdk`

The composed admin package bridges `/im/v3/auth/*` through `@sdkwork/im-backend-sdk`, while admin control-plane APIs always come from `/admin/im/v3/openapi.json`.

For the TypeScript target, workspace generation now also materializes all required package outputs:

- upstream app generated package: `@sdkwork/im-backend-sdk`
- admin generated package: `@sdkwork/im-admin-backend-sdk`
- admin composed facade: `@openchat/sdkwork-im-admin-sdk`
