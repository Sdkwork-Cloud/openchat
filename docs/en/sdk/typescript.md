# TypeScript SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-typescript`
- app schema source: `/im/v3/openapi.json`
- admin APIs: excluded

## Layer Split

- `generated/server-openapi`: SDKWORK Generator output for server HTTP APIs only
- handwritten runtime layer: `src`
- WuKongIM receive path and RTC orchestration remain outside generator-owned output

The generated layer is refreshed from the running app schema. Repeated generation must not overwrite handwritten RTC or WuKongIM integration logic.

## Realtime Model

- outbound business send: app HTTP API
- inbound realtime receive: WuKongIM long connection
- message persistence: server-side
- app schema authority: `/im/v3/openapi.json`

## Stable Business Modules

The handwritten `OpenChatClient` facade exposes:

- `auth`
- `im`
- `rtc`
- `api`

## RTC Bootstrap

The generated HTTP layer now includes `appControllerGetConnectionInfo(...)` in `generated/server-openapi/src/api/rtc.ts`. The composed client exposes:

- `client.rtc.getConnectionInfo(roomId, options?)`
- `client.rtc.prepareCall(roomId, options?)`
- `client.rtc.startCall(roomId, options?)`

`prepareCall(...)` does three things:

1. Requests `POST /im/v3/rtc/rooms/:id/connection`
2. Selects the provider returned by the server
3. Stores prepared `token` and `providerRoomId` so `startCall(...)` can join correctly

Important room distinction:

- `businessRoomId`: OpenChat room id for HTTP APIs and signaling
- `providerRoomId`: media-provider room id used by the RTC SDK when joining

## Typical RTC Flow

```typescript
const client = new OpenChatClient(config);

const info = await client.rtc.prepareCall('room-123', {
  provider: 'volcengine',
  role: 'host',
  includeRealtimeToken: true,
});

await client.rtc.startCall('room-123');

console.log(info.providerConfig.providerRoomId);
console.log(info.realtime.wsUrl);
```

The response contains:

- `room`
- `rtcToken`
- `providerConfig`
- `signaling`
- `realtime`

## Event And RTC Standard

- message request: `version + conversation + message`
- event request: `version + conversation + event`
- RTC signaling event type: `RTC_SIGNAL`
- multiplayer or chess payloads: domain events such as `GAME_EVENT`
- `OpenChatClient.im.messages.sendXxx(...)` now sends through HTTP only; WuKongIM stays receive-only
- compatibility helpers such as `sendUserCard(...)` and `sendCombined(...)` serialize through `CUSTOM` envelopes so the standard message shape stays stable

## Commands

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
npm run test:rtc
npm run typecheck
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## Rules

- only `generated/server-openapi` may be regenerated
- app clients must never depend on admin control-plane APIs
- repeated generation must not modify handwritten RTC or WuKongIM logic
- use the runtime schema URL, not the checked-in admin schema, when generating app SDKs
