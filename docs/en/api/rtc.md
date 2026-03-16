# Real-time Audio/Video API

This document matches the current backend implementation (`RTCController`).

- Base path: `/im/api/v1/rtc`
- Auth: JWT required for all endpoints
- Default provider: `volcengine`
- Supported providers: `volcengine`, `tencent`, `alibaba`, `livekit`

## Room APIs

- `POST /rtc/rooms` - Create room
- `PUT /rtc/rooms/:id/end` - End room (creator only)
- `GET /rtc/rooms/:id` - Get room detail (participants only)
- `GET /rtc/rooms/user/:userId` - List user rooms (self only)
- `POST /rtc/rooms/:id/participants` - Add participant (creator only)
- `DELETE /rtc/rooms/:id/participants/:userId` - Remove participant (creator or self)

## Token APIs

- `POST /rtc/tokens` - Generate RTC token
- Standard: `POST /rtc/tokens/validate` - Validate token

Standard request body:

```json
{
  "token": "rtc_xxx"
}
```

Standard response body (raw token is never returned):

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

Token generation supports provider routing:

1. explicit `channelId`
2. explicit `provider`
3. room-bound `channelId` / `provider`
4. `RTC_DEFAULT_PROVIDER`
5. any active channel

If `RTC_ENABLE_HEALTH_BASED_ROUTING=true`, and request/room does not pin route (`channelId`/`provider`), backend may prefer healthiest provider before default-provider fallback.

If an explicit `provider` is requested but no active channel exists for it, the request fails (no silent fallback).
If request `provider`/`channelId` conflicts with room-bound routing, the request fails with `400` (no cross-cloud override).
Provider-native token strategy:

- `tencent`: TRTC UserSig (`TLSSigAPIv2` compatible payload/signature).
  - Supports optional `userbuf/privateMapKey` binding to room permissions when enabled in channel `extra_config`.
- `alibaba`: RTC auth payload (`base64(json)`) with `sha256(appid + appkey + channelid + userid + nonce + timestamp)`.
- `volcengine`:
  - `delegate` mode: call external token issuer service.
  - `openapi` mode: call Volcengine `GetAppToken` with official OpenAPI signer.
  - `local` mode: fallback local signed token for non-production/testing only.

### Provider Error Contract

When provider-side operations fail (`createRoom` / `generateToken` / `validateToken`), API returns a normalized error body:

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

Field semantics:

- `providerStatusCode`: upstream provider HTTP-like status observed by backend.
- `providerErrorCode`: vendor-native code (or normalized fallback code).
- `retryable`: backend retry hint for client orchestration.
- `providerMessage`: vendor message for diagnostics.

## Channel Config APIs

- `POST /rtc/channels` - Create or upsert channel config
- `GET /rtc/channels` - List channel configs
- `GET /rtc/channels/:id` - Get channel config
- `PUT /rtc/channels/:id` - Update channel config
- `DELETE /rtc/channels/:id` - Soft delete channel config
- `GET /rtc/providers/stats` - Provider operation stats (`createRoom` / `generateToken` / `validateToken`)
- `GET /rtc/providers/health` - Provider health report and routing recommendation
- `GET /rtc/providers/capabilities` - Provider capability matrix for SDK dynamic integration

Channel read APIs return masked `appSecret` values.
Channel config management endpoints are admin-only.
Provider stats endpoint is admin-only and returns in-memory operation counters/last error metadata for observability.
Provider capabilities endpoint is intended for SDK/client integration discovery (default provider, recommended primary, active providers, and capability labels).

Provider stats query options:

- `provider`: filter by provider name (canonical values only: `volcengine` / `tencent` / `alibaba` / `livekit`).
- `operation`: filter by `createRoom` / `generateToken` / `validateToken`.
- `windowMinutes`: aggregate only events in the recent window (`1`~`1440` minutes).
- `topErrorLimit`: return top-N error codes (`1`~`10`, default `3`).

Example response item:

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

Provider health query options:

- `provider`: provider filter.
- `operation`: operation filter.
- `windowMinutes`: time window (`1`~`1440`, default `60`).
- `topErrorLimit`: top-N errors (`1`~`10`, default `3`).
- `minSamples`: minimum samples before classifying (`default 5`).
- `controlPlaneMinSamples`: minimum control-plane invocation samples before applying control-plane thresholds (`default 5`).
- `degradedFailureRate` / `unhealthyFailureRate`: failure-rate thresholds.
- `degradedLatencyMs` / `unhealthyLatencyMs`: latency thresholds.
- `degradedControlPlaneRetryRate` / `unhealthyControlPlaneRetryRate`: control-plane retry-rate thresholds.
- `degradedControlPlaneCircuitOpenRate` / `unhealthyControlPlaneCircuitOpenRate`: control-plane circuit-open short-circuit rate thresholds.

Provider health report contains:

- `status`: `healthy` / `degraded` / `unknown` / `unhealthy`
- `healthReasons`: classification reasons (`insufficient_samples` / `high_failure_rate` / `high_latency` / `high_control_plane_retry_rate` / `high_control_plane_circuit_open_rate`)
- `controlPlaneSignalsEvaluated`: whether control-plane thresholds are applied for this provider (requires `controlPlaneInvocations >= controlPlaneMinSamples`)
- `recommendedPrimary`: suggested routing primary provider
- `fallbackOrder`: ordered fallback providers

## Observability Metrics

Prometheus endpoint `/metrics` exports RTC provider metrics:

- `rtc_provider_operations_total{provider,operation,status,retryable}`
- `rtc_provider_operation_duration_seconds{provider,operation,status}`
- `rtc_provider_health_status{provider,status}` (`1` for current status, `0` for others)
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

## Video Record APIs

- `POST /rtc/video-records`
- `GET /rtc/video-records/:id`
- `GET /rtc/rooms/:roomId/video-records`
- `GET /rtc/users/:userId/video-records` (self only)
- `PUT /rtc/video-records/:id/status`
- `PUT /rtc/video-records/:id/metadata`
- `DELETE /rtc/video-records/:id` (soft delete)
- `GET /rtc/video-records?limit=50&offset=0` (current user's own records, paged)

Access policy:

- `GET /rtc/video-records/:id`: record owner or room participant only.
- `GET /rtc/rooms/:roomId/video-records`: room participants only.
- `PUT /rtc/video-records/:id/status|metadata` and `DELETE /rtc/video-records/:id`: record owner or room creator only.

## AI Extension Readiness

RTC module exposes optional lifecycle hooks via `RTC_AI_EXTENSION`:

- `onRoomCreated`
- `onRoomEnded`
- `onParticipantJoined`
- `onParticipantLeft`
- `onTokenIssued`

This allows future AI real-time features (ASR/TTS/co-host/summarization) without coupling core RTC flow.
