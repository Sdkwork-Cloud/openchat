import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { MessageProcessor } from './processors/message.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Global()
@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static register(): DynamicModule {
    return {
      module: QueueModule,
      imports: this.getImports(),
      providers: this.getProviders(),
      exports: [QueueService],
    };
  }

  private static getImports() {
    const enabled = false;

    if (!enabled) {
      this.logger.log('BullMQ is disabled, using synchronous fallback');
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
