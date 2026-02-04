/**
 * 设备管理服务
 *
 * 职责：
 * 1. 管理设备数据
 * 2. 提供设备控制功能
 * 3. 处理设备消息
 */

import {
  DeviceType,
  DeviceStatus,
  DeviceMessageType,
  DeviceMessageDirection
} from '../entities/device.entity';

import type {
  Device,
  DeviceMessage,
  DeviceCommand,
  DeviceFilter
} from '../entities/device.entity';

/**
 * 模拟设备数据
 */
const mockDevices: Device[] = [
  {
    id: '1',
    deviceId: 'xiaozhi-001',
    type: DeviceType.XIAOZHI,
    name: '开源小智客厅设备',
    description: '客厅里的智能语音助手',
    status: DeviceStatus.ONLINE,
    ipAddress: '192.168.1.100',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    metadata: {
      firmwareVersion: '1.0.0',
      hardwareVersion: 'ESP32',
      capabilities: ['audio', 'stt', 'tts', 'llm', 'mcp']
    },
    userId: 'current-user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    deviceId: 'xiaozhi-002',
    type: DeviceType.XIAOZHI,
    name: '开源小智卧室设备',
    description: '卧室里的智能语音助手',
    status: DeviceStatus.OFFLINE,
    ipAddress: '192.168.1.101',
    macAddress: 'AA:BB:CC:DD:EE:GG',
    metadata: {
      firmwareVersion: '1.0.0',
      hardwareVersion: 'ESP32',
      capabilities: ['audio', 'stt', 'tts', 'llm']
    },
    userId: 'current-user',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    deviceId: 'other-001',
    type: DeviceType.OTHER,
    name: '智能灯泡',
    description: '可调节亮度和色温的智能灯泡',
    status: DeviceStatus.ONLINE,
    ipAddress: '192.168.1.102',
    macAddress: 'AA:BB:CC:DD:EE:HH',
    metadata: {
      firmwareVersion: '2.0.0',
      hardwareVersion: 'ESP8266',
      capabilities: ['light', 'dimmer', 'color']
    },
    userId: 'current-user',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

/**
 * 设备消息历史
 */
const mockMessages: DeviceMessage[] = [
  {
    id: '1',
    deviceId: 'xiaozhi-001',
    type: DeviceMessageType.STATUS,
    direction: DeviceMessageDirection.FROM_DEVICE,
    payload: {
      status: 'online',
      battery: 85,
      signal: 4
    },
    topic: 'status',
    processed: true,
    createdAt: new Date('2024-01-01T10:00:00')
  },
  {
    id: '2',
    deviceId: 'xiaozhi-001',
    type: DeviceMessageType.COMMAND,
    direction: DeviceMessageDirection.TO_DEVICE,
    payload: {
      action: 'playMusic',
      params: {
        url: 'https://example.com/music.mp3'
      }
    },
    topic: 'control',
    processed: true,
    createdAt: new Date('2024-01-01T10:05:00')
  },
  {
    id: '3',
    deviceId: 'xiaozhi-002',
    type: DeviceMessageType.EVENT,
    direction: DeviceMessageDirection.FROM_DEVICE,
    payload: {
      event: 'wakeup',
      data: {
        phrase: '你好，小智'
      }
    },
    topic: 'event',
    processed: true,
    createdAt: new Date('2024-01-01T11:00:00')
  }
];

/**
 * 设备管理服务类
 */
export class DeviceService {
  private devices: Device[] = [...mockDevices];
  private messages: DeviceMessage[] = [...mockMessages];

  /**
   * 注册设备
   */
  async registerDevice(deviceData: {
    deviceId: string;
    type: DeviceType;
    name: string;
    description?: string;
    ipAddress?: string;
    macAddress?: string;
    metadata?: any;
    userId?: string;
  }): Promise<Device> {
    // 检查设备是否已存在
    let device = this.devices.find(d => d.deviceId === deviceData.deviceId);

    if (device) {
      // 更新设备信息
      device = {
        ...device,
        type: deviceData.type,
        name: deviceData.name,
        description: deviceData.description,
        ipAddress: deviceData.ipAddress,
        macAddress: deviceData.macAddress,
        metadata: deviceData.metadata,
        userId: deviceData.userId,
        status: DeviceStatus.ONLINE,
        updatedAt: new Date()
      };
      const index = this.devices.findIndex(d => d.deviceId === deviceData.deviceId);
      this.devices[index] = device;
    } else {
      // 创建新设备
      device = {
        id: `${this.devices.length + 1}`,
        deviceId: deviceData.deviceId,
        type: deviceData.type,
        name: deviceData.name,
        description: deviceData.description,
        status: DeviceStatus.ONLINE,
        ipAddress: deviceData.ipAddress,
        macAddress: deviceData.macAddress,
        metadata: deviceData.metadata,
        userId: deviceData.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.devices.push(device);
    }

    return device;
  }

  /**
   * 获取设备列表
   */
  async getDevices(filter?: DeviceFilter): Promise<Device[]> {
    let result = [...this.devices];

    if (filter) {
      // 按类型筛选
      if (filter.type) {
        result = result.filter(d => d.type === filter.type);
      }

      // 按状态筛选
      if (filter.status) {
        result = result.filter(d => d.status === filter.status);
      }

      // 按关键词搜索
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        result = result.filter(
          d => d.name.toLowerCase().includes(keyword) ||
               d.description?.toLowerCase().includes(keyword) ||
               d.deviceId.toLowerCase().includes(keyword)
        );
      }
    }

    return result;
  }

  /**
   * 获取单个设备
   */
  async getDevice(deviceId: string): Promise<Device | null> {
    const device = this.devices.find(d => d.deviceId === deviceId);
    return device || null;
  }

  /**
   * 更新设备状态
   */
  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device | null> {
    const device = this.devices.find(d => d.deviceId === deviceId);
    if (!device) return null;

    device.status = status;
    device.updatedAt = new Date();
    return device;
  }

  /**
   * 删除设备
   */
  async deleteDevice(deviceId: string): Promise<boolean> {
    const index = this.devices.findIndex(d => d.deviceId === deviceId);
    if (index === -1) return false;

    this.devices.splice(index, 1);
    return true;
  }

  /**
   * 发送消息到设备
   */
  async sendMessageToDevice(
    deviceId: string,
    message: {
      type: DeviceMessageType;
      payload: any;
      topic?: string;
    }
  ): Promise<DeviceMessage> {
    const device = this.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const newMessage: DeviceMessage = {
      id: `${this.messages.length + 1}`,
      deviceId,
      type: message.type,
      direction: DeviceMessageDirection.TO_DEVICE,
      payload: message.payload,
      topic: message.topic,
      processed: false,
      createdAt: new Date()
    };

    this.messages.push(newMessage);

    // 模拟消息处理
    setTimeout(() => {
      const index = this.messages.findIndex(m => m.id === newMessage.id);
      if (index !== -1) {
        this.messages[index].processed = true;
      }
    }, 1000);

    return newMessage;
  }

  /**
   * 获取设备消息历史
   */
  async getDeviceMessages(
    deviceId: string,
    limit: number = 50,
    before?: Date
  ): Promise<DeviceMessage[]> {
    let result = this.messages.filter(m => m.deviceId === deviceId);

    if (before) {
      result = result.filter(m => m.createdAt < before);
    }

    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return result.slice(0, limit);
  }

  /**
   * 控制设备
   */
  async controlDevice(
    deviceId: string,
    command: DeviceCommand
  ): Promise<boolean> {
    const device = this.devices.find(d => d.deviceId === deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // 创建控制消息
    const message = {
      type: DeviceMessageType.COMMAND,
      payload: command,
      topic: 'control'
    };

    // 发送控制消息
    await this.sendMessageToDevice(deviceId, message);
    return true;
  }

  /**
   * 获取设备统计信息
   */
  async getDeviceStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    byType: { [key in DeviceType]: number };
  }> {
    const total = this.devices.length;
    const online = this.devices.filter(d => d.status === DeviceStatus.ONLINE).length;
    const offline = this.devices.filter(d => d.status === DeviceStatus.OFFLINE).length;

    const byType = {
      [DeviceType.XIAOZHI]: this.devices.filter(d => d.type === DeviceType.XIAOZHI).length,
      [DeviceType.OTHER]: this.devices.filter(d => d.type === DeviceType.OTHER).length
    };

    return {
      total,
      online,
      offline,
      byType
    };
  }
}

// 导出单例
export const deviceService = new DeviceService();
