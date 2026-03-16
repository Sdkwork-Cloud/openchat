import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  MessageEventEnvelope,
  MessageRealtimeEventType,
  buildMessageEventPayload,
} from '../../modules/message/message-event-envelope.util';
import { MessageEventStateKey } from '../../modules/message/message-state.util';

@Injectable()
export class WsMessageEventEmitterService {
  buildMessageEventPayload<T extends object>(
    eventType: MessageRealtimeEventType,
    payload: T,
    status?: MessageEventStateKey,
  ): T & MessageEventEnvelope {
    return buildMessageEventPayload(eventType, payload, { status });
  }

  emitToUser(server: Server, userId: string, event: string, payload: Record<string, unknown>): void {
    server.to(`user:${userId}`).emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  emitToUsers(server: Server, userIds: string[], event: string, payload: Record<string, unknown>): void {
    const rooms = userIds.map((id) => `user:${id}`);
    server.to(rooms).emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  emitToGroup(server: Server, groupId: string, event: string, payload: Record<string, unknown>): void {
    server.to(`group:${groupId}`).emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  emitToRoom(server: Server, room: string, event: string, payload: Record<string, unknown>): void {
    server.to(room).emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  emitToRoomExceptClient(client: Socket, room: string, event: string, payload: Record<string, unknown>): void {
    client.to(room).emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  emitBroadcast(server: Server, event: string, payload: Record<string, unknown>): void {
    server.emit(event, {
      ...payload,
      timestamp: Date.now(),
    });
  }
}
