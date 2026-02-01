import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';

/**
 * 健康状态响应
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: { status: string; responseTime: number; details?: any };
    redis: { status: string; responseTime: number; details?: any };
    queue?: { status: string; enabled: boolean; details?: any };
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * 健康检查控制器
 * 提供系统和依赖服务的健康状态
 */
@ApiTags('health')
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * 基础健康检查
   * 仅检查应用是否存活
   */
  @Get('health')
  @ApiOperation({ summary: '健康检查', description: '检查应用是否正常运行' })
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 详细健康检查
   * 检查所有依赖服务
   */
  @Get('health/detailed')
  @ApiOperation({ summary: '详细健康检查', description: '检查所有依赖服务的健康状态' })
  async checkDetailedHealth(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueue(),
    ]);

    const [database, redis, queue] = checks;

    // 确定整体状态
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (database.status === 'error' || redis.status === 'error') {
      status = 'unhealthy';
    } else if (database.status === 'slow' || redis.status === 'slow') {
      status = 'degraded';
    }

    const memoryUsage = process.memoryUsage();
    const memoryTotal = require('os').totalmem();

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services: {
        database: {
          status: database.status,
          responseTime: database.responseTime,
          details: database.details,
        },
        redis: {
          status: redis.status,
          responseTime: redis.responseTime,
          details: redis.details,
        },
        queue: queue ? {
          status: queue.status,
          enabled: queue.enabled,
          details: queue.details,
        } : undefined,
      },
      memory: {
        used: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.floor((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
    };
  }

  /**
   * 就绪检查
   * 用于 K8s 就绪探针
   */
  @Get('ready')
  @ApiOperation({ summary: '就绪检查', description: '检查应用是否已准备好接收流量' })
  async checkReady(): Promise<{ status: string; checks: any }> {
    const dbCheck = await this.checkDatabase();
    const redisCheck = await this.checkRedis();

    const isReady = dbCheck.status === 'ok' && redisCheck.status === 'ok';

    return {
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        database: dbCheck.status,
        redis: redisCheck.status,
      },
    };
  }

  /**
   * 存活检查
   * 用于 K8s 存活探针
   */
  @Get('live')
  @ApiOperation({ summary: '存活检查', description: '检查应用是否存活' })
  checkLive(): { status: string; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<{
    status: string;
    responseTime: number;
    details?: any;
  }> {
    const start = Date.now();
    try {
      await this.connection.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: responseTime > 1000 ? 'slow' : 'ok',
        responseTime,
        details: {
          connected: this.connection.isConnected,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        details: { error: error.message },
      };
    }
  }

  /**
   * 检查 Redis 连接
   */
  private async checkRedis(): Promise<{
    status: string;
    responseTime: number;
    details?: any;
  }> {
    const start = Date.now();
    try {
      const client = this.redisService.getClient();
      await client.ping();
      const responseTime = Date.now() - start;

      return {
        status: responseTime > 500 ? 'slow' : 'ok',
        responseTime,
        details: {
          connected: client.status === 'ready',
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        details: { error: error.message },
      };
    }
  }

  /**
   * 检查队列状态
   */
  private async checkQueue(): Promise<{
    status: string;
    enabled: boolean;
    details?: any;
  } | null> {
    try {
      const status = await this.queueService.getQueueStatus();

      if (!status.enabled) {
        return {
          status: 'disabled',
          enabled: false,
        };
      }

      const hasFailed = status.message.failed > 0;

      return {
        status: hasFailed ? 'warning' : 'ok',
        enabled: true,
        details: {
          waiting: status.message.waiting,
          active: status.message.active,
          failed: status.message.failed,
        },
      };
    } catch (error) {
      this.logger.error('Queue health check failed', error);
      return {
        status: 'error',
        enabled: false,
        details: { error: error.message },
      };
    }
  }
}
