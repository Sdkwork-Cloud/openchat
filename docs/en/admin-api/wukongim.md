# Admin WuKongIM Control Plane API

This page documents the privileged WuKongIM control surface.

## Runtime OpenAPI

- Admin docs: `http://localhost:3000/admin/im/v3/docs`
- Admin schema: `http://localhost:3000/admin/im/v3/openapi.json`

## Surface

- Base path: `/admin/im/v3/wukongim`
- Auth: JWT with admin access
- Audience: admin console, server operators, control-plane automation

## Primary Endpoints

- `POST /admin/im/v3/wukongim/message/send`
- `POST /admin/im/v3/wukongim/message/sendbatch`
- `GET /admin/im/v3/wukongim/message/sync`
- `POST /admin/im/v3/wukongim/channel/create`
- `POST /admin/im/v3/wukongim/channel/delete`
- `POST /admin/im/v3/wukongim/channel/subscriber/add`
- `POST /admin/im/v3/wukongim/channel/subscriber/remove`
- `GET /admin/im/v3/wukongim/health`
- `GET /admin/im/v3/wukongim/system/info`

## Rules

- message control-plane operations remain admin-only
- app bootstrap endpoints stay on `/im/v3/wukongim`
- admin schema and WuKongIM SDK integration code must remain decoupled
