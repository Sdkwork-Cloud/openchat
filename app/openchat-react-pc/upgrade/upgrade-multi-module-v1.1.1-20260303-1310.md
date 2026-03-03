# Upgrade Requirement - Multi Module Service v1.1.1 (20260303-1310)

## 1. Scope
This document defines incremental SDK upgrade requirements for OpenChat PC business modules.

Goals:
1. Keep service boundaries clear and progressive.
2. Integrate with SDK definitions in `sdkwork-sdk-app` without modifying SDK source.
3. Deliver OpenAPI 3.x contracts for unimplemented APIs so another agent can implement them.

Hard constraints:
1. Do not modify files under `sdkwork-sdk-app/sdkwork-app-sdk-*`.
2. All upgrade requirements must be contract-first and OpenAPI 3.x compliant.
3. Existing online flows must remain backward compatible.

## 2. Implemented In Current Iteration
App-side integration was completed in:
- `packages/sdkwork-openchat-pc-kernel/src/foundation/apiClient.ts`
- `packages/sdkwork-openchat-pc-commons/src/foundation/apiClient.ts`

Integration strategy:
1. Legacy endpoint to SDK endpoint mapping.
2. SDK-first request strategy.
3. Three-level fallback for deployment compatibility:
   - direct SDK path: `/app/v3/api/...`
   - gateway SDK path: `/api/app/v3/api/...`
   - legacy path: `/api/...`

Runtime switches:
- `VITE_SDKWORK_APP_ENABLED`
- `VITE_SDKWORK_APP_API_PREFIX`

Client token strategy (application side):
- dual-token mode only: `Authorization: Bearer <authToken>` + `Access-Token: <accessToken>`
- `apiKey` mode is mutually exclusive and not used by the application client

## 3. Module Mapping Audit (Current)
Covered (full or partial):
- search
- appstore
- commerce/products
- cart
- notification
- settings (partial)
- discover (partial)
- social (partial)
- video (partial)
- wallet (partial)
- device (partial)

Missing and requires SDK/API contract upgrade:
- social: publish/delete/stats for moments
- video: view reporting and comments list aggregation
- wallet: summary/stats/transaction write/default payment/red packet
- device: detail/status/messages/control/stats
- settings: storage maintenance and model lifecycle management
- cart/commerce: count/select-all/selected-clean/recommended
- notification: unread-marking/stats/typed clear-read
- skill/tool/agent/memory: full minimal API domain

## 4. SDK Upgrade Contract Files
1. Requirement spec:
   - `/upgrade/upgrade-multi-module-v1.1.1-20260303-1310.md`
2. OpenAPI spec:
   - `/upgrade/upgrade-multi-module-v1.1.1-20260303-1310-openapi.yaml`

## 5. Proposed OpenAPI 3.x Standard
Mandatory:
1. Unified response envelope:
   - `success: boolean`
   - `code: string`
   - `message: string`
   - `requestId: string`
   - `timestamp: string(date-time)`
   - `data: object|array|null`
2. Unified pagination:
   - `content`, `total`, `page`, `size`, `totalPages`
3. Every operation must define stable `operationId`.
4. State-changing operations must support `Idempotency-Key`.
5. Security schemes must be explicit and mutually exclusive by mode:
   - application mode: `BearerAuth` + `AccessTokenAuth`
   - server mode: `ApiKeyAuth`

Recommended:
1. All enum fields must be declared in schema.
2. Error response model should be consistent for 4xx and 5xx.
3. Avoid endpoint semantic duplication across modules.

## 6. Unreasonable Parts In Existing Standard (Need Confirmation)
1. Token key ambiguity: historical storage uses multiple keys (`openchat_auth_data.token`, `token`, `auth_token`, `access_token`) with drifting semantics.
2. Pagination shape inconsistency: `content/list/items` coexist in existing APIs.
3. Idempotency inconsistency: some state-changing APIs do not require idempotency headers.
4. operationId instability risk: generated SDK method names may drift when operationId is missing or changed.

## 7. Confirmation Requests
Please confirm the following decisions before the SDK implementation agent starts:
1. Authentication mode decision is fixed:
   - application side must use dual-token mode (`authToken + accessToken`)
   - apiKey mode is mutually exclusive and reserved for non-application clients
2. Pagination normalization scope: all list APIs now, or only newly upgraded APIs?
3. Idempotency scope: mandatory for all POST/PUT/DELETE, or selected operations only?
4. operationId naming convention: enforce `{module}_{action}` globally?

## 8. Delivery Statement
1. SDK source code is unchanged.
2. Upgrade work is split into app integration and contract documents.
3. Missing APIs are intentionally delegated via OpenAPI 3.x artifact.
