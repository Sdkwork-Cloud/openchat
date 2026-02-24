import { Module, Global, DynamicModule, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';
import { QueueService } from './queue.service';
import { MessageProcessor } from './processors/message.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { REDIS_CLIENT } from '../redis/redis.module';

@Global()
@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static register(): DynamicModule {
    const enabled = process.env.QUEUE_ENABLED === 'true';

    if (!enabled) {
      this.logger.log('BullMQ is disabled, using synchronous fallback');
      return {
        module: QueueModule,
        providers: [QueueService],
        exports: [QueueService],
      };
    }

    return {
      module: QueueModule,
      imports: [
        BullModule.forRootAsync({
          inject: [ConfigService, REDIS_CLIENT],
          useFactory: (configService: ConfigService, redisClient: Redis) => ({
            connection: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD') || undefined,
              db: configService.get('REDIS_QUEUE_DB', 1),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              keepAlive: 10000,
              connectTimeout: 10000,
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
      ],
      providers: [QueueService, MessageProcessor, NotificationProcessor],
      exports: [QueueService],
    };
  }
}
