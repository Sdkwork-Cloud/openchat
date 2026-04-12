# OpenChat WukongIM 签名 Token 与 Webhook 订阅桥设计

日期: 2026-04-06
范围: `apps/openchat`

## 背景

此前 `WukongIMProvider` 存在两个严重契约问题：

1. `validateToken()` 永远返回无效
2. `subscribeToMessages()`、`subscribeToConnectionStatus()`、`subscribeToUserStatus()` 只打 warning，不产生任何运行时效果

与此同时，系统中已经存在两条相关但未闭环的能力：

1. `WukongIMService.getUserToken()` 能为用户注册 token 到 `/user/token`
2. `WukongIMWebhookController` 能接收在线、离线、回执等 webhook

问题不在于完全没有基础设施，而在于这些能力没有被接成统一运行链。

## 设计目标

本轮设计目标如下：

1. WukongIM token 必须可签发、可校验
2. provider 与 app service 使用同一套 token 契约
3. provider 的订阅能力必须有真实事件入口
4. 不引入一套新的手写 WebSocket 客户端架构

## 方案选择

### 方案 A：继续显式不支持

优点：

1. 实现最少

缺点：

1. 公开接口继续失真
2. 无法满足真实 token 校验和订阅能力

### 方案 B：共享签名 token + webhook 事件桥

优点：

1. 可在现有架构上形成真实闭环
2. 复用已存在的 webhook 控制器与 `/user/token` 合约
3. 改动集中，风险可控

缺点：

1. 订阅能力依赖 webhook 到达，而不是直接连 WukongIM 推送流

### 方案 C：引入完整 WebSocket 实时桥

优点：

1. 最接近独立 IM SDK 行为

缺点：

1. 复杂度高
2. 当前代码基础不足
3. 与本轮“最小真实闭环”目标不匹配

结论：

选择方案 B。

## 核心设计

### 1. 共享 token 服务

新增 `WukongIMTokenService`，职责只有两件事：

1. 生成签名 token
2. 校验签名 token

签名来源：

1. 优先 `WUKONGIM_SECRET`
2. 回退 `JWT_SECRET`

token 结构：

1. 版本前缀
2. base64url payload
3. HMAC-SHA256 签名

payload 包含：

1. `uid`
2. `iat`
3. 可选 `exp`
4. `nonce`

### 2. token 生成与注册链

`WukongIMService.getUserToken()` 和 `WukongIMProvider.generateToken()` 不再各自生成随机字符串，而是：

1. 调用 `WukongIMTokenService.generateToken()`
2. 将生成的 token 注册到 `/user/token`
3. 将同一个 token 返回给调用方

收益：

1. token 不再只是“可用字符串”，而是“可验证字符串”
2. service 和 provider 之间不再存在两套 token 语义

### 3. token 校验链

`WukongIMProvider.validateToken()` 改为直接调用共享 token service。

设计含义：

1. provider 只对本系统签发的 WukongIM token 负责
2. 校验行为不再依赖上游按 token 反查 uid

这是本轮的重要取舍：当前控制面没有可证明存在的“按 token 反查 uid”契约，因此最合理的方案不是伪造远程校验，而是让 token 本身具备自校验能力。

### 4. 订阅桥接链

`IMProviderBase` 早已有回调容器，但 `WukongIMProvider` 之前没有使用它们。

本轮收敛为两层：

1. provider 层
   - 恢复基类回调注册
   - 新增 webhook 派发入口
2. webhook controller 层
   - 接收到 `message / connect / disconnect / user.online / user.offline` 后，转发到 provider

### 5. 连接状态与用户状态边界

两类状态需要区分：

1. provider 连接状态
   - 来自 `connect()` / `disconnect()`
   - 对应 `subscribeToConnectionStatus()`
2. 用户在线状态
   - 来自 webhook 的在线/离线事件
   - 对应 `subscribeToUserStatus()`

这样可以避免把“某个用户上线”错误映射成“provider 已连上控制面”。

## 运行时收益

本轮设计落地后，系统获得了三个直接收益：

1. token 契约一致
2. provider 订阅能力不再是空壳
3. webhook 控制器不再只写日志，而是进入业务事件桥

## 当前边界

本轮没有做的事情：

1. 没有引入独立 WebSocket 长连接桥
2. 没有实现基于上游控制面的 token 反查
3. 没有扩展完整消息 webhook 字段规范文档

这些都不是本轮的缺陷，而是当前架构阶段的明确边界。
