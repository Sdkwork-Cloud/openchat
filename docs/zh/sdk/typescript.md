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
