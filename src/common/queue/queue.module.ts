import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { MessageProcessor } from './processors/message.processor';
import { NotificationProcessor } from './processors/notification.processor';

/**
 * BullMQ 队列模块（可选）
 * 通过环境变量 QUEUE_ENABLED 控制是否启用
 * 当禁用时，QueueService 提供同步降级实现
 */
@Global()
@Module({})
export class QueueModule {
  static register(): DynamicModule {
    return {
      module: QueueModule,
      imports: this.getImports(),
      providers: this.getProviders(),
      exports: [QueueService],
    };
  }

  private static getImports() {
    // 检查是否启用队列
    const enabled = false; // 暂时禁用队列，以便应用程序能够在没有 Redis 的情况下启动

    if (!enabled) {
      console.log('[QueueModule] BullMQ is disabled, using synchronous fallback');
      return [];
    }

    return [
      BullModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          connection: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD', undefined),
            db: configService.get('REDIS_QUEUE_DB', 1),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
      }),
      BullModule.registerQueue(
        { name: 'message' },
        { name: 'notification' },
        { name: 'conversation' },
        { name: 'webhook' },
        { name: 'cleanup' },
      ),
    ];
  }

  private static getProviders() {
    const enabled = process.env.QUEUE_ENABLED !== 'false';

    if (enabled) {
      return [QueueService, MessageProcessor, NotificationProcessor];
    }

    // 禁用时只提供 QueueService（降级实现）
    return [QueueService];
  }
}
