import type {
  BreadcrumbItem,
  FileFilter,
  FileNode,
  FileType,
  StorageStats,
} from "../types";
import { getSDKAdapter } from "./sdk-adapter";

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface UploadFileInput {
  name: string;
  size: number;
  type: FileType;
  url?: string;
}

const FILE_STORAGE_KEY = "openchat.drive.files";
const FAVORITE_FILE_STORAGE_KEY = "openchat.drive.favorites";
const RECENT_FILE_STORAGE_KEY = "openchat.drive.recent";
const MAX_RECENT_FILE_COUNT = 24;
const TOTAL_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;
const memoryStore = new Map<string, unknown>();

const SEED_FILES: FileNode[] = [
  {
    id: "drive-root-docs",
    parentId: null,
    name: "Documents",
    type: "folder",
    createTime: Date.parse("2026-01-01T09:00:00.000Z"),
    updateTime: Date.parse("2026-01-01T09:00:00.000Z"),
  },
  {
    id: "drive-root-media",
    parentId: null,
    name: "Media",
    type: "folder",
    createTime: Date.parse("2026-01-03T09:00:00.000Z"),
    updateTime: Date.parse("2026-01-03T09:00:00.000Z"),
  },
  {
    id: "drive-root-code",
    parentId: null,
    name: "Code",
    type: "folder",
    createTime: Date.parse("2026-01-05T09:00:00.000Z"),
    updateTime: Date.parse("2026-01-05T09:00:00.000Z"),
  },
  {
    id: "drive-file-roadmap",
    parentId: "drive-root-docs",
    name: "Roadmap.pdf",
    type: "pdf",
    size: 2_500_000,
    createTime: Date.parse("2026-01-07T10:00:00.000Z"),
    updateTime: Date.parse("2026-01-25T14:30:00.000Z"),
    isStarred: true,
  },
  {
    id: "drive-file-notes",
    parentId: "drive-root-docs",
    name: "Meeting Notes.docx",
    type: "doc",
    size: 250_000,
    createTime: Date.parse("2026-01-09T10:00:00.000Z"),
    updateTime: Date.parse("2026-01-26T18:10:00.000Z"),
  },
  {
    id: "drive-file-banner",
    parentId: "drive-root-media",
    name: "Launch Banner.png",
    type: "image",
    size: 1_400_000,
    url: "https://picsum.photos/seed/openchat-drive-banner/1280/720",
    thumbnail: "https://picsum.photos/seed/openchat-drive-banner/640/360",
    createTime: Date.parse("2026-01-10T10:00:00.000Z"),
    updateTime: Date.parse("2026-01-28T08:20:00.000Z"),
  },
  {
    id: "drive-file-demo",
    parentId: "drive-root-media",
    name: "Feature Demo.mp4",
    type: "video",
    size: 28_000_000,
    createTime: Date.parse("2026-01-12T10:00:00.000Z"),
    updateTime: Date.parse("2026-01-30T20:00:00.000Z"),
  },
  {
    id: "drive-file-readme",
    parentId: "drive-root-code",
    name: "README.md",
    type: "doc",
    size: 12_000,
    createTime: Date.parse("2026-01-13T10:00:00.000Z"),
    updateTime: Date.parse("2026-01-29T12:00:00.000Z"),
  },
];

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneNode(node: FileNode): FileNode {
  return {
    ...node,
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

function normalizeFileType(value: FileType | undefined): FileType {
  const valid: FileType[] = [
    "folder",
    "image",
    "video",
    "audio",
    "doc",
    "pdf",
    "xls",
    "ppt",
    "zip",
    "code",
    "unknown",
  ];
  if (value && valid.includes(value)) {
    return value;
  }
  return "unknown";
}

function normalizeFile(raw: Partial<FileNode>): FileNode | null {
  if (!raw.id || typeof raw.name !== "string") {
    return null;
  }
  return {
    id: raw.id,
    parentId: raw.parentId === undefined ? null : raw.parentId,
    name: raw.name,
    type: normalizeFileType(raw.type),
    size: typeof raw.size === "number" ? raw.size : undefined,
    url: raw.url,
    thumbnail: raw.thumbnail,
    mimeType: raw.mimeType,
    isStarred: raw.isStarred,
    isShared: raw.isShared,
    createTime: typeof raw.createTime === "number" ? raw.createTime : Date.now(),
    updateTime: typeof raw.updateTime === "number" ? raw.updateTime : Date.now(),
  };
}

function seedFiles(): FileNode[] {
  return SEED_FILES.map(cloneNode);
}

function loadFiles(): FileNode[] {
  const stored = readJson<Partial<FileNode>[]>(FILE_STORAGE_KEY);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    const seeded = seedFiles();
    writeJson(FILE_STORAGE_KEY, seeded);
    return seeded;
  }

  const normalized = stored
    .map((item) => normalizeFile(item))
    .filter((item): item is FileNode => item !== null);
  if (normalized.length === 0) {
    const seeded = seedFiles();
    writeJson(FILE_STORAGE_KEY, seeded);
    return seeded;
  }
  return normalized;
}

function saveFiles(files: FileNode[]): void {
  writeJson(
    FILE_STORAGE_KEY,
    files.map((item) => cloneNode(item)),
  );
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items));
}

function loadFavoriteFileIds(): string[] {
  const stored = readJson<string[]>(FAVORITE_FILE_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return uniqueStrings(stored.filter((item) => typeof item === "string" && item.length > 0));
}

function saveFavoriteFileIds(ids: string[]): void {
  writeJson(FAVORITE_FILE_STORAGE_KEY, uniqueStrings(ids));
}

function loadRecentFileIds(): string[] {
  const stored = readJson<string[]>(RECENT_FILE_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) {
    return [];
  }
  return uniqueStrings(stored.filter((item) => typeof item === "string" && item.length > 0)).slice(
    0,
    MAX_RECENT_FILE_COUNT,
  );
}

function saveRecentFileIds(ids: string[]): void {
  writeJson(RECENT_FILE_STORAGE_KEY, uniqueStrings(ids).slice(0, MAX_RECENT_FILE_COUNT));
}

function buildFileId(prefix: "file" | "folder"): string {
  return `drive_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

function compareFiles(left: FileNode, right: FileNode): number {
  if (left.type === "folder" && right.type !== "folder") {
    return -1;
  }
  if (left.type !== "folder" && right.type === "folder") {
    return 1;
  }
  return (right.updateTime || 0) - (left.updateTime || 0);
}

function collectDescendantIds(allFiles: FileNode[], parentId: string): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [parentId];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const item of allFiles) {
      if (item.parentId === current && !descendants.has(item.id)) {
        descendants.add(item.id);
        if (item.type === "folder") {
          queue.push(item.id);
        }
      }
    }
  }

  return descendants;
}

function hasSdkReservation(): boolean {
  const adapter = getSDKAdapter();
  return Boolean(adapter && adapter.isAvailable());
}

export const FileService = {
  getFavoriteFileIds(): string[] {
    return loadFavoriteFileIds();
  },

  isFileFavorite(fileId: string): boolean {
    return loadFavoriteFileIds().includes(fileId);
  },

  toggleFavoriteFile(fileId: string): boolean {
    const favorites = loadFavoriteFileIds();
    if (favorites.includes(fileId)) {
      saveFavoriteFileIds(favorites.filter((id) => id !== fileId));
      return false;
    }

    saveFavoriteFileIds([fileId, ...favorites]);
    return true;
  },

  getRecentFileIds(): string[] {
    return loadRecentFileIds();
  },

  markFileOpened(fileId: string): string[] {
    const recent = loadRecentFileIds();
    const next = [fileId, ...recent.filter((id) => id !== fileId)].slice(0, MAX_RECENT_FILE_COUNT);
    saveRecentFileIds(next);
    return next;
  },

  resetWorkspaceState(): void {
    saveFiles(seedFiles());
    saveFavoriteFileIds([]);
    saveRecentFileIds([]);
  },

  async getFilesByParent(parentId: string | null, filter: FileFilter = {}): Promise<ServiceResponse<FileNode[]>> {
    const files = loadFiles()
      .filter((item) => item.parentId === parentId)
      .filter((item) => (filter.type ? item.type === filter.type : true))
      .filter((item) => (filter.search ? item.name.toLowerCase().includes(filter.search.toLowerCase()) : true))
      .filter((item) => (filter.isStarred !== undefined ? item.isStarred === filter.isStarred : true))
      .sort(compareFiles)
      .map(cloneNode);

    return ok(files);
  },

  async getBreadcrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
    if (!folderId) {
      return [];
    }

    const files = loadFiles();
    const breadcrumbs: BreadcrumbItem[] = [];
    let current = files.find((item) => item.id === folderId);
    let guard = 0;

    while (current && guard < 32) {
      breadcrumbs.unshift({ id: current.id, name: current.name });
      if (!current.parentId) {
        break;
      }
      current = files.find((item) => item.id === current?.parentId);
      guard += 1;
    }

    return breadcrumbs;
  },

  async createFolder(parentId: string | null, name: string): Promise<ServiceResponse<FileNode>> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return fail("Folder name is required.");
    }

    const files = loadFiles();
    const now = Date.now();
    const folder: FileNode = {
      id: buildFileId("folder"),
      parentId,
      name: normalizedName,
      type: "folder",
      createTime: now,
      updateTime: now,
    };

    files.push(folder);
    saveFiles(files);

    const message = hasSdkReservation()
      ? "Folder created via local fallback (SDK bridge reserved)."
      : undefined;
    return ok(cloneNode(folder), message);
  },

  async uploadFile(parentId: string | null, file: UploadFileInput): Promise<ServiceResponse<FileNode>> {
    const normalizedName = file.name.trim();
    if (!normalizedName) {
      return fail("File name is required.");
    }

    const now = Date.now();
    const node: FileNode = {
      id: buildFileId("file"),
      parentId,
      name: normalizedName,
      type: normalizeFileType(file.type),
      size: Math.max(0, Number(file.size || 0)),
      url: file.url,
      createTime: now,
      updateTime: now,
    };

    const files = loadFiles();
    files.push(node);
    saveFiles(files);
    return ok(cloneNode(node));
  },

  async renameFile(id: string, newName: string): Promise<ServiceResponse<void>> {
    const files = loadFiles();
    const target = files.find((item) => item.id === id);
    if (!target) {
      return fail("File not found.");
    }

    const normalizedName = newName.trim();
    if (!normalizedName) {
      return fail("File name cannot be empty.");
    }

    target.name = normalizedName;
    target.updateTime = Date.now();
    saveFiles(files);
    return ok(undefined);
  },

  async deleteFiles(ids: string[]): Promise<ServiceResponse<void>> {
    const idSet = new Set(ids);
    if (idSet.size === 0) {
      return ok(undefined);
    }

    const files = loadFiles();
    const deleteSet = new Set<string>(idSet);
    for (const id of idSet) {
      const target = files.find((item) => item.id === id);
      if (target?.type === "folder") {
        const descendants = collectDescendantIds(files, id);
        descendants.forEach((descendantId) => deleteSet.add(descendantId));
      }
    }

    const remaining = files.filter((item) => !deleteSet.has(item.id));
    saveFiles(remaining);
    saveFavoriteFileIds(loadFavoriteFileIds().filter((id) => !deleteSet.has(id)));
    saveRecentFileIds(loadRecentFileIds().filter((id) => !deleteSet.has(id)));

    return ok(undefined);
  },

  async moveFiles(ids: string[], targetParentId: string | null): Promise<ServiceResponse<void>> {
    const files = loadFiles();
    const idSet = new Set(ids);
    if (idSet.size === 0) {
      return ok(undefined);
    }

    for (const item of files) {
      if (!idSet.has(item.id) || item.type !== "folder") {
        continue;
      }

      if (targetParentId === item.id) {
        return fail("Cannot move a folder into itself.");
      }
      const descendants = collectDescendantIds(files, item.id);
      if (targetParentId && descendants.has(targetParentId)) {
        return fail("Cannot move a folder into its descendant.");
      }
    }

    const now = Date.now();
    files.forEach((item) => {
      if (idSet.has(item.id)) {
        item.parentId = targetParentId;
        item.updateTime = now;
      }
    });
    saveFiles(files);
    return ok(undefined);
  },

  async toggleStar(id: string): Promise<ServiceResponse<void>> {
    const files = loadFiles();
    const target = files.find((item) => item.id === id);
    if (!target) {
      return fail("File not found.");
    }

    target.isStarred = !target.isStarred;
    target.updateTime = Date.now();
    saveFiles(files);
    return ok(undefined);
  },

  async getStorageStats(): Promise<ServiceResponse<StorageStats>> {
    const files = loadFiles();
    const byType: Record<FileType, number> = {
      folder: 0,
      image: 0,
      video: 0,
      audio: 0,
      doc: 0,
      pdf: 0,
      xls: 0,
      ppt: 0,
      zip: 0,
      code: 0,
      unknown: 0,
    };

    let used = 0;
    files.forEach((item) => {
      const bytes = item.size || 0;
      used += bytes;
      byType[item.type] = (byType[item.type] || 0) + bytes;
    });

    return ok({
      total: TOTAL_STORAGE_BYTES,
      used,
      available: Math.max(TOTAL_STORAGE_BYTES - used, 0),
      byType,
    });
  },

  getFileIcon(type: FileType): { icon: string; color: string; bg: string } {
    const map: Record<FileType, { icon: string; color: string; bg: string }> = {
      folder: { icon: "📁", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.15)" },
      image: { icon: "🖼️", color: "#16A34A", bg: "rgba(22, 163, 74, 0.15)" },
      video: { icon: "🎬", color: "#DC2626", bg: "rgba(220, 38, 38, 0.15)" },
      audio: { icon: "🎵", color: "#DB2777", bg: "rgba(219, 39, 119, 0.15)" },
      doc: { icon: "📝", color: "#2563EB", bg: "rgba(37, 99, 235, 0.15)" },
      pdf: { icon: "📄", color: "#EA580C", bg: "rgba(234, 88, 12, 0.15)" },
      xls: { icon: "📊", color: "#16A34A", bg: "rgba(22, 163, 74, 0.15)" },
      ppt: { icon: "📽️", color: "#F97316", bg: "rgba(249, 115, 22, 0.15)" },
      zip: { icon: "📦", color: "#D97706", bg: "rgba(217, 119, 6, 0.15)" },
      code: { icon: "💻", color: "#0891B2", bg: "rgba(8, 145, 178, 0.15)" },
      unknown: { icon: "📄", color: "#6B7280", bg: "rgba(107, 114, 128, 0.15)" },
    };
    return map[type] || map.unknown;
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(value >= 100 || index === 0 ? 0 : 2)} ${units[index]}`;
  },
};

export default FileService;
