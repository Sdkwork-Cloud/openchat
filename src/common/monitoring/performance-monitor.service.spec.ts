import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PerformanceMonitorService } from './performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;
  let eventEmitter: EventEmitter2;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    service = new PerformanceMonitorService(
      {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'PERFORMANCE_ALERT_INTERVAL') {
            return 60;
          }
          if (key === 'PERFORMANCE_MONITOR_INTERVAL') {
            return 60_000;
          }
          return defaultValue;
        }),
      } as unknown as ConfigService,
      eventEmitter,
    );
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should emit performance alert when ws telemetry spike is received', () => {
    const alertListener = jest.fn();
    eventEmitter.on('performance.alert', alertListener);

    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'command',
      minuteEpoch: 1_700_000_000_000,
      total: 20,
      failed: 8,
      failRatio: 0.4,
      errorCode: 'send_exception',
    });

    expect(alertListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ws_message_spike',
        data: expect.objectContaining({
          alertCode: 'ws_message_spike_command',
          category: 'command',
          minuteEpoch: 1_700_000_000_000,
          total: 20,
          failed: 8,
          failRatio: 0.4,
          errorCode: 'send_exception',
        }),
      }),
    );
  });

  it('should suppress duplicate spike alerts within alert interval for same category', () => {
    const alertListener = jest.fn();
    eventEmitter.on('performance.alert', alertListener);

    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'command',
      minuteEpoch: 1_700_000_000_000,
      total: 10,
      failed: 5,
      failRatio: 0.5,
    });
    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'command',
      minuteEpoch: 1_700_000_060_000,
      total: 12,
      failed: 6,
      failRatio: 0.5,
    });

    expect(alertListener).toHaveBeenCalledTimes(1);
  });

  it('should allow independent alert throttling across spike categories', () => {
    const alertListener = jest.fn();
    eventEmitter.on('performance.alert', alertListener);

    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'command',
      minuteEpoch: 1_700_000_000_000,
      total: 10,
      failed: 5,
      failRatio: 0.5,
    });
    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'ack',
      minuteEpoch: 1_700_000_000_000,
      total: 10,
      failed: 6,
      failRatio: 0.6,
    });

    expect(alertListener).toHaveBeenCalledTimes(2);
    expect(alertListener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'ws_message_spike',
        data: expect.objectContaining({ category: 'command' }),
      }),
    );
    expect(alertListener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'ws_message_spike',
        data: expect.objectContaining({ category: 'ack' }),
      }),
    );
  });

  it('should allow independent throttling across different spike error codes', () => {
    const alertListener = jest.fn();
    eventEmitter.on('performance.alert', alertListener);

    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'command',
      minuteEpoch: 1_700_000_000_000,
      total: 12,
      failed: 8,
      failRatio: 0.66,
      errorCode: 'persist_failed',
    });
    eventEmitter.emit('ws.message.telemetry.spike', {
      type: 'command',
      minuteEpoch: 1_700_000_060_000,
      total: 10,
      failed: 6,
      failRatio: 0.6,
      errorCode: 'send_exception',
    });

    expect(alertListener).toHaveBeenCalledTimes(2);
  });
});
