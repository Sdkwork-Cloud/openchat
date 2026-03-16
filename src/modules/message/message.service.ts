import { Injectable, ForbiddenException, Logger, Inject, forwardRef, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, SelectQueryBuilder, FindOptionsWhere } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './message.entity';
import { MessageReceipt } from './message-receipt.entity';
import {
  Message as MessageInterface,
  MessageContent,
  MessageManager,
  SendMessageResult,
  MessageType,
  MessageStatus,
  MessageQueryOptions,
  MessageSearchOptions,
} from './message.interface';
import { IMProviderService } from '../im-provider/im-provider.service';
import { IMMessage } from '../im-provider/im-provider.interface';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationUnreadService } from '../conversation/conversation-unread.service';
import { ContactService } from '../contact/contact.service';
import { MessageFilterService } from './message-filter.service';
import { MessageDeduplicationService } from './message-deduplication.service';
import { MessageReceiptService, ReceiptStatus } from './message-receipt.service';
import {
  DELIVERY_STATUS_RANK,
  getAllowedDeliverySourceStatuses,
  isDeliveryMessageStatus,
} from './message-state.util';
import { GroupMember } from '../group/group-member.entity';
import { GroupMessageBatchService } from '../group/group-message-batch.service';
import { ConversationSyncState } from '../conversation/conversation.interface';
import { MessageSequenceService } from './services/message-sequence.service';
import { PrometheusService } from '../../common/metrics/prometheus.service';

/**
 * 批量发送消息结果
 */
export interface BatchSendMessageResult {
  success: boolean;
  results: SendMessageResult[];
  processedCount: number;
  failedCount: number;
}

export interface MessageReceiptSummaryResult {
  messageId: string;
  conversationType: 'single' | 'group';
  expectedRecipientCount: number;
  trackedRecipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  unreadCount: number;
  pendingDeliveryCount: number;
}

export interface MessageReceiptListResult {
  messageId: string;
  total: number;
  limit: number;
  offset: number;
  items: MessageReceipt[];
}

export interface MessageUnreadMemberItem {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  receiptStatus: MessageStatus.SENT | MessageStatus.DELIVERED | null;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export interface MessageUnreadMembersResult {
  messageId: string;
  groupId: string;
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string;
  items: MessageUnreadMemberItem[];
}

export interface MessageReadMemberItem {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  receiptStatus: MessageStatus.READ;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export interface MessageReadMembersResult {
  messageId: string;
  groupId: string;
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string;
  items: MessageReadMemberItem[];
}

export interface MessageHistoryBySeqResult {
  targetId: string;
  type: 'single' | 'group';
  direction: 'before' | 'after';
  fromSeq: number;
  toSeq?: number;
  maxSeq: number;
  hasMore: boolean;
  nextSeq?: number;
  missingSeqFrom?: number;
  missingSeqTo?: number;
  missingSeqRequestedTo?: number;
  missingSeqTruncated?: boolean;
  missingSeqs?: number[];
  messages: Message[];
}

export interface ConversationSeqAckItem {
  targetId: string;
  type: 'single' | 'group';
  ackSeq: number;
}

export interface ConversationSeqAckOptions {
  deviceId?: string;
}

export interface ConversationSeqAckResult {
  targetId: string;
  type: 'single' | 'group';
  ackSeq: number;
  deviceId?: string;
  success: boolean;
  error?: string;
  state?: ConversationSyncState | null;
}

export interface ConversationSeqAckBatchResult {
  total: number;
  updated: number;
  failed: number;
  results: ConversationSeqAckResult[];
}

type SendMessagePayload = Omit<MessageInterface, 'id' | 'uuid' | 'status' | 'createdAt' | 'updatedAt'> & {
  uuid?: string;
  clientSeq?: number;
};

@Injectable()
export class MessageService implements MessageManager {
  private readonly logger = new Logger(MessageService.name);
  private readonly receiptStatusRank: Record<ReceiptStatus, number> = {
    [MessageStatus.SENT]: 0,
    [MessageStatus.DELIVERED]: 1,
    [MessageStatus.READ]: 2,
  };

  constructor(
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(GroupMember) private groupMemberRepository: Repository<GroupMember>,
    private dataSource: DataSource,
    private imProviderService: IMProviderService,
    private conversationService: ConversationService,
    private conversationUnreadService: ConversationUnreadService,
    private contactService: ContactService,
    private messageFilterService: MessageFilterService,
    private messageDeduplicationService: MessageDeduplicationService,
    private messageReceiptService: MessageReceiptService,
    private messageSequenceService: MessageSequenceService,
    @Inject(forwardRef(() => GroupMessageBatchService))
    private groupMessageBatchService: GroupMessageBatchService,
    private configService: ConfigService,
    @Optional() private readonly prometheusService?: PrometheusService,
  ) {}

  /**
   * 发送消息（支持事务）
   * 确保消息存储和去重标记的原子性
   */
  async sendMessage(
    messageData: SendMessagePayload,
  ): Promise<SendMessageResult> {
    const transactionId = uuidv4();

    // 1. 消息去重检查（在事务外，减少事务持有时间）
    if (this.hasClientSeq(messageData.clientSeq) && messageData.fromUserId) {
      const isDuplicate = await this.messageDeduplicationService.isDuplicate(
        messageData.clientSeq,
        messageData.fromUserId,
      );
      if (isDuplicate) {
        this.logger.warn(`Duplicate message detected: ${messageData.clientSeq} from ${messageData.fromUserId}`);
        // 返回已存在的消息（幂等性）
        const existingMessage = await this.findExistingMessage({
          fromUserId: messageData.fromUserId,
          clientSeq: messageData.clientSeq,
          toUserId: messageData.toUserId,
          groupId: messageData.groupId,
          uuid: messageData.uuid,
        });
        return {
          success: true,
          message: existingMessage || undefined,
          isDuplicate: true,
        };
      }
    }

    // 2. 检查消息发送权限（在事务外）
    const permissionCheck = await this.checkMessagePermission(messageData);
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: permissionCheck.reason,
      };
    }

    let messageSeq = 0;
    try {
      const conversationSeqKey = this.getConversationSequenceKey(
        messageData.fromUserId,
        messageData.toUserId,
        messageData.groupId,
      );
      messageSeq = await this.messageSequenceService.getNextSequence(conversationSeqKey);
    } catch (error) {
      this.logger.error('Failed to allocate message sequence:', error);
      return {
        success: false,
        error: 'Failed to allocate message sequence',
      };
    }

    // 3. 使用事务确保数据一致性
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedMessage: Message | null = null;

    try {
      // 3.1 创建消息记录
      const message = this.messageRepository.create({
        ...messageData,
        uuid: messageData.uuid || uuidv4(),
        seq: messageSeq,
        status: MessageStatus.SENDING,
      });
      savedMessage = await queryRunner.manager.save(message);

      // 3.2 标记消息已处理（事务性）
      if (this.hasClientSeq(messageData.clientSeq) && messageData.fromUserId) {
        await this.messageDeduplicationService.markAsProcessedTransactional(
          messageData.clientSeq,
          messageData.fromUserId,
          transactionId,
        );
      }

      // 提交事务
      await queryRunner.commitTransaction();

      // 提交去重标记（带重试机制）
      try {
        await this.messageDeduplicationService.commitTransactionalMark(transactionId);
      } catch (dedupError) {
        // 如果去重标记提交失败，记录错误但不影响消息发送
        // 因为消息已经保存，下次重复消息会被数据库唯一约束拦截
        this.logger.error(`Failed to commit deduplication mark:`, dedupError);
      }

    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();

      // 回滚去重标记
      try {
        await this.messageDeduplicationService.rollbackTransactionalMark(transactionId);
      } catch (rollbackError) {
        this.logger.error(`Failed to rollback deduplication mark:`, rollbackError);
      }

      if (this.isUniqueConstraintError(error)) {
        const existingMessage = await this.findExistingMessage({
          fromUserId: messageData.fromUserId,
          clientSeq: messageData.clientSeq,
          toUserId: messageData.toUserId,
          groupId: messageData.groupId,
          uuid: messageData.uuid,
        });
        if (existingMessage) {
          this.logger.warn(
            `Recovered duplicate send by unique constraint: from=${messageData.fromUserId}, clientSeq=${messageData.clientSeq}`,
          );
          return {
            success: true,
            message: existingMessage,
            isDuplicate: true,
          };
        }
      }

      this.logger.error(`Failed to save message in transaction:`, error);
      return {
        success: false,
        error: 'Failed to save message',
      };
    } finally {
      await queryRunner.release();
    }

    if (!savedMessage) {
      return {
        success: false,
        error: 'Failed to create message',
      };
    }

    // 4. 异步发送消息到 IM 系统（不在事务中，避免长时间占用连接）
    try {
      const imMessage: Omit<IMMessage, 'id' | 'timestamp' | 'status'> = {
        type: messageData.type,
        content: messageData.content,
        from: messageData.fromUserId,
        to: messageData.toUserId || messageData.groupId || '',
        roomId: messageData.groupId,
        clientMsgNo: savedMessage.id,
      };

      // 使用重试机制发送消息
      const providerMessage = await this.retryWithExponentialBackoff(
        () => this.dispatchMessageToIM(imMessage),
        3, // 最多重试3次
        1000, // 初始重试间隔1秒
        savedMessage.id,
      );

      // 更新消息状态为 sent
      savedMessage.status = MessageStatus.SENT;
      const providerClientMsgNo = this.resolveProviderClientMsgNo(providerMessage);
      savedMessage.extra = {
        ...(savedMessage.extra || {}),
        imMessageId: providerMessage?.id,
        imClientMsgNo: providerClientMsgNo || savedMessage.id,
      };
      const updatedMessage = await this.messageRepository.save(savedMessage);

      await this.ensureInitialSentReceipts(updatedMessage).catch((error) => {
        this.logger.warn(`Failed to initialize sent receipts for ${updatedMessage.id}: ${error?.message || error}`);
      });

      // 异步更新会话（不阻塞响应）
      this.updateConversationForMessageOptimized(updatedMessage).catch(error => {
        this.logger.error('Failed to update conversation:', error);
      });

      return {
        success: true,
        message: updatedMessage,
      };

    } catch (error: unknown) {
      this.logger.error(`Failed to send message ${savedMessage.id}:`, error);

      // 更新消息状态为 failed
      savedMessage.status = MessageStatus.FAILED;
      await this.messageRepository.save(savedMessage);

      return {
        success: false,
        message: savedMessage,
        error: `Failed to send message to IM provider: ${this.resolveErrorMessage(error)}`,
      };
    }
  }

  /**
   * 批量发送消息
   * 优化性能，减少数据库往返
   */
  async sendMessageBatch(
    messagesData: SendMessagePayload[],
  ): Promise<BatchSendMessageResult> {
    const results: SendMessageResult[] = [];
    let processedCount = 0;
    let failedCount = 0;

    // 1. 批量检查去重（并行处理）
    const dedupChecks = await Promise.all(
      messagesData.map(async (msg, index) => {
        if (this.hasClientSeq(msg.clientSeq) && msg.fromUserId) {
          const isDuplicate = await this.messageDeduplicationService.isDuplicate(
            msg.clientSeq,
            msg.fromUserId,
          );
          return { index, isDuplicate };
        }
        return { index, isDuplicate: false };
      })
    );

    // 2. 批量权限检查（并行处理）
    const permissionChecks = await Promise.all(
      messagesData.map(msg => this.checkMessagePermission(msg)),
    );

    // 3. 按批次处理消息（从配置读取批处理大小）
    const configuredBatchSize = this.configService.get<number>('MESSAGE_BATCH_SIZE', 20);
    const batchSize = Number.isFinite(configuredBatchSize)
      ? Math.max(Math.floor(configuredBatchSize as number), 1)
      : 20;
    for (let i = 0; i < messagesData.length; i += batchSize) {
      const batch = messagesData.slice(i, i + batchSize);
      const batchPermissionChecks = permissionChecks.slice(i, i + batchSize);
      const batchDedupChecks = dedupChecks.slice(i, i + batchSize);
      
      const batchResults = await this.processBatch(batch, batchPermissionChecks, batchDedupChecks);
      results.push(...batchResults);
    }

    // 统计结果
    results.forEach(result => {
      if (result.success) {
        processedCount++;
      } else {
        failedCount++;
      }
    });

    return {
      success: failedCount === 0,
      results,
      processedCount,
      failedCount,
    };
  }

  /**
   * 处理批量消息
   */
  private async processBatch(
    batch: SendMessagePayload[],
    permissions: Array<{ allowed: boolean; reason?: string }>,
    dedupChecks: Array<{ index: number; isDuplicate: boolean }>,
  ): Promise<SendMessageResult[]> {
    const results: Array<SendMessageResult | undefined> = new Array(batch.length);
    const transactionId = uuidv4();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const messagesToSave: Message[] = [];
      const clientSeqsToMark: Array<{ clientSeq: number; userId: string }> = [];
      const duplicateMessageByIndex = new Map<number, Message | null>();
      const sequenceByIndex = new Map<number, number>();
      const pendingMappings: Array<{
        originalIndex: number;
        messageData: SendMessagePayload;
      }> = [];

      // 对重复消息做精确回查，保证批量幂等返回 message 字段
      const duplicateLookups = batch
        .map((messageData, index) => ({ messageData, index, dedup: dedupChecks[index] }))
        .filter(({ dedup, messageData }) => dedup?.isDuplicate && !!messageData.fromUserId)
        .map(async ({ messageData, index }) => {
          const existingMessage = await this.findExistingMessage({
            fromUserId: messageData.fromUserId,
            clientSeq: messageData.clientSeq,
            toUserId: messageData.toUserId,
            groupId: messageData.groupId,
            uuid: messageData.uuid,
          });
          duplicateMessageByIndex.set(index, existingMessage);
        });
      if (duplicateLookups.length > 0) {
        await Promise.all(duplicateLookups);
      }

      const conversationIndexes = new Map<string, number[]>();
      batch.forEach((messageData, index) => {
        const permission = permissions[index];
        const dedupCheck = dedupChecks[index];
        if (!permission?.allowed || dedupCheck?.isDuplicate) {
          return;
        }

        const seqKey = this.getConversationSequenceKey(
          messageData.fromUserId,
          messageData.toUserId,
          messageData.groupId,
        );
        const indexes = conversationIndexes.get(seqKey) || [];
        indexes.push(index);
        conversationIndexes.set(seqKey, indexes);
      });

      const sequenceTasks = [...conversationIndexes.entries()].map(async ([seqKey, indexes]) => {
        const sequences = await this.messageSequenceService.getNextSequences(seqKey, indexes.length);
        indexes.forEach((originalIndex, idx) => {
          sequenceByIndex.set(originalIndex, sequences[idx]);
        });
      });
      if (sequenceTasks.length > 0) {
        await Promise.all(sequenceTasks);
      }

      // 准备数据
      batch.forEach((msgData, index) => {
        const permission = permissions[index];
        const dedupCheck = dedupChecks[index];

        // 检查权限
        if (!permission.allowed) {
          results[index] = {
            success: false,
            error: permission.reason,
          };
          return;
        }

        // 检查重复
        if (dedupCheck?.isDuplicate) {
          this.logger.warn(`Duplicate message detected in batch: ${msgData.clientSeq} from ${msgData.fromUserId}`);
          results[index] = {
            success: true,
            message: duplicateMessageByIndex.get(index) || undefined,
            isDuplicate: true,
          };
          return;
        }

        // 创建消息
        const sequence = sequenceByIndex.get(index);
        if (!sequence) {
          throw new Error(`Missing sequence for batch message index ${index}`);
        }

        const message = this.messageRepository.create({
          ...msgData,
          seq: sequence,
          status: MessageStatus.SENDING,
        });
        messagesToSave.push(message);
        pendingMappings.push({
          originalIndex: index,
          messageData: msgData,
        });

        // 记录需要标记去重的消息
        if (this.hasClientSeq(msgData.clientSeq) && msgData.fromUserId) {
          clientSeqsToMark.push({
            clientSeq: msgData.clientSeq,
            userId: msgData.fromUserId,
          });
        }
      });

      // 批量保存消息（如果有）
      let savedMessages: Message[] = [];
      if (messagesToSave.length > 0) {
        // 使用批量保存，减少数据库往返
        savedMessages = await queryRunner.manager.save(messagesToSave);

        // 批量标记去重
        if (clientSeqsToMark.length > 0) {
          const pipeline = clientSeqsToMark.map(({ clientSeq, userId }) =>
            this.messageDeduplicationService.markAsProcessedTransactional(clientSeq, userId, transactionId),
          );
          await Promise.all(pipeline);
        }
      }

      await queryRunner.commitTransaction();

      // 提交去重标记（带错误处理）
      try {
        await this.messageDeduplicationService.commitTransactionalMark(transactionId);
      } catch (dedupError) {
        this.logger.error(`Failed to commit batch deduplication marks:`, dedupError);
      }

      // 逐条并行发送到 IM，确保返回结果与原始下标一一对应
      const sendTasks = savedMessages.map(async (savedMessage, savedIndex) => {
        const mapping = pendingMappings[savedIndex];
        if (!mapping) {
          this.logger.error(`Missing batch mapping for saved message index ${savedIndex}`);
          return {
            originalIndex: -1,
            result: {
              success: false,
              message: savedMessage,
              error: 'Internal batch mapping error',
            } as SendMessageResult,
          };
        }

        try {
          await this.sendToIMProvider(savedMessage, mapping.messageData);
          return {
            originalIndex: mapping.originalIndex,
            result: {
              success: true,
              message: savedMessage,
            } as SendMessageResult,
          };
        } catch (error: unknown) {
          this.logger.error(`Failed to send batch message ${savedMessage.id} to IM:`, error);

          try {
            savedMessage.status = MessageStatus.FAILED;
            await this.messageRepository.save(savedMessage);
          } catch (saveError) {
            this.logger.error(`Failed to mark batch message ${savedMessage.id} as failed:`, saveError);
          }

          return {
            originalIndex: mapping.originalIndex,
            result: {
              success: false,
              message: savedMessage,
              error: `Failed to send message to IM provider: ${this.resolveErrorMessage(error)}`,
            } as SendMessageResult,
          };
        }
      });

      const sendOutcomes = await Promise.all(sendTasks);
      sendOutcomes.forEach(({ originalIndex, result }) => {
        if (originalIndex >= 0) {
          results[originalIndex] = result;
        }
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();

      // 回滚去重标记（带错误处理）
      try {
        await this.messageDeduplicationService.rollbackTransactionalMark(transactionId);
      } catch (rollbackError) {
        this.logger.error(`Failed to rollback batch deduplication marks:`, rollbackError);
      }

      if (this.isUniqueConstraintError(error)) {
        this.logger.warn('Batch save hit unique constraint, fallback to per-message recovery flow');
        const fallbackResults = await Promise.all(
          batch.map(async (messageData, index) => {
            if (results[index] !== undefined) {
              return results[index] as SendMessageResult;
            }
            return this.sendMessage(messageData);
          }),
        );
        return fallbackResults;
      }

      this.logger.error('Batch message processing failed:', error);

      // 为批次中的所有消息添加失败结果
      batch.forEach((_, index) => {
        if (results[index] === undefined) {
          results[index] = {
            success: false,
            error: 'Batch processing failed',
          };
        }
      });
    } finally {
      await queryRunner.release();
    }

    // 兜底补齐所有结果槽位，确保调用方拿到与输入等长且同顺序结果
    return results.map(result => result || ({
      success: false,
      error: 'Batch processing incomplete',
    }));
  }

  /**
   * 发送消息到 IM Provider
   */
  private async sendToIMProvider(
    message: Message,
    messageData: SendMessagePayload,
  ): Promise<void> {
    const imMessage: Omit<IMMessage, 'id' | 'timestamp' | 'status'> = {
      type: messageData.type,
      content: messageData.content,
      from: messageData.fromUserId,
      to: messageData.toUserId || messageData.groupId || '',
      roomId: messageData.groupId,
      clientMsgNo: message.id,
    };

    // 使用重试机制发送消息
    const providerMessage = await this.retryWithExponentialBackoff(
      () => this.dispatchMessageToIM(imMessage),
      3, // 最多重试3次
      1000, // 初始重试间隔1秒
      message.id,
    );

    // 更新状态为 sent
    message.status = MessageStatus.SENT;
    const providerClientMsgNo = this.resolveProviderClientMsgNo(providerMessage);
    message.extra = {
      ...(message.extra || {}),
      imMessageId: providerMessage?.id,
      imClientMsgNo: providerClientMsgNo || message.id,
    };
    await this.messageRepository.save(message);

    await this.ensureInitialSentReceipts(message).catch((error) => {
      this.logger.warn(`Failed to initialize sent receipts for ${message.id}: ${error?.message || error}`);
    });
    await this.updateConversationForMessageOptimized(message);
  }

  private async checkMessagePermission(
    messageData: SendMessagePayload,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (messageData.groupId) {
      const permission = await this.messageFilterService.checkGroupMessagePermission(
        messageData.fromUserId,
        messageData.groupId,
      );
      return permission;
    } else if (messageData.toUserId) {
      const permission = await this.messageFilterService.checkSingleMessagePermission(
        messageData.fromUserId,
        messageData.toUserId,
      );
      return permission;
    }

    return { allowed: false, reason: 'Invalid message target' };
  }

  /**
   * 查找已存在的消息（用于去重返回）
   */
  private async findExistingMessage(
    params: {
      fromUserId: string;
      clientSeq?: number;
      toUserId?: string;
      groupId?: string;
      uuid?: string;
    },
  ): Promise<Message | null> {
    const {
      fromUserId,
      clientSeq,
      toUserId,
      groupId,
      uuid,
    } = params;

    if (uuid) {
      const whereByUuid: FindOptionsWhere<Message> = {
        uuid,
        fromUserId,
      };
      const byUuid = await this.messageRepository.findOne({
        where: whereByUuid,
      });
      if (byUuid) {
        return byUuid;
      }
    }

    if (this.hasClientSeq(clientSeq)) {
      const scopedWhere: FindOptionsWhere<Message> = {
        fromUserId,
        clientSeq,
      };
      if (groupId) {
        scopedWhere.groupId = groupId;
      } else if (toUserId) {
        scopedWhere.toUserId = toUserId;
      }

      const scopedMessage = await this.messageRepository.findOne({
        where: scopedWhere,
        order: { createdAt: 'DESC' },
      });
      if (scopedMessage) {
        return scopedMessage;
      }

      const whereByClientSeq: FindOptionsWhere<Message> = {
        fromUserId,
        clientSeq,
      };
      return this.messageRepository.findOne({
        where: whereByClientSeq,
        order: { createdAt: 'DESC' },
      });
    }

    const whereBySenderAndTarget: FindOptionsWhere<Message> = {
      fromUserId,
    };
    if (groupId) {
      whereBySenderAndTarget.groupId = groupId;
    } else if (toUserId) {
      whereBySenderAndTarget.toUserId = toUserId;
    }

    return this.messageRepository.findOne({
      where: whereBySenderAndTarget,
      order: { createdAt: 'DESC' },
    });
  }

  private hasClientSeq(clientSeq?: number): clientSeq is number {
    return Number.isInteger(clientSeq) && (clientSeq as number) >= 0;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const dbError = error as { code?: string; message?: string };
    if (dbError.code === '23505') {
      return true;
    }

    if (typeof dbError.message !== 'string') {
      return false;
    }

    return dbError.message.includes('duplicate key') || dbError.message.includes('UNIQUE constraint failed');
  }

  private applyConversationFilter(
    queryBuilder: SelectQueryBuilder<Message>,
    userId: string,
    targetId: string,
    type: 'single' | 'group',
  ): void {
    if (type === 'single') {
      queryBuilder.andWhere(
        '((message.fromUserId = :userId AND message.toUserId = :targetId) OR (message.fromUserId = :targetId AND message.toUserId = :userId))',
        { userId, targetId },
      );
      return;
    }

    queryBuilder.andWhere('message.groupId = :targetId', { targetId });
  }

  private normalizeSequence(seq?: number | string | null): number | null {
    if (seq === null || seq === undefined) {
      return null;
    }
    const value = typeof seq === 'string' ? parseInt(seq, 10) : seq;
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }

  private normalizeConversationSeqAckItems(items: ConversationSeqAckItem[]): ConversationSeqAckItem[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const deduped = new Map<string, ConversationSeqAckItem>();
    items.forEach((item) => {
      if (!item || !item.targetId) {
        return;
      }

      const targetId = item.targetId.trim();
      if (!targetId) {
        return;
      }

      const type: 'single' | 'group' = item.type === 'group' ? 'group' : 'single';
      const ackSeq = this.normalizeSequence(item.ackSeq);
      if (!ackSeq) {
        return;
      }

      const key = `${type}:${targetId}`;
      const existing = deduped.get(key);
      if (!existing || ackSeq > existing.ackSeq) {
        deduped.set(key, { targetId, type, ackSeq });
      }
    });

    return [...deduped.values()].slice(0, 200);
  }

  private normalizeDeviceId(deviceId?: string | null): string | undefined {
    if (!deviceId || typeof deviceId !== 'string') {
      return undefined;
    }

    const normalized = deviceId.trim();
    if (!normalized) {
      return undefined;
    }

    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
      return undefined;
    }

    return normalized;
  }

  private async executeWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    handler: (item: T) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) {
      return [];
    }

    const normalizedConcurrency = Math.max(1, Math.floor(concurrency));
    const results: R[] = new Array(items.length);
    let currentIndex = 0;

    const worker = async () => {
      while (true) {
        const index = currentIndex;
        currentIndex += 1;
        if (index >= items.length) {
          return;
        }

        results[index] = await handler(items[index]);
      }
    };

    const workers = Array.from(
      { length: Math.min(normalizedConcurrency, items.length) },
      () => worker(),
    );
    await Promise.all(workers);
    return results;
  }

  private getConversationSequenceKey(
    fromUserId: string,
    toUserId?: string,
    groupId?: string,
  ): string {
    if (groupId) {
      return `group:${groupId}`;
    }

    if (toUserId) {
      const [left, right] = [fromUserId, toUserId].sort();
      return `single:${left}:${right}`;
    }

    throw new BadRequestException('Invalid message target for sequence');
  }

  private getConversationSequenceKeyByTarget(
    userId: string,
    targetId: string,
    type: 'single' | 'group',
  ): string {
    if (type === 'group') {
      return this.getConversationSequenceKey(userId, undefined, targetId);
    }

    return this.getConversationSequenceKey(userId, targetId);
  }

  private resolveProviderClientMsgNo(providerMessage?: IMMessage): string | undefined {
    const rawClientMsgNo = providerMessage?.clientMsgNo;
    if (typeof rawClientMsgNo === 'string' && rawClientMsgNo.trim()) {
      return rawClientMsgNo;
    }

    if (typeof rawClientMsgNo === 'number' && Number.isFinite(rawClientMsgNo)) {
      return rawClientMsgNo.toString();
    }

    return undefined;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return 'Unknown error';
  }

  /**
   * 根据消息更新会话
   */
  private async updateConversationForMessage(message: Message): Promise<void> {
    const isGroup = !!message.groupId;
    const type = isGroup ? 'group' : 'single';
    const targetId = isGroup ? message.groupId! : message.toUserId!;

    // 为发送者更新会话
    await this.updateOrCreateConversation(
      message.fromUserId,
      targetId,
      type,
      message.id,
      this.getMessagePreview(message),
      message.createdAt,
      true, // 发送者不增加未读数
    );

    if (isGroup) {
      // 群聊：为所有其他群成员更新会话
      await this.updateGroupConversations(message);
    } else if (message.toUserId) {
      // 单聊：为接收者更新会话
      await this.updateOrCreateConversation(
        message.toUserId,
        message.fromUserId,
        type,
        message.id,
        this.getMessagePreview(message),
        message.createdAt,
        false, // 接收者增加未读数
      );
    }
  }

  /**
   * 优化的会话更新（使用批量处理）
   */
  private async updateConversationForMessageOptimized(message: Message): Promise<void> {
    const isGroup = !!message.groupId;
    const type = isGroup ? 'group' : 'single';
    const targetId = isGroup ? message.groupId! : message.toUserId!;

    // 为发送者更新会话
    await this.updateOrCreateConversation(
      message.fromUserId,
      targetId,
      type,
      message.id,
      this.getMessagePreview(message),
      message.createdAt,
      true, // 发送者不增加未读数
    );

    if (isGroup) {
      // 群聊：使用批量处理服务优化性能
      const startTime = Date.now();
      const result = await this.groupMessageBatchService.batchUpdateConversations(
        message.groupId!,
        message.fromUserId,
        message.id,
        this.getMessagePreview(message),
        message.createdAt,
      );

      if (!result.success) {
        this.logger.error('Failed to batch update group conversations', result.errors);
        // 降级：使用单条处理
        await this.updateGroupConversationsFallback(message);
      } else {
        this.logger.debug(
          `Batch updated ${result.processed} conversations in ${Date.now() - startTime}ms`,
        );
      }
    } else if (message.toUserId) {
      // 单聊：为接收者更新会话
      await this.updateOrCreateConversation(
        message.toUserId,
        message.fromUserId,
        type,
        message.id,
        this.getMessagePreview(message),
        message.createdAt,
        false, // 接收者增加未读数
      );
    }
  }

  /**
   * 群聊会话更新的降级方案（单条处理）
   */
  private async updateGroupConversationsFallback(message: Message): Promise<void> {
    if (!message.groupId) return;

    try {
      // 获取所有群成员
      const members = await this.groupMemberRepository.find({
        where: { groupId: message.groupId, status: 'joined' },
      });

      // 为每个成员更新会话（除了发送者）
      for (const member of members) {
        if (member.userId !== message.fromUserId) {
          await this.updateOrCreateConversation(
            member.userId,
            message.groupId!,
            'group',
            message.id,
            this.getMessagePreview(message),
            message.createdAt,
            false, // 接收者增加未读数
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to update group conversations (fallback)', error);
    }
  }

  /**
   * 为群聊消息更新所有群成员的会话（已弃用，使用批量处理替代）
   */
  private async updateGroupConversations(message: Message): Promise<void> {
    // 重定向到新的批量处理方法
    await this.updateGroupConversationsFallback(message);
  }

  /**
   * 更新或创建会话
   */
  private async updateOrCreateConversation(
    userId: string,
    targetId: string,
    type: 'single' | 'group',
    messageId: string,
    content: string,
    messageTime: Date,
    isSender: boolean = false,
  ): Promise<void> {
    try {
      // 尝试获取现有会话
      let conversation = await this.conversationService.getConversationByTarget(
        userId,
        targetId,
        type,
      );

      if (conversation) {
        // 更新现有会话
        await this.conversationService.updateLastMessage(
          conversation.id,
          messageId,
          content,
          messageTime,
        );

        // 如果不是发送者，增加未读数（使用Redis计数器）
        if (!isSender) {
          await this.conversationUnreadService.incrementUnreadCount(conversation.id);
        }
      } else {
        // 创建新会话
        conversation = await this.conversationService.createConversation({
          type,
          userId,
          targetId,
        });

        // 更新最后消息
        await this.conversationService.updateLastMessage(
          conversation.id,
          messageId,
          content,
          messageTime,
        );

        // 新会话且不是发送者，设置未读数为1（使用Redis计数器）
        if (!isSender) {
          await this.conversationUnreadService.initializeUnreadCount(conversation.id, 1);
        }
      }
    } catch (error) {
      // 会话更新失败不影响消息发送
      this.logger.error('更新会话失败:', error);
    }
  }

  /**
   * 获取消息预览文本
   */
  private getMessagePreview(message: Message): string {
    switch (message.type) {
      case MessageType.TEXT:
        return message.content?.text?.text || '[文本消息]';
      case MessageType.IMAGE:
        return '[图片]';
      case MessageType.AUDIO:
        return '[语音]';
      case MessageType.VIDEO:
        return '[视频]';
      case MessageType.FILE:
        return '[文件]';
      case MessageType.MUSIC:
        return '[音乐]';
      case MessageType.DOCUMENT:
        return '[文档]';
      case MessageType.CODE:
        return '[代码]';
      case MessageType.PPT:
        return '[演示文稿]';
      case MessageType.CHARACTER:
        return '[数字人]';
      case MessageType.MODEL_3D:
        return '[3D模型]';
      case MessageType.LOCATION:
        return '[位置]';
      case MessageType.CARD:
        return '[名片]';
      case MessageType.CUSTOM:
        return '[自定义消息]';
      case MessageType.SYSTEM:
        return '[系统消息]';
      default:
        return '[消息]';
    }
  }

  async getMessageById(id: string): Promise<Message | null> {
    return this.messageRepository.findOne({ where: { id } });
  }

  async isUserInGroup(groupId: string, userId: string): Promise<boolean> {
    const member = await this.groupMemberRepository.findOne({
      where: {
        groupId,
        userId,
        status: 'joined',
        isDeleted: false,
      },
      select: ['id'],
    });
    return !!member;
  }

  async canUserAccessMessage(userId: string, messageId: string): Promise<boolean> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      select: ['id', 'fromUserId', 'toUserId', 'groupId'],
    });
    if (!message) {
      return false;
    }
    if (message.fromUserId === userId || message.toUserId === userId) {
      return true;
    }
    if (message.groupId) {
      return this.isUserInGroup(message.groupId, userId);
    }
    return false;
  }

  async isMessageSender(userId: string, messageId: string): Promise<boolean> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      select: ['id', 'fromUserId'],
    });
    return !!message && message.fromUserId === userId;
  }

  async getMessageReceipts(
    requesterId: string,
    messageId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: ReceiptStatus;
    } = {},
  ): Promise<MessageReceiptListResult> {
    const message = await this.getMessageForReceiptAccess(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const canViewList = await this.canViewReceiptList(requesterId, message);
    if (!canViewList) {
      throw new ForbiddenException('Cannot read message receipt details');
    }

    const { limit = 50, offset = 0, status } = options;
    const { items, total } = await this.messageReceiptService.getReceiptsByMessageId(message.id, {
      limit,
      offset,
      status,
    });

    return {
      messageId: message.id,
      total,
      limit,
      offset,
      items,
    };
  }

  async getMessageReceiptSummary(
    requesterId: string,
    messageId: string,
  ): Promise<MessageReceiptSummaryResult> {
    const message = await this.getMessageForReceiptAccess(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const canViewSummary = await this.canViewReceiptSummary(requesterId, message);
    if (!canViewSummary) {
      throw new ForbiddenException('Cannot read message receipt summary');
    }

    const summary = await this.messageReceiptService.getReceiptSummaryByMessageId(message.id);
    const expectedRecipientCount = await this.resolveExpectedRecipientCount(message);

    let sentCount = summary.sentCount;
    let deliveredCount = summary.deliveredCount;
    let readCount = summary.readCount;
    let trackedRecipientCount = summary.trackedRecipientCount;

    if (message.toUserId && summary.trackedRecipientCount === 0) {
      const derived = this.deriveSingleReceiptCountsByMessageStatus(message.status);
      sentCount = derived.sentCount;
      deliveredCount = derived.deliveredCount;
      readCount = derived.readCount;
      trackedRecipientCount = derived.sentCount > 0 ? 1 : 0;
    }

    sentCount = this.normalizeCount(sentCount);
    deliveredCount = this.normalizeCount(deliveredCount);
    readCount = this.normalizeCount(readCount);
    trackedRecipientCount = this.normalizeCount(trackedRecipientCount);

    if (deliveredCount > sentCount) {
      sentCount = deliveredCount;
    }
    if (readCount > deliveredCount) {
      deliveredCount = readCount;
      if (deliveredCount > sentCount) {
        sentCount = deliveredCount;
      }
    }

    const baselineRecipientCount = Math.max(
      expectedRecipientCount,
      trackedRecipientCount,
      sentCount,
    );

    return {
      messageId: message.id,
      conversationType: message.groupId ? 'group' : 'single',
      expectedRecipientCount,
      trackedRecipientCount,
      sentCount,
      deliveredCount,
      readCount,
      unreadCount: Math.max(baselineRecipientCount - readCount, 0),
      pendingDeliveryCount: Math.max(baselineRecipientCount - deliveredCount, 0),
    };
  }

  async getGroupMessageUnreadMembers(
    requesterId: string,
    messageId: string,
    options: {
      limit?: number;
      offset?: number;
      cursor?: string;
    } = {},
  ): Promise<MessageUnreadMembersResult> {
    const message = await this.getMessageForReceiptAccess(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!message.groupId) {
      throw new BadRequestException('Unread member query is only supported for group messages');
    }

    const canView = await this.canViewGroupUnreadMembers(requesterId, message);
    if (!canView) {
      throw new ForbiddenException('Cannot read group unread member list');
    }

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const cursor = options.cursor?.trim();
    const queryParams = {
      messageId: message.id,
      groupId: message.groupId,
      senderId: message.fromUserId,
      joinedStatus: 'joined',
      readStatus: MessageStatus.READ,
    };
    const sortExpression = 'COALESCE(receipt.updated_at, member.joined_at)';

    const baseQuery = this.groupMemberRepository
      .createQueryBuilder('member')
      .leftJoin(
        'chat_message_receipts',
        'receipt',
        'receipt.message_id = :messageId AND receipt.user_id = member.user_id AND receipt.is_deleted = false',
        queryParams,
      )
      .where('member.group_id = :groupId', queryParams)
      .andWhere('member.status = :joinedStatus', queryParams)
      .andWhere('member.is_deleted = false')
      .andWhere('member.user_id != :senderId', queryParams)
      .andWhere('(receipt.status IS NULL OR receipt.status != :readStatus)', queryParams);

    const countRaw = await baseQuery
      .clone()
      .select('COUNT(*)', 'total')
      .getRawOne<{ total?: string | number }>();

    if (cursor) {
      const cursorData = this.decodeMemberCursor(cursor);
      baseQuery.andWhere(
        `(${sortExpression} < :cursorTime OR (${sortExpression} = :cursorTime AND member.user_id > :cursorUserId))`,
        {
          cursorTime: cursorData.time,
          cursorUserId: cursorData.userId,
        },
      );
    }

    const rowsQuery = baseQuery
      .clone()
      .select([
        'member.user_id AS "userId"',
        'member.role AS "role"',
        'receipt.status AS "receiptStatus"',
        'receipt.delivered_at AS "deliveredAt"',
        'receipt.read_at AS "readAt"',
        `${sortExpression} AS "sortTime"`,
      ])
      .orderBy(sortExpression, 'DESC')
      .addOrderBy('member.user_id', 'ASC')
      .limit(limit + 1);

    if (!cursor) {
      rowsQuery.offset(offset);
    }

    const rows = await rowsQuery.getRawMany<{
        userId: string;
        role: 'owner' | 'admin' | 'member';
        receiptStatus: MessageStatus.SENT | MessageStatus.DELIVERED | null;
        deliveredAt: Date | null;
        readAt: Date | null;
        sortTime: Date | string;
      }>();

    const hasMore = rows.length > limit;
    if (hasMore) {
      rows.pop();
    }

    const items: MessageUnreadMemberItem[] = rows.map((row) => ({
      userId: row.userId,
      role: row.role,
      receiptStatus: row.receiptStatus || null,
      deliveredAt: row.deliveredAt || null,
      readAt: row.readAt || null,
    }));

    const nextCursor = hasMore && rows.length > 0
      ? this.encodeMemberCursor(
          this.normalizeCursorTime(rows[rows.length - 1]?.sortTime),
          rows[rows.length - 1]?.userId,
        )
      : undefined;

    return {
      messageId: message.id,
      groupId: message.groupId,
      total: this.normalizeCount(Number(countRaw?.total || 0)),
      limit,
      offset,
      nextCursor,
      items,
    };
  }

  async getGroupMessageReadMembers(
    requesterId: string,
    messageId: string,
    options: {
      limit?: number;
      offset?: number;
      cursor?: string;
    } = {},
  ): Promise<MessageReadMembersResult> {
    const message = await this.getMessageForReceiptAccess(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (!message.groupId) {
      throw new BadRequestException('Read member query is only supported for group messages');
    }

    const canView = await this.canViewGroupUnreadMembers(requesterId, message);
    if (!canView) {
      throw new ForbiddenException('Cannot read group read member list');
    }

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const cursor = options.cursor?.trim();
    const queryParams = {
      messageId: message.id,
      groupId: message.groupId,
      senderId: message.fromUserId,
      joinedStatus: 'joined',
      readStatus: MessageStatus.READ,
    };
    const sortExpression = 'COALESCE(receipt.read_at, receipt.updated_at)';

    const baseQuery = this.groupMemberRepository
      .createQueryBuilder('member')
      .innerJoin(
        'chat_message_receipts',
        'receipt',
        'receipt.message_id = :messageId AND receipt.user_id = member.user_id AND receipt.is_deleted = false',
        queryParams,
      )
      .where('member.group_id = :groupId', queryParams)
      .andWhere('member.status = :joinedStatus', queryParams)
      .andWhere('member.is_deleted = false')
      .andWhere('member.user_id != :senderId', queryParams)
      .andWhere('receipt.status = :readStatus', queryParams);

    const countRaw = await baseQuery
      .clone()
      .select('COUNT(*)', 'total')
      .getRawOne<{ total?: string | number }>();

    if (cursor) {
      const cursorData = this.decodeMemberCursor(cursor);
      baseQuery.andWhere(
        `(${sortExpression} < :cursorTime OR (${sortExpression} = :cursorTime AND member.user_id > :cursorUserId))`,
        {
          cursorTime: cursorData.time,
          cursorUserId: cursorData.userId,
        },
      );
    }

    const rowsQuery = baseQuery
      .clone()
      .select([
        'member.user_id AS "userId"',
        'member.role AS "role"',
        'receipt.status AS "receiptStatus"',
        'receipt.delivered_at AS "deliveredAt"',
        'receipt.read_at AS "readAt"',
        `${sortExpression} AS "sortTime"`,
      ])
      .orderBy(sortExpression, 'DESC')
      .addOrderBy('member.user_id', 'ASC')
      .limit(limit + 1);

    if (!cursor) {
      rowsQuery.offset(offset);
    }

    const rows = await rowsQuery.getRawMany<{
        userId: string;
        role: 'owner' | 'admin' | 'member';
        receiptStatus: MessageStatus.READ;
        deliveredAt: Date | null;
        readAt: Date | null;
        sortTime: Date | string;
      }>();

    const hasMore = rows.length > limit;
    if (hasMore) {
      rows.pop();
    }

    const items: MessageReadMemberItem[] = rows.map((row) => ({
      userId: row.userId,
      role: row.role,
      receiptStatus: MessageStatus.READ,
      deliveredAt: row.deliveredAt || null,
      readAt: row.readAt || null,
    }));

    const nextCursor = hasMore && rows.length > 0
      ? this.encodeMemberCursor(
          this.normalizeCursorTime(rows[rows.length - 1]?.sortTime),
          rows[rows.length - 1]?.userId,
        )
      : undefined;

    return {
      messageId: message.id,
      groupId: message.groupId,
      total: this.normalizeCount(Number(countRaw?.total || 0)),
      limit,
      offset,
      nextCursor,
      items,
    };
  }

  async getMessagesByUserId(userId: string, options?: MessageQueryOptions): Promise<Message[]> {
    const {
      limit = 50,
      offset = 0,
      messageType,
      fromSeq,
      toSeq,
      direction = 'before',
    } = options || {};
    const orderDirection: 'ASC' | 'DESC' = direction === 'after' ? 'ASC' : 'DESC';

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('(message.toUserId = :userId OR message.fromUserId = :userId)', { userId })
      .andWhere('message.isDeleted = false');

    if (messageType) {
      queryBuilder.andWhere('message.type = :messageType', { messageType });
    }
    if (Number.isFinite(fromSeq)) {
      queryBuilder.andWhere('message.seq > :fromSeq', { fromSeq });
    }
    if (Number.isFinite(toSeq)) {
      queryBuilder.andWhere('message.seq <= :toSeq', { toSeq });
    }

    queryBuilder
      .orderBy('message.seq', orderDirection, 'NULLS LAST')
      .addOrderBy('message.createdAt', orderDirection)
      .take(limit)
      .skip(offset);

    return queryBuilder.getMany();
  }

  async getMessageHistoryBySeq(
    userId: string,
    targetId: string,
    type: 'single' | 'group',
    options: {
      fromSeq?: number;
      toSeq?: number;
      limit?: number;
      direction?: 'before' | 'after';
      includeMissingSeqs?: boolean;
    } = {},
  ): Promise<MessageHistoryBySeqResult> {
    const normalizedTargetId = targetId?.trim();
    if (!normalizedTargetId) {
      throw new BadRequestException('targetId is required');
    }

    const direction = options.direction === 'before' ? 'before' : 'after';
    const fromSeq = Number.isFinite(options.fromSeq) && (options.fromSeq as number) >= 0
      ? Number(options.fromSeq)
      : 0;
    const toSeq = Number.isFinite(options.toSeq) && (options.toSeq as number) > 0
      ? Number(options.toSeq)
      : undefined;
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const orderDirection: 'ASC' | 'DESC' = direction === 'after' ? 'ASC' : 'DESC';
    const includeMissingSeqs = options.includeMissingSeqs ?? (direction === 'after' && fromSeq > 0);

    if (type === 'group') {
      const isMember = await this.isUserInGroup(normalizedTargetId, userId);
      if (!isMember) {
        throw new ForbiddenException('Cannot read messages of a group you have not joined');
      }
    }

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.isDeleted = false')
      .andWhere('message.seq IS NOT NULL');

    this.applyConversationFilter(queryBuilder, userId, normalizedTargetId, type);

    if (fromSeq > 0) {
      queryBuilder.andWhere('message.seq > :fromSeq', { fromSeq });
    }
    if (toSeq !== undefined) {
      queryBuilder.andWhere('message.seq <= :toSeq', { toSeq });
    }

    const messages = await queryBuilder
      .orderBy('message.seq', orderDirection)
      .addOrderBy('message.createdAt', orderDirection)
      .take(limit + 1)
      .getMany();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    const maxSeqQueryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .select('MAX(message.seq)', 'maxSeq')
      .where('message.isDeleted = false')
      .andWhere('message.seq IS NOT NULL');
    this.applyConversationFilter(maxSeqQueryBuilder, userId, normalizedTargetId, type);

    const maxSeqRaw = await maxSeqQueryBuilder.getRawOne<{ maxSeq?: string | number }>();

    const maxSeq = this.normalizeSequence(maxSeqRaw?.maxSeq) || 0;
    const tailSeq = messages.length > 0
      ? this.normalizeSequence(messages[messages.length - 1]?.seq)
      : null;
    const missingSeqFrom = fromSeq + 1;
    const missingSeqTo = toSeq ?? maxSeq;
    const shouldResolveMissingSeqs = includeMissingSeqs
      && missingSeqTo >= missingSeqFrom
      && missingSeqFrom > 0;

    let missingSeqs: number[] | undefined;
    let missingSeqScanTo: number | undefined;
    let missingSeqRequestedTo: number | undefined;
    let missingSeqTruncated: boolean | undefined;
    if (shouldResolveMissingSeqs) {
      const gapScanStartedAt = Date.now();
      let gapScanStatus: 'success' | 'failure' = 'success';
      const conversationSeqKey = this.getConversationSequenceKeyByTarget(
        userId,
        normalizedTargetId,
        type,
      );
      try {
        const missingResult = await this.messageSequenceService.getMissingSequencesWithMeta(
          conversationSeqKey,
          missingSeqFrom,
          missingSeqTo,
        );
        missingSeqs = missingResult.missingSequences;
        missingSeqScanTo = missingResult.scanTo;
        missingSeqRequestedTo = missingResult.requestedTo;
        missingSeqTruncated = missingResult.truncated;
        if (missingSeqTruncated) {
          this.prometheusService?.incrementMessageSeqGapTruncated(type);
        }
      } catch (error) {
        gapScanStatus = 'failure';
        throw error;
      } finally {
        this.prometheusService?.incrementMessageSeqGapScan(type, gapScanStatus);
        this.prometheusService?.observeMessageSeqGapScanDuration(
          type,
          gapScanStatus,
          Date.now() - gapScanStartedAt,
        );
      }
    }

    return {
      targetId: normalizedTargetId,
      type,
      direction,
      fromSeq,
      toSeq,
      maxSeq,
      hasMore,
      nextSeq: hasMore ? tailSeq || undefined : undefined,
      ...(missingSeqs !== undefined
        ? {
            missingSeqFrom,
            missingSeqTo: missingSeqScanTo ?? missingSeqTo,
            missingSeqRequestedTo,
            missingSeqTruncated,
            missingSeqs,
          }
        : {}),
      messages,
    };
  }

  async getMessagesByGroupId(groupId: string, options?: MessageQueryOptions): Promise<Message[]> {
    const {
      limit = 50,
      offset = 0,
      messageType,
      fromSeq,
      toSeq,
      direction = 'before',
    } = options || {};
    const orderDirection: 'ASC' | 'DESC' = direction === 'after' ? 'ASC' : 'DESC';

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.groupId = :groupId', { groupId })
      .andWhere('message.isDeleted = false');

    if (messageType) {
      queryBuilder.andWhere('message.type = :messageType', { messageType });
    }
    if (Number.isFinite(fromSeq)) {
      queryBuilder.andWhere('message.seq > :fromSeq', { fromSeq });
    }
    if (Number.isFinite(toSeq)) {
      queryBuilder.andWhere('message.seq <= :toSeq', { toSeq });
    }

    queryBuilder
      .orderBy('message.seq', orderDirection, 'NULLS LAST')
      .addOrderBy('message.createdAt', orderDirection)
      .take(limit)
      .skip(offset);

    return queryBuilder.getMany();
  }

  async getMessageHistory(
    userId: string,
    targetId: string,
    type: 'single' | 'group',
    options: {
      limit?: number;
      cursor?: string;
      direction?: 'before' | 'after';
    } = {},
  ): Promise<{ messages: Message[]; nextCursor?: string }> {
    const { limit = 50, cursor, direction = 'before' } = options;

    const queryBuilder = this.messageRepository.createQueryBuilder('message');

    if (type === 'single') {
      queryBuilder.where(
        '(message.fromUserId = :userId AND message.toUserId = :targetId) OR (message.fromUserId = :targetId AND message.toUserId = :userId)',
        { userId, targetId },
      );
    } else {
      queryBuilder.where('message.groupId = :targetId', { targetId });
    }

    if (cursor) {
      try {
        const cursorDate = new Date(Buffer.from(cursor, 'base64').toString());
        if (isNaN(cursorDate.getTime())) {
          throw new BadRequestException('Invalid cursor format');
        }
        if (direction === 'before') {
          queryBuilder.andWhere('message.createdAt < :cursorDate', { cursorDate });
        } else {
          queryBuilder.andWhere('message.createdAt > :cursorDate', { cursorDate });
        }
      } catch (error) {
        throw new BadRequestException('Invalid cursor format');
      }
    }

    queryBuilder
      .orderBy('message.createdAt', direction === 'before' ? 'DESC' : 'ASC')
      .take(limit + 1); // 多取一条用于判断是否有更多

    const messages = await queryBuilder.getMany();

    let nextCursor: string | undefined;
    if (messages.length > limit) {
      messages.pop(); // 移除多取的那条
      const lastMessage = messages[messages.length - 1];
      nextCursor = Buffer.from(lastMessage.createdAt.toISOString()).toString('base64');
    }

    return { messages, nextCursor };
  }

  async updateMessageStatus(id: string, status: MessageStatus): Promise<boolean> {
    const message = await this.messageRepository.findOne({
      where: { id },
      select: ['id', 'status'],
    });
    if (!message) {
      return false;
    }

    const currentStatus = message.status;
    if (currentStatus === status) {
      return true;
    }

    if (currentStatus === MessageStatus.RECALLED && status !== MessageStatus.RECALLED) {
      return false;
    }

    if (isDeliveryMessageStatus(currentStatus) && isDeliveryMessageStatus(status)) {
      const currentRank = DELIVERY_STATUS_RANK[currentStatus] as number;
      const nextRank = DELIVERY_STATUS_RANK[status] as number;
      if (nextRank < currentRank) {
        return true;
      }

      const updateResult = await this.messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({ status })
        .where('id = :id', { id })
        .andWhere('status IN (:...allowed)', {
          allowed: getAllowedDeliverySourceStatuses(status),
        })
        .execute();

      if ((updateResult.affected || 0) > 0) {
        return true;
      }

      const latest = await this.messageRepository.findOne({
        where: { id },
        select: ['status'],
      });
      if (!latest) {
        return false;
      }
      if (latest.status === status) {
        return true;
      }
      if (!isDeliveryMessageStatus(latest.status)) {
        return false;
      }
      const latestRank = DELIVERY_STATUS_RANK[latest.status] as number;
      return latestRank >= nextRank;
    }

    message.status = status;
    await this.messageRepository.save(message);
    return true;
  }

  async editMessage(
    messageId: string,
    operatorId: string,
    update: {
      content: MessageContent;
      extra?: Record<string, unknown>;
    },
  ): Promise<SendMessageResult> {
    if (!messageId || !operatorId || !update?.content) {
      return { success: false, error: 'messageId, operatorId and content are required' };
    }

    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    if (message.fromUserId !== operatorId) {
      return { success: false, error: 'You can only edit your own messages' };
    }

    if (message.status === MessageStatus.RECALLED || message.recalledAt) {
      return { success: false, error: 'Recalled messages cannot be edited' };
    }

    const editWindowMs = this.configService.get<number>('MESSAGE_EDIT_WINDOW_MS', 15 * 60 * 1000);
    if (message.createdAt && Date.now() - message.createdAt.getTime() > editWindowMs) {
      return { success: false, error: 'Message edit time limit exceeded' };
    }

    const editHistory = Array.isArray(message.extra?.editHistory)
      ? [...message.extra.editHistory]
      : [];
    editHistory.push({
      content: message.content,
      editedAt: new Date().toISOString(),
      updatedAt: message.updatedAt instanceof Date ? message.updatedAt.toISOString() : undefined,
    });

    message.content = update.content;
    message.editedAt = new Date();
    message.extra = {
      ...(message.extra || {}),
      ...(update.extra || {}),
      editHistory: editHistory.slice(-20),
    };

    const savedMessage = await this.messageRepository.save(message);
    return {
      success: true,
      message: savedMessage,
    };
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.messageRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async markMessagesAsRead(userId: string, messageIds: string[]): Promise<boolean> {
    const uniqueMessageIds = [...new Set(messageIds.filter(Boolean))];
    if (uniqueMessageIds.length === 0) {
      return false;
    }

    const readableMessages = await this.messageRepository.find({
      where: {
        id: In(uniqueMessageIds),
        toUserId: userId,
      },
      select: ['id', 'fromUserId', 'seq'],
    });

    if (readableMessages.length === 0) {
      return false;
    }

    const readableMessageIds = readableMessages.map(message => message.id);

    await this.messageRepository.update(
      {
        id: In(readableMessageIds),
        toUserId: userId,
      },
      {
        status: MessageStatus.READ,
      },
    );

    await Promise.all(
      readableMessageIds.map(messageId =>
        this.messageReceiptService.upsertReceipt(
          messageId,
          userId,
          MessageStatus.READ,
          'api_mark_read',
        ),
      ),
    );

    const maxSeqByTarget = new Map<string, number>();
    readableMessages.forEach((message) => {
      const normalizedSeq = this.normalizeSequence(message.seq);
      if (!message.fromUserId || !normalizedSeq) {
        return;
      }
      const current = maxSeqByTarget.get(message.fromUserId) || 0;
      if (normalizedSeq > current) {
        maxSeqByTarget.set(message.fromUserId, normalizedSeq);
      }
    });

    if (maxSeqByTarget.size > 0) {
      await Promise.all(
        [...maxSeqByTarget.entries()].map(([targetId, seq]) =>
          this.conversationService.advanceLastReadSeq(
            userId,
            targetId,
            'single',
            seq,
          ),
        ),
      );
    }

    return true;
  }

  async markGroupMessagesAsRead(
    userId: string,
    groupId: string,
    messageIds: string[],
  ): Promise<boolean> {
    const uniqueMessageIds = [...new Set(messageIds.filter(Boolean))];
    if (!groupId || uniqueMessageIds.length === 0) {
      return false;
    }

    const isMember = await this.isUserInGroup(groupId, userId);
    if (!isMember) {
      return false;
    }

    const groupMessages = await this.messageRepository.find({
      where: {
        id: In(uniqueMessageIds),
        groupId,
        isDeleted: false,
      },
      select: ['id', 'fromUserId', 'seq'],
    });

    const readableMessageIds = groupMessages
      .filter((message) => message.fromUserId !== userId)
      .map((message) => message.id);

    if (readableMessageIds.length === 0) {
      return false;
    }

    await Promise.all(
      readableMessageIds.map((messageId) =>
        this.messageReceiptService.upsertReceipt(
          messageId,
          userId,
          MessageStatus.READ,
          'api_group_mark_read',
          { groupId },
        ),
      ),
    );

    const maxSeq = groupMessages
      .filter((message) => message.fromUserId !== userId)
      .reduce((acc, message) => {
        const seq = this.normalizeSequence(message.seq);
        return Math.max(acc, seq || 0);
      }, 0);

    if (maxSeq > 0) {
      await this.conversationService.advanceLastReadSeq(
        userId,
        groupId,
        'group',
        maxSeq,
      );
    }

    return true;
  }

  async ackConversationSeq(
    userId: string,
    payload: ConversationSeqAckItem,
    options?: ConversationSeqAckOptions,
  ): Promise<ConversationSeqAckResult> {
    const targetId = payload.targetId?.trim();
    const type: 'single' | 'group' = payload.type === 'group' ? 'group' : 'single';
    const ackSeq = this.normalizeSequence(payload.ackSeq) || 0;
    const deviceId = this.normalizeDeviceId(options?.deviceId);
    const syncScope: 'user' | 'device' = deviceId ? 'device' : 'user';
    const ackStartedAt = Date.now();
    let ackStatus: 'success' | 'failure' = 'failure';

    try {
      if (!targetId) {
        this.recordAckTelemetry(type, syncScope, 'failure', 'unknown');
        return {
          targetId: payload.targetId,
          type,
          ackSeq: payload.ackSeq,
          ...(deviceId ? { deviceId } : {}),
          success: false,
          error: 'targetId is required',
        };
      }

      if (ackSeq <= 0) {
        this.recordAckTelemetry(type, syncScope, 'failure', 'unknown');
        return {
          targetId,
          type,
          ackSeq: payload.ackSeq,
          ...(deviceId ? { deviceId } : {}),
          success: false,
          error: 'ackSeq must be greater than 0',
        };
      }

      if (type === 'group') {
        const isMember = await this.isUserInGroup(targetId, userId);
        if (!isMember) {
          this.recordAckTelemetry(type, syncScope, 'failure', 'unknown');
          return {
            targetId,
            type,
            ackSeq,
            ...(deviceId ? { deviceId } : {}),
            success: false,
            error: 'not a group member',
          };
        }
      }

      const updated = await this.conversationService.advanceLastReadSeq(
        userId,
        targetId,
        type,
        ackSeq,
      );

      if (!updated) {
        this.recordAckTelemetry(type, syncScope, 'failure', 'unknown');
        return {
          targetId,
          type,
          ackSeq,
          ...(deviceId ? { deviceId } : {}),
          success: false,
          error: 'conversation not found',
        };
      }

      if (deviceId) {
        await this.conversationService.advanceDeviceLastReadSeq(
          userId,
          deviceId,
          targetId,
          type,
          ackSeq,
        );
      }

      let state: ConversationSyncState | null = null;
      try {
        state = deviceId
          ? await this.conversationService.getConversationSyncStateForUser(
              userId,
              targetId,
              type,
              { deviceId },
            )
          : await this.conversationService.getConversationSyncStateForUser(
              userId,
              targetId,
              type,
            );
      } catch (error) {
        this.logger.warn(
          `ackConversationSeq succeeded but failed to query sync state: user=${userId}, target=${targetId}, type=${type}, scope=${syncScope}, err=${this.resolveErrorMessage(error)}`,
        );
      }

      const pendingSeq = state ? this.resolveAckPendingSeq(state, ackSeq, syncScope) : undefined;
      const caughtUp = state ? (state.isCaughtUp ? 'true' : 'false') : 'unknown';
      this.recordAckTelemetry(type, syncScope, 'success', caughtUp, pendingSeq);
      ackStatus = 'success';

      return {
        targetId,
        type,
        ackSeq,
        ...(deviceId ? { deviceId } : {}),
        success: true,
        state,
      };
    } catch (error) {
      this.recordAckTelemetry(type, syncScope, 'failure', 'unknown');
      throw error;
    } finally {
      this.prometheusService?.observeMessageSeqAckDuration(
        type,
        syncScope,
        ackStatus,
        Date.now() - ackStartedAt,
      );
    }
  }

  async ackConversationSeqBatch(
    userId: string,
    items: ConversationSeqAckItem[],
    options?: ConversationSeqAckOptions,
  ): Promise<ConversationSeqAckBatchResult> {
    const syncScope: 'user' | 'device' = options?.deviceId ? 'device' : 'user';
    const batchStartedAt = Date.now();
    let batchStatus: 'success' | 'partial' | 'failure' = 'failure';
    let failedItemsForMetrics = 0;

    try {
      const normalizedItems = this.normalizeConversationSeqAckItems(items);
      if (normalizedItems.length === 0) {
        batchStatus = 'success';
        return {
          total: 0,
          updated: 0,
          failed: 0,
          results: [],
        };
      }

      const configuredConcurrency = this.configService.get<number>('MESSAGE_ACK_BATCH_CONCURRENCY', 20);
      const safeConcurrency = Number.isFinite(configuredConcurrency)
        ? Math.min(Math.max(Math.floor(configuredConcurrency), 1), 50)
        : 20;

      const results = await this.executeWithConcurrency(
        normalizedItems,
        safeConcurrency,
        async (item) => {
          try {
            return await this.ackConversationSeq(userId, item, options);
          } catch (error) {
            this.logger.error(
              `ackConversationSeqBatch item failed: user=${userId}, target=${item.targetId}, type=${item.type}, scope=${syncScope}`,
              error,
            );
            return {
              targetId: item.targetId,
              type: item.type,
              ackSeq: item.ackSeq,
              ...(options?.deviceId ? { deviceId: options.deviceId } : {}),
              success: false,
              error: 'ack operation failed',
            };
          }
        },
      );

      const updated = results.filter((result) => result.success).length;
      const failed = results.length - updated;
      failedItemsForMetrics = failed;
      batchStatus = failed === 0 ? 'success' : updated === 0 ? 'failure' : 'partial';

      return {
        total: results.length,
        updated,
        failed,
        results,
      };
    } catch (error) {
      failedItemsForMetrics = Math.max(failedItemsForMetrics, 1);
      batchStatus = 'failure';
      throw error;
    } finally {
      this.prometheusService?.incrementMessageSeqAckBatch(syncScope, batchStatus);
      this.prometheusService?.observeMessageSeqAckBatchDuration(
        syncScope,
        batchStatus,
        Date.now() - batchStartedAt,
      );
      this.prometheusService?.observeMessageSeqAckBatchFailedItems(syncScope, failedItemsForMetrics);
    }
  }

  private async getMessageForReceiptAccess(
    messageId: string,
  ): Promise<Pick<Message, 'id' | 'fromUserId' | 'toUserId' | 'groupId' | 'status'> | null> {
    return this.messageRepository.findOne({
      where: { id: messageId },
      select: ['id', 'fromUserId', 'toUserId', 'groupId', 'status'],
    });
  }

  private async ensureInitialSentReceipts(
    message: Pick<Message, 'id' | 'fromUserId' | 'toUserId' | 'groupId' | 'needReadReceipt'>,
  ): Promise<void> {
    if (message.needReadReceipt === false) {
      return;
    }

    const recipientUserIds = await this.resolveReceiptRecipientUserIds(message);
    if (recipientUserIds.length === 0) {
      return;
    }

    await this.messageReceiptService.createSentReceipts(
      message.id,
      recipientUserIds,
      message.groupId ? 'message_service_group_send' : 'message_service_send',
    );
  }

  private async resolveReceiptRecipientUserIds(
    message: Pick<Message, 'fromUserId' | 'toUserId' | 'groupId'>,
  ): Promise<string[]> {
    if (message.toUserId) {
      return [message.toUserId];
    }

    if (!message.groupId) {
      return [];
    }

    const members = await this.groupMemberRepository.find({
      where: {
        groupId: message.groupId,
        status: 'joined',
        isDeleted: false,
      },
      select: ['userId'],
    });

    return members
      .map(member => member.userId)
      .filter(userId => !!userId && userId !== message.fromUserId);
  }

  private async canViewReceiptSummary(
    requesterId: string,
    message: Pick<Message, 'fromUserId' | 'toUserId' | 'groupId'>,
  ): Promise<boolean> {
    if (message.fromUserId === requesterId || message.toUserId === requesterId) {
      return true;
    }

    if (message.groupId) {
      return this.isUserInGroup(message.groupId, requesterId);
    }

    return false;
  }

  private async canViewReceiptList(
    requesterId: string,
    message: Pick<Message, 'fromUserId' | 'toUserId' | 'groupId'>,
  ): Promise<boolean> {
    if (message.fromUserId === requesterId || message.toUserId === requesterId) {
      return true;
    }

    if (!message.groupId) {
      return false;
    }

    const isMember = await this.isUserInGroup(message.groupId, requesterId);
    if (!isMember) {
      return false;
    }

    return this.isGroupAdminOrOwner(message.groupId, requesterId);
  }

  private async canViewGroupUnreadMembers(
    requesterId: string,
    message: Pick<Message, 'fromUserId' | 'groupId'>,
  ): Promise<boolean> {
    if (!message.groupId) {
      return false;
    }

    if (message.fromUserId === requesterId) {
      return true;
    }

    return this.isGroupAdminOrOwner(message.groupId, requesterId);
  }

  private async isGroupAdminOrOwner(groupId: string, userId: string): Promise<boolean> {
    const member = await this.groupMemberRepository.findOne({
      where: {
        groupId,
        userId,
        status: 'joined',
        isDeleted: false,
        role: In(['owner', 'admin']),
      },
      select: ['id'],
    });
    return !!member;
  }

  private async resolveExpectedRecipientCount(
    message: Pick<Message, 'fromUserId' | 'toUserId' | 'groupId'>,
  ): Promise<number> {
    if (message.toUserId) {
      return 1;
    }

    if (message.groupId) {
      const memberCount = await this.groupMemberRepository.count({
        where: {
          groupId: message.groupId,
          status: 'joined',
          isDeleted: false,
        },
      });
      return Math.max(memberCount - 1, 0);
    }

    return 0;
  }

  private deriveSingleReceiptCountsByMessageStatus(
    status: MessageStatus,
  ): { sentCount: number; deliveredCount: number; readCount: number } {
    const rank = this.receiptStatusRank[status as ReceiptStatus];
    if (rank === undefined) {
      return {
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
      };
    }

    return {
      sentCount: rank >= this.receiptStatusRank[MessageStatus.SENT] ? 1 : 0,
      deliveredCount: rank >= this.receiptStatusRank[MessageStatus.DELIVERED] ? 1 : 0,
      readCount: rank >= this.receiptStatusRank[MessageStatus.READ] ? 1 : 0,
    };
  }

  private normalizeCount(count: number): number {
    const safeCount = Number.isFinite(count) ? Math.max(Math.floor(count), 0) : 0;
    return safeCount;
  }

  private encodeMemberCursor(time: Date, userId: string): string | undefined {
    if (!time || !userId) {
      return undefined;
    }
    return Buffer.from(JSON.stringify({
      t: time.toISOString(),
      u: userId,
    })).toString('base64url');
  }

  private decodeMemberCursor(cursor: string): { time: Date; userId: string } {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        t?: string;
        u?: string;
      };

      if (!parsed?.t || !parsed?.u) {
        throw new Error('missing cursor fields');
      }

      const time = new Date(parsed.t);
      if (Number.isNaN(time.getTime())) {
        throw new Error('invalid cursor time');
      }

      return {
        time,
        userId: parsed.u,
      };
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private normalizeCursorTime(value: Date | string | null | undefined): Date {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const time = new Date(value);
      if (!Number.isNaN(time.getTime())) {
        return time;
      }
    }

    return new Date(0);
  }

  private resolveAckPendingSeq(
    state: ConversationSyncState | null | undefined,
    ackSeq: number,
    syncScope: 'user' | 'device',
  ): number {
    const pendingFromState = state?.pendingSeq;
    if (Number.isFinite(pendingFromState)) {
      return Math.max(0, Math.floor(pendingFromState as number));
    }

    const normalizedMaxSeq = this.normalizeSequence(state?.maxSeq) || ackSeq;
    const fallbackReadSeq = syncScope === 'device'
      ? (this.normalizeSequence(state?.deviceLastReadSeq) || this.normalizeSequence(state?.lastReadSeq) || ackSeq)
      : (this.normalizeSequence(state?.lastReadSeq) || ackSeq);

    return Math.max(normalizedMaxSeq - fallbackReadSeq, 0);
  }

  private recordAckTelemetry(
    conversationType: 'single' | 'group',
    syncScope: 'user' | 'device',
    status: 'success' | 'failure',
    caughtUp: 'true' | 'false' | 'unknown',
    pendingSeq?: number,
  ): void {
    this.prometheusService?.incrementMessageSeqAck(
      conversationType,
      syncScope,
      status,
      caughtUp,
    );

    if (status !== 'success' || !Number.isFinite(pendingSeq)) {
      return;
    }

    this.prometheusService?.observeMessageSeqAckPendingSeq(
      conversationType,
      syncScope,
      Math.max(0, Math.floor(pendingSeq as number)),
    );
  }

  private async dispatchMessageToIM(
    imMessage: Omit<IMMessage, 'id' | 'timestamp' | 'status'>,
  ): Promise<IMMessage> {
    if (imMessage.roomId) {
      return this.imProviderService.sendGroupMessage(imMessage);
    }
    return this.imProviderService.sendMessage(imMessage);
  }

  /**
   * 指数退避重试机制
   */
  private async retryWithExponentialBackoff(
    operation: () => Promise<any>,
    maxRetries: number,
    initialDelay: number,
    operationName: string,
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          this.logger.log(`Retrying ${operationName} (attempt ${attempt}/${maxRetries}) after ${Math.round(delay)}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt} failed for ${operationName}: ${lastError.message}`);
        
        if (attempt === maxRetries) {
          this.logger.error(`All attempts failed for ${operationName}:`, lastError);
          throw lastError;
        }
      }
    }

    throw lastError!;
  }

  /**
   * 重试发送失败的消息
   */
  async retryFailedMessage(messageId: string): Promise<SendMessageResult> {
    const message = await this.getMessageById(messageId);

    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    if (message.status !== MessageStatus.FAILED) {
      return { success: false, error: 'Message is not in failed state' };
    }

    message.status = MessageStatus.SENDING;
    await this.messageRepository.save(message);

    try {
      const imMessage: Omit<IMMessage, 'id' | 'timestamp' | 'status'> = {
        type: message.type,
        content: message.content,
        from: message.fromUserId,
        to: message.toUserId || message.groupId || '',
        roomId: message.groupId,
        clientMsgNo: message.id,
      };

      await this.retryWithExponentialBackoff(
        () => this.dispatchMessageToIM(imMessage),
        3,
        1000,
        `retry_message_${messageId}`,
      );

      message.status = MessageStatus.SENT;
      message.extra = {
        ...(message.extra || {}),
        imClientMsgNo: message.id,
      };
      const updatedMessage = await this.messageRepository.save(message);
      await this.ensureInitialSentReceipts(updatedMessage).catch((error) => {
        this.logger.warn(`Failed to initialize sent receipts for retry ${updatedMessage.id}: ${error?.message || error}`);
      });

      return { success: true, message: updatedMessage };
    } catch (error) {
      this.logger.error(`Failed to retry message ${messageId}:`, error);

      message.status = MessageStatus.FAILED;
      await this.messageRepository.save(message);

      return { success: false, error: 'Retry failed' };
    }
  }

  async recallMessage(messageId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const message = await this.getMessageById(messageId);

    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    if (message.fromUserId !== userId) {
      return { success: false, error: 'You can only recall your own messages' };
    }

    const recallTimeLimit = 2 * 60 * 1000; // 2 minutes
    const messageAge = Date.now() - message.createdAt.getTime();
    if (messageAge > recallTimeLimit) {
      return { success: false, error: 'Message recall time limit exceeded' };
    }

    message.status = MessageStatus.RECALLED;
    await this.messageRepository.save(message);

    return { success: true };
  }

  async forwardMessage(
    messageId: string,
    fromUserId: string,
    toUserId?: string,
    toGroupId?: string,
  ): Promise<SendMessageResult> {
    const originalMessage = await this.getMessageById(messageId);

    if (!originalMessage) {
      return { success: false, error: 'Original message not found' };
    }
    if (!(await this.canUserAccessMessage(fromUserId, messageId))) {
      return { success: false, error: 'No permission to forward this message' };
    }

    if (!toUserId && !toGroupId) {
      return { success: false, error: 'Must specify toUserId or toGroupId' };
    }

    return this.sendMessage({
      fromUserId,
      toUserId,
      groupId: toGroupId,
      type: originalMessage.type,
      content: originalMessage.content,
    });
  }

  async searchMessages(options: MessageSearchOptions): Promise<{ messages: Message[]; total: number }> {
    const {
      keyword,
      targetId,
      type,
      messageType,
      startTime,
      endTime,
      page = 1,
      limit = 20,
    } = options;

    const queryBuilder = this.messageRepository.createQueryBuilder('message');

    // 搜索文本内容
    queryBuilder.where('message.content::text ILIKE :keyword', { keyword: `%${keyword}%` });

    // 按目标筛选
    if (targetId) {
      if (type === 'single') {
        queryBuilder.andWhere(
          '(message.fromUserId = :targetId OR message.toUserId = :targetId)',
          { targetId },
        );
      } else if (type === 'group') {
        queryBuilder.andWhere('message.groupId = :targetId', { targetId });
      }
    }

    // 按消息类型筛选
    if (messageType) {
      queryBuilder.andWhere('message.type = :messageType', { messageType });
    }

    // 按时间范围筛选
    if (startTime) {
      queryBuilder.andWhere('message.createdAt >= :startTime', { startTime: new Date(startTime) });
    }
    if (endTime) {
      queryBuilder.andWhere('message.createdAt <= :endTime', { endTime: new Date(endTime) });
    }

    // 排序和分页
    queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [messages, total] = await queryBuilder.getManyAndCount();

    return { messages, total };
  }
}
