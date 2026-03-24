# SDKWork IM SDK Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a production-grade `sdkwork-im-sdk` workspace with OpenAPI 3.x authority inputs, SDKWORK Generator wrappers, safe generated/manual boundaries, cross-platform scripts, and isolated WuKongIM adapter modules.

**Architecture:** The implementation creates a workspace-centered SDK system. OpenAPI and schema files live at the workspace root, generated server SDKs live under `generated/server-openapi`, realtime integration logic lives in handwritten `adapter-wukongim` modules, and final business-facing SDKs live in `composed`. Generation and publishing are script-driven with strict directory ownership enforcement.

**Tech Stack:** NestJS Swagger/OpenAPI, JSON Schema, Node.js scripts, PowerShell/Bash wrappers, SDKWORK Generator, TypeScript, Flutter/Dart.

---

## File Structure Map

**Create or modify these areas:**

- Create: `docs/superpowers/specs/2026-03-23-sdkwork-im-sdk-architecture-design.md`
- Create: `docs/superpowers/plans/2026-03-23-sdkwork-im-sdk-foundation.md`
- Create: `sdkwork-im-sdk/openapi/*`
- Create: `sdkwork-im-sdk/schemas/**/*`
- Create: `sdkwork-im-sdk/bin/*`
- Create: `sdkwork-im-sdk/docs/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/*`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-{python,go,java,kotlin,swift,csharp}/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/README.md`
- Optionally modify: `sdkwork-im-sdk/sdkwork-im-sdk-android/README.md`
- Optionally modify: `sdkwork-im-sdk/sdkwork-im-sdk-ios/README.md`
- Test: `test/sdkwork-im-sdk/*.spec.ts`

## Task 1: Create Workspace Contract And Documentation Skeleton

**Files:**

- Create: `sdkwork-im-sdk/openapi/README.md`
- Create: `sdkwork-im-sdk/openapi/openchat-im.openapi.yaml`
- Create: `sdkwork-im-sdk/openapi/openchat-im.sdkgen.yaml`
- Create: `sdkwork-im-sdk/schemas/common/README.md`
- Create: `sdkwork-im-sdk/schemas/message/README.md`
- Create: `sdkwork-im-sdk/schemas/event/README.md`
- Create: `sdkwork-im-sdk/schemas/rtc/README.md`
- Create: `sdkwork-im-sdk/schemas/game/README.md`
- Create: `sdkwork-im-sdk/docs/overview.md`
- Create: `sdkwork-im-sdk/docs/architecture.md`
- Create: `sdkwork-im-sdk/docs/generator-standard.md`
- Create: `sdkwork-im-sdk/docs/wukongim-adapter-standard.md`
- Create: `sdkwork-im-sdk/docs/compatibility-matrix.md`
- Modify: `sdkwork-im-sdk/README.md`

- [ ] **Step 1: Write a failing documentation-structure test**

```typescript
import { existsSync } from 'node:fs';

test('sdkwork-im-sdk workspace contains required design-time roots', () => {
  expect(existsSync('sdkwork-im-sdk/openapi')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/schemas')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/bin')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/docs')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/workspace-structure.spec.ts --runInBand`

Expected: FAIL because one or more workspace roots do not exist.

- [ ] **Step 3: Create the workspace docs and contract skeleton**

Add the root OpenAPI/schema/docs directories and seed them with explanatory README or starter files that reflect the approved architecture.

- [ ] **Step 4: Re-run the test**

Run: `npm test -- test/sdkwork-im-sdk/workspace-structure.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-sdkwork-im-sdk-architecture-design.md docs/superpowers/plans/2026-03-23-sdkwork-im-sdk-foundation.md sdkwork-im-sdk/README.md sdkwork-im-sdk/openapi sdkwork-im-sdk/schemas sdkwork-im-sdk/docs test/sdkwork-im-sdk/workspace-structure.spec.ts
git commit -m "docs(sdk): define sdkwork-im-sdk workspace standard"
```

## Task 2: Build Workspace-Level Generation Wrappers

**Files:**

- Create: `sdkwork-im-sdk/bin/generate-sdk.sh`
- Create: `sdkwork-im-sdk/bin/generate-sdk.ps1`
- Create: `sdkwork-im-sdk/bin/prepare-openapi-source.mjs`
- Create: `sdkwork-im-sdk/bin/verify-sdk-boundary.mjs`
- Create: `sdkwork-im-sdk/bin/assemble-sdk.mjs`
- Test: `test/sdkwork-im-sdk/prepare-openapi-source.spec.ts`
- Test: `test/sdkwork-im-sdk/verify-sdk-boundary.spec.ts`

- [ ] **Step 1: Write a failing test for OpenAPI source preparation**

```typescript
test('prepare-openapi-source chooses the requested local snapshot when refresh is unavailable', async () => {
  // invoke the script with a temporary base file and assert stdout returns that path
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/prepare-openapi-source.spec.ts --runInBand`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Write a failing boundary-enforcement test**

```typescript
test('verify-sdk-boundary fails when generation touches adapter-wukongim', async () => {
  // feed mocked changed paths and expect non-zero exit code
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/verify-sdk-boundary.spec.ts --runInBand`

Expected: FAIL because the script does not exist.

- [ ] **Step 5: Implement the workspace wrapper scripts**

Match the structure and UX of the existing `sdkwork-sdk-app` scripts while targeting:

- output roots under `sdkwork-im-sdk/sdkwork-im-sdk-*/generated/server-openapi`
- the external generator at `D:\javasource\spring-ai-plus\spring-ai-plus-business\sdk\sdkwork-sdk-generator`
- safe fallback to local OpenAPI snapshot files
- boundary verification before and after generation

- [ ] **Step 6: Re-run the script tests**

Run: `npm test -- test/sdkwork-im-sdk/prepare-openapi-source.spec.ts test/sdkwork-im-sdk/verify-sdk-boundary.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add sdkwork-im-sdk/bin test/sdkwork-im-sdk/prepare-openapi-source.spec.ts test/sdkwork-im-sdk/verify-sdk-boundary.spec.ts
git commit -m "feat(sdk): add sdkwork-im-sdk generation wrappers"
```

## Task 3: Create Language Workspace Skeletons

**Files:**

- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi/.sdkwork-generated`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/.manual-owned`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/.manual-owned`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi/.sdkwork-generated`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/.manual-owned`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/.manual-owned`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-{python,go,java,kotlin,swift,csharp}/generated/server-openapi/.sdkwork-generated`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/ARCHITECTURE.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/REGENERATION.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/COMPATIBILITY.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/ARCHITECTURE.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/REGENERATION.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/COMPATIBILITY.md`

- [ ] **Step 1: Write a failing test for workspace ownership markers**

```typescript
test('typescript and flutter workspaces declare generated and manual ownership boundaries', () => {
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi/.sdkwork-generated')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/.manual-owned')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/.manual-owned')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/workspace-ownership.spec.ts --runInBand`

Expected: FAIL

- [ ] **Step 3: Add the language workspace skeletons and ownership markers**

Ensure TypeScript and Flutter receive full three-layer workspaces and the other supported languages receive generated roots.

- [ ] **Step 4: Re-run the ownership test**

Run: `npm test -- test/sdkwork-im-sdk/workspace-ownership.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sdkwork-im-sdk/sdkwork-im-sdk-typescript sdkwork-im-sdk/sdkwork-im-sdk-flutter sdkwork-im-sdk/sdkwork-im-sdk-python sdkwork-im-sdk/sdkwork-im-sdk-go sdkwork-im-sdk/sdkwork-im-sdk-java sdkwork-im-sdk/sdkwork-im-sdk-kotlin sdkwork-im-sdk/sdkwork-im-sdk-swift sdkwork-im-sdk/sdkwork-im-sdk-csharp test/sdkwork-im-sdk/workspace-ownership.spec.ts
git commit -m "feat(sdk): create layered sdkwork-im-sdk language workspaces"
```

## Task 4: Add Cross-Platform Package Scripts

**Files:**

- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin/publish-core.mjs`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin/publish.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin/publish.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/bin/publish-core.mjs`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/bin/publish.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/bin/publish.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/bin/publish-core.mjs`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/bin/publish.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/bin/publish.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/bin/publish-core.mjs`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/bin/publish.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/bin/publish.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/bin/sdk-gen.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/bin/sdk-gen.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/bin/sdk-assemble.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/bin/sdk-assemble.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/bin/sdk-gen.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/bin/sdk-gen.ps1`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/bin/sdk-assemble.sh`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/bin/sdk-assemble.ps1`
- Test: `test/sdkwork-im-sdk/package-bin-scripts.spec.ts`

- [ ] **Step 1: Write a failing bin-script presence test**

```typescript
test('typescript adapter/composed modules expose publish scripts for all supported shells', () => {
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin/publish.sh')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin/publish.ps1')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin/publish-core.mjs')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/package-bin-scripts.spec.ts --runInBand`

Expected: FAIL

- [ ] **Step 3: Implement the per-package and per-language wrappers**

Reuse the existing `sdkwork-app-sdk-typescript/bin` conventions for argument flow and publish execution.

- [ ] **Step 4: Re-run the bin-script test**

Run: `npm test -- test/sdkwork-im-sdk/package-bin-scripts.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sdkwork-im-sdk/sdkwork-im-sdk-typescript/bin sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/bin sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/bin sdkwork-im-sdk/sdkwork-im-sdk-flutter/bin sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/bin sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/bin test/sdkwork-im-sdk/package-bin-scripts.spec.ts
git commit -m "feat(sdk): add cross-platform sdkwork-im-sdk package scripts"
```

## Task 5: Generate The First OpenAPI Language Outputs

**Files:**

- Modify: `sdkwork-im-sdk/openapi/openchat-im.openapi.yaml`
- Modify: `sdkwork-im-sdk/openapi/openchat-im.sdkgen.yaml`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-python/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-go/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-java/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-kotlin/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-swift/generated/server-openapi/*`
- Modify: `sdkwork-im-sdk/sdkwork-im-sdk-csharp/generated/server-openapi/*`

- [ ] **Step 1: Write a failing generation smoke test**

```typescript
test('sdk generation wrapper targets generated/server-openapi instead of workspace roots', async () => {
  // invoke the wrapper in dry/local mode and assert output paths are rooted under generated/server-openapi
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/generation-smoke.spec.ts --runInBand`

Expected: FAIL before wrapper generation behavior is finalized.

- [ ] **Step 3: Prepare or refresh the OpenAPI inputs**

Use a running server schema if available. Otherwise use a checked-in local snapshot path and derive the `sdkgen` document from it.

- [ ] **Step 4: Run the generator for all supported languages**

Run one of:

```bash
./sdkwork-im-sdk/bin/generate-sdk.sh
```

or

```powershell
.\sdkwork-im-sdk\bin\generate-sdk.ps1
```

Expected: generated SDKs are written only to `generated/server-openapi`.

- [ ] **Step 5: Re-run the generation smoke test**

Run: `npm test -- test/sdkwork-im-sdk/generation-smoke.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add sdkwork-im-sdk/openapi sdkwork-im-sdk/sdkwork-im-sdk-typescript/generated sdkwork-im-sdk/sdkwork-im-sdk-flutter/generated sdkwork-im-sdk/sdkwork-im-sdk-python/generated sdkwork-im-sdk/sdkwork-im-sdk-go/generated sdkwork-im-sdk/sdkwork-im-sdk-java/generated sdkwork-im-sdk/sdkwork-im-sdk-kotlin/generated sdkwork-im-sdk/sdkwork-im-sdk-swift/generated sdkwork-im-sdk/sdkwork-im-sdk-csharp/generated test/sdkwork-im-sdk/generation-smoke.spec.ts
git commit -m "feat(sdk): generate multi-language server-openapi sdk outputs"
```

## Task 6: Add TypeScript And Flutter Realtime Module Skeletons

**Files:**

- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/package.json`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src/index.ts`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/package.json`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src/index.ts`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/pubspec.yaml`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim/lib/openchat_wukongim_adapter.dart`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/pubspec.yaml`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed/lib/openchat_sdk.dart`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/REALTIME.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-typescript/EVENTS.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/REALTIME.md`
- Create: `sdkwork-im-sdk/sdkwork-im-sdk-flutter/EVENTS.md`
- Test: `test/sdkwork-im-sdk/realtime-module-skeleton.spec.ts`

- [ ] **Step 1: Write a failing realtime module skeleton test**

```typescript
test('typescript and flutter workspaces expose independent wukongim adapter and composed entrypoints', () => {
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim/src/index.ts')).toBe(true);
  expect(existsSync('sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed/src/index.ts')).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- test/sdkwork-im-sdk/realtime-module-skeleton.spec.ts --runInBand`

Expected: FAIL

- [ ] **Step 3: Add minimal adapter/composed module skeletons**

Keep them intentionally small but with clear boundaries and dependency direction.

- [ ] **Step 4: Re-run the realtime module skeleton test**

Run: `npm test -- test/sdkwork-im-sdk/realtime-module-skeleton.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sdkwork-im-sdk/sdkwork-im-sdk-typescript/adapter-wukongim sdkwork-im-sdk/sdkwork-im-sdk-typescript/composed sdkwork-im-sdk/sdkwork-im-sdk-typescript/REALTIME.md sdkwork-im-sdk/sdkwork-im-sdk-typescript/EVENTS.md sdkwork-im-sdk/sdkwork-im-sdk-flutter/adapter-wukongim sdkwork-im-sdk/sdkwork-im-sdk-flutter/composed sdkwork-im-sdk/sdkwork-im-sdk-flutter/REALTIME.md sdkwork-im-sdk/sdkwork-im-sdk-flutter/EVENTS.md test/sdkwork-im-sdk/realtime-module-skeleton.spec.ts
git commit -m "feat(sdk): add isolated realtime sdk module skeletons"
```

## Task 7: Run Final Verification

**Files:**

- Verify all files touched in previous tasks

- [ ] **Step 1: Run targeted SDK workspace tests**

Run: `npm test -- test/sdkwork-im-sdk --runInBand`

Expected: PASS

- [ ] **Step 2: Run type checking**

Run: `npm run lint:types`

Expected: PASS

- [ ] **Step 3: Re-read the spec and validate implementation alignment**

Checklist:

- generated and manual code are separated
- wrapper scripts exist for Windows and Unix shells
- TypeScript and Flutter have adapter/composed skeletons
- other languages have generated roots
- documentation explains regeneration and ownership

- [ ] **Step 4: Commit final integration adjustments**

```bash
git add docs/superpowers/specs/2026-03-23-sdkwork-im-sdk-architecture-design.md docs/superpowers/plans/2026-03-23-sdkwork-im-sdk-foundation.md sdkwork-im-sdk test/sdkwork-im-sdk
git commit -m "feat(sdk): establish sdkwork-im-sdk workspace foundation"
```
