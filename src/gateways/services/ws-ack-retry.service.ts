import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { RedisService } from '../../common/redis/redis.service';
import { MessageStatus } from '../../modules/message/message.interface';
import { WsMessageEventEmitterService } from './ws-message-event-emitter.service';

export type PendingAckPayload = Record<string, unknown> & {
  status?: MessageStatus;
};

export interface PendingAckInfo {
  messageId: string;
  clientMessageId?: string;
  fromUserId: string;
  toUserId: string;
  payload: PendingAckPayload;
  timestamp: number;
  retryCount: number;
}

@Injectable()
export class WsAckRetryService {
  private readonly logger = new Logger(WsAckRetryService.name);
  private readonly ACK_KEY_PREFIX = 'ws:ack:msg:';
  private readonly ACK_CLIENT_KEY_PREFIX = 'ws:ack:client:';
  private readonly ACK_SCHEDULE_KEY = 'ws:ack:schedule';
  private readonly ACK_LOCK_PREFIX = 'ws:ack:lock:';
  private readonly ACK_TIMEOUT: number;
  private readonly MAX_RETRY_COUNT: number;

  constructor(
    private readonly redisService: RedisService,
    configService: ConfigService,
    private readonly messageEventEmitter: WsMessageEventEmitterService,
  ) {
    this.ACK_TIMEOUT = configService.get<number>('WS_ACK_TIMEOUT', 30000);
    this.MAX_RETRY_COUNT = configService.get<number>('WS_MAX_RETRY_COUNT', 3);
  }

  getAckTimeout(): number {
    return this.ACK_TIMEOUT;
  }

  getMaxRetryCount(): number {
    return this.MAX_RETRY_COUNT;
  }

  async processDueAcks(serverId: string, server: Server): Promise<void> {
    const now = Date.now();
    const dueMessageIds = await this.redisService.zrangeByScore(
      this.ACK_SCHEDULE_KEY,
      '-inf',
      now,
      { offset: 0, count: 200 },
    );

    for (const messageId of dueMessageIds) {
      const lockKey = `${this.ACK_LOCK_PREFIX}${messageId}`;
      const lockAcquired = await this.redisService.setIfNotExists(lockKey, serverId, 4000);
      if (!lockAcquired) {
        continue;
      }

      try {
        const ackInfo = await this.redisService.getJson<PendingAckInfo>(this.pendingAckMessageKey(messageId));
        if (!ackInfo) {
          await this.redisService.zrem(this.ACK_SCHEDULE_KEY, messageId);
          continue;
        }

        const elapsed = now - ackInfo.timestamp;
        if (elapsed < this.ACK_TIMEOUT) {
          await this.redisService.zadd(
            this.ACK_SCHEDULE_KEY,
            ackInfo.timestamp + this.ACK_TIMEOUT,
            ackInfo.messageId,
          );
          continue;
        }

        if (ackInfo.retryCount < this.MAX_RETRY_COUNT) {
          this.retryMessage(server, ackInfo);
          ackInfo.retryCount++;
          ackInfo.timestamp = now;
          await this.storePendingAck(ackInfo);
          continue;
        }

        this.logger.warn(`Message ${messageId} failed after ${this.MAX_RETRY_COUNT} retries`);
        server.to(`user:${ackInfo.fromUserId}`).emit(
          'messageFailed',
          this.messageEventEmitter.buildMessageEventPayload(
            'messageFailed',
            {
              messageId: ackInfo.clientMessageId || ackInfo.messageId,
              serverMessageId: ackInfo.messageId,
              error: 'Message delivery failed',
              timestamp: now,
            },
            MessageStatus.FAILED,
          ),
        );
        await this.removePendingAck(ackInfo.messageId, ackInfo.clientMessageId);
      } catch (error) {
        this.logger.error(`Failed to process pending ACK ${messageId}:`, error);
      } finally {
        await this.redisService.del(lockKey);
      }
    }
  }

  retryMessage(server: Server, ackInfo: PendingAckInfo): void {
    this.logger.debug(`Retrying message ${ackInfo.messageId}, attempt ${ackInfo.retryCount + 1}`);

    server.to(`user:${ackInfo.fromUserId}`).emit(
      'messageRetrying',
      this.messageEventEmitter.buildMessageEventPayload(
        'messageRetrying',
        {
          messageId: ackInfo.messageId,
          attempt: ackInfo.retryCount + 1,
          timestamp: Date.now(),
        },
        'retrying',
      ),
    );

    server.to(`user:${ackInfo.toUserId}`).emit(
      'newMessage',
      this.messageEventEmitter.buildMessageEventPayload(
        'newMessage',
        {
          ...ackInfo.payload,
          isRetry: true,
          timestamp: Date.now(),
        },
        ackInfo.payload.status || MessageStatus.SENT,
      ),
    );
  }

  async findPendingAck(messageId: string): Promise<{ key: string; value: PendingAckInfo } | null> {
    const direct = await this.redisService.getJson<PendingAckInfo>(this.pendingAckMessageKey(messageId));
    if (direct) {
      return { key: messageId, value: direct };
    }

    const serverMessageId = await this.redisService.get(this.pendingAckClientKey(messageId));
    if (!serverMessageId) {
      return null;
    }

    const mapped = await this.redisService.getJson<PendingAckInfo>(this.pendingAckMessageKey(serverMessageId));
    if (mapped) {
      return { key: serverMessageId, value: mapped };
    }

    await this.redisService.del(this.pendingAckClientKey(messageId));
    return null;
  }

  async storePendingAck(ackInfo: PendingAckInfo): Promise<void> {
    const ttlSeconds = this.pendingAckTTLSeconds();
    await this.redisService.setJson(this.pendingAckMessageKey(ackInfo.messageId), ackInfo, ttlSeconds);
    if (ackInfo.clientMessageId) {
      await this.redisService.set(this.pendingAckClientKey(ackInfo.clientMessageId), ackInfo.messageId, ttlSeconds);
    }
    await this.redisService.zadd(
      this.ACK_SCHEDULE_KEY,
      ackInfo.timestamp + this.ACK_TIMEOUT,
      ackInfo.messageId,
    );
  }

  async removePendingAck(messageId: string, clientMessageId?: string): Promise<void> {
    await this.redisService.del(this.pendingAckMessageKey(messageId));
    if (clientMessageId) {
      await this.redisService.del(this.pendingAckClientKey(clientMessageId));
    }
    await this.redisService.zrem(this.ACK_SCHEDULE_KEY, messageId);
  }

  private pendingAckMessageKey(messageId: string): string {
    return `${this.ACK_KEY_PREFIX}${messageId}`;
  }

  private pendingAckClientKey(clientMessageId: string): string {
    return `${this.ACK_CLIENT_KEY_PREFIX}${clientMessageId}`;
  }

  private pendingAckTTLSeconds(): number {
    return Math.max(60, Math.ceil(this.ACK_TIMEOUT * (this.MAX_RETRY_COUNT + 2) / 1000));
  }
}
