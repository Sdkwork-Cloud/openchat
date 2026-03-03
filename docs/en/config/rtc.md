# RTC Configuration

## Goals

- Use Volcengine (`volcengine`) as the default RTC provider.
- Keep Tencent (`tencent`) and Alibaba (`alibaba`) as first-class supported providers.
- Leave clean extension points for future AI real-time features.

## Core Config

```json
{
  "rtc": {
    "enabled": true,
    "defaultProvider": "volcengine"
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RTC_DEFAULT_PROVIDER` | Default RTC provider (`volcengine`/`tencent`/`alibaba`/`livekit`) | `volcengine` |
| `RTC_PROVIDER_STATS_HISTORY_MAX_EVENTS` | Max in-memory provider operation events retained per `provider:operation` key | `5000` |
| `RTC_PROVIDER_STATS_HISTORY_MAX_AGE_MINUTES` | Max event retention window in minutes for provider stats history | `1440` |
| `RTC_PROVIDER_HEALTH_WINDOW_MINUTES` | Default rolling window minutes for `GET /rtc/providers/health` when query omits `windowMinutes` | `60` |
| `RTC_PROVIDER_HEALTH_TOP_ERROR_LIMIT` | Default `topErrors` size for provider health report | `3` |
| `RTC_PROVIDER_HEALTH_MIN_SAMPLES` | Default minimum sample size for health classification (`healthy/degraded/unhealthy`) | `5` |
| `RTC_PROVIDER_HEALTH_CONTROL_PLANE_MIN_SAMPLES` | Minimum control-plane invocation samples before applying retry/circuit thresholds | `5` |
| `RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE` | Default failure-rate threshold for `degraded` | `0.15` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE` | Default failure-rate threshold for `unhealthy` | `0.35` |
| `RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS` | Default avg-latency threshold (ms) for `degraded` | `250` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS` | Default avg-latency threshold (ms) for `unhealthy` | `700` |
| `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_RETRY_RATE` | Default control-plane retry-rate threshold for `degraded` | `0.25` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_RETRY_RATE` | Default control-plane retry-rate threshold for `unhealthy` | `0.5` |
| `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE` | Default control-plane circuit-open short-circuit rate threshold for `degraded` | `0.05` |
| `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE` | Default control-plane circuit-open short-circuit rate threshold for `unhealthy` | `0.2` |
| `RTC_ENABLE_HEALTH_BASED_ROUTING` | Enable health-based provider auto-routing when request/room does not pin provider/channel | `false` |
| `RTC_HEALTH_ROUTING_MIN_SAMPLES` | Minimum samples required by health-based auto-routing | `20` |

## Provider Credentials

Provider credentials are managed in `chat_rtc_channels`:

- `provider`: `volcengine` / `tencent` / `alibaba` / `livekit`
- `app_id` / `app_key` / `app_secret`
- `region` / `endpoint`
- `extra_config`
- `is_active`

Recommended `extra_config` by provider:

- Common control-plane keys (all providers)
  - `controlPlaneMode`: `noop` | `delegate` (default `noop`)
  - `controlPlaneStrict`: when `true`, room/participant operations fail fast if delegate is unavailable
  - `controlPlaneBaseUrl` (or `controlPlaneUrl`): base URL of control-plane delegate service
  - `controlPlaneAuthToken`: optional bearer token for delegate service
  - `controlPlaneTimeoutMs`: delegate timeout in milliseconds
  - `controlPlaneMaxRetries`: max retries for retryable failures (default `1`)
  - `controlPlaneRetryBaseDelayMs`: exponential backoff base delay in milliseconds (default `100`)
  - `controlPlaneRetryMaxDelayMs`: backoff max delay cap in milliseconds (default `1000`)
  - `controlPlaneRetryJitterRatio`: backoff jitter ratio in `[0, 1]` (default `0.2`)
  - `controlPlaneRetryUnsafeOperations`: enable retries for unsafe operations (`createRoom` / `addParticipant`), default `false`
  - `controlPlaneIdempotencyHeader`: idempotency header name for unsafe operations (default `Idempotency-Key`)
  - `controlPlaneIdempotencyPrefix`: idempotency key prefix (default `${provider}:${operation}`)
  - `controlPlaneCircuitBreakerFailureThreshold`: consecutive failures needed to open circuit (default `5`)
  - `controlPlaneCircuitBreakerOpenMs`: circuit open duration in milliseconds (default `30000`)
  - `controlPlaneHeaders`: optional extra headers object
  - Optional operation-specific URLs (support `{roomId}` / `{userId}` placeholders):
    - `controlPlaneCreateRoomUrl`
    - `controlPlaneDestroyRoomUrl`
    - `controlPlaneGetRoomInfoUrl`
    - `controlPlaneAddParticipantUrl`
    - `controlPlaneRemoveParticipantUrl`
    - `controlPlaneGetParticipantsUrl`
  - Provider-scoped variants are also supported, e.g. `volcengineControlPlaneBaseUrl`.

- `volcengine`
  - `volcTokenMode`: `auto` | `delegate` | `openapi` | `local`
  - `allowLocalTokenFallback`: `true`/`false`
  - `tokenIssuerUrl` / `tokenIssuerAuthToken` / `tokenIssuerTimeoutMs` (delegate mode)
  - `accessKeyId` / `secretAccessKey` (openapi mode)
- `tencent`
  - `app_id`: Tencent SDKAppID (must be numeric)
  - `app_secret`: UserSig private key
  - `tencentEnableUserBuf`: optional, bind token permission to room (`privateMapKey`/`userbuf`)
  - `tencentHostPrivilegeMap` / `tencentParticipantPrivilegeMap` / `tencentAudiencePrivilegeMap`: optional privilege map override
- `alibaba`
  - `app_id`: Alibaba RTC AppID
  - `app_key`: Alibaba RTC AppKey (used for token hash)
  - `endpoint` or `gslb` (optional)

Provider resolution priority:

1. Explicit `channelId` in request
2. Explicit `provider` in request
3. Room-bound `channelId` / `provider`
4. `RTC_DEFAULT_PROVIDER`
5. Any active channel

## Provider Value Constraints

- Provider must use canonical values only: `volcengine` / `tencent` / `alibaba` / `livekit`
- This new system does not accept legacy aliases

## AI Extension Hooks

Optional extension token: `RTC_AI_EXTENSION`

- `onRoomCreated`
- `onRoomEnded`
- `onParticipantJoined`
- `onParticipantLeft`
- `onTokenIssued`

Use this to attach future capabilities like real-time ASR/TTS, AI assistant co-hosting, and call summarization without coupling core RTC logic.

## Notes

- Health defaults above are applied only when the corresponding query field is omitted.
- Health-based routing applies only when `channelId/provider` is not explicitly provided in request and room does not pin provider/channel.
- When health-based routing is disabled, provider resolution keeps original behavior (`RTC_DEFAULT_PROVIDER` first, then any active channel).
- Control-plane circuit breaker state is scoped by `provider + operation + delegate endpoint scope` to avoid cross-channel interference.
- Keep threshold ordering valid:
  - `RTC_PROVIDER_HEALTH_DEGRADED_FAILURE_RATE` < `RTC_PROVIDER_HEALTH_UNHEALTHY_FAILURE_RATE`
  - `RTC_PROVIDER_HEALTH_DEGRADED_LATENCY_MS` < `RTC_PROVIDER_HEALTH_UNHEALTHY_LATENCY_MS`
  - `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_RETRY_RATE` < `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_RETRY_RATE`
  - `RTC_PROVIDER_HEALTH_DEGRADED_CONTROL_PLANE_CIRCUIT_OPEN_RATE` < `RTC_PROVIDER_HEALTH_UNHEALTHY_CONTROL_PLANE_CIRCUIT_OPEN_RATE`

## Vendor API References

- Volcengine RTC OpenAPI `GetAppToken`:
  - https://www.volcengine.com/docs/6348/1094816
- Tencent TRTC server-side Cloud API:
  - `DismissRoomByStrRoomId`: https://www.tencentcloud.com/document/product/647/55322
  - `RemoveUserByStrRoomId`: https://www.tencentcloud.com/document/product/647/55324
- Alibaba ARTC server API:
  - `StopChannel`: https://help.aliyun.com/zh/apsaravideo-sdk/developer-reference/api-implenment
