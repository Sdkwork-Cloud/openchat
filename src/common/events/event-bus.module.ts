/**
 * 事件总线模块
 * 提供事件驱动架构支持
 */

import { Module, Global } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'single' as const,
        url: `redis://${configService.get<string>('REDIS_HOST') || 'localhost'}:${configService.get<number>('REDIS_PORT') || 6379}/${configService.get<number>('REDIS_DB') || 0}`,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
