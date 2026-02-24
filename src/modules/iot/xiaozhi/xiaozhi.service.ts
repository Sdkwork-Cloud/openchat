/**
 * 开源小智服务
 * 负责与开源小智设备通信
 * 作为协调者整合所有子服务
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import * as mqtt from 'mqtt';
import { XiaoZhiConnectionService } from './services/xiaozhi-connection.service';
import { XiaoZhiMessageService } from './services/xiaozhi-message.service';
import { XiaoZhiAudioService } from './services/xiaozhi-audio.service';
import { XiaoZhiStateService } from './services/xiaozhi-state.service';
import { XiaoZhiCapabilityService } from './services/xiaozhi-capability.service';
import { XiaoZhiSecurityService } from './services/xiaozhi-security.service';
import { EventBusService, EventTypeConstants, EventPriority } from '../../../common/events/event-bus.service';
import { XiaoZhiPluginService } from './services/xiaozhi-plugin.service';
import { XiaoZhiConfigService } from './services/xiaozhi-config.service';
import { DeviceState, ConnectionState, TransportType, DeviceConnection, XiaoZhiProtocolVersion, BinaryProtocolVersion } from './xiaozhi.types';
import * as crypto from 'crypto';

@Injectable()
export class XiaoZhiService {
  private readonly logger = new Logger(XiaoZhiService.name);
  private readonly serverHost: string;
  private readonly websocketPort: number;
  private readonly mqttPort: number;
  private readonly udpPort: number;

  constructor(
    private configService: ConfigService,
    private connectionService: XiaoZhiConnectionService,
    private messageService: XiaoZhiMessageService,
    private audioService: XiaoZhiAudioService,
    private stateService: XiaoZhiStateService,
    private capabilityService: XiaoZhiCapabilityService,
    private securityService: XiaoZhiSecurityService,
    private pluginService: XiaoZhiPluginService,
    private configCenterService: XiaoZhiConfigService,
    private eventBusService: EventBusService
  ) {
    // 从配置中心读取服务器地址和端口
    this.serverHost = this.configCenterService.getConfig('server.host', '0.0.0.0');
    this.websocketPort = this.configCenterService.getConfig('server.websocketPort', 8084);
    this.mqttPort = this.configCenterService.getConfig('server.mqttPort', 1883);
    this.udpPort = this.configCenterService.getConfig('server.udpPort', 8888);

    // 注册自身服务
    this.registerSelfService();

    this.logger.log(`XiaoZhi Service initialized with server: ${this.serverHost}`);
    this.logger.log(`WebSocket port: ${this.websocketPort}, MQTT port: ${this.mqttPort}, UDP port: ${this.udpPort}`);
  }

  /**
   * 注册自身服务
   */
  private registerSelfService(): void {
    const serviceInfo = {
      serviceId: `xiaozhi-${crypto.randomUUID().substring(0, 8)}`,
      serviceName: 'xiaozhi',
      host: this.serverHost,
      port: this.websocketPort,
      healthCheckUrl: `/health`,
      status: 'up' as const,
      lastHeartbeat: Date.now(),
      metadata: {
        version: '1.0.0',
        transport: ['websocket', 'mqtt', 'udp'],
        features: ['audio', 'stt', 'tts', 'llm', 'mcp'],
      },
    };

    this.configCenterService.registerService(serviceInfo);
    this.logger.log(`Registered self service: ${serviceInfo.serviceId}`);
  }

  // ==================== 连接管理 ====================

  /**
   * 处理WebSocket连接 (原生 ws 库)
   */
  handleWebSocketConnection(websocket: WebSocket, request: any): void {
    const deviceId = request.headers['device-id'] || crypto.randomUUID();
    this.logger.log(`WebSocket connection from device: ${deviceId}`);

    // 验证设备认证
    if (!this.validateDeviceAuth(deviceId, request.headers['authorization'])) {
      this.logger.warn(`Unauthorized connection attempt from device: ${deviceId}`);
      websocket.close(401, 'Unauthorized');
      return;
    }

    // 处理连接
    const connection = this.processWebSocketConnection(deviceId, websocket, request);

    // 初始化设备信息
    this.initializeDeviceInfo(deviceId, request);

    // 发布设备连接事件
    this.publishDeviceConnectedEvent(deviceId, TransportType.WEBSOCKET, connection.sessionId, request.headers['device-name']);

    // 接收消息
    websocket.on('message', (data: WebSocket.Data) => {
      this.handleWebSocketMessage(deviceId, data);
    });
  }

  /**
   * 处理 Socket.io 连接
   */
  handleSocketIOConnection(socket: any, request: any): void {
    const deviceId = request.headers['device-id'] || socket.id || crypto.randomUUID();
    this.logger.log(`Socket.io connection from device: ${deviceId}`);

    // 验证设备认证
    if (!this.validateDeviceAuth(deviceId, request.headers['authorization'])) {
      this.logger.warn(`Unauthorized connection attempt from device: ${deviceId}`);
      socket.disconnect(true);
      return;
    }

    // 处理连接
    const connection = this.processSocketIOConnection(deviceId, socket, request);

    // 初始化设备信息
    this.initializeDeviceInfo(deviceId, request);

    // 发布设备连接事件
    this.publishDeviceConnectedEvent(deviceId, TransportType.WEBSOCKET, connection.sessionId, request.headers['device-name']);

    // 接收消息
    socket.on('message', (data: any) => {
      this.handleWebSocketMessage(deviceId, data);
    });

    // 接收二进制数据
    socket.on('binary', (data: Buffer) => {
      const conn = this.stateService.getConnection(deviceId);
      if (conn) {
        this.audioService.handleBinaryAudio(deviceId, conn, data);
      }
    });
  }

  /**
   * 验证设备认证
   */
  private validateDeviceAuth(deviceId: string, token: string): boolean {
    if (!this.securityService.isDeviceAuthenticated(deviceId) && token) {
      const authResult = this.securityService.verifyAuthToken(token);
      return !!authResult && authResult.deviceId === deviceId;
    }
    return true;
  }

  /**
   * 处理WebSocket连接 (原生 ws 库)
   */
  private processWebSocketConnection(deviceId: string, websocket: WebSocket, request: any): DeviceConnection {
    // 生成会话ID
    const sessionId = this.securityService.generateSecureSessionId(deviceId);

    // 处理连接
    const connection = this.connectionService.handleWebSocketConnection(websocket, request, deviceId, sessionId);

    // 存储连接
    this.stateService.addConnection(deviceId, connection);

    return connection;
  }

  /**
   * 处理 Socket.io 连接
   */
  private processSocketIOConnection(deviceId: string, socket: any, request: any): DeviceConnection {
    // 生成会话ID
    const sessionId = this.securityService.generateSecureSessionId(deviceId);

    // 创建连接对象
    const connection: DeviceConnection = {
      socket,
      transport: TransportType.WEBSOCKET,
      protocolVersion: XiaoZhiProtocolVersion.V1,
      binaryProtocolVersion: BinaryProtocolVersion.V1,
      sessionId,
      deviceState: DeviceState.IDLE,
      connectionState: ConnectionState.CHANNEL_OPENED,
      lastActivity: Date.now(),
      audioParams: {
        format: 'opus',
        sample_rate: 16000,
        channels: 1,
        frame_duration: 60,
      },
    };

    // 存储连接
    this.stateService.addConnection(deviceId, connection);

    return connection;
  }

  /**
   * 初始化设备信息
   */
  private initializeDeviceInfo(deviceId: string, request: any): void {
    this.capabilityService.updateDeviceInfo(deviceId, {
      deviceName: request.headers['device-name'] || `Device-${deviceId.substring(0, 8)}`,
      deviceType: request.headers['device-type'] || 'unknown',
    });
  }

  /**
   * 发布设备连接事件
   */
  private publishDeviceConnectedEvent(deviceId: string, transport: TransportType, sessionId: string, deviceName?: string): void {
    this.eventBusService.publish(
      EventTypeConstants.CUSTOM_EVENT,
      {
        deviceId,
        transport,
        sessionId,
        deviceName: deviceName || `Device-${deviceId.substring(0, 8)}`,
        type: 'device_connected'
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiService',
      }
    );
  }

  /**
   * 处理MQTT连接
   */
  handleMqttConnection(client: any, connectPacket: any): void {
    const deviceId = connectPacket.clientId || crypto.randomUUID();
    this.logger.log(`MQTT connection from device: ${deviceId}`);

    // 验证设备认证
    if (!this.validateMqttAuth(deviceId, connectPacket.password)) {
      this.logger.warn(`Unauthorized MQTT connection attempt from device: ${deviceId}`);
      client.end(true);
      return;
    }

    // 处理连接
    const connection = this.processMqttConnection(deviceId, client, connectPacket);

    // 初始化设备信息
    this.initializeMqttDeviceInfo(deviceId, connectPacket);

    // 发布设备连接事件
    this.publishDeviceConnectedEvent(deviceId, TransportType.MQTT, connection.sessionId, connectPacket.will?.topic?.split('/')[1]);

    // 接收消息
    client.on('message', (topic: string, message: Buffer) => {
      this.handleMqttMessage(deviceId, topic, message);
    });
  }

  /**
   * 验证MQTT设备认证
   */
  private validateMqttAuth(deviceId: string, password: any): boolean {
    if (password) {
      const passwordStr = password.toString('utf8');
      if (!this.securityService.isDeviceAuthenticated(deviceId)) {
        const authResult = this.securityService.verifyAuthToken(passwordStr);
        return !!authResult && authResult.deviceId === deviceId;
      }
    }
    return true;
  }

  /**
   * 处理MQTT连接
   */
  private processMqttConnection(deviceId: string, client: any, connectPacket: any): DeviceConnection {
    // 生成会话ID
    const sessionId = this.securityService.generateSecureSessionId(deviceId);

    // 处理连接
    const connection = this.connectionService.handleMqttConnection(client, connectPacket, deviceId, sessionId);

    // 存储连接
    this.stateService.addConnection(deviceId, connection);

    return connection;
  }

  /**
   * 初始化MQTT设备信息
   */
  private initializeMqttDeviceInfo(deviceId: string, connectPacket: any): void {
    this.capabilityService.updateDeviceInfo(deviceId, {
      deviceName: connectPacket.will?.topic?.split('/')[1] || `Device-${deviceId.substring(0, 8)}`,
      deviceType: 'mqtt-device',
    });
  }

  /**
   * 关闭设备连接
   */
  closeConnection(deviceId: string): void {
    const connection = this.stateService.getConnection(deviceId);
    if (connection) {
      this.connectionService.closeConnection(connection);
      this.stateService.removeConnection(deviceId);
      
      // 发布设备断开事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          transport: connection.transport,
          reason: 'Connection closed',
          type: 'device_disconnected'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
      
      this.logger.log(`Connection closed for device: ${deviceId}`);
    }
  }

  // ==================== 消息处理 ====================

  /**
   * 处理WebSocket断开连接
   */
  handleWebSocketDisconnect(deviceId: string): void {
    this.logger.log(`WebSocket disconnected for device: ${deviceId}`);
    this.stateService.removeConnection(deviceId);
  }

  /**
   * 处理WebSocket消息
   */
  async handleWebSocketMessage(deviceId: string, data: WebSocket.Data): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    // 更新活动时间
    this.stateService.updateActivity(deviceId);

    try {
      if (typeof data === 'string') {
        // 处理JSON消息
        const message = JSON.parse(data);
        this.logger.debug(`Received WebSocket message from device ${deviceId}: ${message.type}`);
        
        this.messageService.handleJsonMessage(deviceId, connection, message);
        
        // 发布消息接收事件
        const event = {
          type: EventTypeConstants.CUSTOM_EVENT,
          data: {
            deviceId,
            messageType: message.type,
            payload: message,
            transport: 'websocket',
            type: 'device_message_received'
          },
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        };
        
        this.eventBusService.publish(
          EventTypeConstants.CUSTOM_EVENT,
          event.data,
          {
            priority: event.priority,
            source: event.source,
          }
        );
        
        // 处理hello消息的特殊逻辑
        if (message.type === 'hello') {
          this.logger.log(`Processing hello message from device ${deviceId}`);
          this.handleHelloResponse(deviceId, connection);
        }
        
        // 通过插件服务处理事件
        try {
          await this.pluginService.handleEvent(event);
          this.logger.debug(`Plugin service processed event for device ${deviceId}`);
        } catch (pluginError) {
          this.logger.warn(`Plugin service failed to process event for device ${deviceId}:`, pluginError);
        }
      } else if (Buffer.isBuffer(data)) {
        // 处理二进制音频数据
        this.logger.debug(`Received binary audio data from device ${deviceId}, size: ${data.length} bytes`);
        this.audioService.handleBinaryAudio(deviceId, connection, data);
      }
    } catch (error) {
      this.logger.error(`Failed to handle WebSocket message for device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          transport: 'websocket',
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 处理MQTT消息
   */
  private async handleMqttMessage(deviceId: string, topic: string, message: Buffer): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    // 更新活动时间
    this.stateService.updateActivity(deviceId);

    try {
      const messageStr = message.toString('utf8');
      this.logger.debug(`Received MQTT message from device ${deviceId}, topic: ${topic}, size: ${message.length} bytes`);
      
      const jsonMessage = JSON.parse(messageStr);
      this.logger.debug(`Parsed MQTT message from device ${deviceId}: ${jsonMessage.type}`);
      
      this.messageService.handleJsonMessage(deviceId, connection, jsonMessage);
      
      // 发布消息接收事件
      const event = {
        type: EventTypeConstants.CUSTOM_EVENT,
        data: {
          deviceId,
          messageType: jsonMessage.type,
          payload: jsonMessage,
          transport: 'mqtt',
          topic,
          type: 'device_message_received'
        },
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiService',
      };
      
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        event.data,
        {
          priority: event.priority,
          source: event.source,
        }
      );
      
      // 处理hello消息的特殊逻辑
      if (jsonMessage.type === 'hello') {
        this.logger.log(`Processing hello message from device ${deviceId} via MQTT`);
        this.handleHelloResponse(deviceId, connection);
      }
      
      // 通过插件服务处理事件
      try {
        await this.pluginService.handleEvent(event);
        this.logger.debug(`Plugin service processed MQTT event for device ${deviceId}`);
      } catch (pluginError) {
        this.logger.warn(`Plugin service failed to process MQTT event for device ${deviceId}:`, pluginError);
      }
    } catch (error) {
      this.logger.error(`Failed to handle MQTT message for device ${deviceId}, topic: ${topic}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          transport: 'mqtt',
          topic,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 处理hello响应
   */
  private handleHelloResponse(deviceId: string, connection: DeviceConnection): void {
    // 生成hello响应
    const helloResponse: any = {
      type: 'hello',
      transport: connection.transport,
      session_id: connection.sessionId,
      audio_params: {
        format: 'opus',
        sample_rate: 24000, // 服务器使用24kHz
        channels: 1,
        frame_duration: 60,
      },
    };

    // 如果是UDP传输，添加UDP连接信息
    if (connection.transport === TransportType.UDP) {
      const udpInfo = {
        server: this.serverHost,
        port: this.udpPort,
        key: crypto.randomBytes(16).toString('hex'),
        nonce: crypto.randomBytes(16).toString('hex'),
      };
      helloResponse['udp'] = udpInfo;
      connection.udpInfo = udpInfo;
      this.stateService.updateConnectionState(deviceId, ConnectionState.UDP_CONNECTED);
      this.logger.log(`Added UDP connection info for device ${deviceId}: ${this.serverHost}:${this.udpPort}`);
    }

    // 发送响应
    this.messageService.sendMessage(deviceId, connection, helloResponse);
    this.logger.log(`Sent hello response to device ${deviceId} via ${connection.transport}, session: ${connection.sessionId}`);

    // 更新状态
    this.stateService.updateDeviceState(deviceId, DeviceState.IDLE);
    this.logger.debug(`Updated device ${deviceId} state to IDLE`);
  }

  // ==================== 业务方法 ====================

  /**
   * 发送STT结果到设备
   */
  async sendSttResult(deviceId: string, text: string): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      const sttMessage = {
        session_id: connection.sessionId,
        type: 'stt',
        text: text,
      };

      this.messageService.sendMessage(deviceId, connection, sttMessage);
      
      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'stt',
          payload: sttMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
      
      this.logger.log(`Sent STT result to device ${deviceId} via ${connection.transport}: ${text}`);
    } catch (error) {
      this.logger.error(`Failed to send STT result to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'stt',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送TTS开始消息到设备
   */
  async sendTtsStart(deviceId: string): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      const ttsMessage = {
        session_id: connection.sessionId,
        type: 'tts',
        state: 'start',
      };

      this.messageService.sendMessage(deviceId, connection, ttsMessage);

      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'tts',
          payload: ttsMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );

      this.logger.log(`Sent TTS start to device ${deviceId} via ${connection.transport}`);

      // 更新设备状态
      this.stateService.updateDeviceState(deviceId, DeviceState.SPEAKING);
    } catch (error) {
      this.logger.error(`Failed to send TTS start to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'tts',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送TTS结束消息到设备
   */
  async sendTtsStop(deviceId: string): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      const ttsMessage = {
        session_id: connection.sessionId,
        type: 'tts',
        state: 'stop',
      };

      this.messageService.sendMessage(deviceId, connection, ttsMessage);
      
      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'tts',
          payload: ttsMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );

      this.logger.log(`Sent TTS stop to device ${deviceId} via ${connection.transport}`);

      // 更新设备状态
      this.stateService.updateDeviceState(deviceId, DeviceState.IDLE);
    } catch (error) {
      this.logger.error(`Failed to send TTS stop to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'tts',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送TTS句子开始消息到设备
   */
  async sendTtsSentenceStart(deviceId: string, text: string): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      const ttsMessage = {
        session_id: connection.sessionId,
        type: 'tts',
        state: 'sentence_start',
        text: text,
      };

      this.messageService.sendMessage(deviceId, connection, ttsMessage);
      
      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'tts',
          payload: ttsMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
      
      this.logger.log(`Sent TTS sentence start to device ${deviceId} via ${connection.transport}: ${text}`);
    } catch (error) {
      this.logger.error(`Failed to send TTS sentence start to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'tts',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送LLM情感消息到设备
   */
  async sendLlmEmotion(deviceId: string, emotion: string, text: string): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      const llmMessage = {
        session_id: connection.sessionId,
        type: 'llm',
        emotion: emotion,
        text: text,
      };

      this.messageService.sendMessage(deviceId, connection, llmMessage);
      
      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'llm',
          payload: llmMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
      
      this.logger.log(`Sent LLM emotion to device ${deviceId} via ${connection.transport}: ${emotion} - ${text}`);
    } catch (error) {
      this.logger.error(`Failed to send LLM emotion to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'llm',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送系统命令到设备
   */
  async sendSystemCommand(deviceId: string, command: string): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      const systemMessage = {
        session_id: connection.sessionId,
        type: 'system',
        command: command,
      };

      this.messageService.sendMessage(deviceId, connection, systemMessage);
      
      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'system',
          payload: systemMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
      
      this.logger.log(`Sent system command to device ${deviceId} via ${connection.transport}: ${command}`);
    } catch (error) {
      this.logger.error(`Failed to send system command to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'system',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送MCP命令到设备
   */
  async sendMcpCommand(deviceId: string, method: string, params: any): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      // 检查设备是否支持MCP能力
      if (!this.capabilityService.hasCapability(deviceId, 'mcp')) {
        this.logger.warn(`Device ${deviceId} does not support MCP capability`);
        return;
      }

      const mcpMessage = {
        session_id: connection.sessionId,
        type: 'mcp',
        payload: {
          jsonrpc: '2.0',
          method: method,
          params: params,
          id: Date.now(),
        },
      };

      this.messageService.sendMessage(deviceId, connection, mcpMessage);
      
      // 发布消息发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: 'mcp',
          payload: mcpMessage,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
      
      this.logger.log(`Sent MCP command to device ${deviceId} via ${connection.transport}: ${method}`);
    } catch (error) {
      this.logger.error(`Failed to send MCP command to device ${deviceId}, method: ${method}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: 'mcp',
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 发送音频数据到设备
   */
  async sendAudioData(deviceId: string, audioData: Buffer): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      this.audioService.sendAudioData(deviceId, connection, audioData);
      this.logger.log(`Sent audio data to device ${deviceId}, size: ${audioData.length} bytes via ${connection.transport}`);
      
      // 发布音频数据发送事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          sessionId: connection.sessionId,
          size: audioData.length,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'audio_data_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
    } catch (error) {
      this.logger.error(`Failed to send audio data to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 获取设备能力信息
   */
  getDeviceCapabilities(deviceId: string): any {
    return this.capabilityService.getDeviceCapabilities(deviceId);
  }

  /**
   * 获取所有设备能力信息
   */
  getAllDeviceCapabilities(): Map<string, any> {
    return this.capabilityService.getAllDeviceCapabilities();
  }

  /**
   * 检查设备是否支持特定能力
   */
  hasCapability(deviceId: string, capabilityName: string): boolean {
    return this.capabilityService.hasCapability(deviceId, capabilityName);
  }

  /**
   * 检查设备是否支持特定工具
   */
  hasTool(deviceId: string, toolName: string): boolean {
    return this.capabilityService.hasTool(deviceId, toolName);
  }

  /**
   * 获取设备支持的工具列表
   */
  getDeviceTools(deviceId: string): any[] {
    return this.capabilityService.getDeviceTools(deviceId);
  }

  /**
   * 清理过期的设备能力信息
   */
  cleanupExpiredCapabilities(): number {
    return this.capabilityService.cleanupExpiredCapabilities();
  }

  /**
   * 获取设备能力统计信息
   */
  getCapabilityStats(): any {
    return this.capabilityService.getCapabilityStats();
  }

  // ==================== 工具方法 ====================

  /**
   * 获取设备连接信息
   */
  getDeviceConnection(deviceId: string): DeviceConnection | null {
    return this.stateService.getConnection(deviceId);
  }

  /**
   * 获取所有设备连接
   */
  getAllConnections(): Map<string, DeviceConnection> {
    return this.stateService.getAllConnections();
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 清理所有连接
    await this.stateService.cleanup();
    this.logger.log('XiaoZhi Service cleanup completed');
  }

  /**
   * 清理不活跃的连接
   */
  cleanupInactiveConnections(): void {
    this.stateService.cleanupInactiveConnections();
  }

  /**
   * 发送消息到设备
   * 由IoTService调用
   */
  async sendMessage(deviceId: string, payload: any): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    try {
      this.messageService.sendMessage(deviceId, connection, payload);
      const messageType = payload.type || 'unknown';
      this.logger.log(`Sent message to device ${deviceId} via ${connection.transport}, type: ${messageType}`);
      this.logger.debug(`Message payload: ${JSON.stringify(payload)}`);
    } catch (error) {
      this.logger.error(`Failed to send message to device ${deviceId}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: payload.type,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }

  /**
   * 处理来自设备的消息
   * 由IoTService调用
   */
  async processMessage(deviceId: string, payload: any): Promise<void> {
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.error(`Connection not found for device: ${deviceId}`);
      return;
    }

    // 更新活动时间
    this.stateService.updateActivity(deviceId);

    try {
      this.messageService.handleJsonMessage(deviceId, connection, payload);
      const messageType = payload.type || 'unknown';
      // 避免记录大型payload，只记录类型和关键信息
      if (JSON.stringify(payload).length > 1000) {
        this.logger.log(`Processed message from device ${deviceId}, type: ${messageType}, payload size: ${JSON.stringify(payload).length} bytes`);
      } else {
        this.logger.log(`Processed message from device ${deviceId}, type: ${messageType}`);
        this.logger.debug(`Message payload: ${JSON.stringify(payload)}`);
      }

      // 发布消息处理完成事件
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          messageType: messageType,
          transport: connection.transport,
          timestamp: Date.now(),
          type: 'device_message_sent'
        },
        {
          priority: EventPriority.MEDIUM,
          source: 'XiaoZhiService',
        }
      );
    } catch (error) {
      const messageType = payload.type || 'unknown';
      this.logger.error(`Failed to process message for device ${deviceId}, type: ${messageType}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: messageType,
          transport: connection.transport,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'system_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiService',
        }
      );
    }
  }
}
