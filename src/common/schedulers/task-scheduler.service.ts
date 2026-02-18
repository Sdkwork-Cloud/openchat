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
  metadata?: Record<string, any>;
}

export type TaskHandler = (context: TaskContext) => Promise<void>;

@Injectable()
export class TaskSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly handlers = new Map<string, TaskHandler>();
  private readonly cronJobs = new Map<string, CronJob<null, null>>();
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly timeouts = new Map<string, NodeJS.Timeout>();

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
      clearInterval(interval);
      this.logger.debug(`Cleared interval: ${id}`);
    }

    for (const [id, timeout] of this.timeouts) {
      clearTimeout(timeout);
      this.logger.debug(`Cleared timeout: ${id}`);
    }

    this.cronJobs.clear();
    this.intervals.clear();
    this.timeouts.clear();
    this.tasks.clear();

    this.logger.log('All scheduled tasks stopped');
  }

  schedule(handler: TaskHandler, options: ScheduleOptions): string {
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
    const job = new CronJob<null, null>(
      options.cron!,
      () => this.executeTask(taskId),
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
    if (options.runOnInit) {
      this.executeTask(taskId);
    }

    const interval = setInterval(() => this.executeTask(taskId), options.interval!);
    this.intervals.set(taskId, interval);
  }

  private setupTimeoutTask(taskId: string, options: ScheduleOptions): void {
    const timeout = setTimeout(() => {
      this.executeTask(taskId);
      this.timeouts.delete(taskId);
    }, options.delay!);

    this.timeouts.set(taskId, timeout);
  }

  private setupOnceTask(taskId: string, options: ScheduleOptions): void {
    let delay = options.delay || 0;

    if (options.startDate) {
      delay = Math.max(0, options.startDate.getTime() - Date.now());
    }

    const timeout = setTimeout(async () => {
      await this.executeTask(taskId);
      this.timeouts.delete(taskId);
      this.tasks.delete(taskId);
      this.handlers.delete(taskId);
    }, delay);

    this.timeouts.set(taskId, timeout);
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (this.cronJobs.has(taskId)) {
      this.cronJobs.get(taskId)!.stop();
      this.cronJobs.delete(taskId);
    }

    if (this.intervals.has(taskId)) {
      clearInterval(this.intervals.get(taskId)!);
      this.intervals.delete(taskId);
    }

    if (this.timeouts.has(taskId)) {
      clearTimeout(this.timeouts.get(taskId)!);
      this.timeouts.delete(taskId);
    }

    this.tasks.delete(taskId);
    this.handlers.delete(taskId);

    this.logger.log(`Task cancelled: ${taskId}`);
    return true;
  }

  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'paused') {
      return false;
    }

    if (this.cronJobs.has(taskId)) {
      this.cronJobs.get(taskId)!.stop();
    }

    task.status = 'paused';
    this.logger.log(`Task paused: ${taskId}`);
    return true;
  }

  resume(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'paused') {
      return false;
    }

    if (this.cronJobs.has(taskId)) {
      this.cronJobs.get(taskId)!.start();
    }

    task.status = 'pending';
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
        task.nextRun = this.cronJobs.get(taskId)!.nextDate().toJSDate();
      }

      this.logger.debug(`Task completed: ${taskId}, duration: ${duration}ms`);
    } catch (error: any) {
      task.errorCount++;
      task.lastError = error.message;
      task.status = 'failed';

      this.logger.error(`Task failed: ${taskId}, error: ${error.message}`);

      if (task.options.recoverable && task.errorCount < (task.options.maxRetries || 3)) {
        const retryDelay = task.options.retryDelay || 5000;
        this.logger.log(`Scheduling retry for task: ${taskId} in ${retryDelay}ms`);

        setTimeout(() => {
          task.status = 'pending';
          this.executeTask(taskId);
        }, retryDelay);
      }
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function Scheduled(options: ScheduleOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const taskName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return originalMethod.apply(this, args);
    };

    const taskScheduler = (target as any).taskScheduler as TaskSchedulerService;
    if (taskScheduler) {
      taskScheduler.schedule(descriptor.value, { ...options, name: taskName });
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
