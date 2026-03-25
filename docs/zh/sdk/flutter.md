# Flutter SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-flutter`
- 契约来源：`/im/v3/openapi.json`
- 不包含：admin API

## 分层结构

- `generated/server-openapi`：生成得到的 `backend_sdk`
- `adapter-wukongim`：手写实时适配层
- `composed`：手写 `openchat_sdk`

允许重复生成的只有 `generated/server-openapi`。手写的 WuKongIM 与 RTC 层必须在多次生成后保持稳定不变。

## 实时模型

- 业务发送：HTTP API
- 实时接收：`wukongimfluttersdk`
- 消息持久化：服务端负责

## 对外稳定模块

手写 `openchat_sdk` facade 暴露：

- `session`
- `realtime`
- `messages`
- `events`
- `friends`
- `conversations`
- `groups`
- `contacts`
- `rtc`

## RTC 启动引导

Flutter 生成层现在已经包含 `backendClient.rtc.appControllerGetConnectionInfo(...)`。手写组合层进一步封装为：

- `sdk.rtc.connection.get(roomId, request: ...)`
- `sdk.rtc.connection.prepareCall(roomId, request: ..., applyRealtimeSession: true)`

当请求里开启 `includeRealtimeToken` 时，`prepareCall(...)` 会把返回的 WuKongIM 实时会话写回 SDK 的认证会话，方便后续直接建立长连接。

房间字段要严格区分：

- `businessRoomId`：OpenChat 业务房间号，HTTP API 与信令都基于它
- `providerRoomId`：RTC provider 媒体层真正入会使用的房间号

## 典型 RTC 流程

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

返回结构包含：

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
- `openchat_sdk.messages.*` 保持 HTTP-first 发送模型
- `sendCombined(...)`、`sendUserCard(...)` 通过 `CUSTOM` 消息信封承载兼容语义，与 TypeScript 保持一致

## 命令

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

## 规则

- 只有 `generated/server-openapi` 可以被重新生成
- 前端应用不得依赖 admin 控制面 API
- 重复生成不能修改 `adapter-wukongim` 或 `composed`
- 生成 `sdkwork-im-sdk` 时只允许使用前端 app schema
