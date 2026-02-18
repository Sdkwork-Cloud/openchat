import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task<T = any, R = any> {
  id: string;
  name: string;
  payload: T;
  priority: TaskPriority;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: R;
  error?: string;
  timeout?: number;
  delay?: number;
  metadata?: Record<string, any>;
}

export interface TaskHandler<T = any, R = any> {
  (payload: T, task: Task<T, R>): Promise<R>;
}

export interface TaskQueueOptions {
  name: string;
  concurrency?: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  defaultMaxAttempts?: number;
  defaultTimeout?: number;
  pollInterval?: number;
  onTaskComplete?: (task: Task, result: any) => void;
  onTaskFailed?: (task: Task, error: Error) => void;
}

export interface TaskQueueStats {
  name: string;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
  averageProcessingTime: number;
}

export interface EnqueueOptions {
  priority?: TaskPriority;
  delay?: number;
  maxAttempts?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class TaskQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskQueueService.name);
  private readonly queues = new Map<string, {
    options: Required<TaskQueueOptions>;
    handlers: Map<string, TaskHandler>;
    pending: Task[];
    running: Map<string, Task>;
    completed: Task[];
    failed: Task[];
    processing: boolean;
    pollTimer?: NodeJS.Timeout;
    stats: {
      totalProcessed: number;
      totalFailed: number;
      totalProcessingTime: number;
    };
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('TaskQueueService initialized');
  }

  onModuleDestroy() {
    for (const [name, queue] of this.queues) {
      if (queue.pollTimer) {
        clearInterval(queue.pollTimer);
      }
    }
  }

  createQueue(options: TaskQueueOptions): void {
    const name = options.name;

    if (this.queues.has(name)) {
      throw new Error(`Queue '${name}' already exists`);
    }

    const defaultOptions: Required<TaskQueueOptions> = {
      name,
      concurrency: options.concurrency ?? 5,
      retryDelay: options.retryDelay ?? 1000,
      maxRetryDelay: options.maxRetryDelay ?? 60000,
      defaultMaxAttempts: options.defaultMaxAttempts ?? 3,
      defaultTimeout: options.defaultTimeout ?? 30000,
      pollInterval: options.pollInterval ?? 100,
      onTaskComplete: options.onTaskComplete || (() => {}),
      onTaskFailed: options.onTaskFailed || (() => {}),
    };

    const queue = {
      options: defaultOptions,
      handlers: new Map<string, TaskHandler>(),
      pending: [],
      running: new Map<string, Task>(),
      completed: [],
      failed: [],
      processing: false,
      stats: {
        totalProcessed: 0,
        totalFailed: 0,
        totalProcessingTime: 0,
      },
    };

    this.queues.set(name, queue);
    this.startPolling(name);

    this.logger.log(`Queue '${name}' created with concurrency=${defaultOptions.concurrency}`);
  }

  registerHandler<T = any, R = any>(
    queueName: string,
    taskName: string,
    handler: TaskHandler<T, R>,
  ): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    queue.handlers.set(taskName, handler);
    this.logger.debug(`Handler registered for task '${taskName}' in queue '${queueName}'`);
  }

  async enqueue<T = any, R = any>(
    queueName: string,
    taskName: string,
    payload: T,
    options?: EnqueueOptions,
  ): Promise<Task<T, R>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    if (!queue.handlers.has(taskName)) {
      throw new Error(`No handler registered for task '${taskName}' in queue '${queueName}'`);
    }

    const task: Task<T, R> = {
      id: this.generateTaskId(),
      name: taskName,
      payload,
      priority: options?.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? queue.options.defaultMaxAttempts,
      createdAt: Date.now(),
      timeout: options?.timeout ?? queue.options.defaultTimeout,
      delay: options?.delay,
      metadata: options?.metadata,
    };

    if (task.delay && task.delay > 0) {
      setTimeout(() => {
        this.addToPendingQueue(queue, task);
      }, task.delay);
    } else {
      this.addToPendingQueue(queue, task);
    }

    this.logger.debug(`Task '${taskName}' enqueued with id '${task.id}'`);
    return task;
  }

  async enqueueBatch<T = any, R = any>(
    queueName: string,
    tasks: Array<{ name: string; payload: T; options?: EnqueueOptions }>,
  ): Promise<Task<T, R>[]> {
    const results: Task<T, R>[] = [];

    for (const taskDef of tasks) {
      const task = await this.enqueue<T, R>(queueName, taskDef.name, taskDef.payload, taskDef.options);
      results.push(task);
    }

    return results;
  }

  getTask(queueName: string, taskId: string): Task | undefined {
    const queue = this.queues.get(queueName);
    if (!queue) return undefined;

    return (
      queue.pending.find(t => t.id === taskId) ||
      queue.running.get(taskId) ||
      queue.completed.find(t => t.id === taskId) ||
      queue.failed.find(t => t.id === taskId)
    );
  }

  getStats(queueName: string): TaskQueueStats {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const avgProcessingTime = queue.stats.totalProcessed > 0
      ? queue.stats.totalProcessingTime / queue.stats.totalProcessed
      : 0;

    return {
      name: queueName,
      pending: queue.pending.length,
      running: queue.running.size,
      completed: queue.completed.length,
      failed: queue.failed.length,
      total: queue.pending.length + queue.running.size + queue.completed.length + queue.failed.length,
      averageProcessingTime: avgProcessingTime,
    };
  }

  getAllStats(): TaskQueueStats[] {
    const stats: TaskQueueStats[] = [];
    for (const name of this.queues.keys()) {
      stats.push(this.getStats(name));
    }
    return stats;
  }

  async cancel(queueName: string, taskId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const pendingIndex = queue.pending.findIndex(t => t.id === taskId);
    if (pendingIndex !== -1) {
      const task = queue.pending.splice(pendingIndex, 1)[0];
      task.status = 'cancelled';
      return true;
    }

    const runningTask = queue.running.get(taskId);
    if (runningTask) {
      runningTask.status = 'cancelled';
      return true;
    }

    return false;
  }

  async pause(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    queue.processing = false;
    if (queue.pollTimer) {
      clearInterval(queue.pollTimer);
      queue.pollTimer = undefined;
    }

    this.logger.log(`Queue '${queueName}' paused`);
  }

  async resume(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    queue.processing = true;
    this.startPolling(queueName);

    this.logger.log(`Queue '${queueName}' resumed`);
  }

  async drain(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    queue.pending = [];
    queue.completed = [];
    queue.failed = [];

    this.logger.log(`Queue '${queueName}' drained`);
  }

  destroyQueue(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    if (queue.pollTimer) {
      clearInterval(queue.pollTimer);
    }

    this.queues.delete(queueName);
    this.logger.log(`Queue '${queueName}' destroyed`);
  }

  private addToPendingQueue<T>(queue: {
    pending: Task[];
    options: Required<TaskQueueOptions>;
  }, task: Task<T>): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    const insertIndex = queue.pending.findIndex(
      t => priorityOrder[t.priority] > priorityOrder[task.priority]
    );

    if (insertIndex === -1) {
      queue.pending.push(task);
    } else {
      queue.pending.splice(insertIndex, 0, task);
    }
  }

  private startPolling(queueName: string): void {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    queue.processing = true;
    queue.pollTimer = setInterval(() => {
      this.processQueue(queueName);
    }, queue.options.pollInterval);
  }

  private async processQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue || !queue.processing) return;

    if (queue.running.size >= queue.options.concurrency) return;
    if (queue.pending.length === 0) return;

    const task = queue.pending.shift();
    if (!task) return;

    queue.running.set(task.id, task);
    task.status = 'running';
    task.startedAt = Date.now();
    task.attempts++;

    try {
      const handler = queue.handlers.get(task.name);
      if (!handler) {
        throw new Error(`No handler for task '${task.name}'`);
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeout || queue.options.defaultTimeout);
      });

      const result = await Promise.race([
        handler(task.payload, task),
        timeoutPromise,
      ]);

      task.result = result;
      task.status = 'completed';
      task.completedAt = Date.now();

      queue.running.delete(task.id);
      queue.completed.push(task);

      const processingTime = task.completedAt - (task.startedAt || task.createdAt);
      queue.stats.totalProcessed++;
      queue.stats.totalProcessingTime += processingTime;

      queue.options.onTaskComplete(task, result);

      this.logger.debug(`Task '${task.name}' (${task.id}) completed`);
    } catch (error: any) {
      task.error = error.message;

      if (task.attempts < task.maxAttempts) {
        task.status = 'retrying';

        const delay = Math.min(
          queue.options.retryDelay * Math.pow(2, task.attempts - 1),
          queue.options.maxRetryDelay,
        );

        setTimeout(() => {
          task.status = 'pending';
          this.addToPendingQueue(queue, task);
          queue.running.delete(task.id);
        }, delay);

        this.logger.debug(`Task '${task.name}' (${task.id}) will retry in ${delay}ms`);
      } else {
        task.status = 'failed';
        task.completedAt = Date.now();

        queue.running.delete(task.id);
        queue.failed.push(task);

        queue.stats.totalFailed++;
        queue.options.onTaskFailed(task, error);

        this.logger.error(`Task '${task.name}' (${task.id}) failed: ${error.message}`);
      }
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
