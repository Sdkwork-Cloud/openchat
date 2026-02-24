/**
 * 小智设备能力管理服务
 * 负责设备能力的发现、存储和管理
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventBusService, EventTypeConstants, EventPriority } from '../../../../common/events/event-bus.service';
import { DeviceConnection } from '../xiaozhi.types';

/**
 * 设备能力接口
 */
export interface DeviceCapability {
  /**
   * 能力名称
   */
  name: string;
  /**
   * 能力描述
   */
  description: string;
  /**
   * 能力版本
   */
  version: string;
  /**
   * 能力参数
   */
  parameters?: Record<string, any>;
  /**
   * 是否启用
   */
  enabled: boolean;
}

/**
 * 设备工具接口
 */
export interface DeviceTool {
  /**
   * 工具名称
   */
  name: string;
  /**
   * 工具描述
   */
  description: string;
  /**
   * 输入参数 schema
   */
  inputSchema?: Record<string, any>;
  /**
   * 输出参数 schema
   */
  outputSchema?: Record<string, any>;
  /**
   * 是否需要认证
   */
  requiresAuth?: boolean;
}

/**
 * 设备能力信息接口
 */
export interface DeviceCapabilityInfo {
  /**
   * 设备ID
   */
  deviceId: string;
  /**
   * 设备名称
   */
  deviceName?: string;
  /**
   * 设备类型
   */
  deviceType?: string;
  /**
   * 固件版本
   */
  firmwareVersion?: string;
  /**
   * 硬件版本
   */
  hardwareVersion?: string;
  /**
   * 支持的能力列表
   */
  capabilities: DeviceCapability[];
  /**
   * 支持的工具列表
   */
  tools: DeviceTool[];
  /**
   * 发现时间
   */
  discoveredAt: number;
  /**
   * 最后更新时间
   */
  lastUpdated: number;
}

@Injectable()
export class XiaoZhiCapabilityService {
  private readonly logger = new Logger(XiaoZhiCapabilityService.name);
  private readonly deviceCapabilities = new Map<string, DeviceCapabilityInfo>();

  constructor(private eventBusService: EventBusService) {
    this.initializeEventListeners();
  }

  /**
   * 初始化事件监听器
   */
  private initializeEventListeners(): void {
    // 监听设备连接事件
    this.eventBusService.on(
      EventTypeConstants.CUSTOM_EVENT,
      (event: any) => {
        if (event.payload.type === 'device_connected') {
          this.handleDeviceConnected(event.payload.deviceId);
        }
      },
      { priority: EventPriority.MEDIUM }
    );

    // 监听设备断开事件
    this.eventBusService.on(
      EventTypeConstants.CUSTOM_EVENT,
      (event: any) => {
        if (event.payload.type === 'device_disconnected') {
          this.handleDeviceDisconnected(event.payload.deviceId);
        }
      },
      { priority: EventPriority.MEDIUM }
    );

    // 监听设备消息事件（hello 消息）
    this.eventBusService.on(
      EventTypeConstants.CUSTOM_EVENT,
      (event: any) => {
        if (event.payload.messageType === 'hello') {
          this.handleDeviceHelloMessage(event.payload.deviceId, event.payload.payload);
        }
      },
      { priority: EventPriority.MEDIUM }
    );

    // 监听MCP工具发现事件
    this.eventBusService.on(
      EventTypeConstants.CUSTOM_EVENT,
      (event: any) => {
        if (event.payload.type === 'mcp_tools_discovered') {
          this.handleMcpToolsDiscovered(event.payload.deviceId, event.payload.tools);
        }
      },
      { priority: EventPriority.MEDIUM }
    );
  }

  /**
   * 处理设备连接事件
   */
  private handleDeviceConnected(deviceId: string): void {
    this.logger.log(`Device connected: ${deviceId}`);
    
    // 初始化设备能力信息
    if (!this.deviceCapabilities.has(deviceId)) {
      const capabilityInfo: DeviceCapabilityInfo = {
        deviceId,
        capabilities: [],
        tools: [],
        discoveredAt: Date.now(),
        lastUpdated: Date.now(),
      };
      this.deviceCapabilities.set(deviceId, capabilityInfo);
    }
  }

  /**
   * 处理设备断开事件
   */
  private handleDeviceDisconnected(deviceId: string): void {
    this.logger.log(`Device disconnected: ${deviceId}`);
    // 可以选择保留设备能力信息，以便设备重连时使用
    // 或者在设备长时间断开后清理
  }

  /**
   * 处理设备hello消息
   */
  private handleDeviceHelloMessage(deviceId: string, helloMessage: any): void {
    this.logger.log(`Processing hello message from device: ${deviceId}`);
    
    try {
      // 从hello消息中提取设备能力信息
      const capabilities: DeviceCapability[] = [];
      
      // 处理features字段
      if (helloMessage.features) {
        if (helloMessage.features.mcp) {
          capabilities.push({
            name: 'mcp',
            description: 'Model Context Protocol support',
            version: '1.0',
            enabled: true,
          });
        }
        
        // 可以添加其他能力的处理
      }
      
      // 处理audio_params字段
      if (helloMessage.audio_params) {
        capabilities.push({
          name: 'audio',
          description: 'Audio processing capabilities',
          version: '1.0',
          parameters: helloMessage.audio_params,
          enabled: true,
        });
      }
      
      // 更新设备能力信息
      this.updateDeviceCapabilities(deviceId, capabilities);
      
      // 发布设备能力发现事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          capabilities,
          message: helloMessage,
          type: 'device_capabilities_discovered'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiCapabilityService',
        }
      );
      
    } catch (error) {
      this.logger.error(`Failed to process device hello message:`, error);
    }
  }

  /**
   * 处理MCP工具发现事件
   */
  private handleMcpToolsDiscovered(deviceId: string, tools: DeviceTool[]): void {
    this.logger.log(`Discovered ${tools.length} tools for device: ${deviceId}`);
    
    try {
      // 更新设备工具信息
      const capabilityInfo = this.deviceCapabilities.get(deviceId);
      if (capabilityInfo) {
        capabilityInfo.tools = tools;
        capabilityInfo.lastUpdated = Date.now();
        this.deviceCapabilities.set(deviceId, capabilityInfo);
      }
    } catch (error) {
      this.logger.error(`Failed to process MCP tools discovery:`, error);
    }
  }

  /**
   * 更新设备能力
   */
  updateDeviceCapabilities(deviceId: string, capabilities: DeviceCapability[]): void {
    const existingInfo = this.deviceCapabilities.get(deviceId);
    
    if (existingInfo) {
      // 合并现有能力和新能力
      const updatedCapabilities = this.mergeCapabilities(existingInfo.capabilities, capabilities);
      existingInfo.capabilities = updatedCapabilities;
      existingInfo.lastUpdated = Date.now();
      this.deviceCapabilities.set(deviceId, existingInfo);
    } else {
      // 创建新的能力信息
      const capabilityInfo: DeviceCapabilityInfo = {
        deviceId,
        capabilities,
        tools: [],
        discoveredAt: Date.now(),
        lastUpdated: Date.now(),
      };
      this.deviceCapabilities.set(deviceId, capabilityInfo);
    }
    
    this.logger.log(`Updated capabilities for device ${deviceId}: ${capabilities.length} capabilities`);
  }

  /**
   * 合并设备能力
   */
  private mergeCapabilities(existing: DeviceCapability[], newCapabilities: DeviceCapability[]): DeviceCapability[] {
    const merged = [...existing];
    
    for (const newCap of newCapabilities) {
      const existingIndex = merged.findIndex(cap => cap.name === newCap.name);
      if (existingIndex >= 0) {
        // 更新现有能力
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...newCap,
        };
      } else {
        // 添加新能力
        merged.push(newCap);
      }
    }
    
    return merged;
  }

  /**
   * 获取设备能力信息
   */
  getDeviceCapabilities(deviceId: string): DeviceCapabilityInfo | null {
    return this.deviceCapabilities.get(deviceId) || null;
  }

  /**
   * 获取所有设备能力信息
   */
  getAllDeviceCapabilities(): Map<string, DeviceCapabilityInfo> {
    return this.deviceCapabilities;
  }

  /**
   * 检查设备是否支持特定能力
   */
  hasCapability(deviceId: string, capabilityName: string): boolean {
    const capabilities = this.deviceCapabilities.get(deviceId);
    if (!capabilities) {
      return false;
    }
    return capabilities.capabilities.some(cap => cap.name === capabilityName && cap.enabled);
  }

  /**
   * 检查设备是否支持特定工具
   */
  hasTool(deviceId: string, toolName: string): boolean {
    const capabilities = this.deviceCapabilities.get(deviceId);
    if (!capabilities) {
      return false;
    }
    return capabilities.tools.some(tool => tool.name === toolName);
  }

  /**
   * 获取设备支持的工具列表
   */
  getDeviceTools(deviceId: string): DeviceTool[] {
    const capabilities = this.deviceCapabilities.get(deviceId);
    return capabilities ? capabilities.tools : [];
  }

  /**
   * 获取设备支持的能力列表
   */
  getDeviceCapabilityList(deviceId: string): string[] {
    const capabilities = this.deviceCapabilities.get(deviceId);
    return capabilities ? capabilities.capabilities.filter(cap => cap.enabled).map(cap => cap.name) : [];
  }

  /**
   * 更新设备信息
   */
  updateDeviceInfo(deviceId: string, info: Partial<DeviceCapabilityInfo>): void {
    const existingInfo = this.deviceCapabilities.get(deviceId);
    if (existingInfo) {
      const updatedInfo = {
        ...existingInfo,
        ...info,
        lastUpdated: Date.now(),
      };
      this.deviceCapabilities.set(deviceId, updatedInfo);
      this.logger.log(`Updated device info for ${deviceId}`);
    }
  }

  /**
   * 移除设备能力信息
   */
  removeDeviceCapabilities(deviceId: string): void {
    this.deviceCapabilities.delete(deviceId);
    this.logger.log(`Removed capabilities for device ${deviceId}`);
  }

  /**
   * 清理过期的设备能力信息
   */
  cleanupExpiredCapabilities(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [deviceId, info] of this.deviceCapabilities.entries()) {
      if (now - info.lastUpdated > maxAge) {
        this.deviceCapabilities.delete(deviceId);
        removedCount++;
        this.logger.debug(`Removed expired capabilities for device ${deviceId}`);
      }
    }
    
    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} expired device capabilities`);
    }
    
    return removedCount;
  }

  /**
   * 获取设备能力统计信息
   */
  getCapabilityStats(): {
    totalDevices: number;
    totalCapabilities: number;
    totalTools: number;
    capabilityDistribution: Record<string, number>;
  } {
    const stats = {
      totalDevices: this.deviceCapabilities.size,
      totalCapabilities: 0,
      totalTools: 0,
      capabilityDistribution: {} as Record<string, number>,
    };
    
    for (const info of this.deviceCapabilities.values()) {
      stats.totalCapabilities += info.capabilities.length;
      stats.totalTools += info.tools.length;
      
      // 统计能力分布
      for (const capability of info.capabilities) {
        if (stats.capabilityDistribution[capability.name]) {
          stats.capabilityDistribution[capability.name]++;
        } else {
          stats.capabilityDistribution[capability.name] = 1;
        }
      }
    }
    
    return stats;
  }
}
