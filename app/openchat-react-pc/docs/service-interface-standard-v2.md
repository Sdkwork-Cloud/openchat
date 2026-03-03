# OpenChat Service Interface Standard v2

## 1. Goal

Define a single service boundary for every module interaction so the implementation can evolve from `mock -> http -> sdk` without changing page or hook call sites.

## 2. Scope

Applies to every package under `packages/sdkwork-openchat-pc-*` that has `src/pages` and/or `src/hooks`.

## 3. Mandatory Rules

1. Every functional module must provide `src/services`.
2. Every module service layer must provide `src/services/index.ts` as the only stable import entry for intra-module UI calls.
3. Page and hook code should call service APIs only and should not call `fetch` directly.
4. Package public API (`src/index.ts`) should expose service exports directly or via `export * from "./services";`.
5. Service implementation details (storage/network/sdk fallback) stay inside `src/services/*`.
6. Every business module service directory must include `src/services/sdk-adapter.ts` as the SDK integration reservation point.

## 4. Layering Standard

```text
pages/hooks
  -> services/index.ts (module service boundary)
    -> service implementation files (*.service.ts, *Service.ts, *.api.ts, *.client.ts)
      -> sdk adapter / http client / storage
```

## 5. Standard Service File Layout

```text
src/
  services/
    index.ts                 # stable barrel entry
    xxx.service.ts           # interaction service implementation
    sdk-adapter.ts           # required reservation for SDK bridge
```

## 6. Naming Standard (target)

1. Preferred file naming: `xxx.service.ts`.
2. Existing `XxxService.ts` files can remain during migration, but new files should use `xxx.service.ts`.
3. Keep backward compatibility while migrating; do not break current imports in one step.

## 7. SDK Integration Reservation

Each module service should be swappable without UI changes. Recommended pattern:

1. `services/index.ts` exports stable API.
2. SDK specific logic lives in `sdk-adapter.ts` or equivalent adapter file.
3. Service methods should avoid leaking transport-specific response shape to pages/hooks.

## 8. Recursive Audit Standard

Use the automated audit command:

```bash
pnpm run audit:services
```

Generate the module-by-module conformance matrix:

```bash
pnpm run report:services
```

Audit checks:

1. package with `src/pages` must have `src/services`
2. `src/services/index.ts` must exist
3. package `src/index.ts` should export service API
4. pages/hooks should not call `fetch` directly
5. pages/hooks importing `../services/<file>` are treated as errors
6. business modules must include `src/services/sdk-adapter.ts`

## 9. Current Unreasonable Points in Existing Standard

1. `ServiceResult` only has `success/data/error` and does not enforce typed error code or metadata.
2. Service contract definitions are duplicated in `contracts` and `commons`, which increases drift risk.
3. Service entry style is inconsistent across modules (`services/index.ts` missing in many packages before this iteration).
4. Package-level service exports are inconsistent, making SDK integration points unclear.

## 9.1 ServiceResult Enhancement (Backward Compatible)

`@sdkwork/openchat-pc-contracts` now extends `ServiceResult` with:

1. `errorCode` for machine-readable failure classification
2. `errorDetail` for structured error payload
3. `meta` for tracing and source attribution (`sdk/http/local/mock`)

Legacy fields `success/data/error` remain supported.

## 10. Confirmation Required

Before the next hardening iteration, these decisions should be confirmed:

1. Should `@sdkwork/openchat-pc-contracts` become the single source of truth for service contracts (and `commons` stop duplicating contract files)?
2. Should direct `../services/<file>` imports from pages/hooks be upgraded to `../services` in this round, even if it touches many files?
3. Should `XxxService.ts` be renamed to `xxx.service.ts` now (breaking change risk), or handled as gradual migration with compatibility exports?

## 11. Iteration Decisions (2026-03-02)

1. `contracts` is now treated as the canonical source for service/component contract types.
2. Page and hook imports have been normalized to `../services` barrel imports.
3. Service naming normalization has started with non-breaking file alignment:
   - `terminalService.ts -> terminal.service.ts`
   - `rtc-sdk-abstract.ts -> sdk-adapter.ts`
   - `messageQueue.service.ts -> message-queue.service.ts`
4. SDK reservation adapters have been added to business modules that previously lacked `src/services/sdk-adapter.ts`.

## 12. Runtime Contract Iteration (2026-03-02, Round 2)

### 12.1 Landed in this round

1. Added standardized `ServiceResult<T>` adapter exports for:
   - `@sdkwork/openchat-pc-settings` -> `SettingsResultService`
   - `@sdkwork/openchat-pc-creation` -> `CreationResultService`
   - `@sdkwork/openchat-pc-drive` -> `FileResultService`
   - `@sdkwork/openchat-pc-tools` -> `ToolsResultService`
   - `@sdkwork/openchat-pc-auth` -> `AuthResultService`
2. Kept legacy service APIs unchanged to avoid breaking existing pages/hooks.
3. Unified machine-readable error mapping to `ServiceErrorCode` with metadata:
   - `meta.source` (`http`, `http-or-mock`, `local`, `sdk`)
   - `meta.timestamp`
4. Audit/report scripts now include runtime-contract dimensions (`ServiceResult` API presence), with phased strict enforcement for priority modules.

### 12.2 Proposed v2.1 standard (for confirmation)

1. Every business package must expose a legacy-compatible API and a standardized API:
   - Legacy: existing service API (no breaking change)
   - Standardized: `*ResultService` returning `ServiceResult<T>`
2. `ServiceResult<T>` should be the default contract for new page/hook interactions.
3. `errorCode` is mandatory on failures in standardized APIs.
4. `meta.source` and `meta.timestamp` are mandatory in standardized APIs.
5. Runtime-contract enforcement should be phased:
   - Phase A: strict for `auth/settings/creation/drive/tools`
   - Phase B (current): strict for all business packages with `src/pages` or `src/hooks`
   - Phase C: deprecate non-standard returns in new code paths

### 12.3 Remaining unreasonable points

1. Current `meta.source` is free-form (`string` accepted), which can cause value drift.
   - Proposed: narrow to enum-like union and add lint/audit whitelist.
2. `ServiceResult.success=true` does not enforce `data` presence.
   - Proposed: introduce a stricter discriminated union in v3 while retaining v2 compatibility.
3. Error code mapping still exists in duplicated form in early-adopted modules (`auth/settings/creation/drive/tools`).
   - Round 3 introduced shared runtime adapter in `@sdkwork/openchat-pc-contracts`, but legacy adapters have not all been migrated yet.
   - Proposed: migrate all existing hand-written adapters to shared proxy/mapper in next round.

### 12.4 Full-Scope Rollout (2026-03-02, Round 3)

1. Added standardized result adapter services to remaining business modules:
   - `agent`, `appstore`, `commerce`, `contacts`, `device`, `discover`
   - `im`, `notification`, `rtc`, `skill`, `social`, `terminal`
   - `tool`, `video`, `wallet`
2. Audit rule upgraded: all business modules now require `ServiceResult` API presence in `src/services`.
3. Report matrix now marks all business modules as strict runtime-contract scope (`*`).

## 13. Recovery + Unification Round (2026-03-02, Round 4)

### 13.1 Landed in this round

1. Rebuilt corrupted core service files and recovered readable UTF-8 source for:
   - `auth.service.ts`
   - `SettingsService.ts`
   - `CreationService.ts`
   - `FileService.ts`
   - `ToolsService.ts`
2. Added/confirmed standardized `*ResultService` adapters using `createServiceResultProxy`:
   - `AuthResultService`
   - `SettingsResultService`
   - `CreationResultService`
   - `FileResultService`
   - `ToolsResultService`
3. Kept legacy API compatibility for page/hook callers while exposing standardized runtime-contract APIs.
4. Added local-state fallback hardening for non-browser/test environments (memory fallback when `localStorage` is unavailable or throws).
5. Validation complete:
   - `pnpm run audit:services`
   - `pnpm run report:services`
   - `pnpm run typecheck`
   - `pnpm run typecheck:packages`
   - `pnpm run test`
   - `pnpm run build`

### 13.2 Newly identified unreasonable points

1. Legacy service responses still use mixed fields (`message` and `error`) with no strict semantic split.
   - Risk: cross-module ambiguity and inconsistent UI error handling.
2. Sync and async methods are mixed in the same service objects.
   - Risk: caller assumptions drift (`await` vs direct return) in future refactors.
3. `sdk-adapter.ts` reservation is structurally present, but callable SDK capability contract is not standardized (currently only `isAvailable()` in many modules).
   - Risk: each module may invent a different SDK handoff contract.
4. Base (legacy) services do not always emit typed machine-readable error codes; only standardized result proxies guarantee contract-level normalization.
   - Risk: legacy call sites remain weakly typed on failure behavior.

## 14. Proposed Standard v2.2 (for confirmation)

1. Two-tier API stays mandatory during migration:
   - Tier A: Legacy API for backward compatibility.
   - Tier B: `*ResultService` for strict `ServiceResult<T>`.
2. Define transitional legacy response shape explicitly:
   - success path: `success=true`, optional `data`, optional `message`
   - failure path: `success=false`, required `error`, optional `message`
3. Define semantic split:
   - `error` = canonical failure text for logic and logging
   - `message` = optional UI-friendly hint only
4. `*ResultService` remains the only required contract source for new module interactions; new page/hook features should default to Tier B.
5. `sdk-adapter.ts` baseline interface should be standardized:
   - required: `kind`, `isAvailable()`
   - reserved extension: `invoke(method, payload)` (optional in v2.2, required in v3)
6. For local-state service modules, test-safe fallback is mandatory:
   - storage read/write must gracefully degrade to in-memory when `localStorage` is unavailable.

## 15. Confirmation Required (Round 4)

1. Should we enforce `error` as required on all legacy failure responses in next iteration?
2. Should all new pages/hooks switch to `*ResultService` by default starting now, leaving legacy only for existing paths?
3. Should we lock `sdk-adapter.ts` to a shared callable contract (`invoke`) in v2.2, or defer mandatory enforcement to v3?

## 16. Unified Iteration (2026-03-02, Round 5)

### 16.1 Landed in this round

1. `ServiceResult<T>` now preserves backward-compatible transition fields:
   - `message?: string`
   - `code?: number | string`
2. Shared runtime adapter (`createServiceResultProxy`) now preserves legacy `message/code` while normalizing result/error metadata.
3. Priority module page-level async interactions switched to `*ResultService`:
   - `settings` (`SettingsPage` -> `SettingsResultService`)
   - `creation` (`CreationPage` -> `CreationResultService`)
   - `drive` (`CloudDrivePage` -> `FileResultService`)
   - `tools` (`ToolsPage` -> `ToolsResultService`)
4. Audit/report scripts now include priority rule:
   - Async boundary calls in those modules must not use legacy `XxxService` directly.

### 16.2 Refined standard semantics

1. Keep dual API during migration:
   - Legacy service for sync local helpers and compatibility paths.
   - `*ResultService` as default for async interaction contracts.
2. Preserve transition compatibility in normalized results (`message/code`) to avoid breaking old UI rendering logic.
3. Future hardening can progressively tighten this to strict discriminated unions in v3.

### 16.3 Newly surfaced unreasonable point (needs confirmation)

1. Enforcing `*ResultService` on every sync utility call (formatters/state-only getters) would add noise and degrade readability with little resilience gain.
   - Proposal: enforce `*ResultService` first on async interaction calls, keep sync utility calls compatible during v2.x.

## 17. Recursive Rollout (2026-03-02, Round 6)

### 17.1 Landed in this round

1. Expanded async-interaction `*ResultService` usage to additional business modules:
   - `discover` (`DiscoverPage` -> `DiscoverResultService`)
   - `wallet` (`WalletPage` -> `WalletResultService`)
   - `notification` (`NotificationsPage` -> `NotificationResultService`)
   - `social` (`MomentsPage` -> `MomentsResultService`)
   - `video` (`ShortVideoPage` -> `VideoResultService`)
2. Kept sync utility/local-state helpers on legacy services for compatibility and readability (e.g. `formatCount`, favorite/recent local methods).
3. Upgraded audit/report priority rules to include the 5 modules above.

### 17.2 Proposed enforcement expansion

1. Current priority async-result enforcement now covers 9 modules:
   - `settings/creation/drive/tools/discover/wallet/notification/social/video`
2. Next candidate expansion (pending confirmation):
   - `commerce/device/skill/tool/agent/terminal`

## 18. Recursive Rollout (2026-03-02, Round 7)

### 18.1 Landed in this round

1. Expanded async-interaction `*ResultService` usage to:
   - `commerce` (`MallPage` + `ShoppingCartPage`)
   - `device` (`DeviceListPage` + `DeviceDetailPage`)
   - `terminal` (`TerminalPage`)
2. Audit/report priority rules now include these modules and verify async boundary calls are result-service-first.
3. Kept compatibility strategy unchanged:
   - sync/session helper methods still allowed on legacy services where appropriate.

### 18.2 Remaining recursive targets

1. `skill` (pages + selector component)
2. `tool` (pages + selector component)
3. `agent` (pages + chat/memory components)
4. Optional later hardening: `auth` hooks/pages special path migration

## 19. Recursive Rollout (2026-03-02, Round 8)

### 19.1 Landed in this round

1. Expanded async-interaction `*ResultService` usage to remaining target modules:
   - `skill`:
     - `SkillMarketPage`
     - `SkillDetailPage`
     - `MySkillsPage`
     - `SkillSelector`
   - `tool`:
     - `ToolMarketPage`
     - `ToolConfigPage`
     - `MyToolsPage`
     - `ToolSelector`
   - `agent`:
     - `AgentMarketPage`
     - `AgentDetailPage`
     - `AgentChat`
     - `MemoryPanel`
2. Added priority async-result enforcement rules for:
   - `sdkwork-openchat-pc-skill`
   - `sdkwork-openchat-pc-tool`
   - `sdkwork-openchat-pc-agent`
3. Kept compatibility strategy:
   - local sync helper methods (favorite/recent/opened marks and local state utilities) remain on legacy services in v2.x.

### 19.2 Newly surfaced unreasonable points (needs confirmation)

1. `streamMessage` style callback APIs may hide runtime failures from `ServiceResult` because errors are consumed by callbacks and not always thrown.
   - Proposal: introduce a v2.3 standard for callback-stream contracts:
     - either throw on terminal stream error
     - or return terminal status object (`{ done, errorCode, errorMessage }`) that proxy can normalize.
2. Current audit rule only scans `pages/hooks` for async legacy usage, while this round already migrated key `components`.
   - Proposal: add staged `components` scanning for priority modules in next round to avoid false positives during broad rollout.

## 20. Recursive Rollout (2026-03-02, Round 9)

### 20.1 Landed in this round

1. Expanded async-interaction `*ResultService` usage to `search` component boundary:
   - `SearchPalette` now uses `SearchResultService` for async interactions.
2. Added `SearchResultService` runtime adapter:
   - `search-result.service.ts` with `createServiceResultProxy`.
3. Updated `search` service exports and package entry exports:
   - service barrel now exports both `SearchService` and `SearchResultService`.
4. Audit/report priority rules now include:
   - `sdkwork-openchat-pc-search` (`SearchService -> SearchResultService`)
5. Async legacy-call enforcement scope upgraded for priority modules:
   - scan target expanded from `pages/hooks` to `pages/hooks/components`.

### 20.2 Standard refinement (v2.3 draft)

1. Priority module async boundaries are defined as:
   - `pages`
   - `hooks`
   - `components`
2. Legacy service async calls are forbidden in that boundary set when a `*ResultService` exists.
3. Sync local helper methods remain compatible with legacy service usage in v2.x.

## 21. Recursive Rollout (2026-03-02, Round 10)

### 21.1 Landed in this round

1. Closed async interaction gaps in `auth/im` boundary files:
   - `auth`:
     - `hooks/useAuth.ts` async interactions switched to `AuthResultService`.
     - `pages/RegisterPage.tsx` async verification/register calls switched to `AuthResultService`.
   - `im`:
     - `hooks/useConversations.ts` switched to `ConversationResultService`.
     - `hooks/useMessages.ts` switched to `MessageResultService`.
     - `components/CreateGroupModal.tsx` switched to `GroupResultService`.
     - `components/SDKProvider.tsx` switched to `MessageResultService.registerMessageEventListeners`.
2. Upgraded audit/report async legacy detection:
   - detection no longer only matches `await XxxService.method(...)`.
   - now also matches function-style legacy calls: `await legacyFn(...)`.
3. Added new priority modules for async-result enforcement:
   - `sdkwork-openchat-pc-auth`
   - `sdkwork-openchat-pc-im`

### 21.2 Newly surfaced unreasonable point (needs confirmation)

1. Strictly forcing every `rtc` hook call through `RTCResultService` is currently low ROI and may reduce lifecycle clarity:
   - `rtc` uses singleton service + callback-driven session/media state.
   - wrapping every call into `ServiceResult` at hook layer adds adaptation noise, but does not improve core reliability if session lifecycle remains callback-first.
2. Proposal:
   - keep `rtc` in v2.x as architecture exception for hook-level direct singleton calls;
   - require `ServiceResult` normalization at external async boundaries (`pages/components`) and network-facing paths first;
   - revisit full `rtc` resultification in v3 with lifecycle contract redesign.

### 21.3 Proposed v2.4 standard wording

1. Priority async-boundary rule (mandatory):
   - In `pages/hooks/components`, all `await` interactions with module services must go through `*ResultService`.
2. Detection rule (mandatory):
   - Audit must block both:
     - `await LegacyService.xxx(...)`
     - `await legacyFunction(...)` (when imported from service barrel/deep service).
3. Exception rule (temporary, explicit):
   - Singleton lifecycle domains (current: `rtc`) may keep hook-level direct service calls in v2.x, but must be tracked as explicit exception entries in standard/report.

## 22. Unified Rollout (2026-03-03, Round 11)

### 22.1 Landed in this round

1. Tightened package-level service boundary exports:
   - Updated module entry exports to use `./services` barrel (no deep `./services/*` exports) for:
     - `appstore`
     - `contacts`
     - `agent`
     - `skill`
     - `tool`
     - `rtc`
2. Removed repository-layer external exposure from `rtc` package entry:
   - `src/index.ts` no longer exports `./repositories/rtc.repository` APIs.
3. Fixed component-level deep import boundary issue:
   - `contacts/components/GroupDetail.tsx` now imports from `../services` barrel instead of deep service file.
4. Added strict SDK adapter contract coverage for previously exempt modules:
   - `auth/services/sdk-adapter.ts`
   - `rtc/services/sdk-adapter.ts`
   - both now expose standardized `SDKAdapterBridge + registerSDKAdapter/getSDKAdapter` reservation contract.
5. Switched `appstore` async UI interactions to standardized result contract:
   - `AppStorePage` / `AppStoreDetailPage` async calls now use `AppstoreResultService`.
6. Upgraded audit/report rule set:
   - component boundary checks are now included whenever a module has interactive boundary (`pages/hooks`) and `components`;
   - `src/index.ts` must export service API via `./services` barrel for business modules;
   - business modules are blocked from exporting repository APIs in `src/index.ts`;
   - repository-layer imports are blocked outside `services/repositories`;
   - `appstore` added to async result-service enforcement priority.

### 22.2 Newly surfaced unreasonable point (needs confirmation)

1. `createServiceResultProxy` currently discards non-`data` success payload fields from legacy result objects.
   - Example risk:
     - legacy return: `{ success: true, removedGroup: true }`
     - normalized result: `{ success: true, data: undefined }`
   - This can break migration for modules that rely on custom success fields while still using legacy shape.
2. Proposal (v2.5 candidate):
   - When legacy success result has no `data` but has extra fields, preserve full payload:
     - option A: `data = legacyPayload`
     - option B: `meta.legacyPayload = legacyPayload` and keep `data` unchanged
   - Recommended: option A (more practical for progressive migration).

### 22.3 Confirmation required (Round 11)

1. Do you agree to change `normalizeServiceResult` success semantics to preserve legacy extra fields (recommended option A)?
2. After that change, should we migrate `contacts` async UI paths to `ContactResultService` in the next round?
3. Should we elevate current index-barrel/repository-export rules from project-level standard to mandatory CI gate?
