# OpenChat Admin SDK Design

## Context

`app/openchat-admin` currently reaches the control plane through a handwritten `admin-api.ts` wrapper over `fetch`. That bypasses the generated SDK workflow already established for app-facing IM APIs in `sdkwork-im-sdk`.

The server already exports an isolated admin control-plane contract at `/admin/im/v3/openapi.json`. The missing piece is a dedicated SDK workspace that owns generation, stable TypeScript consumption, and admin-console integration.

## Goals

- Create a dedicated `sdkwork-im-admin-sdk` workspace for the admin control plane.
- Generate a TypeScript admin HTTP SDK from `/admin/im/v3/openapi.json`.
- Add a handwritten TypeScript facade package for stable admin-console consumption.
- Move `app/openchat-admin` off raw `/admin/im/v3/*` requests and onto the generated admin SDK path.
- Publish an admin-specific Codex skill so future admin web work follows the same generated-contract rule.

## Non-Goals

- Merging admin APIs into `sdkwork-im-sdk`.
- Adding realtime adapters that are not required for admin control-plane HTTP.
- Hand-editing generated output.

## Key Decisions

### 1. Keep a dedicated admin workspace

`sdkwork-im-admin-sdk` is a sibling workspace to `sdkwork-im-sdk`, not a sub-package inside it. The app schema and admin schema stay isolated:

- app SDK authority: `/im/v3/openapi.json`
- admin SDK authority: `/admin/im/v3/openapi.json`

### 2. Land TypeScript first with a two-layer split

The admin workspace will ship a TypeScript target first:

- `generated/server-openapi`: generator-owned admin HTTP client
- `composed`: handwritten stable facade package for admin tools

There is no WuKongIM adapter layer in the admin workspace because the admin console uses HTTP control-plane APIs, not client-side IM realtime transport.

### 3. Bridge auth through generated app auth APIs

Admin login/logout/current-user flows still live under `/im/v3/auth/*`. The admin facade package will compose:

- generated admin SDK for `/admin/im/v3/*`
- generated app backend SDK auth APIs for `/im/v3/auth/*`

This keeps the admin console on generated SDK paths only, with no raw auth or admin fetch bypasses.

### 4. Preserve a thin app-local adapter only if it stays SDK-backed

`app/openchat-admin/src/services/admin-api.ts` may remain as an app-local boundary for UI-friendly method names and small normalization helpers, but it must delegate to `@openchat/sdkwork-im-admin-sdk` instead of `api.client`.

## Workspace Shape

```text
sdkwork-im-admin-sdk/
  bin/
  docs/
  openapi/
  sdkwork-im-admin-sdk-typescript/
    bin/
    generated/server-openapi/
    composed/
```

## Verification

- `app/openchat-admin` includes a guard test that rejects raw `/admin/im/v3` access in `admin-api.ts`.
- admin SDK generation completes from the runtime admin schema.
- composed admin package builds successfully.
- `openchat-admin` lint, test, and build remain green after migration.
