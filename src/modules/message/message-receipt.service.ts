import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { MessageReceipt } from './message-receipt.entity';
import { MessageStatus } from './message.interface';

export type ReceiptStatus = MessageStatus.SENT | MessageStatus.DELIVERED | MessageStatus.READ;

export interface MessageReceiptQueryOptions {
  limit?: number;
  offset?: number;
  status?: ReceiptStatus;
}

export interface MessageReceiptSummary {
  trackedRecipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
}

@Injectable()
export class MessageReceiptService {
  private readonly logger = new Logger(MessageReceiptService.name);
  private readonly statusRank: Record<ReceiptStatus, number> = {
    [MessageStatus.SENT]: 0,
    [MessageStatus.DELIVERED]: 1,
    [MessageStatus.READ]: 2,
  };

  constructor(
    @InjectRepository(MessageReceipt)
    private readonly messageReceiptRepository: Repository<MessageReceipt>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async createSentReceipts(
    messageId: string,
    userIds: string[],
    source?: string,
    extra?: Record<string, unknown>,
  ): Promise<number> {
    if (!messageId || !Array.isArray(userIds) || userIds.length === 0) {
      return 0;
    }

    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return 0;
    }

    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < uniqueUserIds.length; i += chunkSize) {
      const chunk = uniqueUserIds.slice(i, i + chunkSize);
      const values = chunk.map((userId) => ({
        messageId,
        userId,
        status: MessageStatus.SENT,
        source,
        extra,
      }));

      const result = await this.messageReceiptRepository
        .createQueryBuilder()
        .insert()
        .into(MessageReceipt)
        .values(values as any)
        .orIgnore()
        .execute();

      inserted += this.extractAffectedCount(result);
    }

    return inserted;
  }

  async getReceiptsByMessageId(
    messageId: string,
    options: MessageReceiptQueryOptions = {},
  ): Promise<{ items: MessageReceipt[]; total: number }> {
    const { limit = 50, offset = 0, status } = options;

    const query = this.messageReceiptRepository
      .createQueryBuilder('receipt')
      .where('receipt.message_id = :messageId', { messageId });

    if (status) {
      query.andWhere('receipt.status = :status', { status });
    }

    query
      .orderBy('receipt.updated_at', 'DESC')
      .addOrderBy('receipt.created_at', 'DESC')
      .take(limit)
      .skip(offset);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async getReceiptSummaryByMessageId(messageId: string): Promise<MessageReceiptSummary> {
    const raw = await this.messageReceiptRepository
      .createQueryBuilder('receipt')
      .select('COUNT(*)', 'trackedRecipientCount')
      .addSelect(
        `SUM(CASE WHEN receipt.status IN (:...sentStatuses) THEN 1 ELSE 0 END)`,
        'sentCount',
      )
      .addSelect(
        `SUM(CASE WHEN receipt.status IN (:...deliveredStatuses) THEN 1 ELSE 0 END)`,
        'deliveredCount',
      )
      .addSelect(
        `SUM(CASE WHEN receipt.status = :readStatus THEN 1 ELSE 0 END)`,
        'readCount',
      )
      .where('receipt.message_id = :messageId', { messageId })
      .setParameters({
        sentStatuses: [MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ],
        deliveredStatuses: [MessageStatus.DELIVERED, MessageStatus.READ],
        readStatus: MessageStatus.READ,
      })
      .getRawOne<{
        trackedRecipientCount?: string | number;
        sentCount?: string | number;
        deliveredCount?: string | number;
        readCount?: string | number;
      }>();

    return {
      trackedRecipientCount: this.toNumber(raw?.trackedRecipientCount),
      sentCount: this.toNumber(raw?.sentCount),
      deliveredCount: this.toNumber(raw?.deliveredCount),
      readCount: this.toNumber(raw?.readCount),
    };
  }

  async getReceiptByMessageAndUser(messageId: string, userId: string): Promise<MessageReceipt | null> {
    return this.messageReceiptRepository.findOne({
      where: {
        messageId,
        userId,
      },
    });
  }

  async upsertReceipt(
    messageId: string,
    userId: string,
    status: ReceiptStatus,
    source?: string,
    extra?: Record<string, unknown>,
  ): Promise<boolean> {
    if (!messageId || !userId) {
      return false;
    }

    const now = new Date();

    try {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        select: ['id', 'toUserId', 'status'],
      });

      if (!message) {
        this.logger.warn(`Skip receipt upsert, message not found: ${messageId}`);
        return false;
      }

      if (message.toUserId && message.toUserId !== userId) {
        this.logger.warn(
          `Skip receipt upsert, recipient mismatch for message ${messageId}: expected ${message.toUserId}, got ${userId}`,
        );
        return false;
      }

      let receipt = await this.messageReceiptRepository.findOne({
        where: { messageId, userId },
      });

      if (!receipt) {
        receipt = this.messageReceiptRepository.create({
          messageId,
          userId,
          status,
          source,
          extra,
          deliveredAt: status === MessageStatus.DELIVERED || status === MessageStatus.READ ? now : undefined,
          readAt: status === MessageStatus.READ ? now : undefined,
        });
        await this.messageReceiptRepository.save(receipt);
      } else {
        const currentRank = this.statusRank[(receipt.status as ReceiptStatus) || MessageStatus.SENT];
        const incomingRank = this.statusRank[status];

        if (incomingRank < currentRank) {
          return true;
        }

        receipt.status = status;
        receipt.source = source || receipt.source;
        receipt.extra = extra || receipt.extra;
        if ((status === MessageStatus.DELIVERED || status === MessageStatus.READ) && !receipt.deliveredAt) {
          receipt.deliveredAt = now;
        }
        if (status === MessageStatus.READ) {
          receipt.readAt = now;
          if (!receipt.deliveredAt) {
            receipt.deliveredAt = now;
          }
        }
        await this.messageReceiptRepository.save(receipt);
      }

      if (message.toUserId === userId) {
        if (status === MessageStatus.READ) {
          await this.messageRepository
            .createQueryBuilder()
            .update(Message)
            .set({ status: MessageStatus.READ })
            .where('id = :messageId', { messageId })
            .andWhere('status IN (:...allowed)', {
              allowed: [MessageStatus.SENDING, MessageStatus.SENT, MessageStatus.DELIVERED],
            })
            .execute();
        } else if (status === MessageStatus.DELIVERED) {
          await this.messageRepository
            .createQueryBuilder()
            .update(Message)
            .set({ status: MessageStatus.DELIVERED })
            .where('id = :messageId', { messageId })
            .andWhere('status IN (:...allowed)', {
              allowed: [MessageStatus.SENDING, MessageStatus.SENT],
            })
            .execute();
        }
      }

      return true;
    } catch (error: unknown) {
      const message = (error as Error)?.message || String(error);
      this.logger.warn(`Failed to upsert message receipt: ${message}`);
      return false;
    }
  }

  private toNumber(value: string | number | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractAffectedCount(result: unknown): number {
    const raw = (result as { raw?: unknown })?.raw;
    if (raw && typeof raw === 'object' && 'rowCount' in raw) {
      const rowCount = Number((raw as { rowCount?: number }).rowCount);
      if (Number.isFinite(rowCount)) {
        return rowCount;
      }
    }

    const identifiers = (result as { identifiers?: unknown[] })?.identifiers;
    if (Array.isArray(identifiers)) {
      return identifiers.length;
    }

    return 0;
  }
}
