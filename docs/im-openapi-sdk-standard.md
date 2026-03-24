# IM OpenAPI And SDK Standard

This document defines the OpenChat IM OpenAPI and SDK generation standard.

## Runtime Schema Endpoints

- App Swagger UI: `/im/v3/docs`
- App OpenAPI JSON: `/im/v3/openapi.json`
- Admin Swagger UI: `/admin/im/v3/docs`
- Admin OpenAPI JSON: `/admin/im/v3/openapi.json`

## OpenAPI Standard Compliance

- Runtime documents are normalized to `openapi: 3.2.0`
- Runtime documents declare `jsonSchemaDialect: https://spec.openapis.org/oas/3.2/dialect/base`
- App documents publish `servers[0].url = /im/v3`
- Admin documents publish `servers[0].url = /admin/im/v3`
- `paths` stay surface-relative so SDK generators do not duplicate prefixes
- The running server schema URLs are the authority; checked-in snapshots are derived artifacts

## Runtime Modes

- Full runtime: `npm run start:dev`
- Schema-only runtime: `npm run start:openapi`

`start:openapi` boots a lightweight schema export server without requiring PostgreSQL or Redis. It exists specifically for OpenAPI export, SDK generation, and documentation pipelines.

## SDK Scope

`sdkwork-im-sdk` is app-only and does not include admin APIs.

- `sdkwork-im-sdk` generates from `/im/v3/openapi.json`
- admin APIs stay outside the app SDK workspace
- admin schema remains available for server-side docs and future admin-only tooling

## Generation Flow

1. Run any language workspace `bin/sdk-gen.sh` or `bin/sdk-gen.ps1`.
2. The root wrapper first ensures runtime OpenAPI URLs are reachable.
3. If the target runtime is not already available, the wrapper auto-starts `npm run start:openapi`.
4. The wrapper fetches `/im/v3/openapi.json` and validates `/admin/im/v3/openapi.json`.
5. The wrapper calls `sdkwork-sdk-generator` from `D:\javasource\spring-ai-plus\spring-ai-plus-business\sdk\sdkwork-sdk-generator`.
6. The generator writes only into `generated/server-openapi`.
7. The assembly step refreshes workspace metadata and compatibility docs.
8. Any temporary schema-only runtime started by the wrapper is stopped automatically.

Offline generation is explicit and opt-in through `--skip-fetch` or `SKIP_FETCH=true`.

When runtime schema refresh is enabled, the generation wrappers use a safer default refresh timeout and support overrides through `OPENAPI_REFRESH_TIMEOUT_MS` or `--refresh-timeout-ms`.

## Layer Boundaries

- `generated/server-openapi`: generator-owned HTTP SDK output
- `adapter-wukongim`: handwritten WuKongIM integration layer
- `composed`: handwritten app SDK layer that combines HTTP APIs with realtime adapters

Repeated generation must never overwrite `adapter-wukongim` or `composed`.
