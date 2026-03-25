# OpenChat Admin SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `sdkwork-im-admin-sdk`, generate the TypeScript admin SDK from `/admin/im/v3/openapi.json`, migrate `openchat-admin` onto it, and publish a matching admin SDK integration skill.

**Architecture:** Mirror the `sdkwork-im-sdk` generation workflow at the workspace/bin level, but keep the admin workspace lean: one generator-owned TypeScript HTTP layer plus one handwritten composed facade that also bridges `/im/v3/auth/*` through the generated app backend SDK.

**Tech Stack:** NestJS runtime OpenAPI export, SDKWORK generator, TypeScript, Vite/Vitest, local Codex skills

---

### Task 1: Lock the Frontend Integration Boundary

**Files:**
- Create: `app/openchat-admin/src/services/admin-sdk-integration.test.ts`
- Modify: `app/openchat-admin/package.json`

- [ ] Add a failing guard test that rejects raw `/admin/im/v3` calls in `admin-api.ts`.
- [ ] Add a failing guard that requires the admin app to depend on `@openchat/sdkwork-im-admin-sdk`.
- [ ] Run the focused frontend test to confirm the current code is still red.

### Task 2: Create the Admin SDK Workspace

**Files:**
- Create: `sdkwork-im-admin-sdk/README.md`
- Create: `sdkwork-im-admin-sdk/.gitignore`
- Create: `sdkwork-im-admin-sdk/.gitattributes`
- Create: `sdkwork-im-admin-sdk/bin/*`
- Create: `sdkwork-im-admin-sdk/docs/*`
- Create: `sdkwork-im-admin-sdk/openapi/*`
- Create: `sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/README.md`
- Create: `sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/bin/*`
- Create: `sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/composed/*`

- [ ] Mirror the root generation wrappers and boundary verification pattern from `sdkwork-im-sdk`.
- [ ] Configure the admin workspace to consume `/admin/im/v3/openapi.json`.
- [ ] Add a TypeScript composed package that depends on the generated admin package and generated app auth package.

### Task 3: Generate the Admin TypeScript SDK

**Files:**
- Modify: `sdkwork-im-admin-sdk/openapi/openchat-im-admin.openapi.yaml`
- Modify: `sdkwork-im-admin-sdk/openapi/openchat-im-admin.sdkgen.yaml`
- Create or refresh: `sdkwork-im-admin-sdk/sdkwork-im-admin-sdk-typescript/generated/server-openapi/*`
- Modify: `sdkwork-im-admin-sdk/.sdkwork-assembly.json`

- [ ] Run the admin workspace generation wrapper against the runtime schema.
- [ ] Assemble workspace metadata and compatibility docs.
- [ ] Verify repeated generation stays inside generator-owned paths.

### Task 4: Migrate `openchat-admin` to the Admin SDK

**Files:**
- Modify: `app/openchat-admin/src/services/admin-api.ts`
- Modify: `app/openchat-admin/src/services/api.client.ts`
- Modify: `app/openchat-admin/src/store/auth.store.ts`
- Modify: `app/openchat-admin/package-lock.json`

- [ ] Replace admin control-plane fetch calls with `@openchat/sdkwork-im-admin-sdk`.
- [ ] Route login/logout/current-user through generated SDK-backed auth helpers.
- [ ] Keep only UI-local normalization helpers in the app.
- [ ] Re-run the frontend guard test and full admin app test/build.

### Task 5: Publish the Admin SDK Skill

**Files:**
- Create: `C:/Users/admin/.codex/skills/sdkwork-im-admin-sdk-real-logic/SKILL.md`
- Create: `C:/Users/admin/.codex/skills/sdkwork-im-admin-typescript-sdk-real-logic/SKILL.md`

- [ ] Capture the admin-specific generated-SDK rules in a broad workspace skill and a TypeScript-focused skill.
- [ ] Make the skill explicitly forbid raw `/admin/im/v3/*` HTTP when a generated path exists.
- [ ] Verify the instructions point admin web work to `sdkwork-im-admin-sdk` instead of `sdkwork-im-sdk`.

### Task 6: Verification

**Files:**
- Test: `app/openchat-admin/src/services/admin-sdk-integration.test.ts`

- [ ] Run the focused frontend red/green test.
- [ ] Run admin SDK package build/typecheck.
- [ ] Run `app/openchat-admin` lint, test, and build.
- [ ] Run the smallest credible backend verification needed after schema regeneration.
