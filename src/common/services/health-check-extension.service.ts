import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: number;
  components: ComponentHealth[];
}

export interface HealthCheckConfig {
  name: string;
  check: () => Promise<ComponentHealth>;
  interval?: number;
  critical?: boolean;
}

export interface HealthMetrics {
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  lastCheckTime: number;
}

@Injectable()
export class HealthCheckExtensionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthCheckExtensionService.name);
  private readonly checks = new Map<string, HealthCheckConfig>();
  private readonly results = new Map<string, ComponentHealth>();
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private startTime: number;
  private version: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.startTime = Date.now();
    this.version = this.configService.get<string>('APP_VERSION', '1.0.0');
  }

  onModuleInit() {
    this.registerDefaultChecks();
    this.startPeriodicChecks();
    this.logger.log('HealthCheckExtensionService initialized');
  }

  onModuleDestroy() {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
  }

  registerCheck(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);
    this.logger.debug(`Health check registered: ${config.name}`);
  }

  removeCheck(name: string): boolean {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    this.checks.delete(name);
    this.results.delete(name);

    return true;
  }

  async runCheck(name: string): Promise<ComponentHealth> {
    const config = this.checks.get(name);

    if (!config) {
      return {
        name,
        status: 'unhealthy',
        message: 'Health check not found',
        timestamp: Date.now(),
      };
    }

    try {
      const result = await config.check();
      this.results.set(name, result);
      return result;
    } catch (error: any) {
      const result: ComponentHealth = {
        name,
        status: 'unhealthy',
        message: error.message,
        timestamp: Date.now(),
      };
      this.results.set(name, result);
      return result;
    }
  }

  async runAllChecks(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];

    for (const [name] of this.checks) {
      const result = await this.runCheck(name);
      components.push(result);
    }

    const status = this.calculateOverallStatus(components);

    return {
      status,
      version: this.version,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      components,
    };
  }

  getHealth(): SystemHealth {
    const components = Array.from(this.results.values());
    const status = this.calculateOverallStatus(components);

    return {
      status,
      version: this.version,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      components,
    };
  }

  getMetrics(): HealthMetrics {
    const results = Array.from(this.results.values());

    return {
      totalChecks: results.length,
      healthyChecks: results.filter((r) => r.status === 'healthy').length,
      degradedChecks: results.filter((r) => r.status === 'degraded').length,
      unhealthyChecks: results.filter((r) => r.status === 'unhealthy').length,
      lastCheckTime: Math.max(...results.map((r) => r.timestamp), 0),
    };
  }

  getComponentHealth(name: string): ComponentHealth | undefined {
    return this.results.get(name);
  }

  async checkDatabase(): Promise<ComponentHealth> {
    try {
      await this.dataSource.query('SELECT 1');

      return {
        name: 'database',
        status: 'healthy',
        message: 'Database connection is active',
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error.message,
        timestamp: Date.now(),
      };
    }
  }

  async checkMemory(heapThresholdMB: number = 150): Promise<ComponentHealth> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const rssMB = memoryUsage.rss / 1024 / 1024;

    const status: HealthStatus = heapUsedMB > heapThresholdMB ? 'degraded' : 'healthy';

    return {
      name: 'memory',
      status,
      message: status === 'healthy' ? 'Memory usage is within limits' : 'Memory usage is high',
      timestamp: Date.now(),
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        rssMB: Math.round(rssMB),
        externalMB: Math.round(memoryUsage.external / 1024 / 1024),
        thresholdMB: heapThresholdMB,
      },
    };
  }

  async checkDisk(thresholdPercent: number = 90): Promise<ComponentHealth> {
    try {
      const stats = await this.getDiskUsage();
      const usedPercent = (stats.used / stats.total) * 100;

      let status: HealthStatus = 'healthy';
      if (usedPercent >= thresholdPercent) {
        status = 'unhealthy';
      } else if (usedPercent >= thresholdPercent - 10) {
        status = 'degraded';
      }

      return {
        name: 'disk',
        status,
        message: status === 'healthy' ? 'Disk space is sufficient' : `Disk usage is at ${usedPercent.toFixed(1)}%`,
        timestamp: Date.now(),
        details: {
          totalGB: Math.round(stats.total / 1024 / 1024 / 1024 * 100) / 100,
          usedGB: Math.round(stats.used / 1024 / 1024 / 1024 * 100) / 100,
          freeGB: Math.round(stats.free / 1024 / 1024 / 1024 * 100) / 100,
          usedPercent: Math.round(usedPercent * 100) / 100,
        },
      };
    } catch (error: any) {
      return {
        name: 'disk',
        status: 'degraded',
        message: error.message,
        timestamp: Date.now(),
      };
    }
  }

  checkUptime(): ComponentHealth {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);

    return {
      name: 'uptime',
      status: 'healthy',
      timestamp: Date.now(),
      details: {
        uptime: uptimeSeconds,
        uptimeFormatted: this.formatUptime(uptimeSeconds),
        startTime: new Date(this.startTime).toISOString(),
      },
    };
  }

  checkCpu(): ComponentHealth {
    const cpus = process.cpuUsage();
    const elapsed = process.uptime() * 1000000;
    const userPercent = (cpus.user / elapsed) * 100;
    const systemPercent = (cpus.system / elapsed) * 100;

    return {
      name: 'cpu',
      status: 'healthy',
      timestamp: Date.now(),
      details: {
        userPercent: Math.round(userPercent * 100) / 100,
        systemPercent: Math.round(systemPercent * 100) / 100,
        totalPercent: Math.round((userPercent + systemPercent) * 100) / 100,
      },
    };
  }

  private calculateOverallStatus(components: ComponentHealth[]): HealthStatus {
    if (components.length === 0) {
      return 'healthy';
    }

    const hasUnhealthy = components.some(
      (c) => c.status === 'unhealthy' && this.checks.get(c.name)?.critical,
    );

    if (hasUnhealthy) {
      return 'unhealthy';
    }

    const hasDegraded = components.some((c) => c.status === 'degraded');
    const hasUnhealthyNonCritical = components.some(
      (c) => c.status === 'unhealthy' && !this.checks.get(c.name)?.critical,
    );

    if (hasDegraded || hasUnhealthyNonCritical) {
      return 'degraded';
    }

    return 'healthy';
  }

  private startPeriodicChecks(): void {
    for (const [name, config] of this.checks) {
      const interval = config.interval || 30000;

      this.intervals.set(
        name,
        setInterval(async () => {
          await this.runCheck(name);
        }, interval),
      );
    }
  }

  private registerDefaultChecks(): void {
    this.registerCheck({
      name: 'database',
      check: () => this.checkDatabase(),
      interval: 30000,
      critical: true,
    });

    this.registerCheck({
      name: 'memory',
      check: () => this.checkMemory(),
      interval: 60000,
      critical: false,
    });

    this.registerCheck({
      name: 'disk',
      check: () => this.checkDisk(),
      interval: 300000,
      critical: false,
    });

    this.registerCheck({
      name: 'uptime',
      check: () => Promise.resolve(this.checkUptime()),
      interval: 60000,
      critical: false,
    });

    this.registerCheck({
      name: 'cpu',
      check: () => Promise.resolve(this.checkCpu()),
      interval: 60000,
      critical: false,
    });
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private async getDiskUsage(): Promise<{ total: number; used: number; free: number }> {
    const os = await import('os');
    const fs = await import('fs/promises');

    const platform = os.platform();

    if (platform === 'win32') {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption /format:csv');
        const lines = stdout.trim().split('\n').slice(1);

        let total = 0;
        let free = 0;

        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 4 && parts[1]) {
            total += parseInt(parts[2], 10) || 0;
            free += parseInt(parts[3], 10) || 0;
          }
        }

        return { total, used: total - free, free };
      } catch {
        return { total: 0, used: 0, free: 0 };
      }
    } else {
      try {
        const stats = await fs.statfs('/');
        const total = stats.blocks * stats.bsize;
        const free = stats.bavail * stats.bsize;
        return { total, used: total - free, free };
      } catch {
        return { total: 0, used: 0, free: 0 };
      }
    }
  }
}
