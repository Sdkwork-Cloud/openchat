/**
 * 小智消息处理服务
 * 负责处理来自设备的各种消息
 */

import { Injectable, Logger } from '@nestjs/common';
import { DeviceConnection, DeviceState, ConnectionState } from '../xiaozhi.types';
import { EventBusService, EventTypeConstants, EventPriority } from '../../../../common/events/event-bus.service';
import { XiaoZhiFirmwareService } from './xiaozhi-firmware.service';

@Injectable()
export class XiaoZhiMessageService {
  private readonly logger = new Logger(XiaoZhiMessageService.name);

  constructor(
    private eventBusService: EventBusService,
    private firmwareService: XiaoZhiFirmwareService
  ) {}

  /**
   * 处理JSON消息
   */
  async handleJsonMessage(deviceId: string, connection: DeviceConnection, message: any): Promise<void> {
    const messageType = message.type || 'unknown';
    this.logger.debug(`Received JSON message from device ${deviceId}: ${messageType}`);

    try {
      switch (messageType) {
        case 'hello':
          this.handleHelloMessage(deviceId, connection, message);
          break;
        case 'listen':
          this.handleListenMessage(deviceId, connection, message);
          break;
        case 'abort':
          this.handleAbortMessage(deviceId, connection, message);
          break;
        case 'mcp':
          await this.handleMcpMessage(deviceId, connection, message);
          break;
        case 'goodbye':
          this.handleGoodbyeMessage(deviceId, connection, message);
          break;
        case 'heartbeat':
          this.handleHeartbeatMessage(deviceId, connection, message);
          break;
        default:
          this.logger.warn(`Unknown message type from device ${deviceId}: ${messageType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle JSON message for device ${deviceId}, type: ${messageType}:`, error);
      this.eventBusService.publish(
        EventTypeConstants.CUSTOM_EVENT,
        {
          deviceId,
          error: error.message,
          messageType: messageType,
          details: typeof error === 'object' ? JSON.stringify(error) : String(error),
          type: 'message_error'
        },
        {
          priority: EventPriority.HIGH,
          source: 'XiaoZhiMessageService',
        }
      );
    }
  }

  /**
   * 处理hello消息
   */
  private handleHelloMessage(deviceId: string, connection: DeviceConnection, message: any): void {
    // 更新协议版本
    if (message.version) {
      connection.protocolVersion = message.version;
    }

    // 更新音频参数
    if (message.audio_params) {
      connection.audioParams = message.audio_params;
    }

    // 发布事件
    this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
      deviceId,
      messageType: 'hello',
      payload: message,
      type: 'device_message_received'
    });

    // 更新状态
    connection.deviceState = DeviceState.IDLE;
  }

  /**
   * 处理listen消息
   */
  private handleListenMessage(deviceId: string, connection: DeviceConnection, message: any): void {
    this.logger.log(`Listen message from device ${deviceId}:`, message);
    
    // 更新设备状态
    if (message.state === 'start') {
      connection.deviceState = DeviceState.LISTENING;
      connection.connectionState = ConnectionState.AUDIO_STREAMING;
    } else if (message.state === 'stop') {
      connection.deviceState = DeviceState.IDLE;
      connection.connectionState = ConnectionState.CHANNEL_OPENED;
    } else if (message.state === 'detect') {
      // 唤醒词检测
      this.logger.log(`Wake word detected from device ${deviceId}: ${message.text}`);
      this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
        deviceId,
        message: `Wake word detected: ${message.text}`,
        type: 'wake_word_detected'
      });
    }

    // 发布事件
    this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
      deviceId,
      messageType: 'listen',
      payload: message,
      type: 'device_message_received'
    });
  }

  /**
   * 处理abort消息
   */
  private handleAbortMessage(deviceId: string, connection: DeviceConnection, message: any): void {
    this.logger.log(`Abort message from device ${deviceId}:`, message);
    
    // 更新设备状态
    connection.deviceState = DeviceState.IDLE;
    connection.connectionState = ConnectionState.CHANNEL_OPENED;

    // 发布事件
    this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
      deviceId,
      messageType: 'abort',
      payload: message,
      type: 'device_message_received'
    });
  }

  /**
   * 处理MCP消息
   */
  private async handleMcpMessage(deviceId: string, connection: DeviceConnection, message: any): Promise<void> {
    this.logger.log(`MCP message from device ${deviceId}:`, message);
    
    // 发布事件
    this.eventBusService.publish(
      EventTypeConstants.CUSTOM_EVENT,
      {
        deviceId,
        messageType: 'mcp',
        payload: message,
        type: 'device_message_received'
      },
      {
        priority: EventPriority.MEDIUM,
        source: 'XiaoZhiMessageService',
      }
    );

    try {
      const payload = message.payload;
      if (!payload) {
        this.logger.error(`Invalid MCP message: missing payload`);
        return;
      }

      const { method, params, id } = payload;
      if (!method || !id) {
        this.logger.error(`Invalid MCP message: missing method or id`);
        return;
      }

      // 处理不同的MCP方法
      let result: any;
      switch (method) {
        case 'device.getInfo':
          result = await this.handleGetDeviceInfo(deviceId, connection, params);
          break;
        case 'device.setConfig':
          result = await this.handleSetDeviceConfig(deviceId, connection, params);
          break;
        case 'device.restart':
          result = await this.handleRestartDevice(deviceId, connection, params);
          break;
        case 'device.factoryReset':
          result = await this.handleFactoryReset(deviceId, connection, params);
          break;
        case 'firmware.checkUpdate':
          result = await this.handleCheckFirmwareUpdate(deviceId, connection, params);
          break;
        case 'firmware.startUpdate':
          result = await this.handleStartFirmwareUpdate(deviceId, connection, params);
          break;
        case 'firmware.getStatus':
          result = await this.handleGetFirmwareStatus(deviceId, connection, params);
          break;
        case 'audio.getConfig':
          result = await this.handleGetAudioConfig(deviceId, connection, params);
          break;
        case 'audio.setConfig':
          result = await this.handleSetAudioConfig(deviceId, connection, params);
          break;
        default:
          this.logger.warn(`Unknown MCP method: ${method}`);
          result = { error: `Unknown method: ${method}` };
      }

      // 发送MCP响应
      this.sendMcpResponse(deviceId, connection, id, result);
    } catch (error) {
      this.logger.error(`Failed to handle MCP message:`, error);
      // 发送错误响应
      if (message.payload && message.payload.id) {
        this.sendMcpResponse(deviceId, connection, message.payload.id, { error: error.message });
      }
    }
  }

  /**
   * 发送MCP响应
   */
  private sendMcpResponse(deviceId: string, connection: DeviceConnection, id: number, result: any): void {
    const response = {
      type: 'mcp',
      payload: {
        jsonrpc: '2.0',
        id,
        result: result.error ? null : result,
        error: result.error ? {
          code: -32603,
          message: result.error
        } : null,
      },
    };

    this.sendMessage(deviceId, connection, response);
  }

  /**
   * 处理获取设备信息
   */
  private async handleGetDeviceInfo(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    return {
      deviceId,
      deviceName: connection.deviceName || `Device-${deviceId.substring(0, 8)}`,
      deviceType: connection.deviceType || 'xiaozhi',
      firmwareVersion: connection.firmwareVersion || '1.0.0',
      hardwareVersion: connection.hardwareVersion || 'esp32',
      protocolVersion: connection.protocolVersion || 3,
      binaryProtocolVersion: connection.binaryProtocolVersion || 1,
      uptime: Math.floor((Date.now() - connection.lastActivity) / 1000),
      status: connection.deviceState,
      connectionState: connection.connectionState,
      audioParams: connection.audioParams,
    };
  }

  /**
   * 处理设置设备配置
   */
  private async handleSetDeviceConfig(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    if (params.deviceName) {
      connection.deviceName = params.deviceName;
    }
    if (params.deviceType) {
      connection.deviceType = params.deviceType;
    }
    if (params.firmwareVersion) {
      connection.firmwareVersion = params.firmwareVersion;
    }
    if (params.hardwareVersion) {
      connection.hardwareVersion = params.hardwareVersion;
    }

    return { success: true, message: 'Device config updated' };
  }

  /**
   * 处理重启设备
   */
  private async handleRestartDevice(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    // 发布设备重启事件
    this.eventBusService.publish(
      EventTypeConstants.CUSTOM_EVENT,
      {
        deviceId,
        reason: params.reason || 'User requested',
        type: 'device_restarting'
      },
      {
        priority: EventPriority.HIGH,
        source: 'XiaoZhiMessageService',
      }
    );

    return { success: true, message: 'Device restarting' };
  }

  /**
   * 处理恢复出厂设置
   */
  private async handleFactoryReset(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    // 发布设备恢复出厂设置事件
    this.eventBusService.publish(
      EventTypeConstants.CUSTOM_EVENT,
      {
        deviceId,
        reason: params.reason || 'User requested',
        type: 'device_factory_reset'
      },
      {
        priority: EventPriority.HIGH,
        source: 'XiaoZhiMessageService',
      }
    );

    return { success: true, message: 'Device resetting to factory defaults' };
  }

  /**
   * 处理检查固件更新
   */
  private async handleCheckFirmwareUpdate(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    const hardwareVersion = params.hardwareVersion || connection.hardwareVersion || 'esp32';
    const currentVersion = params.currentVersion || connection.firmwareVersion || '1.0.0';

    const updateInfo = this.firmwareService.checkForFirmwareUpdate(deviceId, hardwareVersion, currentVersion);
    if (updateInfo) {
      return {
        available: true,
        version: updateInfo.version,
        size: updateInfo.size,
        checksum: updateInfo.checksum,
        description: updateInfo.description,
        url: updateInfo.url,
      };
    } else {
      return {
        available: false,
        message: 'No update available',
      };
    }
  }

  /**
   * 处理开始固件升级
   */
  private async handleStartFirmwareUpdate(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    const hardwareVersion = params.hardwareVersion || connection.hardwareVersion || 'esp32';
    const version = params.version;

    if (version) {
      // 升级到指定版本
      const firmwareInfo = this.firmwareService.getFirmware(hardwareVersion, version);
      if (!firmwareInfo) {
        throw new Error(`Firmware version ${version} not found`);
      }
      
      const upgradeState = await this.firmwareService.startFirmwareUpgrade(deviceId, hardwareVersion);
      return {
        status: upgradeState.status,
        progress: upgradeState.progress,
        firmwareVersion: upgradeState.firmwareVersion,
      };
    } else {
      // 升级到最新版本
      const upgradeState = await this.firmwareService.startFirmwareUpgrade(deviceId, hardwareVersion);
      return {
        status: upgradeState.status,
        progress: upgradeState.progress,
        firmwareVersion: upgradeState.firmwareVersion,
      };
    }
  }

  /**
   * 处理获取固件升级状态
   */
  private async handleGetFirmwareStatus(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    const upgradeState = this.firmwareService.getUpgradeState(deviceId);
    if (upgradeState) {
      return {
        status: upgradeState.status,
        progress: upgradeState.progress,
        firmwareVersion: upgradeState.firmwareVersion,
        error: upgradeState.error,
        startTime: upgradeState.startTime,
        lastUpdate: upgradeState.lastUpdate,
      };
    } else {
      return {
        status: 'idle',
        message: 'No upgrade in progress',
      };
    }
  }

  /**
   * 处理获取音频配置
   */
  private async handleGetAudioConfig(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    return connection.audioParams || {
      format: 'opus',
      sample_rate: 16000,
      channels: 1,
      frame_duration: 60,
    };
  }

  /**
   * 处理设置音频配置
   */
  private async handleSetAudioConfig(deviceId: string, connection: DeviceConnection, params: any): Promise<any> {
    if (params) {
      connection.audioParams = {
        ...connection.audioParams,
        ...params,
      };
    }

    return { success: true, message: 'Audio config updated' };
  }

  /**
   * 处理goodbye消息
   */
  private handleGoodbyeMessage(deviceId: string, connection: DeviceConnection, message: any): void {
    this.logger.log(`Goodbye message from device ${deviceId}:`, message);
    
    // 发布事件
    this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
      deviceId,
      message: 'Device sent goodbye message',
      type: 'device_disconnected'
    });
  }

  /**
   * 处理心跳消息
   */
  private handleHeartbeatMessage(deviceId: string, connection: DeviceConnection, message: any): void {
    this.logger.debug(`Heartbeat message from device ${deviceId}:`, message);
    
    // 更新连接活动时间
    connection.lastActivity = Date.now();
    
    // 发布心跳事件
    this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
      deviceId,
      timestamp: message.timestamp || Date.now(),
      sessionId: message.session_id || connection.sessionId,
      type: 'device_heartbeat_received'
    });

    // 发送心跳响应
    const heartbeatResponse = {
      type: 'heartbeat',
      session_id: connection.sessionId,
      timestamp: Date.now(),
      status: 'ok'
    };

    this.sendMessage(deviceId, connection, heartbeatResponse);
  }

  /**
   * 发送消息到设备
   */
  sendMessage(deviceId: string, connection: DeviceConnection, message: any): void {
    try {
      const messageStr = JSON.stringify(message);

      if (connection.transport === 'websocket') {
        // 通过WebSocket发送
        if (connection.websocket && connection.websocket.readyState === connection.websocket.OPEN) {
          connection.websocket.send(messageStr);
        }
      } else if (connection.transport === 'mqtt') {
        // 通过MQTT发送
        if (connection.mqttClient && connection.mqttClient.connected && connection.mqttTopics) {
          connection.mqttClient.publish(connection.mqttTopics.publish, messageStr);
        }
      }

      // 发布事件
      this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
        deviceId,
        messageType: message.type,
        payload: message,
        type: 'device_message_sent'
      });

      this.logger.log(`Message sent to device: ${deviceId}, type: ${message.type}`);
    } catch (error) {
      this.logger.error(`Failed to send message to device ${deviceId}:`, error);
      this.eventBusService.publish(EventTypeConstants.CUSTOM_EVENT, {
        deviceId,
        error: error.message,
        messageType: message.type,
        type: 'system_error'
      });
    }
  }
}
