import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface WsSystemClientInfo {
  userId: string;
  deviceId?: string;
}

export type SystemMessage =
  | { type: 'kickUser'; userId: string }
  | { type: 'kickDevice'; userId: string; deviceId: string }
  | { type: 'kickUserExceptDevice'; userId: string; keepDeviceId: string }
  | { type: 'broadcast'; payload: Record<string, unknown> };

@Injectable()
export class WsSystemMessageService {
  private readonly logger = new Logger(WsSystemMessageService.name);

  handleRawSystemMessage(
    channel: string,
    message: string,
    server: Server,
    localClients: Map<string, WsSystemClientInfo>,
  ): void {
    if (channel !== 'openchat:system') {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(message);
      if (!this.isSystemMessage(parsed)) {
        this.logger.warn('Ignored invalid system message payload');
        return;
      }
      this.handleSystemMessage(parsed, server, localClients);
    } catch (error) {
      this.logger.error('Failed to parse system message:', error);
    }
  }

  handleSystemMessage(
    data: SystemMessage,
    server: Server,
    localClients: Map<string, WsSystemClientInfo>,
  ): void {
    switch (data.type) {
      case 'kickUser':
        localClients.forEach((info, socketId) => {
          if (info.userId === data.userId) {
            server.sockets.sockets.get(socketId)?.disconnect(true);
          }
        });
        return;
      case 'kickDevice':
        localClients.forEach((info, socketId) => {
          if (info.userId === data.userId && info.deviceId === data.deviceId) {
            server.sockets.sockets.get(socketId)?.disconnect(true);
          }
        });
        return;
      case 'kickUserExceptDevice':
        localClients.forEach((info, socketId) => {
          if (info.userId === data.userId && info.deviceId !== data.keepDeviceId) {
            server.sockets.sockets.get(socketId)?.disconnect(true);
          }
        });
        return;
      case 'broadcast':
        server.emit('systemBroadcast', data.payload);
        return;
    }
  }

  isSystemMessage(payload: unknown): payload is SystemMessage {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const record = payload as Record<string, unknown>;
    const type = record.type;
    if (type === 'kickUser') {
      return typeof record.userId === 'string' && record.userId.trim().length > 0;
    }
    if (type === 'kickDevice') {
      return (
        typeof record.userId === 'string'
        && record.userId.trim().length > 0
        && typeof record.deviceId === 'string'
        && record.deviceId.trim().length > 0
      );
    }
    if (type === 'kickUserExceptDevice') {
      return (
        typeof record.userId === 'string'
        && record.userId.trim().length > 0
        && typeof record.keepDeviceId === 'string'
        && record.keepDeviceId.trim().length > 0
      );
    }
    if (type === 'broadcast') {
      return Boolean(record.payload) && typeof record.payload === 'object';
    }

    return false;
  }
}
