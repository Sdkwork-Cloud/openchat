import type { RtcProviderOperationErrorCountDto } from './rtc-provider-operation-error-count-dto';

export interface RtcProviderOperationStatDto {
  provider: string;
  operation: 'createRoom' | 'generateToken' | 'validateToken';
  total: number;
  success: number;
  failure: number;
  retryableFailure: number;
  avgDurationMs: number;
  /** Total control-plane delegate invocations observed in this provider operation */
  controlPlaneInvocations: number;
  /** Total control-plane retry attempts observed in this provider operation */
  controlPlaneRetries: number;
  /** Total short-circuited control-plane calls due to open circuit */
  controlPlaneCircuitOpenShortCircuits: number;
  /** Total unsafe control-plane calls with idempotency protection enabled */
  controlPlaneUnsafeIdempotencyCalls: number;
  lastStatus: 'success' | 'failure';
  lastDurationMs: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  topErrors: RtcProviderOperationErrorCountDto[];
  updatedAt: string;
}
