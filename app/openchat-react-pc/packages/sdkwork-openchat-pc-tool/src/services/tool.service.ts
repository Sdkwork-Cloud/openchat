import { apiClient, IS_DEV } from "@sdkwork/openchat-pc-kernel";
import {
  ToolCategory,
  type AuthConfig,
  type ToolCategoryInfo,
  type ToolMarketItem,
  type ToolTestResult,
  type UserTool,
} from "../entities/tool.entity";

const TOOL_ENDPOINT = "/tools";
const MY_TOOLS_STORAGE_KEY = "openchat.tools.enabled";
const FAVORITE_TOOLS_STORAGE_KEY = "openchat.tools.favorite";
const RECENT_TOOLS_STORAGE_KEY = "openchat.tools.recent";
const MAX_RECENT_TOOL_COUNT = 12;

const fallbackTools: ToolMarketItem[] = [
  {
    id: "tool-weather",
    name: "Weather Query",
    description: "Get live weather and forecast for global cities.",
    icon: "WTH",
    category: ToolCategory.UTILITY,
    version: "1.0.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.weather.example.com/v1",
    method: "GET",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 15000,
    successRate: 0.98,
    avgResponseTime: 200,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "tool-email",
    name: "Email Sender",
    description: "Send transactional email through SMTP-compatible gateway.",
    icon: "EML",
    category: ToolCategory.UTILITY,
    version: "1.0.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.email.example.com/send",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 8900,
    successRate: 0.95,
    avgResponseTime: 500,
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2024-03-05T00:00:00Z",
  },
  {
    id: "tool-sql",
    name: "SQL Query",
    description: "Run SQL against configured datasets.",
    icon: "SQL",
    category: ToolCategory.DEVELOPER,
    version: "1.0.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.db.example.com/query",
    method: "POST",
    auth: { type: "bearer", token: "" },
    usageCount: 5600,
    successRate: 0.99,
    avgResponseTime: 150,
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "tool-pdf",
    name: "PDF Generator",
    description: "Generate PDF from HTML or JSON payloads.",
    icon: "PDF",
    category: ToolCategory.DATA,
    version: "1.0.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.pdf.example.com/generate",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 4500,
    successRate: 0.97,
    avgResponseTime: 800,
    createdAt: "2024-02-10T00:00:00Z",
    updatedAt: "2024-03-12T00:00:00Z",
  },
  {
    id: "tool-ocr",
    name: "OCR Recognizer",
    description: "Extract text from images with multilingual support.",
    icon: "OCR",
    category: ToolCategory.AI,
    version: "1.0.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    endpoint: "https://api.ocr.example.com/recognize",
    method: "POST",
    auth: { type: "api_key", apiKey: "" },
    usageCount: 7800,
    successRate: 0.96,
    avgResponseTime: 600,
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2024-03-15T00:00:00Z",
  },
];

const fallbackCategories: ToolCategoryInfo[] = [
  { id: "all", name: "All", icon: "ALL" },
  { id: ToolCategory.UTILITY, name: "Utility", icon: "UTL" },
  { id: ToolCategory.DEVELOPER, name: "Developer", icon: "DEV" },
  { id: ToolCategory.DATA, name: "Data", icon: "DAT" },
  { id: ToolCategory.AI, name: "AI", icon: "AI" },
];

let enabledTools = new Map<string, UserTool>();
let favoriteToolIds = new Set<string>();
let recentToolIds: string[] = [];

function readEnabledToolsFromStorage(): Map<string, UserTool> {
  if (typeof localStorage === "undefined") {
    return new Map<string, UserTool>();
  }

  try {
    const raw = localStorage.getItem(MY_TOOLS_STORAGE_KEY);
    if (!raw) {
      return new Map<string, UserTool>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Map<string, UserTool>();
    }

    const map = new Map<string, UserTool>();
    parsed.forEach((item) => {
      const normalized = normalizeUserTool(item);
      if (normalized.toolId) {
        map.set(normalized.toolId, normalized);
      }
    });
    return map;
  } catch {
    return new Map<string, UserTool>();
  }
}

function persistEnabledTools(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  const list = Array.from(enabledTools.values()).map((item) => ({ ...item }));
  localStorage.setItem(MY_TOOLS_STORAGE_KEY, JSON.stringify(list));
}

function readFavoriteToolIdsFromStorage(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(FAVORITE_TOOLS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function persistFavoriteToolIds(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(FAVORITE_TOOLS_STORAGE_KEY, JSON.stringify(Array.from(favoriteToolIds)));
}

function readRecentToolIdsFromStorage(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_TOOLS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, MAX_RECENT_TOOL_COUNT);
  } catch {
    return [];
  }
}

function persistRecentToolIds(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(
    RECENT_TOOLS_STORAGE_KEY,
    JSON.stringify(recentToolIds.slice(0, MAX_RECENT_TOOL_COUNT)),
  );
}

enabledTools = readEnabledToolsFromStorage();
favoriteToolIds = readFavoriteToolIdsFromStorage();
recentToolIds = readRecentToolIdsFromStorage();

function cloneTool(tool: ToolMarketItem): ToolMarketItem {
  return {
    ...tool,
    auth: { ...tool.auth },
    headers: tool.headers ? { ...tool.headers } : undefined,
  };
}

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function normalizeTool(raw: unknown): ToolMarketItem {
  const data = raw as Partial<ToolMarketItem>;
  return {
    id: data.id || "",
    name: data.name || "Unknown Tool",
    description: data.description || "",
    icon: data.icon || "TOOL",
    category: (data.category as ToolCategory) || ToolCategory.CUSTOM,
    version: data.version || "0.0.1",
    provider: data.provider || "Unknown",
    isPublic: Boolean(data.isPublic),
    isBuiltin: Boolean(data.isBuiltin),
    endpoint: data.endpoint || "",
    method: data.method || "POST",
    auth: data.auth || { type: "none" },
    headers: data.headers,
    timeout: data.timeout,
    usageCount: Number(data.usageCount ?? 0),
    successRate: Number(data.successRate ?? 0),
    avgResponseTime: Number(data.avgResponseTime ?? 0),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    isEnabled: Boolean(data.isEnabled),
  };
}

function normalizeUserTool(raw: unknown): UserTool {
  const data = raw as Partial<UserTool>;
  return {
    id: data.id || `user-tool-${Date.now()}`,
    toolId: data.toolId || "",
    userId: data.userId || "current-user",
    credentials: data.credentials,
    config: (data.config as Record<string, unknown>) || {},
    enabled: data.enabled ?? true,
    usageCount: Number(data.usageCount ?? 0),
    lastUsedAt: data.lastUsedAt,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function withFallback<T>(
  apiTask: () => Promise<T>,
  fallbackTask: () => T | Promise<T>,
): Promise<T> {
  return apiTask().catch((error) => {
    if (IS_DEV) {
      return fallbackTask();
    }
    throw error;
  });
}

function sortTools(
  tools: ToolMarketItem[],
  sortBy: "popular" | "successRate" | "newest",
): ToolMarketItem[] {
  const list = [...tools];
  if (sortBy === "popular") {
    list.sort((a, b) => b.usageCount - a.usageCount);
  } else if (sortBy === "successRate") {
    list.sort((a, b) => b.successRate - a.successRate);
  } else {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return list;
}

export const ToolService = {
  getFavoriteToolIds(): string[] {
    return Array.from(favoriteToolIds);
  },

  isToolFavorite(toolId: string): boolean {
    return favoriteToolIds.has(toolId);
  },

  toggleFavoriteTool(toolId: string): boolean {
    if (favoriteToolIds.has(toolId)) {
      favoriteToolIds.delete(toolId);
      persistFavoriteToolIds();
      return false;
    }

    favoriteToolIds.add(toolId);
    persistFavoriteToolIds();
    return true;
  },

  getRecentToolIds(): string[] {
    return [...recentToolIds];
  },

  markToolOpened(toolId: string): string[] {
    const filtered = recentToolIds.filter((id) => id !== toolId);
    recentToolIds = [toolId, ...filtered].slice(0, MAX_RECENT_TOOL_COUNT);
    persistRecentToolIds();
    return [...recentToolIds];
  },

  resetWorkspaceState(): void {
    enabledTools = new Map<string, UserTool>();
    favoriteToolIds = new Set<string>();
    recentToolIds = [];

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(MY_TOOLS_STORAGE_KEY);
      localStorage.removeItem(FAVORITE_TOOLS_STORAGE_KEY);
      localStorage.removeItem(RECENT_TOOLS_STORAGE_KEY);
    }
  },

  async getCategories(): Promise<ToolCategoryInfo[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${TOOL_ENDPOINT}/categories`);
        const data = unwrapData<unknown>(response);
        const list = Array.isArray(data) ? data : [];
        return list.map((item) => {
          const category = item as Partial<ToolCategoryInfo>;
          return {
            id: category.id || "all",
            name: category.name || "Unknown",
            icon: category.icon || "TAG",
          };
        });
      },
      () => fallbackCategories.map((item) => ({ ...item })),
    );
  },

  async getTools(
    category?: string,
    keyword?: string,
    sortBy: "popular" | "successRate" | "newest" = "popular",
  ): Promise<ToolMarketItem[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${TOOL_ENDPOINT}/market`, {
          params: { category, keyword, sortBy },
        });
        const data = unwrapData<unknown>(response);
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? ((data as { items: unknown[] }).items ?? [])
            : [];

        const normalized = list.map((item) => normalizeTool(item));
        return normalized.map((tool) => ({
          ...tool,
          isEnabled: enabledTools.has(tool.id) || tool.isEnabled,
        }));
      },
      () => {
        const kw = keyword?.trim().toLowerCase();
        const filtered = fallbackTools.filter((tool) => {
          if (category && category !== "all" && tool.category !== category) {
            return false;
          }
          if (kw) {
            const target = `${tool.name} ${tool.description}`.toLowerCase();
            return target.includes(kw);
          }
          return true;
        });
        return sortTools(filtered, sortBy).map((tool) => ({
          ...cloneTool(tool),
          isEnabled: enabledTools.has(tool.id),
        }));
      },
    );
  },

  async getToolById(toolId: string): Promise<ToolMarketItem | null> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${TOOL_ENDPOINT}/market/${toolId}`);
        const data = unwrapData<unknown>(response);
        if (!data) {
          return null;
        }
        const tool = normalizeTool(data);
        return {
          ...tool,
          isEnabled: enabledTools.has(tool.id) || tool.isEnabled,
        };
      },
      () => {
        const target = fallbackTools.find((tool) => tool.id === toolId);
        return target ? { ...cloneTool(target), isEnabled: enabledTools.has(toolId) } : null;
      },
    );
  },

  async getMyTools(): Promise<UserTool[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${TOOL_ENDPOINT}/my`);
        const data = unwrapData<unknown>(response);
        const list = Array.isArray(data) ? data : [];
        return list.map((item) => normalizeUserTool(item));
      },
      () => Array.from(enabledTools.values()).map((item) => ({ ...item })),
    );
  },

  async addTool(toolId: string, credentials?: AuthConfig): Promise<UserTool> {
    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${TOOL_ENDPOINT}/my`, {
          toolId,
          credentials,
        });
        return normalizeUserTool(unwrapData<unknown>(response));
      },
      () => {
        const existing = enabledTools.get(toolId);
        if (existing) {
          const updated: UserTool = {
            ...existing,
            credentials: credentials || existing.credentials,
            enabled: true,
            updatedAt: new Date().toISOString(),
          };
          enabledTools.set(toolId, updated);
          persistEnabledTools();
          return { ...updated };
        }

        const created: UserTool = {
          id: `user-tool-${Date.now()}`,
          toolId,
          userId: "current-user",
          credentials,
          config: {},
          enabled: true,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        enabledTools.set(toolId, created);
        persistEnabledTools();
        return { ...created };
      },
    );
  },

  async removeTool(toolId: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.delete(`${TOOL_ENDPOINT}/my/${toolId}`);
        enabledTools.delete(toolId);
        favoriteToolIds.delete(toolId);
        recentToolIds = recentToolIds.filter((id) => id !== toolId);
        persistEnabledTools();
        persistFavoriteToolIds();
        persistRecentToolIds();
      },
      () => {
        enabledTools.delete(toolId);
        favoriteToolIds.delete(toolId);
        recentToolIds = recentToolIds.filter((id) => id !== toolId);
        persistEnabledTools();
        persistFavoriteToolIds();
        persistRecentToolIds();
      },
    );
  },

  async updateToolCredentials(toolId: string, credentials: AuthConfig): Promise<UserTool> {
    return withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${TOOL_ENDPOINT}/my/${toolId}/credentials`, {
          credentials,
        });
        return normalizeUserTool(unwrapData<unknown>(response));
      },
      () => {
        const existing = enabledTools.get(toolId);
        if (!existing) {
          throw new Error("Tool not found");
        }
        const updated: UserTool = {
          ...existing,
          credentials,
          updatedAt: new Date().toISOString(),
        };
        enabledTools.set(toolId, updated);
        persistEnabledTools();
        return { ...updated };
      },
    );
  },

  async testTool(toolId: string): Promise<ToolTestResult> {
    return withFallback<ToolTestResult>(
      async () => {
        const response = await apiClient.post<unknown>(`${TOOL_ENDPOINT}/market/${toolId}/test`);
        const data = unwrapData<unknown>(response);
        if (data && typeof data === "object") {
          const result = data as Partial<ToolTestResult>;
          return {
            success: Boolean(result.success),
            responseTime: Number(result.responseTime ?? 0),
            response: result.response,
            error: result.error,
          };
        }
        return { success: true, responseTime: 0, response: data };
      },
      () => {
        const target = fallbackTools.find((tool) => tool.id === toolId);
        if (!target) {
          return {
            success: false,
            responseTime: 0,
            response: undefined,
            error: "Tool not found",
          };
        }

        const stableOffset = toolId
          .split("")
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);

        return {
          success: true,
          responseTime: 120 + (stableOffset % 420),
          response: {
            status: "ok",
            message: `Tool ${target.name} is reachable.`,
          },
        };
      },
    );
  },
};

export default ToolService;
