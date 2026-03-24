# IM API Surface Design

**Date:** 2026-03-23

**Status:** Approved for autonomous execution

**Scope:** Refactor the OpenChat server HTTP surface so that frontend IM APIs live under `/im/v3`, admin IM APIs live under `/admin/im/v3`, and both surfaces expose runtime-accessible OpenAPI 3.x documents without coupling generated SDK code to WuKongIM integration code.

## 1. Goals

The server must satisfy these goals:

1. Every frontend IM API route starts with `/im/v3`.
2. Every admin IM management API route starts with `/admin/im/v3`.
3. The running server exposes separate OpenAPI JSON and Swagger UI endpoints for frontend and admin surfaces.
4. Swagger generation remains compatible with the existing `sdkwork-im-sdk` generation workflow.
5. WuKongIM realtime integration stays logically independent from generated OpenAPI SDK outputs.
6. Root operational endpoints such as `/health`, `/metrics`, and inbound webhooks remain stable and are not polluted by the app/admin API prefixes.

## 2. Public API Surface

### 2.1 Frontend IM API

Official prefix:

- `/im/v3`

Official documentation:

- `/im/v3/docs`
- `/im/v3/openapi.json`

Audience:

- mobile apps
- web apps
- desktop apps
- generated frontend SDKs

Typical domains:

- auth
- users
- friends
- messages
- groups
- conversations
- contacts
- app-facing RTC
- bot and agent integrations
- timeline and other app-facing business flows
- WuKongIM connection bootstrap endpoints

### 2.2 Admin IM API

Official prefix:

- `/admin/im/v3`

Official documentation:

- `/admin/im/v3/docs`
- `/admin/im/v3/openapi.json`

Audience:

- IM server operators
- control-plane tooling
- internal admin consoles

Typical domains:

- WuKongIM server management
- RTC provider/channel management
- RTC provider stats and health

## 3. Routing Strategy

The old single global prefix `im/api/v1` is removed. The new routing model uses module-level route composition instead of one global prefix.

Decision:

- Use route wrapper modules for the two official API surfaces.
- Mount frontend wrapper modules under `/im/v3`.
- Mount admin wrapper modules under `/admin/im/v3`.
- Keep root operational modules outside those wrappers.

Reason:

- A single global prefix cannot represent two clean API surfaces.
- Wrapper modules let Swagger generate frontend and admin contracts independently.
- This keeps route ownership explicit and prevents accidental admin endpoints from leaking into frontend SDKs.

## 4. Controller Boundary Rules

Controllers must not mix frontend and admin responsibilities.

## 4.1 API Composition Module Topology

The app/admin route split is not only a prefix split. It must also be a composition-module split.

Required topology:

- `ImAppApiModule`
  - `ImAppIdentityApiModule`
  - `ImAppMessagingApiModule`
  - `ImAppRealtimeApiModule`
  - `ImAppAutomationApiModule`
  - `ImAppIntegrationApiModule`
  - `ImAppSocialApiModule`
- `ImAdminApiModule`
  - `ImAdminImServerApiModule`
  - `ImAdminRealtimeApiModule`

Reason:

- The top-level app/admin modules stay small and stable.
- Business growth happens inside focused surface bundles instead of turning `ImAppApiModule` into a new monolith.
- Admin-only evolution remains isolated inside admin bundles.

### 4.2 RTC

Split the current mixed RTC controller into:

- frontend RTC controller
- admin RTC controller

Frontend RTC includes:

- room lifecycle for end users
- participant operations
- token generation and validation for permitted users
- recording operations scoped to room participants
- provider capability discovery for runtime SDK integration

Admin RTC includes:

- channel configuration CRUD
- provider stats
- provider health reports

### 4.3 WuKongIM

Split the current mixed WuKongIM controller into:

- frontend WuKongIM controller
- admin WuKongIM controller

Frontend WuKongIM includes:

- client connection config
- user token bootstrap

Admin WuKongIM includes:

- server/channel management operations
- subscriber management
- system health and system info
- legacy direct IM control operations that are control-plane oriented

### 4.4 Webhooks

Webhook controllers remain outside app/admin route wrappers:

- `/webhook/wukongim`
- `/webhook/rtc/volcengine`

Reason:

- They are inbound machine endpoints, not frontend SDK surfaces.

## 5. OpenAPI Strategy

Two OpenAPI documents are generated at runtime from the running Nest application.

### 5.1 Frontend OpenAPI

- title: `OpenChat IM App API`
- scope: frontend wrapper modules only
- output paths:
  - `/im/v3/docs`
  - `/im/v3/openapi.json`

### 5.2 Admin OpenAPI

- title: `OpenChat IM Admin API`
- scope: admin wrapper modules only
- output paths:
  - `/admin/im/v3/docs`
  - `/admin/im/v3/openapi.json`

Required behavior:

- OpenAPI JSON must be directly fetchable by SDK generation tooling.
- Swagger UI must point to the matching JSON endpoint.
- Frontend and admin docs must not leak each other’s paths.

## 6. SDK Generation Boundary

The frontend SDK pipeline consumes only the frontend OpenAPI surface.

Rules:

- Generated HTTP SDK code is sourced from the frontend OpenAPI document.
- Admin API contracts are separate and must not be mixed into app-facing SDK packages.
- WuKongIM adapter code remains handwritten and external to generator-owned directories.
- Server OpenAPI generation must never overwrite handwritten WuKongIM integration modules.

## 7. Startup Observability

Startup logs must print the new runtime contract addresses:

- server base URL
- frontend docs URL
- frontend OpenAPI JSON URL
- admin docs URL
- admin OpenAPI JSON URL
- frontend prefix `/im/v3`
- admin prefix `/admin/im/v3`
- websocket endpoint

## 8. Testing Requirements

Minimum verification:

1. route and doc constants resolve to the new prefixes
2. frontend Swagger document only includes frontend modules
3. admin Swagger document only includes admin modules
4. mixed RTC and WuKongIM responsibilities are split into separate controllers
5. startup output references the new docs and prefixes

## 9. Final Decision Summary

The best-fit architecture is:

- no single global IM API prefix
- wrapper modules for frontend and admin API surfaces
- split mixed RTC and WuKongIM controllers into focused frontend/admin controllers
- dual runtime OpenAPI 3.x documents
- frontend SDK generation sourced from `/im/v3/openapi.json`
- admin API documented separately under `/admin/im/v3/openapi.json`

This gives the server a clean API contract, keeps SDK generation safe, and preserves independent WuKongIM optimization paths.
