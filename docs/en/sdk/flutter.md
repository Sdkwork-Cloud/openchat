# Flutter SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-flutter`
- app schema source: `/im/v3/openapi.json`
- admin APIs: excluded

## Layer Split

- `generated/server-openapi`: generated `backend_sdk`
- `adapter-wukongim`: handwritten realtime adapter
- `composed`: handwritten `openchat_sdk`

Repeated generation is allowed only for `generated/server-openapi`. The handwritten WuKongIM and RTC layers stay stable across regeneration.

## Realtime Model

- outbound business send: app HTTP API
- inbound realtime receive: `wukongimfluttersdk`
- message persistence: server-side

## Stable Business Modules

The handwritten `openchat_sdk` facade exposes:

- `session`
- `realtime`
- `messages`
- `events`
- `friends`
- `conversations`
- `groups`
- `contacts`
- `rtc`

## RTC Bootstrap

The generated Flutter SDK now includes `backendClient.rtc.appControllerGetConnectionInfo(...)`. The composed layer wraps it with:

- `sdk.rtc.connection.get(roomId, request: ...)`
- `sdk.rtc.connection.prepareCall(roomId, request: ..., applyRealtimeSession: true)`

`prepareCall(...)` updates the SDK auth session with the returned WuKongIM realtime session when `includeRealtimeToken` is enabled.

Important room distinction:

- `businessRoomId`: OpenChat room id for HTTP APIs and signaling
- `providerRoomId`: provider-native media room id for RTC join

## Typical RTC Flow

```dart
final sdk = OpenChatImSdk.create(
  baseUrl: 'http://127.0.0.1:3000',
  accessToken: token,
);

final info = await sdk.rtc.connection.prepareCall(
  'room-123',
  request: const OpenChatRtcConnectionRequest(
    provider: 'volcengine',
    role: 'host',
    includeRealtimeToken: true,
  ),
);

await sdk.rtc.signaling.sendJoin(roomId: 'room-123');

print(info.providerConfig.providerRoomId);
print(info.realtime.wsUrl);
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
- `openchat_sdk.messages.*` remains HTTP-first across every outbound send path
- compatibility helpers such as `sendCombined(...)` and `sendUserCard(...)` use `CUSTOM` message envelopes so Flutter matches the TypeScript transport semantics

## Commands

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
dart analyze composed
dart analyze adapter-wukongim
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## Rules

- only `generated/server-openapi` may be regenerated
- app clients must never depend on admin control-plane APIs
- repeated generation must not change `adapter-wukongim` or `composed`
- `sdkwork-im-sdk` is generated only from the app schema URL
