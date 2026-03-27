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

## SDK Initialization

For a standard deployment, use the composed SDK together with the WuKongIM realtime adapter:

```typescript
import { createClient } from '@sdkwork/im-backend-sdk';
import { OpenChatImSdk } from '@openchat/sdkwork-im-sdk';
import { OpenChatWukongimAdapter } from '@openchat/sdkwork-im-wukongim-adapter';

const backendClient = createClient({
  baseUrl: 'https://im-dev.sdkwork.com',
  timeout: 30000,
});

const sdk = new OpenChatImSdk({
  backendClient,
  realtimeAdapter: new OpenChatWukongimAdapter(),
});

await sdk.session.login({
  username: 'alice',
  password: 'OpenChat@123',
});

sdk.realtime.onMessage((frame) => {
  console.log(frame.message?.text?.text);
});

await sdk.messages.sendText({
  toUserId: '3',
  text: 'hello from sdk',
});
```

Notes:

- a standard deployment must expose `/im/v3/*` through the gateway or Nginx
- `session.login(...)` consumes the server-side `imConfig` and can bootstrap realtime automatically
- direct message send stays on HTTP, while inbound realtime delivery stays on the WuKongIM socket

## Local Direct-Access Configuration

When you bypass Nginx and talk directly to `http://127.0.0.1:7200`, the current server routes still live at the root path. In that mode, the SDK's internal `/im/v3` prefix must be stripped inside the HTTP client, and the login response `imConfig.wsUrl` should be overridden to the local WuKongIM socket for realtime smoke tests.

The full working reference is committed as:

- `scripts/sdk-im-smoke.cjs`

Minimal initialization looks like this:

```typescript
import axios from 'axios';
import { OpenChatImSdk } from '@openchat/sdkwork-im-sdk';
import { OpenChatWukongimAdapter } from '@openchat/sdkwork-im-wukongim-adapter';

function stripSdkPrefix(pathname: string): string {
  if (pathname === '/im/v3') return '/';
  return pathname.startsWith('/im/v3/')
    ? pathname.slice('/im/v3'.length)
    : pathname;
}

function createLocalBackendClient(baseUrl: string) {
  const state = { authToken: '', accessToken: '' };

  async function request(pathname: string, options: any = {}) {
    const url = new URL(stripSdkPrefix(pathname), `${baseUrl}/`).toString();
    const headers = {
      'Content-Type': 'application/json',
      ...(state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {}),
      ...(state.accessToken ? { 'Access-Token': state.accessToken } : {}),
    };
    const response = await axios({
      url,
      method: options.method || 'GET',
      params: options.params,
      data: options.body,
      headers,
    });
    return response.data;
  }

  return {
    setAuthToken(token: string) {
      state.authToken = token;
    },
    setAccessToken(token: string) {
      state.accessToken = token;
    },
    http: {
      get: (pathname: string, params?: Record<string, unknown>) =>
        request(pathname, { method: 'GET', params }),
      post: (pathname: string, body?: unknown, params?: Record<string, unknown>) =>
        request(pathname, { method: 'POST', body, params }),
      put: (pathname: string, body?: unknown, params?: Record<string, unknown>) =>
        request(pathname, { method: 'PUT', body, params }),
      delete: (pathname: string, params?: Record<string, unknown>) =>
        request(pathname, { method: 'DELETE', params }),
      request: (pathname: string, options?: Record<string, unknown>) =>
        request(pathname, options),
    },
  };
}

const loginSdk = new OpenChatImSdk({
  backendClient: createLocalBackendClient('http://127.0.0.1:7200'),
});

const realtimeSdk = new OpenChatImSdk({
  backendClient: createLocalBackendClient('http://127.0.0.1:7200'),
  realtimeAdapter: new OpenChatWukongimAdapter(),
});

const bobSession = await loginSdk.session.login({
  username: 'bob',
  password: 'OpenChat@123',
});

await realtimeSdk.realtime.connect({
  ...bobSession.realtime,
  wsUrl: 'ws://127.0.0.1:15200',
  deviceId: 'sdk-smoke-bob',
  deviceFlag: 1,
});
```

Important local smoke values:

- HTTP base URL: `http://127.0.0.1:7200`
- local WuKongIM socket: `ws://127.0.0.1:15200`
- seed users: `alice`, `bob`
- seed password: `OpenChat@123`
- the server-side direct-message delivery rule now targets the recipient uid channel instead of a composed channel id like `2_3`

## Send/Receive Smoke Test

The repository ships a runnable smoke script that verifies:

1. Alice can log in
2. Bob can log in
3. Bob can establish a WuKongIM realtime connection
4. Alice can send a text message through the SDK
5. Bob can receive that text through the SDK realtime adapter

Run it with:

```bash
npm run sdk:smoke
```

Useful environment variables:

- `OPENCHAT_BASE_URL`: backend URL, default `http://127.0.0.1:7200`
- `OPENCHAT_LOCAL_WS_URL`: local WuKongIM WebSocket URL, default `ws://127.0.0.1:15200`
- `OPENCHAT_DNS_OVERRIDES`: optional DNS overrides in `host=ip[,host=ip...]` format
- `OPENCHAT_SMOKE_ALICE_USERNAME`: sender username, default `alice`
- `OPENCHAT_SMOKE_BOB_USERNAME`: receiver username, default `bob`
- `OPENCHAT_SMOKE_PASSWORD`: test password, default `OpenChat@123`
- `OPENCHAT_SMOKE_TIMEOUT_MS`: receive timeout in milliseconds, default `15000`
- `OPENCHAT_SMOKE_VERBOSE=0`: disable diagnostic logs and keep only the final JSON summary

If you want to validate the current server through `im-dev.sdkwork.com` before public DNS is fully cut over to this machine, run:

```bash
OPENCHAT_BASE_URL=https://im-dev.sdkwork.com \
OPENCHAT_LOCAL_WS_URL=wss://im-dev.sdkwork.com/im/ws \
OPENCHAT_DNS_OVERRIDES=im-dev.sdkwork.com=127.0.0.1 \
npm run sdk:smoke
```

This preserves:

- the HTTPS domain entrypoint
- the `wss://im-dev.sdkwork.com/im/ws` Host and SNI
- the real SDK login, send, and receive path

while forcing only the local smoke process to resolve `im-dev.sdkwork.com` to `127.0.0.1`. It is useful when the edge configuration is ready on the server but public DNS or an upstream LB has not been switched yet.

On success, the script prints a result like:

```json
{
  "success": true,
  "aliceUserId": "2",
  "bobUserId": "3",
  "messageText": "sdk smoke 1774546317246"
}
```

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
