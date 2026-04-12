import { createHash } from 'crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { PrometheusService } from '../../common/metrics/prometheus.service';
import { MessageReceiptService } from '../../modules/message/message-receipt.service';
import { MessageContent, MessageStatus, MessageType } from '../../modules/message/message.interface';
import { MessageService } from '../../modules/message/message.service';
import { PendingAckInfo, WsAckRetryService } from './ws-ack-retry.service';
import { WsGroupAuthorizationService } from './ws-group-authorization.service';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';
import {
  isNonNegativeSafeInteger,
  normalizeIdentifier,
  normalizeMessageContent,
  normalizeMessageTypeToken,
} from '../utils/ws-payload-validator.util';

export interface WsSendSingleMessageCommand {
  server: Server;
  client: Socket;
  fromUserId: string;
  toUserId: string;
  clientMessageId: string;
  content: string;
  type: string;
  requireAck?: boolean;
  clientSeq?: number;
  idempotencyKey?: string;
  needReadReceipt?: boolean;
  extra?: Record<string, unknown>;
}

export interface WsSendGroupMessageCommand {
  server: Server;
  client: Socket;
  fromUserId: string;
  groupId: string;
  clientMessageId: string;
  content: string;
  type: string;
  clientSeq?: number;
  idempotencyKey?: string;
}

export interface WsMessageCommandTelemetry {
  conversationType: 'single' | 'group';
  fromUserId: string;
  targetId: string;
  clientMessageId: string;
  serverMessageId?: string;
  success: boolean;
  duplicate?: boolean;
  latencyMs: number;
  stage: 'persist' | 'dispatch' | 'exception';
  errorCode?: string;
  error?: string;
  ackRequired?: boolean;
  ackQueued?: boolean;
}

interface NormalizedSingleMessageCommand {
  server: Server;
  client: Socket;
  fromUserId: string;
  toUserId: string;
  clientMessageId: string;
  content: string;
  type: MessageType;
  requireAck: boolean;
  clientSeq?: number;
  idempotencyKey?: string;
  needReadReceipt?: boolean;
  extra?: Record<string, unknown>;
}

interface NormalizedGroupMessageCommand {
  server: Server;
  client: Socket;
  fromUserId: string;
  groupId: string;
  clientMessageId: string;
  content: string;
  type: MessageType;
  clientSeq?: number;
  idempotencyKey?: string;
}

interface NormalizedSingleMessageResult {
  data?: NormalizedSingleMessageCommand;
  error?: string;
  errorCode?: string;
}

interface NormalizedGroupMessageResult {
  data?: NormalizedGroupMessageCommand;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class WsMessageCommandService {
  private readonly logger = new Logger(WsMessageCommandService.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly messageReceiptService: MessageReceiptService,
    private readonly wsAckRetryService: WsAckRetryService,
    private readonly wsGroupAuthorizationService: WsGroupAuthorizationService,
    private readonly wsMessageEventEmitter: WsMessageEventEmitterService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly prometheusService?: PrometheusService,
  ) {}

  async sendSingleMessage(command: WsSendSingleMessageCommand): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const normalized = this.normalizeSingleMessageCommand(command);
    if (normalized.error || !normalized.data) {
      const validationCode = normalized.errorCode || 'invalid_command';
      this.recordValidationFailure('message_single', validationCode);
      this.emitTelemetry({
        conversationType: 'single',
        fromUserId: this.telemetryIdentifier(command.fromUserId),
        targetId: this.telemetryIdentifier(command.toUserId),
        clientMessageId: this.telemetryIdentifier(command.clientMessageId),
        success: false,
        latencyMs: Date.now() - startedAt,
        stage: 'persist',
        errorCode: validationCode,
        error: normalized.error || 'Invalid message command',
        ackRequired: command.requireAck === undefined ? true : !!command.requireAck,
        ackQueued: false,
      });
      return {
        success: false,
        error: normalized.error || 'Invalid message command',
      };
    }

    const {
      server,
      client,
      fromUserId,
      toUserId,
      clientMessageId,
      content,
      type,
      requireAck,
      clientSeq,
      idempotencyKey,
      needReadReceipt,
      extra,
    } = normalized.data;

    const now = Date.now();
    const messagePayload = {
      fromUserId,
      toUserId,
      messageId: clientMessageId,
      content,
      type,
      clientSeq,
      idempotencyKey,
      needReadReceipt,
      extra,
      timestamp: now,
      requireAck,
    };

    try {
      const normalizedClientSeq = this.resolveClientSeq(
        clientSeq,
        idempotencyKey || clientMessageId,
        fromUserId,
        toUserId,
        undefined,
      );

      const sendResult = await this.messageService.sendMessage({
        uuid: uuidv4(),
        fromUserId,
        toUserId,
        type,
        content: this.buildMessageContent(type, content),
        ...(normalizedClientSeq !== undefined ? { clientSeq: normalizedClientSeq } : {}),
        needReadReceipt,
        extra: extra as Record<string, unknown> | undefined,
      });

      if (!sendResult.success || !sendResult.message) {
        this.emitTelemetry({
          conversationType: 'single',
          fromUserId,
          targetId: toUserId,
          clientMessageId,
          success: false,
          latencyMs: Date.now() - startedAt,
          stage: 'persist',
          errorCode: 'persist_failed',
          error: sendResult.error || 'Failed to persist message',
          ackRequired: requireAck,
          ackQueued: false,
        });
        return {
          success: false,
          error: sendResult.error || 'Failed to persist message',
          messageId: clientMessageId,
        };
      }

      const persistedMessage = sendResult.message;
      const persistedMessageId = persistedMessage.id;
      const outboundMessage = {
        ...messagePayload,
        messageId: persistedMessageId,
        serverMessageId: persistedMessageId,
        clientMessageId,
        status: persistedMessage.status,
      };

      this.logger.debug(
        `Message persisted ${persistedMessageId} and sent via WukongIM from ${fromUserId} to ${toUserId}`,
      );

      await this.messageReceiptService.upsertReceipt(
        persistedMessageId,
        toUserId,
        MessageStatus.SENT,
        'gateway_send',
      );

      server.to(`user:${toUserId}`).emit(
        'newMessage',
        this.wsMessageEventEmitter.buildMessageEventPayload('newMessage', outboundMessage, persistedMessage.status),
      );

      let ackQueued = false;
      if (requireAck) {
        const pendingAckInfo: PendingAckInfo = {
          messageId: persistedMessageId,
          clientMessageId,
          fromUserId,
          toUserId,
          payload: outboundMessage,
          timestamp: Date.now(),
          retryCount: 0,
        };
        try {
          await this.wsAckRetryService.storePendingAck(pendingAckInfo);
          ackQueued = true;
        } catch (error) {
          this.logger.warn(
            `Failed to store pending ACK for message ${persistedMessageId}: ${this.extractErrorMessage(error)}`,
          );
        }
      }

      client.emit(
        'messageSent',
        this.wsMessageEventEmitter.buildMessageEventPayload(
          'messageSent',
          {
            messageId: clientMessageId,
            serverMessageId: persistedMessageId,
            status: sendResult.isDuplicate ? 'duplicate' : 'sent',
            timestamp: Date.now(),
          },
          sendResult.isDuplicate ? 'duplicate' : MessageStatus.SENT,
        ),
      );

      this.logger.debug(`Message ${persistedMessageId} sent from ${fromUserId} to ${toUserId}`);
      this.emitTelemetry({
        conversationType: 'single',
        fromUserId,
        targetId: toUserId,
        clientMessageId,
        serverMessageId: persistedMessageId,
        success: true,
        duplicate: sendResult.isDuplicate,
        latencyMs: Date.now() - startedAt,
        stage: 'dispatch',
        ackRequired: requireAck,
        ackQueued,
      });

      return {
        success: true,
        messageId: clientMessageId,
        serverMessageId: persistedMessageId,
        status: sendResult.isDuplicate ? 'duplicate' : 'sent',
        timestamp: Date.now(),
      };
    } catch (error: unknown) {
      const errorMessage = this.extractErrorMessage(error);
      this.logger.error(`Failed to send message ${clientMessageId}:`, error);
      this.emitTelemetry({
        conversationType: 'single',
        fromUserId,
        targetId: toUserId,
        clientMessageId,
        success: false,
        latencyMs: Date.now() - startedAt,
        stage: 'exception',
        errorCode: 'send_exception',
        error: errorMessage,
        ackRequired: requireAck,
        ackQueued: false,
      });

      client.emit(
        'messageFailed',
        this.wsMessageEventEmitter.buildMessageEventPayload(
          'messageFailed',
          {
            messageId: clientMessageId,
            error: `Failed to send message: ${errorMessage}`,
            timestamp: Date.now(),
          },
          MessageStatus.FAILED,
        ),
      );

      return {
        success: false,
        error: `Failed to send message: ${errorMessage}`,
        messageId: clientMessageId,
      };
    }
  }

  async sendGroupMessage(command: WsSendGroupMessageCommand): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const normalized = this.normalizeGroupMessageCommand(command);
    if (normalized.error || !normalized.data) {
      const validationCode = normalized.errorCode || 'invalid_command';
      this.recordValidationFailure('message_group', validationCode);
      this.emitTelemetry({
        conversationType: 'group',
        fromUserId: this.telemetryIdentifier(command.fromUserId),
        targetId: this.telemetryIdentifier(command.groupId),
        clientMessageId: this.telemetryIdentifier(command.clientMessageId),
        success: false,
        latencyMs: Date.now() - startedAt,
        stage: 'persist',
        errorCode: validationCode,
        error: normalized.error || 'Invalid message command',
        ackRequired: false,
        ackQueued: false,
      });
      return {
        success: false,
        error: normalized.error || 'Invalid message command',
      };
    }

    const {
      server,
      client,
      fromUserId,
      groupId,
      clientMessageId,
      content,
      type,
      clientSeq,
      idempotencyKey,
    } = normalized.data;

    const now = Date.now();
    const messagePayload = {
      groupId,
      fromUserId,
      messageId: clientMessageId,
      content,
      type,
      clientSeq,
      idempotencyKey,
      timestamp: now,
    };

    try {
      const isMember = await this.wsGroupAuthorizationService.isUserGroupMember(fromUserId, groupId);
      if (!isMember) {
        this.emitTelemetry({
          conversationType: 'group',
          fromUserId,
          targetId: groupId,
          clientMessageId,
          success: false,
          latencyMs: Date.now() - startedAt,
          stage: 'persist',
          errorCode: 'group_not_member',
          error: 'not a group member',
          ackRequired: false,
          ackQueued: false,
        });
        return { success: false, error: 'You are not a member of this group' };
      }

      const normalizedClientSeq = this.resolveClientSeq(
        clientSeq,
        idempotencyKey || clientMessageId,
        fromUserId,
        undefined,
        groupId,
      );

      const sendResult = await this.messageService.sendMessage({
        uuid: uuidv4(),
        fromUserId,
        groupId,
        type,
        content: this.buildMessageContent(type, content),
        ...(normalizedClientSeq !== undefined ? { clientSeq: normalizedClientSeq } : {}),
      });

      if (!sendResult.success || !sendResult.message) {
        this.emitTelemetry({
          conversationType: 'group',
          fromUserId,
          targetId: groupId,
          clientMessageId,
          success: false,
          latencyMs: Date.now() - startedAt,
          stage: 'persist',
          errorCode: 'persist_failed',
          error: sendResult.error || 'Failed to persist group message',
          ackRequired: false,
          ackQueued: false,
        });
        return {
          success: false,
          error: sendResult.error || 'Failed to persist group message',
          messageId: clientMessageId,
        };
      }

      const persistedMessageId = sendResult.message.id;
      this.logger.debug(`Group message persisted ${persistedMessageId} and sent via WukongIM to group ${groupId}`);

      server.to(`group:${groupId}`).emit(
        'newGroupMessage',
        this.wsMessageEventEmitter.buildMessageEventPayload(
          'newGroupMessage',
          {
            ...messagePayload,
            messageId: persistedMessageId,
            serverMessageId: persistedMessageId,
            clientMessageId,
          },
          sendResult.message.status,
        ),
      );

      client.emit(
        'messageSent',
        this.wsMessageEventEmitter.buildMessageEventPayload(
          'messageSent',
          {
            messageId: clientMessageId,
            serverMessageId: persistedMessageId,
            status: sendResult.isDuplicate ? 'duplicate' : 'sent',
            timestamp: Date.now(),
          },
          sendResult.isDuplicate ? 'duplicate' : MessageStatus.SENT,
        ),
      );

      this.logger.debug(`Group message ${persistedMessageId} sent to group ${groupId}`);
      this.emitTelemetry({
        conversationType: 'group',
        fromUserId,
        targetId: groupId,
        clientMessageId,
        serverMessageId: persistedMessageId,
        success: true,
        duplicate: sendResult.isDuplicate,
        latencyMs: Date.now() - startedAt,
        stage: 'dispatch',
        ackRequired: false,
        ackQueued: false,
      });

      return { success: true, messageId: clientMessageId, serverMessageId: persistedMessageId };
    } catch (error: unknown) {
      const errorMessage = this.extractErrorMessage(error);
      this.logger.error(`Failed to send group message ${clientMessageId}:`, error);
      this.emitTelemetry({
        conversationType: 'group',
        fromUserId,
        targetId: groupId,
        clientMessageId,
        success: false,
        latencyMs: Date.now() - startedAt,
        stage: 'exception',
        errorCode: 'send_exception',
        error: errorMessage,
        ackRequired: false,
        ackQueued: false,
      });

      client.emit(
        'messageFailed',
        this.wsMessageEventEmitter.buildMessageEventPayload(
          'messageFailed',
          {
            messageId: clientMessageId,
            error: `Failed to send group message: ${errorMessage}`,
            timestamp: Date.now(),
          },
          MessageStatus.FAILED,
        ),
      );

      return {
        success: false,
        error: `Failed to send group message: ${errorMessage}`,
        messageId: clientMessageId,
      };
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Unknown error';
  }

  private emitTelemetry(payload: WsMessageCommandTelemetry): void {
    this.eventEmitter.emit('ws.message.command.result', payload);
  }

  private recordValidationFailure(domain: string, errorCode: string): void {
    this.prometheusService?.incrementWsValidationFailure('command', domain, errorCode);
  }

  private resolveClientSeq(
    explicitClientSeq: number | undefined,
    idempotencyKeyCandidate: string | undefined,
    userId: string,
    toUserId?: string,
    groupId?: string,
  ): number | undefined {
    if (Number.isInteger(explicitClientSeq) && (explicitClientSeq as number) >= 0) {
      return explicitClientSeq;
    }

    const normalizedIdempotencyKey = this.normalizeIdempotencyKeyCandidate(idempotencyKeyCandidate);
    if (!normalizedIdempotencyKey) {
      return undefined;
    }

    const scope = groupId ? `group:${groupId}` : `single:${toUserId || ''}`;
    const hashHex = createHash('sha256')
      .update(`${userId}:${scope}:${normalizedIdempotencyKey}`)
      .digest('hex');
    const primary = Number.parseInt(hashHex.slice(0, 13), 16);
    if (Number.isSafeInteger(primary) && primary >= 0) {
      return primary;
    }
    return Number.parseInt(hashHex.slice(0, 12), 16);
  }

  private normalizeIdempotencyKeyCandidate(candidate?: string): string | undefined {
    return normalizeIdentifier(candidate);
  }

  private normalizeMessageType(type: string): MessageType | undefined {
    const normalizedToken = normalizeMessageTypeToken(type);
    if (!normalizedToken) {
      return undefined;
    }
    const normalized = normalizedToken.toLowerCase();

    const validTypes: MessageType[] = [
      MessageType.TEXT,
      MessageType.IMAGE,
      MessageType.AUDIO,
      MessageType.VIDEO,
      MessageType.FILE,
      MessageType.LOCATION,
      MessageType.CARD,
      MessageType.CUSTOM,
      MessageType.SYSTEM,
      MessageType.MUSIC,
      MessageType.DOCUMENT,
      MessageType.CODE,
      MessageType.PPT,
      MessageType.CHARACTER,
      MessageType.MODEL_3D,
    ];
    return validTypes.includes(normalized as MessageType)
      ? (normalized as MessageType)
      : undefined;
  }

  private buildMessageContent(type: MessageType, content: string): MessageContent {
    switch (type) {
      case MessageType.TEXT:
        return {
          text: {
            text: content,
          },
        };
      default:
        return {
          custom: {
            customType: type,
            data: {
              raw: content,
            },
          },
        };
    }
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeSingleMessageCommand(
    command: WsSendSingleMessageCommand,
  ): NormalizedSingleMessageResult {
    const fromUserId = normalizeIdentifier(command.fromUserId);
    const toUserId = normalizeIdentifier(command.toUserId);
    const clientMessageId = normalizeIdentifier(command.clientMessageId);
    if (!fromUserId || !toUserId || !clientMessageId) {
      return { error: 'Invalid message identifiers', errorCode: 'invalid_message_identifiers' };
    }

    const type = this.normalizeMessageType(command.type);
    if (!type) {
      return { error: 'Invalid message type', errorCode: 'invalid_message_type' };
    }

    const content = normalizeMessageContent(command.content);
    if (content === undefined) {
      return { error: 'Invalid message content', errorCode: 'invalid_message_content' };
    }

    const requireAck = command.requireAck === undefined ? true : command.requireAck;
    if (typeof requireAck !== 'boolean') {
      return { error: 'requireAck must be a boolean', errorCode: 'invalid_require_ack' };
    }

    if (command.clientSeq !== undefined && !isNonNegativeSafeInteger(command.clientSeq)) {
      return { error: 'clientSeq must be a non-negative integer', errorCode: 'invalid_client_seq' };
    }

    const idempotencyKey = command.idempotencyKey !== undefined
      ? this.normalizeIdempotencyKeyCandidate(command.idempotencyKey)
      : undefined;
    if (command.idempotencyKey !== undefined && !idempotencyKey) {
      return { error: 'Invalid idempotencyKey', errorCode: 'invalid_idempotency_key' };
    }

    if (command.needReadReceipt !== undefined && typeof command.needReadReceipt !== 'boolean') {
      return { error: 'needReadReceipt must be a boolean', errorCode: 'invalid_need_read_receipt' };
    }

    if (command.extra !== undefined && !this.isPlainRecord(command.extra)) {
      return { error: 'extra must be an object', errorCode: 'invalid_extra' };
    }

    return {
      data: {
        ...command,
        fromUserId,
        toUserId,
        clientMessageId,
        content,
        type,
        requireAck,
        clientSeq: command.clientSeq,
        idempotencyKey,
        needReadReceipt: command.needReadReceipt,
        extra: command.extra,
      },
    };
  }

  private normalizeGroupMessageCommand(
    command: WsSendGroupMessageCommand,
  ): NormalizedGroupMessageResult {
    const fromUserId = normalizeIdentifier(command.fromUserId);
    const groupId = normalizeIdentifier(command.groupId);
    const clientMessageId = normalizeIdentifier(command.clientMessageId);
    if (!fromUserId || !groupId || !clientMessageId) {
      return { error: 'Invalid message identifiers', errorCode: 'invalid_message_identifiers' };
    }

    const type = this.normalizeMessageType(command.type);
    if (!type) {
      return { error: 'Invalid message type', errorCode: 'invalid_message_type' };
    }

    const content = normalizeMessageContent(command.content);
    if (content === undefined) {
      return { error: 'Invalid message content', errorCode: 'invalid_message_content' };
    }

    if (command.clientSeq !== undefined && !isNonNegativeSafeInteger(command.clientSeq)) {
      return { error: 'clientSeq must be a non-negative integer', errorCode: 'invalid_client_seq' };
    }

    const idempotencyKey = command.idempotencyKey !== undefined
      ? this.normalizeIdempotencyKeyCandidate(command.idempotencyKey)
      : undefined;
    if (command.idempotencyKey !== undefined && !idempotencyKey) {
      return { error: 'Invalid idempotencyKey', errorCode: 'invalid_idempotency_key' };
    }

    return {
      data: {
        ...command,
        fromUserId,
        groupId,
        clientMessageId,
        content,
        type,
        clientSeq: command.clientSeq,
        idempotencyKey,
      },
    };
  }

  private telemetryIdentifier(value: unknown): string {
    return normalizeIdentifier(value) || 'invalid';
  }
}
