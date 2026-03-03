# Upgrade Requirement - Auth Service v1.2.0 (20260303-1905)

## 1. Scope

This document defines auth-domain SDK upgrade requirements for OpenChat PC.

Goals:
1. Keep service boundaries clear and progressive.
2. Align client auth integration with `sdkwork-sdk-app` TypeScript definitions.
3. Provide OpenAPI 3.x contracts for auth gaps that are not fully covered by current SDK definitions.

Hard constraints:
1. Do not modify files under `sdkwork-sdk-app/sdkwork-app-sdk-*`.
2. Use dual-token mode on application client (`Authorization` + `Access-Token`).
3. Keep `ApiKeyAuth` mutually exclusive with dual-token mode.

## 2. Implemented In Current Iteration

App-side auth service integration now calls SDK-defined endpoints directly:

1. `POST /app/v3/api/auth/login`
2. `POST /app/v3/api/auth/register`
3. `POST /app/v3/api/auth/password/reset/request`
4. `POST /app/v3/api/auth/sms/send`
5. `POST /app/v3/api/auth/sms/verify`
6. `POST /app/v3/api/auth/refresh`
7. `POST /app/v3/api/auth/logout`
8. `PUT /app/v3/api/user/password`

Client env strategy:
1. Production: `VITE_API_BASE_URL=https://api.sdkwork.com`, `VITE_ACCESS_TOKEN=<token>`.
2. Non-production: `VITE_API_BASE_URL=https://api-dev.sdkwork.com`, `VITE_ACCESS_TOKEN=<token>`.

## 3. Missing / Unreasonable Parts (Need Upgrade)

1. Login response lacks mandatory IM bootstrap contract:
   - `imConfig.wsUrl`
   - `imConfig.uid`
   - `imConfig.token`
2. No atomic registration API that binds verification challenge and account creation in one transaction.
3. Password reset request response is not informative enough for robust client flow:
   - missing `challengeId`
   - missing `expiresAt`
   - missing normalized delivery channel metadata

## 4. Proposed Upgrade APIs

1. Extend login response payload:
   - `POST /auth/login` returns `login.data.imConfig`.
2. Add verified register API:
   - `POST /auth/register/verified`
3. Extend reset-request response payload:
   - `POST /auth/password/reset/request` returns challenge metadata.

Detailed API contracts are defined in:
- `/upgrade/upgrade-auth-v1.2.0-20260303-1905-openapi.yaml`

## 5. OpenAPI 3.x Standards

Mandatory:
1. Unified response envelope:
   - `success`, `code`, `message`, `requestId`, `timestamp`, `data`
2. Explicit security scheme combination:
   - app mode: `BearerAuth` + `AccessTokenAuth`
   - server mode: `ApiKeyAuth`
3. Stable `operationId` naming.
4. `Idempotency-Key` for state-changing endpoints.

Recommended:
1. Keep success `code=2000` for compatibility.
2. Declare enums for verification channel and flow type.
3. Preserve backward compatibility while enriching response payloads.

## 6. Confirmation Items

Please confirm:
1. Should `imConfig` be mandatory for all successful `/auth/login` responses?
2. Should verified registration be a new endpoint (`/auth/register/verified`) or an extension on `/auth/register`?
3. Should password reset request always return `challengeId` even when channel delivery is delayed?

## 7. Delivery Statement

1. SDK source code is unchanged.
2. This iteration includes app integration + contract artifacts only.
3. Upgrade implementation is delegated via OpenAPI 3.x documents.
