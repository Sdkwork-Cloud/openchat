import { apiClient, IS_DEV } from "@sdkwork/openchat-pc-kernel";
import type { App, AppCategory, SearchResult } from "../entities/app.entity";

const APPSTORE_ENDPOINT = "/appstore";
const APP_INSTALL_STORAGE_KEY = "openchat.appstore.install-state";

const FALLBACK_CATEGORIES: AppCategory[] = [
  { id: "all", name: "All", nameEn: "All", icon: "ALL", color: "#2563eb", appCount: 6 },
  { id: "tool", name: "Tool", nameEn: "Tool", icon: "TL", color: "#0ea5e9", appCount: 2 },
  { id: "plugin", name: "Plugin", nameEn: "Plugin", icon: "PL", color: "#f97316", appCount: 2 },
  { id: "theme", name: "Theme", nameEn: "Theme", icon: "TH", color: "#14b8a6", appCount: 2 },
];

const FALLBACK_APPS: App[] = [
  {
    id: "tool-clip",
    name: "Clip Toolkit",
    nameEn: "Clip Toolkit",
    shortDescription: "Extract and archive high-value chat snippets.",
    description:
      "Save messages to structured knowledge cards with tags and retrieval friendly metadata.",
    icon: "CT",
    screenshots: [],
    developer: { id: "sdkwork", name: "SDKWork", verified: true, appCount: 8, rating: 4.8 },
    category: FALLBACK_CATEGORIES[1],
    tags: ["Tooling", "Productivity"],
    features: [{ title: "Archive", description: "Tag based retrieval for quick recall." }],
    version: "1.2.0",
    size: "8MB",
    downloads: 4123,
    rating: { average: 4.5, count: 210, distribution: [2, 8, 26, 80, 94] },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN"],
    released: "2025-05-10",
    updated: "2026-02-01",
    type: "tool",
    status: "active",
    featured: false,
    editorChoice: false,
    trending: true,
  },
  {
    id: "tool-inspector",
    name: "Tool Inspector",
    nameEn: "Tool Inspector",
    shortDescription: "Validate tool schema and runtime health.",
    description:
      "Check tool contracts, run smoke tests, and produce actionable diagnostics for failures.",
    icon: "TI",
    screenshots: [],
    developer: { id: "sdkwork", name: "SDKWork", verified: true, appCount: 8, rating: 4.8 },
    category: FALLBACK_CATEGORIES[1],
    tags: ["Tooling", "Debugging"],
    features: [{ title: "Diagnostics", description: "Actionable checks for each tool endpoint." }],
    version: "0.8.4",
    size: "7MB",
    downloads: 2534,
    rating: { average: 4.3, count: 167, distribution: [4, 8, 29, 64, 62] },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN", "en-US"],
    released: "2025-11-03",
    updated: "2026-02-08",
    type: "tool",
    status: "active",
    featured: false,
    editorChoice: false,
    trending: false,
  },
  {
    id: "plugin-theme-kit",
    name: "Theme Starter Kit",
    nameEn: "Theme Starter Kit",
    shortDescription: "Starter package for branded OpenChat themes.",
    description:
      "Build and publish workspace themes with variable tokens, previews, and compatibility checks.",
    icon: "TS",
    screenshots: [],
    developer: { id: "sdkwork", name: "SDKWork", verified: true, appCount: 8, rating: 4.8 },
    category: FALLBACK_CATEGORIES[3],
    tags: ["Theme", "Brand"],
    features: [{ title: "Theme Pack", description: "Token-based brand style customization." }],
    version: "1.0.2",
    size: "10MB",
    downloads: 1972,
    rating: { average: 4.2, count: 104, distribution: [5, 9, 22, 35, 33] },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN", "en-US"],
    released: "2025-10-01",
    updated: "2026-02-04",
    type: "plugin",
    status: "active",
    featured: false,
    editorChoice: false,
    trending: true,
  },
  {
    id: "plugin-flow-runtime",
    name: "Flow Runtime Plugin",
    nameEn: "Flow Runtime Plugin",
    shortDescription: "Add event-driven runtime orchestration for tools.",
    description:
      "Connect tool actions with workflow triggers, guardrails, and reusable execution templates.",
    icon: "FR",
    screenshots: [],
    developer: { id: "sdkwork", name: "SDKWork", verified: true, appCount: 8, rating: 4.8 },
    category: FALLBACK_CATEGORIES[2],
    tags: ["Workflow", "Automation"],
    features: [{ title: "Flow Graph", description: "Visualize and validate plugin action chains." }],
    version: "1.3.1",
    size: "11MB",
    downloads: 2742,
    rating: { average: 4.4, count: 146, distribution: [3, 7, 24, 52, 60] },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN", "en-US"],
    released: "2025-12-01",
    updated: "2026-02-18",
    type: "plugin",
    status: "active",
    featured: true,
    editorChoice: false,
    trending: true,
  },
  {
    id: "theme-midnight-pro",
    name: "Midnight Pro Theme",
    nameEn: "Midnight Pro Theme",
    shortDescription: "Professional high-contrast desktop theme pack.",
    description:
      "Provide tuned color tokens, typography scales, and component-level appearance presets.",
    icon: "MP",
    screenshots: [],
    developer: { id: "sdkwork", name: "SDKWork", verified: true, appCount: 8, rating: 4.8 },
    category: FALLBACK_CATEGORIES[3],
    tags: ["Theme", "Desktop"],
    features: [{ title: "Token Set", description: "Ready-to-use semantic token palette." }],
    version: "2.0.0",
    size: "9MB",
    downloads: 3180,
    rating: { average: 4.7, count: 268, distribution: [1, 4, 16, 66, 181] },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN", "en-US"],
    released: "2025-10-20",
    updated: "2026-02-22",
    type: "theme",
    status: "active",
    featured: true,
    editorChoice: true,
    trending: true,
  },
  {
    id: "theme-paper-light",
    name: "Paper Light Theme",
    nameEn: "Paper Light Theme",
    shortDescription: "A light workspace theme with strong reading contrast.",
    description:
      "Optimized for all-day document review and long-form writing with balanced color contrast.",
    icon: "PL",
    screenshots: [],
    developer: { id: "sdkwork", name: "SDKWork", verified: true, appCount: 8, rating: 4.8 },
    category: FALLBACK_CATEGORIES[3],
    tags: ["Theme", "Light"],
    features: [{ title: "Readability", description: "Improved visual hierarchy for long content." }],
    version: "1.4.0",
    size: "8MB",
    downloads: 2058,
    rating: { average: 4.5, count: 154, distribution: [2, 8, 20, 56, 68] },
    price: 0,
    currency: "CNY",
    inAppPurchases: false,
    ageRating: "12+",
    languages: ["zh-CN", "en-US"],
    released: "2025-11-11",
    updated: "2026-02-16",
    type: "theme",
    status: "active",
    featured: false,
    editorChoice: false,
    trending: false,
  },
];

type SearchAppParams = {
  keyword?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

interface PersistedInstallState {
  installedAt: string;
  lastOpenedAt?: string;
  openCount: number;
}

type PersistedInstallStateRecord = Record<string, PersistedInstallState>;

export interface AppInstallState {
  appId: string;
  installed: boolean;
  installedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
}

let memoryInstallStateRecord: PersistedInstallStateRecord = {};

type PartialAppCategory = Partial<AppCategory>;
type PartialApp = Partial<App> & {
  category?: PartialAppCategory | string;
};

function readInstallStateRecord(): PersistedInstallStateRecord {
  if (typeof localStorage === "undefined") {
    return { ...memoryInstallStateRecord };
  }

  try {
    const raw = localStorage.getItem(APP_INSTALL_STORAGE_KEY);
    if (!raw) {
      return { ...memoryInstallStateRecord };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const record: PersistedInstallStateRecord = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([appId, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      const payload = value as {
        installedAt?: unknown;
        lastOpenedAt?: unknown;
        openCount?: unknown;
      };

      if (typeof payload.installedAt !== "string" || payload.installedAt.length === 0) {
        return;
      }

      record[appId] = {
        installedAt: payload.installedAt,
        lastOpenedAt: typeof payload.lastOpenedAt === "string" ? payload.lastOpenedAt : undefined,
        openCount: Number(payload.openCount ?? 0) || 0,
      };
    });

    memoryInstallStateRecord = { ...record };
    return record;
  } catch {
    return { ...memoryInstallStateRecord };
  }
}

function writeInstallStateRecord(record: PersistedInstallStateRecord): void {
  memoryInstallStateRecord = { ...record };
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(APP_INSTALL_STORAGE_KEY, JSON.stringify(record));
}

function toAppInstallState(appId: string, payload?: PersistedInstallState): AppInstallState {
  if (!payload) {
    return {
      appId,
      installed: false,
      installedAt: null,
      lastOpenedAt: null,
      openCount: 0,
    };
  }

  return {
    appId,
    installed: true,
    installedAt: payload.installedAt,
    lastOpenedAt: payload.lastOpenedAt || null,
    openCount: payload.openCount,
  };
}

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function withFallback<T>(apiTask: () => Promise<T>, fallbackTask: () => T): Promise<T> {
  return apiTask().catch((error) => {
    if (IS_DEV) {
      return fallbackTask();
    }
    throw error;
  });
}

function normalizeCategory(category: PartialAppCategory, defaultCount = 0): AppCategory {
  return {
    id: category.id || "all",
    name: category.name || "All",
    nameEn: category.nameEn || category.name || "All",
    icon: category.icon || "✨",
    color: category.color || "#2563eb",
    appCount: Number(category.appCount ?? defaultCount),
  };
}

function resolveCategory(value: PartialAppCategory | string | undefined): AppCategory {
  if (typeof value === "string") {
    return FALLBACK_CATEGORIES.find((item) => item.id === value) || FALLBACK_CATEGORIES[0];
  }
  if (value && typeof value === "object") {
    const byId = value.id ? FALLBACK_CATEGORIES.find((item) => item.id === value.id) : null;
    return normalizeCategory({ ...byId, ...value }, byId?.appCount || 0);
  }
  return FALLBACK_CATEGORIES[0];
}

function normalizeApp(payload: PartialApp): App {
  const category = resolveCategory(payload.category);
  return {
    id: payload.id || "",
    name: payload.name || "Unnamed App",
    nameEn: payload.nameEn || payload.name || "Unnamed App",
    shortDescription: payload.shortDescription || "",
    description: payload.description || "",
    icon: payload.icon || "🧩",
    coverImage: payload.coverImage,
    screenshots: Array.isArray(payload.screenshots) ? payload.screenshots : [],
    developer: {
      id: payload.developer?.id || "unknown",
      name: payload.developer?.name || "Unknown",
      avatar: payload.developer?.avatar,
      verified: Boolean(payload.developer?.verified),
      appCount: Number(payload.developer?.appCount ?? 0),
      rating: Number(payload.developer?.rating ?? 0),
    },
    category,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    features: Array.isArray(payload.features) ? payload.features : [],
    version: payload.version || "0.0.1",
    size: payload.size || "-",
    downloads: Number(payload.downloads ?? 0),
    rating: {
      average: Number(payload.rating?.average ?? 0),
      count: Number(payload.rating?.count ?? 0),
      distribution: Array.isArray(payload.rating?.distribution)
        ? payload.rating.distribution
        : [0, 0, 0, 0, 0],
    },
    price: Number(payload.price ?? 0),
    currency: payload.currency || "CNY",
    inAppPurchases: Boolean(payload.inAppPurchases),
    ageRating: payload.ageRating || "12+",
    languages: Array.isArray(payload.languages) ? payload.languages : [],
    released: payload.released || "",
    updated: payload.updated || "",
    website: payload.website,
    privacyPolicy: payload.privacyPolicy,
    supportEmail: payload.supportEmail,
    type: payload.type || "plugin",
    status: payload.status || "active",
    featured: Boolean(payload.featured),
    editorChoice: Boolean(payload.editorChoice),
    trending: Boolean(payload.trending),
  };
}

function filterFallbackApps(params: SearchAppParams): SearchResult {
  const keyword = params.keyword?.trim().toLowerCase();
  const categoryId = params.categoryId && params.categoryId !== "all" ? params.categoryId : undefined;
  const page = params.page || 1;
  const pageSize = params.pageSize || 24;

  let filtered = [...FALLBACK_APPS];
  if (categoryId) {
    filtered = filtered.filter((app) => app.category.id === categoryId);
  }
  if (keyword) {
    filtered = filtered.filter((app) => {
      const indexText = `${app.name} ${app.nameEn} ${app.shortDescription} ${app.tags.join(" ")}`.toLowerCase();
      return indexText.includes(keyword);
    });
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const apps = filtered.slice(start, start + pageSize);
  return { apps, total, page, pageSize };
}

export async function getCategories(): Promise<AppCategory[]> {
  return withFallback(
    async () => {
      const response = await apiClient.get<unknown>(`${APPSTORE_ENDPOINT}/categories`);
      const data = unwrapData<unknown>(response);
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => normalizeCategory(item as PartialAppCategory));
    },
    () => {
      return FALLBACK_CATEGORIES.map((category) => {
        const appCount =
          category.id === "all"
            ? FALLBACK_APPS.length
            : FALLBACK_APPS.filter((app) => app.category.id === category.id).length;
        return { ...category, appCount };
      });
    },
  );
}

export async function searchApps(params: SearchAppParams = {}): Promise<SearchResult> {
  return withFallback(
    async () => {
      const response = await apiClient.get<unknown>(`${APPSTORE_ENDPOINT}/apps`, {
        params: {
          keyword: params.keyword,
          categoryId: params.categoryId,
          page: params.page,
          pageSize: params.pageSize,
        },
      });

      const data = unwrapData<unknown>(response);
      if (data && typeof data === "object" && "apps" in data) {
        const result = data as { apps: unknown[]; total?: number; page?: number; pageSize?: number };
        return {
          apps: Array.isArray(result.apps) ? result.apps.map((item) => normalizeApp(item as PartialApp)) : [],
          total: Number(result.total ?? 0),
          page: Number(result.page ?? params.page ?? 1),
          pageSize: Number(result.pageSize ?? params.pageSize ?? 24),
        };
      }

      const list = Array.isArray(data) ? data.map((item) => normalizeApp(item as PartialApp)) : [];
      return {
        apps: list,
        total: list.length,
        page: params.page || 1,
        pageSize: params.pageSize || list.length || 24,
      };
    },
    () => filterFallbackApps(params),
  );
}

export async function getAppById(appId: string): Promise<App | null> {
  return withFallback(
    async () => {
      const response = await apiClient.get<unknown>(`${APPSTORE_ENDPOINT}/apps/${appId}`);
      const data = unwrapData<unknown>(response);
      if (!data) {
        return null;
      }
      return normalizeApp(data as PartialApp);
    },
    () => FALLBACK_APPS.find((app) => app.id === appId) ?? null,
  );
}

export function getInstalledAppIds(): string[] {
  const record = readInstallStateRecord();
  return Object.keys(record);
}

export function getAppInstallState(appId: string): AppInstallState {
  const record = readInstallStateRecord();
  return toAppInstallState(appId, record[appId]);
}

export function getAppInstallStateMap(appIds: string[]): Record<string, AppInstallState> {
  const record = readInstallStateRecord();
  return appIds.reduce<Record<string, AppInstallState>>((acc, appId) => {
    acc[appId] = toAppInstallState(appId, record[appId]);
    return acc;
  }, {});
}

export function getInstalledAppStates(appIds?: string[]): AppInstallState[] {
  const record = readInstallStateRecord();
  const appIdSet = appIds ? new Set(appIds) : null;

  const states = Object.entries(record)
    .filter(([appId]) => (appIdSet ? appIdSet.has(appId) : true))
    .map(([appId, payload]) => toAppInstallState(appId, payload));

  states.sort((left, right) => {
    const leftOpenedAt = left.lastOpenedAt ? new Date(left.lastOpenedAt).getTime() : 0;
    const rightOpenedAt = right.lastOpenedAt ? new Date(right.lastOpenedAt).getTime() : 0;
    const openedDiff = rightOpenedAt - leftOpenedAt;
    if (openedDiff !== 0) {
      return openedDiff;
    }

    const leftInstalledAt = left.installedAt ? new Date(left.installedAt).getTime() : 0;
    const rightInstalledAt = right.installedAt ? new Date(right.installedAt).getTime() : 0;
    const installDiff = rightInstalledAt - leftInstalledAt;
    if (installDiff !== 0) {
      return installDiff;
    }

    return right.openCount - left.openCount;
  });

  return states;
}

export function resetAppInstallState(): void {
  memoryInstallStateRecord = {};
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(APP_INSTALL_STORAGE_KEY);
  }
}

export async function installApp(appId: string): Promise<AppInstallState> {
  const record = readInstallStateRecord();
  const current = record[appId];

  if (!current) {
    record[appId] = {
      installedAt: new Date().toISOString(),
      openCount: 0,
    };
    writeInstallStateRecord(record);
  }

  return toAppInstallState(appId, record[appId]);
}

export async function uninstallApp(appId: string): Promise<void> {
  const record = readInstallStateRecord();
  if (!record[appId]) {
    return;
  }

  delete record[appId];
  writeInstallStateRecord(record);
}

export function markAppOpened(appId: string): AppInstallState {
  const record = readInstallStateRecord();
  const current = record[appId];
  if (!current) {
    return toAppInstallState(appId, undefined);
  }

  const next: PersistedInstallState = {
    installedAt: current.installedAt,
    openCount: current.openCount + 1,
    lastOpenedAt: new Date().toISOString(),
  };
  record[appId] = next;
  writeInstallStateRecord(record);
  return toAppInstallState(appId, next);
}

export type { SearchAppParams };
