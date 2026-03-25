# RTC App API

This page documents the app-facing RTC surface only.

Admin RTC control-plane endpoints are documented separately at [Admin RTC API](../admin-api/rtc.md).

## Runtime OpenAPI

- App docs: `http://localhost:3000/im/v3/docs`
- App schema: `http://localhost:3000/im/v3/openapi.json`
- Admin docs: `http://localhost:3000/admin/im/v3/docs`
- Admin schema: `http://localhost:3000/admin/im/v3/openapi.json`

`sdkwork-im-sdk` only consumes the app schema. Admin APIs are excluded from app SDK generation.

## App Surface

- Base path: `/im/v3/rtc`
- Auth: JWT required
- Audience: end-user apps, frontend SDKs, RTC bootstrap clients

## Primary Endpoints

- `POST /im/v3/rtc/rooms`
- `PUT /im/v3/rtc/rooms/:id/end`
- `GET /im/v3/rtc/rooms/:id`
- `GET /im/v3/rtc/rooms/user/:userId`
- `POST /im/v3/rtc/tokens`
- `POST /im/v3/rtc/tokens/validate`
- `POST /im/v3/rtc/rooms/:id/connection`
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

## Aggregated Connection Bootstrap

`POST /im/v3/rtc/rooms/:id/connection` is the app-facing bootstrap endpoint for RTC clients. It returns one aggregated payload so the client does not need to compose provider token, WuKongIM bootstrap, and signaling rules manually.

Request fields:

- `channelId`: optional explicit RTC channel override
- `provider`: optional preferred provider such as `volcengine`
- `role`: optional provider ACL role such as `host`
- `expireSeconds`: optional RTC token expiration override
- `includeRealtimeToken`: whether WuKongIM realtime token should be returned

Response blocks:

- `room`: OpenChat business room record
- `rtcToken`: server-issued RTC token record
- `providerConfig`: RTC media provider bootstrap config
- `signaling`: WuKongIM event-routing contract for RTC signaling
- `realtime`: WuKongIM bootstrap config for message and event receive

Important provider fields:

- `providerRoomId`: room identifier used by the RTC media SDK
- `businessRoomId`: OpenChat room identifier used by HTTP APIs and signaling

Important signaling fields:

- `transport = WUKONGIM_EVENT`
- `eventType = RTC_SIGNAL`
- `namespace = rtc`
- `broadcastConversation.type = GROUP`
- `broadcastConversation.targetId = room.id`

## Recommended Client Flow

1. Create or query the RTC room.
2. Call `POST /im/v3/rtc/rooms/:id/connection`.
3. Initialize the media provider with `providerConfig`.
4. Bootstrap WuKongIM with `realtime`.
5. Exchange RTC signaling through the `RTC_SIGNAL` event contract.
6. Join the provider room with `providerRoomId`, not `businessRoomId`.

## Client Integration Rules

- App clients must not depend on `/admin/im/v3/rtc/*`.
- Provider capability discovery stays on the app surface because SDKs use it for runtime selection.
- Room orchestration, token issuance, connection bootstrap, recording, and playback APIs are all part of the app contract.
- Repeated SDK generation must only refresh `generated/server-openapi`; handwritten WuKongIM and RTC layers stay outside generator-owned output.

## Provider Notes

- Default provider: `volcengine`
- Supported providers: `volcengine`, `tencent`, `alibaba`, `livekit`
- Routing and availability details should be read from the runtime OpenAPI contract and `GET /im/v3/rtc/providers/capabilities`

## Internal Modules

RTC webhook processing remains an internal module and is not part of the public app schema.
