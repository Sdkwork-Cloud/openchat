/**
 * 小智 WebSocket 网关
 * 
 * 处理小智设备的 WebSocket 连接
 * 协议：wss://host/xiaozhi
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../../../common/auth/guards/ws-jwt.guard';
import { XiaoZhiService } from './xiaozhi.service';
import { XiaoZhiMessageService } from './services/xiaozhi-message.service';
import { XiaoZhiAudioService } from './services/xiaozhi-audio.service';
import { XiaoZhiStateService } from './services/xiaozhi-state.service';
import { TransportType, BinaryProtocolVersion } from './xiaozhi.types';

@Injectable()
@WebSocketGateway({
  namespace: '/xiaozhi',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
})
@UseGuards(WsJwtGuard)
export class XiaoZhiGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(XiaoZhiGateway.name);

  @WebSocketServer()
  server: Server;

  // 存储 socket 到 deviceId 的映射
  private socketToDeviceMap = new Map<string, string>();

  constructor(
    private configService: ConfigService,
    private xiaozhiService: XiaoZhiService,
    private messageService: XiaoZhiMessageService,
    private audioService: XiaoZhiAudioService,
    private stateService: XiaoZhiStateService,
  ) {}

  /**
   * 网关初始化
   */
  afterInit(server: Server) {
    this.logger.log('XiaoZhi WebSocket Gateway initialized');
    this.logger.log(`Namespace: /xiaozhi`);
  }

  /**
   * 处理连接
   */
  handleConnection(client: Socket) {
    const deviceId = this.extractDeviceId(client);
    
    this.logger.log(`Device connected: ${deviceId}, socketId: ${client.id}`);
    
    // 存储映射
    this.socketToDeviceMap.set(client.id, deviceId);

    // 处理 Socket.io 连接
    this.xiaozhiService.handleSocketIOConnection(client, {
      headers: {
        'device-id': deviceId,
        'authorization': client.handshake.auth.token || client.handshake.headers.authorization,
        'device-name': client.handshake.query.deviceName as string,
        'device-type': client.handshake.query.deviceType as string,
      },
    });

    // 发送欢迎消息
    this.sendHelloMessage(client, deviceId);
  }

  /**
   * 处理断开连接
   */
  handleDisconnect(client: Socket) {
    const deviceId = this.socketToDeviceMap.get(client.id);
    
    if (deviceId) {
      this.logger.log(`Device disconnected: ${deviceId}, socketId: ${client.id}`);
      
      // 清理映射
      this.socketToDeviceMap.delete(client.id);
      
      // 处理断开连接
      this.xiaozhiService.handleWebSocketDisconnection(deviceId);
    }
  }

  /**
   * 处理文本消息
   */
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    const deviceId = this.socketToDeviceMap.get(client.id);
    
    if (!deviceId) {
      this.logger.warn(`Received message from unknown client: ${client.id}`);
      return;
    }

    this.logger.debug(`Received message from device ${deviceId}:`, payload);
    
    // 处理消息
    this.xiaozhiService.handleWebSocketMessage(deviceId, payload);
  }

  /**
   * 处理二进制音频数据
   */
  @SubscribeMessage('binary')
  handleBinaryMessage(client: Socket, payload: Buffer) {
    const deviceId = this.socketToDeviceMap.get(client.id);
    
    if (!deviceId) {
      this.logger.warn(`Received binary data from unknown client: ${client.id}`);
      return;
    }

    // 获取连接信息
    const connection = this.stateService.getConnection(deviceId);
    if (!connection) {
      this.logger.warn(`No connection found for device ${deviceId}`);
      return;
    }

    // 处理二进制音频数据
    this.audioService.handleBinaryAudioData(deviceId, connection, payload);
  }

  /**
   * 发送消息到设备
   */
  sendMessageToDevice(deviceId: string, message: any): boolean {
    const socketId = this.getSocketIdByDeviceId(deviceId);
    
    if (!socketId) {
      this.logger.warn(`No socket found for device ${deviceId}`);
      return false;
    }

    const socket = this.server.sockets.sockets.get(socketId);
    if (!socket) {
      this.logger.warn(`Socket not found for device ${deviceId}`);
      return false;
    }

    socket.emit('message', message);
    return true;
  }

  /**
   * 发送音频数据到设备
   */
  sendAudioToDevice(deviceId: string, audioData: Buffer): boolean {
    const socketId = this.getSocketIdByDeviceId(deviceId);
    
    if (!socketId) {
      this.logger.warn(`No socket found for device ${deviceId}`);
      return false;
    }

    const socket = this.server.sockets.sockets.get(socketId);
    if (!socket) {
      this.logger.warn(`Socket not found for device ${deviceId}`);
      return false;
    }

    socket.emit('binary', audioData);
    return true;
  }

  /**
   * 广播消息到所有设备
   */
  broadcastMessage(message: any, excludeDeviceId?: string) {
    this.server.emit('message', message);
    this.logger.debug(`Broadcasted message to all devices`);
  }

  /**
   * 获取设备列表
   */
  getConnectedDevices(): string[] {
    return Array.from(this.socketToDeviceMap.values());
  }

  /**
   * 获取连接统计
   */
  getConnectionStats() {
    return {
      totalConnections: this.server.sockets.sockets.size,
      deviceCount: this.socketToDeviceMap.size,
      devices: Array.from(this.socketToDeviceMap.entries()).map(([socketId, deviceId]) => ({
        socketId,
        deviceId,
      })),
    };
  }

  /**
   * 提取设备ID
   */
  private extractDeviceId(client: Socket): string {
    // 从 auth 或 query 中获取 deviceId
    const deviceId = client.handshake.auth.deviceId || 
                     client.handshake.query.deviceId ||
                     client.handshake.headers['device-id'] as string;
    
    if (deviceId) {
      return deviceId;
    }

    // 生成临时设备ID
    return `temp-${client.id}`;
  }

  /**
   * 发送 Hello 消息
   */
  private sendHelloMessage(client: Socket, deviceId: string) {
    const helloMessage = {
      type: 'hello',
      transport: 'websocket',
      session_id: this.generateSessionId(),
      audio_params: {
        format: 'opus',
        sample_rate: 24000,
        channels: 1,
        frame_duration: 60,
      },
    };

    client.emit('message', helloMessage);
    this.logger.debug(`Sent hello message to device ${deviceId}`);
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 根据设备ID获取 Socket ID
   */
  private getSocketIdByDeviceId(deviceId: string): string | undefined {
    for (const [socketId, devId] of this.socketToDeviceMap.entries()) {
      if (devId === deviceId) {
        return socketId;
      }
    }
    return undefined;
  }
}
