import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { TaskSchedulerService } from './task-scheduler.service';

interface InvalidScheduleCase {
  label: string;
  options: Parameters<TaskSchedulerService['schedule']>[1];
  expectedError: string;
}

describe('TaskSchedulerService', () => {
  let service: TaskSchedulerService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new TaskSchedulerService(
      {} as ConfigService,
      {} as SchedulerRegistry,
    );
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const invalidScheduleCases: InvalidScheduleCase[] = [
    {
      label: 'cron',
      options: { type: 'cron' as const },
      expectedError: 'Cron tasks require a cron expression',
    },
    {
      label: 'interval',
      options: { type: 'interval' as const },
      expectedError: 'Interval tasks require a positive interval',
    },
    {
      label: 'timeout',
      options: { type: 'timeout' as const },
      expectedError: 'Timeout tasks require a non-negative delay',
    },
    {
      label: 'once',
      options: { type: 'once' as const, startDate: new Date('invalid') },
      expectedError: 'Once tasks require a valid startDate',
    },
  ];

  it.each(invalidScheduleCases)('rejects %s tasks with invalid schedule configuration', ({ options, expectedError }) => {
    expect(() => service.schedule(async () => undefined, options)).toThrow(expectedError);
  });

  it('pauses interval tasks without executing them and resumes from a fresh interval window', async () => {
    const handler = jest.fn(async () => undefined);
    const taskId = service.schedule(handler, {
      name: 'heartbeat',
      type: 'interval',
      interval: 100,
    });

    await jest.advanceTimersByTimeAsync(100);
    expect(handler).toHaveBeenCalledTimes(1);

    expect(service.pause(taskId)).toBe(true);
    await jest.advanceTimersByTimeAsync(500);
    expect(handler).toHaveBeenCalledTimes(1);

    expect(service.resume(taskId)).toBe(true);
    await jest.advanceTimersByTimeAsync(99);
    expect(handler).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('pauses one-shot tasks and resumes them with the remaining delay', async () => {
    const handler = jest.fn(async () => undefined);
    const taskId = service.schedule(handler, {
      name: 'send-reminder',
      type: 'timeout',
      delay: 100,
    });

    await jest.advanceTimersByTimeAsync(40);
    expect(service.pause(taskId)).toBe(true);

    await jest.advanceTimersByTimeAsync(500);
    expect(handler).not.toHaveBeenCalled();

    expect(service.resume(taskId)).toBe(true);
    await jest.advanceTimersByTimeAsync(59);
    expect(handler).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('normalizes non-Error failures and clears retry timers when cancelled', async () => {
    const handler = jest
      .fn<Promise<void>, [unknown]>()
      .mockRejectedValueOnce('temporary failure');
    const taskId = service.schedule(handler, {
      name: 'retryable-task',
      type: 'interval',
      interval: 1000,
      recoverable: true,
      maxRetries: 2,
      retryDelay: 50,
    });

    await service.runNow(taskId);

    expect(service.getTask(taskId)).toEqual(
      expect.objectContaining({
        status: 'failed',
        errorCount: 1,
        lastError: 'temporary failure',
      }),
    );

    expect(jest.getTimerCount()).toBeGreaterThan(0);
    expect(service.cancel(taskId)).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
