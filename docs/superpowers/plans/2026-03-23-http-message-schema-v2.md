# HTTP Message Schema V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land a clear HTTP send schema with `version`, uppercase `type`, `conversation`, `message`, and `event`, while keeping server persistence and WuKongIM delivery stable.

**Architecture:** Accept the new transport schema at the controller boundary, normalize it into the existing lower-case internal message model, persist through the current `chat_messages` flow, and continue dispatching through WuKongIM. Use `SYSTEM` as the internal carrier for transport `event` payloads and preserve the original event envelope inside `content`.

**Tech Stack:** NestJS, TypeScript, class-validator, Jest, TypeORM, WuKongIM

---

### Task 1: Lock the new HTTP contract with controller tests

**Files:**

- Modify: `src/modules/message/message.controller.spec.ts`
- Test: `src/modules/message/message.controller.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add controller tests for:

- new `version + conversation + message` request normalization
- uppercase `conversation.type` and `message.type`
- `event` request normalization into internal send payload
- `message`/`event` mutual exclusion
- active payload matching `message.type`
- authenticated user overriding client `fromUserId`

- [ ] **Step 2: Run the controller spec to verify it fails**

Run: `npm test -- src/modules/message/message.controller.spec.ts --runInBand`
Expected: FAIL with missing normalization/validation for the new transport schema

- [ ] **Step 3: Implement the minimal production changes to pass**

Touch only the DTO/controller/media shape files needed by the tests.

- [ ] **Step 4: Re-run the controller spec**

Run: `npm test -- src/modules/message/message.controller.spec.ts --runInBand`
Expected: PASS

### Task 2: Add the new transport/resource schema

**Files:**

- Modify: `src/common/media-resource.ts`
- Modify: `src/modules/message/dto/message.dto.ts`
- Modify: `src/modules/message/message.interface.ts`
- Modify: `src/modules/im-provider/im-provider.interface.ts`

- [ ] **Step 1: Add failing type-level/runtime coverage if needed**

If controller tests alone do not force the schema additions, add the smallest extra test in message specs.

- [ ] **Step 2: Implement new transport/resource types**

Add:

- `TextMediaResource`
- `LocationMediaResource`
- transport DTOs for `conversation`, `message`, and `event`
- internal `content.event` support while keeping legacy fields usable

- [ ] **Step 3: Re-run affected message specs**

Run: `npm test -- src/modules/message/message.controller.spec.ts src/modules/message/message.service.spec.ts --runInBand`
Expected: PASS

### Task 3: Preserve persistence and WuKongIM dispatch behavior

**Files:**

- Modify: `src/modules/message/message.controller.ts`
- Modify: `src/modules/im-provider/providers/wukongim/wukongim.provider.ts`
- Modify: `src/modules/message/message.service.spec.ts` (only if dispatch/persistence needs coverage)

- [ ] **Step 1: Write the failing regression test if dispatch content changes**

Add a test only if needed to prove `event` content survives to the service/provider boundary.

- [ ] **Step 2: Implement normalization and compatibility behavior**

Ensure:

- new HTTP transport maps to existing service payload
- `event` is persisted and dispatched via internal `SYSTEM`
- legacy lower-case request shape continues to work

- [ ] **Step 3: Re-run focused specs**

Run: `npm test -- src/modules/message/message.controller.spec.ts src/modules/message/message.service.spec.ts --runInBand`
Expected: PASS

### Task 4: Final verification

**Files:**

- Modify: `docs/zh/api/messages.md` (only if time permits and contract examples need syncing)

- [ ] **Step 1: Run message-focused verification**

Run: `npm test -- src/modules/message/message.controller.spec.ts src/modules/message/message.service.spec.ts --runInBand`
Expected: PASS

- [ ] **Step 2: Run type-check for touched files**

Run: `npm run lint:types`
Expected: PASS

- [ ] **Step 3: Inspect git diff**

Run: `git diff -- src/common/media-resource.ts src/modules/message/dto/message.dto.ts src/modules/message/message.interface.ts src/modules/message/message.controller.ts src/modules/message/message.controller.spec.ts src/modules/message/message.service.spec.ts src/modules/im-provider/im-provider.interface.ts src/modules/im-provider/providers/wukongim/wukongim.provider.ts docs/superpowers/plans/2026-03-23-http-message-schema-v2.md`
Expected: Only message-schema-related changes
