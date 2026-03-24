---
layout: home

hero:
  name: OpenChat
  text: IM Server, OpenAPI, and SDK Workspace
  tagline: Send messages over HTTP, keep realtime delivery on WuKongIM, and generate app-facing SDKs from the runtime OpenAPI contract.
  image:
    src: /logo.svg
    alt: OpenChat
  actions:
    - theme: brand
      text: Quick Start
      link: /en/guide/quickstart
    - theme: alt
      text: App API
      link: /en/api/
    - theme: alt
      text: Admin API
      link: /en/admin-api/
    - theme: alt
      text: SDK Docs
      link: /en/sdk/

features:
  - title: HTTP + WuKongIM Architecture
    details: Message submission uses HTTP APIs, while client long connections and inbound realtime delivery stay on WuKongIM SDKs.
  - title: Split OpenAPI Contracts
    details: App APIs live under /im/v3 and admin control-plane APIs live under /admin/im/v3, each with its own OpenAPI 3.x export.
  - title: Safe Regeneration Boundary
    details: SDKWORK Generator only writes into generated/server-openapi. Handwritten WuKongIM adapters and composed SDK layers remain protected.
  - title: AI-ready Message/Event Model
    details: The message envelope supports media resources, RTC signaling, event payloads, and future game or agent data expansion.
---

## Runtime Endpoints

- App Swagger UI: `http://localhost:3000/im/v3/docs`
- App OpenAPI JSON: `http://localhost:3000/im/v3/openapi.json`
- Admin Swagger UI: `http://localhost:3000/admin/im/v3/docs`
- Admin OpenAPI JSON: `http://localhost:3000/admin/im/v3/openapi.json`

## Start Modes

::: code-group

```bash [Full runtime]
npm ci
npm run start:dev
```

```bash [Schema-only runtime]
npm ci
npm run start:openapi
```

```powershell [Generate SDKs]
powershell -ExecutionPolicy Bypass -File .\sdkwork-im-sdk\bin\generate-sdk.ps1
```

:::

## Contract Rules

- app SDK generation must consume `/im/v3/openapi.json`
- `sdkwork-im-sdk` does not include admin APIs
- generator output is limited to `generated/server-openapi`
- `adapter-wukongim` and `composed` remain handwritten
- runtime OpenAPI is the source of truth; checked-in snapshots are derived

## Documentation Entry Points

- App API Reference: [/en/api/](/en/api/)
- Admin API Reference: [/en/admin-api/](/en/admin-api/)
- SDK Documentation: [/en/sdk/](/en/sdk/)
- OpenAPI and SDK Standard: [IM OpenAPI And SDK Standard](./im-openapi-sdk-standard.md)
- SDK Workspace Guide: `sdkwork-im-sdk/README.md`

## Verification

```bash
npm run lint:types
npm run build
npm test -- test/sdkwork-im-sdk/openapi-runtime-server.spec.ts test/sdkwork-im-sdk/ensure-openapi-runtime.spec.ts test/sdkwork-im-sdk/workspace-docs.spec.ts --runInBand
```
