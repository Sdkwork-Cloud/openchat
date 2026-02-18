import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventBusService, EventType } from '../events/event-bus.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

export interface SyncTask {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface SyncConfig {
  entityType: string;
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  priority: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}

export interface SyncProgress {
  taskId: string;
  total: number;
  processed: number;
  percentage: number;
  status: SyncStatus;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export type SyncHandler = (tasks: SyncTask[]) => Promise<void>;

@Injectable()
export class DataSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataSyncService.name);
  private readonly configs = new Map<string, SyncConfig>();
  private readonly handlers = new Map<string, SyncHandler>();
  private readonly pendingTasks = new Map<string, SyncTask>();
  private readonly activeSyncs = new Map<string, SyncProgress>();
  private syncInterval?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.loadPendingTasks();
    this.startSyncInterval();
    this.logger.log('DataSyncService initialized');
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  registerConfig(config: SyncConfig): void {
    this.configs.set(config.entityType, config);
    this.logger.debug(`Sync config registered: ${config.entityType}`);
  }

  registerHandler(entityType: string, handler: SyncHandler): void {
    this.handlers.set(entityType, handler);
    this.logger.debug(`Sync handler registered: ${entityType}`);
  }

  async enqueue(
    entityType: string,
    entityId: string,
    operation: SyncTask['operation'],
    payload: any,
  ): Promise<string> {
    const config = this.configs.get(entityType);
    const taskId = this.generateTaskId();

    const task: SyncTask = {
      id: taskId,
      entityType,
      entityId,
      operation,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: config?.retryAttempts || 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.pendingTasks.set(taskId, task);
    await this.persistTask(task);

    await this.eventBus.publish(EventType.CUSTOM_EVENT, {
      type: 'sync.task.created',
      entityType,
      entityId,
      operation,
    });

    this.logger.debug(`Sync task enqueued: ${taskId} for ${entityType}:${entityId}`);
    return taskId;
  }

  async enqueueBatch(
    entityType: string,
    items: Array<{
      entityId: string;
      operation: SyncTask['operation'];
      payload: any;
    }>,
  ): Promise<string[]> {
    const taskIds: string[] = [];

    for (const item of items) {
      const taskId = await this.enqueue(
        entityType,
        item.entityId,
        item.operation,
        item.payload,
      );
      taskIds.push(taskId);
    }

    return taskIds;
  }

  async getTask(taskId: string): Promise<SyncTask | undefined> {
    return this.pendingTasks.get(taskId);
  }

  async getProgress(taskId: string): Promise<SyncProgress | undefined> {
    return this.activeSyncs.get(taskId);
  }

  async cancel(taskId: string): Promise<boolean> {
    const task = this.pendingTasks.get(taskId);
    if (!task || task.status === 'syncing') {
      return false;
    }

    this.pendingTasks.delete(taskId);
    await this.redisService.del(buildCacheKey('sync_task', taskId));

    this.logger.debug(`Sync task cancelled: ${taskId}`);
    return true;
  }

  async retry(taskId: string): Promise<boolean> {
    const task = this.pendingTasks.get(taskId);
    if (!task || task.status !== 'failed') {
      return false;
    }

    task.status = 'pending';
    task.retryCount = 0;
    task.updatedAt = Date.now();
    task.error = undefined;

    await this.persistTask(task);

    this.logger.debug(`Sync task retried: ${taskId}`);
    return true;
  }

  async processNow(entityType?: string): Promise<SyncResult> {
    if (this.processing) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [],
        duration: 0,
      };
    }

    return this.processTasks(entityType);
  }

  getStats(): {
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  } {
    let pending = 0;
    let syncing = 0;
    let completed = 0;
    let failed = 0;

    for (const task of this.pendingTasks.values()) {
      switch (task.status) {
        case 'pending':
          pending++;
          break;
        case 'syncing':
          syncing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }

    return { pending, syncing, completed, failed };
  }

  private async processTasks(entityType?: string): Promise<SyncResult> {
    this.processing = true;
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    try {
      const tasks = this.getTasksToProcess(entityType);

      for (const [type, typeTasks] of this.groupByType(tasks)) {
        const handler = this.handlers.get(type);
        const config = this.configs.get(type);

        if (!handler) {
          this.logger.warn(`No handler for entity type: ${type}`);
          continue;
        }

        const batches = this.chunk(typeTasks, config?.batchSize || 100);

        for (const batch of batches) {
          try {
            await this.executeBatch(batch, handler);
            processed += batch.length;

            for (const task of batch) {
              task.status = 'completed';
              task.updatedAt = Date.now();
              await this.persistTask(task);
              this.pendingTasks.delete(task.id);
            }
          } catch (error: any) {
            failed += batch.length;

            for (const task of batch) {
              task.retryCount++;
              task.error = error.message;
              task.updatedAt = Date.now();

              if (task.retryCount >= task.maxRetries) {
                task.status = 'failed';
                errors.push({ id: task.id, error: error.message });
              } else {
                task.status = 'pending';
              }

              await this.persistTask(task);
            }
          }
        }
      }
    } finally {
      this.processing = false;
    }

    return {
      success: failed === 0,
      processed,
      failed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  private getTasksToProcess(entityType?: string): SyncTask[] {
    const tasks: SyncTask[] = [];

    for (const task of this.pendingTasks.values()) {
      if (task.status !== 'pending') continue;
      if (entityType && task.entityType !== entityType) continue;
      tasks.push(task);
    }

    return tasks.sort((a, b) => {
      const configA = this.configs.get(a.entityType);
      const configB = this.configs.get(b.entityType);
      return (configB?.priority || 0) - (configA?.priority || 0);
    });
  }

  private groupByType(tasks: SyncTask[]): Map<string, SyncTask[]> {
    const groups = new Map<string, SyncTask[]>();

    for (const task of tasks) {
      if (!groups.has(task.entityType)) {
        groups.set(task.entityType, []);
      }
      groups.get(task.entityType)!.push(task);
    }

    return groups;
  }

  private async executeBatch(tasks: SyncTask[], handler: SyncHandler): Promise<void> {
    for (const task of tasks) {
      task.status = 'syncing';
      task.updatedAt = Date.now();
      await this.persistTask(task);
    }

    await handler(tasks);
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async loadPendingTasks(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys('sync_task:*');

      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const task = JSON.parse(data) as SyncTask;
          this.pendingTasks.set(task.id, task);
        }
      }

      this.logger.debug(`Loaded ${this.pendingTasks.size} pending sync tasks`);
    } catch (error) {
      this.logger.error('Failed to load pending tasks:', error);
    }
  }

  private async persistTask(task: SyncTask): Promise<void> {
    const key = buildCacheKey('sync_task', task.id);
    await this.redisService.set(key, JSON.stringify(task));
  }

  private startSyncInterval(): void {
    const interval = this.configService.get<number>('SYNC_INTERVAL', 5000);

    this.syncInterval = setInterval(() => {
      this.processTasks().catch((err) => {
        this.logger.error('Failed to process sync tasks:', err);
      });
    }, interval);
  }

  private generateTaskId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function Syncable(entityType: string) {
  return function (target: any) {
    target.prototype._syncableEntityType = entityType;
  };
}

export function SyncOnChange() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const syncService = (this as any).syncService as DataSyncService;
      const entityType = (this as any)._syncableEntityType;

      if (syncService && entityType && result) {
        const entityId = result.id || args[0]?.id;
        const operation = propertyKey.includes('create')
          ? 'create'
          : propertyKey.includes('delete')
            ? 'delete'
            : 'update';

        if (entityId) {
          await syncService.enqueue(entityType, entityId, operation, result);
        }
      }

      return result;
    };

    return descriptor;
  };
}
