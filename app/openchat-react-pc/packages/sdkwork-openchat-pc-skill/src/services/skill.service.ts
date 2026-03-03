import { IS_DEV, apiClient } from "@sdkwork/openchat-pc-kernel";
import {
  SkillCategory,
  type SkillCategoryInfo,
  type SkillMarketItem,
  type UserSkill,
} from "../entities/skill.entity";

const SKILL_ENDPOINT = "/skills";
const ENABLED_STORAGE_KEY = "openchat.skill.enabled";
const CONFIG_STORAGE_KEY = "openchat.skill.config";
const CONFIGURED_AT_STORAGE_KEY = "openchat.skill.configured-at";
const FAVORITE_STORAGE_KEY = "openchat.skill.favorite";
const RECENT_STORAGE_KEY = "openchat.skill.recent";
const MAX_RECENT_SKILL_COUNT = 12;

const seedSkills: SkillMarketItem[] = [
  {
    id: "skill-image-generator",
    name: "Image Generator",
    description: "Generate high-quality images from prompts.",
    icon: "IMG",
    category: SkillCategory.CREATIVE,
    version: "1.2.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["text-to-image", "image-edit", "style-transfer"],
    tags: ["image", "creative", "design"],
    usageCount: 12500,
    rating: 4.8,
    createdAt: "2025-11-12T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "skill-code-runner",
    name: "Code Runner",
    description: "Run and validate code snippets in sandbox mode.",
    icon: "DEV",
    category: SkillCategory.DEVELOPER,
    version: "2.0.1",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["run-code", "debug", "lint"],
    tags: ["development", "code", "sandbox"],
    usageCount: 9800,
    rating: 4.7,
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "skill-web-search",
    name: "Web Search",
    description: "Search and aggregate real-time web information.",
    icon: "WEB",
    category: SkillCategory.UTILITY,
    version: "1.4.3",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["search", "crawl", "extract"],
    tags: ["search", "realtime", "knowledge"],
    usageCount: 15400,
    rating: 4.9,
    createdAt: "2025-12-10T00:00:00.000Z",
    updatedAt: "2026-01-14T00:00:00.000Z",
  },
  {
    id: "skill-charting",
    name: "Data Charting",
    description: "Generate charts and visual analytics quickly.",
    icon: "DAT",
    category: SkillCategory.DATA,
    version: "1.1.0",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["chart", "dashboard", "report"],
    tags: ["data", "chart", "analytics"],
    usageCount: 6400,
    rating: 4.6,
    createdAt: "2025-12-20T00:00:00.000Z",
    updatedAt: "2026-01-08T00:00:00.000Z",
  },
  {
    id: "skill-translation",
    name: "Translation",
    description: "Translate content across 100+ languages.",
    icon: "TRN",
    category: SkillCategory.UTILITY,
    version: "1.3.4",
    provider: "OpenChat",
    isPublic: true,
    isBuiltin: true,
    capabilities: ["translate", "language-detect", "rewrite"],
    tags: ["language", "translation", "productivity"],
    usageCount: 11200,
    rating: 4.8,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-20T00:00:00.000Z",
  },
];

const seedCategories: SkillCategoryInfo[] = [
  { id: "all", name: "All", icon: "ALL" },
  { id: SkillCategory.CREATIVE, name: "Creative", icon: "CR" },
  { id: SkillCategory.UTILITY, name: "Utility", icon: "UT" },
  { id: SkillCategory.DEVELOPER, name: "Developer", icon: "DV" },
  { id: SkillCategory.DATA, name: "Data", icon: "DT" },
  { id: SkillCategory.MEDIA, name: "Media", icon: "MD" },
];

type SkillSortType = "popular" | "rating" | "newest";
type SkillConfigMap = Record<string, Record<string, unknown>>;
type SkillConfiguredAtMap = Record<string, string>;

function extractData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as { data?: T };
    return wrapped.data ?? fallback;
  }
  if (payload === undefined || payload === null) {
    return fallback;
  }
  return payload as T;
}

function ensureArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? input : [];
}

function normalizeCategory(value: unknown): SkillCategory {
  const values = Object.values(SkillCategory);
  if (typeof value === "string" && values.includes(value as SkillCategory)) {
    return value as SkillCategory;
  }
  return SkillCategory.UTILITY;
}

function normalizeSkill(input: Partial<SkillMarketItem>): SkillMarketItem {
  const fallbackTimestamp = new Date().toISOString();
  return {
    id: input.id || `skill-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: input.name || "Unnamed skill",
    description: input.description || "No description available.",
    icon: input.icon || "SK",
    category: normalizeCategory(input.category),
    version: input.version || "1.0.0",
    provider: input.provider || "OpenChat",
    isPublic: input.isPublic === undefined ? true : Boolean(input.isPublic),
    isBuiltin: input.isBuiltin === undefined ? false : Boolean(input.isBuiltin),
    capabilities: Array.isArray(input.capabilities)
      ? input.capabilities.filter((item): item is string => typeof item === "string")
      : [],
    tags: Array.isArray(input.tags)
      ? input.tags.filter((item): item is string => typeof item === "string")
      : [],
    usageCount: Number.isFinite(Number(input.usageCount)) ? Number(input.usageCount) : 0,
    rating: Number.isFinite(Number(input.rating)) ? Number(input.rating) : 0,
    createdAt: input.createdAt || fallbackTimestamp,
    updatedAt: input.updatedAt || fallbackTimestamp,
    isEnabled: Boolean(input.isEnabled),
  };
}

function normalizeUserSkill(input: Partial<UserSkill>): UserSkill {
  const timestamp = new Date().toISOString();
  return {
    id: input.id || `user-skill-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    skillId: input.skillId || "",
    userId: input.userId || "current-user",
    config: input.config && typeof input.config === "object" ? input.config : {},
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    createdAt: input.createdAt || timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

function normalizeCategoryInfo(input: Partial<SkillCategoryInfo>): SkillCategoryInfo {
  return {
    id: input.id || "all",
    name: input.name || "Category",
    icon: input.icon || "CT",
  };
}

function sortSkills(items: SkillMarketItem[], sortBy: SkillSortType): SkillMarketItem[] {
  const list = [...items];
  if (sortBy === "rating") {
    list.sort((a, b) => b.rating - a.rating);
    return list;
  }
  if (sortBy === "newest") {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }
  list.sort((a, b) => b.usageCount - a.usageCount);
  return list;
}

class SkillServiceImpl {
  private enabledSkills = new Set<string>();
  private favoriteSkills = new Set<string>();
  private recentSkills: string[] = [];
  private skillConfigs: SkillConfigMap = {};
  private configuredAtMap: SkillConfiguredAtMap = {};

  constructor() {
    this.enabledSkills = this.readEnabledSkills();
    this.favoriteSkills = this.readFavoriteSkills();
    this.recentSkills = this.readRecentSkills();
    this.skillConfigs = this.readSkillConfigs();
    this.configuredAtMap = this.readConfiguredAtMap();
  }

  private async withFallback<T>(apiTask: () => Promise<T>, fallbackTask: () => T | Promise<T>): Promise<T> {
    try {
      return await apiTask();
    } catch (error) {
      if (IS_DEV) {
        return fallbackTask();
      }
      throw error;
    }
  }

  private readEnabledSkills(): Set<string> {
    if (typeof localStorage === "undefined") {
      return new Set<string>();
    }

    try {
      const raw = localStorage.getItem(ENABLED_STORAGE_KEY);
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

  private persistEnabledSkills(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ENABLED_STORAGE_KEY, JSON.stringify(Array.from(this.enabledSkills)));
    }
  }

  private readFavoriteSkills(): Set<string> {
    if (typeof localStorage === "undefined") {
      return new Set<string>();
    }

    try {
      const raw = localStorage.getItem(FAVORITE_STORAGE_KEY);
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

  private persistFavoriteSkills(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(Array.from(this.favoriteSkills)));
    }
  }

  private readRecentSkills(): string[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item): item is string => typeof item === "string")
        .slice(0, MAX_RECENT_SKILL_COUNT);
    } catch {
      return [];
    }
  }

  private persistRecentSkills(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        RECENT_STORAGE_KEY,
        JSON.stringify(this.recentSkills.slice(0, MAX_RECENT_SKILL_COUNT)),
      );
    }
  }

  private readSkillConfigs(): SkillConfigMap {
    if (typeof localStorage === "undefined") {
      return {};
    }

    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return {};
      }
      return parsed as SkillConfigMap;
    } catch {
      return {};
    }
  }

  private persistSkillConfigs(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.skillConfigs));
    }
  }

  private readConfiguredAtMap(): SkillConfiguredAtMap {
    if (typeof localStorage === "undefined") {
      return {};
    }

    try {
      const raw = localStorage.getItem(CONFIGURED_AT_STORAGE_KEY);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      return Object.entries(parsed as Record<string, unknown>).reduce<SkillConfiguredAtMap>(
        (acc, [skillId, value]) => {
          if (typeof value === "string" && value.length > 0) {
            acc[skillId] = value;
          }
          return acc;
        },
        {},
      );
    } catch {
      return {};
    }
  }

  private persistConfiguredAtMap(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CONFIGURED_AT_STORAGE_KEY, JSON.stringify(this.configuredAtMap));
    }
  }

  private isSkillConfigured(skillId: string): boolean {
    const config = this.skillConfigs[skillId];
    if (!config || typeof config !== "object") {
      return false;
    }

    const hasEnabled = typeof config.enabled === "boolean";
    const scope = config.scope;
    const hasScope = scope === "workspace" || scope === "team" || scope === "global";
    return hasEnabled && hasScope;
  }

  private applyWorkspaceState(skills: SkillMarketItem[]): SkillMarketItem[] {
    return skills.map((item) => ({
      ...item,
      isEnabled: this.enabledSkills.has(item.id),
      isConfigured: this.isSkillConfigured(item.id),
      configuredAt: this.configuredAtMap[item.id],
    }));
  }

  private queryFallbackSkills(
    category?: string,
    keyword?: string,
    sortBy: SkillSortType = "popular",
  ): SkillMarketItem[] {
    const normalizedKeyword = keyword?.trim().toLowerCase() || "";
    const filtered = seedSkills
      .filter((item) => (category && category !== "all" ? item.category === category : true))
      .filter((item) => {
        if (!normalizedKeyword) {
          return true;
        }
        const source = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        return source.includes(normalizedKeyword);
      })
      .map((item) => ({ ...item }));
    return sortSkills(this.applyWorkspaceState(filtered), sortBy);
  }

  private buildUserSkill(skillId: string): UserSkill {
    return normalizeUserSkill({
      id: `user-skill-${skillId}`,
      skillId,
      userId: "current-user",
      config: this.skillConfigs[skillId] || {},
      enabled: true,
    });
  }

  getFavoriteSkillIds(): string[] {
    return Array.from(this.favoriteSkills);
  }

  isSkillFavorite(skillId: string): boolean {
    return this.favoriteSkills.has(skillId);
  }

  toggleFavoriteSkill(skillId: string): boolean {
    if (this.favoriteSkills.has(skillId)) {
      this.favoriteSkills.delete(skillId);
      this.persistFavoriteSkills();
      return false;
    }

    this.favoriteSkills.add(skillId);
    this.persistFavoriteSkills();
    return true;
  }

  getRecentSkillIds(): string[] {
    return [...this.recentSkills];
  }

  markSkillOpened(skillId: string): string[] {
    const filtered = this.recentSkills.filter((id) => id !== skillId);
    this.recentSkills = [skillId, ...filtered].slice(0, MAX_RECENT_SKILL_COUNT);
    this.persistRecentSkills();
    return [...this.recentSkills];
  }

  resetWorkspaceState(): void {
    this.enabledSkills = new Set<string>();
    this.favoriteSkills = new Set<string>();
    this.recentSkills = [];
    this.skillConfigs = {};
    this.configuredAtMap = {};

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ENABLED_STORAGE_KEY);
      localStorage.removeItem(FAVORITE_STORAGE_KEY);
      localStorage.removeItem(RECENT_STORAGE_KEY);
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      localStorage.removeItem(CONFIGURED_AT_STORAGE_KEY);
    }
  }

  async getCategories(): Promise<SkillCategoryInfo[]> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${SKILL_ENDPOINT}/categories`);
        const list = ensureArray<Partial<SkillCategoryInfo>>(extractData<unknown[]>(response, []))
          .map((item) => normalizeCategoryInfo(item));
        return list.length > 0 ? list : seedCategories;
      },
      () => seedCategories.map((item) => ({ ...item })),
    );
  }

  async getSkills(
    category?: string,
    keyword?: string,
    sortBy: SkillSortType = "popular",
  ): Promise<SkillMarketItem[]> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(SKILL_ENDPOINT, {
          params: {
            category: category && category !== "all" ? category : undefined,
            keyword: keyword?.trim() || undefined,
            sortBy,
          },
        });
        const list = ensureArray<Partial<SkillMarketItem>>(extractData<unknown[]>(response, []))
          .map((item) => normalizeSkill(item));
        return sortSkills(this.applyWorkspaceState(list), sortBy);
      },
      () => this.queryFallbackSkills(category, keyword, sortBy),
    );
  }

  async getSkillById(skillId: string): Promise<SkillMarketItem | null> {
    if (!skillId) {
      return null;
    }

    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${SKILL_ENDPOINT}/${skillId}`);
        const data = extractData<unknown>(response, null);
        if (!data) {
          return null;
        }
        const skill = normalizeSkill(data as Partial<SkillMarketItem>);
        return {
          ...skill,
          isEnabled: this.enabledSkills.has(skill.id),
          isConfigured: this.isSkillConfigured(skill.id),
          configuredAt: this.configuredAtMap[skill.id],
        };
      },
      () => {
        const matched = seedSkills.find((item) => item.id === skillId);
        if (!matched) {
          return null;
        }
        return {
          ...matched,
          isEnabled: this.enabledSkills.has(matched.id),
          isConfigured: this.isSkillConfigured(matched.id),
          configuredAt: this.configuredAtMap[matched.id],
        };
      },
    );
  }

  async getMySkills(): Promise<UserSkill[]> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${SKILL_ENDPOINT}/my`);
        const list = ensureArray<Partial<UserSkill>>(extractData<unknown[]>(response, []))
          .map((item) => normalizeUserSkill(item))
          .filter((item) => item.enabled);
        return list;
      },
      () => Array.from(this.enabledSkills).map((skillId) => this.buildUserSkill(skillId)),
    );
  }

  async enableSkill(skillId: string): Promise<UserSkill> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${SKILL_ENDPOINT}/${skillId}/enable`);
        this.enabledSkills.add(skillId);
        this.persistEnabledSkills();
        const data = extractData<unknown>(response, undefined);
        if (!data) {
          return this.buildUserSkill(skillId);
        }
        return normalizeUserSkill(data as Partial<UserSkill>);
      },
      () => {
        this.enabledSkills.add(skillId);
        this.persistEnabledSkills();
        return this.buildUserSkill(skillId);
      },
    );
  }

  async disableSkill(skillId: string): Promise<void> {
    await this.withFallback(
      async () => {
        await apiClient.post<unknown>(`${SKILL_ENDPOINT}/${skillId}/disable`);
        this.enabledSkills.delete(skillId);
        this.persistEnabledSkills();
      },
      () => {
        this.enabledSkills.delete(skillId);
        this.persistEnabledSkills();
      },
    );
  }

  async updateSkillConfig(skillId: string, config: Record<string, unknown>): Promise<UserSkill> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${SKILL_ENDPOINT}/${skillId}/config`, { config });
        this.skillConfigs[skillId] = config;
        this.configuredAtMap[skillId] = new Date().toISOString();
        this.persistSkillConfigs();
        this.persistConfiguredAtMap();
        const data = extractData<unknown>(response, undefined);
        if (!data) {
          return this.buildUserSkill(skillId);
        }
        return normalizeUserSkill(data as Partial<UserSkill>);
      },
      () => {
        this.skillConfigs[skillId] = config;
        this.configuredAtMap[skillId] = new Date().toISOString();
        this.persistSkillConfigs();
        this.persistConfiguredAtMap();
        return this.buildUserSkill(skillId);
      },
    );
  }
}

export const SkillService = new SkillServiceImpl();
export default SkillService;
