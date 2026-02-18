import { Logger, LogLevel } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceStats {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export class PerformanceMonitor {
  private logger: Logger;
  private metrics: Map<string, number[]> = new Map();
  private maxSamples: number;
  private enabled: boolean;

  constructor(options: { maxSamples?: number; enabled?: boolean; logger?: Logger } = {}) {
    this.maxSamples = options.maxSamples ?? 1000;
    this.enabled = options.enabled ?? true;
    this.logger = options.logger ?? new Logger({ level: LogLevel.WARN, prefix: '[Performance]' });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  startTimer(name: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.record(name, duration, 'ms');
      return duration;
    };
  }

  record(name: string, value: number, unit: PerformanceMetric['unit'] = 'ms', tags?: Record<string, string>): void {
    if (!this.enabled) return;

    const samples = this.metrics.get(name) ?? [];
    samples.push(value);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    this.metrics.set(name, samples);

    this.logger.debug(`Metric recorded: ${name} = ${value}${unit}`);
  }

  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    if (!this.enabled) return;

    const currentValue = this.getLatest(name) ?? 0;
    this.record(name, currentValue + value, 'count', tags);
  }

  decrement(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.increment(name, -value, tags);
  }

  gauge(name: string, value: number, unit: PerformanceMetric['unit'] = 'count', tags?: Record<string, string>): void {
    if (!this.enabled) return;

    const samples = this.metrics.get(name) ?? [];
    if (samples.length > 0) {
      samples[samples.length - 1] = value;
    } else {
      samples.push(value);
    }

    this.metrics.set(name, samples);
  }

  getStats(name: string): PerformanceStats | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    const total = sorted.reduce((sum, v) => sum + v, 0);

    return {
      count,
      total,
      min: sorted[0],
      max: sorted[count - 1],
      avg: total / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  getLatest(name: string): number | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }
    return samples[samples.length - 1];
  }

  getAllStats(): Record<string, PerformanceStats> {
    const result: Record<string, PerformanceStats> = {};
    
    for (const name of this.metrics.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        result[name] = stats;
      }
    }

    return result;
  }

  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  export(): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    const now = Date.now();

    for (const [name, samples] of this.metrics) {
      if (samples.length > 0) {
        const latest = samples[samples.length - 1];
        metrics.push({
          name,
          value: latest,
          unit: 'ms',
          timestamp: now,
        });
      }
    }

    return metrics;
  }

  logSummary(): void {
    const stats = this.getAllStats();
    
    this.logger.info('Performance Summary:');
    
    for (const [name, stat] of Object.entries(stats)) {
      this.logger.info(
        `  ${name}: count=${stat.count}, avg=${stat.avg.toFixed(2)}ms, p95=${stat.p95.toFixed(2)}ms, p99=${stat.p99.toFixed(2)}ms`
      );
    }
  }
}

let globalMonitor: PerformanceMonitor | null = null;

export function createPerformanceMonitor(options?: { maxSamples?: number; enabled?: boolean; logger?: Logger }): PerformanceMonitor {
  return new PerformanceMonitor(options);
}

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

export function setGlobalPerformanceMonitor(monitor: PerformanceMonitor): void {
  globalMonitor = monitor;
}
