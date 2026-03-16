import { Injectable, Logger, Optional } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import {
  isValidRtcSignalPayload,
  normalizeIdentifier,
  normalizeRtcSignalType,
} from '../utils/ws-payload-validator.util';

export interface WsRtcSignalCommand {
  client: Socket;
  authenticatedUserId: string;
  payload: {
    fromUserId?: string;
    toUserId: string;
    roomId: string;
    signal: unknown;
    type: 'offer' | 'answer' | 'ice-candidate';
  };
}

export interface WsRtcRoomCommand {
  client: Socket;
  authenticatedUserId: string;
  roomId: string;
}

@Injectable()
export class WsRtcSessionCommandService {
  private readonly logger = new Logger(WsRtcSessionCommandService.name);

  constructor(
    @Optional() private readonly prometheusService?: PrometheusService,
  ) {}

  async relaySignal(command: WsRtcSignalCommand): Promise<Record<string, unknown>> {
    const { client, authenticatedUserId, payload } = command;
    const normalizedAuthenticatedUserId = normalizeIdentifier(authenticatedUserId);
    const normalizedToUserId = normalizeIdentifier(payload.toUserId);
    const normalizedRoomId = normalizeIdentifier(payload.roomId);
    const normalizedSignalType = normalizeRtcSignalType(payload.type);
    const normalizedFromUserId = payload.fromUserId
      ? normalizeIdentifier(payload.fromUserId)
      : undefined;

    if (!normalizedAuthenticatedUserId || !normalizedToUserId || !normalizedRoomId || !normalizedSignalType) {
      this.recordValidationFailure('rtc_signal', 'invalid_signal_identifiers');
      return { success: false, error: 'Invalid rtc signal payload' };
    }
    if (!isValidRtcSignalPayload(payload.signal)) {
      this.recordValidationFailure('rtc_signal', 'invalid_signal_payload');
      return { success: false, error: 'Invalid rtc signal payload' };
    }
    if (payload.fromUserId && !normalizedFromUserId) {
      this.recordValidationFailure('rtc_signal', 'invalid_sender');
      return { success: false, error: 'Invalid sender' };
    }

    if (normalizedFromUserId && normalizedFromUserId !== normalizedAuthenticatedUserId) {
      this.recordValidationFailure('rtc_signal', 'invalid_sender');
      return { success: false, error: 'Invalid sender' };
    }

    client.nsp.to(`user:${normalizedToUserId}`).emit('rtcSignal', {
      ...payload,
      fromUserId: normalizedAuthenticatedUserId,
      toUserId: normalizedToUserId,
      roomId: normalizedRoomId,
      type: normalizedSignalType,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  async joinRoom(command: WsRtcRoomCommand): Promise<Record<string, unknown>> {
    const { client, authenticatedUserId, roomId } = command;
    const normalizedAuthenticatedUserId = normalizeIdentifier(authenticatedUserId);
    const normalizedRoomId = normalizeIdentifier(roomId);
    if (!normalizedAuthenticatedUserId) {
      this.recordValidationFailure('rtc_room', 'invalid_authenticated_user');
      return { success: false, error: 'Invalid authenticated user' };
    }
    if (!normalizedRoomId) {
      this.recordValidationFailure('rtc_room', 'invalid_room_id');
      return { success: false, error: 'roomId is required' };
    }

    await client.join(`rtc:${normalizedRoomId}`);
    client.to(`rtc:${normalizedRoomId}`).emit('userJoined', {
      userId: normalizedAuthenticatedUserId,
      roomId: normalizedRoomId,
      timestamp: Date.now(),
    });

    this.logger.log(`User ${normalizedAuthenticatedUserId} joined RTC room ${normalizedRoomId}`);
    return { success: true };
  }

  async leaveRoom(command: WsRtcRoomCommand): Promise<Record<string, unknown>> {
    const { client, authenticatedUserId, roomId } = command;
    const normalizedAuthenticatedUserId = normalizeIdentifier(authenticatedUserId);
    const normalizedRoomId = normalizeIdentifier(roomId);
    if (!normalizedAuthenticatedUserId) {
      this.recordValidationFailure('rtc_room', 'invalid_authenticated_user');
      return { success: false, error: 'Invalid authenticated user' };
    }
    if (!normalizedRoomId) {
      this.recordValidationFailure('rtc_room', 'invalid_room_id');
      return { success: false, error: 'roomId is required' };
    }

    await client.leave(`rtc:${normalizedRoomId}`);
    client.to(`rtc:${normalizedRoomId}`).emit('userLeft', {
      userId: normalizedAuthenticatedUserId,
      roomId: normalizedRoomId,
      timestamp: Date.now(),
    });

    this.logger.log(`User ${normalizedAuthenticatedUserId} left RTC room ${normalizedRoomId}`);
    return { success: true };
  }

  private recordValidationFailure(domain: string, errorCode: string): void {
    this.prometheusService?.incrementWsValidationFailure('command', domain, errorCode);
  }

}
