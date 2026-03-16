import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsMessageTelemetryService } from './ws-message-telemetry.service';

describe('WsMessageTelemetryService', () => {
  let service: WsMessageTelemetryService;
  let eventEmitter: EventEmitter2;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    service = new WsMessageTelemetryService(
      eventEmitter,
      {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'WS_MESSAGE_TELEMETRY_SPIKE_MIN_FAIL_COUNT') {
            return 2;
          }
          if (key === 'WS_MESSAGE_TELEMETRY_SPIKE_FAIL_RATIO') {
            return 0.5;
          }
          return defaultValue;
        }),
      } as unknown as ConfigService,
    );
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should aggregate command and ack telemetry in recent summary', () => {
    eventEmitter.emit('ws.message.command.result', {
      conversationType: 'single',
      fromUserId: 'user-1',
      targetId: 'user-2',
      clientMessageId: 'c-1',
      success: true,
      duplicate: false,
      latencyMs: 20,
      stage: 'dispatch',
      ackRequired: true,
      ackQueued: true,
    });
    eventEmitter.emit('ws.message.command.result', {
      conversationType: 'group',
      fromUserId: 'user-1',
      targetId: 'group-1',
      clientMessageId: 'c-2',
      success: false,
      latencyMs: 60,
      stage: 'exception',
      error: 'db down',
      ackRequired: false,
      ackQueued: false,
    });
    eventEmitter.emit('ws.message.command.result', {
      conversationType: 'single',
      fromUserId: 'user-1',
      targetId: 'user-3',
      clientMessageId: 'c-3',
      success: false,
      latencyMs: 40,
      stage: 'persist',
      error: 'db down',
      ackRequired: true,
      ackQueued: false,
    });
    eventEmitter.emit('ws.message.ack.result', {
      fromUserId: 'user-1',
      toUserId: 'user-2',
      clientMessageId: 'c-1',
      serverMessageId: 's-1',
      ackStatus: 'read',
      success: true,
      latencyMs: 15,
    });
    eventEmitter.emit('ws.message.ack.result', {
      fromUserId: 'user-1',
      toUserId: 'user-2',
      clientMessageId: 'c-4',
      serverMessageId: 's-4',
      ackStatus: 'delivered',
      success: false,
      latencyMs: 10,
      error: 'Invalid ack sender',
    });

    const summary = service.getRecentSummary(5);

    expect(summary.command.total).toBe(3);
    expect(summary.command.success).toBe(1);
    expect(summary.command.failed).toBe(2);
    expect(summary.command.byConversation.single.total).toBe(2);
    expect(summary.command.byConversation.group.total).toBe(1);
    expect(summary.command.byStage.dispatch).toBe(1);
    expect(summary.command.byStage.exception).toBe(1);
    expect(summary.command.byStage.persist).toBe(1);
    expect(summary.command.ackRequired).toBe(1);
    expect(summary.command.ackQueued).toBe(1);
    expect(summary.command.avgLatencyMs).toBeCloseTo(40, 5);
    expect(summary.command.topErrors[0]).toEqual({ reason: 'db down', count: 2 });

    expect(summary.ack.total).toBe(2);
    expect(summary.ack.success).toBe(1);
    expect(summary.ack.read).toBe(1);
    expect(summary.ack.delivered).toBe(1);
    expect(summary.ack.avgLatencyMs).toBeCloseTo(12.5, 5);
    expect(summary.ack.topErrors[0]).toEqual({ reason: 'Invalid ack sender', count: 1 });
  });

  it('should return empty summary when no events exist', () => {
    const summary = service.getRecentSummary(3);

    expect(summary.command.total).toBe(0);
    expect(summary.command.avgLatencyMs).toBe(0);
    expect(summary.command.topErrors).toEqual([]);
    expect(summary.ack.total).toBe(0);
    expect(summary.ack.avgLatencyMs).toBe(0);
    expect(summary.ack.topErrors).toEqual([]);
  });

  it('should emit spike event when minute-level failure ratio exceeds threshold', () => {
    const spikeListener = jest.fn();
    eventEmitter.on('ws.message.telemetry.spike', spikeListener);

    eventEmitter.emit('ws.message.command.result', {
      conversationType: 'single',
      fromUserId: 'user-1',
      targetId: 'user-2',
      clientMessageId: 'c-spike-1',
      success: false,
      latencyMs: 10,
      stage: 'exception',
      errorCode: 'send_exception',
      error: 'network down',
      ackRequired: true,
      ackQueued: false,
    });
    eventEmitter.emit('ws.message.command.result', {
      conversationType: 'single',
      fromUserId: 'user-1',
      targetId: 'user-3',
      clientMessageId: 'c-spike-2',
      success: false,
      latencyMs: 12,
      stage: 'exception',
      errorCode: 'send_exception',
      error: 'network down',
      ackRequired: true,
      ackQueued: false,
    });

    expect(spikeListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'command',
        total: 2,
        failed: 2,
        errorCode: 'send_exception',
      }),
    );

    const spikes = service.getRecentSpikeAlerts(5);
    expect(spikes.length).toBe(1);
    expect(spikes[0]).toEqual(
      expect.objectContaining({
        type: 'command',
        total: 2,
        failed: 2,
        errorCode: 'send_exception',
      }),
    );

    const snapshot = service.getMonitoringSnapshot(5);
    expect(snapshot.recentSpikes.length).toBe(1);
    expect(snapshot.summary.command.total).toBe(2);
  });

  it('should aggregate topErrors by errorCode when provided', () => {
    eventEmitter.emit('ws.message.command.result', {
      conversationType: 'single',
      fromUserId: 'user-1',
      targetId: 'user-2',
      clientMessageId: 'c-error-code-1',
      success: false,
      latencyMs: 5,
      stage: 'persist',
      errorCode: 'persist_failed',
      error: 'db timeout',
      ackRequired: true,
      ackQueued: false,
    });

    const summary = service.getRecentSummary(5);
    expect(summary.command.topErrors[0]).toEqual({
      reason: 'persist_failed',
      count: 1,
    });
  });
});
