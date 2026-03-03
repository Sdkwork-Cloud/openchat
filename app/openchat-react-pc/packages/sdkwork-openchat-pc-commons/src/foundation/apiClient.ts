import { API_BASE_URL } from "./env";

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue>;

interface RequestConfig extends RequestInit {
  params?: QueryParams;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

const SDK_API_PREFIX = normalizeSdkPrefix(import.meta.env.VITE_SDKWORK_APP_API_PREFIX || "/app/v3/api");
const SDK_INTEGRATION_ENABLED = parseBoolean(import.meta.env.VITE_SDKWORK_APP_ENABLED, true);
const AUTH_STORAGE_KEY = "openchat_auth_data";

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return defaultValue;
}

function normalizeSdkPrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return "/app/v3/api";
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

interface ClientTokens {
  authToken: string | null;
  accessToken: string | null;
}

function readEnvAccessToken(): string | null {
  return normalizeStoredToken((import.meta.env.VITE_ACCESS_TOKEN as string | undefined) || null);
}

function normalizeStoredToken(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readAuthToken(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const rawAuthData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawAuthData) {
    try {
      const parsed = JSON.parse(rawAuthData) as
        | { token?: unknown; authToken?: unknown }
        | null;
      if (parsed) {
        const cachedAuthToken =
          typeof parsed.authToken === "string"
            ? parsed.authToken
            : typeof parsed.token === "string"
              ? parsed.token
              : null;
        const normalized = normalizeStoredToken(cachedAuthToken);
        if (normalized) {
          return normalized;
        }
      }
    } catch {
      // Keep fallback behavior when auth storage payload is invalid.
    }
  }

  return normalizeStoredToken(localStorage.getItem("auth_token"));
}

function readAccessToken(): string | null {
  const envAccessToken = readEnvAccessToken();

  if (typeof localStorage === "undefined") {
    return envAccessToken;
  }

  const rawAuthData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawAuthData) {
    try {
      const parsed = JSON.parse(rawAuthData) as
        | { accessToken?: unknown; token?: unknown; authToken?: unknown }
        | null;
      if (parsed) {
        const cachedAccessToken =
          typeof parsed.accessToken === "string"
            ? parsed.accessToken
            : typeof parsed.token === "string"
              ? parsed.token
              : typeof parsed.authToken === "string"
                ? parsed.authToken
                : null;
        const normalized = normalizeStoredToken(cachedAccessToken);
        if (normalized) {
          return normalized;
        }
      }
    } catch {
      // Keep fallback behavior when auth storage payload is invalid.
    }
  }

  const preferred = normalizeStoredToken(localStorage.getItem("access_token"));
  if (preferred) {
    return preferred;
  }

  if (envAccessToken) {
    return envAccessToken;
  }

  // Compatibility fallback for existing app storage.
  return normalizeStoredToken(localStorage.getItem("token"));
}

function resolveClientTokens(): ClientTokens {
  return {
    authToken: readAuthToken(),
    accessToken: readAccessToken(),
  };
}

function sdkPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath.startsWith(`${SDK_API_PREFIX}/`) || normalizedPath === SDK_API_PREFIX) {
    return normalizedPath;
  }
  return `${SDK_API_PREFIX}${normalizedPath}`;
}

function endpointForMatch(endpoint: string): string | null {
  if (!endpoint || /^https?:\/\//i.test(endpoint)) {
    return null;
  }
  if (!endpoint.startsWith("/")) {
    return `/${endpoint}`;
  }
  return endpoint;
}

function resolveSdkEndpoint(endpoint: string, methodRaw: string): string | null {
  if (!SDK_INTEGRATION_ENABLED) {
    return null;
  }

  const method = methodRaw.toUpperCase();
  const normalized = endpointForMatch(endpoint);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith(SDK_API_PREFIX)) {
    return normalized;
  }

  // Search
  if (method === "GET" && normalized === "/search") return sdkPath("/search");
  if (normalized === "/search/history") return sdkPath("/search/history");
  if (method === "DELETE" && /^\/search\/history\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized);
  }
  if (method === "GET" && normalized === "/search/suggestions") return sdkPath("/search/suggestions");
  if (method === "GET" && normalized === "/search/trending") return sdkPath("/search/hot");

  // AppStore
  if (method === "GET" && normalized === "/appstore/categories") return sdkPath("/category");
  if (method === "GET" && normalized === "/appstore/apps") return sdkPath("/app/manage/search");
  if (method === "GET" && /^\/appstore\/apps\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/appstore/apps/", "/app/manage/"));
  }

  // Commerce / Products
  if (method === "GET" && normalized === "/commerce/categories") return sdkPath("/category");
  if (method === "GET" && normalized === "/commerce/products") return sdkPath("/products");
  if (method === "GET" && normalized === "/commerce/products/hot") return sdkPath("/products/hot");
  if (method === "GET" && normalized === "/commerce/products/new") return sdkPath("/products/latest");
  if (method === "GET" && /^\/commerce\/products\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/products/", "/products/"));
  }

  // Commerce / Cart
  if (method === "GET" && normalized === "/commerce/cart") return sdkPath("/cart");
  if (method === "GET" && normalized === "/commerce/cart/count") return sdkPath("/cart/statistics");
  if (method === "POST" && normalized === "/commerce/cart/items") return sdkPath("/cart/items");
  if (method === "PUT" && /^\/commerce\/cart\/items\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/cart/items/", "/cart/items/"));
  }
  if (method === "DELETE" && /^\/commerce\/cart\/items\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/cart/items/", "/cart/items/"));
  }
  if (method === "PUT" && /^\/commerce\/cart\/items\/[^/]+\/select$/.test(normalized)) {
    return sdkPath(normalized.replace("/commerce/cart/items/", "/cart/items/"));
  }
  if (method === "PUT" && normalized === "/commerce/cart/select-all") return sdkPath("/cart/items/select");
  if (method === "DELETE" && normalized === "/commerce/cart") return sdkPath("/cart");
  if (method === "DELETE" && normalized === "/commerce/cart/selected") return sdkPath("/cart/items");

  // Notification
  if ((method === "GET" || method === "POST") && normalized === "/notifications") {
    return sdkPath("/notification");
  }
  if (method === "GET" && normalized === "/notifications/page") return sdkPath("/notification");
  if (method === "GET" && normalized === "/notifications/unread-count") return sdkPath("/notification/unread/count");
  if (method === "PUT" && normalized === "/notifications/read-all") return sdkPath("/notification/read/all");
  if (method === "PUT" && /^\/notifications\/[^/]+\/read$/.test(normalized)) {
    return sdkPath(normalized.replace("/notifications/", "/notification/"));
  }
  if (method === "DELETE" && /^\/notifications\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/notifications/", "/notification/"));
  }
  if (method === "POST" && normalized === "/notifications/clear-read") return sdkPath("/notification/clear");
  if ((method === "GET" || method === "PUT") && normalized === "/notifications/settings") {
    return sdkPath("/notification/settings");
  }

  // Settings
  if (method === "GET" && normalized === "/settings") return sdkPath("/settings");
  if (method === "PUT" && normalized === "/settings/theme") return sdkPath("/settings/ui/theme");
  if (method === "PUT" && normalized === "/settings/privacy") return sdkPath("/settings/privacy");
  if (method === "PUT" && normalized === "/settings/notifications") return sdkPath("/notification/settings");
  if (method === "GET" && normalized === "/settings/models") return sdkPath("/models/active");
  if (method === "GET" && normalized === "/settings/check-update") return sdkPath("/settings/app/version");

  // Discover
  if (method === "GET" && normalized === "/discover/categories") return sdkPath("/category");
  if (method === "GET" && normalized === "/discover/feed") return sdkPath("/feeds/list");
  if (method === "GET" && normalized === "/discover/search") return sdkPath("/feeds/search");
  if (method === "GET" && normalized === "/discover/trending") return sdkPath("/feeds/hot");
  if (method === "GET" && normalized === "/discover/banners") return sdkPath("/advert/banner-adverts");

  // Social moments
  if (method === "GET" && normalized === "/social/moments") return sdkPath("/feeds/list");
  if (method === "POST" && /^\/social\/moments\/[^/]+\/like$/.test(normalized)) {
    return sdkPath(normalized.replace("/social/moments/", "/feeds/like/").replace(/\/like$/, ""));
  }
  if (method === "POST" && /^\/social\/moments\/[^/]+\/comments$/.test(normalized)) {
    return sdkPath("/comments");
  }
  if (method === "DELETE" && /^\/social\/moments\/[^/]+\/comments\/[^/]+$/.test(normalized)) {
    const tokens = normalized.split("/");
    return sdkPath(`/comments/${tokens[tokens.length - 1]}`);
  }

  // Video
  if (method === "GET" && normalized === "/videos") return sdkPath("/video/public");
  if (method === "GET" && normalized === "/videos/stats") return sdkPath("/video/statistics");
  if (method === "GET" && /^\/videos\/[^/]+$/.test(normalized)) {
    return sdkPath(normalized.replace("/videos/", "/video/"));
  }
  if (method === "POST" && /^\/videos\/[^/]+\/like$/.test(normalized)) {
    return sdkPath(normalized.replace("/videos/", "/video/"));
  }
  if (method === "POST" && /^\/videos\/[^/]+\/collect$/.test(normalized)) {
    return sdkPath(normalized.replace("/videos/", "/video/").replace("/collect", "/favorite"));
  }

  // Wallet
  if (method === "GET" && normalized === "/wallet/summary") return sdkPath("/account/cash");
  if (method === "GET" && normalized === "/wallet/transactions") return sdkPath("/account/cash/history");
  if (method === "POST" && normalized === "/wallet/transfer") return sdkPath("/account/cash/transfer");
  if (method === "GET" && normalized === "/wallet/payment-methods") return sdkPath("/payments/methods");

  // Device
  if ((method === "POST" || method === "GET") && (normalized === "/devices/register" || normalized === "/devices")) {
    return sdkPath("/notification/devices");
  }

  return null;
}

function buildUrl(endpoint: string, params?: QueryParams, withLegacyApiPrefix = true): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const resolvedEndpoint = endpoint.startsWith("http")
    ? endpoint
    : withLegacyApiPrefix
      ? `${API_BASE_URL}/api${normalizedEndpoint}`
      : `${API_BASE_URL}${normalizedEndpoint}`;
  const url = new URL(resolvedEndpoint);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function ensureJsonBody(body: BodyInit | null | undefined): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === "string") {
    return body;
  }
  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body;
  }
  return JSON.stringify(body);
}

function buildLegacyHeaders(headers: HeadersInit | undefined, tokens: ClientTokens): Headers {
  const merged = new Headers(headers || {});
  merged.set("Content-Type", "application/json");
  const legacyBearer = tokens.authToken || tokens.accessToken;
  if (legacyBearer) {
    merged.set("Authorization", `Bearer ${legacyBearer}`);
  }
  return merged;
}

function buildSdkHeaders(headers: HeadersInit | undefined, tokens: ClientTokens): Headers {
  const merged = new Headers(headers || {});
  merged.set("Content-Type", "application/json");
  if (tokens.authToken) {
    merged.set("Authorization", `Bearer ${tokens.authToken}`);
  } else if (tokens.accessToken) {
    merged.set("Authorization", `Bearer ${tokens.accessToken}`);
  }
  if (tokens.accessToken) {
    merged.set("Access-Token", tokens.accessToken);
  }
  return merged;
}

async function executeRequest<T>(url: string, config: RequestInit): Promise<T> {
  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, headers, ...rest } = config;
  const tokens = resolveClientTokens();
  const method = String(rest.method || "GET").toUpperCase();
  const body = ensureJsonBody(rest.body as BodyInit | null | undefined);
  const sdkEndpoint = resolveSdkEndpoint(endpoint, method);

  const runLegacyRequest = () =>
    executeRequest<T>(buildUrl(endpoint, params, true), {
      ...rest,
      body,
      headers: buildLegacyHeaders(headers, tokens),
    });

  if (!sdkEndpoint) {
    return runLegacyRequest();
  }

  const sdkDirectUrl = buildUrl(sdkEndpoint, params, false);
  const sdkGatewayUrl = buildUrl(sdkEndpoint, params, true);
  const runSdkRequest = (url: string) =>
    executeRequest<T>(url, {
      ...rest,
      body,
      headers: buildSdkHeaders(headers, tokens),
    });

  try {
    return await runSdkRequest(sdkDirectUrl);
  } catch {
    if (sdkGatewayUrl !== sdkDirectUrl) {
      try {
        return await runSdkRequest(sdkGatewayUrl);
      } catch {
        return runLegacyRequest();
      }
    }
    return runLegacyRequest();
  }
}

export const apiClient = {
  get<T>(endpoint: string, config?: RequestConfig) {
    return request<T>(endpoint, { ...config, method: "GET" });
  },
  post<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return request<T>(endpoint, {
      ...config,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  put<T>(endpoint: string, body?: unknown, config?: RequestConfig) {
    return request<T>(endpoint, {
      ...config,
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  delete<T>(endpoint: string, config?: RequestConfig) {
    return request<T>(endpoint, { ...config, method: "DELETE" });
  },
};

export default apiClient;
