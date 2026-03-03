import { apiClient, IS_DEV, type Page, type Result } from "@sdkwork/openchat-pc-kernel";
import type {
  DiscoverBanner,
  DiscoverCategory,
  DiscoverFilter,
  DiscoverItem,
} from "../types";

const DISCOVER_ENDPOINT = "/discover";
const FAVORITE_DISCOVER_STORAGE_KEY = "openchat.discover.favorite";
const RECENT_DISCOVER_STORAGE_KEY = "openchat.discover.recent";
const MAX_RECENT_DISCOVER_COUNT = 16;
const now = Date.now();

const fallbackBanners: DiscoverBanner[] = [
  {
    id: "banner-1",
    title: "AI Agent Collection",
    subtitle: "Discover production-ready agent patterns for workspace scenarios.",
    image: "https://picsum.photos/1200/420?random=201",
    link: "/agents",
    bgColor: "linear-gradient(135deg,#0f2027,#2c5364)",
  },
  {
    id: "banner-2",
    title: "Creation Upgrades",
    subtitle: "Image, video, and audio creation capabilities in one workflow.",
    image: "https://picsum.photos/1200/420?random=202",
    link: "/creation",
    bgColor: "linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)",
  },
];

const fallbackCategories: DiscoverCategory[] = [
  { id: "all", name: "All", icon: "ALL", color: "#3b82f6", count: 0 },
  { id: "ai", name: "AI", icon: "AI", color: "#8b5cf6", count: 0 },
  { id: "design", name: "Design", icon: "DSN", color: "#ec4899", count: 0 },
  { id: "dev", name: "Development", icon: "DEV", color: "#10b981", count: 0 },
  { id: "life", name: "Life", icon: "LIFE", color: "#f59e0b", count: 0 },
];

const fallbackItems: DiscoverItem[] = [
  {
    id: "discover-1",
    title: "OpenChat Agent Playbook",
    summary: "From zero to production: routing, model strategy, access policy, and monitoring.",
    cover: "https://picsum.photos/700/420?random=211",
    type: "article",
    source: "OpenChat Lab",
    reads: 12900,
    likes: 930,
    tags: ["ai", "agent", "dev"],
    createTime: now - 3 * 60 * 60 * 1000,
    updateTime: now - 3 * 60 * 60 * 1000,
  },
  {
    id: "discover-2",
    title: "Visual Prompt Style Guide",
    summary: "Eight reusable visual prompt patterns across realistic and stylized outputs.",
    cover: "https://picsum.photos/700/420?random=212",
    type: "video",
    source: "Creative Hub",
    reads: 8700,
    likes: 540,
    tags: ["design", "ai"],
    createTime: now - 8 * 60 * 60 * 1000,
    updateTime: now - 8 * 60 * 60 * 1000,
  },
  {
    id: "discover-3",
    title: "Monorepo Package Split Guide",
    summary: "A practical path from single app to standardized package architecture.",
    cover: "https://picsum.photos/700/420?random=213",
    type: "article",
    source: "Engineering Weekly",
    reads: 15600,
    likes: 1140,
    tags: ["dev", "architecture"],
    createTime: now - 24 * 60 * 60 * 1000,
    updateTime: now - 24 * 60 * 60 * 1000,
  },
  {
    id: "discover-4",
    title: "Low-Context Workflow Design",
    summary: "Reduce context switching overhead with repeatable automation templates.",
    cover: "https://picsum.photos/700/420?random=214",
    type: "audio",
    source: "Productive Life",
    reads: 4300,
    likes: 230,
    tags: ["life", "efficiency"],
    createTime: now - 48 * 60 * 60 * 1000,
    updateTime: now - 48 * 60 * 60 * 1000,
  },
];

type PartialPage<T> = Partial<Page<T>> & { list?: T[]; pageSize?: number };

let favoriteItemIds = new Set<string>();
let recentItemIds: string[] = [];

function readFavoriteItemIdsFromStorage(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = localStorage.getItem(FAVORITE_DISCOVER_STORAGE_KEY);
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

function persistFavoriteItemIds(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(FAVORITE_DISCOVER_STORAGE_KEY, JSON.stringify(Array.from(favoriteItemIds)));
}

function readRecentItemIdsFromStorage(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_DISCOVER_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, MAX_RECENT_DISCOVER_COUNT);
  } catch {
    return [];
  }
}

function persistRecentItemIds(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    RECENT_DISCOVER_STORAGE_KEY,
    JSON.stringify(recentItemIds.slice(0, MAX_RECENT_DISCOVER_COUNT)),
  );
}

favoriteItemIds = readFavoriteItemIdsFromStorage();
recentItemIds = readRecentItemIdsFromStorage();

function asResult<T>(response: unknown): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    return response as Result<T>;
  }
  if (response && typeof response === "object" && "data" in response) {
    return { success: true, data: (response as { data: T }).data };
  }
  return { success: true, data: response as T };
}

function normalizePage<T>(input: unknown, page: number, size: number): Page<T> {
  const data = input as PartialPage<T>;
  const content = Array.isArray(data.content)
    ? data.content
    : Array.isArray(data.list)
      ? data.list
      : [];
  const total = Number(data.total ?? content.length);
  const currentPage = Number(data.page ?? page);
  const currentSize = Number(data.size ?? data.pageSize ?? size);
  return {
    content,
    total,
    page: currentPage,
    size: currentSize,
    totalPages: Number(data.totalPages ?? Math.max(1, Math.ceil(total / currentSize))),
  };
}

function withFallback<T>(apiTask: () => Promise<Result<T>>, fallbackTask: () => Result<T>): Promise<Result<T>> {
  return apiTask().catch((error) => {
    if (IS_DEV) {
      return fallbackTask();
    }
    throw error;
  });
}

function filterFallbackItems(filter: DiscoverFilter): DiscoverItem[] {
  let list = [...fallbackItems];
  if (filter.type) {
    list = list.filter((item) => item.type === filter.type);
  }
  if (filter.category && filter.category !== "all") {
    const keyword = filter.category.toLowerCase();
    list = list.filter((item) => item.tags.some((tag) => tag.toLowerCase().includes(keyword)));
  }

  switch (filter.sortBy) {
    case "hot":
      list.sort((a, b) => b.reads + b.likes * 10 - (a.reads + a.likes * 10));
      break;
    case "new":
      list.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
      break;
    default:
      list.sort((a, b) => b.likes - a.likes);
  }
  return list;
}

class DiscoverServiceImpl {
  getFavoriteItemIds(): string[] {
    return Array.from(favoriteItemIds);
  }

  isItemFavorite(itemId: string): boolean {
    return favoriteItemIds.has(itemId);
  }

  toggleFavoriteItem(itemId: string): boolean {
    if (favoriteItemIds.has(itemId)) {
      favoriteItemIds.delete(itemId);
      persistFavoriteItemIds();
      return false;
    }

    favoriteItemIds.add(itemId);
    persistFavoriteItemIds();
    return true;
  }

  getRecentItemIds(): string[] {
    return [...recentItemIds];
  }

  markItemOpened(itemId: string): string[] {
    const filtered = recentItemIds.filter((id) => id !== itemId);
    recentItemIds = [itemId, ...filtered].slice(0, MAX_RECENT_DISCOVER_COUNT);
    persistRecentItemIds();
    return [...recentItemIds];
  }

  resetWorkspaceState(): void {
    favoriteItemIds = new Set<string>();
    recentItemIds = [];

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(FAVORITE_DISCOVER_STORAGE_KEY);
      localStorage.removeItem(RECENT_DISCOVER_STORAGE_KEY);
    }
  }

  async getBanners(): Promise<Result<DiscoverBanner[]>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DISCOVER_ENDPOINT}/banners`);
        return asResult<DiscoverBanner[]>(response);
      },
      () => ({ success: true, data: fallbackBanners }),
    );
  }

  async getCategories(): Promise<Result<DiscoverCategory[]>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DISCOVER_ENDPOINT}/categories`);
        return asResult<DiscoverCategory[]>(response);
      },
      () => {
        const data = fallbackCategories.map((category) => ({
          ...category,
          count:
            category.id === "all"
              ? fallbackItems.length
              : fallbackItems.filter((item) =>
                  item.tags.some((tag) => tag.toLowerCase().includes(category.id.toLowerCase())),
                ).length,
        }));
        return { success: true, data };
      },
    );
  }

  async getFeed(
    filter: DiscoverFilter = {},
    page: number = 1,
    size: number = 12,
  ): Promise<Result<Page<DiscoverItem>>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DISCOVER_ENDPOINT}/feed`, {
          params: { ...filter, page, size },
        });
        const payload =
          response && typeof response === "object" && "data" in response
            ? (response as { data: unknown }).data
            : response;
        if (payload && typeof payload === "object" && "success" in payload) {
          const result = payload as Result<unknown>;
          return {
            ...result,
            data: normalizePage<DiscoverItem>(result.data, page, size),
          };
        }
        return { success: true, data: normalizePage<DiscoverItem>(payload, page, size) };
      },
      () => {
        const filtered = filterFallbackItems(filter);
        const start = (page - 1) * size;
        const content = filtered.slice(start, start + size);
        return {
          success: true,
          data: {
            content,
            total: filtered.length,
            page,
            size,
            totalPages: Math.max(1, Math.ceil(filtered.length / size)),
          },
        };
      },
    );
  }

  async search(query: string): Promise<Result<DiscoverItem[]>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DISCOVER_ENDPOINT}/search`, {
          params: { keyword: query },
        });
        return asResult<DiscoverItem[]>(response);
      },
      () => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) {
          return { success: true, data: [] };
        }
        const data = fallbackItems.filter((item) => {
          const source = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
          return source.includes(keyword);
        });
        return { success: true, data };
      },
    );
  }

  async getTrending(): Promise<Result<DiscoverItem[]>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DISCOVER_ENDPOINT}/trending`, {
          params: { limit: 5 },
        });
        return asResult<DiscoverItem[]>(response);
      },
      () => {
        const data = [...fallbackItems]
          .sort((a, b) => b.reads + b.likes * 10 - (a.reads + a.likes * 10))
          .slice(0, 5);
        return { success: true, data };
      },
    );
  }
}

export const DiscoverService = new DiscoverServiceImpl();
export default DiscoverService;

