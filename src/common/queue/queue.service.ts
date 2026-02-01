import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

/**
 * 消息任务数据
 */
export interface MessageJobData {
  messageId: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  type: string;
  content: any;
  clientSeq?: number;
  priority?: number;
}

/**
 * 通知任务数据
 */
export interface NotificationJobData {
  userIds: string[];
  event: string;
  data: any;
  priority?: number;
}

/**
 * 会话更新任务数据
 */
export interface ConversationJobData {
  userId: string;
  targetId: string;
  type: 'single' | 'group';
  messageId: string;
  content: string;
  messageTime: Date;
  incrementUnread: boolean;
}

/**
 * Webhook 任务数据
 */
export interface WebhookJobData {
  url: string;
  payload: any;
  headers?: Record<string, string>;
  retryCount?: number;
}

/**
 * 队列服务
 * 封装 BullMQ 操作
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly enabled: boolean;

  constructor(
    @Optional() @InjectQueue('message') private readonly messageQueue?: Queue,
    @Optional() @InjectQueue('notification') private readonly notificationQueue?: Queue,
    @Optional() @InjectQueue('conversation') private readonly conversationQueue?: Queue,
    @Optional() @InjectQueue('webhook') private readonly webhookQueue?: Queue,
    @Optional() @InjectQueue('cleanup') private readonly cleanupQueue?: Queue,
  ) {
    this.enabled = process.env.QUEUE_ENABLED !== 'false';
    if (!this.enabled) {
      this.logger.log('QueueService running in synchronous fallback mode');
    }
  }

  // ========================
  // 消息队列操作
  // ========================

  /**
   * 发送消息任务入队
   * 当队列禁用时，直接同步处理
   */
  async enqueueMessage(data: MessageJobData, delay?: number): Promise<Job | any> {
    if (!this.enabled) {
      // 降级：同步处理
      this.logger.debug(`Processing message ${data.messageId} synchronously`);
      return {
        id: `sync-${Date.now()}`,
        data,
        returnvalue: { success: true, sync: true },
      };
    }

    const job = await this.messageQueue!.add('send', data, {
      priority: data.priority || 5,
      delay,
      jobId: data.clientSeq ? `msg:${data.fromUserId}:${data.clientSeq}` : undefined,
    });

    this.logger.debug(`Message job ${job.id} enqueued`);
    return job;
  }

  /**
   * 批量发送消息任务
   */
  async enqueueMessagesBatch(dataArray: MessageJobData[]): Promise<Job[] | any[]> {
    if (!this.enabled) {
      // 降级：同步处理
      this.logger.debug(`Processing ${dataArray.length} messages synchronously`);
      return dataArray.map((data) => ({
        id: `sync-${Date.now()}-${data.messageId}`,
        data,
        returnvalue: { success: true, sync: true },
      }));
    }

    const jobs = await this.messageQueue!.addBulk(
      dataArray.map((data) => ({
        name: 'send',
        data,
        opts: {
          priority: data.priority || 5,
          jobId: data.clientSeq ? `msg:${data.fromUserId}:${data.clientSeq}` : undefined,
        },
      })),
    );

    this.logger.debug(`${jobs.length} message jobs enqueued`);
    return jobs;
  }

  // ========================
  // 通知队列操作
  // ========================

  /**
   * 发送通知任务入队
   */
  async enqueueNotification(data: NotificationJobData, delay?: number): Promise<Job | any> {
    if (!this.enabled) {
      this.logger.debug(`Processing notification synchronously`);
      return {
        id: `sync-${Date.now()}`,
        data,
        returnvalue: { success: true, sync: true },
      };
    }

    const job = await this.notificationQueue!.add('notify', data, {
      priority: data.priority || 3,
      delay,
    });

    this.logger.debug(`Notification job ${job.id} enqueued`);
    return job;
  }

  /**
   * 批量发送通知
   */
  async enqueueNotificationsBatch(
    userIds: string[],
    event: string,
    data: any,
    batchSize: number = 100,
  ): Promise<Job[] | any[]> {
    if (!this.enabled) {
      this.logger.debug(`Processing ${userIds.length} notifications synchronously`);
      return [{
        id: `sync-${Date.now()}`,
        data: { userIds, event, data },
        returnvalue: { success: true, sync: true },
      }];
    }

    const batches = this.chunkArray(userIds, batchSize);
    const jobs: Job[] = [];

    for (const batch of batches) {
      const job = await this.notificationQueue!.add('notify', {
        userIds: batch,
        event,
        data,
        priority: 3,
      });
      jobs.push(job);
    }

    this.logger.debug(`${jobs.length} notification jobs enqueued for ${userIds.length} users`);
    return jobs;
  }

  // ========================
  // 会话队列操作
  // ========================

  /**
   * 会话更新任务入队
   */
  async enqueueConversationUpdate(data: ConversationJobData): Promise<Job | any> {
    if (!this.enabled) {
      this.logger.debug(`Processing conversation update synchronously`);
      return {
        id: `sync-${Date.now()}`,
        data,
        returnvalue: { success: true, sync: true },
      };
    }

    const job = await this.conversationQueue!.add('update', data, {
      priority: 4,
    });

    this.logger.debug(`Conversation job ${job.id} enqueued`);
    return job;
  }

  /**
   * 批量会话更新
   */
  async enqueueConversationUpdatesBatch(
    groupId: string,
    memberIds: string[],
    messageId: string,
    content: string,
    messageTime: Date,
  ): Promise<Job[] | any[]> {
    if (!this.enabled) {
      this.logger.debug(`Processing ${memberIds.length} conversation updates synchronously`);
      return [{
        id: `sync-${Date.now()}`,
        data: { groupId, memberIds, messageId, content, messageTime },
        returnvalue: { success: true, sync: true },
      }];
    }

    const jobs = await this.conversationQueue!.addBulk(
      memberIds.map((userId) => ({
        name: 'update',
        data: {
          userId,
          targetId: groupId,
          type: 'group',
          messageId,
          content,
          messageTime,
          incrementUnread: true,
        } as ConversationJobData,
        opts: { priority: 4 },
      })),
    );

    this.logger.debug(`${jobs.length} conversation jobs enqueued`);
    return jobs;
  }

  // ========================
  // Webhook 队列操作
  // ========================

  /**
   * Webhook 任务入队
   */
  async enqueueWebhook(data: WebhookJobData, delay?: number): Promise<Job | any> {
    if (!this.enabled) {
      this.logger.debug(`Processing webhook synchronously`);
      return {
        id: `sync-${Date.now()}`,
        data,
        returnvalue: { success: true, sync: true },
      };
    }

    const job = await this.webhookQueue!.add('send', data, {
      priority: 2,
      delay,
      attempts: data.retryCount || 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.debug(`Webhook job ${job.id} enqueued`);
    return job;
  }

  // ========================
  // 清理任务队列
  // ========================

  /**
   * 添加清理任务
   */
  async scheduleCleanup(type: string, data: any, cron?: string): Promise<Job | any> {
    if (!this.enabled) {
      this.logger.debug(`Cleanup task scheduled (sync mode): ${type}`);
      return {
        id: `sync-${Date.now()}`,
        data: { type, data },
        returnvalue: { success: true, sync: true },
      };
    }

    if (cron) {
      return this.cleanupQueue!.add('cleanup', { type, data }, { repeat: { pattern: cron } });
    }
    return this.cleanupQueue!.add('cleanup', { type, data });
  }

  // ========================
  // 队列管理
  // ========================

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    if (!this.enabled) {
      return {
        enabled: false,
        message: { waiting: 0, active: 0, completed: 0, failed: 0 },
        notification: { waiting: 0, active: 0 },
        conversation: { waiting: 0, active: 0 },
      };
    }

    const [
      messageWaiting,
      messageActive,
      messageCompleted,
      messageFailed,
      notificationWaiting,
      notificationActive,
      conversationWaiting,
      conversationActive,
    ] = await Promise.all([
      this.messageQueue!.getWaitingCount(),
      this.messageQueue!.getActiveCount(),
      this.messageQueue!.getCompletedCount(),
      this.messageQueue!.getFailedCount(),
      this.notificationQueue!.getWaitingCount(),
      this.notificationQueue!.getActiveCount(),
      this.conversationQueue!.getWaitingCount(),
      this.conversationQueue!.getActiveCount(),
    ]);

    return {
      enabled: true,
      message: {
        waiting: messageWaiting,
        active: messageActive,
        completed: messageCompleted,
        failed: messageFailed,
      },
      notification: {
        waiting: notificationWaiting,
        active: notificationActive,
      },
      conversation: {
        waiting: conversationWaiting,
        active: conversationActive,
      },
    };
  }

  /**
   * 清空队列
   */
  async cleanQueue(queueName: 'message' | 'notification' | 'conversation' | 'webhook' | 'cleanup') {
    if (!this.enabled) {
      this.logger.warn(`Cannot clean queue ${queueName}: BullMQ is disabled`);
      return;
    }

    const queueMap = {
      message: this.messageQueue!,
      notification: this.notificationQueue!,
      conversation: this.conversationQueue!,
      webhook: this.webhookQueue!,
      cleanup: this.cleanupQueue!,
    };

    const queue = queueMap[queueName];
    await queue.clean(0, 0, 'completed');
    await queue.clean(0, 0, 'failed');
    await queue.clean(0, 0, 'wait');

    this.logger.log(`${queueName} queue cleaned`);
  }

  /**
   * 暂停队列
   */
  async pauseQueue(queueName: 'message' | 'notification' | 'conversation') {
    if (!this.enabled) {
      this.logger.warn(`Cannot pause queue ${queueName}: BullMQ is disabled`);
      return;
    }

    const queueMap = {
      message: this.messageQueue!,
      notification: this.notificationQueue!,
      conversation: this.conversationQueue!,
    };

    await queueMap[queueName].pause();
    this.logger.log(`${queueName} queue paused`);
  }

  /**
   * 恢复队列
   */
  async resumeQueue(queueName: 'message' | 'notification' | 'conversation') {
    if (!this.enabled) {
      this.logger.warn(`Cannot resume queue ${queueName}: BullMQ is disabled`);
      return;
    }

    const queueMap = {
      message: this.messageQueue!,
      notification: this.notificationQueue!,
      conversation: this.conversationQueue!,
    };

    await queueMap[queueName].resume();
    this.logger.log(`${queueName} queue resumed`);
  }

  // ========================
  // 工具方法
  // ========================

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
