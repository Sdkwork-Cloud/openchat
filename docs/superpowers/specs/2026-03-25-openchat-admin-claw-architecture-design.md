# OpenChat Admin Claw Architecture Design

**Date:** 2026-03-25

## Goal

Refactor `app/openchat-admin` from a single-package Vite app into a standardized pnpm workspace that mirrors the `claw-studio` architecture model while preserving the current OpenChat super-admin feature surface and the existing admin SDK boundary.

## Scope

This design covers:

- workspace root standardization
- `packages/*` split with `opencat-admin-*` naming
- `web -> shell -> core/ui/auth/feature packages` layering
- shared UI primitives
- collapsible left sidebar shell
- theme and styling aligned with `claw-studio`
- full auth flow migration and hardening
- preservation of existing admin features:
  - overview
  - users
  - groups
  - friends
  - messages
  - IoT
  - RTC
  - IM server
  - system/config/audit

## Non-Goals

- backend schema or database changes
- replacing the admin SDK with local HTTP wrappers
- changing the current feature scope or removing existing operational flows

## Target Architecture

### Workspace Root

`app/openchat-admin` becomes a pnpm workspace root with:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `scripts/*` contract checks
- `packages/opencat-admin-*`

The workspace root owns orchestration only:

- host scripts
- architecture checks
- route/package parity checks
- shared TypeScript baseline

### Package Layout

The package model follows the `claw-studio` split:

- `packages/opencat-admin-web`
  - Vite host
  - mounts `AppRoot`
  - calls `bootstrapShellRuntime`
- `packages/opencat-admin-shell`
  - providers
  - router
  - route metadata
  - layout
  - sidebar
  - theme manager
  - shell styles
- `packages/opencat-admin-core`
  - auth store
  - app store
  - session/auth services
  - admin SDK service boundary
  - auth/session utilities
- `packages/opencat-admin-ui`
  - reusable visual primitives
  - admin cards, badges, pagination, empty/error/loading states
  - shared form controls
- `packages/opencat-admin-i18n`
  - i18n bootstrap
  - locale resources
- `packages/opencat-admin-auth`
  - login page
  - redirect-aware auth route UI
- feature packages
  - `opencat-admin-dashboard`
  - `opencat-admin-users`
  - `opencat-admin-groups`
  - `opencat-admin-friends`
  - `opencat-admin-messages`
  - `opencat-admin-iot`
  - `opencat-admin-rtc`
  - `opencat-admin-im-server`
  - `opencat-admin-system`

## Layer Rules

### Allowed Dependencies

- `web` -> `shell`
- `shell` -> `core`, `ui`, `i18n`, `auth`, feature packages
- feature packages -> `core`, `ui`
- `auth` -> `core`, `ui`
- `core` -> admin SDK packages and browser/runtime utilities
- `ui` -> React-only shared presentation logic

### Forbidden Dependencies

- feature packages importing each other
- feature packages importing shell internals
- shell or feature packages using raw `/admin/im/v3/*` HTTP
- direct generated SDK imports in feature packages
- app-local manual auth header assembly outside core/admin SDK boundary

## Admin SDK Boundary

The current control-plane contract must remain:

`feature -> @openchat/opencat-admin-core -> @openchat/sdkwork-im-admin-sdk`

Rules:

- all admin business flows stay on `@openchat/sdkwork-im-admin-sdk`
- auth/session bootstrap may still bridge through the composed admin SDK path
- no reintroduction of local `fetch`, `axios`, or `/admin/im/v3/*` wrappers

## Shell Design

The shell adopts the `claw-studio` interaction model:

- fixed application shell
- left sidebar
- sidebar can collapse
- width persisted in app store
- top header with current route context and runtime chips
- content area renders lazy feature routes

The navigation is grouped by operational domain:

- Command Center
  - Overview
- Identity
  - Users
  - Groups
  - Friends
- Content
  - Messages
- Infrastructure
  - IoT
  - RTC
  - IM Server
- Platform
  - System

## Theme and Style System

The style system follows the `claw-studio` foundation:

- Tailwind v4 shell stylesheet
- theme tokens via CSS custom properties
- support for theme mode and theme color selection in app state
- `claw-studio`-like dark/light surface layering, gradients, borders, and sidebar chrome

OpenChat-specific adaptation:

- default accent uses green-tech tokens to align with OpenChat operations branding
- current admin-specific panel classes are preserved as shared UI primitives so the feature pages keep their existing information density

## Auth Design

The auth flow is migrated into a dedicated package and hardened around the current admin role model.

### Requirements

- session bootstrap on app mount
- redirect-aware login
- protected routes
- invalid session cleanup
- admin-role validation after login and bootstrap
- explicit sign-out path
- consistent loading and error states

### Flow

1. `bootstrapShellRuntime` ensures i18n is ready.
2. `AppProviders` boots the auth store once.
3. Protected routes wait for bootstrap completion.
4. If no valid session exists, the shell redirects to `/login`.
5. Login calls core auth service, which delegates to the admin SDK.
6. After login, the store persists session tokens and validated user identity.
7. Non-admin identities are rejected and cleared immediately.

## Route Ownership

The shell owns route composition and lazy loading.

Feature packages export route components only.

The route table must include:

- `/overview`
- `/users`
- `/groups`
- `/friends`
- `/messages`
- `/iot`
- `/rtc`
- `/im-server`
- `/system`
- `/login`

## Testing Strategy

### Architecture Contracts

Workspace-level scripts must verify:

- workspace root exists and is pnpm-based
- required package set exists
- `web` depends on `shell`
- `shell` owns layout/router/sidebar
- `auth` lives in its own package
- feature packages exist for the preserved admin modules

### Behavioral Verification

- TypeScript workspace check
- Vite build for `opencat-admin-web`
- Vitest checks for core auth/utils/UI helpers
- admin SDK boundary check to ensure the consumer still routes through `@openchat/sdkwork-im-admin-sdk`

## Migration Strategy

1. Create the workspace root and package scaffolding.
2. Add architecture contract checks before implementation.
3. Move core, ui, i18n, and auth first.
4. Move shell and route composition next.
5. Move each feature package with minimal behavioral change.
6. Point the web host at the new shell.
7. Verify build, tests, and route/package parity.

## Success Criteria

The migration is complete when:

- `app/openchat-admin` is a pnpm workspace
- the package split mirrors the `claw-studio` model
- the UI uses a collapsible left sidebar shell
- login/bootstrap/logout flow is polished and redirect-aware
- all existing admin features still render from dedicated feature packages
- admin capability calls still flow through `@openchat/sdkwork-im-admin-sdk`
- workspace structure and route surface pass automated checks
