import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsMessageAckTelemetry } from './ws-message-ack-command.service';
import { WsMessageCommandTelemetry } from './ws-message-command.service';

interface WsMessageTelemetryBucket {
  commandTotal: number;
  commandSuccess: number;
  commandFailed: number;
  commandDuplicates: number;
  commandAckRequired: number;
  commandAckQueued: number;
  commandLatencySum: number;
  singleTotal: number;
  singleSuccess: number;
  singleFailed: number;
  groupTotal: number;
  groupSuccess: number;
  groupFailed: number;
  stagePersist: number;
  stageDispatch: number;
  stageException: number;
  ackTotal: number;
  ackSuccess: number;
  ackFailed: number;
  ackRead: number;
  ackDelivered: number;
  ackLatencySum: number;
  commandErrors: Map<string, number>;
  ackErrors: Map<string, number>;
}

export interface WsMessageTelemetryErrorCount {
  reason: string;
  count: number;
}

export interface WsMessageTelemetrySpikeAlert {
  type: 'command' | 'ack';
  minuteEpoch: number;
  total: number;
  failed: number;
  failRatio: number;
  errorCode?: string;
}

export interface WsMessageTelemetryMonitoringSnapshot {
  summary: WsMessageTelemetrySummary;
  recentSpikes: WsMessageTelemetrySpikeAlert[];
}

export interface WsMessageTelemetrySummary {
  windowMinutes: number;
  generatedAt: number;
  command: {
    total: number;
    success: number;
    failed: number;
    duplicates: number;
    ackRequired: number;
    ackQueued: number;
    avgLatencyMs: number;
    byConversation: {
      single: { total: number; success: number; failed: number };
      group: { total: number; success: number; failed: number };
    };
    byStage: {
      persist: number;
      dispatch: number;
      exception: number;
    };
    topErrors: WsMessageTelemetryErrorCount[];
  };
  ack: {
    total: number;
    success: number;
    failed: number;
    read: number;
    delivered: number;
    avgLatencyMs: number;
    topErrors: WsMessageTelemetryErrorCount[];
  };
}

@Injectable()
export class WsMessageTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly buckets = new Map<number, WsMessageTelemetryBucket>();
  private readonly spikeHistory: WsMessageTelemetrySpikeAlert[] = [];
  private readonly retentionMinutes: number;
  private readonly spikeMinFailCount: number;
  private readonly spikeFailRatio: number;
  private readonly emittedSpikeMarkers = new Set<string>();
  private commandListener?: (payload: WsMessageCommandTelemetry) => void;
  private ackListener?: (payload: WsMessageAckTelemetry) => void;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    configService: ConfigService,
  ) {
    this.retentionMinutes = Math.max(10, configService.get<number>('WS_MESSAGE_TELEMETRY_RETENTION_MINUTES', 120));
    this.spikeMinFailCount = Math.max(5, configService.get<number>('WS_MESSAGE_TELEMETRY_SPIKE_MIN_FAIL_COUNT', 20));
    this.spikeFailRatio = Math.min(
      1,
      Math.max(0.05, configService.get<number>('WS_MESSAGE_TELEMETRY_SPIKE_FAIL_RATIO', 0.2)),
    );
  }

  onModuleInit(): void {
    this.commandListener = (payload: WsMessageCommandTelemetry) => this.recordCommand(payload);
    this.ackListener = (payload: WsMessageAckTelemetry) => this.recordAck(payload);
    this.eventEmitter.on('ws.message.command.result', this.commandListener);
    this.eventEmitter.on('ws.message.ack.result', this.ackListener);
  }

  onModuleDestroy(): void {
    if (this.commandListener) {
      this.eventEmitter.off('ws.message.command.result', this.commandListener);
    }
    if (this.ackListener) {
      this.eventEmitter.off('ws.message.ack.result', this.ackListener);
    }
  }

  getRecentSummary(windowMinutes = 5): WsMessageTelemetrySummary {
    const now = Date.now();
    const normalizedWindowMinutes = Math.max(1, Math.floor(windowMinutes));
    const currentMinute = this.toMinuteEpoch(now);
    const startMinute = currentMinute - (normalizedWindowMinutes - 1) * 60000;

    const aggregate = this.emptyBucket();
    for (const [minuteEpoch, bucket] of this.buckets.entries()) {
      if (minuteEpoch < startMinute) {
        continue;
      }
      this.mergeBucket(aggregate, bucket);
    }

    return {
      windowMinutes: normalizedWindowMinutes,
      generatedAt: now,
      command: {
        total: aggregate.commandTotal,
        success: aggregate.commandSuccess,
        failed: aggregate.commandFailed,
        duplicates: aggregate.commandDuplicates,
        ackRequired: aggregate.commandAckRequired,
        ackQueued: aggregate.commandAckQueued,
        avgLatencyMs: this.average(aggregate.commandLatencySum, aggregate.commandTotal),
        byConversation: {
          single: {
            total: aggregate.singleTotal,
            success: aggregate.singleSuccess,
            failed: aggregate.singleFailed,
          },
          group: {
            total: aggregate.groupTotal,
            success: aggregate.groupSuccess,
            failed: aggregate.groupFailed,
          },
        },
        byStage: {
          persist: aggregate.stagePersist,
          dispatch: aggregate.stageDispatch,
          exception: aggregate.stageException,
        },
        topErrors: this.topErrorCounts(aggregate.commandErrors),
      },
      ack: {
        total: aggregate.ackTotal,
        success: aggregate.ackSuccess,
        failed: aggregate.ackFailed,
        read: aggregate.ackRead,
        delivered: aggregate.ackDelivered,
        avgLatencyMs: this.average(aggregate.ackLatencySum, aggregate.ackTotal),
        topErrors: this.topErrorCounts(aggregate.ackErrors),
      },
    };
  }

  getRecentSpikeAlerts(
    windowMinutes = 5,
    type?: 'command' | 'ack',
  ): WsMessageTelemetrySpikeAlert[] {
    const nowMinute = this.toMinuteEpoch(Date.now());
    const normalizedWindowMinutes = Math.max(1, Math.floor(windowMinutes));
    const startMinute = nowMinute - (normalizedWindowMinutes - 1) * 60000;

    return this.spikeHistory
      .filter((alert) => alert.minuteEpoch >= startMinute)
      .filter((alert) => (type ? alert.type === type : true))
      .sort((a, b) => b.minuteEpoch - a.minuteEpoch);
  }

  getMonitoringSnapshot(windowMinutes = 5): WsMessageTelemetryMonitoringSnapshot {
    return {
      summary: this.getRecentSummary(windowMinutes),
      recentSpikes: this.getRecentSpikeAlerts(windowMinutes),
    };
  }

  private recordCommand(payload: WsMessageCommandTelemetry): void {
    const { minuteEpoch, bucket } = this.getOrCreateCurrentBucket();
    bucket.commandTotal += 1;
    if (payload.success) {
      bucket.commandSuccess += 1;
    } else {
      bucket.commandFailed += 1;
      this.incrementErrorCount(bucket.commandErrors, payload.errorCode || payload.error);
    }
    if (payload.duplicate) {
      bucket.commandDuplicates += 1;
    }
    if (payload.ackRequired) {
      bucket.commandAckRequired += 1;
    }
    if (payload.ackQueued) {
      bucket.commandAckQueued += 1;
    }
    bucket.commandLatencySum += Math.max(0, payload.latencyMs);

    if (payload.conversationType === 'single') {
      bucket.singleTotal += 1;
      if (payload.success) {
        bucket.singleSuccess += 1;
      } else {
        bucket.singleFailed += 1;
      }
    } else {
      bucket.groupTotal += 1;
      if (payload.success) {
        bucket.groupSuccess += 1;
      } else {
        bucket.groupFailed += 1;
      }
    }

    if (payload.stage === 'persist') {
      bucket.stagePersist += 1;
    } else if (payload.stage === 'dispatch') {
      bucket.stageDispatch += 1;
    } else {
      bucket.stageException += 1;
    }

    this.maybeEmitCommandSpike(minuteEpoch, bucket);
  }

  private recordAck(payload: WsMessageAckTelemetry): void {
    const { minuteEpoch, bucket } = this.getOrCreateCurrentBucket();
    bucket.ackTotal += 1;
    if (payload.success) {
      bucket.ackSuccess += 1;
    } else {
      bucket.ackFailed += 1;
      this.incrementErrorCount(bucket.ackErrors, payload.errorCode || payload.error);
    }
    if (payload.ackStatus === 'read') {
      bucket.ackRead += 1;
    } else {
      bucket.ackDelivered += 1;
    }
    bucket.ackLatencySum += Math.max(0, payload.latencyMs);

    this.maybeEmitAckSpike(minuteEpoch, bucket);
  }

  private getOrCreateCurrentBucket(): { minuteEpoch: number; bucket: WsMessageTelemetryBucket } {
    const minuteEpoch = this.toMinuteEpoch(Date.now());
    let bucket = this.buckets.get(minuteEpoch);
    if (!bucket) {
      bucket = this.emptyBucket();
      this.buckets.set(minuteEpoch, bucket);
      this.cleanupExpiredBuckets(minuteEpoch);
    }
    return { minuteEpoch, bucket };
  }

  private cleanupExpiredBuckets(currentMinuteEpoch: number): void {
    const expireBefore = currentMinuteEpoch - this.retentionMinutes * 60000;
    for (const minuteEpoch of this.buckets.keys()) {
      if (minuteEpoch < expireBefore) {
        this.buckets.delete(minuteEpoch);
      }
    }
    for (const marker of this.emittedSpikeMarkers) {
      const minuteEpoch = Number.parseInt(marker.split(':')[1] || '0', 10);
      if (minuteEpoch < expireBefore) {
        this.emittedSpikeMarkers.delete(marker);
      }
    }

    while (this.spikeHistory.length > 0 && this.spikeHistory[0].minuteEpoch < expireBefore) {
      this.spikeHistory.shift();
    }
  }

  private toMinuteEpoch(timestamp: number): number {
    return Math.floor(timestamp / 60000) * 60000;
  }

  private average(sum: number, count: number): number {
    if (count <= 0) {
      return 0;
    }
    return sum / count;
  }

  private mergeBucket(target: WsMessageTelemetryBucket, source: WsMessageTelemetryBucket): void {
    target.commandTotal += source.commandTotal;
    target.commandSuccess += source.commandSuccess;
    target.commandFailed += source.commandFailed;
    target.commandDuplicates += source.commandDuplicates;
    target.commandAckRequired += source.commandAckRequired;
    target.commandAckQueued += source.commandAckQueued;
    target.commandLatencySum += source.commandLatencySum;
    target.singleTotal += source.singleTotal;
    target.singleSuccess += source.singleSuccess;
    target.singleFailed += source.singleFailed;
    target.groupTotal += source.groupTotal;
    target.groupSuccess += source.groupSuccess;
    target.groupFailed += source.groupFailed;
    target.stagePersist += source.stagePersist;
    target.stageDispatch += source.stageDispatch;
    target.stageException += source.stageException;
    target.ackTotal += source.ackTotal;
    target.ackSuccess += source.ackSuccess;
    target.ackFailed += source.ackFailed;
    target.ackRead += source.ackRead;
    target.ackDelivered += source.ackDelivered;
    target.ackLatencySum += source.ackLatencySum;
    this.mergeErrorMap(target.commandErrors, source.commandErrors);
    this.mergeErrorMap(target.ackErrors, source.ackErrors);
  }

  private emptyBucket(): WsMessageTelemetryBucket {
    return {
      commandTotal: 0,
      commandSuccess: 0,
      commandFailed: 0,
      commandDuplicates: 0,
      commandAckRequired: 0,
      commandAckQueued: 0,
      commandLatencySum: 0,
      singleTotal: 0,
      singleSuccess: 0,
      singleFailed: 0,
      groupTotal: 0,
      groupSuccess: 0,
      groupFailed: 0,
      stagePersist: 0,
      stageDispatch: 0,
      stageException: 0,
      ackTotal: 0,
      ackSuccess: 0,
      ackFailed: 0,
      ackRead: 0,
      ackDelivered: 0,
      ackLatencySum: 0,
      commandErrors: new Map<string, number>(),
      ackErrors: new Map<string, number>(),
    };
  }

  private incrementErrorCount(errorMap: Map<string, number>, reason?: string): void {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
      return;
    }
    errorMap.set(normalizedReason, (errorMap.get(normalizedReason) || 0) + 1);
  }

  private mergeErrorMap(target: Map<string, number>, source: Map<string, number>): void {
    for (const [reason, count] of source.entries()) {
      target.set(reason, (target.get(reason) || 0) + count);
    }
  }

  private topErrorCounts(errorMap: Map<string, number>, limit = 3): WsMessageTelemetryErrorCount[] {
    return [...errorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([reason, count]) => ({ reason, count }));
  }

  private topErrorCode(errorMap: Map<string, number>): string | undefined {
    const top = this.topErrorCounts(errorMap, 1)[0];
    return top?.reason;
  }

  private maybeEmitCommandSpike(minuteEpoch: number, bucket: WsMessageTelemetryBucket): void {
    if (!this.shouldEmitSpike('command', minuteEpoch, bucket.commandTotal, bucket.commandFailed)) {
      return;
    }
    const alert: WsMessageTelemetrySpikeAlert = {
      type: 'command',
      minuteEpoch,
      total: bucket.commandTotal,
      failed: bucket.commandFailed,
      failRatio: bucket.commandFailed / bucket.commandTotal,
      errorCode: this.topErrorCode(bucket.commandErrors),
    };
    this.recordSpikeAlert(alert);
  }

  private maybeEmitAckSpike(minuteEpoch: number, bucket: WsMessageTelemetryBucket): void {
    if (!this.shouldEmitSpike('ack', minuteEpoch, bucket.ackTotal, bucket.ackFailed)) {
      return;
    }
    const alert: WsMessageTelemetrySpikeAlert = {
      type: 'ack',
      minuteEpoch,
      total: bucket.ackTotal,
      failed: bucket.ackFailed,
      failRatio: bucket.ackFailed / bucket.ackTotal,
      errorCode: this.topErrorCode(bucket.ackErrors),
    };
    this.recordSpikeAlert(alert);
  }

  private shouldEmitSpike(
    type: 'command' | 'ack',
    minuteEpoch: number,
    total: number,
    failed: number,
  ): boolean {
    if (total < this.spikeMinFailCount || failed < this.spikeMinFailCount) {
      return false;
    }
    const failRatio = failed / total;
    if (failRatio < this.spikeFailRatio) {
      return false;
    }

    const marker = `${type}:${minuteEpoch}`;
    if (this.emittedSpikeMarkers.has(marker)) {
      return false;
    }
    this.emittedSpikeMarkers.add(marker);
    return true;
  }

  private recordSpikeAlert(alert: WsMessageTelemetrySpikeAlert): void {
    this.spikeHistory.push(alert);
    this.eventEmitter.emit('ws.message.telemetry.spike', alert);
  }
}
