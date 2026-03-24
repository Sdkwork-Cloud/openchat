# RTC App API

This page documents the app-facing RTC surface only.

Admin RTC control-plane endpoints are documented separately at [Admin RTC API](../admin-api/rtc.md).

## Runtime OpenAPI

- App docs: `http://localhost:3000/im/v3/docs`
- App schema: `http://localhost:3000/im/v3/openapi.json`

## App Surface

- Base path: `/im/v3/rtc`
- Auth: JWT required
- Audience: end-user apps and frontend SDKs

## Primary Endpoints

- `POST /im/v3/rtc/rooms`
- `PUT /im/v3/rtc/rooms/:id/end`
- `GET /im/v3/rtc/rooms/:id`
- `GET /im/v3/rtc/rooms/user/:userId`
- `POST /im/v3/rtc/tokens`
- `POST /im/v3/rtc/tokens/validate`
- `POST /im/v3/rtc/rooms/:id/participants`
- `DELETE /im/v3/rtc/rooms/:id/participants/:userId`
- `GET /im/v3/rtc/providers/capabilities`
- `POST /im/v3/rtc/rooms/:roomId/recordings/start`
- `POST /im/v3/rtc/rooms/:roomId/recordings/stop`
- `POST /im/v3/rtc/video-records`
- `GET /im/v3/rtc/video-records/:id`
- `GET /im/v3/rtc/rooms/:roomId/video-records`
- `GET /im/v3/rtc/users/:userId/video-records`
- `PUT /im/v3/rtc/video-records/:id/status`
- `PUT /im/v3/rtc/video-records/:id/metadata`
- `POST /im/v3/rtc/video-records/:id/sync`
- `DELETE /im/v3/rtc/video-records/:id`
- `GET /im/v3/rtc/video-records`

## Client Integration Rules

- app clients must not depend on `/admin/im/v3/rtc/*`
- provider capability discovery stays on the app surface because SDKs use it for runtime selection
- room orchestration, token issuance, and recording APIs are all part of the app contract

## Provider Notes

- default provider: `volcengine`
- supported providers: `volcengine`, `tencent`, `alibaba`, `livekit`
- routing and availability details should be read from the runtime OpenAPI contract

## Internal Modules

RTC webhook processing remains an internal module and is not part of the public app schema.
