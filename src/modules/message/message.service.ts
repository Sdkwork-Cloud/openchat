import { Injectable, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './message.entity';
import {
  Message as MessageInterface,
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
import { GroupMember } from '../group/group-member.entity';
import { GroupMessageBatchService } from '../group/group-message-batch.service';

/**
 * 批量发送消息结果
 */
export interface BatchSendMessageResult {
  success: boolean;
  results: SendMessageResult[];
  processedCount: number;
  failedCount: number;
}

@Injectable()
export class MessageService implements MessageManager {
  private readonly logger = new Logger(MessageService.name);

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
    @Inject(forwardRef(() => GroupMessageBatchService))
    private groupMessageBatchService: GroupMessageBatchService,
  ) {}

  /**
   * 发送消息（支持事务）
   * 确保消息存储和去重标记的原子性
   */
  async sendMessage(
    messageData: Omit<MessageInterface, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
      clientSeq?: number;
    },
  ): Promise<SendMessageResult> {
    const transactionId = uuidv4();

    // 1. 消息去重检查（在事务外，减少事务持有时间）
    if (messageData.clientSeq && messageData.fromUserId) {
      const isDuplicate = await this.messageDeduplicationService.isDuplicate(
        messageData.clientSeq,
        messageData.fromUserId,
      );
      if (isDuplicate) {
        this.logger.warn(`Duplicate message detected: ${messageData.clientSeq} from ${messageData.fromUserId}`);
        // 返回已存在的消息（幂等性）
        const existingMessage = await this.findExistingMessage(
          messageData.fromUserId,
          messageData.content,
        );
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
        status: MessageStatus.SENDING,
      });
      savedMessage = await queryRunner.manager.save(message);

      // 3.2 标记消息已处理（事务性）
      if (messageData.clientSeq && messageData.fromUserId) {
        await this.messageDeduplicationService.markAsProcessedTransactional(
          messageData.clientSeq,
          messageData.fromUserId,
          transactionId,
        );
      }

      // 提交事务
      await queryRunner.commitTransaction();

      // 提交去重标记
      await this.messageDeduplicationService.commitTransactionalMark(transactionId);

    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();

      // 回滚去重标记
      await this.messageDeduplicationService.rollbackTransactionalMark(transactionId);

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
      };

      // 使用重试机制发送消息
      await this.retryWithExponentialBackoff(
        () => this.imProviderService.sendMessage(imMessage),
        3, // 最多重试3次
        1000, // 初始重试间隔1秒
        savedMessage.id,
      );

      // 更新消息状态为 sent
      savedMessage.status = MessageStatus.SENT;
      const updatedMessage = await this.messageRepository.save(savedMessage);

      // 异步更新会话（不阻塞响应）
      this.updateConversationForMessageOptimized(updatedMessage).catch(error => {
        this.logger.error('Failed to update conversation:', error);
      });

      return {
        success: true,
        message: updatedMessage,
      };

    } catch (error: any) {
      this.logger.error(`Failed to send message ${savedMessage.id}:`, error);

      // 更新消息状态为 failed
      savedMessage.status = MessageStatus.FAILED;
      await this.messageRepository.save(savedMessage);

      return {
        success: false,
        message: savedMessage,
        error: `Failed to send message to IM provider: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * 批量发送消息
   * 优化性能，减少数据库往返
   */
  async sendMessageBatch(
    messagesData: Array<Omit<MessageInterface, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { clientSeq?: number }>,
  ): Promise<BatchSendMessageResult> {
    const results: SendMessageResult[] = [];
    let processedCount = 0;
    let failedCount = 0;

    // 1. 批量检查去重（并行处理）
    const dedupChecks = await Promise.all(
      messagesData.map(async (msg, index) => {
        if (msg.clientSeq && msg.fromUserId) {
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

    // 3. 按批次处理消息（每批20条，增加批处理大小）
    const batchSize = 20;
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
    batch: Array<Omit<MessageInterface, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { clientSeq?: number }>,
    permissions: Array<{ allowed: boolean; reason?: string }>,
    dedupChecks: Array<{ index: number; isDuplicate: boolean }>,
  ): Promise<SendMessageResult[]> {
    const results: SendMessageResult[] = [];
    const transactionId = uuidv4();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const messagesToSave: Message[] = [];
      const clientSeqsToMark: Array<{ clientSeq: number; userId: string }> = [];
      const duplicateIndexes: number[] = [];

      // 准备数据
      batch.forEach((msgData, index) => {
        const permission = permissions[index];
        const dedupCheck = dedupChecks[index];

        // 检查权限
        if (!permission.allowed) {
          results.push({
            success: false,
            error: permission.reason,
          });
          return;
        }

        // 检查重复
        if (dedupCheck.isDuplicate) {
          this.logger.warn(`Duplicate message detected in batch: ${msgData.clientSeq} from ${msgData.fromUserId}`);
          duplicateIndexes.push(index);
          results.push({
            success: true,
            isDuplicate: true,
          });
          return;
        }

        // 创建消息
        const message = this.messageRepository.create({
          ...msgData,
          status: MessageStatus.SENDING,
        });
        messagesToSave.push(message);

        // 记录需要标记去重的消息
        if (msgData.clientSeq && msgData.fromUserId) {
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
      await this.messageDeduplicationService.commitTransactionalMark(transactionId);

      // 异步发送到 IM（批量处理，减少网络往返）
      const imSendPromises = savedMessages.map((msg, savedIndex) => {
        // 找到原始消息数据的索引 - 更安全的实现
        let batchIndex = 0;
        let foundCount = 0;
        
        // 遍历batch，找到对应位置的非duplicate消息
        for (let i = 0; i < batch.length; i++) {
          if (!duplicateIndexes.includes(i)) {
            if (foundCount === savedIndex) {
              batchIndex = i;
              break;
            }
            foundCount++;
          }
        }
        
        // 安全检查
        if (batchIndex >= batch.length || !batch[batchIndex]) {
          this.logger.error(`Failed to find original message for saved index ${savedIndex}`);
          return Promise.resolve();
        }
        
        return this.sendToIMProvider(msg, batch[batchIndex]);
      });

      // 并行发送到 IM，提高性能
      await Promise.all(imSendPromises).catch(error => {
        this.logger.error('Failed to send batch messages to IM:', error);
      });

      // 为成功保存的消息添加结果
      savedMessages.forEach(msg => {
        results.push({
          success: true,
          message: msg,
        });
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      await this.messageDeduplicationService.rollbackTransactionalMark(transactionId);

      this.logger.error('Batch message processing failed:', error);

      // 为批次中的所有消息添加失败结果
      batch.forEach((_, index) => {
        if (!results[index]) {
          results[index] = {
            success: false,
            error: 'Batch processing failed',
          };
        }
      });
    } finally {
      await queryRunner.release();
    }

    return results;
  }

  /**
   * 发送消息到 IM Provider
   */
  private async sendToIMProvider(
    message: Message,
    messageData: Omit<MessageInterface, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const imMessage: Omit<IMMessage, 'id' | 'timestamp' | 'status'> = {
      type: messageData.type,
      content: messageData.content,
      from: messageData.fromUserId,
      to: messageData.toUserId || messageData.groupId || '',
      roomId: messageData.groupId,
    };

    // 使用重试机制发送消息
    await this.retryWithExponentialBackoff(
      () => this.imProviderService.sendMessage(imMessage),
      3, // 最多重试3次
      1000, // 初始重试间隔1秒
      message.id,
    );

    // 更新状态为 sent
    message.status = MessageStatus.SENT;
    await this.messageRepository.save(message);

    await this.updateConversationForMessageOptimized(message);
  }

  private async checkMessagePermission(
    messageData: Omit<MessageInterface, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
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
    fromUserId: string,
    content: any,
  ): Promise<Message | null> {
    // 使用内容哈希或最近的消息进行匹配
    return this.messageRepository.findOne({
      where: {
        fromUserId,
      },
      order: { createdAt: 'DESC' },
    });
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

  async getMessagesByUserId(userId: string, options?: MessageQueryOptions): Promise<Message[]> {
    const { limit = 50, offset = 0, messageType } = options || {};
    
    const whereConditions: any[] = [
      { toUserId: userId },
      { fromUserId: userId },
    ];
    
    if (messageType) {
      whereConditions.forEach(cond => cond.type = messageType);
    }
    
    return this.messageRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getMessagesByGroupId(groupId: string, options?: MessageQueryOptions): Promise<Message[]> {
    const { limit = 50, offset = 0, messageType } = options || {};
    
    const whereCondition: any = { groupId };
    if (messageType) {
      whereCondition.type = messageType;
    }
    
    return this.messageRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
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
      const cursorDate = new Date(Buffer.from(cursor, 'base64').toString());
      if (direction === 'before') {
        queryBuilder.andWhere('message.createdAt < :cursorDate', { cursorDate });
      } else {
        queryBuilder.andWhere('message.createdAt > :cursorDate', { cursorDate });
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
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) {
      return false;
    }
    message.status = status;
    await this.messageRepository.save(message);
    return true;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.messageRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async markMessagesAsRead(userId: string, messageIds: string[]): Promise<boolean> {
    const result = await this.messageRepository.update(
      {
        id: In(messageIds),
        toUserId: userId,
      },
      {
        status: MessageStatus.READ,
      },
    );
    return (result.affected || 0) > 0;
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
      };

      await this.retryWithExponentialBackoff(
        () => this.imProviderService.sendMessage(imMessage),
        3,
        1000,
        `retry_message_${messageId}`,
      );

      message.status = MessageStatus.SENT;
      const updatedMessage = await this.messageRepository.save(message);

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

    if (!toUserId && !toGroupId) {
      return { success: false, error: 'Must specify toUserId or toGroupId' };
    }

    return this.sendMessage({
      fromUserId,
      toUserId,
      groupId: toGroupId,
      type: originalMessage.type,
      content: originalMessage.content,
    } as any);
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
