# IM API Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land a production-grade frontend/admin API split with `/im/v3` and `/admin/im/v3`, runtime OpenAPI 3.x docs, and clean controller boundaries for RTC and WuKongIM.

**Architecture:** Replace the old single global IM prefix with wrapper modules mounted by route composition. Split mixed RTC and WuKongIM controllers into dedicated frontend/admin controllers, generate separate Swagger documents for each surface, and keep health, metrics, websocket, and webhook routes outside the frontend/admin prefixes.

**Tech Stack:** NestJS, TypeScript, `@nestjs/swagger`, `@nestjs/core` RouterModule, Jest

---

## File Structure Map

- Create: `docs/superpowers/specs/2026-03-23-im-api-surface-design.md`
- Create: `docs/superpowers/plans/2026-03-23-im-api-surface-implementation.md`
- Create: `src/common/http/im-api-surface.constants.ts`
- Create: `src/common/http/im-api-surface.constants.spec.ts`
- Create: `src/modules/rtc/rtc-app.controller.ts`
- Create: `src/modules/rtc/rtc-admin.controller.ts`
- Create: `src/modules/rtc/rtc-app-api.module.ts`
- Create: `src/modules/rtc/rtc-admin-api.module.ts`
- Create: `src/modules/rtc/rtc-core.module.ts`
- Create: `src/modules/wukongim/wukongim-app.controller.ts`
- Create: `src/modules/wukongim/wukongim-admin.controller.ts`
- Create: `src/modules/wukongim/wukongim-app-api.module.ts`
- Create: `src/modules/wukongim/wukongim-admin-api.module.ts`
- Create: `src/modules/wukongim/wukongim-core.module.ts`
- Create: `src/api/im-app-api.module.ts`
- Create: `src/api/im-admin-api.module.ts`
- Create: `src/api/im-app/im-app-identity-api.module.ts`
- Create: `src/api/im-app/im-app-messaging-api.module.ts`
- Create: `src/api/im-app/im-app-realtime-api.module.ts`
- Create: `src/api/im-app/im-app-automation-api.module.ts`
- Create: `src/api/im-app/im-app-integration-api.module.ts`
- Create: `src/api/im-app/im-app-social-api.module.ts`
- Create: `src/api/im-admin/im-admin-im-server-api.module.ts`
- Create: `src/api/im-admin/im-admin-realtime-api.module.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/app.module.ts`
- Create: `src/api/im-app-api.module.spec.ts`
- Create: `src/api/im-admin-api.module.spec.ts`
- Modify: `src/modules/rtc/rtc.controller.spec.ts`
- Modify: `src/modules/wukongim/*` tests if needed
- Modify: `sdkwork-im-sdk/docs/*` docs that describe OpenAPI source URLs

### Task 1: Lock the new API surface constants with tests

**Files:**

- Create: `src/common/http/im-api-surface.constants.ts`
- Create: `src/common/http/im-api-surface.constants.spec.ts`

- [ ] **Step 1: Write the failing test**

Add tests for:

- app prefix equals `im/v3`
- admin prefix equals `admin/im/v3`
- app docs/json URLs equal `/im/v3/docs` and `/im/v3/openapi.json`
- admin docs/json URLs equal `/admin/im/v3/docs` and `/admin/im/v3/openapi.json`

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/common/http/im-api-surface.constants.spec.ts --runInBand`

Expected: FAIL because the constants file does not exist.

- [ ] **Step 3: Implement the constants**

Create a single source of truth for prefixes, docs URLs, JSON URLs, and route exclusions used by bootstrap.

- [ ] **Step 4: Re-run the test**

Run: `npm test -- src/common/http/im-api-surface.constants.spec.ts --runInBand`

Expected: PASS

### Task 2: Split RTC responsibilities

**Files:**

- Create: `src/modules/rtc/rtc-app.controller.ts`
- Create: `src/modules/rtc/rtc-admin.controller.ts`
- Create: `src/modules/rtc/rtc-core.module.ts`
- Create: `src/modules/rtc/rtc-app-api.module.ts`
- Create: `src/modules/rtc/rtc-admin-api.module.ts`
- Modify: `src/modules/rtc/rtc.controller.spec.ts`

- [ ] **Step 1: Write failing controller-boundary tests**

Add tests proving:

- app RTC controller exposes end-user room/token/record APIs
- admin RTC controller exposes channel/provider admin APIs
- admin-only methods are not present on the app controller

- [ ] **Step 2: Run the RTC spec to verify it fails**

Run: `npm test -- src/modules/rtc/rtc.controller.spec.ts --runInBand`

Expected: FAIL because the split controllers/modules do not exist yet.

- [ ] **Step 3: Implement the split**

Move the shared service to a reusable core module and register separate app/admin controller modules.

- [ ] **Step 4: Re-run the RTC spec**

Run: `npm test -- src/modules/rtc/rtc.controller.spec.ts --runInBand`

Expected: PASS

### Task 3: Split WuKongIM responsibilities

**Files:**

- Create: `src/modules/wukongim/wukongim-app.controller.ts`
- Create: `src/modules/wukongim/wukongim-admin.controller.ts`
- Create: `src/modules/wukongim/wukongim-core.module.ts`
- Create: `src/modules/wukongim/wukongim-app-api.module.ts`
- Create: `src/modules/wukongim/wukongim-admin-api.module.ts`
- Add tests under `src/modules/wukongim/` if no focused spec exists

- [ ] **Step 1: Write failing controller-boundary tests**

Cover:

- app WuKongIM controller only exposes config/token bootstrap APIs
- admin WuKongIM controller owns channel/subscriber/system operations

- [ ] **Step 2: Run the focused spec to verify it fails**

Run: `npm test -- src/modules/wukongim/wukongim-api-split.spec.ts --runInBand`

Expected: FAIL because the new controllers/modules do not exist.

- [ ] **Step 3: Implement the split**

Register separate app/admin WuKongIM modules and keep webhook routes outside both wrappers.

- [ ] **Step 4: Re-run the focused spec**

Run: `npm test -- src/modules/wukongim/wukongim-api-split.spec.ts --runInBand`

Expected: PASS

### Task 4: Wire wrapper modules and dual Swagger docs

**Files:**

- Create: `src/api/im-app-api.module.ts`
- Create: `src/api/im-admin-api.module.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write a failing bootstrap surface test**

Add tests for:

- frontend docs URL path
- admin docs URL path
- frontend and admin document builders use separate module include lists
- startup info prints the new URLs

- [ ] **Step 2: Run the bootstrap-focused spec to verify it fails**

Run: `npm test -- src/common/http/im-api-surface.constants.spec.ts src/modules/rtc/rtc.controller.spec.ts src/modules/wukongim/wukongim-api-split.spec.ts --runInBand`

Expected: FAIL before bootstrap and wrapper modules are updated.

- [ ] **Step 3: Implement routing and Swagger wiring**

Mount app wrapper module under `/im/v3`, admin wrapper module under `/admin/im/v3`, and expose:

- `/im/v3/docs`
- `/im/v3/openapi.json`
- `/admin/im/v3/docs`
- `/admin/im/v3/openapi.json`

- [ ] **Step 4: Re-run the focused specs**

Run: `npm test -- src/common/http/im-api-surface.constants.spec.ts src/modules/rtc/rtc.controller.spec.ts src/modules/wukongim/wukongim-api-split.spec.ts --runInBand`

Expected: PASS

### Task 5: Split top-level app/admin composition into dedicated surface bundles

**Files:**

- Create: `src/api/im-app/im-app-identity-api.module.ts`
- Create: `src/api/im-app/im-app-messaging-api.module.ts`
- Create: `src/api/im-app/im-app-realtime-api.module.ts`
- Create: `src/api/im-app/im-app-automation-api.module.ts`
- Create: `src/api/im-app/im-app-integration-api.module.ts`
- Create: `src/api/im-app/im-app-social-api.module.ts`
- Create: `src/api/im-admin/im-admin-im-server-api.module.ts`
- Create: `src/api/im-admin/im-admin-realtime-api.module.ts`
- Create: `src/api/im-app-api.module.spec.ts`
- Create: `src/api/im-admin-api.module.spec.ts`
- Modify: `src/api/im-app-api.module.ts`
- Modify: `src/api/im-admin-api.module.ts`

- [ ] **Step 1: Write the failing module-topology tests**

Cover:

- `ImAppApiModule` imports only app surface bundles
- `ImAdminApiModule` imports only admin surface bundles

- [ ] **Step 2: Run the topology tests to verify they fail**

Run: `npm test -- src/api/im-app-api.module.spec.ts src/api/im-admin-api.module.spec.ts --runInBand`

Expected: FAIL because the bundle modules do not exist yet.

- [ ] **Step 3: Implement the bundle modules**

Split app/admin composition into focused submodules so top-level surfaces remain small and evolvable.

- [ ] **Step 4: Re-run the topology tests**

Run: `npm test -- src/api/im-app-api.module.spec.ts src/api/im-admin-api.module.spec.ts --runInBand`

Expected: PASS

### Task 6: Sync SDK-facing documentation

**Files:**

- Modify: `sdkwork-im-sdk/docs/overview.md`
- Modify: `sdkwork-im-sdk/docs/generator-standard.md`
- Modify: `sdkwork-im-sdk/README.md`

- [ ] **Step 1: Update docs**

State that:

- app SDK generation should consume `/im/v3/openapi.json`
- admin schema is separate at `/admin/im/v3/openapi.json`
- WuKongIM adapters remain handwritten and outside generator-owned directories

- [ ] **Step 2: Re-read the docs for consistency**

Confirm they match the new runtime URLs and do not re-couple generated and handwritten layers.

### Task 7: Final verification

**Files:**

- Verify all touched files

- [ ] **Step 1: Run the focused unit tests**

Run: `npm test -- src/common/http/im-api-surface.constants.spec.ts src/modules/rtc/rtc.controller.spec.ts src/modules/wukongim/wukongim-api-split.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 2: Run SDK workspace tests**

Run: `npm test -- test/sdkwork-im-sdk --runInBand`

Expected: PASS

- [ ] **Step 3: Run type checking**

Run: `npm run lint:types`

Expected: PASS

- [ ] **Step 4: Inspect final diff**

Verify that:

- app and admin routes are cleanly separated
- Swagger docs are runtime-accessible
- root operational endpoints remain stable
- SDK docs point to the frontend schema URL
