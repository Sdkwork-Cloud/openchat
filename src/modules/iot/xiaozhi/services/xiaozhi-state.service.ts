/**
 * 小智设备状态服务
 * 负责管理设备的状态和会话信息
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DeviceConnection, DeviceState, ConnectionState, TransportType, XiaoZhiProtocolVersion, BinaryProtocolVersion } from '../xiaozhi.types';
import { EventBusService, EventTypeConstants, EventPriority } from '../../../../common/events/event-bus.service';
import * as crypto from 'crypto';

/**
 * 心跳配置接口
 */
interface HeartbeatConfig {
  interval: number; // 心跳间隔（毫秒）
  timeout: number; // 超时时间（毫秒）
  maxRetries: number; // 最大重试次数
  retryInterval: number; // 重试间隔（毫秒）
}

@Injectable()
export class XiaoZhiStateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaoZhiStateService.name);
  private connections: Map<string, DeviceConnection> = new Map();
  private heartbeatConfig: HeartbeatConfig;
  private heartbeatInterval: NodeJS.Timeout;
  private reconnectAttempts: Map<string, number> = new Map();
  private defaultProtocolVersion: XiaoZhiProtocolVersion = XiaoZhiProtocolVersion.V3;
  private defaultBinaryProtocolVersion: BinaryProtocolVersion = BinaryProtocolVersion.V1;

  constructor(private eventBusService: EventBusService) {
    this.heartbeatConfig = {
      interval: 30000, // 30秒心跳间隔
      timeout: 60000, // 60秒超时
      maxRetries: 5, // 最大重试5次
      retryInterval: 5000, // 5秒重试间隔
    };
  }

  async onModuleInit() {
    this.startHeartbeatMonitor();
    this.logger.log('State service initialized with heartbeat monitoring');
  }

  async onModuleDestroy() {
    this.stopHeartbeatMonitor();
    await this.cleanup();
    this.logger.log('State service destroyed');
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
      this.cleanupInactiveConnections();
    }, this.heartbeatConfig.interval);
    this.logger.log('Started heartbeat monitor');
  }

  /**
   * 停止心跳监控
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.logger.log('Stopped heartbeat monitor');
  }

  /**
   * 检查心跳
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    
    for (const [deviceId, connection] of this.connections.entries()) {
      try {
        // 检查最后活动时间
        if (now - connection.lastActivity > this.heartbeatConfig.timeout) {
          this.logger.warn(`Device ${deviceId} heartbeat timeout, last activity: ${new Date(connection.lastActivity).toISOString()}`);
          this.handleHeartbeatTimeout(deviceId, connection);
        } else {
          // 发送心跳请求
          this.sendHeartbeatRequest(deviceId, connection);
        }
      } catch (error) {
        this.logger.error(`Error checking heartbeat for device ${deviceId}:`, error);
      }
    }
  }

  /**
   * 发送心跳请求
   */
  private sendHeartbeatRequest(deviceId: string, connection: DeviceConnection): void {
    try {
      const heartbeatMessage = {
        type: 'heartbeat',
        session_id: connection.sessionId,
        timestamp: Date.now(),
      };

      // 根据传输类型发送心跳
      if (connection.websocket && connection.websocket.readyState === connection.websocket.OPEN) {
        connection.websocket.send(JSON.stringify(heartbeatMessage));
      } else if (connection.mqttClient && connection.mqttClient.connected && connection.mqttTopics) {
        connection.mqttClient.publish(connection.mqttTopics.publish, JSON.stringify(heartbeatMessage));
      }

      this.logger.debug(`Sent heartbeat request to device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to send heartbeat to device ${deviceId}:`, error);
    }
  }

  /**
   * 处理心跳超时
   */
  private handleHeartbeatTimeout(deviceId: string, connection: DeviceConnection): void {
    // 更新连接状态
    this.updateConnectionState(deviceId, ConnectionState.DISCONNECTED);
    this.updateDeviceState(deviceId, DeviceState.IDLE);

    // 尝试重连
    this.attemptReconnect(deviceId, connection);

    // 发布心跳超时事件
    this.eventBusService.publish(
      EventTypeConstants.CUSTOM_EVENT,
      {
        deviceId,
        lastActivity: connection.lastActivity,
        transport: connection.transport,
        type: 'device_heartbeat_timeout'
      },
      {
        priority: EventPriority.HIGH,
        source: 'XiaoZhiStateService',
      }
    );
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(deviceId: string, connection: DeviceConnection): Promise<void> {
    const attempts = this.reconnectAttempts.get(deviceId) || 0;

    if (attempts >= this.heartbeatConfig.maxRetries) {
      this.logger.warn(`Max reconnect attempts reached for device ${deviceId}, removing connection`);
      this.reconnectAttempts.delete(deviceId);
      this.removeConnection(deviceId);
      return;
    }

    this.reconnectAttempts.set(deviceId, attempts + 1);
    this.logger.log(`Attempting to reconnect to device ${deviceId}, attempt ${attempts + 1}/${this.heartbeatConfig.maxRetries}`);

    // 这里可以实现具体的重连逻辑
    // 例如，对于MQTT连接，可以尝试重新连接
    if (connection.mqttClient) {
      try {
        if (!connection.mqttClient.connected) {
          connection.mqttClient.reconnect();
          this.logger.log(`Reconnecting MQTT client for device ${deviceId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to reconnect MQTT client for device ${deviceId}:`, error);
      }
    }

    // 发布重连尝试事件
    this.eventBusService.publish(
      EventTypeConstants.CUSTOM_EVENT,
      {
        deviceId,
        attempt: attempts + 1,
        maxAttempts: this.heartbeatConfig.maxRetries,
        transport: connection.transport,
        type: 'device_reconnect_attempt'
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiStateService',
      }
    );
  }

  /**
   * 添加设备连接
   */
  addConnection(deviceId: string, connection: DeviceConnection): void {
    try {
      // 移除旧连接
      if (this.connections.has(deviceId)) {
        this.logger.warn(`Replacing existing connection for device: ${deviceId}`);
        this.removeConnection(deviceId);
      }

      this.connections.set(deviceId, connection);
      this.reconnectAttempts.delete(deviceId); // 重置重连尝试
      
      this.logger.log(`Added connection for device: ${deviceId}, transport: ${connection.transport}`);

      // 发布连接添加事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          transport: connection.transport,
          sessionId: connection.sessionId,
          type: 'device_connection_added'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiStateService',
        }
      );
    } catch (error) {
      this.logger.error(`Failed to add connection for device ${deviceId}:`, error);
    }
  }

  /**
   * 获取设备连接
   */
  getConnection(deviceId: string): DeviceConnection | null {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        this.logger.debug(`Connection not found for device: ${deviceId}`);
        return null;
      }
      return connection;
    } catch (error) {
      this.logger.error(`Failed to get connection for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * 获取所有设备连接
   */
  getAllConnections(): Map<string, DeviceConnection> {
    return this.connections;
  }

  /**
   * 移除设备连接
   */
  removeConnection(deviceId: string): void {
    try {
      if (this.connections.has(deviceId)) {
        const connection = this.connections.get(deviceId);
        this.connections.delete(deviceId);
        this.reconnectAttempts.delete(deviceId);
        
        this.logger.log(`Removed connection for device: ${deviceId}`);

        // 清理连接资源
        this.cleanupConnection(connection);

        // 发布连接移除事件
        this.eventBusService.publish(
          EventTypeConstants.CUSTOM_EVENT,
          {
            deviceId,
            transport: connection?.transport,
            type: 'device_connection_removed'
          },
          {
            priority: EventPriority.MEDIUM,
            source: 'XiaoZhiStateService',
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to remove connection for device ${deviceId}:`, error);
    }
  }

  /**
   * 清理连接资源
   */
  private cleanupConnection(connection?: DeviceConnection): void {
    try {
      if (connection) {
        // 关闭WebSocket连接
        if (connection.websocket && connection.websocket.readyState === connection.websocket.OPEN) {
          try {
            connection.websocket.close();
          } catch (error) {
            this.logger.error('Failed to close WebSocket connection:', error);
          }
        }

        // 关闭MQTT连接
        if (connection.mqttClient && connection.mqttClient.connected) {
          try {
            connection.mqttClient.end();
          } catch (error) {
            this.logger.error('Failed to close MQTT connection:', error);
          }
        }

        // 关闭UDP socket
        if (connection.udpSocket) {
          try {
            connection.udpSocket.close();
          } catch (error) {
            this.logger.error('Failed to close UDP socket:', error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup connection:', error);
    }
  }

  /**
   * 更新设备状态
   */
  updateDeviceState(deviceId: string, state: DeviceState): void {
    try {
      const connection = this.connections.get(deviceId);
      if (connection) {
        const oldState = connection.deviceState;
        connection.deviceState = state;
        connection.lastActivity = Date.now();
        
        this.logger.log(`Updated device state for ${deviceId}: ${oldState} -> ${state}`);
        
        // 发布状态更新事件
        this.eventBusService.publish(
          EventTypeConstants.CUSTOM_EVENT,
          {
            deviceId,
            oldState,
            newState: state,
            sessionId: connection.sessionId,
            type: 'device_state_changed'
          },
          {
            priority: EventPriority.MEDIUM,
            source: 'XiaoZhiStateService',
          }
        );
      } else {
        this.logger.warn(`Connection not found for device ${deviceId} when updating state`);
      }
    } catch (error) {
      this.logger.error(`Failed to update device state for ${deviceId}:`, error);
    }
  }

  /**
   * 更新连接状态
   */
  updateConnectionState(deviceId: string, state: ConnectionState): void {
    try {
      const connection = this.connections.get(deviceId);
      if (connection) {
        const oldState = connection.connectionState;
        connection.connectionState = state;
        connection.lastActivity = Date.now();
        
        this.logger.log(`Updated connection state for ${deviceId}: ${oldState} -> ${state}`);
        
        // 发布状态更新事件
        this.eventBusService.publish(
          EventTypeConstants.CUSTOM_EVENT,
          {
            deviceId,
            oldState,
            newState: state,
            transport: connection.transport,
            type: 'connection_state_changed'
          },
          {
            priority: EventPriority.MEDIUM,
            source: 'XiaoZhiStateService',
          }
        );
      } else {
        this.logger.warn(`Connection not found for device ${deviceId} when updating connection state`);
      }
    } catch (error) {
      this.logger.error(`Failed to update connection state for ${deviceId}:`, error);
    }
  }

  /**
   * 更新设备活动时间
   */
  updateActivity(deviceId: string): void {
    try {
      const connection = this.connections.get(deviceId);
      if (connection) {
        connection.lastActivity = Date.now();
        this.reconnectAttempts.delete(deviceId); // 重置重连尝试
      } else {
        this.logger.warn(`Connection not found for device ${deviceId} when updating activity`);
      }
    } catch (error) {
      this.logger.error(`Failed to update activity for device ${deviceId}:`, error);
    }
  }

  /**
   * 处理心跳响应
   */
  handleHeartbeatResponse(deviceId: string): void {
    try {
      this.updateActivity(deviceId);
      this.logger.debug(`Received heartbeat response from device ${deviceId}`);

      // 更新连接状态
      const connection = this.connections.get(deviceId);
      if (connection && connection.connectionState === ConnectionState.DISCONNECTED) {
        // 根据传输类型更新连接状态
        let newConnectionState: ConnectionState;
        switch (connection.transport) {
          case 'websocket':
            newConnectionState = ConnectionState.CHANNEL_OPENED;
            break;
          case 'mqtt':
            newConnectionState = ConnectionState.MQTT_CONNECTED;
            break;
          case 'udp':
            newConnectionState = ConnectionState.UDP_CONNECTED;
            break;
          default:
            newConnectionState = ConnectionState.MQTT_CONNECTED;
        }
        this.updateConnectionState(deviceId, newConnectionState);
        this.updateDeviceState(deviceId, DeviceState.IDLE);
      }

      // 发布心跳响应事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          timestamp: Date.now(),
          transport: connection?.transport,
          type: 'device_heartbeat_received'
        },
        {
          priority: EventPriority.LOW,
          source: 'XiaoZhiStateService',
        }
      );
    } catch (error) {
      this.logger.error(`Failed to handle heartbeat response for device ${deviceId}:`, error);
    }
  }

  /**
   * 检查连接是否活跃
   */
  isConnectionActive(deviceId: string): boolean {
    try {
      const connection = this.connections.get(deviceId);
      if (!connection) {
        return false;
      }

      return this.isConnectionActiveInternal(connection);
    } catch (error) {
      this.logger.error(`Failed to check connection activity for device ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * 清理不活跃的连接
   */
  cleanupInactiveConnections(): void {
    try {
      const inactiveDevices: string[] = [];
      
      for (const [deviceId, connection] of this.connections.entries()) {
        if (!this.isConnectionActiveInternal(connection)) {
          inactiveDevices.push(deviceId);
        }
      }

      for (const deviceId of inactiveDevices) {
        this.logger.log(`Removing inactive connection for device ${deviceId}`);
        this.removeConnection(deviceId);
        this.eventBusService.publish(
          EventTypeConstants.CUSTOM_EVENT,
          {
            deviceId,
            reason: 'Connection inactive',
            type: 'device_disconnected'
          },
          {
            priority: EventPriority.MEDIUM,
            source: 'XiaoZhiStateService',
          }
        );
      }

      if (inactiveDevices.length > 0) {
        this.logger.log(`Cleaned up ${inactiveDevices.length} inactive connections`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup inactive connections:', error);
    }
  }

  /**
   * 检查连接是否活跃（内部方法）
   */
  private isConnectionActiveInternal(connection: DeviceConnection): boolean {
    try {
      // 检查最后活动时间
      const now = Date.now();
      const lastActivity = connection.lastActivity;
      const timeout = this.heartbeatConfig.timeout;

      if (now - lastActivity > timeout) {
        return false;
      }

      // 检查WebSocket连接
      if (connection.websocket) {
        return connection.websocket.readyState === connection.websocket.OPEN;
      }

      // 检查MQTT连接
      if (connection.mqttClient) {
        return connection.mqttClient.connected;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check connection activity internally:', error);
      return false;
    }
  }

  /**
   * 生成会话ID
   */
  generateSessionId(): string {
    try {
      return crypto.randomUUID();
    } catch (error) {
      this.logger.error('Failed to generate session ID:', error);
      // 备用方案
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * 生成客户端ID
   */
  generateClientId(): string {
    try {
      return `xiaozhi-${crypto.randomUUID()}`;
    } catch (error) {
      this.logger.error('Failed to generate client ID:', error);
      // 备用方案
      return `xiaozhi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    total: number;
    active: number;
    inactive: number;
    byTransport: { [key: string]: number };
    byState: { [key: string]: number };
  } {
    try {
      const total = this.connections.size;
      const active = Array.from(this.connections.values()).filter(conn => this.isConnectionActiveInternal(conn)).length;
      const inactive = total - active;
      
      // 按传输类型统计
      const byTransport: { [key: string]: number } = {};
      // 按设备状态统计
      const byState: { [key: string]: number } = {};

      for (const connection of this.connections.values()) {
        // 按传输类型
        const transport = connection.transport;
        byTransport[transport] = (byTransport[transport] || 0) + 1;

        // 按设备状态
        const state = connection.deviceState;
        byState[state] = (byState[state] || 0) + 1;
      }

      return {
        total,
        active,
        inactive,
        byTransport,
        byState,
      };
    } catch (error) {
      this.logger.error('Failed to get connection stats:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byTransport: {},
        byState: {},
      };
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    try {
      const deviceIds = Array.from(this.connections.keys());
      for (const deviceId of deviceIds) {
        this.removeConnection(deviceId);
      }
      this.reconnectAttempts.clear();
      this.logger.log('Cleanup completed, all connections removed');
    } catch (error) {
      this.logger.error('Failed to cleanup:', error);
    }
  }
}
