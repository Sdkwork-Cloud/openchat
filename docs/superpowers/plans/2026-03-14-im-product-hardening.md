# IM Product Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the most visible capability gaps in the OpenChat IM backend by adding message reactions, editable messages, conversation drafts, and realtime typing indicators without regressing the existing WukongIM-backed delivery and sync path.

**Architecture:** Extend the existing `message`, `conversation`, and `ws` layers instead of inventing new modules. Persist durable state in PostgreSQL for reactions, message edits, and drafts; keep typing indicators ephemeral in WebSocket events only. Reuse the existing permission model, event envelope helpers, and conversation/message ownership checks so the new features fit the current API surface and telemetry model.

**Tech Stack:** NestJS 11, TypeORM 0.3, Jest, Socket.IO gateway, PostgreSQL patch flow, WukongIM integration.

---

## Chunk 1: Feature Audit and Data Model

### Task 1: Add durable state for reactions

**Files:**
- Create: `src/modules/message/message-reaction.entity.ts`
- Modify: `src/modules/message/message.module.ts`
- Modify: `src/app.module.ts`
- Modify: `src/data-source.ts`
- Create: `database/patches/20260314_add_chat_message_reactions.sql`

- [ ] **Step 1: Write failing tests for reaction aggregation and toggle semantics**
- [ ] **Step 2: Add the reaction entity and SQL patch**
- [ ] **Step 3: Wire the entity into TypeORM registration**
- [ ] **Step 4: Run targeted reaction tests until green**

### Task 2: Expose existing draft and edit fields as real product features

**Files:**
- Modify: `src/modules/conversation/conversation.interface.ts`
- Modify: `src/modules/conversation/conversation.service.ts`
- Modify: `src/modules/conversation/conversation.controller.ts`
- Modify: `src/modules/message/message.interface.ts`
- Modify: `src/modules/message/dto/message.dto.ts`
- Modify: `src/modules/message/message.service.ts`
- Modify: `src/modules/message/message.controller.ts`

- [ ] **Step 1: Write failing tests for conversation draft persistence**
- [ ] **Step 2: Write failing tests for edit-window, ownership, and recalled-message protections**
- [ ] **Step 3: Implement draft update/clear APIs**
- [ ] **Step 4: Implement message edit API with `editedAt` and edit metadata**
- [ ] **Step 5: Run targeted message/conversation tests until green**

## Chunk 2: Realtime Interaction Layer

### Task 3: Add websocket typing indicators

**Files:**
- Modify: `src/gateways/ws.gateway.ts`
- Create: `src/gateways/services/ws-typing-indicator.service.ts`
- Create: `src/gateways/services/ws-typing-indicator.service.spec.ts`

- [ ] **Step 1: Write failing websocket tests for direct-chat and group typing events**
- [ ] **Step 2: Implement validated `typingStart` and `typingStop` handlers**
- [ ] **Step 3: Emit ephemeral events only to authorized recipients/rooms**
- [ ] **Step 4: Re-run targeted gateway tests until green**

### Task 4: Add websocket/API fanout for reactions and edits

**Files:**
- Modify: `src/gateways/services/ws-message-event-emitter.service.ts`
- Modify: `src/modules/message/message-event-envelope.util.ts`
- Modify: `src/modules/message/message.service.ts`
- Modify: `src/modules/message/message.controller.ts`

- [ ] **Step 1: Write failing tests for reaction and edit event payloads**
- [ ] **Step 2: Emit durable update events after successful reaction/edit mutations**
- [ ] **Step 3: Keep event payloads aligned with existing message event envelope structure**
- [ ] **Step 4: Re-run targeted service/controller/gateway tests until green**

## Chunk 3: Verification

### Task 5: Prove the new IM capability set is stable

**Files:**
- Test: `src/modules/message/message.service.spec.ts`
- Test: `src/modules/message/message.controller.spec.ts`
- Test: `src/modules/conversation/conversation.service.spec.ts`
- Test: `src/modules/conversation/conversation.controller.spec.ts`
- Test: `src/gateways/ws.gateway.spec.ts`

- [ ] **Step 1: Run focused Jest paths for touched modules**
- [ ] **Step 2: Run a broader backend verification pass if the focused tests are green**
- [ ] **Step 3: Document any intentionally deferred feature gaps**

## Deferred on Purpose

- Full threaded conversation model with reply trees, per-thread unread state, and thread subscriptions
- Message bookmarking/pinning collections
- Conversation archive/folder model

These remain valuable, but the chosen four features fit the current codebase cleanly and close more daily-use gaps per line of risk than attempting a blind full thread system in one pass.
