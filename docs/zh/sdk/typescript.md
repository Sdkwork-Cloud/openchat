# TypeScript SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-typescript`
- 契约来源：`/im/v3/openapi.json`
- 不包含：admin API

## 分层结构

- `generated/server-openapi`：仅承载服务端 HTTP API 的生成代码
- `src`：手写运行时层
- WuKongIM 接收链路与 RTC 编排逻辑保持在生成层之外

生成器只允许覆盖 `generated/server-openapi`。多次生成不能覆盖手写的 RTC、WuKongIM 集成层。

## 实时模型

- 业务发送：HTTP API
- 实时接收：WuKongIM 长连接
- 消息持久化：服务端负责
- 前端契约权威：`/im/v3/openapi.json`

## SDK 初始化

标准部署场景下，推荐直接使用组合 SDK + WuKongIM realtime adapter：

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

说明：

- 标准部署依赖网关或 Nginx 正确暴露 `/im/v3/*`
- `session.login(...)` 会消费服务端返回的 `imConfig`，并自动启动 realtime
- 单聊发送走 HTTP，实时接收走 WuKongIM WebSocket

## 当前本机直连部署的配置方式

当前仓库的本机直连验证通常绕过 Nginx，直接访问 `http://127.0.0.1:7200`。这时服务端真实路由仍然挂在根路径，SDK 内部的 `/im/v3` 前缀需要在 HTTP 客户端侧剥掉；同时登录返回的 `imConfig.wsUrl` 默认可能是公网地址，需在本机 smoke 时覆盖为本地 WuKongIM 地址。

完整可运行参考已经固化在脚本：

- `scripts/sdk-im-smoke.cjs`

最小初始化思路如下：

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

本机 smoke 关键点：

- HTTP 基础地址：`http://127.0.0.1:7200`
- WuKongIM 本地 WebSocket：`ws://127.0.0.1:15200`
- 种子测试账号：`alice`、`bob`
- 种子测试密码：`OpenChat@123`
- 服务端当前单聊投递规则已修正为“直接投递到接收方 uid channel”，不再使用 `2_3` 这类拼接 channel id

## 收发 Smoke 测试

仓库内置了可直接执行的 smoke 脚本，用于验证：

1. Alice 登录
2. Bob 登录
3. Bob 建立 WuKongIM realtime 连接
4. Alice 通过 SDK 发送文本消息
5. Bob 通过 SDK realtime adapter 收到文本消息

运行命令：

```bash
npm run sdk:smoke
```

常用环境变量：

- `OPENCHAT_BASE_URL`：后端地址，默认 `http://127.0.0.1:7200`
- `OPENCHAT_LOCAL_WS_URL`：本地 WuKongIM WebSocket，默认 `ws://127.0.0.1:15200`
- `OPENCHAT_DNS_OVERRIDES`：可选 DNS 覆盖，格式 `host=ip[,host=ip...]`
- `OPENCHAT_SMOKE_ALICE_USERNAME`：发送方用户名，默认 `alice`
- `OPENCHAT_SMOKE_BOB_USERNAME`：接收方用户名，默认 `bob`
- `OPENCHAT_SMOKE_PASSWORD`：测试密码，默认 `OpenChat@123`
- `OPENCHAT_SMOKE_TIMEOUT_MS`：等待接收超时，默认 `15000`
- `OPENCHAT_SMOKE_VERBOSE=0`：关闭诊断日志，只保留最终 JSON 结果

如果你要按域名验收当前服务器，但 `im-dev.sdkwork.com` 还没有真正解析到本机，可以直接这样跑：

```bash
OPENCHAT_BASE_URL=https://im-dev.sdkwork.com \
OPENCHAT_LOCAL_WS_URL=wss://im-dev.sdkwork.com/im/ws \
OPENCHAT_DNS_OVERRIDES=im-dev.sdkwork.com=127.0.0.1 \
npm run sdk:smoke
```

这会保留：

- HTTPS 域名入口
- `wss://im-dev.sdkwork.com/im/ws` 的 SNI / Host
- 实际 SDK 登录、发送、接收链路

同时仅把本机 smoke 进程里的 `im-dev.sdkwork.com` 解析强制落到 `127.0.0.1`，适合“域名配置已完成，但 DNS/LB 尚未正式切流”的场景。

成功时脚本会输出类似结果：

```json
{
  "success": true,
  "aliceUserId": "2",
  "bobUserId": "3",
  "messageText": "sdk smoke 1774546317246"
}
```

## 对外稳定模块

手写 `OpenChatClient` facade 暴露：

- `auth`
- `im`
- `rtc`
- `api`

## RTC 启动引导

生成层 `generated/server-openapi/src/api/rtc.ts` 现在已经包含 `appControllerGetConnectionInfo(...)`。手写客户端对外暴露：

- `client.rtc.getConnectionInfo(roomId, options?)`
- `client.rtc.prepareCall(roomId, options?)`
- `client.rtc.startCall(roomId, options?)`

`prepareCall(...)` 会完成三件事：

1. 请求 `POST /im/v3/rtc/rooms/:id/connection`
2. 根据服务端返回结果选择 RTC provider
3. 缓存 `token` 与 `providerRoomId`，供 `startCall(...)` 自动入会

房间字段要严格区分：

- `businessRoomId`：OpenChat 业务房间号，用于 HTTP API 与信令
- `providerRoomId`：RTC 媒体 SDK 真正入会使用的房间号

## 典型 RTC 流程

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

接口响应包含：

- `room`
- `rtcToken`
- `providerConfig`
- `signaling`
- `realtime`

## Event 与 RTC 标准

- 消息请求：`version + conversation + message`
- 事件请求：`version + conversation + event`
- RTC 信令事件类型：`RTC_SIGNAL`
- 多人游戏、棋牌游戏等扩展数据：使用 `GAME_EVENT` 等领域事件继续扩展
- `OpenChatClient.im.messages.sendXxx(...)` 现已统一走 HTTP 发送，WuKongIM 只负责接收链路
- `sendUserCard(...)`、`sendCombined(...)` 等兼容能力统一序列化为 `CUSTOM` 消息信封，不破坏标准消息结构

## 命令

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

## 规则

- 只有 `generated/server-openapi` 可以被重新生成
- 前端应用不得依赖 admin 控制面 API
- 重复生成不能修改手写 RTC 或 WuKongIM 逻辑
- 生成前端 SDK 必须使用运行中的 `/im/v3/openapi.json`
