# RTC 配置

## 目标

- 默认使用火山引擎（`volcengine`）作为 RTC 实时通话接入。
- 同时支持腾讯云（`tencent`）与阿里云（`alibaba`）。
- 为未来 AI 实时能力预留扩展（房间 AI metadata + 扩展钩子）。

## 核心配置

```json
{
  "rtc": {
    "enabled": true,
    "defaultProvider": "volcengine"
  }
}
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `RTC_DEFAULT_PROVIDER` | 默认 RTC provider（`volcengine`/`tencent`/`alibaba`/`livekit`） | `volcengine` |
| `RTC_PROVIDER_STATS_HISTORY_MAX_EVENTS` | 每个 `provider:operation` 在内存中保留的最大事件数 | `5000` |
| `RTC_PROVIDER_STATS_HISTORY_MAX_AGE_MINUTES` | provider 统计事件最大保留时间（分钟） | `1440` |
| `RTC_PROVIDER_HEALTH_WINDOW_MINUTES` | `GET /rtc/providers/health` 未传 `windowMinutes` 时的默认窗口（分钟） | `60` |
| `RTC_PROVIDER_HEALTH_TOP_ERROR_LIMIT` | provider 健康报告默认 TopN 错误码数量 | `3` |
| `RTC_PROVIDER_HEALTH_MIN_SAMPLES` | provider 健康分级（healthy/degraded/unhealthy）默认最小样本数 | `5` |
| `RTC_PROVIDER_HEALTH_CONTROL_PLANE_MIN_SAMPLES` | 启用控制面重试/熔断阈值判定前所需最小控制面调用样本数 | `5` |
| `RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE` | `degraded` 默认失败率阈值 | `0.15` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE` | `unhealthy` 默认失败率阈值 | `0.35` |
| `RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS` | `degraded` 默认平均延迟阈值（毫秒） | `250` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS` | `unhealthy` 默认平均延迟阈值（毫秒） | `700` |
| `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_RETRY_RATE` | `degraded` 默认控制面重试率阈值 | `0.25` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_RETRY_RATE` | `unhealthy` 默认控制面重试率阈值 | `0.5` |
| `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE` | `degraded` 默认控制面熔断短路率阈值 | `0.05` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE` | `unhealthy` 默认控制面熔断短路率阈值 | `0.2` |
| `RTC_ENABLE_HEALTH_BASED_ROUTING` | 开启基于健康度的 provider 自动选路（仅在请求/房间未显式绑定 provider/channel 时生效） | `false` |
| `RTC_HEALTH_ROUTING_MIN_SAMPLES` | 自动选路生效所需最小样本数 | `20` |

## Provider 配置存储

服务端通过 `chat_rtc_channels` 表管理各 provider 凭据，建议每个 provider 维护一条活跃配置：

- `provider`: `volcengine` / `tencent` / `alibaba` / `livekit`
- `app_id` / `app_key` / `app_secret`
- `region` / `endpoint`
- `extra_config`（编解码/策略开关等）
- `is_active`

建议按 provider 配置 `extra_config`：

- Common control-plane keys（所有 provider 通用）
  - `controlPlaneMode`: `noop` | `delegate`（默认 `noop`）
  - `controlPlaneStrict`: `true` 时若 delegate 不可用则房间/成员操作直接失败
  - `controlPlaneBaseUrl`（或 `controlPlaneUrl`）：控制面代理服务基础地址
  - `controlPlaneAuthToken`: delegate 服务 Bearer Token（可选）
  - `controlPlaneTimeoutMs`: delegate 调用超时（毫秒）
  - `controlPlaneMaxRetries`: 可重试错误的最大重试次数（默认 `1`）
  - `controlPlaneRetryBaseDelayMs`: 指数退避基础延迟（毫秒，默认 `100`）
  - `controlPlaneRetryMaxDelayMs`: 指数退避最大延迟上限（毫秒，默认 `1000`）
  - `controlPlaneRetryJitterRatio`: 退避抖动比例，取值范围 `[0, 1]`（默认 `0.2`）
  - `controlPlaneRetryUnsafeOperations`: 是否对非幂等操作（`createRoom` / `addParticipant`）开启重试，默认 `false`
  - `controlPlaneIdempotencyHeader`: 非幂等操作的幂等请求头名（默认 `Idempotency-Key`）
  - `controlPlaneIdempotencyPrefix`: 幂等键前缀（默认 `${provider}:${operation}`）
  - `controlPlaneCircuitBreakerFailureThreshold`: 触发熔断所需连续失败次数（默认 `5`）
  - `controlPlaneCircuitBreakerOpenMs`: 熔断打开持续时间（毫秒，默认 `30000`）
  - `controlPlaneHeaders`: 额外请求头（可选）
  - 可选的按操作 URL（支持 `{roomId}` / `{userId}` 模板）：
    - `controlPlaneCreateRoomUrl`
    - `controlPlaneDestroyRoomUrl`
    - `controlPlaneGetRoomInfoUrl`
    - `controlPlaneAddParticipantUrl`
    - `controlPlaneRemoveParticipantUrl`
    - `controlPlaneGetParticipantsUrl`
  - 同时支持 provider 前缀版本，如 `volcengineControlPlaneBaseUrl`
- `volcengine`
  - `volcTokenMode`: `auto` | `delegate` | `openapi` | `local`
  - `allowLocalTokenFallback`: `true`/`false`
  - `tokenIssuerUrl` / `tokenIssuerAuthToken` / `tokenIssuerTimeoutMs`（delegate 模式）
  - `accessKeyId` / `secretAccessKey`（openapi 模式）
- `tencent`
  - `app_id`：腾讯 SDKAppID（必须是数字）
  - `app_secret`：UserSig 私钥
  - `tencentEnableUserBuf`：可选，启用基于房间的 token 权限绑定（`privateMapKey`/`userbuf`）
  - `tencentHostPrivilegeMap` / `tencentParticipantPrivilegeMap` / `tencentAudiencePrivilegeMap`：可选，权限位覆盖
- `alibaba`
  - `app_id`：阿里云 RTC AppID
  - `app_key`：阿里云 RTC AppKey（用于 token hash）
  - `endpoint` 或 `gslb`（可选）

系统会按如下优先级选择通话 provider：

1. 请求显式指定 `channelId`
2. 请求显式指定 `provider`
3. 房间绑定的 `channelId` / `provider`
4. `RTC_DEFAULT_PROVIDER`
5. 任意可用 active channel

## Provider 取值约束

- provider 仅支持 canonical 取值：`volcengine` / `tencent` / `alibaba` / `livekit`
- 新系统不支持任何历史别名输入

## AI 扩展

RTC 模块提供可选 AI 扩展注入点（`RTC_AI_EXTENSION`）：

- `onRoomCreated`
- `onRoomEnded`
- `onParticipantJoined`
- `onParticipantLeft`
- `onTokenIssued`

可用于后续接入实时 ASR/TTS、AI 同传、AI 助手入会等能力，而不侵入 RTC 核心逻辑。

## 说明

- 上述 health 默认值仅在请求未显式传入对应 query 参数时生效。
- 健康路由仅在请求未显式传 `channelId/provider` 且房间未绑定 `channelId/provider` 时生效。
- 关闭健康路由时，provider 选路保持原策略（优先 `RTC_DEFAULT_PROVIDER`，再回退任意 active channel）。
- 控制面熔断状态按 `provider + operation + delegate endpoint scope` 隔离，避免不同 channel 之间相互干扰。
- 阈值必须保持以下关系：
  - `RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE` < `RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE`
  - `RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS` < `RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS`
  - `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_RETRY_RATE` < `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_RETRY_RATE`
  - `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE` < `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE`
## 云厂商 API 参考

- 火山引擎 RTC OpenAPI `GetAppToken`：
  - https://www.volcengine.com/docs/6348/1094816
- 腾讯云 TRTC 服务端 Cloud API：
  - `DismissRoomByStrRoomId`：https://www.tencentcloud.com/document/product/647/55322
  - `RemoveUserByStrRoomId`：https://www.tencentcloud.com/document/product/647/55324
- 阿里云 ARTC 服务端 API：
  - `StopChannel`：https://help.aliyun.com/zh/apsaravideo-sdk/developer-reference/api-implenment
