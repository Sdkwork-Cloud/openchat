import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low' | 'background';

export interface PriorityItem<T = any> {
  id: string;
  payload: T;
  priority: number;
  level: PriorityLevel;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PriorityQueueOptions {
  name: string;
  maxItems?: number;
  priorityLevels?: number;
  starvationPrevention?: boolean;
  starvationThreshold?: number;
  agingFactor?: number;
}

export interface PriorityQueueStats {
  name: string;
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byPriority: Record<PriorityLevel, number>;
  averageWaitTime: number;
}

const PRIORITY_VALUES: Record<PriorityLevel, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  background: 0,
};

@Injectable()
export class PriorityQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriorityQueueService.name);
  private readonly queues = new Map<string, {
    options: Required<PriorityQueueOptions>;
    heap: PriorityItem[];
    processing: Map<string, PriorityItem>;
    completed: PriorityItem[];
    failed: PriorityItem[];
    stats: {
      totalItems: number;
      totalWaitTime: number;
      processedCount: number;
      byPriority: Record<PriorityLevel, number>;
    };
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('PriorityQueueService initialized');
  }

  onModuleDestroy() {
    this.queues.clear();
  }

  createQueue(options: PriorityQueueOptions): void {
    const name = options.name;

    if (this.queues.has(name)) {
      throw new Error(`Priority queue '${name}' already exists`);
    }

    const defaultOptions: Required<PriorityQueueOptions> = {
      name,
      maxItems: options.maxItems || 10000,
      priorityLevels: options.priorityLevels || 5,
      starvationPrevention: options.starvationPrevention !== false,
      starvationThreshold: options.starvationThreshold || 60000,
      agingFactor: options.agingFactor || 0.1,
    };

    this.queues.set(name, {
      options: defaultOptions,
      heap: [],
      processing: new Map(),
      completed: [],
      failed: [],
      stats: {
        totalItems: 0,
        totalWaitTime: 0,
        processedCount: 0,
        byPriority: {
          critical: 0,
          high: 0,
          normal: 0,
          low: 0,
          background: 0,
        },
      },
    });

    this.logger.log(`Priority queue '${name}' created`);
  }

  enqueue<T = any>(
    queueName: string,
    payload: T,
    priority: PriorityLevel | number = 'normal',
    options?: {
      maxAttempts?: number;
      metadata?: Record<string, any>;
      tags?: string[];
    },
  ): PriorityItem<T> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Priority queue '${queueName}' not found`);
    }

    if (queue.heap.length >= queue.options.maxItems) {
      throw new Error(`Priority queue '${queueName}' is full`);
    }

    const priorityValue = typeof priority === 'number'
      ? priority
      : PRIORITY_VALUES[priority];

    const level: PriorityLevel = typeof priority === 'number'
      ? this.getPriorityLevel(priority)
      : priority;

    const item: PriorityItem<T> = {
      id: this.generateItemId(),
      payload,
      priority: priorityValue,
      level,
      createdAt: Date.now(),
      status: 'pending',
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      metadata: options?.metadata,
      tags: options?.tags,
    };

    this.heapPush(queue, item);

    queue.stats.totalItems++;
    queue.stats.byPriority[level]++;

    return item;
  }

  enqueueBatch<T = any>(
    queueName: string,
    items: Array<{
      payload: T;
      priority?: PriorityLevel | number;
      maxAttempts?: number;
      metadata?: Record<string, any>;
    }>,
  ): PriorityItem<T>[] {
    const results: PriorityItem<T>[] = [];

    for (const item of items) {
      results.push(this.enqueue(queueName, item.payload, item.priority, item));
    }

    return results;
  }

  dequeue<T = any>(queueName: string): PriorityItem<T> | null {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Priority queue '${queueName}' not found`);
    }

    if (queue.options.starvationPrevention) {
      this.applyAging(queue);
    }

    const item = this.heapPop(queue);
    if (!item) return null;

    item.status = 'processing';
    queue.processing.set(item.id, item);

    const waitTime = Date.now() - item.createdAt;
    queue.stats.totalWaitTime += waitTime;
    queue.stats.processedCount++;

    return item as PriorityItem<T>;
  }

  peek<T = any>(queueName: string): PriorityItem<T> | null {
    const queue = this.queues.get(queueName);
    if (!queue || queue.heap.length === 0) return null;

    return queue.heap[0] as PriorityItem<T>;
  }

  ack(queueName: string, itemId: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const item = queue.processing.get(itemId);
    if (!item) return false;

    item.status = 'completed';
    queue.processing.delete(itemId);
    queue.completed.push(item);

    return true;
  }

  nack(queueName: string, itemId: string, requeue?: boolean): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const item = queue.processing.get(itemId);
    if (!item) return false;

    item.attempts++;

    if (item.attempts >= item.maxAttempts || !requeue) {
      item.status = 'failed';
      queue.processing.delete(itemId);
      queue.failed.push(item);
      queue.stats.byPriority[item.level]--;
      return true;
    }

    item.status = 'pending';
    item.createdAt = Date.now();
    queue.processing.delete(itemId);
    this.heapPush(queue, item);

    return true;
  }

  getItem(queueName: string, itemId: string): PriorityItem | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;

    return (
      queue.heap.find(i => i.id === itemId) ||
      queue.processing.get(itemId) ||
      queue.completed.find(i => i.id === itemId) ||
      queue.failed.find(i => i.id === itemId)
    );
  }

  getByPriority(queueName: string, level: PriorityLevel): PriorityItem[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    return queue.heap.filter(i => i.level === level);
  }

  getByTags(queueName: string, tags: string[]): PriorityItem[] {
    const queue = this.queues.get(queueName);
    if (!queue) return [];

    return queue.heap.filter(i =>
      i.tags && tags.some(tag => i.tags!.includes(tag))
    );
  }

  getSize(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    return queue.heap.length;
  }

  isEmpty(queueName: string): boolean {
    const queue = this.queues.get(queueName);
    if (!queue) return true;

    return queue.heap.length === 0;
  }

  clear(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;

    const count = queue.heap.length;
    queue.heap = [];

    return count;
  }

  getStats(queueName: string): PriorityQueueStats {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Priority queue '${queueName}' not found`);
    }

    const avgWaitTime = queue.stats.processedCount > 0
      ? queue.stats.totalWaitTime / queue.stats.processedCount
      : 0;

    const byPriority: Record<PriorityLevel, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      background: 0,
    };

    for (const item of queue.heap) {
      byPriority[item.level]++;
    }

    return {
      name: queueName,
      total: queue.stats.totalItems,
      pending: queue.heap.length,
      processing: queue.processing.size,
      completed: queue.completed.length,
      failed: queue.failed.length,
      byPriority,
      averageWaitTime: avgWaitTime,
    };
  }

  deleteQueue(queueName: string): boolean {
    return this.queues.delete(queueName);
  }

  private heapPush(queue: {
    heap: PriorityItem[];
  }, item: PriorityItem): void {
    queue.heap.push(item);
    this.heapifyUp(queue.heap, queue.heap.length - 1);
  }

  private heapPop(queue: {
    heap: PriorityItem[];
  }): PriorityItem | null {
    if (queue.heap.length === 0) return null;

    const top = queue.heap[0];
    const last = queue.heap.pop()!;

    if (queue.heap.length > 0) {
      queue.heap[0] = last;
      this.heapifyDown(queue.heap, 0);
    }

    return top;
  }

  private heapifyUp(heap: PriorityItem[], index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.compareItems(heap[index], heap[parentIndex]) > 0) {
        [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private heapifyDown(heap: PriorityItem[], index: number): void {
    const length = heap.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      if (leftChild < length && this.compareItems(heap[leftChild], heap[largest]) > 0) {
        largest = leftChild;
      }

      if (rightChild < length && this.compareItems(heap[rightChild], heap[largest]) > 0) {
        largest = rightChild;
      }

      if (largest !== index) {
        [heap[index], heap[largest]] = [heap[largest], heap[index]];
        index = largest;
      } else {
        break;
      }
    }
  }

  private compareItems(a: PriorityItem, b: PriorityItem): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    return b.createdAt - a.createdAt;
  }

  private applyAging(queue: {
    heap: PriorityItem[];
    options: Required<PriorityQueueOptions>;
  }): void {
    const now = Date.now();
    const threshold = queue.options.starvationThreshold;
    const factor = queue.options.agingFactor;

    for (const item of queue.heap) {
      const waitTime = now - item.createdAt;

      if (waitTime > threshold) {
        const ageBonus = Math.floor((waitTime - threshold) / 1000) * factor;
        item.priority = Math.min(100, item.priority + ageBonus);
      }
    }

    for (let i = Math.floor(queue.heap.length / 2); i >= 0; i--) {
      this.heapifyDown(queue.heap, i);
    }
  }

  private getPriorityLevel(priority: number): PriorityLevel {
    if (priority >= 90) return 'critical';
    if (priority >= 60) return 'high';
    if (priority >= 40) return 'normal';
    if (priority >= 20) return 'low';
    return 'background';
  }

  private generateItemId(): string {
    return `prio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
