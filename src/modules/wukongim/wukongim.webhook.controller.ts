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
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { Message } from '../message/message.entity';
import { MessageStatus } from '../message/message.interface';
import { WukongIMWebhookEvent } from './wukongim.constants';

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

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('wukongim-webhook')
@Controller('webhook/wukongim')
export class WukongIMWebhookController {
  private readonly logger = new Logger(WukongIMWebhookController.name);
  private readonly webhookSecret: string;
  private readonly enabled: boolean;
  private readonly timestampToleranceSeconds: number;
  private readonly replayWindowSeconds: number;
  private readonly requireReplayRedis: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
  ) {
    this.webhookSecret = this.readConfig(
      ['im.wukongim.webhookSecret', 'WUKONGIM_WEBHOOK_SECRET'],
      '',
    );
    this.enabled = this.readBooleanConfig(
      ['im.wukongim.webhookEnabled', 'WUKONGIM_WEBHOOK_ENABLED'],
      true,
    );
    this.timestampToleranceSeconds = this.readNumberConfig(
      [
        'im.wukongim.webhookTimestampToleranceSeconds',
        'WUKONGIM_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS',
      ],
      300,
      30,
    );
    this.replayWindowSeconds = this.readNumberConfig(
      [
        'im.wukongim.webhookReplayWindowSeconds',
        'WUKONGIM_WEBHOOK_REPLAY_WINDOW_SECONDS',
      ],
      600,
      this.timestampToleranceSeconds,
    );
    this.requireReplayRedis = this.readBooleanConfig(
      [
        'im.wukongim.webhookReplayRequireRedis',
        'WUKONGIM_WEBHOOK_REPLAY_REQUIRE_REDIS',
      ],
      false,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Receive WukongIM Webhook',
    description: 'Receive message ack/read and online/offline events',
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
      const timestampSeconds = this.validateTimestamp(timestampHeader);
      this.validateSignature(rawBody, signature);
      await this.ensureRequestNotReplayed(timestampSeconds, nonce);
    }

    this.logger.debug(`Received webhook event: ${payload.event}`);

    try {
      switch (payload.event) {
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
      return { success: true };
    }
  }

  private async handleMessageAck(data: MessageAckData): Promise<void> {
    const identifiers = [data.message_id, data.client_msg_no].filter(Boolean) as string[];
    const affected = await this.updateMessageStatusByIdentifiers(
      identifiers,
      MessageStatus.DELIVERED,
    );
    if (affected === 0) {
      this.logger.warn(`No message matched ACK identifiers: ${identifiers.join(',')}`);
    }
  }

  private async handleMessageRead(data: MessageReadData): Promise<void> {
    const messageIds = data.message_ids || [];
    const clientMsgNos = data.client_msg_nos || [];
    const identifiers = [...messageIds, ...clientMsgNos].filter(Boolean);

    this.logger.debug(`Read ack identifiers: ${identifiers.join(',')}, reader: ${data.uid}`);

    if (identifiers.length === 0) {
      return;
    }

    const affected = await this.updateMessageStatusByIdentifiers(
      identifiers,
      MessageStatus.READ,
    );
    if (affected === 0) {
      this.logger.warn(`No message matched READ identifiers: ${identifiers.join(',')}`);
    }
  }

  private async updateMessageStatusByIdentifiers(
    identifiers: string[],
    status: MessageStatus,
  ): Promise<number> {
    const uniqueIdentifiers = [...new Set(identifiers.filter(Boolean))];
    if (uniqueIdentifiers.length === 0) {
      return 0;
    }

    const result = await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status })
      .where('id IN (:...identifiers)', { identifiers: uniqueIdentifiers })
      .orWhere("extra->>'imMessageId' IN (:...identifiers)", { identifiers: uniqueIdentifiers })
      .orWhere("extra->>'imClientMsgNo' IN (:...identifiers)", { identifiers: uniqueIdentifiers })
      .execute();

    return result.affected || 0;
  }

  private async handleUserConnect(data: UserConnectData): Promise<void> {
    this.logger.log(`User connected: ${data.uid}, device: ${data.device_flag}`);
  }

  private async handleUserDisconnect(data: UserConnectData): Promise<void> {
    this.logger.log(`User disconnected: ${data.uid}, device: ${data.device_flag}`);
  }

  private handleUserOnline(data: unknown): void {
    const uid = (data as Record<string, unknown>)?.uid;
    this.logger.log(`User online: ${uid}`);
  }

  private handleUserOffline(data: unknown): void {
    const uid = (data as Record<string, unknown>)?.uid;
    this.logger.log(`User offline: ${uid}`);
  }

  private extractRawBody(payload: WebhookPayload, req?: RawBodyRequest): Buffer {
    if (req?.rawBody && Buffer.isBuffer(req.rawBody)) {
      return req.rawBody;
    }
    this.logger.warn('Raw body is unavailable, fallback to JSON serialized payload for signature');
    return Buffer.from(JSON.stringify(payload), 'utf8');
  }

  private validateSignature(rawBody: Buffer, signature: string): void {
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

  private async ensureRequestNotReplayed(
    timestampSeconds: number,
    nonceHeader: string,
  ): Promise<void> {
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

    const replayKey = `wukongim:webhook:nonce:${timestampSeconds}:${nonce}`;
    const result = await this.redis.set(replayKey, '1', 'EX', this.replayWindowSeconds, 'NX');

    if (result !== 'OK') {
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
