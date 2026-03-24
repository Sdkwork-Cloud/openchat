# Flutter SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-flutter`
- 契约来源：`/im/v3/openapi.json`
- 不包含：admin API

## 分层结构

- `generated/server-openapi`：发布为 `backend_sdk`
- `adapter-wukongim`：发布为 `openchat_wukongim_adapter`
- `composed`：发布为 `openchat_sdk`

## 实时模型

- 消息发送：HTTP API
- 长连接接收：`wukongimfluttersdk`
- 对外能力聚合：手写 `composed` 包

## 稳定业务模块

手写的 `openchat_sdk` facade 向终端应用暴露稳定模块：

- `session`
- `realtime`
- `messages`
- `events`
- `friends`
- `conversations`
- `groups`
- `contacts`
- `rtc`

其中 `messages` 负责通过 HTTP 发送消息，`realtime` 负责通过 WuKongIM 接收消息，`events` 负责统一事件传输，`rtc.signaling` 则在 `event.type = RTC_SIGNAL` 标准上承载 RTC 信令。

## Event 与 RTC 标准

- 消息请求：`version + conversation + message`
- 事件请求：`version + conversation + event`
- RTC 信令：`RTC_SIGNAL`
- 未来多人游戏、棋牌等数据：通过 `GAME_EVENT` 这类领域事件继续扩展

## 本地开发

Flutter `composed` 包保留发布时的版本依赖，同时通过 `pubspec_overrides.yaml` 在本地工作区解析：

- `backend_sdk` -> `generated/server-openapi`
- `openchat_wukongim_adapter` -> `adapter-wukongim`

这样可以保证重复生成只覆盖 HTTP 生成层，不会影响手写的 WuKongIM 与 RTC 封装。

## 关键辅助方法

- `session.register(...)` 与 `session.login(...)` 都支持基于服务端返回的 WuKongIM 配置自动拉起实时连接
- `messages.batchSend(...)` 会在进入生成 HTTP SDK 前对批量消息逐条做规范化处理
- `realtime.connect(...)` 会把已连接的 WuKongIM 会话同步回 SDK 会话状态
- `realtime.onRaw(...)` 可在应用层过滤前拿到标准化后的消息帧与事件帧
- 房间级 RTC 信令在未显式传入 `groupId` 且不是点对点 `toUserId` 时，会自动回落到 `roomId`
- `events.publishGameEvent(...)` 统一封装 `GAME_EVENT`，适合多人游戏、棋牌等未来扩展场景
- `conversations.batchDelete(...)` 与 `contacts.batchDelete(...)` 由手写 `composed` 层实现，从而在不修改生成代码的前提下安全支持带 body 的 DELETE 请求

## 命令

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

## 规则

- 只有 `generated/server-openapi` 可以被重新生成
- 实时逻辑必须保留在 `adapter-wukongim` 或 `composed`
- 终端应用不得依赖 admin 控制面 API
- 反复生成不得修改 `adapter-wukongim` 或 `composed`
