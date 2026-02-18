import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthIndicator {
  name: string;
  check(): Promise<HealthIndicatorResult>;
}

export interface HealthIndicatorResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  description?: string;
  data?: Record<string, any>;
  error?: string;
  responseTime?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, HealthIndicatorResult>;
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
      rss: number;
      external: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    eventLoop: {
      lag: number;
      status: string;
    };
  };
}

export interface HealthCheckOptions {
  timeout?: number;
  includeSystem?: boolean;
  indicators?: string[];
}

@Injectable()
export class HealthCheckService implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly indicators = new Map<string, HealthIndicator>();
  private readonly startTime = Date.now();
  private eventLoopLagHistory: number[] = [];
  private eventLoopMonitorInterval?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.startEventLoopMonitor();
    this.logger.log('HealthCheckService initialized');
  }

  registerIndicator(indicator: HealthIndicator): void {
    this.indicators.set(indicator.name, indicator);
    this.logger.debug(`Health indicator registered: ${indicator.name}`);
  }

  unregisterIndicator(name: string): void {
    this.indicators.delete(name);
    this.logger.debug(`Health indicator unregistered: ${name}`);
  }

  async check(options?: HealthCheckOptions): Promise<HealthCheckResult> {
    const timeout = options?.timeout || 5000;
    const indicatorNames = options?.indicators || Array.from(this.indicators.keys());

    const checks: Record<string, HealthIndicatorResult> = {};

    const checkPromises = indicatorNames.map(async (name) => {
      const indicator = this.indicators.get(name);
      if (!indicator) {
        return {
          name,
          result: {
            status: 'unhealthy' as const,
            error: `Indicator ${name} not found`,
          },
        };
      }

      try {
        const result = await this.runWithTimeout(
          indicator.check(),
          timeout,
          `Health check ${name} timed out`,
        );
        return { name, result };
      } catch (error: any) {
        return {
          name,
          result: {
            status: 'unhealthy' as const,
            error: error.message,
          },
        };
      }
    });

    const results = await Promise.all(checkPromises);

    for (const { name, result } of results) {
      checks[name] = result;
    }

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    const statuses = Object.values(checks).map((c) => c.status);

    if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
      system: options?.includeSystem !== false ? this.getSystemMetrics() : undefined!,
    };
  }

  async checkIndicator(name: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.get(name);
    if (!indicator) {
      return {
        status: 'unhealthy',
        error: `Indicator ${name} not found`,
      };
    }

    return indicator.check();
  }

  getRegisteredIndicators(): string[] {
    return Array.from(this.indicators.keys());
  }

  private getSystemMetrics(): HealthCheckResult['system'] {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.floor((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        rss: Math.floor(memoryUsage.rss / 1024 / 1024),
        external: Math.floor(memoryUsage.external / 1024 / 1024),
      },
      cpu: {
        usage: Math.floor((cpuUsage.user + cpuUsage.system) / 1000000),
        loadAverage: [0, 0, 0],
      },
      eventLoop: {
        lag: this.getAverageEventLoopLag(),
        status: this.getAverageEventLoopLag() > 100 ? 'slow' : 'ok',
      },
    };
  }

  private startEventLoopMonitor(): void {
    this.eventLoopMonitorInterval = setInterval(() => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        this.eventLoopLagHistory.push(lag);
        if (this.eventLoopLagHistory.length > 60) {
          this.eventLoopLagHistory.shift();
        }
      });
    }, 1000);
  }

  private getAverageEventLoopLag(): number {
    if (this.eventLoopLagHistory.length === 0) return 0;
    const sum = this.eventLoopLagHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.eventLoopLagHistory.length);
  }

  private async runWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  onModuleDestroy() {
    if (this.eventLoopMonitorInterval) {
      clearInterval(this.eventLoopMonitorInterval);
    }
  }
}

@Injectable()
export class DatabaseHealthIndicator implements HealthIndicator {
  name = 'database';

  constructor(private readonly connection: any) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      await this.connection.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        data: {
          connected: this.connection.isConnected,
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start,
      };
    }
  }
}

@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
  name = 'redis';

  constructor(private readonly redisClient: any) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      await this.redisClient.ping();
      const responseTime = Date.now() - start;

      return {
        status: responseTime > 500 ? 'degraded' : 'healthy',
        responseTime,
        data: {
          connected: this.redisClient.status === 'ready',
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start,
      };
    }
  }
}

@Injectable()
export class DiskSpaceHealthIndicator implements HealthIndicator {
  name = 'disk';

  async check(): Promise<HealthIndicatorResult> {
    try {
      const stats = await this.getDiskStats();

      const usedPercentage = (stats.used / stats.total) * 100;
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

      if (usedPercentage > 90) {
        status = 'unhealthy';
      } else if (usedPercentage > 80) {
        status = 'degraded';
      }

      return {
        status,
        data: {
          total: stats.total,
          used: stats.used,
          free: stats.free,
          percentage: Math.round(usedPercentage),
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async getDiskStats(): Promise<{ total: number; used: number; free: number }> {
    return {
      total: 100 * 1024 * 1024 * 1024,
      used: 50 * 1024 * 1024 * 1024,
      free: 50 * 1024 * 1024 * 1024,
    };
  }
}

@Injectable()
export class MemoryHealthIndicator implements HealthIndicator {
  name = 'memory';

  constructor(private readonly thresholdPercentage: number = 90) {}

  async check(): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (percentage > this.thresholdPercentage) {
      status = 'unhealthy';
    } else if (percentage > this.thresholdPercentage - 10) {
      status = 'degraded';
    }

    return {
      status,
      data: {
        heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.floor(memoryUsage.rss / 1024 / 1024),
        external: Math.floor(memoryUsage.external / 1024 / 1024),
        percentage: Math.round(percentage),
      },
    };
  }
}
