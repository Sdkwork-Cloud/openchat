# TypeScript SDK

## 工作区

- 工作区：`sdkwork-im-sdk/sdkwork-im-sdk-typescript`
- 契约来源：`/im/v3/openapi.json`
- 不包含：admin API

## 分层结构

- `generated/server-openapi`：发布为 `@sdkwork/backend-sdk`
- `adapter-wukongim`：发布为 `@openchat/sdkwork-im-wukongim-adapter`
- `composed`：发布为 `@openchat/sdkwork-im-sdk`

TypeScript 手写包发布时统一输出编译后的 `dist` 产物。源码继续保留在 `src`，但运行时与类型入口统一指向 `dist/index.js` 和 `dist/index.d.ts`。

## 实时模型

- 消息发送：HTTP API
- 长连接接收：`wukongimjssdk`
- 对外能力聚合：手写 `composed` 包

## 稳定业务模块

手写的 `@openchat/sdkwork-im-sdk` facade 向应用暴露稳定模块：

- `session`
- `realtime`
- `messages`
- `events`
- `friends`
- `conversations`
- `groups`
- `contacts`
- `rtc`

这样应用层不需要直接感知生成器的类型缺陷，也不需要直接操作 WuKongIM 运行时细节。

## Event 与 RTC 标准

- 消息请求：`version + conversation + message`
- 事件请求：`version + conversation + event`
- RTC 信令：`RTC_SIGNAL`
- 未来多人游戏、棋牌等数据：通过 `GAME_EVENT` 这类领域事件继续扩展
- 自定义 RTC 信令：`rtc.signaling.sendCustom({ eventName, signalType, ... })`

## 关键辅助方法

- `messages.send(...)` 会在发送前把原始 envelope 规范化为 `version: 2`，并统一将传输层 `type` 转成大写
- `messages.batchSend(...)` 会对批量发送中的每一条 envelope 做同样的规范化处理
- `session.register(...)` 与 `session.login(...)` 保持一致，可基于服务端返回的 WuKongIM 配置自动拉起实时连接
- `realtime.connect(...)` 会把已连接的 WuKongIM 会话同步回 `session.getState()`
- `realtime.onRaw(...)` 可在应用层过滤前拿到标准化后的原始消息帧与事件帧
- `events.publishGameEvent(...)` 统一封装 `GAME_EVENT`，适合多人游戏、棋牌等未来扩展场景

## 命令

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

## 规则

- 只有 `generated/server-openapi` 可以被重新生成
- 实时逻辑必须保留在 `adapter-wukongim` 或 `composed`
- 终端应用不得依赖 admin 控制面 API
- 反复生成不得修改 `adapter-wukongim` 或 `composed`
