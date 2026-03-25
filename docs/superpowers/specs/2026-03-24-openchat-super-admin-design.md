# OpenChat Super Admin Design

## Context

`app/openchat-admin` is currently a mock-heavy shell. The backend `im-admin` surface only exposes RTC and WuKongIM control-plane APIs. Core operational domains such as users, groups, friends, messages, IoT devices, audit, and configuration are not exposed through a coherent administrator API.

The current permission flow also has a structural gap: admin roles are effectively transient because user role assignment lives in an in-memory `PermissionService` map. That is not reliable enough for a production operations console.

## Goals

- Turn `app/openchat-admin` into a real super-admin console backed by live APIs.
- Expand `/admin/im/v3` into a coherent operator-facing surface for:
  - dashboard and overview
  - users
  - friends and friend requests
  - groups and membership
  - messages and moderation actions
  - IoT devices and device messages
  - RTC and WuKongIM control-plane integration
  - configuration, audit, and runtime health
- Persist user roles so admin access survives process restarts.
- Keep the new admin surface isolated from app APIs and aligned with current entity models.

## Non-Goals

- Rebuilding every domain service from scratch.
- Introducing a full enterprise IAM or multi-tenant policy engine.
- Implementing a complete design-system rewrite for the whole frontend.

## Key Decisions

### 1. Persist roles on `chat_users`

Add a `roles` JSONB column to `chat_users`, mirror it in `UserEntity`, seed the `admin` user with `['admin']`, and default new registrations to `['user']`.

Auth token generation will read persisted roles first, then fall back to `PermissionService` for compatibility. This closes the admin-auth gap without destabilizing the rest of the codebase.

### 2. Add a dedicated admin aggregation module

Create a dedicated backend module for super-admin functionality instead of overloading existing app controllers. The module will:

- reuse TypeORM repositories for list/detail/reporting use cases
- reuse existing domain services for destructive or stateful operations
- keep all routes under `/admin/im/v3`

### 3. Keep admin API grouped by operator workflows

The new admin surface will expose controllers for:

- `dashboard`
- `users`
- `groups`
- `friends`
- `messages`
- `iot`
- `system`

RTC and WuKongIM admin controllers stay in their current modules and remain part of the same top-level admin API bundle.

### 4. Replace frontend mocks with real APIs

The admin frontend will stop using fake credentials and local mock tables. It will:

- log in through the real `/im/v3/auth/login`
- validate admin access via token/user roles
- call `/admin/im/v3/*` endpoints for all dashboard and management pages
- expose a left-nav aligned with actual admin domains

## Backend Design

### Admin data model inputs

The new admin module will aggregate from existing entities:

- `UserEntity`
- `Friend`
- `FriendRequest`
- `Group`
- `GroupMember`
- `Message`
- `DeviceEntity`
- `DeviceMessageEntity`
- `AuditLogEntity`

### Admin capability map

- Dashboard:
  - total users, groups, messages, devices
  - online/active status snapshots
  - recent users, messages, devices, and audit activity
- Users:
  - paginated search
  - detail view
  - status/profile update
  - role update
  - password reset
  - soft delete
- Friends:
  - friendship list
  - friend request list
  - remove/block/unblock actions through existing services where possible
- Groups:
  - paginated list with member counts
  - detail and member list
  - update announcement/status/mute-all
  - add/remove member
  - delete/dismiss through existing group service
- Messages:
  - paginated moderation list
  - sender/recipient/group filters
  - detail view
  - delete and recall operations
- IoT:
  - paginated device list
  - device detail and recent messages
  - status updates
  - control commands
- System:
  - config-center entries
  - audit logs
  - runtime summary
  - raw metrics availability flag and health summary

### API composition

`ImAdminApiModule` will expand from two bundles to three:

- platform/admin operations bundle
- IM server bundle
- realtime bundle

OpenAPI admin controller registration will also include the new platform/admin controllers.

## Frontend Design

### Information architecture

The admin console navigation will be organized as:

- Overview
- Users
- Groups
- Friends
- Messages
- IoT
- RTC
- IM Server
- System

### Page principles

- Real data first, no demo placeholders
- Tables with filters and a clear action bar
- Summary cards at top of each domain page
- Detail panels or inline cards instead of many disconnected “create” screens
- Operator-safe actions with explicit confirmation for destructive paths

### Authentication

- Use real backend login.
- Reject non-admin users at login bootstrap.
- Persist token and normalized admin profile locally.

## Error Handling

- Admin controllers enforce `JwtAuthGuard` and `assertAdminAccess`.
- Destructive actions return explicit errors from existing services rather than swallowing failures.
- Frontend API client clears local auth on `401` and shows actionable error text on failed mutations.

## Testing Strategy

- Add/extend unit tests for:
  - admin API composition
  - persisted-role auth behavior
  - admin aggregation service behavior
- Verify:
  - root backend test slice for new specs
  - root type check or targeted compile path
  - `app/openchat-admin` build

## Rollout Order

1. Persist roles and close admin-auth reliability.
2. Add the new backend admin aggregation module and API bundle.
3. Replace admin frontend mock auth and mock pages with live integrations.
4. Run focused verification and iterate on failures.
