import { apiClient, IS_DEV } from "@sdkwork/openchat-pc-kernel";
import type {
  AppInfo,
  ModelConfig,
  NotificationSettings,
  PrivacySettings,
  SettingsState,
  StorageInfo,
  ThemeType,
} from "../types";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const SETTINGS_STORAGE_KEY = "openchat.settings.state";
const APP_INFO_STORAGE_KEY = "openchat.settings.app-info";
const SETTINGS_BASE_URL = "/settings";
const DEFAULT_STORAGE_TOTAL = 10 * 1024 * 1024 * 1024;

const DEFAULT_SETTINGS: SettingsState = {
  theme: "blue",
  notifications: {
    messagePreview: true,
    messageSound: true,
    messageVibration: false,
    groupMessage: true,
    groupMention: true,
    systemUpdates: true,
    marketingEmails: false,
    doNotDisturb: false,
    doNotDisturbStart: "23:00",
    doNotDisturbEnd: "08:00",
  },
  privacy: {
    onlineStatus: "contacts",
    lastSeen: "contacts",
    profilePhoto: "everyone",
    phoneNumber: "contacts",
    addByPhone: true,
    addByUsername: true,
    addByQRCode: true,
    readReceipts: true,
    screenshotNotification: false,
  },
  preferences: {
    language: "zh-CN",
    fontSize: "medium",
    compactMode: false,
    mediaQuality: "auto",
    autoDownload: {
      images: true,
      videos: false,
      files: false,
    },
  },
  modelConfigs: [],
};

const DEFAULT_APP_INFO: AppInfo = {
  version: "1.0.0",
  buildNumber: "local",
  platform: "web",
  updateAvailable: false,
};

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function unwrapData<T>(response: unknown): T {
  const object = asObject(response);
  if (object && "data" in object) {
    return (object as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

function cloneSettings(settings: SettingsState): SettingsState {
  return {
    ...settings,
    notifications: { ...settings.notifications },
    privacy: { ...settings.privacy },
    preferences: {
      ...settings.preferences,
      autoDownload: { ...settings.preferences.autoDownload },
    },
    modelConfigs: settings.modelConfigs.map((config) => ({ ...config })),
  };
}

function mergeSettings(base: SettingsState, patch: Partial<SettingsState>): SettingsState {
  return {
    ...base,
    ...patch,
    notifications: {
      ...base.notifications,
      ...(patch.notifications || {}),
    },
    privacy: {
      ...base.privacy,
      ...(patch.privacy || {}),
    },
    preferences: {
      ...base.preferences,
      ...(patch.preferences || {}),
      autoDownload: {
        ...base.preferences.autoDownload,
        ...(patch.preferences?.autoDownload || {}),
      },
    },
    modelConfigs: patch.modelConfigs ? patch.modelConfigs.map((item) => ({ ...item })) : base.modelConfigs,
  };
}

function readJson<T>(key: string): T | null {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failure.
  }
}

function readLocalSettings(): SettingsState {
  const stored = readJson<Partial<SettingsState>>(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return cloneSettings(DEFAULT_SETTINGS);
  }
  return mergeSettings(cloneSettings(DEFAULT_SETTINGS), stored);
}

function writeLocalSettings(settings: SettingsState): void {
  writeJson(SETTINGS_STORAGE_KEY, settings);
}

function readLocalAppInfo(): AppInfo {
  const stored = readJson<Partial<AppInfo>>(APP_INFO_STORAGE_KEY);
  if (!stored) {
    return { ...DEFAULT_APP_INFO };
  }
  return {
    ...DEFAULT_APP_INFO,
    ...stored,
  };
}

function writeLocalAppInfo(appInfo: AppInfo): void {
  writeJson(APP_INFO_STORAGE_KEY, appInfo);
}

function estimateStorageInfo(settings: SettingsState): StorageInfo {
  const serialized = JSON.stringify(settings);
  const estimatedSize = serialized.length * 2;
  const cacheSize = Math.round(estimatedSize * 0.4);
  const appUsage = Math.round(estimatedSize * 0.6);
  const mediaSize = 0;
  const documentSize = 0;
  const used = appUsage + cacheSize + mediaSize + documentSize;

  return {
    total: DEFAULT_STORAGE_TOTAL,
    used,
    free: Math.max(DEFAULT_STORAGE_TOTAL - used, 0),
    appUsage,
    cacheSize,
    mediaSize,
    documentSize,
  };
}

async function withFallback<T>(apiTask: () => Promise<T>, fallbackTask: () => T): Promise<T> {
  try {
    return await apiTask();
  } catch (error) {
    if (!IS_DEV) {
      throw error;
    }
    return fallbackTask();
  }
}

class SettingsServiceClass {
  private readonly baseUrl = SETTINGS_BASE_URL;

  async getStorageInfo(): Promise<StorageInfo> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${this.baseUrl}/storage`);
        return unwrapData<StorageInfo>(response);
      },
      () => estimateStorageInfo(readLocalSettings()),
    );
  }

  async cleanCache(): Promise<void> {
    if (IS_DEV) {
      const current = readLocalSettings();
      writeLocalSettings(current);
      return;
    }

    await apiClient.post(`${this.baseUrl}/storage/clean-cache`);
  }

  async cleanAllData(): Promise<void> {
    if (hasLocalStorage()) {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem(APP_INFO_STORAGE_KEY);
    }

    if (!IS_DEV) {
      await apiClient.post(`${this.baseUrl}/storage/clean-all`);
    }
  }

  async getAppInfo(): Promise<AppInfo> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${this.baseUrl}/app-info`);
        const appInfo = {
          ...DEFAULT_APP_INFO,
          ...unwrapData<Partial<AppInfo>>(response),
        };
        writeLocalAppInfo(appInfo);
        return appInfo;
      },
      () => readLocalAppInfo(),
    );
  }

  async checkForUpdates(): Promise<AppInfo> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${this.baseUrl}/check-update`);
        const remote = unwrapData<Partial<AppInfo>>(response);
        const appInfo: AppInfo = {
          ...readLocalAppInfo(),
          ...remote,
        };
        writeLocalAppInfo(appInfo);
        return appInfo;
      },
      () => {
        const current = readLocalAppInfo();
        return {
          ...current,
          latestVersion: current.version,
          updateAvailable: false,
          releaseNotes: "You are using the latest local build.",
        };
      },
    );
  }

  async getSettings(): Promise<SettingsState> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(this.baseUrl);
        const remote = unwrapData<Partial<SettingsState>>(response);
        const merged = mergeSettings(cloneSettings(DEFAULT_SETTINGS), remote);
        writeLocalSettings(merged);
        return merged;
      },
      () => readLocalSettings(),
    );
  }

  async updateSettings(settings: Partial<SettingsState>): Promise<SettingsState> {
    const current = readLocalSettings();
    const merged = mergeSettings(current, settings);
    writeLocalSettings(merged);

    return withFallback(
      async () => {
        const response = await apiClient.put<unknown>(this.baseUrl, settings);
        const remote = unwrapData<Partial<SettingsState>>(response);
        const remoteMerged = mergeSettings(merged, remote);
        writeLocalSettings(remoteMerged);
        return remoteMerged;
      },
      () => merged,
    );
  }

  async setTheme(theme: ThemeType): Promise<void> {
    const current = readLocalSettings();
    const next = mergeSettings(current, { theme });
    writeLocalSettings(next);

    if (!IS_DEV) {
      await apiClient.put(`${this.baseUrl}/theme`, { theme });
    }
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const current = readLocalSettings();
    const next = mergeSettings(current, {
      notifications: {
        ...current.notifications,
        ...settings,
      },
    });
    writeLocalSettings(next);

    if (!IS_DEV) {
      await apiClient.put(`${this.baseUrl}/notifications`, settings);
    }
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<void> {
    const current = readLocalSettings();
    const next = mergeSettings(current, {
      privacy: {
        ...current.privacy,
        ...settings,
      },
    });
    writeLocalSettings(next);

    if (!IS_DEV) {
      await apiClient.put(`${this.baseUrl}/privacy`, settings);
    }
  }

  async getModelConfigs(): Promise<ModelConfig[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${this.baseUrl}/models`);
        const list = unwrapData<unknown>(response);
        if (!Array.isArray(list)) {
          return readLocalSettings().modelConfigs;
        }
        return list as ModelConfig[];
      },
      () => readLocalSettings().modelConfigs,
    );
  }

  async saveModelConfig(config: ModelConfig): Promise<void> {
    const current = readLocalSettings();
    const others = current.modelConfigs.filter((item) => item.id !== config.id);
    const nextList = [...others, { ...config }];
    writeLocalSettings(mergeSettings(current, { modelConfigs: nextList }));

    if (!IS_DEV) {
      await apiClient.post(`${this.baseUrl}/models`, config);
    }
  }

  async deleteModelConfig(configId: string): Promise<void> {
    const current = readLocalSettings();
    const nextList = current.modelConfigs.filter((item) => item.id !== configId);
    writeLocalSettings(mergeSettings(current, { modelConfigs: nextList }));

    if (!IS_DEV) {
      await apiClient.delete(`${this.baseUrl}/models/${configId}`);
    }
  }

  async setDefaultModelConfig(configId: string): Promise<void> {
    const current = readLocalSettings();
    const nextList = current.modelConfigs.map((item) => ({
      ...item,
      isDefault: item.id === configId,
    }));
    writeLocalSettings(mergeSettings(current, { modelConfigs: nextList }));

    if (!IS_DEV) {
      await apiClient.put(`${this.baseUrl}/models/${configId}/default`);
    }
  }
}

export const SettingsService = new SettingsServiceClass();
