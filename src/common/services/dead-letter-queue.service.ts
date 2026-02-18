import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DeadLetterReason = 'max_retries' | 'timeout' | 'validation_error' | 'processing_error' | 'manual' | 'expired';

export interface DeadLetterMessage<T = any> {
  id: string;
  originalId: string;
  originalQueue: string;
  payload: T;
  reason: DeadLetterReason;
  error?: string;
  errorStack?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  failedAt: number;
  originalHeaders?: Record<string, string>;
  originalMetadata?: Record<string, any>;
  retryHistory: Array<{
    attempt: number;
    timestamp: number;
    error?: string;
  }>;
  status: 'pending' | 'retrying' | 'retried' | 'discarded';
}

export interface DeadLetterQueueOptions {
  name: string;
  maxSize?: number;
  retentionDays?: number;
  maxRetries?: number;
  enableAutoRetry?: boolean;
  retryDelay?: number;
  onDeadLetter?: (message: DeadLetterMessage) => void;
}

export interface DeadLetterQueueStats {
  name: string;
  total: number;
  pending: number;
  retrying: number;
  retried: number;
  discarded: number;
  byReason: Record<DeadLetterReason, number>;
  byOriginalQueue: Record<string, number>;
}

@Injectable()
export class DeadLetterQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly queues = new Map<string, {
    options: Required<DeadLetterQueueOptions>;
    messages: DeadLetterMessage[];
    stats: {
      totalMessages: number;
      byReason: Record<DeadLetterReason, number>;
      byOriginalQueue: Record<string, number>;
    };
    cleanupTimer?: NodeJS.Timeout;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('DeadLetterQueueService initialized');
  }

  onModuleDestroy() {
    for (const [, queue] of this.queues) {
      if (queue.cleanupTimer) {
        clearInterval(queue.cleanupTimer);
      }
    }
  }

  createQueue(options: DeadLetterQueueOptions): void {
    const name = options.name;

    if (this.queues.has(name)) {
      throw new Error(`Dead letter queue '${name}' already exists`);
    }

    const defaultOptions: Required<DeadLetterQueueOptions> = {
      name,
      maxSize: options.maxSize || 10000,
      retentionDays: options.retentionDays || 30,
      maxRetries: options.maxRetries || 1,
      enableAutoRetry: options.enableAutoRetry || false,
      retryDelay: options.retryDelay || 60000,
      onDeadLetter: options.onDeadLetter || (() => {}),
    };

    const queue = {
      options: defaultOptions,
      messages: [],
      stats: {
        totalMessages: 0,
        byReason: {
          max_retries: 0,
          timeout: 0,
          validation_error: 0,
          processing_error: 0,
          manual: 0,
          expired: 0,
        },
        byOriginalQueue: {},
      },
    };

    this.queues.set(name, queue);
    this.startCleanup(name);

    this.logger.log(`Dead letter queue '${name}' created`);
  }

  add<T = any>(
    queueName: string,
    message: {
      originalId: string;
      originalQueue: string;
      payload: T;
      reason: DeadLetterReason;
      error?: string;
      errorStack?: string;
      attempts: number;
      maxAttempts: number;
      originalHeaders?: Record<string, string>;
      originalMetadata?: Record<string, any>;
      retryHistory?: Array<{ attempt: number; timestamp: number; error?: string }>;
    },
  ): DeadLetterMessage<T> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Dead letter queue '${queueName}' not found`);
    }

    if (queue.messages.length >= queue.options.maxSize) {
      this.logger.warn(`Dead letter queue '${queueName}' is full, removing oldest message`);
      queue.messages.shift();
    }

    const dlqMessage: DeadLetterMessage<T> = {
      id: this.generateMessageId(),
      originalId: message.originalId,
      originalQueue: message.originalQueue,
      payload: message.payload,
      reason: message.reason,
      error: message.error,
      errorStack: message.errorStack,
      attempts: message.attempts,
      maxAttempts: message.maxAttempts,
      createdAt: Date.now(),
      failedAt: Date.now(),
      originalHeaders: message.originalHeaders,
      originalMetadata: message.originalMetadata,
      retryHistory: message.retryHistory || [],
      status: 'pending',
    };

    queue.messages.push(dlqMessage);
    queue.stats.totalMessages++;
    queue.stats.byReason[message.reason]++;
    queue.stats.byOriginalQueue[message.originalQueue] =
      (queue.stats.byOriginalQueue[message.originalQueue] || 0) + 1;

    queue.options.onDeadLetter(dlqMessage);

    this.logger.warn(
      `Message ${message.originalId} from queue '${message.originalQueue}' added to DLQ '${queueName}': ${message.reason}`
    );

    return dlqMessage;
  }

  get<T = any>(queueName: string, messageId: string): DeadLetterMessage<T> | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;

    return queue.messages.find(m => m.id === messageId) as DeadLetterMessage<T> | undefined;
  }

  getByOriginalId<T = any>(queueName: string, originalId: string): DeadLetterMessage<T> | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;

    return queue.messages.find(m => m.originalId === originalId) as DeadLetterMessage<T> | undefined;
  }

  getByOriginalQueue(queueName: string, originalQueue: string): DeadLetterMessage[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    return queue.messages.filter(m => m.originalQueue === originalQueue);
  }

  getByReason(queueName: string, reason: DeadLetterReason): DeadLetterMessage[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    return queue.messages.filter(m => m.reason === reason);
  }

  list(queueName: string, options?: {
    limit?: number;
    offset?: number;
    reason?: DeadLetterReason;
    originalQueue?: string;
  }): DeadLetterMessage[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    let messages = [...queue.messages];

    if (options?.reason) {
      messages = messages.filter(m => m.reason === options.reason);
    }

    if (options?.originalQueue) {
      messages = messages.filter(m => m.originalQueue === options.originalQueue);
    }

    messages.sort((a, b) => b.failedAt - a.failedAt);

    if (options?.offset !== undefined) {
      messages = messages.slice(options.offset);
    }

    if (options?.limit !== undefined) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  async retry<T = any>(
    queueName: string,
    messageId: string,
    handler: (message: DeadLetterMessage<T>) => Promise<boolean>,
  ): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const message = queue.messages.find(m => m.id === messageId);
    if (!message || message.status !== 'pending') return false;

    message.status = 'retrying';

    try {
      const success = await handler(message as DeadLetterMessage<T>);

      if (success) {
        message.status = 'retried';
        this.logger.log(`Message ${message.originalId} successfully retried from DLQ '${queueName}'`);
        return true;
      } else {
        message.status = 'pending';
        return false;
      }
    } catch (error: any) {
      message.status = 'pending';
      message.retryHistory.push({
        attempt: message.retryHistory.length + 1,
        timestamp: Date.now(),
        error: error.message,
      });

      this.logger.error(`Failed to retry message ${message.originalId} from DLQ '${queueName}': ${error.message}`);
      return false;
    }
  }

  discard(queueName: string, messageId: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const index = queue.messages.findIndex(m => m.id === messageId);
    if (index === -1) return false;

    const message = queue.messages[index];
    message.status = 'discarded';
    queue.messages.splice(index, 1);

    this.logger.log(`Message ${message.originalId} discarded from DLQ '${queueName}'`);

    return true;
  }

  requeue(queueName: string, messageId: string, targetQueue?: string): DeadLetterMessage | null {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const index = queue.messages.findIndex(m => m.id === messageId);
    if (index === -1) return null;

    const message = queue.messages[index];
    message.status = 'retried';

    queue.messages.splice(index, 1);

    this.logger.log(
      `Message ${message.originalId} requeued to '${targetQueue || message.originalQueue}' from DLQ '${queueName}'`
    );

    return message;
  }

  purge(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const count = queue.messages.length;
    queue.messages = [];

    return count;
  }

  getStats(queueName: string): DeadLetterQueueStats {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Dead letter queue '${queueName}' not found`);
    }

    const byReason: Record<DeadLetterReason, number> = {
      max_retries: 0,
      timeout: 0,
      validation_error: 0,
      processing_error: 0,
      manual: 0,
      expired: 0,
    };

    const byOriginalQueue: Record<string, number> = {};

    for (const message of queue.messages) {
      byReason[message.reason]++;
      byOriginalQueue[message.originalQueue] = (byOriginalQueue[message.originalQueue] || 0) + 1;
    }

    return {
      name: queueName,
      total: queue.messages.length,
      pending: queue.messages.filter(m => m.status === 'pending').length,
      retrying: queue.messages.filter(m => m.status === 'retrying').length,
      retried: queue.messages.filter(m => m.status === 'retried').length,
      discarded: queue.messages.filter(m => m.status === 'discarded').length,
      byReason,
      byOriginalQueue,
    };
  }

  deleteQueue(queueName: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    if (queue.cleanupTimer) {
      clearInterval(queue.cleanupTimer);
    }

    return this.queues.delete(queueName);
  }

  private startCleanup(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    queue.cleanupTimer = setInterval(() => {
      this.cleanup(queueName);
    }, 24 * 60 * 60 * 1000);
  }

  private cleanup(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    const threshold = Date.now() - queue.options.retentionDays * 24 * 60 * 60 * 1000;
    const initialLength = queue.messages.length;

    queue.messages = queue.messages.filter(m => m.failedAt >= threshold);

    const removed = initialLength - queue.messages.length;
    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} expired messages from DLQ '${queueName}'`);
    }
  }

  private generateMessageId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
