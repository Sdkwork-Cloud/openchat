import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ConcurrencyConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout: number;
}

interface QueueItem<T, R> {
  task: () => Promise<R>;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
  context?: T;
}

@Injectable()
export class ConcurrencyControlService {
  private readonly logger = new Logger(ConcurrencyControlService.name);
  private readonly queues = new Map<string, {
    items: QueueItem<any, any>[];
    running: number;
    config: ConcurrencyConfig;
  }>();

  constructor(private readonly configService: ConfigService) {}

  createQueue(name: string, config?: Partial<ConcurrencyConfig>): void {
    const defaultConfig: ConcurrencyConfig = {
      maxConcurrent: this.configService.get('CONCURRENCY_MAX', 10),
      maxQueueSize: this.configService.get('CONCURRENCY_QUEUE_SIZE', 1000),
      timeout: this.configService.get('CONCURRENCY_TIMEOUT', 30000),
    };

    this.queues.set(name, {
      items: [],
      running: 0,
      config: { ...defaultConfig, ...config },
    });
  }

  async execute<T, R>(
    queueName: string,
    task: () => Promise<R>,
    context?: T,
  ): Promise<R> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.createQueue(queueName);
      return this.execute(queueName, task, context);
    }

    if (queue.items.length >= queue.config.maxQueueSize) {
      throw new Error(`Queue ${queueName} is full, rejecting task`);
    }

    return new Promise<R>((resolve, reject) => {
      queue.items.push({ task, resolve, reject, context });
      this.processQueue(queueName);
    });
  }

  private async processQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    while (queue.items.length > 0 && queue.running < queue.config.maxConcurrent) {
      const item = queue.items.shift();
      if (!item) break;

      queue.running++;

      this.executeWithTimeout(queueName, item)
        .finally(() => {
          queue.running--;
          this.processQueue(queueName);
        });
    }
  }

  private async executeWithTimeout<R>(
    queueName: string,
    item: QueueItem<any, R>,
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timed out after ${queue.config.timeout}ms`));
      }, queue.config.timeout);
    });

    try {
      const result = await Promise.race([
        item.task(),
        timeoutPromise,
      ]);
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }

  getQueueStats(queueName: string): {
    queueSize: number;
    running: number;
    maxConcurrent: number;
    maxQueueSize: number;
  } | null {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    return {
      queueSize: queue.items.length,
      running: queue.running,
      maxConcurrent: queue.config.maxConcurrent,
      maxQueueSize: queue.config.maxQueueSize,
    };
  }

  getAllQueueStats(): Record<string, ReturnType<typeof this.getQueueStats>> {
    const stats: Record<string, ReturnType<typeof this.getQueueStats>> = {};
    for (const [name] of this.queues) {
      stats[name] = this.getQueueStats(name);
    }
    return stats;
  }

  async executeWithRetry<T>(
    task: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
    } = options;

    let lastError: Error | null = null;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          this.logger.warn(
            `Task failed on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delay}ms`,
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }
    }

    throw lastError || new Error('Task failed after all retries');
  }

  async executeWithCircuitBreaker<T>(
    circuitName: string,
    task: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
    } = {},
  ): Promise<T> {
    const { failureThreshold = 5, resetTimeout = 30000 } = options;
    const circuitKey = `circuit:${circuitName}`;
    
    const failures = parseInt(await this.getFromMemory(circuitKey) || '0', 10);
    
    if (failures >= failureThreshold) {
      throw new Error(`Circuit breaker ${circuitName} is open`);
    }

    try {
      const result = await task();
      await this.setInMemory(circuitKey, '0', resetTimeout / 1000);
      return result;
    } catch (error) {
      const newFailures = failures + 1;
      await this.setInMemory(circuitKey, newFailures.toString(), resetTimeout / 1000);
      throw error;
    }
  }

  private readonly memoryCache = new Map<string, { value: string; expiry: number }>();

  private async getFromMemory(key: string): Promise<string | null> {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    return null;
  }

  private async setInMemory(key: string, value: string, ttl: number): Promise<void> {
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttl * 1000,
    });
  }
}
