# WuKongIM App Integration API

This page documents the app-facing WuKongIM bootstrap surface only.

Admin WuKongIM control-plane endpoints are documented separately at [Admin WuKongIM API](../admin-api/wukongim.md).

## Responsibility Split

- message submission: HTTP business API
- client long connection: WuKongIM SDK
- inbound realtime delivery: WuKongIM

## Runtime OpenAPI

- App docs: `http://localhost:3000/im/v3/docs`
- App schema: `http://localhost:3000/im/v3/openapi.json`

## App Surface

- Base path: `/im/v3/wukongim`
- Audience: app clients preparing WuKongIM connectivity

## Endpoints

- `GET /im/v3/wukongim/config`
- `POST /im/v3/wukongim/token`

## Integration Rules

- app-facing bootstrap endpoints are part of the generated app schema
- control-plane operations stay outside the app surface
- realtime SDK integration with `wukongimjssdk` and `wukongimfluttersdk` remains handwritten

## SDK Boundary

- generated HTTP APIs come from `/im/v3/openapi.json`
- admin APIs are excluded from `sdkwork-im-sdk`
- handwritten WuKongIM adapters must stay outside `generated/server-openapi`
