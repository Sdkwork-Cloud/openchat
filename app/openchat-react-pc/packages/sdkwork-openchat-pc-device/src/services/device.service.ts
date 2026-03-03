import { apiClient, IS_DEV } from "@sdkwork/openchat-pc-kernel";
import {
  DeviceMessageDirection,
  DeviceMessageType,
  DeviceStatus,
  DeviceType,
} from "../entities/device.entity";
import type { Device, DeviceCommand, DeviceFilter, DeviceMessage } from "../entities/device.entity";

type DeviceWritePayload = {
  deviceId: string;
  type: DeviceType;
  name: string;
  description?: string;
  ipAddress?: string;
  macAddress?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
};

type DeviceMessageWritePayload = {
  type: DeviceMessageType;
  payload: unknown;
  topic?: string;
};

type DeviceApiPayload = Partial<Omit<Device, "createdAt" | "updatedAt">> & {
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type DeviceMessageApiPayload = Partial<Omit<DeviceMessage, "createdAt">> & {
  createdAt?: Date | string;
};

type DeviceStats = {
  total: number;
  online: number;
  offline: number;
  byType: { [key in DeviceType]: number };
};

const DEVICE_ENDPOINT = "/devices";

const FALLBACK_DEVICES: Device[] = [
  {
    id: "device-1",
    deviceId: "xiaozhi-001",
    type: DeviceType.XIAOZHI,
    name: "Living Room Assistant",
    description: "Primary smart voice assistant",
    status: DeviceStatus.ONLINE,
    ipAddress: "192.168.1.100",
    macAddress: "AA:BB:CC:DD:EE:01",
    metadata: {
      firmwareVersion: "1.0.0",
      hardwareVersion: "ESP32",
      capabilities: ["audio", "stt", "tts", "llm", "mcp"],
    },
    userId: "current-user",
    createdAt: new Date("2024-01-01T08:00:00Z"),
    updatedAt: new Date("2024-01-01T08:00:00Z"),
  },
  {
    id: "device-2",
    deviceId: "xiaozhi-002",
    type: DeviceType.XIAOZHI,
    name: "Bedroom Assistant",
    description: "Secondary night-time assistant",
    status: DeviceStatus.OFFLINE,
    ipAddress: "192.168.1.101",
    macAddress: "AA:BB:CC:DD:EE:02",
    metadata: {
      firmwareVersion: "1.0.1",
      hardwareVersion: "ESP32",
      capabilities: ["audio", "stt", "tts", "llm"],
    },
    userId: "current-user",
    createdAt: new Date("2024-01-02T08:00:00Z"),
    updatedAt: new Date("2024-01-02T08:00:00Z"),
  },
  {
    id: "device-3",
    deviceId: "light-001",
    type: DeviceType.OTHER,
    name: "Smart Light",
    description: "Dimmable RGB light",
    status: DeviceStatus.ONLINE,
    ipAddress: "192.168.1.102",
    macAddress: "AA:BB:CC:DD:EE:03",
    metadata: {
      firmwareVersion: "2.0.0",
      hardwareVersion: "ESP8266",
      capabilities: ["light", "dimmer", "color"],
    },
    userId: "current-user",
    createdAt: new Date("2024-01-03T08:00:00Z"),
    updatedAt: new Date("2024-01-03T08:00:00Z"),
  },
];

const FALLBACK_MESSAGES: DeviceMessage[] = [
  {
    id: "message-1",
    deviceId: "xiaozhi-001",
    type: DeviceMessageType.STATUS,
    direction: DeviceMessageDirection.FROM_DEVICE,
    payload: { status: "online", battery: 85, signal: 4 },
    topic: "status",
    processed: true,
    createdAt: new Date("2024-01-01T10:00:00Z"),
  },
  {
    id: "message-2",
    deviceId: "xiaozhi-001",
    type: DeviceMessageType.COMMAND,
    direction: DeviceMessageDirection.TO_DEVICE,
    payload: { action: "play", params: { scene: "daily-briefing" } },
    topic: "control",
    processed: true,
    createdAt: new Date("2024-01-01T10:05:00Z"),
  },
  {
    id: "message-3",
    deviceId: "xiaozhi-002",
    type: DeviceMessageType.EVENT,
    direction: DeviceMessageDirection.FROM_DEVICE,
    payload: { event: "wakeup", keyword: "hello assistant" },
    topic: "event",
    processed: true,
    createdAt: new Date("2024-01-01T11:00:00Z"),
  },
];

function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeDevice(payload: DeviceApiPayload): Device {
  return {
    id: String(payload.id ?? createId("device")),
    deviceId: String(payload.deviceId ?? ""),
    type: (payload.type as DeviceType) || DeviceType.OTHER,
    name: String(payload.name ?? "Unnamed Device"),
    description: typeof payload.description === "string" ? payload.description : undefined,
    status: (payload.status as DeviceStatus) || DeviceStatus.UNKNOWN,
    ipAddress: typeof payload.ipAddress === "string" ? payload.ipAddress : undefined,
    macAddress: typeof payload.macAddress === "string" ? payload.macAddress : undefined,
    metadata: (payload.metadata as Record<string, unknown>) || {},
    userId: typeof payload.userId === "string" ? payload.userId : undefined,
    createdAt: toDate(payload.createdAt),
    updatedAt: toDate(payload.updatedAt),
  };
}

function normalizeMessage(payload: DeviceMessageApiPayload): DeviceMessage {
  return {
    id: String(payload.id ?? createId("message")),
    deviceId: String(payload.deviceId ?? ""),
    type: (payload.type as DeviceMessageType) || DeviceMessageType.EVENT,
    direction:
      (payload.direction as DeviceMessageDirection) || DeviceMessageDirection.FROM_DEVICE,
    payload: payload.payload ?? {},
    topic: typeof payload.topic === "string" ? payload.topic : undefined,
    processed: Boolean(payload.processed),
    error: typeof payload.error === "string" ? payload.error : undefined,
    createdAt: toDate(payload.createdAt),
  };
}

function toDeviceStats(devices: Device[]): DeviceStats {
  return {
    total: devices.length,
    online: devices.filter((item) => item.status === DeviceStatus.ONLINE).length,
    offline: devices.filter((item) => item.status === DeviceStatus.OFFLINE).length,
    byType: {
      [DeviceType.XIAOZHI]: devices.filter((item) => item.type === DeviceType.XIAOZHI).length,
      [DeviceType.OTHER]: devices.filter((item) => item.type === DeviceType.OTHER).length,
    },
  };
}

class DeviceService {
  private fallbackDevices: Device[] = FALLBACK_DEVICES.map((item) => ({ ...item }));
  private fallbackMessages: DeviceMessage[] = FALLBACK_MESSAGES.map((item) => ({ ...item }));

  private async withFallback<T>(
    apiTask: () => Promise<T>,
    fallbackTask: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await apiTask();
    } catch (error) {
      if (IS_DEV) {
        return fallbackTask();
      }
      throw error;
    }
  }

  async registerDevice(payload: DeviceWritePayload): Promise<Device> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${DEVICE_ENDPOINT}/register`, payload);
        return normalizeDevice(unwrapData<DeviceApiPayload>(response));
      },
      () => {
        const now = new Date();
        const index = this.fallbackDevices.findIndex((item) => item.deviceId === payload.deviceId);

        if (index >= 0) {
          const updated: Device = {
            ...this.fallbackDevices[index],
            ...payload,
            status: DeviceStatus.ONLINE,
            updatedAt: now,
          };
          this.fallbackDevices[index] = updated;
          return { ...updated };
        }

        const created: Device = {
          id: createId("device"),
          deviceId: payload.deviceId,
          type: payload.type,
          name: payload.name,
          description: payload.description,
          status: DeviceStatus.ONLINE,
          ipAddress: payload.ipAddress,
          macAddress: payload.macAddress,
          metadata: payload.metadata || {},
          userId: payload.userId,
          createdAt: now,
          updatedAt: now,
        };

        this.fallbackDevices.push(created);
        return { ...created };
      },
    );
  }

  async getDevices(filter?: DeviceFilter): Promise<Device[]> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(DEVICE_ENDPOINT, {
          params: {
            type: filter?.type,
            status: filter?.status,
            keyword: filter?.keyword,
          },
        });
        const data = unwrapData<unknown>(response);
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] }).items)
            ? ((data as { items: unknown[] }).items ?? [])
            : [];
        return list.map((item) => normalizeDevice(item as DeviceApiPayload));
      },
      () => {
        const keyword = filter?.keyword?.trim().toLowerCase();
        return this.fallbackDevices
          .filter((item) => {
            if (filter?.type && item.type !== filter.type) {
              return false;
            }
            if (filter?.status && item.status !== filter.status) {
              return false;
            }
            if (keyword) {
              const haystack = `${item.name} ${item.description || ""} ${item.deviceId}`.toLowerCase();
              return haystack.includes(keyword);
            }
            return true;
          })
          .map((item) => ({ ...item }));
      },
    );
  }

  async getDevice(deviceId: string): Promise<Device | null> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DEVICE_ENDPOINT}/${deviceId}`);
        return normalizeDevice(unwrapData<DeviceApiPayload>(response));
      },
      () => {
        const target = this.fallbackDevices.find((item) => item.deviceId === deviceId);
        return target ? { ...target } : null;
      },
    );
  }

  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device | null> {
    return this.withFallback(
      async () => {
        const response = await apiClient.put<unknown>(`${DEVICE_ENDPOINT}/${deviceId}/status`, {
          status,
        });
        return normalizeDevice(unwrapData<DeviceApiPayload>(response));
      },
      () => {
        const index = this.fallbackDevices.findIndex((item) => item.deviceId === deviceId);
        if (index < 0) {
          return null;
        }
        this.fallbackDevices[index] = {
          ...this.fallbackDevices[index],
          status,
          updatedAt: new Date(),
        };
        return { ...this.fallbackDevices[index] };
      },
    );
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    return this.withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(`${DEVICE_ENDPOINT}/${deviceId}`);
        const data = unwrapData<unknown>(response);
        if (typeof data === "boolean") {
          return data;
        }
        if (data && typeof data === "object" && "success" in data) {
          return Boolean((data as { success: unknown }).success);
        }
        return true;
      },
      () => {
        const previousLength = this.fallbackDevices.length;
        this.fallbackDevices = this.fallbackDevices.filter((item) => item.deviceId !== deviceId);
        this.fallbackMessages = this.fallbackMessages.filter((item) => item.deviceId !== deviceId);
        return this.fallbackDevices.length < previousLength;
      },
    );
  }

  async sendMessageToDevice(deviceId: string, message: DeviceMessageWritePayload): Promise<DeviceMessage> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(
          `${DEVICE_ENDPOINT}/${deviceId}/messages`,
          message,
        );
        return normalizeMessage(unwrapData<DeviceMessageApiPayload>(response));
      },
      () => {
        const target = this.fallbackDevices.find((item) => item.deviceId === deviceId);
        if (!target) {
          throw new Error("Device not found");
        }

        const record: DeviceMessage = {
          id: createId("message"),
          deviceId,
          type: message.type,
          direction: DeviceMessageDirection.TO_DEVICE,
          payload: message.payload ?? {},
          topic: message.topic,
          processed: false,
          createdAt: new Date(),
        };

        this.fallbackMessages.unshift(record);

        setTimeout(() => {
          const index = this.fallbackMessages.findIndex((item) => item.id === record.id);
          if (index >= 0) {
            this.fallbackMessages[index] = {
              ...this.fallbackMessages[index],
              processed: true,
            };
          }
        }, 300);

        return { ...record };
      },
    );
  }

  async getDeviceMessages(deviceId: string, limit: number = 50, before?: Date): Promise<DeviceMessage[]> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DEVICE_ENDPOINT}/${deviceId}/messages`, {
          params: {
            limit,
            before: before?.toISOString(),
          },
        });
        const data = unwrapData<unknown>(response);
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] }).items)
            ? ((data as { items: unknown[] }).items ?? [])
            : [];
        return list
          .map((item) => normalizeMessage(item as DeviceMessageApiPayload))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
      },
      () => {
        return this.fallbackMessages
          .filter((item) => item.deviceId === deviceId)
          .filter((item) => (before ? item.createdAt.getTime() < before.getTime() : true))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit)
          .map((item) => ({ ...item }));
      },
    );
  }

  async controlDevice(deviceId: string, command: DeviceCommand): Promise<boolean> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${DEVICE_ENDPOINT}/${deviceId}/control`, command);
        const data = unwrapData<unknown>(response);
        if (typeof data === "boolean") {
          return data;
        }
        if (data && typeof data === "object" && "success" in data) {
          return Boolean((data as { success: unknown }).success);
        }
        return true;
      },
      async () => {
        await this.sendMessageToDevice(deviceId, {
          type: DeviceMessageType.COMMAND,
          payload: command,
          topic: "control",
        });
        return true;
      },
    );
  }

  async getDeviceStats(): Promise<DeviceStats> {
    return this.withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${DEVICE_ENDPOINT}/stats`);
        const data = unwrapData<unknown>(response);
        if (data && typeof data === "object") {
          const stats = data as Partial<DeviceStats>;
          return {
            total: Number(stats.total ?? 0),
            online: Number(stats.online ?? 0),
            offline: Number(stats.offline ?? 0),
            byType: {
              [DeviceType.XIAOZHI]: Number(stats.byType?.[DeviceType.XIAOZHI] ?? 0),
              [DeviceType.OTHER]: Number(stats.byType?.[DeviceType.OTHER] ?? 0),
            },
          };
        }
        return toDeviceStats(this.fallbackDevices);
      },
      () => toDeviceStats(this.fallbackDevices),
    );
  }
}

export const deviceService = new DeviceService();
export default deviceService;
