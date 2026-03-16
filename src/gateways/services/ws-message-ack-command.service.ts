import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import { MessageReceiptService } from '../../modules/message/message-receipt.service';
import { MessageStatus } from '../../modules/message/message.interface';
import { MessageService } from '../../modules/message/message.service';
import { WsAckRetryService } from './ws-ack-retry.service';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';
import { isAckStatus, normalizeIdentifier } from '../utils/ws-payload-validator.util';

export interface WsMessageAckCommand {
  server: Server;
  authenticatedUserId: string;
  messageId: string;
  status: 'delivered' | 'read';
}

export interface WsMessageAckTelemetry {
  fromUserId?: string;
  toUserId?: string;
  clientMessageId?: string;
  serverMessageId?: string;
  ackStatus: 'delivered' | 'read';
  success: boolean;
  errorCode?: string;
  error?: string;
  latencyMs: number;
}

@Injectable()
export class WsMessageAckCommandService {
  private readonly logger = new Logger(WsMessageAckCommandService.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly messageReceiptService: MessageReceiptService,
    private readonly wsAckRetryService: WsAckRetryService,
    private readonly wsMessageEventEmitter: WsMessageEventEmitterService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly prometheusService?: PrometheusService,
  ) {}

  async execute(command: WsMessageAckCommand): Promise<Record<string, unknown>> {
    const { server, authenticatedUserId, messageId, status } = command;
    const startedAt = Date.now();
    const normalizedMessageId = normalizeIdentifier(messageId);
    const normalizedUserId = normalizeIdentifier(authenticatedUserId);

    if (!normalizedUserId) {
      this.recordValidationFailure('message_ack', 'invalid_user');
      this.emitTelemetry({
        ackStatus: status,
        success: false,
        errorCode: 'invalid_user',
        error: 'Invalid authenticated user',
        latencyMs: Date.now() - startedAt,
      });
      return { success: false, error: 'Invalid authenticated user' };
    }
    if (!normalizedMessageId) {
      this.recordValidationFailure('message_ack', 'invalid_message_id');
      this.emitTelemetry({
        ackStatus: status,
        success: false,
        errorCode: 'invalid_message_id',
        error: 'messageId is required',
        latencyMs: Date.now() - startedAt,
      });
      return { success: false, error: 'messageId is required' };
    }
    if (!isAckStatus(status)) {
      this.recordValidationFailure('message_ack', 'invalid_ack_status');
      this.emitTelemetry({
        ackStatus: status === 'delivered' || status === 'read' ? status : 'delivered',
        success: false,
        errorCode: 'invalid_ack_status',
        error: 'Invalid ack status',
        latencyMs: Date.now() - startedAt,
      });
      return { success: false, error: 'Invalid ack status' };
    }

    const ackEntry = await this.wsAckRetryService.findPendingAck(normalizedMessageId);
    const ackEntryKey = ackEntry?.key;
    const ackInfo = ackEntry?.value;
    if (!ackInfo) {
      this.logger.warn(`Ignoring ACK for unknown message: ${normalizedMessageId}`);
      this.emitTelemetry({
        ackStatus: status,
        success: false,
        errorCode: 'unknown_message_id',
        error: 'Unknown messageId',
        latencyMs: Date.now() - startedAt,
      });
      return { success: false, error: 'Unknown messageId' };
    }

    if (ackInfo.toUserId !== normalizedUserId) {
      this.logger.warn(
        `User ${normalizedUserId} attempted to ACK message ${normalizedMessageId} for recipient ${ackInfo.toUserId}`,
      );
      this.recordValidationFailure('message_ack', 'invalid_ack_sender');
      this.emitTelemetry({
        fromUserId: ackInfo.fromUserId,
        toUserId: ackInfo.toUserId,
        clientMessageId: ackInfo.clientMessageId,
        serverMessageId: ackInfo.messageId,
        ackStatus: status,
        success: false,
        errorCode: 'invalid_ack_sender',
        error: 'Invalid ack sender',
        latencyMs: Date.now() - startedAt,
      });
      return { success: false, error: 'Invalid ack sender' };
    }

    await this.wsAckRetryService.removePendingAck(ackEntryKey!, ackInfo.clientMessageId);
    this.logger.debug(`Message ${ackEntryKey} acknowledged with status: ${status}`);

    const mappedStatus = status === 'read' ? MessageStatus.READ : MessageStatus.DELIVERED;
    await this.messageService.updateMessageStatus(ackInfo.messageId, mappedStatus).catch((error) => {
      this.logger.warn(`Failed to update message status for ${ackInfo.messageId}: ${error?.message || error}`);
    });
    await this.messageReceiptService.upsertReceipt(
      ackInfo.messageId,
      normalizedUserId,
      mappedStatus,
      'gateway_ack',
    );

    server.to(`user:${ackInfo.fromUserId}`).emit(
      'messageAcknowledged',
      this.wsMessageEventEmitter.buildMessageEventPayload(
        'messageAcknowledged',
        {
          messageId: ackInfo.clientMessageId || ackInfo.messageId,
          serverMessageId: ackInfo.messageId,
          status,
          timestamp: Date.now(),
        },
        mappedStatus,
      ),
    );

    this.emitTelemetry({
      fromUserId: ackInfo.fromUserId,
      toUserId: ackInfo.toUserId,
      clientMessageId: ackInfo.clientMessageId,
      serverMessageId: ackInfo.messageId,
      ackStatus: status,
      success: true,
      latencyMs: Date.now() - startedAt,
    });

    return { success: true };
  }

  private emitTelemetry(payload: WsMessageAckTelemetry): void {
    this.eventEmitter.emit('ws.message.ack.result', payload);
  }

  private recordValidationFailure(domain: string, errorCode: string): void {
    this.prometheusService?.incrementWsValidationFailure('command', domain, errorCode);
  }
}
