import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

export type ScheduleType = 'cron' | 'interval' | 'timeout' | 'once';

export interface ScheduleOptions {
  name?: string;
  type: ScheduleType;
  cron?: string;
  interval?: number;
  delay?: number;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  runOnInit?: boolean;
  recoverable?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  type: ScheduleType;
  options: ScheduleOptions;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  lastRun?: Date;
  nextRun?: Date;
  lastError?: string;
  runCount: number;
  errorCount: number;
  averageDuration: number;
}

export interface TaskContext {
  taskId: string;
  taskName: string;
  scheduledTime: Date;
  actualTime: Date;
  runCount: number;
  metadata?: Record<string, unknown>;
}

export type TaskHandler = (context: TaskContext) => Promise<void>;

interface PausedTaskState {
  remainingDelay?: number;
}

type ScheduledMethod = (...args: unknown[]) => unknown;
type TimerRef = ReturnType<typeof globalThis.setTimeout>;

interface ScheduledDecoratorTarget {
  constructor: { name: string };
  taskScheduler?: TaskSchedulerService;
}

@Injectable()
export class TaskSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly handlers = new Map<string, TaskHandler>();
  private readonly cronJobs = new Map<string, CronJob<null, null>>();
  private readonly intervals = new Map<string, TimerRef>();
  private readonly timeouts = new Map<string, TimerRef>();
  private readonly retryTimeouts = new Map<string, TimerRef>();
  private readonly pausedTasks = new Map<string, PausedTaskState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.logger.log('TaskSchedulerService initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Stopping all scheduled tasks...');

    for (const [id, job] of this.cronJobs) {
      job.stop();
      this.logger.debug(`Stopped cron job: ${id}`);
    }

    for (const [id, interval] of this.intervals) {
      globalThis.clearInterval(interval);
      this.logger.debug(`Cleared interval: ${id}`);
    }

    for (const [id, timeout] of this.timeouts) {
      globalThis.clearTimeout(timeout);
      this.logger.debug(`Cleared timeout: ${id}`);
    }

    for (const [id, timeout] of this.retryTimeouts) {
      globalThis.clearTimeout(timeout);
      this.logger.debug(`Cleared retry timeout: ${id}`);
    }

    this.cronJobs.clear();
    this.intervals.clear();
    this.timeouts.clear();
    this.retryTimeouts.clear();
    this.pausedTasks.clear();
    this.tasks.clear();
    this.handlers.clear();

    this.logger.log('All scheduled tasks stopped');
  }

  schedule(handler: TaskHandler, options: ScheduleOptions): string {
    this.validateScheduleOptions(options);
    const taskId = options.name || this.generateTaskId();

    if (this.tasks.has(taskId)) {
      throw new Error(`Task with name '${taskId}' already exists`);
    }

    const task: ScheduledTask = {
      id: taskId,
      name: taskId,
      type: options.type,
      options,
      status: 'pending',
      runCount: 0,
      errorCount: 0,
      averageDuration: 0,
    };

    this.tasks.set(taskId, task);
    this.handlers.set(taskId, handler);

    switch (options.type) {
      case 'cron':
        this.setupCronTask(taskId, options);
        break;
      case 'interval':
        this.setupIntervalTask(taskId, options);
        break;
      case 'timeout':
        this.setupTimeoutTask(taskId, options);
        break;
      case 'once':
        this.setupOnceTask(taskId, options);
        break;
    }

    this.logger.log(`Task scheduled: ${taskId}, type: ${options.type}`);
    return taskId;
  }

  private setupCronTask(taskId: string, options: ScheduleOptions): void {
    const cronExpression = this.requireCronExpression(options.cron);
    const job = new CronJob<null, null>(
      cronExpression,
      () => {
        void this.executeTask(taskId);
      },
      null,
      true,
      options.timezone || null,
      null,
      false,
    );

    this.cronJobs.set(taskId, job);

    const task = this.tasks.get(taskId);
    if (task) {
      task.nextRun = job.nextDate().toJSDate();
    }
  }

  private setupIntervalTask(taskId: string, options: ScheduleOptions): void {
    const intervalMs = this.requirePositiveInterval(options.interval);
    if (options.runOnInit) {
      void this.executeTask(taskId);
    }

    const interval = globalThis.setInterval(() => {
      void this.executeTask(taskId);
    }, intervalMs);
    this.intervals.set(taskId, interval);

    const task = this.tasks.get(taskId);
    if (task) {
      task.nextRun = new Date(Date.now() + intervalMs);
    }
  }

  private setupTimeoutTask(taskId: string, options: ScheduleOptions, delayOverride?: number): void {
    const delay = delayOverride ?? this.requireNonNegativeDelay(
      options.delay,
      'Timeout tasks require a non-negative delay',
    );

    const timeout = globalThis.setTimeout(() => {
      void this.executeTask(taskId);
      this.timeouts.delete(taskId);
      const task = this.tasks.get(taskId);
      if (task) {
        task.nextRun = undefined;
      }
    }, delay);

    this.timeouts.set(taskId, timeout);

    const task = this.tasks.get(taskId);
    if (task) {
      task.nextRun = new Date(Date.now() + delay);
    }
  }

  private setupOnceTask(taskId: string, options: ScheduleOptions, delayOverride?: number): void {
    let delay = delayOverride ?? this.requireNonNegativeDelay(
      options.delay ?? 0,
      'Once tasks require a non-negative delay',
    );

    if (delayOverride === undefined && options.startDate) {
      const startDate = this.requireValidDate(options.startDate, 'Once tasks require a valid startDate');
      delay = Math.max(0, startDate.getTime() - Date.now());
    }

    const timeout = globalThis.setTimeout(async () => {
      await this.executeTask(taskId);
      this.timeouts.delete(taskId);

      const task = this.tasks.get(taskId);
      if (task?.status === 'completed') {
        this.tasks.delete(taskId);
        this.handlers.delete(taskId);
        this.pausedTasks.delete(taskId);
      }
    }, delay);

    this.timeouts.set(taskId, timeout);

    const task = this.tasks.get(taskId);
    if (task) {
      task.nextRun = new Date(Date.now() + delay);
    }
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    this.clearTaskResources(taskId);

    this.tasks.delete(taskId);
    this.handlers.delete(taskId);
    this.pausedTasks.delete(taskId);

    this.logger.log(`Task cancelled: ${taskId}`);
    return true;
  }

  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    if (this.cronJobs.has(taskId)) {
      const job = this.cronJobs.get(taskId);
      if (job) {
        job.stop();
      }
    } else if (this.intervals.has(taskId)) {
      const interval = this.intervals.get(taskId);
      if (interval) {
        globalThis.clearInterval(interval);
        this.intervals.delete(taskId);
      }
    } else if (this.timeouts.has(taskId)) {
      const timeout = this.timeouts.get(taskId);
      if (timeout) {
        globalThis.clearTimeout(timeout);
        this.timeouts.delete(taskId);
      }

      this.pausedTasks.set(taskId, {
        remainingDelay: this.getRemainingDelay(task),
      });
    }

    task.status = 'paused';
    task.nextRun = undefined;
    this.logger.log(`Task paused: ${taskId}`);
    return true;
  }

  resume(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'paused') {
      return false;
    }

    if (this.cronJobs.has(taskId)) {
      const job = this.cronJobs.get(taskId);
      if (job) {
        job.start();
        task.nextRun = job.nextDate().toJSDate();
      }
    } else if (task.type === 'interval') {
      this.setupIntervalTask(taskId, task.options);
    } else if (task.type === 'timeout') {
      const pausedState = this.pausedTasks.get(taskId);
      this.setupTimeoutTask(taskId, task.options, pausedState?.remainingDelay);
    } else if (task.type === 'once') {
      const pausedState = this.pausedTasks.get(taskId);
      this.setupOnceTask(taskId, task.options, pausedState?.remainingDelay);
    }

    task.status = 'pending';
    this.pausedTasks.delete(taskId);
    this.logger.log(`Task resumed: ${taskId}`);
    return true;
  }

  async runNow(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    await this.executeTask(taskId);
    return true;
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getTasksByStatus(status: ScheduledTask['status']): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === status);
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const handler = this.handlers.get(taskId);

    if (!task || !handler) {
      this.logger.warn(`Task not found: ${taskId}`);
      return;
    }

    if (task.status === 'paused') {
      this.logger.debug(`Task execution skipped because it is paused: ${taskId}`);
      return;
    }

    const startTime = Date.now();
    task.status = 'running';
    task.lastRun = new Date();

    const context: TaskContext = {
      taskId,
      taskName: task.name,
      scheduledTime: task.lastRun,
      actualTime: new Date(),
      runCount: task.runCount,
    };

    try {
      await handler(context);

      task.runCount++;
      task.status = task.type === 'once' ? 'completed' : 'pending';
      task.lastError = undefined;

      const duration = Date.now() - startTime;
      task.averageDuration =
        task.runCount === 1
          ? duration
          : (task.averageDuration * (task.runCount - 1) + duration) / task.runCount;

      if (this.cronJobs.has(taskId)) {
        const job = this.cronJobs.get(taskId);
        if (job) {
          task.nextRun = job.nextDate().toJSDate();
        }
      } else if (task.type === 'interval' && task.options.interval !== undefined) {
        task.nextRun = new Date(Date.now() + task.options.interval);
      }

      this.logger.debug(`Task completed: ${taskId}, duration: ${duration}ms`);
    } catch (error: unknown) {
      task.errorCount++;
      task.lastError = this.getErrorMessage(error);
      task.status = 'failed';

      this.logger.error(`Task failed: ${taskId}, error: ${task.lastError}`);

      if (task.options.recoverable && task.errorCount < (task.options.maxRetries || 3)) {
        const retryDelay = task.options.retryDelay || 5000;
        this.logger.log(`Scheduling retry for task: ${taskId} in ${retryDelay}ms`);

        const retryTimeout = globalThis.setTimeout(() => {
          this.retryTimeouts.delete(taskId);
          task.status = 'pending';
          void this.executeTask(taskId);
        }, retryDelay);

        this.retryTimeouts.set(taskId, retryTimeout);
      }
    }
  }

  private validateScheduleOptions(options: ScheduleOptions): void {
    switch (options.type) {
      case 'cron':
        this.requireCronExpression(options.cron);
        break;
      case 'interval':
        this.requirePositiveInterval(options.interval);
        break;
      case 'timeout':
        this.requireNonNegativeDelay(options.delay, 'Timeout tasks require a non-negative delay');
        break;
      case 'once':
        if (options.startDate) {
          this.requireValidDate(options.startDate, 'Once tasks require a valid startDate');
        }
        if (options.delay !== undefined) {
          this.requireNonNegativeDelay(options.delay, 'Once tasks require a non-negative delay');
        }
        break;
    }
  }

  private requireCronExpression(cron: string | undefined): string {
    if (typeof cron !== 'string' || cron.trim().length === 0) {
      throw new Error('Cron tasks require a cron expression');
    }

    return cron;
  }

  private requirePositiveInterval(interval: number | undefined): number {
    if (typeof interval !== 'number' || !Number.isFinite(interval) || interval <= 0) {
      throw new Error('Interval tasks require a positive interval');
    }

    return interval;
  }

  private requireNonNegativeDelay(delay: number | undefined, errorMessage: string): number {
    if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0) {
      throw new Error(errorMessage);
    }

    return delay;
  }

  private requireValidDate(date: Date, errorMessage: string): Date {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error(errorMessage);
    }

    return date;
  }

  private clearTaskResources(taskId: string): void {
    const cronJob = this.cronJobs.get(taskId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(taskId);
    }

    const interval = this.intervals.get(taskId);
    if (interval) {
      globalThis.clearInterval(interval);
      this.intervals.delete(taskId);
    }

    const timeout = this.timeouts.get(taskId);
    if (timeout) {
      globalThis.clearTimeout(timeout);
      this.timeouts.delete(taskId);
    }

    const retryTimeout = this.retryTimeouts.get(taskId);
    if (retryTimeout) {
      globalThis.clearTimeout(retryTimeout);
      this.retryTimeouts.delete(taskId);
    }
  }

  private getRemainingDelay(task: ScheduledTask): number {
    if (!task.nextRun) {
      return task.options.delay ?? 0;
    }

    return Math.max(0, task.nextRun.getTime() - Date.now());
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function Scheduled(options: ScheduleOptions) {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<ScheduledMethod>,
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) {
      return descriptor;
    }

    const decoratorTarget = target as ScheduledDecoratorTarget;
    const taskName = options.name || `${decoratorTarget.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      return originalMethod.apply(this, args);
    };

    const taskScheduler = decoratorTarget.taskScheduler;
    if (taskScheduler) {
      taskScheduler.schedule(descriptor.value as unknown as TaskHandler, { ...options, name: taskName });
    }

    return descriptor;
  };
}

export function Cron(cron: string, options?: { timezone?: string; name?: string }) {
  return Scheduled({ type: 'cron', cron, ...options });
}

export function Interval(interval: number, options?: { runOnInit?: boolean; name?: string }) {
  return Scheduled({ type: 'interval', interval, ...options });
}

export function Timeout(delay: number, options?: { name?: string }) {
  return Scheduled({ type: 'timeout', delay, ...options });
}
