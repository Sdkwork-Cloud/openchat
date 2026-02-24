/**
 * 小智连接管理服务
 * 负责WebSocket和MQTT连接的管理
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import * as mqtt from 'mqtt';
import { TransportType, DeviceState, ConnectionState, DeviceConnection } from '../xiaozhi.types';
import { EventBusService, EventTypeConstants, EventPriority } from '../../../../common/events/event-bus.service';
import * as crypto from 'crypto';

/**
 * 连接池配置接口
 */
interface ConnectionPoolConfig {
  maxConnections: number;
  maxIdleTime: number;
  checkInterval: number;
}

/**
 * 连接池项接口
 */
interface ConnectionPoolItem {
  connection: DeviceConnection;
  deviceId: string;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
}

/**
 * 服务器负载信息接口
 */
interface ServerLoadInfo {
  serverId: string;
  cpuUsage: number;
  memoryUsage: number;
  connectionCount: number;
  timestamp: number;
}

@Injectable()
export class XiaoZhiConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaoZhiConnectionService.name);
  private readonly serverHost: string;
  private readonly websocketPort: number;
  private readonly mqttPort: number;
  private readonly udpPort: number;
  private readonly connectionPool: Map<string, ConnectionPoolItem> = new Map();
  private readonly websocketPool: Map<string, WebSocket> = new Map();
  private readonly mqttPool: Map<string, any> = new Map();
  private readonly serverLoad: Map<string, ServerLoadInfo> = new Map();
  private readonly poolConfig: ConnectionPoolConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private eventBusService: EventBusService
  ) {
    this.serverHost = this.configService.get<string>('XIAOZHI_SERVER_HOST') || '0.0.0.0';
    this.websocketPort = this.configService.get<number>('XIAOZHI_WEBSOCKET_PORT') || 8084;
    this.mqttPort = this.configService.get<number>('XIAOZHI_MQTT_PORT') || 1883;
    this.udpPort = this.configService.get<number>('XIAOZHI_UDP_PORT') || 8888;
    
    // 连接池配置
    this.poolConfig = {
      maxConnections: this.configService.get<number>('XIAOZHI_MAX_CONNECTIONS') || 1000,
      maxIdleTime: this.configService.get<number>('XIAOZHI_MAX_IDLE_TIME') || 300000, // 5分钟
      checkInterval: this.configService.get<number>('XIAOZHI_CHECK_INTERVAL') || 60000, // 1分钟
    };
  }

  async onModuleInit() {
    // 启动连接池清理定时器
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
      this.updateServerLoad();
    }, this.poolConfig.checkInterval);
    this.logger.log('Connection service initialized with connection pooling');
  }

  async onModuleDestroy() {
    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    // 清理所有连接
    this.cleanupAllConnections();
    this.logger.log('Connection service destroyed, all connections cleaned up');
  }

  /**
   * 处理WebSocket连接
   */
  handleWebSocketConnection(websocket: WebSocket, request: any, deviceId: string, sessionId: string): DeviceConnection {
    const clientId = request.headers['client-id'] || `xiaozhi-${this.generateClientId()}`;
    const protocolVersion = parseInt(request.headers['protocol-version'] || '1');

    this.logger.log(`WebSocket connection from device: ${deviceId}, client: ${clientId}, protocol: ${protocolVersion}`);

    // 检查连接池大小
    this.checkPoolSize();

    // 连接信息
    const connection: DeviceConnection = {
      websocket,
      transport: TransportType.WEBSOCKET,
      protocolVersion: protocolVersion,
      binaryProtocolVersion: 1,
      sessionId,
      deviceState: DeviceState.CONNECTING,
      connectionState: ConnectionState.REQUESTING_CHANNEL,
      lastActivity: Date.now(),
      audioParams: {
        format: 'opus',
        sample_rate: 16000,
        channels: 1,
        frame_duration: 60,
      },
    };

    // 添加到连接池
    this.addToConnectionPool(deviceId, connection);

    // 连接成功
    websocket.on('open', () => {
      this.logger.log(`WebSocket connected for device: ${deviceId}`);
      connection.connectionState = ConnectionState.CHANNEL_OPENED;
      connection.deviceState = DeviceState.IDLE;
      
      // 发布设备连接事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          transport: TransportType.WEBSOCKET,
          sessionId: connection.sessionId,
          type: 'device_connected'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiConnectionService',
        }
      );
    });

    // 连接错误
    websocket.on('error', (error) => {
      this.logger.error(`WebSocket error for device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          transport: TransportType.WEBSOCKET,
          type: 'websocket_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiConnectionService',
        }
      );
    });

    // 连接关闭
    websocket.on('close', () => {
      this.logger.log(`WebSocket closed for device: ${deviceId}`);
      this.removeFromConnectionPool(deviceId);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          transport: TransportType.WEBSOCKET,
          type: 'device_disconnected'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiConnectionService',
        }
      );
    });

    return connection;
  }

  /**
   * 处理MQTT连接
   */
  handleMqttConnection(client: any, connectPacket: any, deviceId: string, sessionId: string): DeviceConnection {
    this.logger.log(`MQTT connection from device: ${deviceId}`);

    // 检查连接池大小
    this.checkPoolSize();

    // 连接信息
    const connection: DeviceConnection = {
      mqttClient: client,
      transport: TransportType.MQTT,
      protocolVersion: 3,
      binaryProtocolVersion: 1,
      sessionId,
      deviceState: DeviceState.CONNECTING,
      connectionState: ConnectionState.MQTT_CONNECTED,
      lastActivity: Date.now(),
      audioParams: {
        format: 'opus',
        sample_rate: 16000,
        channels: 1,
        frame_duration: 60,
      },
      mqttTopics: {
        publish: `xiaozhi/${deviceId}/in`,
        subscribe: `xiaozhi/${deviceId}/out`,
      },
    };

    // 添加到连接池
    this.addToConnectionPool(deviceId, connection);

    // 订阅主题
    client.subscribe(connection.mqttTopics!.subscribe, (err: any) => {
      if (err) {
        this.logger.error(`Failed to subscribe to topic for device ${deviceId}:`, err);
        this.eventBusService.publish(
          EventTypeConstants.CUSTOM_EVENT,
          {
            deviceId,
            error: err.message,
            transport: TransportType.MQTT,
            type: 'mqtt_subscribe_error'
          },
          {
            priority: EventPriority.HIGH,
            source: 'XiaoZhiConnectionService',
          }
        );
        return;
      }
      this.logger.log(`MQTT subscribed to topic: ${connection.mqttTopics!.subscribe}`);
    });

    // 连接错误
    client.on('error', (error: any) => {
      this.logger.error(`MQTT error for device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          transport: TransportType.MQTT,
          type: 'mqtt_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiConnectionService',
        }
      );
    });

    // 连接关闭
    client.on('close', () => {
      this.logger.log(`MQTT closed for device: ${deviceId}`);
      this.removeFromConnectionPool(deviceId);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          transport: TransportType.MQTT,
          type: 'device_disconnected'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiConnectionService',
        }
      );
    });

    return connection;
  }

  /**
   * 关闭设备连接
   */
  closeConnection(connection: DeviceConnection, deviceId?: string): void {
    try {
      // 关闭WebSocket连接
      if (connection.websocket && connection.websocket.readyState === WebSocket.OPEN) {
        connection.websocket.close();
        this.logger.debug(`Closed WebSocket connection${deviceId ? ` for device ${deviceId}` : ''}`);
      }

      // 关闭MQTT连接
      if (connection.mqttClient && connection.mqttClient.connected) {
        connection.mqttClient.end();
        this.logger.debug(`Closed MQTT connection${deviceId ? ` for device ${deviceId}` : ''}`);
      }

      this.logger.log(`Connection closed${deviceId ? ` for device ${deviceId}` : ''}`);
    } catch (error) {
      this.logger.error(`Failed to close connection${deviceId ? ` for device ${deviceId}` : ''}:`, error);
    }
  }

  /**
   * 检查连接是否活跃
   */
  isConnectionActive(connection: DeviceConnection): boolean {
    // 检查最后活动时间
    const now = Date.now();
    const lastActivity = connection.lastActivity;
    const timeout = 120 * 1000; // 120秒超时

    if (now - lastActivity > timeout) {
      return false;
    }

    // 检查WebSocket连接
    if (connection.websocket) {
      return connection.websocket.readyState === WebSocket.OPEN;
    }

    // 检查MQTT连接
    if (connection.mqttClient) {
      return connection.mqttClient.connected;
    }

    return false;
  }

  /**
   * 添加到连接池
   */
  private addToConnectionPool(deviceId: string, connection: DeviceConnection): void {
    const poolItem: ConnectionPoolItem = {
      connection,
      deviceId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: true,
    };
    this.connectionPool.set(deviceId, poolItem);
    this.logger.debug(`Added connection to pool for device ${deviceId}, pool size: ${this.connectionPool.size}`);
  }

  /**
   * 从连接池移除
   */
  private removeFromConnectionPool(deviceId: string): void {
    if (this.connectionPool.has(deviceId)) {
      const poolItem = this.connectionPool.get(deviceId);
      if (poolItem) {
        this.closeConnection(poolItem.connection, deviceId);
        this.connectionPool.delete(deviceId);
        this.logger.debug(`Removed connection from pool for device ${deviceId}, pool size: ${this.connectionPool.size}`);
      }
    }
  }

  /**
   * 检查连接池大小
   */
  private checkPoolSize(): void {
    if (this.connectionPool.size >= this.poolConfig.maxConnections) {
      // 清理最旧的空闲连接
      const idleConnections = Array.from(this.connectionPool.values())
        .filter(item => !item.inUse)
        .sort((a, b) => a.lastUsed - b.lastUsed);
      
      if (idleConnections.length > 0) {
        const oldestConnection = idleConnections[0];
        this.removeFromConnectionPool(oldestConnection.deviceId);
        this.logger.warn(`Connection pool full, removed oldest idle connection for device ${oldestConnection.deviceId}`);
      } else {
        this.logger.warn(`Connection pool full, cannot accept new connections`);
      }
    }
  }

  /**
   * 清理空闲连接
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const idleConnections: string[] = [];
    
    for (const [deviceId, poolItem] of this.connectionPool.entries()) {
      if (!poolItem.inUse && now - poolItem.lastUsed > this.poolConfig.maxIdleTime) {
        idleConnections.push(deviceId);
      }
    }
    
    for (const deviceId of idleConnections) {
      this.removeFromConnectionPool(deviceId);
    }
    
    if (idleConnections.length > 0) {
      this.logger.log(`Cleaned up ${idleConnections.length} idle connections`);
    }
  }

  /**
   * 清理所有连接
   */
  private cleanupAllConnections(): void {
    const deviceIds = Array.from(this.connectionPool.keys());
    for (const deviceId of deviceIds) {
      this.removeFromConnectionPool(deviceId);
    }
  }

  /**
   * 更新服务器负载信息
   */
  private updateServerLoad(): void {
    // 模拟服务器负载信息
    // 实际应用中应该从系统监控获取
    const serverId = `${this.serverHost}:${this.websocketPort}`;
    const loadInfo: ServerLoadInfo = {
      serverId,
      cpuUsage: Math.random() * 50, // 模拟CPU使用率
      memoryUsage: Math.random() * 60, // 模拟内存使用率
      connectionCount: this.connectionPool.size,
      timestamp: Date.now(),
    };
    this.serverLoad.set(serverId, loadInfo);
  }

  /**
   * 获取最优服务器
   */
  getOptimalServer(): string {
    // 简单的负载均衡算法：选择连接数最少的服务器
    let optimalServer = `${this.serverHost}:${this.websocketPort}`;
    let minLoad = Infinity;
    
    for (const [serverId, loadInfo] of this.serverLoad.entries()) {
      const loadScore = loadInfo.connectionCount * 0.5 + loadInfo.cpuUsage * 0.3 + loadInfo.memoryUsage * 0.2;
      if (loadScore < minLoad) {
        minLoad = loadScore;
        optimalServer = serverId;
      }
    }
    
    return optimalServer;
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
  } {
    const total = this.connectionPool.size;
    const active = Array.from(this.connectionPool.values()).filter(item => item.inUse).length;
    const idle = total - active;
    
    return {
      totalConnections: total,
      activeConnections: active,
      idleConnections: idle,
      maxConnections: this.poolConfig.maxConnections,
    };
  }

  /**
   * 生成客户端ID
   */
  private generateClientId(): string {
    return `xiaozhi-${crypto.randomUUID()}`;
  }
}

