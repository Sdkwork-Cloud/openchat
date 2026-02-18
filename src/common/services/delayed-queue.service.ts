import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DelayedMessage<T = any> {
  id: string;
  payload: T;
  scheduledAt: number;
  createdAt: number;
  status: 'pending' | 'ready' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  delay: number;
  topic?: string;
  metadata?: Record<string, any>;
}

export interface DelayedQueueOptions {
  name: string;
  checkInterval?: number;
  maxDelay?: number;
  batchSize?: number;
  onReady?: (message: DelayedMessage) => void;
}

export interface DelayedQueueStats {
  name: string;
  total: number;
  pending: number;
  ready: number;
  processing: number;
  completed: number;
  failed: number;
  averageDelay: number;
}

@Injectable()
export class DelayedQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DelayedQueueService.name);
  private readonly queues = new Map<string, {
    options: Required<DelayedQueueOptions>;
    messages: DelayedMessage[];
    ready: DelayedMessage[];
    processing: Map<string, DelayedMessage>;
    completed: DelayedMessage[];
    failed: DelayedMessage[];
    stats: {
      totalMessages: number;
      totalDelay: number;
      processedCount: number;
    };
    checkTimer?: NodeJS.Timeout;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('DelayedQueueService initialized');
  }

  onModuleDestroy() {
    for (const [, queue] of this.queues) {
      if (queue.checkTimer) {
        clearInterval(queue.checkTimer);
      }
    }
  }

  createQueue(options: DelayedQueueOptions): void {
    const name = options.name;

    if (this.queues.has(name)) {
      throw new Error(`Delayed queue '${name}' already exists`);
    }

    const defaultOptions: Required<DelayedQueueOptions> = {
      name,
      checkInterval: options.checkInterval || 1000,
      maxDelay: options.maxDelay || 7 * 24 * 60 * 60 * 1000,
      batchSize: options.batchSize || 100,
      onReady: options.onReady || (() => {}),
    };

    const queue = {
      options: defaultOptions,
      messages: [],
      ready: [],
      processing: new Map(),
      completed: [],
      failed: [],
      stats: {
        totalMessages: 0,
        totalDelay: 0,
        processedCount: 0,
      },
    };

    this.queues.set(name, queue);
    this.startChecking(name);

    this.logger.log(`Delayed queue '${name}' created`);
  }

  schedule<T = any>(
    queueName: string,
    payload: T,
    delay: number,
    options?: {
      topic?: string;
      metadata?: Record<string, any>;
      maxAttempts?: number;
    },
  ): DelayedMessage<T> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Delayed queue '${queueName}' not found`);
    }

    if (delay > queue.options.maxDelay) {
      throw new Error(`Delay ${delay}ms exceeds maximum allowed delay ${queue.options.maxDelay}ms`);
    }

    const now = Date.now();
    const message: DelayedMessage<T> = {
      id: this.generateMessageId(),
      payload,
      scheduledAt: now + delay,
      createdAt: now,
      status: 'pending',
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      delay,
      topic: options?.topic,
      metadata: options?.metadata,
    };

    const insertIndex = this.findInsertIndex(queue.messages, message.scheduledAt);
    queue.messages.splice(insertIndex, 0, message);

    queue.stats.totalMessages++;

    return message;
  }

  scheduleAt<T = any>(
    queueName: string,
    payload: T,
    scheduledAt: Date | number,
    options?: {
      topic?: string;
      metadata?: Record<string, any>;
      maxAttempts?: number;
    },
  ): DelayedMessage<T> {
    const timestamp = typeof scheduledAt === 'number' ? scheduledAt : scheduledAt.getTime();
    const delay = Math.max(0, timestamp - Date.now());

    return this.schedule(queueName, payload, delay, options);
  }

  cancel(queueName: string, messageId: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const index = queue.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      queue.messages.splice(index, 1);
      return true;
    }

    const readyIndex = queue.ready.findIndex(m => m.id === messageId);
    if (readyIndex !== -1) {
      queue.ready.splice(readyIndex, 1);
      return true;
    }

    return false;
  }

  getReady<T = any>(queueName: string, limit?: number): DelayedMessage<T>[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    const count = limit || queue.options.batchSize;
    return queue.ready.slice(0, count) as DelayedMessage<T>[];
  }

  ack(queueName: string, messageId: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const message = queue.processing.get(messageId);
    if (!message) return false;

    message.status = 'completed';
    queue.processing.delete(messageId);
    queue.completed.push(message);

    const actualDelay = Date.now() - message.createdAt;
    queue.stats.totalDelay += actualDelay;
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
      queue.processing.delete(messageId);
      queue.failed.push(message);
      return true;
    }

    message.status = 'pending';
    message.scheduledAt = Date.now() + this.calculateBackoff(message.attempts);
    queue.processing.delete(messageId);

    const insertIndex = this.findInsertIndex(queue.messages, message.scheduledAt);
    queue.messages.splice(insertIndex, 0, message);

    return true;
  }

  getMessage(queueName: string, messageId: string): DelayedMessage | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;

    return (
      queue.messages.find(m => m.id === messageId) ||
      queue.ready.find(m => m.id === messageId) ||
      queue.processing.get(messageId) ||
      queue.completed.find(m => m.id === messageId) ||
      queue.failed.find(m => m.id === messageId)
    );
  }

  getByTopic(queueName: string, topic: string): DelayedMessage[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    return queue.messages.filter(m => m.topic === topic);
  }

  getStats(queueName: string): DelayedQueueStats {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Delayed queue '${queueName}' not found`);
    }

    const avgDelay = queue.stats.processedCount > 0
      ? queue.stats.totalDelay / queue.stats.processedCount
      : 0;

    return {
      name: queueName,
      total: queue.stats.totalMessages,
      pending: queue.messages.length,
      ready: queue.ready.length,
      processing: queue.processing.size,
      completed: queue.completed.length,
      failed: queue.failed.length,
      averageDelay: avgDelay,
    };
  }

  purge(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const count = queue.messages.length + queue.ready.length;
    queue.messages = [];
    queue.ready = [];

    return count;
  }

  deleteQueue(queueName: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    if (queue.checkTimer) {
      clearInterval(queue.checkTimer);
    }

    return this.queues.delete(queueName);
  }

  private startChecking(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    queue.checkTimer = setInterval(() => {
      this.checkReadyMessages(queueName);
    }, queue.options.checkInterval);
  }

  private checkReadyMessages(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    const now = Date.now();
    const readyMessages: DelayedMessage[] = [];

    while (queue.messages.length > 0 && queue.messages[0].scheduledAt <= now) {
      const message = queue.messages.shift()!;
      message.status = 'ready';
      readyMessages.push(message);
    }

    queue.ready.push(...readyMessages);

    for (const message of readyMessages) {
      queue.options.onReady(message);
    }
  }

  private findInsertIndex(messages: DelayedMessage[], scheduledAt: number): number {
    let low = 0;
    let high = messages.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (messages[mid].scheduledAt < scheduledAt) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  private calculateBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 60000);
  }

  private generateMessageId(): string {
    return `delayed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
