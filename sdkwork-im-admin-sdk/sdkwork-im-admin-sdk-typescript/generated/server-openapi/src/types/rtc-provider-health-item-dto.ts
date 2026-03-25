import type { RtcProviderOperationErrorCountDto } from './rtc-provider-operation-error-count-dto';

export interface RtcProviderHealthItemDto {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** Reasons that drove current health status */
  healthReasons: 'insufficient_samples' | 'high_failure_rate' | 'high_latency' | 'high_control_plane_retry_rate' | 'high_control_plane_circuit_open_rate'[];
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  failureRate: number;
  retryableFailureRate: number;
  avgDurationMs: number;
  /** Total control-plane delegate invocations observed in this window */
  controlPlaneInvocations: number;
  /** Total control-plane retry attempts observed in this window */
  controlPlaneRetries: number;
  /** Total short-circuited control-plane calls due to open circuit in this window */
  controlPlaneCircuitOpenShortCircuits: number;
  /** Total unsafe control-plane calls with idempotency protection enabled in this window */
  controlPlaneUnsafeIdempotencyCalls: number;
  /** Control-plane retry ratio: controlPlaneRetries / controlPlaneInvocations */
  controlPlaneRetryRate: number;
  /** Control-plane circuit-open ratio: short-circuit count / controlPlaneInvocations */
  controlPlaneCircuitOpenRate: number;
  /** Whether control-plane thresholds are evaluated (requires controlPlaneMinSamples) */
  controlPlaneSignalsEvaluated: boolean;
  topErrors: RtcProviderOperationErrorCountDto[];
  updatedAt?: string;
}
