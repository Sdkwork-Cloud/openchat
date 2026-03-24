# App API Reference

OpenChat exposes the app-facing IM HTTP surface under `/im/v3`.

This surface is the only server contract that app SDK generation may consume.

## Runtime OpenAPI

- App Swagger UI: `http://localhost:3000/im/v3/docs`
- App OpenAPI JSON: `http://localhost:3000/im/v3/openapi.json`
- Schema-only runtime: `npm run start:openapi`

If markdown pages and the running service ever differ, treat the runtime OpenAPI document as the source of truth.

## Scope

| Surface | Prefix | Audience | SDK Generation |
|------|------|------|------|
| App IM API | `/im/v3` | web apps, mobile apps, desktop apps, bots, frontend SDKs | included |
| Admin IM API | `/admin/im/v3` | operators, admin consoles, control-plane tooling | excluded |

Admin APIs are documented separately at [Admin API Reference](../admin-api/index.md).

## Main Domains

| Domain | Prefix |
|------|------|
| Authentication | `/im/v3/auth` |
| Users | `/im/v3/users` |
| Contacts | `/im/v3/contacts` |
| Messages | `/im/v3/messages` |
| Conversations | `/im/v3/conversations` |
| Groups | `/im/v3/groups` |
| Friends | `/im/v3/friends` |
| Timeline | `/im/v3/timeline` |
| RTC | `/im/v3/rtc` |
| WuKongIM bootstrap | `/im/v3/wukongim` |
| AI / Agents | `/im/v3/ai-bots`, `/im/v3/agents` |

## Key References

- [Authentication](./auth.md)
- [Messages](./messages.md)
- [Conversations](./conversations.md)
- [RTC](./rtc.md)
- [WuKongIM Integration](./wukongim.md)
- [Open Access](./open-access.md)
- [Admin API Reference](../admin-api/index.md)

## Standard Rules

- runtime schema version: `openapi: 3.2.0`
- runtime dialect: `jsonSchemaDialect: https://spec.openapis.org/oas/3.2/dialect/base`
- app SDK generation must use `/im/v3/openapi.json`
- admin control-plane APIs remain isolated at `/admin/im/v3/openapi.json`
- WuKongIM integration code stays outside generator-owned `generated/server-openapi`
