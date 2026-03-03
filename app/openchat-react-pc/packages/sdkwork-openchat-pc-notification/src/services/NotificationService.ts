import { apiClient, IS_DEV, type PageQuery, type Result } from "@sdkwork/openchat-pc-kernel";
import type {
  Notification,
  NotificationFilter,
  NotificationSettings,
  NotificationStats,
  NotificationType,
} from "../types";

const NOTIFICATION_ENDPOINT = "/notifications";
const settingsStorageKey = "openchat.notification.settings";
const notificationStorageKey = "openchat.notification.items";
const now = Date.now();

const seedNotifications: Notification[] = [
  {
    id: "notification-1",
    type: "system",
    title: "Welcome to OpenChat",
    content: "Your workspace setup is complete. Start by customizing your profile and preferences.",
    icon: "SYS",
    isRead: false,
    createTime: now - 30 * 60 * 1000,
    updateTime: now - 30 * 60 * 1000,
  },
  {
    id: "notification-2",
    type: "social",
    title: "New mention",
    content: "Mia mentioned you in a team thread about the architecture rollout.",
    icon: "SOC",
    isRead: false,
    createTime: now - 90 * 60 * 1000,
    updateTime: now - 90 * 60 * 1000,
  },
  {
    id: "notification-3",
    type: "order",
    title: "Order completed",
    content: "Your workspace purchase order has been completed successfully.",
    icon: "ORD",
    isRead: true,
    createTime: now - 3 * 60 * 60 * 1000,
    updateTime: now - 3 * 60 * 60 * 1000,
  },
];

const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  soundEnabled: true,
  desktopEnabled: true,
  emailEnabled: false,
  typeSettings: {
    system: { push: true, sound: true, desktop: true },
    social: { push: true, sound: true, desktop: true },
    order: { push: true, sound: true, desktop: true },
    promotion: { push: false, sound: false, desktop: false },
    message: { push: true, sound: true, desktop: true },
  },
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeType(value: unknown): NotificationType {
  const valid: NotificationType[] = ["system", "social", "order", "promotion", "message"];
  return typeof value === "string" && valid.includes(value as NotificationType)
    ? (value as NotificationType)
    : "system";
}

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    const result = response as Partial<Result<T>>;
    return {
      success: Boolean(result.success),
      data: (result.data as T | undefined) ?? defaultData,
      message: typeof result.message === "string" ? result.message : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      code: typeof result.code === "number" ? result.code : undefined,
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

function normalizeNotification(input: Partial<Notification>): Notification {
  const createTime = toNumber(input.createTime, Date.now());

  return {
    id: input.id || createId("notification"),
    type: normalizeType(input.type),
    title: input.title || "Notification",
    content: input.content || "",
    icon: input.icon,
    link: input.link,
    isRead: Boolean(input.isRead),
    meta: input.meta,
    createTime,
    updateTime: toNumber(input.updateTime, createTime),
  };
}

function normalizeSettings(input: Partial<NotificationSettings>): NotificationSettings {
  const typeSettings = (input.typeSettings || {}) as Partial<NotificationSettings["typeSettings"]>;

  return {
    pushEnabled: input.pushEnabled === undefined ? true : Boolean(input.pushEnabled),
    soundEnabled: input.soundEnabled === undefined ? true : Boolean(input.soundEnabled),
    desktopEnabled: input.desktopEnabled === undefined ? true : Boolean(input.desktopEnabled),
    emailEnabled: input.emailEnabled === undefined ? false : Boolean(input.emailEnabled),
    typeSettings: {
      system: {
        push: typeSettings.system?.push ?? true,
        sound: typeSettings.system?.sound ?? true,
        desktop: typeSettings.system?.desktop ?? true,
      },
      social: {
        push: typeSettings.social?.push ?? true,
        sound: typeSettings.social?.sound ?? true,
        desktop: typeSettings.social?.desktop ?? true,
      },
      order: {
        push: typeSettings.order?.push ?? true,
        sound: typeSettings.order?.sound ?? true,
        desktop: typeSettings.order?.desktop ?? true,
      },
      promotion: {
        push: typeSettings.promotion?.push ?? false,
        sound: typeSettings.promotion?.sound ?? false,
        desktop: typeSettings.promotion?.desktop ?? false,
      },
      message: {
        push: typeSettings.message?.push ?? true,
        sound: typeSettings.message?.sound ?? true,
        desktop: typeSettings.message?.desktop ?? true,
      },
    },
  };
}

class NotificationServiceImpl {
  private fallbackNotifications: Notification[] = seedNotifications.map((item) => ({ ...item }));
  private fallbackSettings: NotificationSettings = { ...defaultSettings };

  constructor() {
    const persistedNotifications = this.readNotificationsFromStorage();
    if (persistedNotifications) {
      this.fallbackNotifications = persistedNotifications;
    }

    const persisted = this.readSettingsFromStorage();
    if (persisted) {
      this.fallbackSettings = persisted;
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

  private readSettingsFromStorage(): NotificationSettings | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(settingsStorageKey);
      if (!raw) {
        return null;
      }
      return normalizeSettings(JSON.parse(raw) as Partial<NotificationSettings>);
    } catch {
      return null;
    }
  }

  private readNotificationsFromStorage(): Notification[] | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(notificationStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }

      return parsed.map((item) => normalizeNotification(item as Partial<Notification>));
    } catch {
      return null;
    }
  }

  private persistNotifications(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(notificationStorageKey, JSON.stringify(this.fallbackNotifications));
    }
  }

  private persistSettings(settings: NotificationSettings): void {
    this.fallbackSettings = settings;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    }
  }

  private queryFallback(filter: NotificationFilter): Notification[] {
    return this.fallbackNotifications
      .filter((item) => (filter.type && filter.type !== "all" ? item.type === filter.type : true))
      .filter((item) => (filter.isRead !== undefined ? item.isRead === filter.isRead : true))
      .filter((item) => (filter.startTime !== undefined ? (item.createTime || 0) >= filter.startTime : true))
      .filter((item) => (filter.endTime !== undefined ? (item.createTime || 0) <= filter.endTime : true))
      .sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
  }

  async getNotifications(filter: NotificationFilter = {}): Promise<Result<Notification[]>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(NOTIFICATION_ENDPOINT, {
          params: {
            type: filter.type,
            isRead: filter.isRead,
            startTime: filter.startTime,
            endTime: filter.endTime,
          },
        });
        const result = toResult<unknown>(response, []);
        if (!result.success) {
          return { ...result, data: [] };
        }

        const list = Array.isArray(result.data)
          ? result.data.map((item) => normalizeNotification(item as Partial<Notification>))
          : [];

        if (!IS_DEV) {
          return { ...result, data: list };
        }

        const merged = new Map<string, Notification>();
        this.queryFallback(filter).forEach((item) => {
          merged.set(item.id, { ...item });
        });
        list.forEach((item) => {
          merged.set(item.id, item);
        });

        return {
          ...result,
          data: Array.from(merged.values()).sort((left, right) => (right.createTime || 0) - (left.createTime || 0)),
        };
      },
      () => ({ success: true, data: this.queryFallback(filter).map((item) => ({ ...item })) }),
    );
  }

  async getNotificationsPage(
    filter: NotificationFilter = {},
    pageRequest: PageQuery,
  ): Promise<Result<{ content: Notification[]; total: number }>> {
    return this.withFallback(
      async () => {
        const page = pageRequest.page || 1;
        const pageSize = pageRequest.pageSize || 10;

        const response = await apiClient.get<unknown>(`${NOTIFICATION_ENDPOINT}/page`, {
          params: {
            ...filter,
            page,
            pageSize,
          },
        });

        const fallbackData = { content: [], total: 0 };
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }

        const payload = result.data as Partial<{ content: unknown[]; list: unknown[]; total: number }>;
        const source = Array.isArray(payload.content) ? payload.content : Array.isArray(payload.list) ? payload.list : [];

        return {
          ...result,
          data: {
            content: source.map((item) => normalizeNotification(item as Partial<Notification>)),
            total: toNumber(payload.total, source.length),
          },
        };
      },
      async () => {
        const listRes = await this.getNotifications(filter);
        const list = listRes.data || [];
        const page = pageRequest.page || 1;
        const pageSize = pageRequest.pageSize || 10;
        const start = (page - 1) * pageSize;
        const content = list.slice(start, start + pageSize);

        return { success: true, data: { content, total: list.length } };
      },
    );
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<unknown>(`${NOTIFICATION_ENDPOINT}/unread-count`);
      const result = toResult<unknown>(response, 0);
      if (result.success) {
        return toNumber(result.data, 0);
      }
    } catch {
      if (!IS_DEV) {
        throw new Error("Failed to load unread count.");
      }
    }

    return this.fallbackNotifications.filter((item) => !item.isRead).length;
  }

  async getStats(): Promise<Result<NotificationStats>> {
    return this.withFallback(
      async () => {
        const fallbackData: NotificationStats = {
          total: 0,
          unread: 0,
          byType: {
            system: 0,
            social: 0,
            order: 0,
            promotion: 0,
            message: 0,
          },
        };

        const response = await apiClient.get<unknown>(`${NOTIFICATION_ENDPOINT}/stats`);
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }

        const payload = result.data as Partial<NotificationStats>;
        return {
          ...result,
          data: {
            total: toNumber(payload.total),
            unread: toNumber(payload.unread),
            byType: {
              system: toNumber(payload.byType?.system),
              social: toNumber(payload.byType?.social),
              order: toNumber(payload.byType?.order),
              promotion: toNumber(payload.byType?.promotion),
              message: toNumber(payload.byType?.message),
            },
          },
        };
      },
      () => {
        const byType: Record<NotificationType, number> = {
          system: 0,
          social: 0,
          order: 0,
          promotion: 0,
          message: 0,
        };

        this.fallbackNotifications.forEach((item) => {
          byType[item.type] += 1;
        });

        return {
          success: true,
          data: {
            total: this.fallbackNotifications.length,
            unread: this.fallbackNotifications.filter((item) => !item.isRead).length,
            byType,
          },
        };
      },
    );
  }

  async markAllRead(type?: NotificationType): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${NOTIFICATION_ENDPOINT}/read-all`, { type });
        const result = toResult<unknown>(response, undefined);
        if (result.success) {
          this.fallbackNotifications = this.fallbackNotifications.map((item) => {
            if (type && item.type !== type) {
              return item;
            }
            return { ...item, isRead: true, updateTime: Date.now() };
          });
          this.persistNotifications();
        }
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.fallbackNotifications = this.fallbackNotifications.map((item) => {
          if (type && item.type !== type) {
            return item;
          }
          return { ...item, isRead: true, updateTime: Date.now() };
        });
        this.persistNotifications();
        return { success: true };
      },
    );
  }

  async markRead(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${NOTIFICATION_ENDPOINT}/${id}/read`);
        const result = toResult<unknown>(response, undefined);
        if (result.success) {
          this.fallbackNotifications = this.fallbackNotifications.map((item) =>
            item.id === id ? { ...item, isRead: true, updateTime: Date.now() } : item,
          );
          this.persistNotifications();
        }
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.fallbackNotifications = this.fallbackNotifications.map((item) =>
          item.id === id ? { ...item, isRead: true, updateTime: Date.now() } : item,
        );
        this.persistNotifications();
        return { success: true };
      },
    );
  }

  async markUnread(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${NOTIFICATION_ENDPOINT}/${id}/unread`);
        const result = toResult<unknown>(response, undefined);
        if (result.success) {
          this.fallbackNotifications = this.fallbackNotifications.map((item) =>
            item.id === id ? { ...item, isRead: false, updateTime: Date.now() } : item,
          );
          this.persistNotifications();
        }
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.fallbackNotifications = this.fallbackNotifications.map((item) =>
          item.id === id ? { ...item, isRead: false, updateTime: Date.now() } : item,
        );
        this.persistNotifications();
        return { success: true };
      },
    );
  }

  async deleteNotification(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(`${NOTIFICATION_ENDPOINT}/${id}`);
        const result = toResult<unknown>(response, undefined);
        if (result.success) {
          this.fallbackNotifications = this.fallbackNotifications.filter((item) => item.id !== id);
          this.persistNotifications();
        }
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.fallbackNotifications = this.fallbackNotifications.filter((item) => item.id !== id);
        this.persistNotifications();
        return { success: true };
      },
    );
  }

  async clearRead(type?: NotificationType): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${NOTIFICATION_ENDPOINT}/clear-read`, {
          type,
        });
        const result = toResult<unknown>(response, undefined);
        if (result.success) {
          this.fallbackNotifications = this.fallbackNotifications.filter((item) => {
            if (type && item.type !== type) {
              return true;
            }
            return !item.isRead;
          });
          this.persistNotifications();
        }
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.fallbackNotifications = this.fallbackNotifications.filter((item) => {
          if (type && item.type !== type) {
            return true;
          }
          return !item.isRead;
        });
        this.persistNotifications();
        return { success: true };
      },
    );
  }

  async pushNotification(
    title: string,
    content: string,
    type: NotificationType = "system",
    meta?: Notification["meta"],
  ): Promise<Result<Notification>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(NOTIFICATION_ENDPOINT, {
          title,
          content,
          type,
          meta,
        });
        const result = toResult<unknown>(response, undefined);
        if (!result.success) {
          return { success: false, message: result.message || result.error };
        }

        const iconMap: Record<NotificationType, string> = {
          system: "SYS",
          social: "SOC",
          order: "ORD",
          promotion: "PRM",
          message: "MSG",
        };

        const notification = normalizeNotification(
          ((result.data as Partial<Notification> | undefined) ?? {
            title,
            content,
            type,
            icon: iconMap[type],
            isRead: false,
            meta,
          }) as Partial<Notification>,
        );

        this.fallbackNotifications = [notification, ...this.fallbackNotifications];
        this.persistNotifications();
        return { success: true, data: notification, message: result.message };
      },
      () => {
        const iconMap: Record<NotificationType, string> = {
          system: "SYS",
          social: "SOC",
          order: "ORD",
          promotion: "PRM",
          message: "MSG",
        };

        const notification = normalizeNotification({
          id: createId("notification"),
          title,
          content,
          type,
          icon: iconMap[type],
          isRead: false,
          meta,
          createTime: Date.now(),
          updateTime: Date.now(),
        });

        this.fallbackNotifications = [notification, ...this.fallbackNotifications];
        this.persistNotifications();
        return { success: true, data: notification };
      },
    );
  }

  async getSettings(): Promise<Result<NotificationSettings>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${NOTIFICATION_ENDPOINT}/settings`);
        const result = toResult<unknown>(response, this.fallbackSettings);
        if (!result.success) {
          return { ...result, data: this.fallbackSettings };
        }
        return {
          ...result,
          data: normalizeSettings((result.data || this.fallbackSettings) as Partial<NotificationSettings>),
        };
      },
      () => ({ success: true, data: this.fallbackSettings }),
    );
  }

  async saveSettings(settings: NotificationSettings): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${NOTIFICATION_ENDPOINT}/settings`, settings);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.persistSettings(normalizeSettings(settings));
        return { success: true };
      },
    );
  }

  resetWorkspaceState(): void {
    this.fallbackNotifications = seedNotifications.map((item) => ({ ...item }));
    this.fallbackSettings = { ...defaultSettings };

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(notificationStorageKey);
      localStorage.removeItem(settingsStorageKey);
    }
  }
}

export const NotificationService = new NotificationServiceImpl();
