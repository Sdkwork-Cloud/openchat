import { AppEvents, IS_DEV, apiClient, eventEmitter, type Result } from "@sdkwork/openchat-pc-kernel";
import type { SearchFilters, SearchHistoryItem, SearchResultItem, SearchResultType, SearchSuggestion } from "../types";

const SEARCH_ENDPOINT = "/search";
const HISTORY_STORAGE_KEY = "openchat.search.history";
const MAX_HISTORY = 20;
const MAX_RESULTS = 30;

const seedAgents: SearchResultItem[] = [
  {
    id: "agent-openchat-assistant",
    title: "OpenChat Assistant",
    subtitle: "AI Agent",
    description: "General product and engineering assistant.",
    type: "agent",
    score: 100,
    icon: "AI",
  },
  {
    id: "agent-research",
    title: "Research Copilot",
    subtitle: "Knowledge Agent",
    description: "Finds references and produces concise summaries.",
    type: "agent",
    score: 96,
    icon: "RS",
  },
];

const seedContacts: SearchResultItem[] = [
  {
    id: "contact-alex",
    title: "Alex",
    subtitle: "Product Manager",
    description: "alex@openchat.dev",
    type: "contact",
    score: 98,
    icon: "A",
  },
  {
    id: "contact-mia",
    title: "Mia",
    subtitle: "Designer",
    description: "mia@openchat.dev",
    type: "contact",
    score: 94,
    icon: "M",
  },
];

const seedFiles: SearchResultItem[] = [
  {
    id: "file-architecture",
    title: "Architecture-Overview.md",
    subtitle: "Document",
    description: "Updated 2 days ago",
    type: "file",
    score: 92,
    icon: "DOC",
  },
  {
    id: "file-release-plan",
    title: "Release-Plan-Q2.xlsx",
    subtitle: "Spreadsheet",
    description: "Updated yesterday",
    type: "file",
    score: 90,
    icon: "XLS",
  },
];

const seedCommands: SearchResultItem[] = [
  {
    id: "command-new-chat",
    title: "Create new chat",
    subtitle: "Command",
    description: "Open a new conversation window",
    type: "command",
    score: 100,
    icon: "CMD",
    meta: {
      command: "chat:new",
      shortcut: "Ctrl+N",
    },
  },
  {
    id: "command-open-settings",
    title: "Open settings",
    subtitle: "Command",
    description: "Open global application settings",
    type: "command",
    score: 95,
    icon: "CMD",
    meta: {
      command: "settings:open",
      shortcut: "Ctrl+,",
    },
  },
];

const seedSettings: SearchResultItem[] = [
  {
    id: "setting-theme",
    title: "Theme settings",
    subtitle: "Settings",
    description: "Customize colors and typography",
    type: "setting",
    score: 88,
    icon: "SET",
  },
  {
    id: "setting-notifications",
    title: "Notification settings",
    subtitle: "Settings",
    description: "Configure push and desktop notifications",
    type: "setting",
    score: 87,
    icon: "SET",
  },
];

const seedTrending: SearchSuggestion[] = [
  { id: "trending-agent", text: "agent", type: "trending" },
  { id: "trending-architecture", text: "architecture", type: "trending" },
  { id: "trending-release", text: "release", type: "trending" },
  { id: "trending-contacts", text: "contacts", type: "trending" },
];

const seedDataset: SearchResultItem[] = [
  ...seedAgents,
  ...seedContacts,
  ...seedFiles,
  ...seedCommands,
  ...seedSettings,
];

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    const payload = response as Partial<Result<T>>;
    return {
      success: Boolean(payload.success),
      data: (payload.data as T | undefined) ?? defaultData,
      message: typeof payload.message === "string" ? payload.message : undefined,
      error: typeof payload.error === "string" ? payload.error : undefined,
      code: typeof payload.code === "number" ? payload.code : undefined,
    };
  }

  if (response && typeof response === "object" && "data" in response) {
    return { success: true, data: ((response as { data: T }).data ?? defaultData) as T };
  }

  if (response === undefined || response === null) {
    return { success: true, data: defaultData };
  }

  return { success: true, data: response as T };
}

function normalizeType(value: unknown): SearchResultType {
  const supported: SearchResultType[] = [
    "agent",
    "chat",
    "contact",
    "file",
    "article",
    "creation",
    "command",
    "setting",
  ];
  return typeof value === "string" && supported.includes(value as SearchResultType)
    ? (value as SearchResultType)
    : "file";
}

function normalizeResult(input: Partial<SearchResultItem>): SearchResultItem {
  return {
    id: input.id || `result-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: input.title || "Untitled result",
    subtitle: input.subtitle,
    description: input.description,
    icon: input.icon,
    type: normalizeType(input.type),
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : 0,
    timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : undefined,
    meta: input.meta,
  };
}

function normalizeHistory(input: Partial<SearchHistoryItem>): SearchHistoryItem {
  return {
    id: input.id || `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    query: String(input.query || "").trim(),
    timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : Date.now(),
    resultCount: Number.isFinite(Number(input.resultCount)) ? Number(input.resultCount) : 0,
  };
}

function normalizeSuggestion(input: Partial<SearchSuggestion>): SearchSuggestion {
  const type = input.type === "history" || input.type === "related" || input.type === "trending"
    ? input.type
    : "related";
  return {
    id: input.id || `suggestion-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    text: String(input.text || "").trim(),
    type,
  };
}

function isSearchTypeCandidate(
  target: SearchResultType,
  filterType?: SearchFilters["type"],
): boolean {
  if (!filterType || filterType === "all") {
    return true;
  }
  return target === filterType;
}

function matchesKeyword(item: SearchResultItem, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const source = `${item.title} ${item.subtitle || ""} ${item.description || ""}`.toLowerCase();
  return source.includes(normalized);
}

function applyDateRange(items: SearchResultItem[], range?: SearchFilters["dateRange"]): SearchResultItem[] {
  if (!range || range === "all") {
    return items;
  }

  const now = Date.now();
  const lookBackMap: Record<Exclude<NonNullable<SearchFilters["dateRange"]>, "all">, number> = {
    today: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };
  const lookBack = lookBackMap[range];
  const minTimestamp = now - lookBack;

  return items.filter((item) => item.timestamp === undefined || item.timestamp >= minTimestamp);
}

function sortResults(items: SearchResultItem[], sortBy?: SearchFilters["sortBy"]): SearchResultItem[] {
  const sorted = [...items];
  if (sortBy === "date") {
    sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted;
  }
  sorted.sort((a, b) => b.score - a.score);
  return sorted;
}

class SearchServiceImpl {
  private historyCache: SearchHistoryItem[] = [];

  constructor() {
    this.historyCache = this.readHistoryFromStorage();
    eventEmitter.on(AppEvents.DATA_UPDATED, () => {
      this.historyCache = this.readHistoryFromStorage();
    });
  }

  private readHistoryFromStorage(): SearchHistoryItem[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => normalizeHistory(item as Partial<SearchHistoryItem>))
        .filter((item) => item.query.length > 0)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_HISTORY);
    } catch {
      return [];
    }
  }

  private persistHistory(history: SearchHistoryItem[]): void {
    const normalized = history
      .map((item) => normalizeHistory(item))
      .filter((item) => item.query.length > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY);
    this.historyCache = normalized;

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
    }
  }

  private async withFallback<T>(
    apiTask: () => Promise<Result<T>>,
    fallbackTask: () => Result<T> | Promise<Result<T>>,
  ): Promise<Result<T>> {
    try {
      return await apiTask();
    } catch (error) {
      if (IS_DEV) {
        return fallbackTask();
      }
      throw error;
    }
  }

  private runFallbackSearch(query: string, filters: SearchFilters): SearchResultItem[] {
    const scoped = seedDataset
      .filter((item) => isSearchTypeCandidate(item.type, filters.type))
      .filter((item) => matchesKeyword(item, query));
    const ranged = applyDateRange(scoped, filters.dateRange);
    return sortResults(ranged, filters.sortBy).slice(0, MAX_RESULTS);
  }

  async search(query: string, filters: SearchFilters = {}): Promise<Result<SearchResultItem[]>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { success: true, data: [] };
    }

    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(SEARCH_ENDPOINT, {
          params: {
            q: normalizedQuery,
            type: filters.type,
            dateRange: filters.dateRange,
            sortBy: filters.sortBy,
          },
        });
        const result = toResult<unknown>(response, []);
        if (!result.success) {
          return { ...result, data: [] };
        }
        const list = Array.isArray(result.data)
          ? result.data.map((item) => normalizeResult(item as Partial<SearchResultItem>))
          : [];
        return { ...result, data: list.slice(0, MAX_RESULTS) };
      },
      () => ({
        success: true,
        data: this.runFallbackSearch(normalizedQuery, filters),
      }),
    );
  }

  async getHistory(): Promise<Result<SearchHistoryItem[]>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${SEARCH_ENDPOINT}/history`);
        const result = toResult<unknown>(response, []);
        if (!result.success) {
          return { ...result, data: this.historyCache };
        }
        const list = Array.isArray(result.data)
          ? result.data.map((item) => normalizeHistory(item as Partial<SearchHistoryItem>))
          : [];
        return { ...result, data: list };
      },
      () => ({ success: true, data: this.historyCache }),
    );
  }

  async addHistory(query: string, resultCount: number): Promise<Result<void>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { success: true };
    }

    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${SEARCH_ENDPOINT}/history`, {
          query: normalizedQuery,
          resultCount,
        });
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        const next = this.historyCache.filter((item) => item.query !== normalizedQuery);
        next.unshift(
          normalizeHistory({
            id: `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            query: normalizedQuery,
            timestamp: Date.now(),
            resultCount,
          }),
        );
        this.persistHistory(next);
        return { success: true };
      },
    );
  }

  async clearHistory(): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(`${SEARCH_ENDPOINT}/history`);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.persistHistory([]);
        return { success: true };
      },
    );
  }

  async removeHistoryItem(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(`${SEARCH_ENDPOINT}/history/${id}`);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.persistHistory(this.historyCache.filter((item) => item.id !== id));
        return { success: true };
      },
    );
  }

  async getSuggestions(query: string): Promise<Result<SearchSuggestion[]>> {
    const normalizedQuery = query.trim();
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${SEARCH_ENDPOINT}/suggestions`, {
          params: { q: normalizedQuery || undefined },
        });
        const result = toResult<unknown>(response, []);
        if (!result.success) {
          return { ...result, data: [] };
        }
        const list = Array.isArray(result.data)
          ? result.data.map((item) => normalizeSuggestion(item as Partial<SearchSuggestion>))
          : [];
        return { ...result, data: list.filter((item) => item.text.length > 0).slice(0, 8) };
      },
      async () => {
        if (!normalizedQuery) {
          const history = this.historyCache.slice(0, 5).map((item) =>
            normalizeSuggestion({
              id: item.id,
              text: item.query,
              type: "history",
            }),
          );
          return { success: true, data: history };
        }

        const fallback = seedDataset
          .filter((item) => matchesKeyword(item, normalizedQuery))
          .slice(0, 5)
          .map((item) =>
            normalizeSuggestion({
              id: `related-${item.id}`,
              text: item.title,
              type: "related",
            }),
          );

        if (fallback.length > 0) {
          return { success: true, data: fallback };
        }

        return {
          success: true,
          data: [
            normalizeSuggestion({
              text: `${normalizedQuery} docs`,
              type: "related",
            }),
            normalizeSuggestion({
              text: `${normalizedQuery} settings`,
              type: "related",
            }),
            normalizeSuggestion({
              text: `${normalizedQuery} contacts`,
              type: "related",
            }),
          ],
        };
      },
    );
  }

  async getTrending(): Promise<Result<SearchSuggestion[]>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${SEARCH_ENDPOINT}/trending`);
        const result = toResult<unknown>(response, []);
        if (!result.success) {
          return { ...result, data: seedTrending };
        }
        const list = Array.isArray(result.data)
          ? result.data.map((item) => normalizeSuggestion(item as Partial<SearchSuggestion>))
          : [];
        return { ...result, data: list.slice(0, 8) };
      },
      () => ({ success: true, data: seedTrending }),
    );
  }

  executeCommand(item: SearchResultItem): void {
    switch (item.type) {
      case "command":
        eventEmitter.emit("command:execute", {
          id: item.id,
          command: item.meta?.command || item.id,
          title: item.title,
        });
        return;
      case "setting":
        eventEmitter.emit("navigate", { path: "/settings" });
        return;
      case "agent":
        eventEmitter.emit("navigate", {
          path: `/chat?agentId=${encodeURIComponent(item.id)}&agentName=${encodeURIComponent(item.title)}`,
        });
        return;
      case "contact":
        eventEmitter.emit("navigate", {
          path: `/chat?contactId=${encodeURIComponent(item.id)}&contactName=${encodeURIComponent(item.title)}`,
        });
        return;
      default:
        eventEmitter.emit("navigate", { path: `/${item.type}/${item.id}` });
    }
  }
}

export const SearchService = new SearchServiceImpl();
export default SearchService;
