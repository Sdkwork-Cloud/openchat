# RTC Connection Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an app-facing RTC connection-info API that aggregates provider bootstrap, WuKongIM realtime bootstrap, and RTC signaling metadata, then expose the same capability through the TypeScript and Flutter IM SDKs.

**Architecture:** Keep server contract generation-owned through `/im/v3/openapi.json`, but keep WuKongIM/RTC handwritten integration code outside generated output. The server aggregates room, RTC token, provider client config, signaling hints, and realtime bootstrap into one response so SDKs can bootstrap calls consistently.

**Tech Stack:** NestJS, Swagger/OpenAPI 3.x, Jest, TypeScript IM SDK, Flutter composed SDK, WuKongIM, Volcengine RTC.

---

### Task 1: Server contract tests

**Files:**
- Modify: `src/modules/rtc/rtc.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Add controller tests for:
- `POST /rtc/rooms/:id/connection` behavior through `RtcAppController`
- room participant authorization
- passthrough of token generation options
- aggregated response containing `room`, `rtcToken`, `providerConfig`, `signaling`, and `realtime`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/rtc/rtc.controller.spec.ts`
Expected: FAIL because `RtcAppController` does not yet expose the connection endpoint.

- [ ] **Step 3: Write minimal implementation**

Add DTOs, service aggregation, controller endpoint, and module wiring needed for the new API.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/rtc/rtc.controller.spec.ts`
Expected: PASS

### Task 2: TypeScript SDK tests

**Files:**
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/test/unit/openchat-client-rtc-orchestration.test.ts`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/test/unit/openchat-client-rtc-init.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests for:
- `ApiService.getRTCConnectionInfo(roomId, options)`
- `client.rtc.getConnectionInfo(roomId, options)`
- `client.rtc.prepareCall(roomId, options)` initializing RTC from server connection info

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sdkwork-im-sdk/sdkwork-im-sdk-typescript/test/unit/openchat-client-rtc-orchestration.test.ts sdkwork-im-sdk/sdkwork-im-sdk-typescript/test/unit/openchat-client-rtc-init.test.ts`
Expected: FAIL because the new wrapper methods do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Extend the handwritten TypeScript SDK only in non-generated files.

- [ ] **Step 4: Run test to verify it passes**

Run: same command as Step 2
Expected: PASS

### Task 3: Flutter composed RTC wrapper

**Files:**
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/lib/src/rtc_module.dart`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/lib/src/types.dart`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/README.md`

- [ ] **Step 1: Add composed-layer models and wrapper**

Implement a manual composed-layer `connectionInfo` API using generated client if available or `rawHttpClient` as fallback.

- [ ] **Step 2: Keep generator boundary intact**

Do not edit `generated/server-openapi` by hand. Regenerate only if needed after the server contract is ready.

- [ ] **Step 3: Run lightweight verification**

Run: `dart format composed/lib/src/rtc_module.dart composed/lib/src/types.dart`
Expected: files format cleanly

### Task 4: Docs and verification

**Files:**
- Modify: `docs/zh/sdk/typescript.md`
- Modify: `docs/zh/sdk/flutter.md`
- Modify: `docs/zh/api-reference` or existing RTC docs as needed
- Modify: `docs/en/...` matching RTC/SDK docs if parity is maintained

- [ ] **Step 1: Document the endpoint and SDK usage**

Cover:
- server endpoint purpose
- Volcengine client bootstrap fields
- WuKongIM realtime bootstrap
- RTC signaling conventions over `event.type = RTC_SIGNAL`

- [ ] **Step 2: Run verification**

Run:
- `npm test -- src/modules/rtc/rtc.controller.spec.ts`
- `npm test -- sdkwork-im-sdk/sdkwork-im-sdk-typescript/test/unit/openchat-client-rtc-orchestration.test.ts sdkwork-im-sdk/sdkwork-im-sdk-typescript/test/unit/openchat-client-rtc-init.test.ts`
- `npm run lint:types`

Expected: targeted tests pass and typecheck passes
