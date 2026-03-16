# 实时音视频 API

本文档对应当前服务端 `RTCController` 的真实接口实现。  
统一前缀：`/im/api/v1/rtc`，全部接口需 JWT。

## 设计说明

- 默认 provider：`volcengine`（火山引擎）
- 支持 provider：`tencent`、`alibaba`、`livekit`
- provider 仅支持 canonical 取值：`volcengine`、`tencent`、`alibaba`、`livekit`
- Room 粒度支持 AI 扩展 metadata（后续可接入 AI 同传/AI 助手）

## 房间接口

### 1) 创建房间

`POST /rtc/rooms`

请求体：

```json
{
  "type": "group",
  "participants": ["user-a", "user-b"],
  "name": "项目评审会议",
  "provider": "volcengine",
  "channelId": "190000000000000001",
  "aiMetadata": {
    "assistantMode": "cohost",
    "agentId": "agent-123"
  }
}
```

说明：

- `creatorId` 由服务端从 JWT 自动注入。
- `participants` 会自动补齐创建者本人。
- `p2p` 必须恰好 2 人，`group` 至少 2 人。

### 2) 结束房间

`PUT /rtc/rooms/:id/end`

说明：

- 仅房主可结束。

### 3) 查询房间详情

`GET /rtc/rooms/:id`

说明：

- 仅房间参与者可查看。

### 4) 查询用户房间列表

`GET /rtc/rooms/user/:userId`

说明：

- 仅允许查询当前登录用户自己的房间列表。

### 5) 房间成员管理

- `POST /rtc/rooms/:id/participants`（房主添加）
- `DELETE /rtc/rooms/:id/participants/:userId`（房主移除或本人退出）

## Token 接口

### 1) 生成通话 Token

`POST /rtc/tokens`

请求体：

```json
{
  "roomId": "190000000000000010",
  "provider": "volcengine",
  "role": "participant",
  "expireSeconds": 7200
}
```

说明：

- `userId` 不传时默认当前登录用户。
- 不允许为其他用户申请 token。
- 如果未显式指定 provider/channel，会按默认策略自动选择。
- 当 `RTC_ENABLE_HEALTH_BASED_ROUTING=true` 且请求/房间未显式绑定 `channelId/provider` 时，服务端会优先按健康度选择 provider，再回退默认 provider 策略。
- 如果显式指定 `provider` 但对应可用 channel 不存在，会返回错误（不再静默降级到默认 provider）。
- 如果请求中的 `provider/channelId` 与房间已绑定路由冲突，会返回 `400`（禁止跨云覆盖）。

### 2) 校验 Token

- 标准接口：`POST /rtc/tokens/validate`

标准请求体：

```json
{
  "token": "rtc_xxx"
}
```

标准响应体（不返回原始 token）：

```json
{
  "valid": true,
  "roomId": "190000000000000010",
  "userId": "user-a",
  "provider": "volcengine",
  "channelId": "190000000000000001",
  "role": "participant",
  "expiresAt": "2026-03-07T10:00:00.000Z"
}
```

说明：

- 按 provider 使用原生 token 策略：
  - `tencent`：TRTC UserSig（兼容 `TLSSigAPIv2`）。
    - 支持可选 `userbuf/privateMapKey` 房间权限绑定（通过 channel `extra_config` 开启）。
  - `alibaba`：RTC 鉴权 token（`base64(json)` + `sha256(appid + appkey + channelid + userid + nonce + timestamp)`）。
  - `volcengine`：
    - `delegate`：调用外部 token 签发服务。
    - `openapi`：通过官方 OpenAPI signer 调用 `GetAppToken`。
    - `local`：本地签名回退（仅建议开发/测试环境）。

## Channel 管理接口

- `POST /rtc/channels`：创建或更新 provider 配置（upsert）
- `GET /rtc/channels`：查询全部 channel 配置
- `GET /rtc/channels/:id`：查询单个 channel
- `PUT /rtc/channels/:id`：更新 channel
- `DELETE /rtc/channels/:id`：软删除 channel
- `GET /rtc/providers/stats`：查询 provider 级操作统计（`createRoom`/`generateToken`/`validateToken`）
- `GET /rtc/providers/health`：查询 provider 健康报告与推荐路由顺序
- `GET /rtc/providers/capabilities`：查询 provider 能力矩阵（供 SDK 动态接入）

说明：

- 所有 channel 查询接口会对 `appSecret` 做脱敏返回。
- `channel` 配置管理接口仅允许管理员访问（`admin` 角色或系统管理员账号）。
- `providers/stats` 仅管理员可访问，返回服务端内存级统计（操作总量、成功失败数、最近错误码/耗时），用于运行观测。
- `providers/health` 仅管理员可访问，返回窗口内健康状态（healthy/degraded/unknown/unhealthy）与推荐主 provider。
- `providers/capabilities` 供客户端和 SDK 读取当前可用 provider、默认 provider、推荐主路由以及能力标签（录制能力、token 策略、控制面代理能力）。

`providers/stats` 查询参数：

- `provider`：按云厂商过滤（仅支持 canonical provider）。
- `operation`：按操作过滤（`createRoom`/`generateToken`/`validateToken`）。
- `windowMinutes`：仅统计最近窗口内事件（`1`~`1440` 分钟）。
- `topErrorLimit`：返回错误码 Top-N（`1`~`10`，默认 `3`）。

返回项示例：

```json
{
  "provider": "tencent",
  "operation": "generateToken",
  "total": 18,
  "success": 12,
  "failure": 6,
  "retryableFailure": 5,
  "avgDurationMs": 38,
  "controlPlaneInvocations": 20,
  "controlPlaneRetries": 4,
  "controlPlaneCircuitOpenShortCircuits": 1,
  "controlPlaneUnsafeIdempotencyCalls": 0,
  "lastStatus": "failure",
  "lastDurationMs": 120,
  "lastErrorCode": "RequestTimeout",
  "lastErrorMessage": "upstream timeout",
  "topErrors": [
    { "code": "RequestTimeout", "count": 4 },
    { "code": "RateLimitExceeded", "count": 2 }
  ],
  "updatedAt": "2026-03-01T14:00:00.000Z"
}
```

`providers/health` 查询参数：

- `provider`：按 provider 过滤。
- `operation`：按操作过滤。
- `windowMinutes`：统计窗口（`1`~`1440`，默认 `60`）。
- `topErrorLimit`：错误码 Top-N（`1`~`10`，默认 `3`）。
- `minSamples`：进入健康分级所需最小样本数（默认 `5`）。
- `controlPlaneMinSamples`：启用控制面阈值判定前所需最小控制面调用样本数（默认 `5`）。
- `degradedFailureRate` / `unhealthyFailureRate`：失败率阈值。
- `degradedLatencyMs` / `unhealthyLatencyMs`：平均耗时阈值。
- `degradedControlPlaneRetryRate` / `unhealthyControlPlaneRetryRate`：控制面重试率阈值。
- `degradedControlPlaneCircuitOpenRate` / `unhealthyControlPlaneCircuitOpenRate`：控制面熔断短路率阈值。

`providers/health` 响应关键字段：

- `status`：`healthy` / `degraded` / `unknown` / `unhealthy`
- `healthReasons`：当前状态判定原因（`insufficient_samples` / `high_failure_rate` / `high_latency` / `high_control_plane_retry_rate` / `high_control_plane_circuit_open_rate`）
- `controlPlaneSignalsEvaluated`：当前 provider 是否启用控制面阈值判定（需满足 `controlPlaneInvocations >= controlPlaneMinSamples`）
- `recommendedPrimary`：推荐主路由 provider
- `fallbackOrder`：按健康度排序的回退链路

## 观测指标

Prometheus `/metrics` 端点会导出 RTC provider 指标：

- `rtc_provider_operations_total{provider,operation,status,retryable}`
- `rtc_provider_operation_duration_seconds{provider,operation,status}`
- `rtc_provider_health_status{provider,status}`（当前状态为 `1`，其余状态为 `0`）
- `rtc_provider_failure_rate{provider}`
- `rtc_provider_avg_duration_ms{provider}`
- `rtc_provider_total_samples{provider}`
- `rtc_control_plane_signals_total{provider,operation,signal}`
- `rtc_provider_control_plane_retry_rate{provider}`
- `rtc_provider_control_plane_circuit_open_rate{provider}`
- `rtc_provider_control_plane_invocations{provider}`
- `rtc_provider_control_plane_retries{provider}`
- `rtc_provider_control_plane_circuit_open_short_circuits{provider}`
- `rtc_provider_control_plane_unsafe_idempotency_calls{provider}`

## 录像记录接口

- `POST /rtc/video-records`
- `GET /rtc/video-records/:id`
- `GET /rtc/rooms/:roomId/video-records`
- `GET /rtc/users/:userId/video-records`（仅本人）
- `PUT /rtc/video-records/:id/status`
- `PUT /rtc/video-records/:id/metadata`
- `DELETE /rtc/video-records/:id`（软删除）
- `GET /rtc/video-records?limit=50&offset=0`（当前用户自己的记录分页）

权限说明：

- `GET /rtc/video-records/:id`：仅记录所属用户或房间参与者可读。
- `GET /rtc/rooms/:roomId/video-records`：仅房间参与者可读。
- `PUT /rtc/video-records/:id/status|metadata`、`DELETE /rtc/video-records/:id`：仅记录所属用户或房主可写。

## 数据一致性

- 房间、token、录像均采用 `is_deleted` 软删除策略。
- provider 选路优先级：`channelId` > `provider` > room 绑定 > `RTC_DEFAULT_PROVIDER` > 任意 active channel。
- 当请求显式绑定 `channelId/provider` 或房间已绑定 `channelId/provider` 时，若无可用 channel 会直接失败，避免跨云静默漂移。
- Token 记录包含 `provider/channelId/role/metadata`，为多云切换与 AI 扩展提供审计上下文。

## Provider 错误响应规范

当厂商侧调用失败（如 `createRoom`、`generateToken`、`validateToken`），服务端会返回统一结构，便于客户端做重试和熔断：

```json
{
  "statusCode": 400,
  "message": "RTC provider generateToken failed",
  "provider": "tencent",
  "operation": "generateToken",
  "providerStatusCode": 504,
  "providerErrorCode": "RequestTimeout",
  "retryable": true,
  "providerMessage": "upstream timeout"
}
```

字段说明：

- `providerStatusCode`：服务端观测到的上游厂商状态码。
- `providerErrorCode`：厂商原生错误码（若无则回退为平台标准码）。
- `retryable`：是否建议客户端做重试。
- `providerMessage`：厂商错误消息，便于排查问题。
