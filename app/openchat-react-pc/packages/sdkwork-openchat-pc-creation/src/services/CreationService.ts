import type {
  CreationFilter,
  CreationItem,
  CreationParams,
  CreationStats,
  CreationTemplate,
  CreationType,
} from "../types";
import { getSDKAdapter } from "./sdk-adapter";

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ServicePage<T> {
  content: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

const CREATIONS_STORAGE_KEY = "openchat.creation.items";
const FAVORITE_CREATIONS_STORAGE_KEY = "openchat.creation.favorites";
const RECENT_CREATIONS_STORAGE_KEY = "openchat.creation.recent";
const MAX_RECENT_CREATION_COUNT = 24;
const memoryStore = new Map<string, unknown>();

const SEED_CREATIONS: CreationItem[] = [
  {
    id: "creation-seed-1",
    title: "Neon Street Poster",
    type: "image",
    prompt: "Cyberpunk city street with neon reflections and cinematic rain.",
    ratio: "16:9",
    style: "cyberpunk",
    url: "https://picsum.photos/seed/openchat-creation-1/1280/720",
    thumbnail: "https://picsum.photos/seed/openchat-creation-1/640/360",
    isPublic: true,
    author: "Creative AI",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=creative",
    likes: 182,
    views: 3450,
    model: "Midjourney V6",
    seed: 10001,
    steps: 30,
    cfgScale: 7,
    createTime: Date.parse("2026-01-10T10:00:00.000Z"),
    updateTime: Date.parse("2026-01-10T10:00:00.000Z"),
  },
  {
    id: "creation-seed-2",
    title: "Product Teaser Clip",
    type: "video",
    prompt: "A sleek startup teaser with quick transitions and modern typography.",
    ratio: "16:9",
    style: "minimal",
    url: "https://picsum.photos/seed/openchat-creation-2/1280/720",
    thumbnail: "https://picsum.photos/seed/openchat-creation-2/640/360",
    isPublic: true,
    author: "Studio Nine",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=studio",
    likes: 121,
    views: 2820,
    model: "Sora",
    seed: 10002,
    steps: 40,
    cfgScale: 7,
    createTime: Date.parse("2026-01-18T14:00:00.000Z"),
    updateTime: Date.parse("2026-01-18T14:00:00.000Z"),
  },
  {
    id: "creation-seed-3",
    title: "Ambient Focus Track",
    type: "music",
    prompt: "Lo-fi ambient track for focus sessions with soft synth textures.",
    ratio: "1:1",
    style: "ambient",
    url: "https://picsum.photos/seed/openchat-creation-3/1024/1024",
    thumbnail: "https://picsum.photos/seed/openchat-creation-3/512/512",
    isPublic: true,
    author: "Audio Lab",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=audio",
    likes: 96,
    views: 1775,
    model: "Udio",
    seed: 10003,
    steps: 36,
    cfgScale: 6.5,
    createTime: Date.parse("2026-01-21T09:30:00.000Z"),
    updateTime: Date.parse("2026-01-21T09:30:00.000Z"),
  },
  {
    id: "creation-seed-4",
    title: "Daily Productive Writing Prompt",
    type: "text",
    prompt: "Write a concise daily retrospective focused on impact and learning.",
    ratio: "1:1",
    style: "productivity",
    url: "https://picsum.photos/seed/openchat-creation-4/1024/1024",
    thumbnail: "https://picsum.photos/seed/openchat-creation-4/512/512",
    isPublic: true,
    author: "Prompt Coach",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=prompt",
    likes: 64,
    views: 1300,
    model: "GPT-4",
    seed: 10004,
    steps: 24,
    cfgScale: 6,
    createTime: Date.parse("2026-01-24T11:45:00.000Z"),
    updateTime: Date.parse("2026-01-24T11:45:00.000Z"),
  },
  {
    id: "creation-seed-5",
    title: "Mascot 3D Character",
    type: "3d",
    prompt: "A friendly 3D mascot with stylized proportions and bright colors.",
    ratio: "1:1",
    style: "cartoon",
    url: "https://picsum.photos/seed/openchat-creation-5/1024/1024",
    thumbnail: "https://picsum.photos/seed/openchat-creation-5/512/512",
    isPublic: true,
    author: "3D Forge",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=forge",
    likes: 143,
    views: 2210,
    model: "Meshy",
    seed: 10005,
    steps: 35,
    cfgScale: 7.5,
    createTime: Date.parse("2026-01-27T16:20:00.000Z"),
    updateTime: Date.parse("2026-01-27T16:20:00.000Z"),
  },
];

const SEED_TEMPLATES: CreationTemplate[] = [
  {
    id: "creation-template-image",
    name: "Image Starter",
    description: "Generate polished marketing images quickly.",
    type: "image",
    preview: "https://picsum.photos/seed/openchat-template-1/600/340",
    defaultPrompt: "A clean product hero shot with soft shadows and modern lighting.",
    defaultNegativePrompt: "low quality, blurry, distorted",
    defaultRatio: "16:9",
    defaultStyle: "realistic",
  },
  {
    id: "creation-template-video",
    name: "Video Starter",
    description: "Draft a short cinematic trailer sequence.",
    type: "video",
    preview: "https://picsum.photos/seed/openchat-template-2/600/340",
    defaultPrompt: "Cinematic startup trailer with smooth camera movement and urban shots.",
    defaultRatio: "16:9",
    defaultStyle: "cinematic",
  },
  {
    id: "creation-template-music",
    name: "Music Starter",
    description: "Generate a clean ambient track for productivity scenes.",
    type: "music",
    preview: "https://picsum.photos/seed/openchat-template-3/600/340",
    defaultPrompt: "Calm ambient background track with subtle percussions.",
    defaultRatio: "1:1",
    defaultStyle: "ambient",
  },
];

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneCreation(item: CreationItem): CreationItem {
  return {
    ...item,
  };
}

function readJson<T>(key: string): T | null {
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        memoryStore.set(key, cloneSerializable(parsed));
        return parsed;
      }
    } catch {
      // Fall back to memory store.
    }
  }

  if (!memoryStore.has(key)) {
    return null;
  }
  return cloneSerializable(memoryStore.get(key) as T);
}

function writeJson(key: string, value: unknown): void {
  memoryStore.set(key, cloneSerializable(value));
  if (hasLocalStorage()) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Keep in-memory fallback only.
    }
  }
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function normalizeCreationType(value: CreationType | undefined): CreationType {
  if (!value) {
    return "image";
  }
  if (value === "image" || value === "video" || value === "music" || value === "text" || value === "3d") {
    return value;
  }
  return "image";
}

function normalizeCreation(raw: Partial<CreationItem>): CreationItem | null {
  if (!raw.id || !raw.title || !raw.prompt || !raw.url || !raw.style || !raw.ratio || !raw.author) {
    return null;
  }

  const type = normalizeCreationType(raw.type);
  const createTime = typeof raw.createTime === "number" ? raw.createTime : Date.now();
  const updateTime = typeof raw.updateTime === "number" ? raw.updateTime : createTime;

  return {
    id: raw.id,
    title: raw.title,
    type,
    prompt: raw.prompt,
    negativePrompt: raw.negativePrompt,
    ratio: raw.ratio,
    style: raw.style,
    url: raw.url,
    thumbnail: raw.thumbnail,
    isPublic: raw.isPublic ?? true,
    author: raw.author,
    authorAvatar: raw.authorAvatar,
    likes: Number(raw.likes ?? 0),
    views: Number(raw.views ?? 0),
    model: raw.model,
    seed: raw.seed,
    steps: raw.steps,
    cfgScale: raw.cfgScale,
    createTime,
    updateTime,
  };
}

function seedCreations(): CreationItem[] {
  return SEED_CREATIONS.map(cloneCreation);
}

function loadCreations(): CreationItem[] {
  const stored = readJson<Partial<CreationItem>[]>(CREATIONS_STORAGE_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    const seeded = seedCreations();
    writeJson(CREATIONS_STORAGE_KEY, seeded);
    return seeded;
  }

  const normalized = stored
    .map((item) => normalizeCreation(item))
    .filter((item): item is CreationItem => item !== null);
  if (normalized.length === 0) {
    const seeded = seedCreations();
    writeJson(CREATIONS_STORAGE_KEY, seeded);
    return seeded;
  }
  return normalized;
}

function saveCreations(items: CreationItem[]): void {
  writeJson(
    CREATIONS_STORAGE_KEY,
    items.map((item) => cloneCreation(item)),
  );
}

function loadFavoriteCreationIds(): string[] {
  const stored = readJson<string[]>(FAVORITE_CREATIONS_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return unique(stored.filter((item) => typeof item === "string" && item.length > 0));
}

function saveFavoriteCreationIds(ids: string[]): void {
  writeJson(FAVORITE_CREATIONS_STORAGE_KEY, unique(ids));
}

function loadRecentCreationIds(): string[] {
  const stored = readJson<string[]>(RECENT_CREATIONS_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return unique(stored.filter((item) => typeof item === "string" && item.length > 0)).slice(
    0,
    MAX_RECENT_CREATION_COUNT,
  );
}

function saveRecentCreationIds(ids: string[]): void {
  writeJson(RECENT_CREATIONS_STORAGE_KEY, unique(ids).slice(0, MAX_RECENT_CREATION_COUNT));
}

function ok<T>(data: T, message?: string): ServiceResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

function fail<T>(message: string): ServiceResponse<T> {
  return {
    success: false,
    error: message,
    message,
  };
}

function buildCreationMediaSize(ratio: string): { width: number; height: number } {
  if (ratio === "16:9") {
    return { width: 1280, height: 720 };
  }
  if (ratio === "9:16") {
    return { width: 720, height: 1280 };
  }
  if (ratio === "3:4") {
    return { width: 900, height: 1200 };
  }
  if (ratio === "4:3") {
    return { width: 1200, height: 900 };
  }
  return { width: 1024, height: 1024 };
}

function buildCreationMediaUrls(id: string, ratio: string): { url: string; thumbnail: string } {
  const size = buildCreationMediaSize(ratio);
  return {
    url: `https://picsum.photos/seed/${id}/${size.width}/${size.height}`,
    thumbnail: `https://picsum.photos/seed/${id}/${Math.round(size.width / 2)}/${Math.round(size.height / 2)}`,
  };
}

function generateCreationId(): string {
  return `creation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function hasSdkReservation(): boolean {
  const adapter = getSDKAdapter();
  return Boolean(adapter && adapter.isAvailable());
}

export const CreationService = {
  getFavoriteCreationIds(): string[] {
    return loadFavoriteCreationIds();
  },

  isCreationFavorite(creationId: string): boolean {
    return loadFavoriteCreationIds().includes(creationId);
  },

  toggleFavoriteCreation(creationId: string): boolean {
    const favorites = loadFavoriteCreationIds();
    if (favorites.includes(creationId)) {
      const next = favorites.filter((id) => id !== creationId);
      saveFavoriteCreationIds(next);
      return false;
    }
    saveFavoriteCreationIds([creationId, ...favorites]);
    return true;
  },

  getRecentCreationIds(): string[] {
    return loadRecentCreationIds();
  },

  markCreationOpened(creationId: string): string[] {
    const recent = loadRecentCreationIds();
    const next = [creationId, ...recent.filter((id) => id !== creationId)].slice(
      0,
      MAX_RECENT_CREATION_COUNT,
    );
    saveRecentCreationIds(next);
    return next;
  },

  resetWorkspaceState(): void {
    saveCreations(seedCreations());
    saveFavoriteCreationIds([]);
    saveRecentCreationIds([]);
  },

  async getFeed(
    filter: CreationFilter = {},
    page = 1,
    size = 12,
  ): Promise<ServiceResponse<ServicePage<CreationItem>>> {
    const items = loadCreations();

    const filtered = items
      .filter((item) => (filter.type ? item.type === filter.type : true))
      .filter((item) => (filter.style ? item.style === filter.style : true))
      .filter((item) => (filter.author ? item.author === filter.author : true))
      .filter((item) => (filter.isPublic !== undefined ? item.isPublic === filter.isPublic : true))
      .sort((left, right) => {
        const popularityDiff = right.likes * 2 + right.views - (left.likes * 2 + left.views);
        if (popularityDiff !== 0) {
          return popularityDiff;
        }
        return (right.updateTime || 0) - (left.updateTime || 0);
      });

    const safePage = Math.max(1, page);
    const safeSize = Math.max(1, size);
    const total = filtered.length;
    const start = (safePage - 1) * safeSize;
    const content = filtered.slice(start, start + safeSize).map(cloneCreation);

    return ok({
      content,
      total,
      page: safePage,
      size: safeSize,
      totalPages: Math.max(1, Math.ceil(total / safeSize)),
    });
  },

  async getMyCreations(type?: CreationType): Promise<ServiceResponse<CreationItem[]>> {
    const myItems = loadCreations()
      .filter((item) => item.author === "Me")
      .filter((item) => (type ? item.type === type : true))
      .sort((left, right) => (right.createTime || 0) - (left.createTime || 0))
      .map(cloneCreation);

    return ok(myItems);
  },

  async create(params: CreationParams): Promise<ServiceResponse<CreationItem>> {
    if (!params.prompt.trim()) {
      return fail("Prompt is required.");
    }

    const id = generateCreationId();
    const ratio = params.ratio || "1:1";
    const media = buildCreationMediaUrls(id, ratio);
    const now = Date.now();

    const item: CreationItem = {
      id,
      title:
        params.prompt.trim().length > 40
          ? `${params.prompt.trim().slice(0, 40)}...`
          : params.prompt.trim(),
      type: normalizeCreationType(params.type),
      prompt: params.prompt.trim(),
      negativePrompt: params.negativePrompt?.trim() || undefined,
      ratio,
      style: params.style || "realistic",
      url: media.url,
      thumbnail: media.thumbnail,
      isPublic: false,
      author: "Me",
      authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=me",
      likes: 0,
      views: 0,
      model: params.model,
      seed: params.seed,
      steps: params.steps,
      cfgScale: params.cfgScale,
      createTime: now,
      updateTime: now,
    };

    const list = loadCreations();
    list.unshift(item);
    saveCreations(list);

    const message = hasSdkReservation()
      ? "Creation queued with local fallback (SDK bridge reserved)."
      : "Creation generated with local fallback.";
    return ok(cloneCreation(item), message);
  },

  async like(id: string): Promise<ServiceResponse<void>> {
    const list = loadCreations();
    const target = list.find((item) => item.id === id);
    if (!target) {
      return fail("Creation not found.");
    }

    target.likes += 1;
    target.updateTime = Date.now();
    saveCreations(list);
    return ok(undefined);
  },

  async deleteCreation(id: string): Promise<ServiceResponse<void>> {
    const list = loadCreations();
    const next = list.filter((item) => item.id !== id);
    if (next.length === list.length) {
      return fail("Creation not found.");
    }

    saveCreations(next);
    saveFavoriteCreationIds(loadFavoriteCreationIds().filter((itemId) => itemId !== id));
    saveRecentCreationIds(loadRecentCreationIds().filter((itemId) => itemId !== id));
    return ok(undefined);
  },

  async getTemplates(): Promise<ServiceResponse<CreationTemplate[]>> {
    return ok(SEED_TEMPLATES.map((item) => ({ ...item })));
  },

  async getRelatedCreations(targetId: string): Promise<ServiceResponse<CreationItem[]>> {
    const list = loadCreations();
    const target = list.find((item) => item.id === targetId);
    if (!target) {
      return fail("Target creation does not exist.");
    }

    const related = list
      .filter((item) => item.id !== targetId)
      .map((item) => {
        let score = 0;
        if (item.type === target.type) {
          score += 50;
        }
        if (item.style === target.style) {
          score += 30;
        }
        const words = item.prompt
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length >= 3);
        const overlap = words.filter((word) => target.prompt.toLowerCase().includes(word)).length;
        score += overlap * 5;
        return { item, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((entry) => cloneCreation(entry.item));

    return ok(related);
  },

  async search(query: string): Promise<ServiceResponse<CreationItem[]>> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return ok([]);
    }

    const results = loadCreations()
      .filter((item) => {
        const candidate = `${item.title} ${item.prompt} ${item.style} ${item.author}`.toLowerCase();
        return candidate.includes(normalized);
      })
      .sort((left, right) => (right.updateTime || 0) - (left.updateTime || 0))
      .map(cloneCreation);

    return ok(results);
  },

  async getStats(): Promise<ServiceResponse<CreationStats>> {
    const myCreations = loadCreations().filter((item) => item.author === "Me");
    const stats: CreationStats = {
      totalCreations: myCreations.length,
      totalLikes: myCreations.reduce((sum, item) => sum + item.likes, 0),
      totalViews: myCreations.reduce((sum, item) => sum + item.views, 0),
      byType: {
        image: myCreations.filter((item) => item.type === "image").length,
        video: myCreations.filter((item) => item.type === "video").length,
        music: myCreations.filter((item) => item.type === "music").length,
        text: myCreations.filter((item) => item.type === "text").length,
        "3d": myCreations.filter((item) => item.type === "3d").length,
      },
    };

    return ok(stats);
  },

  getStyles(): string[] {
    return [
      "realistic",
      "cinematic",
      "anime",
      "cyberpunk",
      "minimal",
      "ambient",
      "cartoon",
      "productivity",
    ];
  },

  getRatios(): Array<{ value: string; label: string }> {
    return [
      { value: "1:1", label: "1:1 Square" },
      { value: "16:9", label: "16:9 Wide" },
      { value: "9:16", label: "9:16 Vertical" },
      { value: "3:4", label: "3:4 Portrait" },
      { value: "4:3", label: "4:3 Standard" },
    ];
  },

  getModels(type: CreationType): string[] {
    const models: Record<CreationType, string[]> = {
      image: ["Midjourney V6", "Stable Diffusion XL", "DALL-E 3", "Leonardo AI"],
      video: ["Sora", "Runway Gen-3", "Pika 2.1", "Stable Video"],
      music: ["Udio", "Suno", "AIVA", "Mubert"],
      text: ["GPT-4", "Claude 3.5", "Gemini Pro"],
      "3d": ["Meshy", "Blender AI", "Spline AI", "Luma AI"],
    };

    return models[type] ? [...models[type]] : [];
  },
};

export default CreationService;
