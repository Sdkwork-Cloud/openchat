import type {
  ServiceErrorCode,
  ServiceMeta,
  ServiceResult,
} from "../types/contracts/service-contracts";

interface LegacyResultLike<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number | string;
}

interface HttpLikeError {
  message?: string;
  status?: number;
  code?: number | string;
  response?: {
    status?: number;
  };
}

export interface ServiceResultFailureOptions {
  source?: ServiceMeta["source"];
  fallbackMessage?: string;
  fallbackCode?: ServiceErrorCode;
}

export interface ServiceResultNormalizeOptions {
  source?: ServiceMeta["source"];
  fallbackMessage?: string;
  fallbackCode?: ServiceErrorCode;
}

export interface ServiceResultProxyOptions {
  source?: ServiceMeta["source"];
  fallbackMessage?: string;
  fallbackCode?: ServiceErrorCode;
}

type AnyFn = (...args: unknown[]) => unknown;
type PromiseLikeValue<T = unknown> = PromiseLike<T> & { then: PromiseLike<T>["then"] };
type UnwrapLegacyResult<T> = T extends LegacyResultLike<infer D> ? D : T;

export type ResultifiedService<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
    ? (...args: A) => Promise<ServiceResult<UnwrapLegacyResult<R>>>
    : T[K] extends (...args: infer A) => infer R
      ? (...args: A) => ServiceResult<UnwrapLegacyResult<R>>
      : T[K];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPromiseLike(value: unknown): value is PromiseLikeValue {
  return isObject(value) && typeof value.then === "function";
}

function isLegacyResultLike<T = unknown>(value: unknown): value is LegacyResultLike<T> {
  if (!isObject(value)) {
    return false;
  }
  if (typeof value.success !== "boolean") {
    return false;
  }
  return "data" in value || "error" in value || "message" in value || "code" in value;
}

function parseErrorStatus(error: unknown): number | undefined {
  if (!isObject(error)) {
    return undefined;
  }
  const httpLike = error as HttpLikeError;
  if (typeof httpLike.status === "number") {
    return httpLike.status;
  }
  if (typeof httpLike.response?.status === "number") {
    return httpLike.response.status;
  }
  if (typeof httpLike.code === "number") {
    return httpLike.code;
  }
  if (typeof httpLike.code === "string") {
    const parsed = Number(httpLike.code);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (typeof httpLike.message === "string") {
    const matched = httpLike.message.match(/\bHTTP\s+(\d{3})\b/i);
    if (matched) {
      return Number(matched[1]);
    }
  }
  return undefined;
}

function resolveErrorCode(
  status: number | undefined,
  message: string | undefined,
  fallbackCode: ServiceErrorCode = "UNKNOWN_ERROR",
): ServiceErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 408) return "TIMEOUT";

  const normalized = (message || "").toLowerCase();
  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "NETWORK_ERROR";
  }
  if (normalized.includes("网络")) {
    return "NETWORK_ERROR";
  }
  if (normalized.includes("timeout")) {
    return "TIMEOUT";
  }
  if (normalized.includes("超时")) {
    return "TIMEOUT";
  }
  if (normalized.includes("unauthorized") || normalized.includes("token")) {
    return "UNAUTHORIZED";
  }
  if (normalized.includes("未登录") || normalized.includes("过期")) {
    return "UNAUTHORIZED";
  }
  if (normalized.includes("forbidden")) {
    return "FORBIDDEN";
  }
  if (normalized.includes("not found")) {
    return "NOT_FOUND";
  }
  if (normalized.includes("不存在")) {
    return "NOT_FOUND";
  }
  if (normalized.includes("conflict") || normalized.includes("already exists")) {
    return "CONFLICT";
  }
  if (normalized.includes("已存在")) {
    return "CONFLICT";
  }
  if (normalized.includes("validation") || normalized.includes("invalid")) {
    return "VALIDATION_ERROR";
  }
  if (
    normalized.includes("不能为空") ||
    normalized.includes("格式不正确") ||
    normalized.includes("不一致") ||
    normalized.includes("请求参数错误")
  ) {
    return "VALIDATION_ERROR";
  }
  if (normalized.includes("rate") || normalized.includes("频率")) {
    return "RATE_LIMITED";
  }

  return fallbackCode;
}

export function createSuccessServiceResult<T>(
  data: T,
  source: ServiceMeta["source"] = "local",
): ServiceResult<T> {
  return {
    success: true,
    data,
    meta: {
      source,
      timestamp: Date.now(),
    },
  };
}

export function createFailureServiceResult<T>(
  error: unknown,
  options: ServiceResultFailureOptions = {},
): ServiceResult<T> {
  const source = options.source || "http";
  const fallbackMessage = options.fallbackMessage || "Service call failed.";
  const message = error instanceof Error ? error.message : String(error || fallbackMessage);
  const status = parseErrorStatus(error);
  const errorCode = resolveErrorCode(status, message, options.fallbackCode);

  return {
    success: false,
    error: message || fallbackMessage,
    message: message || fallbackMessage,
    code: status,
    errorCode,
    errorDetail: {
      code: errorCode,
      message: message || fallbackMessage,
      details: error,
      retryable: errorCode === "NETWORK_ERROR" || errorCode === "TIMEOUT",
    },
    meta: {
      source,
      timestamp: Date.now(),
    },
  };
}

export function normalizeServiceResult<T>(
  value: T,
  options: ServiceResultNormalizeOptions = {},
): ServiceResult<T> {
  const source = options.source || "http";

  if (isLegacyResultLike(value)) {
    if (value.success) {
      return {
        success: true,
        data: (value.data as T | undefined) ?? (undefined as T | undefined),
        message: value.message,
        code: value.code,
        meta: {
          source,
          timestamp: Date.now(),
        },
      };
    }

    const errorMessage = value.error || value.message || options.fallbackMessage || "Service call failed.";
    const numericCode = typeof value.code === "number" ? value.code : undefined;
    const errorCode = resolveErrorCode(numericCode, errorMessage, options.fallbackCode);
    return {
      success: false,
      data: value.data as T | undefined,
      error: errorMessage,
      message: errorMessage,
      code: value.code,
      errorCode,
      errorDetail: {
        code: errorCode,
        message: errorMessage,
      },
      meta: {
        source,
        timestamp: Date.now(),
      },
    };
  }

  return createSuccessServiceResult(value, source);
}

export function createServiceResultProxy<T extends object>(
  target: T,
  options: ServiceResultProxyOptions = {},
): ResultifiedService<T> {
  const source = options.source || "http";
  const fallbackMessage = options.fallbackMessage || "Service call failed.";
  const fallbackCode = options.fallbackCode;

  return new Proxy(target as object, {
    get(currentTarget, property, receiver) {
      const value = Reflect.get(currentTarget, property, receiver);
      if (typeof value !== "function") {
        return value;
      }

      return (...args: unknown[]) => {
        try {
          const output = (value as AnyFn).apply(currentTarget, args);

          if (isPromiseLike(output)) {
            return Promise.resolve(output)
              .then((resolved) =>
                normalizeServiceResult(resolved, {
                  source,
                  fallbackMessage,
                  fallbackCode,
                }),
              )
              .catch((error: unknown) =>
                createFailureServiceResult(error, {
                  source,
                  fallbackMessage,
                  fallbackCode,
                }),
              );
          }

          return normalizeServiceResult(output, {
            source,
            fallbackMessage,
            fallbackCode,
          });
        } catch (error) {
          return createFailureServiceResult(error, {
            source,
            fallbackMessage,
            fallbackCode,
          });
        }
      };
    },
  }) as ResultifiedService<T>;
}
