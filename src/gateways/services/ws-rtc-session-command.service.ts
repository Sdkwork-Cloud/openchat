import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { Socket } from 'socket.io';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import { normalizeMessageEventTransport } from '../../modules/message/message-event-transport.util';
import { RTCService } from '../../modules/rtc/rtc.service';
import {
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
    @Optional()
    private readonly rtcService?: Pick<RTCService, 'getRoomById'>,
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
    if (payload.fromUserId && !normalizedFromUserId) {
      this.recordValidationFailure('rtc_signal', 'invalid_sender');
      return { success: false, error: 'Invalid sender' };
    }

    if (normalizedFromUserId && normalizedFromUserId !== normalizedAuthenticatedUserId) {
      this.recordValidationFailure('rtc_signal', 'invalid_sender');
      return { success: false, error: 'Invalid sender' };
    }

    const normalizedSignalPayload = this.normalizeRtcSignalRelayPayload(
      normalizedRoomId,
      normalizedToUserId,
      normalizedSignalType,
      payload.signal,
    );
    if (!normalizedSignalPayload) {
      this.recordValidationFailure('rtc_signal', 'invalid_signal_payload');
      return { success: false, error: 'Invalid rtc signal payload' };
    }

    const senderRoomValidation = await this.validateRtcRoomParticipant(
      'rtc_signal',
      normalizedRoomId,
      normalizedAuthenticatedUserId,
      'Sender is not a participant of this RTC room',
      'sender_not_participant',
    );
    if (!senderRoomValidation.success) {
      return senderRoomValidation.result;
    }

    const targetRoomValidation = await this.validateRtcRoomParticipant(
      'rtc_signal',
      normalizedRoomId,
      normalizedToUserId,
      'Target user is not a participant of this RTC room',
      'target_not_participant',
    );
    if (!targetRoomValidation.success) {
      return targetRoomValidation.result;
    }

    client.nsp.to(`user:${normalizedToUserId}`).emit('rtcSignal', {
      ...payload,
      fromUserId: normalizedAuthenticatedUserId,
      toUserId: normalizedToUserId,
      roomId: normalizedRoomId,
      type: normalizedSignalType,
      signal: normalizedSignalPayload,
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

    const roomValidation = await this.validateRtcRoomParticipant(
      'rtc_room',
      normalizedRoomId,
      normalizedAuthenticatedUserId,
      'User is not a participant of this RTC room',
      'user_not_participant',
    );
    if (!roomValidation.success) {
      return roomValidation.result;
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

    const roomValidation = await this.validateRtcRoomParticipant(
      'rtc_room',
      normalizedRoomId,
      normalizedAuthenticatedUserId,
      'User is not a participant of this RTC room',
      'user_not_participant',
    );
    if (!roomValidation.success) {
      return roomValidation.result;
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

  private normalizeRtcSignalRelayPayload(
    roomId: string,
    toUserId: string,
    signalType: 'offer' | 'answer' | 'ice-candidate',
    signal: unknown,
  ): Record<string, unknown> | undefined {
    try {
      const normalizedEvent = normalizeMessageEventTransport(
        {
          type: 'RTC_SIGNAL',
          data: {
            roomId,
            toUserId,
            signalType,
            payload: signal,
          },
        },
        {
          type: 'single',
          targetId: toUserId,
        },
      );
      const normalizedPayload = normalizedEvent.data?.payload;
      if (!normalizedPayload || typeof normalizedPayload !== 'object' || Array.isArray(normalizedPayload)) {
        return undefined;
      }

      return { ...(normalizedPayload as Record<string, unknown>) };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return undefined;
      }
      throw error;
    }
  }

  private async validateRtcRoomParticipant(
    domain: string,
    roomId: string,
    userId: string,
    errorMessage: string,
    errorCode: string,
  ): Promise<{
    success: true;
  } | {
    success: false;
    result: Record<string, unknown>;
  }> {
    const roomValidation = await this.ensureRtcRoomActive(domain, roomId);
    if (!roomValidation.success) {
      return roomValidation;
    }

    if (!roomValidation.participants.has(userId)) {
      this.recordValidationFailure(domain, errorCode);
      return {
        success: false,
        result: { success: false, error: errorMessage },
      };
    }

    return { success: true };
  }

  private async ensureRtcRoomActive(
    domain: string,
    roomId: string,
  ): Promise<{
    success: true;
    participants: Set<string>;
  } | {
    success: false;
    result: Record<string, unknown>;
  }> {
    if (!this.rtcService) {
      this.recordValidationFailure(domain, 'rtc_service_unavailable');
      return {
        success: false,
        result: { success: false, error: 'RTC room service unavailable' },
      };
    }

    const room = await this.rtcService.getRoomById(roomId);
    if (!room) {
      this.recordValidationFailure(domain, 'room_not_found');
      return {
        success: false,
        result: { success: false, error: 'RTC room not found' },
      };
    }

    if (room.status !== 'active') {
      this.recordValidationFailure(domain, 'room_inactive');
      return {
        success: false,
        result: { success: false, error: 'RTC room is not active' },
      };
    }

    return {
      success: true,
      participants: new Set(
        (Array.isArray(room.participants) ? room.participants : [])
          .map((participant) => normalizeIdentifier(participant))
          .filter((participant): participant is string => !!participant),
      ),
    };
  }
}
