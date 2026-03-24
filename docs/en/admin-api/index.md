# Admin API Reference

OpenChat exposes the admin control-plane IM surface under `/admin/im/v3`.

This surface is intentionally separated from the app-facing API and must not be bundled into `sdkwork-im-sdk`.

## Runtime OpenAPI

- Admin Swagger UI: `http://localhost:3000/admin/im/v3/docs`
- Admin OpenAPI JSON: `http://localhost:3000/admin/im/v3/openapi.json`
- Full runtime: `npm run start:dev`
- Schema-only runtime: `npm run start:openapi`

## Scope

| Surface | Prefix | Audience | Included in app SDK |
|------|------|------|------|
| Admin IM API | `/admin/im/v3` | operators, admin consoles, control-plane automation | no |
| App IM API | `/im/v3` | end-user apps and frontend SDKs | yes |

App-facing APIs are documented separately at [App API Reference](../api/index.md).

## Main Domains

| Domain | Prefix |
|------|------|
| RTC control plane | `/admin/im/v3/rtc` |
| WuKongIM control plane | `/admin/im/v3/wukongim` |

## Key References

- [RTC Control Plane](./rtc.md)
- [WuKongIM Control Plane](./wukongim.md)
- [App API Reference](../api/index.md)

## Standard Rules

- admin schema is exported independently at `/admin/im/v3/openapi.json`
- admin contracts must evolve without changing the app SDK boundary
- `sdkwork-im-sdk` must never absorb admin endpoints
- admin tooling may generate separate SDKs in the future, but not inside the app-facing workspace
