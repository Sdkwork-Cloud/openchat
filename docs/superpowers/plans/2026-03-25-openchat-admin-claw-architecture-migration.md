# OpenChat Admin Claw Architecture Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/openchat-admin` as a `claw-studio`-style pnpm workspace with `opencat-admin-*` packages while preserving the existing OpenChat super-admin feature set and admin SDK integration.

**Architecture:** The host package becomes a thin Vite entrypoint that mounts a shell package. The shell owns providers, routes, layout, sidebar, and theme. Core owns auth/session/runtime state and the admin SDK boundary. UI and business features are split into focused packages with one clear responsibility each.

**Tech Stack:** pnpm workspace, React, Vite, Tailwind CSS v4, Zustand, TanStack Query, React Router, i18next, Vitest, `@openchat/sdkwork-im-admin-sdk`

---

### Task 1: Add Architecture Contract Checks

**Files:**
- Create: `app/openchat-admin/scripts/check-opencat-admin-structure.mjs`
- Create: `app/openchat-admin/scripts/check-opencat-admin-route-surface.mjs`
- Modify: `app/openchat-admin/package.json`

- [ ] **Step 1: Write the failing architecture checks**
- [ ] **Step 2: Run the contract scripts and confirm they fail against the current single-package app**
- [ ] **Step 3: Wire root scripts for `check:arch` and `check:routes`**
- [ ] **Step 4: Re-run the scripts and keep them failing until the new structure exists**

### Task 2: Scaffold the Workspace Root

**Files:**
- Create: `app/openchat-admin/pnpm-workspace.yaml`
- Create: `app/openchat-admin/tsconfig.base.json`
- Modify: `app/openchat-admin/package.json`
- Create: `app/openchat-admin/scripts/run-workspace-tsc.mjs`

- [ ] **Step 1: Replace root scripts with pnpm workspace orchestration**
- [ ] **Step 2: Add workspace package globs for `packages/opencat-admin-*`**
- [ ] **Step 3: Add the shared TypeScript baseline**
- [ ] **Step 4: Add the workspace TypeScript runner used by the web package lint command**

### Task 3: Create Foundation Packages

**Files:**
- Create: `app/openchat-admin/packages/opencat-admin-core/**`
- Create: `app/openchat-admin/packages/opencat-admin-ui/**`
- Create: `app/openchat-admin/packages/opencat-admin-i18n/**`
- Create: `app/openchat-admin/packages/opencat-admin-auth/**`

- [ ] **Step 1: Create package manifests and `tsconfig.json` files**
- [ ] **Step 2: Move auth/session utilities and admin SDK service boundary into core**
- [ ] **Step 3: Move shared admin primitives into ui**
- [ ] **Step 4: Move i18n bootstrap/resources into i18n**
- [ ] **Step 5: Rebuild the auth page in the dedicated auth package**
- [ ] **Step 6: Add focused tests for moved core/ui helpers**

### Task 4: Create Shell and Web Host

**Files:**
- Create: `app/openchat-admin/packages/opencat-admin-shell/**`
- Create: `app/openchat-admin/packages/opencat-admin-web/**`

- [ ] **Step 1: Add the shell package manifest and exports**
- [ ] **Step 2: Implement `AppRoot`, `AppProviders`, `MainLayout`, `Sidebar`, and route metadata**
- [ ] **Step 3: Port the shell stylesheet to the `claw-studio` token model with OpenChat defaults**
- [ ] **Step 4: Add `bootstrapShellRuntime`**
- [ ] **Step 5: Add the web Vite host package that mounts the shell**
- [ ] **Step 6: Point build/dev scripts at the web package**

### Task 5: Split Feature Packages

**Files:**
- Create: `app/openchat-admin/packages/opencat-admin-dashboard/**`
- Create: `app/openchat-admin/packages/opencat-admin-users/**`
- Create: `app/openchat-admin/packages/opencat-admin-groups/**`
- Create: `app/openchat-admin/packages/opencat-admin-friends/**`
- Create: `app/openchat-admin/packages/opencat-admin-messages/**`
- Create: `app/openchat-admin/packages/opencat-admin-iot/**`
- Create: `app/openchat-admin/packages/opencat-admin-rtc/**`
- Create: `app/openchat-admin/packages/opencat-admin-im-server/**`
- Create: `app/openchat-admin/packages/opencat-admin-system/**`

- [ ] **Step 1: Create package manifests and exports for each feature**
- [ ] **Step 2: Move the existing pages into their feature packages with imports redirected to core/ui**
- [ ] **Step 3: Lazy-load feature routes from shell**
- [ ] **Step 4: Verify route coverage matches the current admin feature set**

### Task 6: Remove Single-Package Runtime Ownership

**Files:**
- Modify or remove: `app/openchat-admin/src/**`
- Modify or remove: `app/openchat-admin/index.html`
- Modify or remove: `app/openchat-admin/vite.config.ts`
- Modify or remove: `app/openchat-admin/tsconfig.json`

- [ ] **Step 1: Cut the old single-package runtime out of the active build path**
- [ ] **Step 2: Keep only workspace-owned entrypoints active**
- [ ] **Step 3: Ensure there is one authoritative shell, router, and auth flow**

### Task 7: Verify the Migration

**Files:**
- Verify: `app/openchat-admin/package.json`
- Verify: `app/openchat-admin/packages/**`
- Verify: `app/openchat-admin/scripts/**`

- [ ] **Step 1: Run architecture checks**
- [ ] **Step 2: Run route/package parity checks**
- [ ] **Step 3: Run package tests**
- [ ] **Step 4: Run workspace TypeScript checks**
- [ ] **Step 5: Run the web build**
- [ ] **Step 6: Fix remaining import, style, or route regressions**
