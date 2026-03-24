# TypeScript SDK

## Workspace

- workspace: `sdkwork-im-sdk/sdkwork-im-sdk-typescript`
- app schema source: `/im/v3/openapi.json`
- admin APIs: excluded

## Layer Split

- `generated/server-openapi`: published as `@sdkwork/backend-sdk`
- `adapter-wukongim`: published as `@openchat/sdkwork-im-wukongim-adapter`
- `composed`: published as `@openchat/sdkwork-im-sdk`

The handwritten TypeScript packages publish compiled `dist` outputs. Source remains in `src`, but runtime and type entrypoints resolve through `dist/index.js` and `dist/index.d.ts`.

## Realtime Model

- message send: generated HTTP client
- long connection: `wukongimjssdk`
- app-facing composition: handwritten `composed` package

## Stable Business Modules

The handwritten `@openchat/sdkwork-im-sdk` facade exposes:

- `session`
- `realtime`
- `messages`
- `events`
- `friends`
- `conversations`
- `groups`
- `contacts`
- `rtc`

This facade keeps outbound send on HTTP and keeps inbound receive on WuKongIM. It also hides generator typing gaps behind a stable application API.

## Event And RTC Standard

- message request: `version + conversation + message`
- event request: `version + conversation + event`
- RTC signaling: `RTC_SIGNAL`
- future multiplayer or chess payloads: domain events such as `GAME_EVENT`
- custom RTC signaling: `rtc.signaling.sendCustom({ eventName, signalType, ... })`

## Helper Highlights

- `messages.send(...)` normalizes raw envelopes to `version: 2` and uppercases transport `type` fields before HTTP send
- `messages.batchSend(...)` applies the same normalization to every outbound envelope in a batch
- `session.register(...)` aligns with `session.login(...)` and can bootstrap realtime from server-provided WuKongIM config
- `realtime.connect(...)` persists the connected WuKongIM session back into `session.getState()`
- `realtime.onRaw(...)` exposes normalized inbound message and event frames before app-level filtering
- `events.publishGameEvent(...)` standardizes `GAME_EVENT` payloads for multiplayer, chess, and similar future scenes

## Commands

```bash
./bin/sdk-gen.sh
./bin/sdk-assemble.sh
cd adapter-wukongim && npm run build
cd ../composed && npm run build
```

```powershell
.\bin\sdk-gen.ps1
.\bin\sdk-assemble.ps1
```

## Rules

- only `generated/server-openapi` may be regenerated
- realtime logic must stay in `adapter-wukongim` or `composed`
- app clients must never depend on admin control-plane APIs
- repeated generation must not modify `adapter-wukongim` or `composed`
