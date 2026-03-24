# SDKWork IM SDK Architecture Design

**Date:** 2026-03-23

**Status:** Approved for autonomous execution

**Scope:** Standardize the `sdkwork-im-sdk` workspace for OpenAPI 3.x contract export, schema-driven documentation, SDKWORK Generator multi-language SDK generation, and isolated WuKongIM integration modules.

## 1. Goals

The workspace must satisfy these non-negotiable goals:

1. The server HTTP contract is owned by an OpenAPI 3.x source of truth.
2. SDK generation is driven by SDKWORK Generator, not by handwritten HTTP clients.
3. Generated code and handwritten WuKongIM integration code are permanently separated.
4. Re-generation must never delete or overwrite WuKongIM integration modules.
5. TypeScript and Flutter provide composed realtime SDKs by combining generated OpenAPI clients with WuKongIM adapters.
6. Every publishable SDK module ships cross-platform scripts for Windows, Linux, and macOS.
7. The architecture remains high-cohesion and low-coupling so each layer can evolve independently.

## 2. Source Inputs

### 2.1 OpenAPI Standard

- Authority specification version: `OpenAPI 3.2.0`
- Authority document path: `sdkwork-im-sdk/openapi/openchat-im.openapi.yaml`
- SDK generator compatibility document path: `sdkwork-im-sdk/openapi/openchat-im.sdkgen.yaml`

Decision:

- `openchat-im.openapi.yaml` is the only authority contract.
- `openchat-im.sdkgen.yaml` is a derived document used only for SDKWORK Generator compatibility when generator support lags behind the latest OAS features.

### 2.2 Schema Registry

- Schema registry root: `sdkwork-im-sdk/schemas/`
- JSON Schema family: schema files must be JSON Schema based and reusable from OpenAPI via `$ref`

Required schema groups:

- `schemas/message/`
- `schemas/event/`
- `schemas/rtc/`
- `schemas/game/`
- `schemas/common/`

### 2.3 Generator Source

- External generator root: `D:\javasource\spring-ai-plus\spring-ai-plus-business\sdk\sdkwork-sdk-generator`
- Generator invocation must use the external implementation directly.
- The current repository must not vendor or fork that generator into `openchat-server`.

## 3. Workspace Topology

The `sdkwork-im-sdk` directory is a workspace, not a single SDK package.

```text
sdkwork-im-sdk/
  openapi/
    openchat-im.openapi.yaml
    openchat-im.sdkgen.yaml
  schemas/
    common/
    message/
    event/
    rtc/
    game/
  bin/
    generate-sdk.sh
    generate-sdk.ps1
    prepare-openapi-source.mjs
    verify-sdk-boundary.mjs
    assemble-sdk.mjs
  docs/
    overview.md
    architecture.md
    generator-standard.md
    wukongim-adapter-standard.md
    compatibility-matrix.md
  sdkwork-im-sdk-typescript/
    generated/
      server-openapi/
    adapter-wukongim/
    composed/
  sdkwork-im-sdk-flutter/
    generated/
      server-openapi/
    adapter-wukongim/
    composed/
  sdkwork-im-sdk-python/
    generated/
      server-openapi/
  sdkwork-im-sdk-go/
    generated/
      server-openapi/
  sdkwork-im-sdk-java/
    generated/
      server-openapi/
  sdkwork-im-sdk-kotlin/
    generated/
      server-openapi/
  sdkwork-im-sdk-swift/
    generated/
      server-openapi/
  sdkwork-im-sdk-csharp/
    generated/
      server-openapi/
```

## 4. Language Strategy

### 4.1 Official Generator Targets

SDKWORK Generator currently supports:

- `typescript`
- `python`
- `go`
- `java`
- `kotlin`
- `swift`
- `flutter`
- `csharp`

### 4.2 Directory Naming Decision

Formal generated targets must use generator-native language identities:

- `sdkwork-im-sdk-kotlin`
- `sdkwork-im-sdk-swift`

Existing directories:

- `sdkwork-im-sdk-android`
- `sdkwork-im-sdk-ios`

must be treated as compatibility wrappers or documentation entry points, not generator output targets.

Reason:

- The generator emits Kotlin and Swift projects, not Android- or iOS-specific outputs.
- Aligning workspace naming with generator capability avoids permanent conceptual drift.

## 5. Layering Rules

Each language workspace is divided into strict ownership layers.

### 5.1 `generated/server-openapi`

Purpose:

- Store SDKWORK Generator output for server HTTP APIs only.

Rules:

- Entirely generator-owned.
- May be deleted and recreated by generation scripts.
- Must not contain handwritten WuKongIM or business composition logic.
- Must ship generated `README.md` and generator-provided publish scripts.

### 5.2 `adapter-wukongim`

Purpose:

- Store handwritten realtime adapter logic for WuKongIM.

Rules:

- Handwritten only.
- Must never be generation targets.
- Must depend only on stable shared protocol models and the official WuKongIM SDK.
- Must not directly own the generated HTTP API client surface.

TypeScript adapter:

- wraps `wukongimjssdk`
- handles connection, token bootstrap, reconnection, message receipt, ack, subscription, event bridge

Flutter adapter:

- wraps `wukongimfluttersdk`
- handles the same realtime responsibilities in Flutter/Dart

### 5.3 `composed`

Purpose:

- Expose the final product SDK for client developers by combining generated HTTP APIs and WuKongIM adapters.

Rules:

- Handwritten composition layer.
- Depends on `generated/server-openapi` and `adapter-wukongim`.
- Must not contain generated HTTP client code.

Examples of composed APIs:

- `sendMessageByHttp()`
- `connectRealtime()`
- `subscribeMessages()`
- `sendTransientEvent()`
- `syncPersistentEvents()`

## 6. Message and Event Standard

### 6.1 Top-Level Send Envelope

HTTP message sending preserves the approved structure:

```json
{
  "version": 2,
  "conversation": {
    "type": "SINGLE",
    "targetId": "user_1001"
  },
  "message": {
    "type": "TEXT",
    "text": {}
  },
  "event": {}
}
```

### 6.2 Message Rules

- `message` is for media-oriented content.
- `type` is uppercase at the transport boundary.
- Resource payloads live under explicit media keys such as `text`, `image`, `video`, `file`, `location`.

### 6.3 Event Rules

- `event` is for actions, state transitions, signaling, gameplay, and other extensible payloads.
- `event.deliveryMode` is required and must be one of:
  - `PERSISTENT`
  - `TRANSIENT`

Meaning:

- `PERSISTENT`: `HTTP -> server storage -> WuKongIM delivery`
- `TRANSIENT`: realtime path only, no default persistence

### 6.4 Event Categories

Standard primary categories:

- `RTC_SIGNAL`
- `RTC_STATE`
- `GAME_ACTION`
- `GAME_STATE`
- `ROOM_STATE`
- `MESSAGE_EVENT`
- `USER_EVENT`
- `SYSTEM_EVENT`
- `CUSTOM_EVENT`

### 6.5 AI-Era Extensibility

Both `message` and `event` envelopes must reserve:

- `metadata`
- `aiContext`
- `trace`
- `schemaRef`

This ensures forward compatibility for AI summarization, moderation, semantic enrichment, indexing, replay, and analytics.

## 7. Script Standard

### 7.1 Workspace-Level Scripts

The workspace root must provide:

- `sdkwork-im-sdk/bin/generate-sdk.sh`
- `sdkwork-im-sdk/bin/generate-sdk.ps1`
- `sdkwork-im-sdk/bin/prepare-openapi-source.mjs`
- `sdkwork-im-sdk/bin/verify-sdk-boundary.mjs`
- `sdkwork-im-sdk/bin/assemble-sdk.mjs`

Responsibilities:

- export or refresh source schema
- derive `sdkgen` input
- resolve a unified SDK version
- generate all target languages
- verify output boundaries
- assemble composed SDK modules

### 7.2 Language Workspace Scripts

Each language workspace must provide:

- `bin/sdk-gen.sh`
- `bin/sdk-gen.ps1`
- `bin/sdk-assemble.sh`
- `bin/sdk-assemble.ps1`

Optional Windows convenience:

- `bin/sdk-gen.bat`

### 7.3 Publish Scripts

Every publishable package must provide:

- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

This applies to:

- generated publishable packages
- handwritten `adapter-wukongim` packages
- handwritten `composed` packages

## 8. Generation Flow

The generation workflow is fixed:

1. Refresh or export the authority OpenAPI input.
2. Derive `openchat-im.sdkgen.yaml`.
3. Resolve one workspace version for the current release.
4. Call SDKWORK Generator once per supported language.
5. Write output only into `generated/server-openapi`.
6. Verify boundaries.
7. Assemble composed SDK modules.

No generation step may target a language workspace root directly.

## 9. Boundary Enforcement

Boundary enforcement is mandatory.

### 9.1 Ownership Markers

Generated directories should include an ownership marker such as:

- `.sdkwork-generated`

Handwritten directories should include:

- `.manual-owned`

### 9.2 CI Rules

CI must fail if:

- generation writes outside `generated/server-openapi`
- generation changes `adapter-wukongim`
- generation changes `composed`
- authority OpenAPI changes without refreshed generated SDK output
- schema registry changes without refreshed documentation artifacts

## 10. Documentation Standard

### 10.1 Workspace Docs

Required workspace docs:

- `docs/overview.md`
- `docs/architecture.md`
- `docs/generator-standard.md`
- `docs/wukongim-adapter-standard.md`
- `docs/compatibility-matrix.md`

### 10.2 Per-Language Docs

Each language workspace requires:

- `README.md`
- `ARCHITECTURE.md`
- `REGENERATION.md`
- `COMPATIBILITY.md`

TypeScript and Flutter additionally require:

- `REALTIME.md`
- `EVENTS.md`

### 10.3 Documentation Rules

Every SDK doc set must state:

- what is generated
- what is handwritten
- which directories cannot be edited manually
- how regeneration works
- how `PERSISTENT` and `TRANSIENT` events differ
- which WuKongIM SDK version is integrated

## 11. Product Matrix

### 11.1 Universal Product

All supported languages provide:

- `server-openapi sdk`

### 11.2 Realtime Product

Only TypeScript and Flutter initially provide:

- `composed realtime sdk`

Reason:

- They have clear official WuKongIM SDK integration paths.
- For other languages, forcing realtime support now would create shallow or misleading abstractions.

## 12. Recommended Initial Implementation Scope

Initial execution should deliver:

1. workspace-level OpenAPI and schema directories
2. workspace-level generation and verification scripts
3. TypeScript split into `generated`, `adapter-wukongim`, `composed`
4. Flutter split into `generated`, `adapter-wukongim`, `composed`
5. placeholder generated workspaces for Python, Go, Java, Kotlin, Swift, C#
6. workspace documentation and per-language architecture/regeneration docs

This produces a stable foundation without overcommitting realtime support to unsupported platforms.

## 13. Implementation Notes

- Existing handwritten TypeScript SDK code should be treated as migration input, not as the future architecture.
- `sdkwork-im-sdk-android` and `sdkwork-im-sdk-ios` should remain present only as compatibility wrappers or documentation entry points unless the generator gains direct support for Android/iOS-specific outputs later.
- WuKongIM integration optimization must happen independently inside `adapter-wukongim`, never inside generated HTTP code.

## 14. Final Decision Summary

The best architecture for this repository is:

- authority OpenAPI 3.2.0 contract
- derived SDK generator compatibility contract
- schema registry for message/event/rtc/game models
- generator-owned `generated/server-openapi`
- handwritten `adapter-wukongim`
- handwritten `composed`
- TypeScript and Flutter as first-class realtime SDKs
- all other languages as OpenAPI-generated HTTP SDKs first

This is the highest-confidence structure for long-term maintainability, safe regeneration, and independent WuKongIM evolution.
