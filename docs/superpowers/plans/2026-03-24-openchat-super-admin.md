# OpenChat Super Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real super-admin console for OpenChat with persisted admin roles, expanded `/admin/im/v3` APIs, and a frontend wired to live operational data.

**Architecture:** Persist user roles in `chat_users`, expose a dedicated admin aggregation module under the admin API surface, and replace `app/openchat-admin` mock auth/pages with live data integrations. Reuse existing domain services for state-changing operations and repositories for operator reporting/list views.

**Tech Stack:** NestJS, TypeORM, PostgreSQL schema patches, React 18, Vite, Tailwind, Zustand, fetch-based API client

---

### Task 1: Persist User Roles

**Files:**
- Modify: `database/schema.sql`
- Create: `database/patches/20260324_add_chat_user_roles.sql`
- Modify: `database/seed.sql`
- Modify: `src/modules/user/entities/user.entity.ts`
- Modify: `src/modules/user/local-user-manager.service.ts`
- Modify: `src/modules/user/auth.service.ts`
- Test: `src/modules/user/auth.service.spec.ts`

- [ ] Add a failing test or extend an auth spec to assert admin roles come from persisted user data.
- [ ] Add `roles` to the schema, seed, entity, and user loading paths.
- [ ] Make auth token generation prefer persisted roles and keep fallback compatibility.
- [ ] Re-run the targeted auth test.

### Task 2: Add Backend Admin Aggregation Surface

**Files:**
- Create: `src/modules/admin/admin.module.ts`
- Create: `src/modules/admin/admin-console.service.ts`
- Create: `src/modules/admin/dto/admin.dto.ts`
- Create: `src/modules/admin/admin-dashboard.controller.ts`
- Create: `src/modules/admin/admin-users.controller.ts`
- Create: `src/modules/admin/admin-groups.controller.ts`
- Create: `src/modules/admin/admin-friends.controller.ts`
- Create: `src/modules/admin/admin-messages.controller.ts`
- Create: `src/modules/admin/admin-iot.controller.ts`
- Create: `src/modules/admin/admin-system.controller.ts`
- Create: `src/api/im-admin/im-admin-platform-api.module.ts`
- Modify: `src/api/im-admin-api.module.ts`
- Modify: `src/api/im-admin-api.module.spec.ts`
- Modify: `src/api/im-admin/im-admin-surface-bundles.spec.ts`
- Modify: `src/common/http/im-openapi-schema.module.ts`
- Test: `src/modules/admin/admin-console.service.spec.ts`

- [ ] Add failing specs for the new admin API bundle and at least one admin aggregation behavior.
- [ ] Implement the admin module, controllers, and service.
- [ ] Register the new admin bundle in top-level admin API composition and OpenAPI schema registration.
- [ ] Re-run the focused admin backend tests.

### Task 3: Replace Mock Admin Auth

**Files:**
- Modify: `app/openchat-admin/src/utils/auth.ts`
- Modify: `app/openchat-admin/src/store/auth.store.ts`
- Modify: `app/openchat-admin/src/services/api.client.ts`
- Modify: `app/openchat-admin/src/app/AppProvider.tsx`
- Modify: `app/openchat-admin/src/modules/auth/pages/AuthPage.tsx`

- [ ] Add a failing frontend auth-path test if the current setup already has a practical test harness. Otherwise verify by build after implementation.
- [ ] Replace mock login with real backend login and real admin bootstrap.
- [ ] Normalize and persist admin profile data from the backend.
- [ ] Verify the admin app still builds.

### Task 4: Replace Mock Pages With Live Admin Screens

**Files:**
- Modify: `app/openchat-admin/src/router/index.tsx`
- Modify: `app/openchat-admin/src/layouts/MainLayout.tsx`
- Modify: `app/openchat-admin/src/modules/dashboard/pages/DashboardPage.tsx`
- Modify: `app/openchat-admin/src/modules/user/pages/UserListPage.tsx`
- Create: `app/openchat-admin/src/modules/group/pages/GroupListPage.tsx`
- Create: `app/openchat-admin/src/modules/friend/pages/FriendListPage.tsx`
- Modify: `app/openchat-admin/src/modules/message/pages/MessageListPage.tsx`
- Modify: `app/openchat-admin/src/modules/device/pages/DeviceListPage.tsx`
- Create: `app/openchat-admin/src/modules/realtime/pages/RtcPage.tsx`
- Create: `app/openchat-admin/src/modules/im-server/pages/ImServerPage.tsx`
- Modify: `app/openchat-admin/src/modules/system/pages/SystemSettingsPage.tsx`

- [ ] Replace mock cards/tables with real admin data fetching.
- [ ] Align menu and routes with the new backend admin domains.
- [ ] Add operator actions for the implemented backend mutations.
- [ ] Run the admin frontend build.

### Task 5: Verification

**Files:**
- Test: `src/modules/user/auth.service.spec.ts`
- Test: `src/modules/admin/admin-console.service.spec.ts`
- Test: `src/api/im-admin-api.module.spec.ts`
- Test: `src/api/im-admin/im-admin-surface-bundles.spec.ts`

- [ ] Run the focused backend test command for the touched specs.
- [ ] Run backend type/lint or the smallest credible compile command if full lint is too expensive.
- [ ] Run `app/openchat-admin` build.
- [ ] Record any residual gaps instead of overstating completion.
