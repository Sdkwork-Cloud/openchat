# Admin RTC Control Plane API

This page documents the privileged RTC management surface.

## Runtime OpenAPI

- Admin docs: `http://localhost:3000/admin/im/v3/docs`
- Admin schema: `http://localhost:3000/admin/im/v3/openapi.json`

## Surface

- Base path: `/admin/im/v3/rtc`
- Auth: JWT with admin access
- Audience: admin console and operational automation

## Primary Endpoints

- `POST /admin/im/v3/rtc/channels`
- `GET /admin/im/v3/rtc/channels`
- `GET /admin/im/v3/rtc/channels/:id`
- `PUT /admin/im/v3/rtc/channels/:id`
- `DELETE /admin/im/v3/rtc/channels/:id`
- `GET /admin/im/v3/rtc/providers/stats`
- `GET /admin/im/v3/rtc/providers/health`

## Rules

- these endpoints are admin-only and must not appear in app SDKs
- provider health and stats are part of the control plane, not the end-user contract
- client-facing capability discovery stays on `/im/v3/rtc/providers/capabilities`
