export enum DeviceType {
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  GATEWAY = 'gateway',
  CAMERA = 'camera',
  SPEAKER = 'speaker',
  LIGHT = 'light',
  THERMOSTAT = 'thermostat',
  LOCK = 'lock',
  OTHER = 'other',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ERROR = 'error',
}

export enum DeviceMessageType {
  DATA = 'data',
  COMMAND = 'command',
  STATUS = 'status',
  ALERT = 'alert',
  EVENT = 'event',
}

export interface Device {
  id: string;
  deviceId: string;
  userId: string;
  type: DeviceType;
  name: string;
  description?: string;
  ipAddress?: string;
  macAddress?: string;
  metadata?: Record<string, any>;
  status: DeviceStatus;
  lastSeenAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DeviceMessage {
  id: string;
  deviceId: string;
  type: DeviceMessageType;
  payload: any;
  topic?: string;
  direction: 'in' | 'out';
  timestamp: number;
}

export interface RegisterDeviceParams {
  deviceId: string;
  type: DeviceType;
  name: string;
  description?: string;
  ipAddress?: string;
  macAddress?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export interface UpdateDeviceStatusParams {
  status: DeviceStatus;
}

export interface SendDeviceMessageParams {
  type: DeviceMessageType;
  payload: any;
  topic?: string;
}

export interface ControlDeviceParams {
  action: string;
  params?: Record<string, any>;
}

export interface DeviceListQuery {
  userId?: string;
  page?: number;
  limit?: number;
}

export interface DeviceMessageQuery {
  limit?: number;
  before?: string;
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
  page: number;
  limit: number;
}
