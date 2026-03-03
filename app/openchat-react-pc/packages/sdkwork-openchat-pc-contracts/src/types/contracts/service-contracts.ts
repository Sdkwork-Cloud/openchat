/**
 * Global service contract types.
 */

export type ServiceStatus = "idle" | "initializing" | "ready" | "error";

export type ServiceErrorCode =
  | "UNKNOWN_ERROR"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "SDK_UNAVAILABLE";

export interface ServiceLifecycle {
  initialize?: () => void | Promise<void>;
  destroy?: () => void | Promise<void>;
}

export interface ServiceHealth {
  status: ServiceStatus;
  lastUpdatedAt: number;
  message?: string;
}

export interface ServiceError {
  code: ServiceErrorCode | string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export interface SDKAdapterBridge {
  readonly kind: "sdk";
  isAvailable(): boolean;
  invoke?<TInput = unknown, TOutput = unknown>(method: string, payload?: TInput): Promise<TOutput>;
}

export type ServiceSource = "sdk" | "http" | "http-or-mock" | "local" | "mock";

export interface ServiceMeta {
  traceId?: string;
  requestId?: string;
  userId?: string;
  timestamp?: number;
  durationMs?: number;
  source?: ServiceSource;
}

/**
 * Backward-compatible service result shape.
 * Existing call sites can keep using `success/data/error`,
 * while new implementations can attach `errorCode`, `errorDetail`, and `meta`.
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number | string;
  errorCode?: ServiceErrorCode | string;
  errorDetail?: ServiceError;
  meta?: ServiceMeta;
}

export interface ServiceContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
}

export type ServiceExecutor<TInput, TOutput> = (
  input: TInput,
  context?: ServiceContext
) => Promise<ServiceResult<TOutput>>;
