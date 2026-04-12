import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  Logger,
  Optional,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { Brackets, In, Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { AllowAnonymous } from '../../common/auth/guards/multi-auth.guard';
import { WukongIMProvider } from '../im-provider/providers/wukongim/wukongim.provider';
import { Message } from '../message/message.entity';
import { MessageReceipt } from '../message/message-receipt.entity';
import { MessageStatus } from '../message/message.interface';
import { WukongIMChannelType, WukongIMWebhookEvent } from './wukongim.constants';

interface WebhookPayload {
  event: string;
  data: unknown;
  timestamp: number;
  sign?: string;
}

interface MessageAckData {
  message_id: string;
  client_msg_no?: string;
  channel_id: string;
  channel_type: number;
  from_uid: string;
  to_uid: string;
  timestamp: number;
}

interface MessageReadData {
  message_ids?: string[];
  client_msg_nos?: string[];
  channel_id: string;
  channel_type: number;
  uid: string;
  timestamp: number;
}

interface UserConnectData {
  uid: string;
  device_flag: number;
  online: boolean;
  timestamp: number;
}

interface WebhookMessageData {
  message_id?: string;
  client_msg_no?: string;
  from_uid: string;
  to_uid?: string;
  channel_id: string;
  channel_type: number;
  payload: string | Record<string, unknown>;
  timestamp: number;
}

interface ReceiptScope {
  channelType: WukongIMChannelType;
  channelId: string;
}

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('wukongim-webhook')
@AllowAnonymous()
@Controller('webhook/wukongim')
export class WukongIMWebhookController {
  private readonly logger = new Logger(WukongIMWebhookController.name);
  private readonly webhookSecret: string;
  private readonly enabled: boolean;
  private readonly timestampToleranceSeconds: number;
  private readonly replayWindowSeconds: number;
  private readonly requireReplayRedis: boolean;
  private readonly failOnProcessError: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageReceipt)
    private readonly messageReceiptRepository: Repository<MessageReceipt>,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
    @Optional()
    private readonly wukongIMProvider?: WukongIMProvider,
  ) {
    this.webhookSecret = this.readConfig(
      ['WUKONGIM_WEBHOOK_SECRET'],
      '',
    );
    this.enabled = this.readBooleanConfig(
      ['WUKONGIM_WEBHOOK_ENABLED'],
      true,
    );
    this.timestampToleranceSeconds = this.readNumberConfig(
      [
        'WUKONGIM_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS',
      ],
      300,
      30,
    );
    this.replayWindowSeconds = this.readNumberConfig(
      [
        'WUKONGIM_WEBHOOK_REPLAY_WINDOW_SECONDS',
      ],
      600,
      this.timestampToleranceSeconds,
    );
    this.requireReplayRedis = this.readBooleanConfig(
      [
        'WUKONGIM_WEBHOOK_REPLAY_REQUIRE_REDIS',
      ],
      false,
    );
    this.failOnProcessError = this.readBooleanConfig(
      [
        'WUKONGIM_WEBHOOK_FAIL_ON_PROCESS_ERROR',
      ],
      false,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Receive WukongIM Webhook',
    description: 'Receive message, ack/read, and online/offline events',
  })
  async receiveWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-wukongim-signature') signature?: string,
    @Headers('x-wukongim-timestamp') timestampHeader?: string,
    @Headers('x-wukongim-nonce') nonce?: string,
    @Req() req?: RawBodyRequest,
  ): Promise<{ success: boolean }> {
    if (!this.enabled) {
      this.logger.warn('Webhook is disabled');
      throw new BadRequestException('Webhook is disabled');
    }

    if (this.webhookSecret) {
      if (!signature) {
        throw new UnauthorizedException('Missing signature');
      }
      if (!timestampHeader) {
        throw new UnauthorizedException('Missing timestamp');
      }
      if (!nonce) {
        throw new UnauthorizedException('Missing nonce');
      }

      const rawBody = this.extractRawBody(payload, req);
      this.validateTimestamp(timestampHeader);
      const normalizedSignature = this.validateSignature(rawBody, signature);
      await this.ensureRequestNotReplayed(nonce, normalizedSignature);
    }

    this.logger.debug(`Received webhook event: ${payload.event}`);

    try {
      switch (payload.event) {
        case WukongIMWebhookEvent.MESSAGE:
          this.handleRealtimeMessage(payload.data as WebhookMessageData);
          break;
        case WukongIMWebhookEvent.MESSAGE_ACK:
          await this.handleMessageAck(payload.data as MessageAckData);
          break;
        case WukongIMWebhookEvent.MESSAGE_READ:
          await this.handleMessageRead(payload.data as MessageReadData);
          break;
        case WukongIMWebhookEvent.CONNECT:
          await this.handleUserConnect(payload.data as UserConnectData);
          break;
        case WukongIMWebhookEvent.DISCONNECT:
          await this.handleUserDisconnect(payload.data as UserConnectData);
          break;
        case WukongIMWebhookEvent.USER_ONLINE:
          this.handleUserOnline(payload.data);
          break;
        case WukongIMWebhookEvent.USER_OFFLINE:
          this.handleUserOffline(payload.data);
          break;
        default:
          this.logger.warn(`Unknown webhook event: ${payload.event}`);
      }

      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to process webhook: ${err.message}`, err.stack);
      if (this.failOnProcessError) {
        throw new BadRequestException('Failed to process webhook event');
      }
      return { success: true };
    }
  }

  private async handleMessageAck(data: MessageAckData): Promise<void> {
    if (data.channel_type !== WukongIMChannelType.PERSON) {
      this.logger.debug(`Skip ACK status update for non-person channel: ${data.channel_id}`);
      return;
    }

    const identifiers = [data.message_id, data.client_msg_no].filter(Boolean) as string[];
    const affected = await this.updateMessageStatusByIdentifiers(
      identifiers,
      MessageStatus.DELIVERED,
      {
        fromUid: data.from_uid,
        toUid: data.to_uid,
      },
      [MessageStatus.SENDING, MessageStatus.SENT],
    );
    if (affected === 0) {
      this.logger.warn(`No message matched ACK identifiers: ${identifiers.join(',')}`);
    }
    await this.upsertReceiptsByIdentifiers(
      identifiers,
      data.to_uid,
      MessageStatus.DELIVERED,
      'wukongim_webhook_ack',
      {
        channelId: data.channel_id,
        fromUid: data.from_uid,
      },
    );
  }

  private async handleMessageRead(data: MessageReadData): Promise<void> {
    const messageIds = data.message_ids || [];
    const clientMsgNos = data.client_msg_nos || [];
    const identifiers = [...messageIds, ...clientMsgNos].filter(Boolean);

    this.logger.debug(`Read ack identifiers: ${identifiers.join(',')}, reader: ${data.uid}`);

    if (identifiers.length === 0) {
      return;
    }

    if (data.channel_type === WukongIMChannelType.PERSON) {
      const affected = await this.updateMessageStatusByIdentifiers(
        identifiers,
        MessageStatus.READ,
        {
          readerUid: data.uid,
        },
        [MessageStatus.SENDING, MessageStatus.SENT, MessageStatus.DELIVERED],
      );
      if (affected === 0) {
        this.logger.warn(`No message matched READ identifiers: ${identifiers.join(',')}`);
      }
    } else if (data.channel_type !== WukongIMChannelType.GROUP) {
      this.logger.debug(`Skip READ status update for unknown channel type: ${data.channel_type}`);
      return;
    }

    const upserted = await this.upsertReceiptsByIdentifiers(
      identifiers,
      data.uid,
      MessageStatus.READ,
      data.channel_type === WukongIMChannelType.GROUP
        ? 'wukongim_webhook_group_read'
        : 'wukongim_webhook_read',
      {
        channelId: data.channel_id,
      },
      {
        channelType: data.channel_type as WukongIMChannelType,
        channelId: data.channel_id,
      },
    );

    if (upserted === 0) {
      this.logger.warn(`No receipt matched READ identifiers: ${identifiers.join(',')}`);
    }
  }

  private async updateMessageStatusByIdentifiers(
    identifiers: string[],
    status: MessageStatus,
    filters?: {
      fromUid?: string;
      toUid?: string;
      readerUid?: string;
    },
    allowedCurrentStatuses?: MessageStatus[],
  ): Promise<number> {
    const uniqueIdentifiers = [...new Set(identifiers.filter(Boolean))];
    if (uniqueIdentifiers.length === 0) {
      return 0;
    }

    const updateQuery = this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status })
      .where(new Brackets((qb) => {
        qb.where('id IN (:...identifiers)', { identifiers: uniqueIdentifiers })
          .orWhere("extra->>'imMessageId' IN (:...identifiers)", { identifiers: uniqueIdentifiers })
          .orWhere("extra->>'imClientMsgNo' IN (:...identifiers)", { identifiers: uniqueIdentifiers });
      }));

    if (filters?.fromUid) {
      updateQuery.andWhere('from_user_id = :fromUid', { fromUid: filters.fromUid });
    }

    if (filters?.toUid) {
      updateQuery.andWhere('to_user_id = :toUid', { toUid: filters.toUid });
    }

    if (filters?.readerUid) {
      updateQuery.andWhere('to_user_id = :readerUid', { readerUid: filters.readerUid });
    }

    if (allowedCurrentStatuses && allowedCurrentStatuses.length > 0) {
      updateQuery.andWhere('status IN (:...allowedStatuses)', {
        allowedStatuses: allowedCurrentStatuses,
      });
    }

    const result = await updateQuery.execute();

    return result.affected || 0;
  }

  private async upsertReceiptsByIdentifiers(
    identifiers: string[],
    userId: string,
    status: MessageStatus.DELIVERED | MessageStatus.READ,
    source: string,
    extra?: Record<string, unknown>,
    scope?: ReceiptScope,
  ): Promise<number> {
    const uniqueIdentifiers = [...new Set(identifiers.filter(Boolean))];
    if (!userId || uniqueIdentifiers.length === 0) {
      return 0;
    }

    try {
      const matchedQuery = this.messageRepository
        .createQueryBuilder('message')
        .where(new Brackets((qb) => {
          qb.where('message.id IN (:...identifiers)', { identifiers: uniqueIdentifiers })
            .orWhere("message.extra->>'imMessageId' IN (:...identifiers)", { identifiers: uniqueIdentifiers })
            .orWhere("message.extra->>'imClientMsgNo' IN (:...identifiers)", { identifiers: uniqueIdentifiers });
        }))
        .select(['message.id']);

      if (scope?.channelType === WukongIMChannelType.GROUP) {
        matchedQuery
          .andWhere('message.group_id = :groupId', { groupId: scope.channelId })
          .andWhere('message.from_user_id != :readerUid', { readerUid: userId });
      } else {
        matchedQuery.andWhere('message.to_user_id = :userId', { userId });
      }

      const matchedMessages = await matchedQuery.getMany();
      const matchedMessageIds = matchedMessages.map((message) => message.id);
      if (matchedMessageIds.length === 0) {
        return 0;
      }

      // 已读状态不会被 delivered 回退
      let targetMessageIds = matchedMessageIds;
      if (status === MessageStatus.DELIVERED) {
        const readReceipts = await this.messageReceiptRepository.find({
          select: ['messageId'],
          where: {
            messageId: In(matchedMessageIds),
            userId,
            status: MessageStatus.READ,
          },
        });
        if (readReceipts.length > 0) {
          const readSet = new Set(readReceipts.map((receipt) => receipt.messageId));
          targetMessageIds = matchedMessageIds.filter((messageId) => !readSet.has(messageId));
        }
      }

      if (targetMessageIds.length === 0) {
        return 0;
      }

      const now = new Date();
      const receipts = targetMessageIds.map((messageId) =>
        this.messageReceiptRepository.create({
          messageId,
          userId,
          status,
          source,
          extra,
          deliveredAt: status === MessageStatus.DELIVERED || status === MessageStatus.READ ? now : undefined,
          readAt: status === MessageStatus.READ ? now : undefined,
        }),
      );

      await this.messageReceiptRepository
        .createQueryBuilder()
        .insert()
        .into(MessageReceipt)
        .values(receipts as any[])
        .onConflict(`
          ("message_id","user_id") DO UPDATE SET
            status = EXCLUDED.status,
            source = EXCLUDED.source,
            extra = EXCLUDED.extra,
            delivered_at = COALESCE(chat_message_receipts.delivered_at, EXCLUDED.delivered_at),
            read_at = COALESCE(chat_message_receipts.read_at, EXCLUDED.read_at),
            updated_at = CURRENT_TIMESTAMP
        `)
        .execute();

      return targetMessageIds.length;
    } catch (error: unknown) {
      const message = (error as Error)?.message || String(error);
      this.logger.warn(`Failed to upsert receipts from webhook: ${message}`);
      return 0;
    }
  }

  private async handleUserConnect(data: UserConnectData): Promise<void> {
    this.logger.log(`User connected: ${data.uid}, device: ${data.device_flag}`);
    this.wukongIMProvider?.handleWebhookUserStatus({
      uid: data.uid,
      online: true,
      timestamp: data.timestamp,
    });
  }

  private async handleUserDisconnect(data: UserConnectData): Promise<void> {
    this.logger.log(`User disconnected: ${data.uid}, device: ${data.device_flag}`);
    this.wukongIMProvider?.handleWebhookUserStatus({
      uid: data.uid,
      online: false,
      timestamp: data.timestamp,
    });
  }

  private handleUserOnline(data: unknown): void {
    const uid = (data as Record<string, unknown>)?.uid;
    this.logger.log(`User online: ${uid}`);
    if (typeof uid === 'string' && uid) {
      this.wukongIMProvider?.handleWebhookUserStatus({
        uid,
        online: true,
        timestamp: Date.now(),
      });
    }
  }

  private handleUserOffline(data: unknown): void {
    const uid = (data as Record<string, unknown>)?.uid;
    this.logger.log(`User offline: ${uid}`);
    if (typeof uid === 'string' && uid) {
      this.wukongIMProvider?.handleWebhookUserStatus({
        uid,
        online: false,
        timestamp: Date.now(),
      });
    }
  }

  private handleRealtimeMessage(data: WebhookMessageData): void {
    this.wukongIMProvider?.handleWebhookMessage(data);
  }

  private extractRawBody(payload: WebhookPayload, req?: RawBodyRequest): Buffer {
    if (req?.rawBody && Buffer.isBuffer(req.rawBody)) {
      return req.rawBody;
    }
    this.logger.warn('Raw body is unavailable, fallback to JSON serialized payload for signature');
    return Buffer.from(JSON.stringify(payload), 'utf8');
  }

  private validateSignature(rawBody: Buffer, signature: string): string {
    const normalizedSignature = signature.replace(/^sha256=/i, '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(normalizedSignature)) {
      throw new UnauthorizedException('Invalid signature format');
    }

    const expectedHex = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const actualBuffer = Buffer.from(normalizedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedHex, 'hex');

    const valid = actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer);
    if (!valid) {
      this.logger.error('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid signature');
    }

    return normalizedSignature;
  }

  private validateTimestamp(headerValue: string): number {
    const timestampRaw = Number(headerValue);
    if (!Number.isFinite(timestampRaw)) {
      throw new UnauthorizedException('Invalid timestamp');
    }

    const timestampSeconds = timestampRaw > 1e12
      ? Math.floor(timestampRaw / 1000)
      : Math.floor(timestampRaw);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (Math.abs(nowSeconds - timestampSeconds) > this.timestampToleranceSeconds) {
      throw new UnauthorizedException('Expired timestamp');
    }

    return timestampSeconds;
  }

  private async ensureRequestNotReplayed(nonceHeader: string, normalizedSignature: string): Promise<void> {
    const nonce = nonceHeader.trim();
    if (!nonce) {
      throw new UnauthorizedException('Invalid nonce');
    }

    if (!this.redis) {
      if (this.requireReplayRedis) {
        this.logger.error('Replay protection requires Redis, but REDIS_CLIENT is unavailable');
        throw new UnauthorizedException('Replay protection unavailable');
      }
      this.logger.warn('REDIS_CLIENT unavailable, replay protection skipped');
      return;
    }

    const nonceKey = `wukongim:webhook:nonce:${nonce}`;
    const signatureFingerprint = createHash('sha256').update(normalizedSignature).digest('hex');
    const signatureKey = `wukongim:webhook:signature:${signatureFingerprint}`;
    const nonceResult = await this.redis.set(nonceKey, '1', 'EX', this.replayWindowSeconds, 'NX');
    if (nonceResult !== 'OK') {
      throw new UnauthorizedException('Replay request detected');
    }

    const signatureResult = await this.redis.set(
      signatureKey,
      '1',
      'EX',
      this.replayWindowSeconds,
      'NX',
    );
    if (signatureResult !== 'OK') {
      await this.redis.del(nonceKey);
      throw new UnauthorizedException('Replay request detected');
    }
  }

  private readConfig(keys: string[], fallback: string): string {
    for (const key of keys) {
      const value = this.configService.get<string | number | boolean>(key);
      if (value === undefined || value === null) {
        continue;
      }
      const normalized = String(value).trim();
      if (normalized) {
        return normalized;
      }
    }
    return fallback;
  }

  private readNumberConfig(keys: string[], fallback: number, minValue: number): number {
    const rawValue = this.readConfig(keys, String(fallback));
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < minValue) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  private readBooleanConfig(keys: string[], fallback: boolean): boolean {
    const rawValue = this.readConfig(keys, fallback ? 'true' : 'false').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(rawValue);
  }
}
