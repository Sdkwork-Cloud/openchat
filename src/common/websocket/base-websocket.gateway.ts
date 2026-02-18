import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface BaseClientInfo {
  id: string;
  socketId: string;
  serverId: string;
  connectedAt: number;
  metadata?: Record<string, any>;
}

export interface AckConfig {
  timeout: number;
  maxRetries: number;
  checkInterval: number;
}

export interface PendingAck {
  messageId: string;
  fromUserId: string;
  toUserId: string;
  timestamp: number;
  retryCount: number;
  payload?: any;
}

export interface GatewayOptions {
  namespace?: string;
  corsOrigins?: string[];
  pingTimeout?: number;
  pingInterval?: number;
  maxHttpBufferSize?: number;
  transports?: ('websocket' | 'polling')[];
  ackConfig?: Partial<AckConfig>;
}

export interface ConnectionStats {
  totalConnections: number;
  uniqueUsers: number;
  serverId: string;
  uptime: number;
}

const DEFAULT_ACK_CONFIG: AckConfig = {
  timeout: 30000,
  maxRetries: 3,
  checkInterval: 5000,
};

@Injectable()
export abstract class BaseWebSocketGateway<T extends BaseClientInfo = BaseClientInfo>
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  protected logger: Logger;
  readonly serverId: string;
  readonly ackConfig: AckConfig;

  readonly localClients = new Map<string, T>();
  readonly userSockets = new Map<string, Set<string>>();
  readonly pendingAcks = new Map<string, PendingAck>();
  readonly connectionTimeouts = new Map<string, NodeJS.Timeout>();

  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private ackCheckInterval?: NodeJS.Timeout;
  private startTime: number;

  constructor(protected readonly configService: ConfigService) {
    this.serverId = `${process.env.POD_NAME || 'server'}-${process.pid}-${uuidv4().slice(0, 8)}`;
    this.ackConfig = { ...DEFAULT_ACK_CONFIG };
    this.logger = new Logger(this.constructor.name);
    this.startTime = Date.now();
  }

  async afterInit(server: Server) {
    this.logger.log(`WebSocket gateway initialized with serverId: ${this.serverId}`);

    await this.onGatewayInit(server);

    this.startHeartbeat();
    this.startCleanupTask();
    this.startAckCheckTask();
  }

  async handleConnection(client: Socket) {
    const ip = client.handshake.address;
    this.logger.log(`Client connected: ${client.id} from ${ip}`);

    const connectionLimit = this.configService.get<number>('WS_CONNECTION_LIMIT', 10);
    const connectionCount = await this.incrementConnectionCount(ip);

    if (connectionCount > connectionLimit) {
      this.logger.warn(`Connection limit exceeded for IP: ${ip}`);
      await this.decrementConnectionCount(ip);
      client.disconnect(true);
      return;
    }

    const authTimeout = this.configService.get<number>('WS_AUTH_TIMEOUT', 30000);
    const timeout = setTimeout(() => {
      if (!this.localClients.has(client.id)) {
        this.logger.warn(`Connection timeout for unregistered client: ${client.id}`);
        this.connectionTimeouts.delete(client.id);
        client.disconnect(true);
      }
    }, authTimeout);
    this.connectionTimeouts.set(client.id, timeout);

    await this.onClientConnect(client, ip);
  }

  async handleDisconnect(client: Socket) {
    const timeout = this.connectionTimeouts.get(client.id);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(client.id);
    }

    const clientInfo = this.localClients.get(client.id);

    if (clientInfo) {
      await this.unregisterClient(client, clientInfo);
      await this.onClientDisconnect(client, clientInfo);
    }

    const ip = client.handshake.address;
    await this.decrementConnectionCount(ip);

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  onModuleDestroy() {
    this.logger.log('Cleaning up WebSocket gateway resources...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.ackCheckInterval) {
      clearInterval(this.ackCheckInterval);
    }

    this.localClients.clear();
    this.userSockets.clear();
    this.pendingAcks.clear();
    this.connectionTimeouts.clear();

    this.logger.log('WebSocket gateway resources cleaned up');
  }

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { id: string; metadata?: Record<string, any> },
    @ConnectedSocket() client: Socket,
  ) {
    const { id, metadata } = data;

    if (!id) {
      return { success: false, error: 'Id is required' };
    }

    const clientInfo = this.createClientInfo(client, id, metadata);
    await this.registerClient(client, clientInfo);

    await client.join(`user:${id}`);

    this.logger.log(`Client ${id} registered with socket ${client.id}`);

    return {
      success: true,
      message: 'Registered successfully',
      serverId: this.serverId,
    };
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const clientInfo = this.localClients.get(client.id);
    if (clientInfo) {
      await this.updateClientHeartbeat(clientInfo);
      return { success: true, timestamp: Date.now() };
    }
    return { success: false, error: 'Not registered' };
  }

  protected createClientInfo(client: Socket, id: string, metadata?: Record<string, any>): T {
    return {
      id,
      socketId: client.id,
      serverId: this.serverId,
      connectedAt: Date.now(),
      metadata,
    } as T;
  }

  protected async registerClient(client: Socket, clientInfo: T): Promise<void> {
    this.localClients.set(client.id, clientInfo);

    if (!this.userSockets.has(clientInfo.id)) {
      this.userSockets.set(clientInfo.id, new Set());
    }
    this.userSockets.get(clientInfo.id)!.add(client.id);
  }

  protected async unregisterClient(client: Socket, clientInfo: T): Promise<void> {
    this.localClients.delete(client.id);

    const userSockets = this.userSockets.get(clientInfo.id);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.userSockets.delete(clientInfo.id);
      }
    }
  }

  protected async onGatewayInit(server: Server): Promise<void> {}

  protected async onClientConnect(client: Socket, ip: string): Promise<void> {}

  protected async onClientDisconnect(client: Socket, clientInfo: T): Promise<void> {}

  protected async updateClientHeartbeat(clientInfo: T): Promise<void> {}

  protected async incrementConnectionCount(ip: string): Promise<number> {
    return 1;
  }

  protected async decrementConnectionCount(ip: string): Promise<void> {}

  protected startHeartbeat(): void {
    const interval = this.configService.get<number>('WS_HEARTBEAT_INTERVAL', 10000);
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, interval);
  }

  protected async sendHeartbeat(): Promise<void> {}

  protected startCleanupTask(): void {
    const interval = this.configService.get<number>('WS_CLEANUP_INTERVAL', 60000);
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupStaleConnections();
    }, interval);
  }

  protected async cleanupStaleConnections(): Promise<void> {}

  protected startAckCheckTask(): void {
    this.ackCheckInterval = setInterval(() => {
      this.checkPendingAcks();
    }, this.ackConfig.checkInterval);
  }

  protected checkPendingAcks(): void {
    const now = Date.now();

    for (const [messageId, ackInfo] of this.pendingAcks.entries()) {
      const elapsed = now - ackInfo.timestamp;

      if (elapsed > this.ackConfig.timeout) {
        if (ackInfo.retryCount < this.ackConfig.maxRetries) {
          this.retryMessage(ackInfo);
          ackInfo.retryCount++;
          ackInfo.timestamp = now;
        } else {
          this.logger.warn(`Message ${messageId} failed after ${this.ackConfig.maxRetries} retries`);
          this.handleAckFailure(ackInfo);
          this.pendingAcks.delete(messageId);
        }
      }
    }
  }

  protected retryMessage(ackInfo: PendingAck): void {
    this.logger.debug(`Retrying message ${ackInfo.messageId}, attempt ${ackInfo.retryCount + 1}`);
    this.server.to(`user:${ackInfo.toUserId}`).emit('messageRetry', {
      messageId: ackInfo.messageId,
      attempt: ackInfo.retryCount + 1,
      timestamp: Date.now(),
    });
  }

  protected handleAckFailure(ackInfo: PendingAck): void {
    this.server.to(`user:${ackInfo.fromUserId}`).emit('messageFailed', {
      messageId: ackInfo.messageId,
      error: 'Message delivery failed',
      timestamp: Date.now(),
    });
  }

  addPendingAck(messageId: string, fromUserId: string, toUserId: string, payload?: any): void {
    this.pendingAcks.set(messageId, {
      messageId,
      fromUserId,
      toUserId,
      timestamp: Date.now(),
      retryCount: 0,
      payload,
    });
  }

  removePendingAck(messageId: string): PendingAck | undefined {
    const ack = this.pendingAcks.get(messageId);
    this.pendingAcks.delete(messageId);
    return ack;
  }

  async notifyUser(userId: string, event: string, data: any): Promise<void> {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async notifyUsers(userIds: string[], event: string, data: any): Promise<void> {
    const rooms = userIds.map((id) => `user:${id}`);
    this.server.to(rooms).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async notifyRoom(roomId: string, event: string, data: any): Promise<void> {
    this.server.to(`room:${roomId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async notifyGroup(groupId: string, event: string, data: any): Promise<void> {
    this.server.to(`group:${groupId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async broadcast(event: string, data: any): Promise<void> {
    this.server.emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  getConnectionStats(): ConnectionStats {
    return {
      totalConnections: this.localClients.size,
      uniqueUsers: this.userSockets.size,
      serverId: this.serverId,
      uptime: Date.now() - this.startTime,
    };
  }
}
