# SDKWork IM Admin TypeScript Workspace

This directory is the TypeScript workspace inside `sdkwork-im-admin-sdk`.

## Contract Source

- admin schema: `/admin/im/v3/openapi.json`
- app auth bridge: generated app SDK auth APIs only

## Permanent Layer Split

- `generated/server-openapi`: generator-owned admin HTTP SDK
- `composed`: handwritten admin facade package for admin consoles and tooling

## Packages

- generated HTTP package: `@sdkwork/im-admin-backend-sdk`
- composed SDK package: `@openchat/sdkwork-im-admin-sdk`

## Commands

- generate server SDK: `bin/sdk-gen.sh` or `bin/sdk-gen.ps1`
- assemble compatibility metadata: `bin/sdk-assemble.sh` or `bin/sdk-assemble.ps1`

## Rules

- only `generated/server-openapi` may be overwritten by generation
- admin web clients must not call `/admin/im/v3/*` with handwritten fetch wrappers
- login/current-user/logout flows must still use generated SDK paths
