import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ScheduleType = 'cron' | 'interval' | 'once' | 'delayed';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface Job<T = any> {
  id: string;
  name: string;
  type: ScheduleType;
  handler: string | ((payload: T) => Promise<any>);
  payload?: T;
  status: JobStatus;
  cron?: string;
  interval?: number;
  delay?: number;
  scheduledAt?: number;
  nextRunAt?: number;
  lastRunAt?: number;
  lastResult?: any;
  lastError?: string;
  runCount: number;
  maxRuns?: number;
  startedAt?: number;
  completedAt?: number;
  timezone?: string;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoff: 'fixed' | 'exponential';
  };
  metadata?: Record<string, any>;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  timestamp: number;
}

export interface SchedulerStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  pausedJobs: number;
  jobsByType: Record<ScheduleType, number>;
  averageExecutionTime: number;
}

export interface JobQuery {
  name?: string;
  type?: ScheduleType;
  status?: JobStatus | JobStatus[];
  fromNextRun?: number;
  toNextRun?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobs = new Map<string, Job>();
  private readonly handlers = new Map<string, (payload: any) => Promise<any>>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly cronJobs = new Map<string, { pattern: string; nextRun: number }>();
  private readonly results: JobResult[] = [];
  private readonly stats = {
    totalExecutions: 0,
    totalExecutionTime: 0,
    failedExecutions: 0,
  };
  private checkInterval?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.startScheduler();
    this.logger.log('SchedulerService initialized');
  }

  onModuleDestroy() {
    this.stopScheduler();
    for (const [jobId, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    // 清理 checkInterval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  registerHandler(name: string, handler: (payload: any) => Promise<any>): void {
    this.handlers.set(name, handler);
    this.logger.debug(`Job handler '${name}' registered`);
  }

  schedule<T = any>(options: {
    name: string;
    type: ScheduleType;
    handler: string | ((payload: T) => Promise<any>);
    payload?: T;
    cron?: string;
    interval?: number;
    delay?: number;
    scheduledAt?: number;
    timezone?: string;
    maxRuns?: number;
    retryPolicy?: Job['retryPolicy'];
    metadata?: Record<string, any>;
  }): Job<T> {
    const jobId = this.generateJobId();

    const job: Job<T> = {
      id: jobId,
      name: options.name,
      type: options.type,
      handler: options.handler,
      payload: options.payload,
      status: 'pending',
      cron: options.cron,
      interval: options.interval,
      delay: options.delay,
      scheduledAt: options.scheduledAt,
      timezone: options.timezone,
      maxRuns: options.maxRuns,
      retryPolicy: options.retryPolicy,
      metadata: options.metadata,
      runCount: 0,
    };

    switch (job.type) {
      case 'cron':
        job.nextRunAt = this.getNextCronRun(job.cron!, job.timezone);
        break;
      case 'interval':
        job.nextRunAt = Date.now() + (job.interval || 0);
        break;
      case 'delayed':
        job.nextRunAt = Date.now() + (job.delay || 0);
        break;
      case 'once':
        job.nextRunAt = job.scheduledAt || Date.now();
        break;
    }

    this.jobs.set(jobId, job);
    this.logger.debug(`Job '${job.name}' (${jobId}) scheduled for ${new Date(job.nextRunAt!).toISOString()}`);

    return job;
  }

  scheduleCron<T = any>(
    name: string,
    cron: string,
    handler: string | ((payload: T) => Promise<any>),
    options?: {
      payload?: T;
      timezone?: string;
      maxRuns?: number;
      retryPolicy?: Job['retryPolicy'];
    },
  ): Job<T> {
    return this.schedule({
      name,
      type: 'cron',
      cron,
      handler,
      ...options,
    });
  }

  scheduleInterval<T = any>(
    name: string,
    intervalMs: number,
    handler: string | ((payload: T) => Promise<any>),
    options?: {
      payload?: T;
      maxRuns?: number;
      retryPolicy?: Job['retryPolicy'];
    },
  ): Job<T> {
    return this.schedule({
      name,
      type: 'interval',
      interval: intervalMs,
      handler,
      ...options,
    });
  }

  scheduleOnce<T = any>(
    name: string,
    scheduledAt: number,
    handler: string | ((payload: T) => Promise<any>),
    options?: {
      payload?: T;
      retryPolicy?: Job['retryPolicy'];
    },
  ): Job<T> {
    return this.schedule({
      name,
      type: 'once',
      scheduledAt,
      handler,
      ...options,
    });
  }

  scheduleDelayed<T = any>(
    name: string,
    delayMs: number,
    handler: string | ((payload: T) => Promise<any>),
    options?: {
      payload?: T;
      retryPolicy?: Job['retryPolicy'];
    },
  ): Job<T> {
    return this.schedule({
      name,
      type: 'delayed',
      delay: delayMs,
      handler,
      ...options,
    });
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.timers.has(jobId)) {
      clearTimeout(this.timers.get(jobId)!);
      this.timers.delete(jobId);
    }

    job.status = 'cancelled';
    job.completedAt = Date.now();

    return true;
  }

  pause(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return false;

    if (this.timers.has(jobId)) {
      clearTimeout(this.timers.get(jobId)!);
      this.timers.delete(jobId);
    }

    job.status = 'paused';
    return true;
  }

  resume(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'paused') return false;

    job.status = 'pending';

    if (job.type === 'cron') {
      job.nextRunAt = this.getNextCronRun(job.cron!, job.timezone);
    } else if (job.type === 'interval') {
      job.nextRunAt = Date.now() + (job.interval || 0);
    }

    return true;
  }

  async runNow(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    return this.executeJob(job);
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getJobs(query?: JobQuery): Job[] {
    let jobs = Array.from(this.jobs.values());

    if (query?.name) {
      jobs = jobs.filter(j => j.name.includes(query.name!));
    }

    if (query?.type) {
      jobs = jobs.filter(j => j.type === query.type);
    }

    if (query?.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      jobs = jobs.filter(j => statuses.includes(j.status));
    }

    if (query?.fromNextRun !== undefined) {
      jobs = jobs.filter(j => (j.nextRunAt || 0) >= query.fromNextRun!);
    }

    if (query?.toNextRun !== undefined) {
      jobs = jobs.filter(j => (j.nextRunAt || 0) <= query.toNextRun!);
    }

    jobs.sort((a, b) => (a.nextRunAt || 0) - (b.nextRunAt || 0));

    if (query?.offset !== undefined) {
      jobs = jobs.slice(query.offset);
    }

    if (query?.limit !== undefined) {
      jobs = jobs.slice(0, query.limit);
    }

    return jobs;
  }

  getStats(): SchedulerStats {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter(j => j.status === 'completed');
    const avgTime = this.stats.totalExecutions > 0
      ? this.stats.totalExecutionTime / this.stats.totalExecutions
      : 0;

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'pending' || j.status === 'running').length,
      completedJobs: completed.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      pausedJobs: jobs.filter(j => j.status === 'paused').length,
      jobsByType: {
        cron: jobs.filter(j => j.type === 'cron').length,
        interval: jobs.filter(j => j.type === 'interval').length,
        once: jobs.filter(j => j.type === 'once').length,
        delayed: jobs.filter(j => j.type === 'delayed').length,
      },
      averageExecutionTime: avgTime,
    };
  }

  getResults(jobId?: string, limit?: number): JobResult[] {
    let results = [...this.results];

    if (jobId) {
      results = results.filter(r => r.jobId === jobId);
    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  clearResults(): number {
    const count = this.results.length;
    this.results.length = 0;
    return count;
  }

  private startScheduler(): void {
    this.checkInterval = setInterval(() => {
      this.checkJobs();
    }, 1000);
  }

  private stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  private checkJobs(): void {
    const now = Date.now();

    for (const [jobId, job] of this.jobs) {
      if (job.status !== 'pending') continue;
      if (!job.nextRunAt || job.nextRunAt > now) continue;

      if (job.maxRuns && job.runCount >= job.maxRuns) {
        job.status = 'completed';
        job.completedAt = now;
        continue;
      }

      this.executeJob(job).catch(error => {
        this.logger.error(`Job '${job.name}' (${jobId}) execution failed:`, error);
      });
    }
  }

  private async executeJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    job.status = 'running';
    job.lastRunAt = startTime;

    let retries = 0;
    const maxRetries = job.retryPolicy?.maxRetries || 0;
    const retryDelay = job.retryPolicy?.retryDelay || 1000;
    const backoff = job.retryPolicy?.backoff || 'fixed';

    let result: any;
    let error: string | undefined;

    while (true) {
      try {
        let handler: (payload: any) => Promise<any>;

        if (typeof job.handler === 'string') {
          const registeredHandler = this.handlers.get(job.handler);
          if (!registeredHandler) {
            throw new Error(`Handler '${job.handler}' not registered`);
          }
          handler = registeredHandler;
        } else {
          handler = job.handler;
        }

        result = await handler(job.payload);
        error = undefined;
        break;
      } catch (err: any) {
        error = err.message;

        if (retries < maxRetries) {
          retries++;
          const delay = backoff === 'exponential'
            ? retryDelay * Math.pow(2, retries - 1)
            : retryDelay;

          this.logger.warn(`Job '${job.name}' (${job.id}) failed, retry ${retries}/${maxRetries} in ${delay}ms`);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    job.runCount++;
    job.lastResult = result;
    job.lastError = error;

    this.stats.totalExecutions++;
    this.stats.totalExecutionTime += duration;
    if (error) {
      this.stats.failedExecutions++;
    }

    const jobResult: JobResult = {
      jobId: job.id,
      success: !error,
      result,
      error,
      duration,
      timestamp: Date.now(),
    };

    this.results.push(jobResult);
    if (this.results.length > 1000) {
      this.results.shift();
    }

    if (error) {
      job.status = 'failed';
      this.logger.error(`Job '${job.name}' (${job.id}) failed: ${error}`);
    } else {
      if (job.type === 'once' || job.type === 'delayed') {
        job.status = 'completed';
        job.completedAt = Date.now();
      } else {
        job.status = 'pending';

        if (job.type === 'cron') {
          job.nextRunAt = this.getNextCronRun(job.cron!, job.timezone);
        } else if (job.type === 'interval') {
          job.nextRunAt = Date.now() + (job.interval || 0);
        }
      }
    }

    return jobResult;
  }

  private getNextCronRun(cron: string, timezone?: string): number {
    const parts = cron.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    next.setMinutes(next.getMinutes() + 1);

    const maxIterations = 366 * 24 * 60;
    for (let i = 0; i < maxIterations; i++) {
      if (this.matchesCron(next, minute, hour, dayOfMonth, month, dayOfWeek)) {
        return next.getTime();
      }
      next.setMinutes(next.getMinutes() + 1);
    }

    // 如果超过最大迭代次数仍未找到，抛出错误
    throw new Error(`Unable to find next cron execution time for expression: ${cron}`);
  }

  private matchesCron(date: Date, minute: string, hour: string, dayOfMonth: string, month: string, dayOfWeek: string): boolean {
    if (!this.matchesCronPart(date.getMinutes(), minute, 0, 59)) return false;
    if (!this.matchesCronPart(date.getHours(), hour, 0, 23)) return false;
    if (!this.matchesCronPart(date.getDate(), dayOfMonth, 1, 31)) return false;
    if (!this.matchesCronPart(date.getMonth() + 1, month, 1, 12)) return false;
    if (!this.matchesCronPart(date.getDay(), dayOfWeek, 0, 6)) return false;

    return true;
  }

  private matchesCronPart(value: number, pattern: string, min: number, max: number): boolean {
    if (pattern === '*') return true;

    if (pattern.includes('/')) {
      const parts = pattern.split('/');
      if (parts.length !== 2) return false;

      const [base, step] = parts;
      const stepNum = parseInt(step, 10);
      if (isNaN(stepNum) || stepNum <= 0) return false;

      if (base === '*') {
        return (value - min) % stepNum === 0;
      }
      const baseNum = parseInt(base, 10);
      if (isNaN(baseNum)) return false;
      return value >= baseNum && (value - baseNum) % stepNum === 0;
    }

    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(p => parseInt(p, 10));
      return value >= start && value <= end;
    }

    if (pattern.includes(',')) {
      const values = pattern.split(',').map(p => parseInt(p, 10));
      return values.includes(value);
    }

    return value === parseInt(pattern, 10);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
