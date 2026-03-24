# Flutter SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-flutter`
- app schema source: `/im/v3/openapi.json`
- admin APIs: excluded

## Layer Split

- `generated/server-openapi`: published as `backend_sdk`
- `adapter-wukongim`: published as `openchat_wukongim_adapter`
- `composed`: published as `openchat_sdk`

## Realtime Model

- message send: generated HTTP client
- long connection: `wukongimfluttersdk`
- app-facing composition: handwritten `composed` package

## Stable Business Modules

The handwritten `openchat_sdk` facade exposes a stable module surface above the generated HTTP SDK:

- `session`
- `realtime`
- `messages`
- `events`
- `friends`
- `conversations`
- `groups`
- `contacts`
- `rtc`

`messages` sends through HTTP, while `realtime` receives through WuKongIM. `events` standardizes generic event transport, and `rtc.signaling` builds RTC negotiation on top of `event.type = RTC_SIGNAL`.

## Event And RTC Standard

- message request: `version + conversation + message`
- event request: `version + conversation + event`
- RTC signaling: `RTC_SIGNAL`
- future multiplayer or chess payloads: domain events such as `GAME_EVENT`

## Local Development

The Flutter composed package keeps publish-time version dependencies, but uses local `pubspec_overrides.yaml` so the workspace resolves:

- `backend_sdk` to `generated/server-openapi`
- `openchat_wukongim_adapter` to `adapter-wukongim`

That keeps generation-safe code and handwritten realtime code separated during repeated regeneration.

## Helper Highlights

- `session.register(...)` and `session.login(...)` both support bootstrapping realtime from server-provided WuKongIM config
- `messages.batchSend(...)` normalizes every outbound envelope in the batch before it reaches the generated HTTP client
- `realtime.connect(...)` persists the connected WuKongIM session back into the SDK session state
- `realtime.onRaw(...)` exposes normalized inbound message and event frames before app-level filtering
- room-scoped RTC signaling falls back to `roomId` when no explicit `groupId` or direct `toUserId` is provided
- `events.publishGameEvent(...)` standardizes `GAME_EVENT` transport for multiplayer, chess, and similar scenes
- `conversations.batchDelete(...)` and `contacts.batchDelete(...)` are implemented in the handwritten composed layer so Flutter can safely send DELETE request bodies without touching generated code

## Commands

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

```bash
cd composed && dart analyze
cd ../adapter-wukongim && dart analyze
```

## Rules

- only `generated/server-openapi` may be regenerated
- realtime logic must stay in `adapter-wukongim` or `composed`
- app clients must never depend on admin control-plane APIs
- repeated generation must not modify `adapter-wukongim` or `composed`
