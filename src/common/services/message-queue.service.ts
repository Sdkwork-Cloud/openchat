import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dlq';
export type AcknowledgmentMode = 'auto' | 'manual';

export interface Message<T = any> {
  id: string;
  queue: string;
  payload: T;
  status: MessageStatus;
  priority: number;
  createdAt: number;
  processedAt?: number;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  ttl?: number;
  correlationId?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  error?: string;
}

export interface QueueOptions {
  name: string;
  maxSize?: number;
  acknowledgmentMode?: AcknowledgmentMode;
  visibilityTimeout?: number;
  messageRetention?: number;
  maxAttempts?: number;
  deadLetterQueue?: string;
  enablePriority?: boolean;
  priorityLevels?: number;
}

export interface ConsumeOptions {
  prefetch?: number;
  autoAck?: boolean;
  maxMessages?: number;
  timeout?: number;
}

export interface QueueStats {
  name: string;
  size: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dlq: number;
  totalMessages: number;
  averageProcessingTime: number;
}

export interface MessageHandler<T = any> {
  (message: Message<T>): Promise<void>;
}

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  private readonly queues = new Map<string, {
    options: Required<QueueOptions>;
    messages: Message[];
    processing: Map<string, Message>;
    completed: Message[];
    failed: Message[];
    dlq: Message[];
    handlers: MessageHandler[];
    stats: {
      totalMessages: number;
      totalProcessingTime: number;
      processedCount: number;
    };
  }>();
  private processingIntervals = new Map<string, NodeJS.Timeout>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('MessageQueueService initialized');
  }

  onModuleDestroy() {
    for (const [queueName, interval] of this.processingIntervals) {
      clearInterval(interval);
    }
  }

  createQueue(options: QueueOptions): void {
    const name = options.name;

    if (this.queues.has(name)) {
      throw new Error(`Queue '${name}' already exists`);
    }

    const defaultOptions: Required<QueueOptions> = {
      name,
      maxSize: options.maxSize || 10000,
      acknowledgmentMode: options.acknowledgmentMode || 'auto',
      visibilityTimeout: options.visibilityTimeout || 30000,
      messageRetention: options.messageRetention || 7 * 24 * 60 * 60 * 1000,
      maxAttempts: options.maxAttempts || 3,
      deadLetterQueue: options.deadLetterQueue || `${name}-dlq`,
      enablePriority: options.enablePriority || false,
      priorityLevels: options.priorityLevels || 10,
    };

    this.queues.set(name, {
      options: defaultOptions,
      messages: [],
      processing: new Map(),
      completed: [],
      failed: [],
      dlq: [],
      handlers: [],
      stats: {
        totalMessages: 0,
        totalProcessingTime: 0,
        processedCount: 0,
      },
    });

    this.logger.log(`Queue '${name}' created`);
  }

  publish<T = any>(
    queueName: string,
    payload: T,
    options?: {
      priority?: number;
      delay?: number;
      ttl?: number;
      correlationId?: string;
      replyTo?: string;
      headers?: Record<string, string>;
      metadata?: Record<string, any>;
      maxAttempts?: number;
    },
  ): Message<T> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    if (queue.messages.length >= queue.options.maxSize) {
      throw new Error(`Queue '${queueName}' is full`);
    }

    const message: Message<T> = {
      id: this.generateMessageId(),
      queue: queueName,
      payload,
      status: 'pending',
      priority: options?.priority || 0,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: options?.maxAttempts || queue.options.maxAttempts,
      delay: options?.delay,
      ttl: options?.ttl,
      correlationId: options?.correlationId,
      replyTo: options?.replyTo,
      headers: options?.headers,
      metadata: options?.metadata,
    };

    if (queue.options.enablePriority) {
      const insertIndex = queue.messages.findIndex(m => m.priority < message.priority);
      if (insertIndex === -1) {
        queue.messages.push(message);
      } else {
        queue.messages.splice(insertIndex, 0, message);
      }
    } else {
      queue.messages.push(message);
    }

    queue.stats.totalMessages++;

    return message;
  }

  publishBatch<T = any>(
    queueName: string,
    messages: Array<{
      payload: T;
      priority?: number;
      delay?: number;
      ttl?: number;
      correlationId?: string;
      headers?: Record<string, string>;
    }>,
  ): Message<T>[] {
    const results: Message<T>[] = [];

    for (const msg of messages) {
      results.push(this.publish(queueName, msg.payload, msg));
    }

    return results;
  }

  subscribe<T = any>(
    queueName: string,
    handler: MessageHandler<T>,
    options?: ConsumeOptions,
  ): () => void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    queue.handlers.push(handler as MessageHandler);

    const prefetch = options?.prefetch || 1;

    const processMessages = async () => {
      const available = queue.messages.filter(m =>
        m.status === 'pending' &&
        (!m.delay || Date.now() >= m.createdAt + m.delay) &&
        (!m.ttl || Date.now() < m.createdAt + m.ttl)
      );

      const toProcess = available.slice(0, prefetch);

      for (const message of toProcess) {
        await this.processMessage(queue, message);
      }
    };

    const interval = setInterval(processMessages, 100);
    this.processingIntervals.set(`${queueName}_${Date.now()}`, interval);

    return () => {
      const index = queue.handlers.indexOf(handler as MessageHandler);
      if (index !== -1) {
        queue.handlers.splice(index, 1);
      }
    };
  }

  async consume<T = any>(
    queueName: string,
    options?: ConsumeOptions,
  ): Promise<Message<T> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const available = queue.messages.filter(m =>
      m.status === 'pending' &&
      (!m.delay || Date.now() >= m.createdAt + m.delay) &&
      (!m.ttl || Date.now() < m.createdAt + m.ttl)
    );

    if (available.length === 0) {
      return null;
    }

    const message = available[0];
    message.status = 'processing';
    queue.processing.set(message.id, message);

    return message as Message<T>;
  }

  ack(queueName: string, messageId: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const message = queue.processing.get(messageId);
    if (!message) return false;

    message.status = 'completed';
    message.processedAt = Date.now();

    queue.processing.delete(messageId);
    queue.completed.push(message);

    const processingTime = message.processedAt - message.createdAt;
    queue.stats.totalProcessingTime += processingTime;
    queue.stats.processedCount++;

    return true;
  }

  nack(queueName: string, messageId: string, requeue?: boolean): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const message = queue.processing.get(messageId);
    if (!message) return false;

    message.attempts++;

    if (message.attempts >= message.maxAttempts || !requeue) {
      message.status = 'failed';
      message.processedAt = Date.now();

      queue.processing.delete(messageId);
      queue.failed.push(message);

      if (queue.options.deadLetterQueue) {
        this.moveToDLQ(queue, message);
      }
    } else {
      message.status = 'pending';
      queue.processing.delete(messageId);

      const index = queue.messages.findIndex(m => m.id === messageId);
      if (index === -1) {
        queue.messages.push(message);
      }
    }

    return true;
  }

  getMessage(queueName: string, messageId: string): Message | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;

    return (
      queue.messages.find(m => m.id === messageId) ||
      queue.processing.get(messageId) ||
      queue.completed.find(m => m.id === messageId) ||
      queue.failed.find(m => m.id === messageId) ||
      queue.dlq.find(m => m.id === messageId)
    );
  }

  getQueueSize(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    return queue.messages.length;
  }

  purge(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const count = queue.messages.length;
    queue.messages = [];

    return count;
  }

  getStats(queueName: string): QueueStats {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const avgTime = queue.stats.processedCount > 0
      ? queue.stats.totalProcessingTime / queue.stats.processedCount
      : 0;

    return {
      name: queueName,
      size: queue.messages.length,
      pending: queue.messages.filter(m => m.status === 'pending').length,
      processing: queue.processing.size,
      completed: queue.completed.length,
      failed: queue.failed.length,
      dlq: queue.dlq.length,
      totalMessages: queue.stats.totalMessages,
      averageProcessingTime: avgTime,
    };
  }

  getAllStats(): QueueStats[] {
    const stats: QueueStats[] = [];
    for (const name of this.queues.keys()) {
      stats.push(this.getStats(name));
    }
    return stats;
  }

  deleteQueue(queueName: string): boolean {
    const interval = this.processingIntervals.get(queueName);
    if (interval) {
      clearInterval(interval);
    }

    return this.queues.delete(queueName);
  }

  private async processMessage(
    queue: {
      options: Required<QueueOptions>;
      messages: Message[];
      processing: Map<string, Message>;
      handlers: MessageHandler[];
      stats: { totalProcessingTime: number; processedCount: number };
      failed: Message[];
      dlq: Message[];
    },
    message: Message,
  ): Promise<void> {
    const index = queue.messages.indexOf(message);
    if (index === -1) return;

    queue.messages.splice(index, 1);
    message.status = 'processing';
    queue.processing.set(message.id, message);

    for (const handler of queue.handlers) {
      try {
        await handler(message);

        message.status = 'completed';
        message.processedAt = Date.now();

        queue.processing.delete(message.id);

        const processingTime = message.processedAt - message.createdAt;
        queue.stats.totalProcessingTime += processingTime;
        queue.stats.processedCount++;

        return;
      } catch (error: any) {
        message.attempts++;
        message.error = error.message;

        if (message.attempts >= message.maxAttempts) {
          message.status = 'failed';
          message.processedAt = Date.now();
          queue.processing.delete(message.id);
          queue.failed.push(message);

          if (queue.options.deadLetterQueue) {
            this.moveToDLQ(queue, message);
          }

          this.logger.error(`Message ${message.id} failed after ${message.attempts} attempts: ${error.message}`);
          return;
        }

        message.status = 'pending';
        queue.processing.delete(message.id);
        queue.messages.unshift(message);
      }
    }
  }

  private moveToDLQ(queue: {
    options: Required<QueueOptions>;
    dlq: Message[];
  }, message: Message): void {
    message.status = 'dlq';
    queue.dlq.push(message);

    this.logger.warn(`Message ${message.id} moved to DLQ`);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
